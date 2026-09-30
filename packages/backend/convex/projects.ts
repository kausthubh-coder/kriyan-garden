import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/projects";
import { requireOwnerId } from "./model/shared";

export const list = query({
  args: {},
  returns: v.array(V.project),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.list(ctx, ownerId, args);
  },
});
export const get = query({
  args: { id: v.id("projects") },
  returns: V.project,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
export const create = mutation({
  args: V.projectCreate,
  returns: V.project,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.create(ctx, ownerId, args);
  },
});
export const update = mutation({
  args: { id: v.id("projects"), patch: V.projectPatch },
  returns: V.project,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.update(ctx, ownerId, args);
  },
});
export const remove = mutation({
  args: { id: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.remove(ctx, ownerId, args);
  },
});
