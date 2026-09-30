import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/habits";
import { requireOwnerId } from "./model/shared";

export const list = query({
  args: {},
  returns: v.array(V.habit),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.list(ctx, ownerId, args);
  },
});
export const get = query({
  args: { id: v.id("habits") },
  returns: V.habit,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
export const create = mutation({
  args: V.habitCreate,
  returns: V.habit,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.create(ctx, ownerId, args);
  },
});
export const update = mutation({
  args: { id: v.id("habits"), patch: V.habitPatch },
  returns: V.habit,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.update(ctx, ownerId, args);
  },
});
export const remove = mutation({
  args: { id: v.id("habits") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.remove(ctx, ownerId, args);
  },
});
export const listLogs = query({
  args: { habitId: v.id("habits") },
  returns: v.array(V.habitLog),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.listLogs(ctx, ownerId, args);
  },
});
export const log = mutation({
  args: { habitId: v.id("habits"), date: v.string() },
  returns: V.habitLog,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.log(ctx, ownerId, args);
  },
});
export const removeLog = mutation({
  args: { id: v.id("habitLogs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.removeLog(ctx, ownerId, args);
  },
});
