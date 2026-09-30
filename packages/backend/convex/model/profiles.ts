import type { Infer } from "convex/values";
import { makeFunctionReference } from "convex/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { profilePatch } from "../validators";
import { stamps, text, finite } from "./shared";
import * as areas from "./areas";

export const get = (ctx: QueryCtx, ownerId: string, _args = {}) => ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
function timezone(value: string) {
  const cleaned = text(value, 100, true);
  try { new Intl.DateTimeFormat("en", { timeZone: cleaned }); } catch { throw new Error("Invalid timezone. Choose an IANA timezone such as America/New_York."); }
  return cleaned;
}
export async function ensure(ctx: MutationCtx, ownerId: string, args: { timezone?: string }) {
  const current = await get(ctx, ownerId);
  if (current) return current;
  const id = await ctx.db.insert("profiles", { ...stamps(ownerId), onboardingComplete: false, timezone: timezone(args.timezone ?? "UTC"), dailyCapacityMinutes: 360, dayStartHour: 7, dayEndHour: 23 });
  for (const [name, color] of [["School", "blue"], ["Business", "orange"], ["Life", "green"]] as const) await areas.create(ctx, ownerId, { name, color });
  const row = await ctx.db.get(id);
  if (!row) throw new Error("Profile could not be created. Try again.");
  return row;
}
export async function update(ctx: MutationCtx, ownerId: string, args: { patch: Infer<typeof profilePatch> }) {
  const current = await get(ctx, ownerId);
  if (!current) throw new Error("Profile not found. Initialize your profile first.");
  const patch = { ...args.patch, updatedAt: Date.now() };
  if (patch.timezone !== undefined) patch.timezone = timezone(patch.timezone);
  const next = { ...current, ...patch };
  if (finite(next.dailyCapacityMinutes) < 1 || next.dailyCapacityMinutes > 1440) throw new Error("Invalid capacity. Choose 1 to 1440 minutes.");
  if (!Number.isInteger(next.dayStartHour) || !Number.isInteger(next.dayEndHour) || next.dayStartHour < 0 || next.dayEndHour > 24 || next.dayStartHour >= next.dayEndHour) throw new Error("Invalid day hours. Choose a start before the end, between 0 and 24.");
  await ctx.db.patch(current._id, patch);
  return { ...current, ...patch };
}
export const completeOnboarding = (ctx: MutationCtx, ownerId: string, _args = {}) => update(ctx, ownerId, { patch: { onboardingComplete: true } });
const resetRef = makeFunctionReference<"mutation", { ownerId: string; upTo: number }, null>("serviceInternal:resetBatch");
// Snapshot cutoff protects records created after the reset began.
export async function resetBatch(ctx: MutationCtx, ownerId: string, args: { upTo: number }) {
  let remaining = 100;
  const tables = ["habitLogs", "tasks", "milestones", "projects", "goals", "events", "habits", "areas", "profiles", "serviceNonces"] as const;
  for (const table of tables) {
    if (remaining === 0) break;
    const rows = await ctx.db.query(table).withIndex("by_owner", (q) => q.eq("ownerId", ownerId).lte("_creationTime", args.upTo)).take(remaining);
    for (const row of rows) { await ctx.db.delete(row._id); remaining--; }
  }
  if (remaining === 0) await ctx.scheduler.runAfter(0, resetRef, { ownerId, upTo: args.upTo });
  return null;
}
export async function resetAll(ctx: MutationCtx, ownerId: string, _args = {}) {
  const tables = ["habitLogs", "tasks", "milestones", "projects", "goals", "events", "habits", "areas", "profiles", "serviceNonces"] as const;
  const newest = await Promise.all(tables.map((table) => ctx.db.query(table).withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).order("desc").first()));
  const upTo = Math.max(Date.now(), ...newest.map((row) => row?._creationTime ?? 0));
  return resetBatch(ctx, ownerId, { upTo });
}
