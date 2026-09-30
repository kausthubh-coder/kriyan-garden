import { v, type Infer } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import * as V from "../validators";
import { checkCap, owned, stamps, text, date, nullableDate, time, weekdays } from "./shared";
const createArgs = v.object(V.eventCreate);
export const list = (ctx: QueryCtx, ownerId: string, _args = {}) => ctx.db.query("events").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(100);
export const get = (ctx: QueryCtx, ownerId: string, args: { id: Id<"events"> }) => owned(ctx, ownerId, args.id);
function validateRange(value: { startTime: string; endTime: string; fromDate: string; untilDate: string | null }) {
  if (value.endTime <= value.startTime) throw new Error("Event ends before it starts. Set a later end time.");
  if (value.untilDate !== null && value.untilDate < value.fromDate) throw new Error("Event date range is reversed. Set a later end date.");
}
export async function create(ctx: MutationCtx, ownerId: string, args: Infer<typeof createArgs>) {
  await checkCap(ctx, ownerId, "events");
  if (args.areaId) await owned(ctx, ownerId, args.areaId);
  const fields = { ...args, areaId: args.areaId ?? null, title: text(args.title, 180, true), location: text(args.location ?? "", 80), weekdays: weekdays(args.weekdays), startTime: time(args.startTime), endTime: time(args.endTime), fromDate: date(args.fromDate), untilDate: nullableDate(args.untilDate ?? null) };
  validateRange(fields);
  const id = await ctx.db.insert("events", { ...stamps(ownerId), ...fields });
  return owned(ctx, ownerId, id);
}
export async function update(ctx: MutationCtx, ownerId: string, args: { id: Id<"events">; patch: Infer<typeof V.eventPatch> }) {
  const current = await owned(ctx, ownerId, args.id);
  const patch = { ...args.patch, updatedAt: Date.now() };
  if (patch.areaId) await owned(ctx, ownerId, patch.areaId);
  if (patch.title !== undefined) patch.title = text(patch.title, 180, true);
  if (patch.location !== undefined) patch.location = text(patch.location, 80);
  if (patch.weekdays !== undefined) patch.weekdays = weekdays(patch.weekdays);
  if (patch.startTime !== undefined) patch.startTime = time(patch.startTime);
  if (patch.endTime !== undefined) patch.endTime = time(patch.endTime);
  if (patch.fromDate !== undefined) patch.fromDate = date(patch.fromDate);
  if (patch.untilDate !== undefined) patch.untilDate = nullableDate(patch.untilDate);
  validateRange({ ...current, ...patch });
  await ctx.db.patch(args.id, patch);
  return owned(ctx, ownerId, args.id);
}
export async function remove(ctx: MutationCtx, ownerId: string, args: { id: Id<"events"> }) {
  await owned(ctx, ownerId, args.id); await ctx.db.delete(args.id); return null;
}
