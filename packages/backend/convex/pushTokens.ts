import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireOwnerId } from "./model/shared";
import { push } from "./pushClient";

export const register = mutation({
  args: { token: v.string(), platform: v.literal("android") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    if (
      !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(args.token)
    )
      throw new Error("Push token is invalid. Enable notifications again.");
    const current = await ctx.db
      .query("pushTokens")
      .withIndex("by_owner_token", (q) =>
        q.eq("ownerId", ownerId).eq("token", args.token),
      )
      .unique();
    if (
      !current &&
      (
        await ctx.db
          .query("pushTokens")
          .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
          .take(20)
      ).length >= 20
    )
      throw new Error(
        "Too many registered devices. Remove an old device first.",
      );
    const id =
      current?._id ??
      (await ctx.db.insert("pushTokens", {
        ownerId,
        ...args,
        updatedAt: Date.now(),
      }));
    if (current) await ctx.db.patch(id, { updatedAt: Date.now() });
    await push.recordToken(ctx, { userId: id, pushToken: args.token });
    await push.unpauseNotificationsForUser(ctx, { userId: id });
    return null;
  },
});
export const unregister = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    const row = await ctx.db
      .query("pushTokens")
      .withIndex("by_owner_token", (q) =>
        q.eq("ownerId", ownerId).eq("token", args.token),
      )
      .unique();
    if (row) {
      await push.removeToken(ctx, { userId: row._id });
      await push.deleteNotificationsForUser(ctx, { userId: row._id });
      await ctx.db.delete(row._id);
    }
    return null;
  },
});
