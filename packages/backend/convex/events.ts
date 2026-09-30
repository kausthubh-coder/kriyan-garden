import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/events";
import { requireOwnerId } from "./model/shared";

export const list = query({
  args: {},
  returns: v.array(V.event),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.list(ctx, ownerId, args);
  },
});
export const get = query({
  args: { id: v.id("events") },
  returns: V.event,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
export const create = mutation({
  args: V.eventCreate,
  returns: V.event,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.create(ctx, ownerId, args);
  },
});
export const update = mutation({
  args: { id: v.id("events"), patch: V.eventPatch },
  returns: V.event,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.update(ctx, ownerId, args);
  },
});
export const remove = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.remove(ctx, ownerId, args);
  },
});
