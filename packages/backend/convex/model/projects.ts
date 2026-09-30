import { v, type Infer } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import * as V from "../validators";
import { checkCap, owned, stamps, text, finite } from "./shared";
const createArgs = v.object(V.projectCreate);
export const list = (ctx: QueryCtx, ownerId: string, _args = {}) => ctx.db.query("projects").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(200);
export const get = (ctx: QueryCtx, ownerId: string, args: { id: Id<"projects"> }) => owned(ctx, ownerId, args.id);
export async function create(ctx: MutationCtx, ownerId: string, args: Infer<typeof createArgs>) {
  const count = await checkCap(ctx, ownerId, "projects");
  await owned(ctx, ownerId, args.areaId);
  const id = await ctx.db.insert("projects", { ...stamps(ownerId), ...args, name: text(args.name, 48, true), kind: args.kind ?? "project", note: text(args.note ?? "", 180), sortOrder: finite(args.sortOrder ?? count), archivedAt: args.archivedAt ?? null });
  return owned(ctx, ownerId, id);
}
export async function update(ctx: MutationCtx, ownerId: string, args: { id: Id<"projects">; patch: Infer<typeof V.projectPatch> }) {
  const current = await owned(ctx, ownerId, args.id);
  const patch = { ...args.patch, updatedAt: Date.now() };
  if (patch.areaId !== undefined) {
    await owned(ctx, ownerId, patch.areaId);
    if (patch.areaId !== current.areaId && await ctx.db.query("tasks").withIndex("by_owner_project", (q) => q.eq("ownerId", ownerId).eq("projectId", args.id)).first()) throw new Error("Project has linked tasks. Move or unlink them before changing its area.");
  }
  if (patch.name !== undefined) patch.name = text(patch.name, 48, true);
  if (patch.note !== undefined) patch.note = text(patch.note, 180);
  if (patch.sortOrder !== undefined) finite(patch.sortOrder);
  await ctx.db.patch(args.id, patch);
  return owned(ctx, ownerId, args.id);
}
export async function remove(ctx: MutationCtx, ownerId: string, args: { id: Id<"projects"> }) {
  await owned(ctx, ownerId, args.id);
  if (await ctx.db.query("tasks").withIndex("by_owner_project", (q) => q.eq("ownerId", ownerId).eq("projectId", args.id)).first()) throw new Error("Project has linked tasks. Unlink them before removing the project.");
  await ctx.db.delete(args.id);
  return null;
}
