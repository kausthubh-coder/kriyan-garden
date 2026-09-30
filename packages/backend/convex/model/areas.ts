import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import * as V from "../validators";
import { checkCap, owned, stamps, text, finite } from "./shared";
const createArgs = v.object(V.areaCreate);
export const list = (ctx: QueryCtx, ownerId: string, _args = {}) => ctx.db.query("areas").withIndex("by_owner_sort", (q) => q.eq("ownerId", ownerId)).take(12);
export const get = (ctx: QueryCtx, ownerId: string, args: { id: Id<"areas"> }) => owned(ctx, ownerId, args.id);
export async function create(ctx: MutationCtx, ownerId: string, args: Infer<typeof createArgs>) {
  await checkCap(ctx, ownerId, "areas");
  const rows = await list(ctx, ownerId);
  const id = await ctx.db.insert("areas", { ...stamps(ownerId), name: text(args.name, 48, true), color: args.color ?? "grey", sortOrder: finite(args.sortOrder ?? (rows.at(-1)?.sortOrder ?? -1) + 1) });
  return owned(ctx, ownerId, id);
}
export async function update(ctx: MutationCtx, ownerId: string, args: { id: Id<"areas">; patch: Infer<typeof V.areaPatch> }) {
  await owned(ctx, ownerId, args.id);
  const patch = { ...args.patch, updatedAt: Date.now() };
  if (patch.name !== undefined) patch.name = text(patch.name, 48, true);
  if (patch.sortOrder !== undefined) finite(patch.sortOrder);
  await ctx.db.patch(args.id, patch);
  return owned(ctx, ownerId, args.id);
}
export async function remove(ctx: MutationCtx, ownerId: string, args: { id: Id<"areas"> }) {
  await owned(ctx, ownerId, args.id);
  const [project, goal, task] = await Promise.all([
    ctx.db.query("projects").withIndex("by_owner_area", (q) => q.eq("ownerId", ownerId).eq("areaId", args.id)).first(),
    ctx.db.query("goals").withIndex("by_owner_area", (q) => q.eq("ownerId", ownerId).eq("areaId", args.id)).first(),
    ctx.db.query("tasks").withIndex("by_owner_area", (q) => q.eq("ownerId", ownerId).eq("areaId", args.id)).first(),
  ]);
  const events = await ctx.db.query("events").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(100);
  const habits = await ctx.db.query("habits").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(50);
  if (project || goal || task || events.some((row) => row.areaId === args.id) || habits.some((row) => row.areaId === args.id)) throw new Error("Area is in use. Move or remove its records first.");
  await ctx.db.delete(args.id);
  return null;
}

export async function reorder(ctx: MutationCtx, ownerId: string, args: { ids: Id<"areas">[] }) {
  const rows = await list(ctx, ownerId);
  if (args.ids.length !== rows.length || new Set(args.ids).size !== rows.length || args.ids.some((id) => !rows.some((row) => row._id === id)))
    throw new Error("The areas changed. Reload and try moving the area again.");
  for (const [sortOrder, id] of args.ids.entries()) await update(ctx, ownerId, { id, patch: { sortOrder } });
  return null;
}
