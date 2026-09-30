import { verifyWebhook } from "@clerk/backend/webhooks";

// Inject cleanup for tests; production supplies the signed Convex call.
export async function handleAccountWebhook(
  request: Request,
  cleanup: (ownerId: string) => Promise<unknown>,
  signingSecret: string | undefined,
) {
  if (!signingSecret) return new Response("Account cleanup is not configured.", { status: 503 });
  let event;
  try {
    event = await verifyWebhook(request, { signingSecret });
  } catch {
    return new Response("Webhook verification failed.", { status: 400 });
  }
  if (event.type !== "user.deleted") return new Response(null, { status: 204 });
  if (typeof event.data.id !== "string" || !event.data.id.startsWith("user_")) return new Response("Deleted account ID is invalid.", { status: 400 });
  try {
    await cleanup(event.data.id);
    // Reset is bounded and may schedule further batches. A successful response
    // means the backend has durably accepted cleanup, not that every batch ran.
    return new Response(null, { status: 202 });
  } catch {
    // A non-2xx response asks Clerk's webhook delivery service to retry.
    // Never log a webhook body, identity, service envelope or backend error.
    return new Response("Account cleanup could not start. Retry delivery.", { status: 503 });
  }
}
