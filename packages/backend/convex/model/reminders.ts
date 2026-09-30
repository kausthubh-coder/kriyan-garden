import { reminderTimes } from "@kriyan/core";
import { makeFunctionReference } from "convex/server";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

const deliver = makeFunctionReference<
  "action",
  { ownerId: string; jobId: Id<"reminderJobs"> },
  null
>("reminders:deliver");
const reschedule = makeFunctionReference<"mutation", { ownerId: string; cursor: string | null }, null>("reminders:rescheduleOwner");
export async function rescheduleOwner(ctx: MutationCtx, ownerId: string, cursor: string | null) {
  const page = await ctx.db.query("tasks").withIndex("by_owner_status", q => q.eq("ownerId", ownerId).eq("status", "active")).paginate({ numItems: 25, cursor });
  for (const task of page.page) if (task.reminders.length) await schedule(ctx, task);
  if (!page.isDone) await ctx.scheduler.runAfter(0, reschedule, { ownerId, cursor: page.continueCursor });
  return null;
}
export async function cancel(
  ctx: MutationCtx,
  ownerId: string,
  taskId: Id<"tasks">,
) {
  const jobs = await ctx.db
    .query("reminderJobs")
    .withIndex("by_owner_task_state", (q) =>
      q.eq("ownerId", ownerId).eq("taskId", taskId).eq("state", "pending"),
    )
    .take(20);
  for (const job of jobs) {
    if (job.scheduledId) await ctx.scheduler.cancel(job.scheduledId);
    await ctx.db.patch(job._id, { state: "cancelled" });
  }
}
export async function schedule(ctx: MutationCtx, task: Doc<"tasks">) {
  await cancel(ctx, task.ownerId, task._id);
  if (task.status !== "active" || !task.date || !task.reminders.length) return;
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_owner", (q) => q.eq("ownerId", task.ownerId))
    .unique();
  // A missing profile must not silently schedule in a server timezone.
  if (!profile) throw new Error("Reminders need your timezone. Initialize your profile before adding reminders.");
  for (const fireAt of reminderTimes(task, profile.timezone, Date.now())) {
    const jobId = await ctx.db.insert("reminderJobs", {
      ownerId: task.ownerId,
      taskId: task._id,
      fireAt,
      scheduledId: null,
      state: "pending",
    });
    const scheduledId = await ctx.scheduler.runAt(fireAt, deliver, {
      ownerId: task.ownerId,
      jobId,
    });
    await ctx.db.patch(jobId, { scheduledId });
  }
}
