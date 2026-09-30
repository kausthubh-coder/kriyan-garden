import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import * as V from "./validators";
import * as model from "./model/week";
import { requireOwnerId } from "./model/shared";

export const get = query({
  args: { startDate: v.string() },
  returns: v.array(V.weekDay),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    return model.get(ctx, ownerId, args);
  },
});
