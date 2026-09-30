import { canonicalJson } from "./canonical";
import type { ActionCtx } from "./_generated/server";
import { makeFunctionReference } from "convex/server";
export { serviceEnvelope as envelope } from "./validators";
const claim = makeFunctionReference<"mutation", { ownerId: string; timestamp: number; nonce: string }, null>("serviceInternal:claimNonce");
export async function verify(ctx: ActionCtx, operation: string, args: { ownerId: string; timestamp: number; nonce: string; signature: string }, payload: unknown) {
  const secret = process.env.SERVICE_SECRET || process.env.MCP_SERVICE_SECRET;
  if (!secret) throw new Error("Service is not configured. Set SERVICE_SECRET.");
  if (!Number.isFinite(args.timestamp) || Math.abs(Date.now() - args.timestamp) > 300_000) throw new Error("Expired service request. Send a new signed request.");
  if (!args.ownerId || !args.nonce || args.nonce.length > 200 || !/^[0-9a-f]{64}$/i.test(args.signature)) throw new Error("Invalid service request.");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signature = Uint8Array.from(args.signature.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(canonicalJson([args.timestamp, args.nonce, args.ownerId, operation, payload])));
  if (!valid) throw new Error("Invalid service signature.");
  await ctx.runMutation(claim, { ownerId: args.ownerId, timestamp: args.timestamp, nonce: args.nonce });
}
