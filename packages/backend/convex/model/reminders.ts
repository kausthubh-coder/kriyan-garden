import { reminderFires } from "@kriyan/core";
import { ConvexError } from "convex/values";
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
  if (task.status !== "active" || !task.reminders.length) return;
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_owner", (q) => q.eq("ownerId", task.ownerId))
    .unique();
  // A missing profile must not silently schedule in a server timezone.
  if (!profile) throw new Error("Reminders need your timezone. Initialize your profile before adding reminders.");
  for (const fire of reminderFires(task, profile.timezone, Date.now()))
    await queue(ctx, task, fire.at, fire.about);
}
async function queue(ctx: MutationCtx, task: Doc<"tasks">, fireAt: number, about: "date" | "deadline" | "snooze") {
  const jobId = await ctx.db.insert("reminderJobs", {
    ownerId: task.ownerId,
    taskId: task._id,
    fireAt,
    scheduledId: null,
    state: "pending",
    about,
  });
  const scheduledId = await ctx.scheduler.runAt(fireAt, deliver, {
    ownerId: task.ownerId,
    jobId,
  });
  await ctx.db.patch(jobId, { scheduledId });
}
/** Remind again later from a notification. The task itself does not change. */
export async function snooze(ctx: MutationCtx, ownerId: string, args: { taskId: Id<"tasks">; until: number }) {
  const task = await ctx.db.get(args.taskId);
  if (!task || task.ownerId !== ownerId) throw new ConvexError("Record not found. Check the ID and try again.");
  if (task.status !== "active") return null;
  const now = Date.now();
  if (!Number.isFinite(args.until) || args.until <= now || args.until > now + 7 * 86_400_000)
    throw new ConvexError("Invalid reminder. Snooze for up to 7 days.");
  await queue(ctx, task, args.until, "snooze");
  return null;
}
