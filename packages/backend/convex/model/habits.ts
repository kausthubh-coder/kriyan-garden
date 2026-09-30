import { v, type Infer } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import * as V from "../validators";
import { checkCap, owned, stamps, text, date } from "./shared";
const createArgs = v.object(V.habitCreate);
function target(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 7) throw new Error("Invalid weekly target. Choose a whole number from 1 to 7.");
  return value;
}
export const list = (ctx: QueryCtx, ownerId: string, _args = {}) => ctx.db.query("habits").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(50);
export const get = (ctx: QueryCtx, ownerId: string, args: { id: Id<"habits"> }) => owned(ctx, ownerId, args.id);
export async function create(ctx: MutationCtx, ownerId: string, args: Infer<typeof createArgs>) {
  await checkCap(ctx, ownerId, "habits"); await owned(ctx, ownerId, args.areaId);
  const id = await ctx.db.insert("habits", { ...stamps(ownerId), ...args, title: text(args.title, 180, true), weeklyTarget: target(args.weeklyTarget), archivedAt: args.archivedAt ?? null });
  return owned(ctx, ownerId, id);
}
export async function update(ctx: MutationCtx, ownerId: string, args: { id: Id<"habits">; patch: Infer<typeof V.habitPatch> }) {
  await owned(ctx, ownerId, args.id);
  const patch = { ...args.patch, updatedAt: Date.now() };
  if (patch.areaId !== undefined) await owned(ctx, ownerId, patch.areaId);
  if (patch.title !== undefined) patch.title = text(patch.title, 180, true);
  if (patch.weeklyTarget !== undefined) patch.weeklyTarget = target(patch.weeklyTarget);
  await ctx.db.patch(args.id, patch);
  return owned(ctx, ownerId, args.id);
}
export async function remove(ctx: MutationCtx, ownerId: string, args: { id: Id<"habits"> }) {
  await owned(ctx, ownerId, args.id);
  if (await ctx.db.query("habitLogs").withIndex("by_owner_habit", (q) => q.eq("ownerId", ownerId).eq("habitId", args.id)).first()) throw new Error("Habit has logs. Remove its logs or archive it first.");
  await ctx.db.delete(args.id); return null;
}
export async function listLogs(ctx: QueryCtx, ownerId: string, args: { habitId: Id<"habits"> }) {
  await owned(ctx, ownerId, args.habitId);
  return ctx.db.query("habitLogs").withIndex("by_owner_habit", (q) => q.eq("ownerId", ownerId).eq("habitId", args.habitId)).take(1000);
}
export async function log(ctx: MutationCtx, ownerId: string, args: { habitId: Id<"habits">; date: string }) {
  await owned(ctx, ownerId, args.habitId);
  const day = date(args.date);
  for await (const row of ctx.db.query("habitLogs").withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId).eq("date", day))) if (row.habitId === args.habitId) return row;
  const id = await ctx.db.insert("habitLogs", { ...stamps(ownerId), habitId: args.habitId, date: day });
  return owned(ctx, ownerId, id);
}
export async function removeLog(ctx: MutationCtx, ownerId: string, args: { id: Id<"habitLogs"> }) {
  await owned(ctx, ownerId, args.id); await ctx.db.delete(args.id); return null;
}
