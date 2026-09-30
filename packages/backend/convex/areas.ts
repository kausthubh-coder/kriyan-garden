import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/areas";
import { requireOwnerId } from "./model/shared";

export const list = query({
  args: {},
  returns: v.array(V.area),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.list(ctx, ownerId, args);
  },
});
export const get = query({
  args: { id: v.id("areas") },
  returns: V.area,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
export const create = mutation({
  args: V.areaCreate,
  returns: V.area,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.create(ctx, ownerId, args);
  },
});
export const update = mutation({
  args: { id: v.id("areas"), patch: V.areaPatch },
  returns: V.area,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.update(ctx, ownerId, args);
  },
});
export const remove = mutation({
  args: { id: v.id("areas") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.remove(ctx, ownerId, args);
  },
});

export const reorder = mutation({
  args: { ids: v.array(v.id("areas")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.reorder(ctx, ownerId, args);
  },
});
