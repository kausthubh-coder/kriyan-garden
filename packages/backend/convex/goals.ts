import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/goals";
import { requireOwnerId } from "./model/shared";

export const list = query({
  args: {},
  returns: v.array(V.goalWithProgress),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.list(ctx, ownerId, args);
  },
});
export const get = query({
  args: { id: v.id("goals") },
  returns: V.goal,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
export const create = mutation({
  args: V.goalCreate,
  returns: V.goal,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.create(ctx, ownerId, args);
  },
});
export const update = mutation({
  args: { id: v.id("goals"), patch: V.goalPatch },
  returns: V.goal,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.update(ctx, ownerId, args);
  },
});
export const remove = mutation({
  args: { id: v.id("goals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.remove(ctx, ownerId, args);
  },
});
export const createMilestone = mutation({
  args: V.milestoneCreate,
  returns: V.milestone,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.createMilestone(ctx, ownerId, args);
  },
});
export const updateMilestone = mutation({
  args: { id: v.id("milestones"), patch: V.milestonePatch },
  returns: V.milestone,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.updateMilestone(ctx, ownerId, args);
  },
});
export const removeMilestone = mutation({
  args: { id: v.id("milestones") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.removeMilestone(ctx, ownerId, args);
  },
});
export const deleteForUndo = mutation({
  args: { id: v.id("goals") },
  returns: V.deletedGoal,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.deleteForUndo(ctx, ownerId, args);
  },
});
export const restore = mutation({
  args: { snapshot: V.deletedGoal },
  returns: V.goal,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.restore(ctx, ownerId, args);
  },
});
