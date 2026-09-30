import { makeFunctionReference } from "convex/server";
import { serviceCall } from "@/lib/service-client";
import { handleAccountWebhook } from "@/lib/account-webhook";

export const runtime = "nodejs";
const cleanup = makeFunctionReference<"action", {
  ownerId: string; timestamp: number; nonce: string; signature: string;
}, null>("accountDeletion:cleanup");

export async function POST(request: Request) {
  return handleAccountWebhook(
    request,
    (ownerId) => serviceCall(cleanup, ownerId, "accountDeletion.cleanup", {}),
    process.env.CLERK_WEBHOOK_SIGNING_SECRET,
  );
}
