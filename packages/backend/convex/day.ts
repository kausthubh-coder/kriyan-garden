import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/day";
import { requireOwnerId } from "./model/shared";

export const get = query({
  args: { date: v.string() },
  returns: V.day,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
