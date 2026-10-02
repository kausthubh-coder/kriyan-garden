import { makeFunctionReference } from "convex/server";
import { addDays, localClock, nextDailyAt, summaryText, weekStart } from "@kriyan/core";
import type { MutationCtx } from "../_generated/server";

const send = makeFunctionReference<"mutation", { ownerId: string }, null>("summary:send");
const profileOf = (ctx: MutationCtx, ownerId: string) => ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();

/** Keep exactly one pending daily summary per person, at their chosen local time. */
export async function schedule(ctx: MutationCtx, ownerId: string, after = Date.now()) {
  const profile = await profileOf(ctx, ownerId);
  if (!profile) return;
  if (profile.summaryJobId) {
    const job = await ctx.db.system.get(profile.summaryJobId);
    if (job?.state.kind === "pending") await ctx.scheduler.cancel(profile.summaryJobId);
  }
  const summaryJobId = profile.dailySummaryTime ? await ctx.scheduler.runAt(nextDailyAt(profile.dailySummaryTime, profile.timezone, after), send, { ownerId }) : null;
  await ctx.db.patch(profile._id, { summaryJobId });
}

/** Counts for the summary, then the next day's job. */
export async function summarize(ctx: MutationCtx, ownerId: string) {
  const profile = await profileOf(ctx, ownerId);
  if (!profile?.dailySummaryTime) return null;
  const today = localClock(new Date(), profile.timezone).today;
  const planned = await ctx.db.query("tasks").withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId).eq("date", today)).take(500);
  const due = await ctx.db.query("tasks").withIndex("by_owner_deadline", (q) => q.eq("ownerId", ownerId).gte("deadline", today).lte("deadline", addDays(weekStart(today), 6))).take(500);
  // A minute's margin so a job that runs a moment early never schedules itself again today.
  await schedule(ctx, ownerId, Date.now() + 60_000);
  return summaryText(planned.filter((task) => task.status === "active").length, due.filter((task) => task.status === "active").length);
}
