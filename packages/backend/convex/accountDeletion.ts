import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { action, internalMutation } from "./_generated/server";
import { envelope, verify } from "./serviceAuth";
import { resetAll } from "./model/profiles";

const begin = makeFunctionReference<"mutation", { ownerId: string }, null>("accountDeletion:beginCleanup");

// Only the web server calls this, after verifying Clerk's user.deleted webhook.
// The signed operation, owner, timestamp and nonce are verified together.
export const cleanup = action({
  args: { ...envelope },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await verify(ctx, "accountDeletion.cleanup", args, {});
    return ctx.runMutation(begin, { ownerId: args.ownerId });
  },
});

export const beginCleanup = internalMutation({
  args: { ownerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { ownerId }) => resetAll(ctx, ownerId),
});
