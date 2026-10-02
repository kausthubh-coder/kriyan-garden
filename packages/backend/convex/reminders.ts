import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { push } from "./pushClient";
import * as model from "./model/reminders";
import { localClock, reminderBody } from "@kriyan/core";
export const rescheduleOwner = internalMutation({
  args: { ownerId: v.string(), cursor: v.union(v.string(), v.null()) }, returns: v.null(),
  handler: async (ctx, args) => model.rescheduleOwner(ctx, args.ownerId, args.cursor),
});

// Scheduler supplies the owner established by the authenticated task operation.
// Validate ownership again inside the transaction, and reject cancelled/stale jobs.
export const dispatch = internalMutation({
  args: { ownerId: v.string(), jobId: v.id("reminderJobs") },
  returns: v.null(),
  handler: async (ctx, { ownerId, jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.ownerId !== ownerId || job.state !== "pending") return null;
    const task = await ctx.db.get(job.taskId);
    if (
      !task ||
      task.ownerId !== ownerId ||
      task.status !== "active" ||
      (job.about !== "snooze" && !task.reminders.length)
    ) {
      await ctx.db.patch(jobId, { state: "cancelled" });
      return null;
    }
    const profile = await ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const today = localClock(new Date(), profile?.timezone).today;
    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .take(20);
    for (const token of tokens) {
      await push.sendPushNotification(ctx, {
        userId: token._id,
        notification: {
          title: task.title,
          body: reminderBody(task, job.about ?? "date", today),
          channelId: "Reminders",
          // Android shows Done and snooze actions for this category.
          categoryId: "task-reminder",
          data: { taskId: task._id },
        },
      });
    }
    // Sent means queued to the component. Expo receipt/delivery is separate.
    await ctx.db.patch(jobId, { state: "sent" });
    return null;
  },
});
export const failed = internalMutation({
  args: { ownerId: v.string(), jobId: v.id("reminderJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job?.ownerId === args.ownerId && job.state === "pending")
      await ctx.db.patch(job._id, { state: "failed" });
    return null;
  },
});
export const deliver = internalAction({
  args: { ownerId: v.string(), jobId: v.id("reminderJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.reminders.dispatch, args);
    } catch {
      console.error(
        "Reminder could not be queued. Check the push component status.",
      );
      try {
        await ctx.runMutation(internal.reminders.failed, args);
      } catch {
        console.error("Reminder failure state could not be saved.");
      }
    }
    return null;
  },
});
