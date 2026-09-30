import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/tasks";
import { requireOwnerId } from "./model/shared";

export const list = query({
  args: { status: v.optional(V.taskStatus), limit: v.optional(v.number()) },
  returns: v.array(V.task),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.list(ctx, ownerId, args);
  },
});
export const get = query({
  args: { id: v.id("tasks") },
  returns: V.task,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
export const lookup = query({
  args: { key: v.string() },
  returns: v.union(V.task, v.null()),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.lookup(ctx, ownerId, args);
  },
});
export const create = mutation({
  args: V.taskCreate,
  returns: V.task,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.create(ctx, ownerId, args);
  },
});
export const update = mutation({
  args: { id: v.id("tasks"), patch: V.taskPatch },
  returns: V.task,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.update(ctx, ownerId, args);
  },
});
export const remove = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.remove(ctx, ownerId, args);
  },
});
export const complete = mutation({
  args: { id: v.id("tasks") },
  returns: V.task,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.complete(ctx, ownerId, args);
  },
});
export const reopen = mutation({
  args: { id: v.id("tasks") },
  returns: V.task,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.reopen(ctx, ownerId, args);
  },
});
export const quickAdd = mutation({
  args: { text: v.string(), today: v.string() },
  returns: V.task,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.quickAdd(ctx, ownerId, args);
  },
});
export const search = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.array(V.task),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.search(ctx, ownerId, args);
  },
});
