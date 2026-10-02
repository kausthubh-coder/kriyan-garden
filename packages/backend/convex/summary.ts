import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { push } from "./pushClient";
import * as model from "./model/summary";

export const send = internalMutation({
  args: { ownerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { ownerId }) => {
    const body = await model.summarize(ctx, ownerId);
    if (!body) return null;
    const tokens = await ctx.db.query("pushTokens").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(20);
    for (const token of tokens)
      await push.sendPushNotification(ctx, { userId: token._id, notification: { title: "Your day", body, channelId: "Reminders", data: { screen: "today" } } });
    return null;
  },
});
