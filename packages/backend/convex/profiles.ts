import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/profiles";
import { requireOwnerId } from "./model/shared";

export const get = query({
  args: {},
  returns: v.union(V.profile, v.null()),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
export const ensure = mutation({
  args: { timezone: v.optional(v.string()) },
  returns: V.profile,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.ensure(ctx, ownerId, args);
  },
});
export const update = mutation({
  args: { patch: V.profilePatch },
  returns: V.profile,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.update(ctx, ownerId, args);
  },
});
export const completeOnboarding = mutation({
  args: {},
  returns: V.profile,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.completeOnboarding(ctx, ownerId, args);
  },
});
export const resetAll = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.resetAll(ctx, ownerId, args);
  },
});
