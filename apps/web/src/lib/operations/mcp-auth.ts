import { z } from "zod";
import { createClerkClient } from "@clerk/backend";
import { MCP_TOOLS, operations } from "./index";
import { mcpPublicOrigin, mcpResourceUrl } from "./origin";

const toolCall = z.object({ method: z.literal("tools/call"), params: z.object({ name: z.string() }) });
/** Clerk's default OAuth verification does not bind a token to this resource. */
export async function verifyMcpBearer(request: Request, bearerToken?: string) {
  if (!bearerToken) return undefined;
  try {
    const resource = mcpResourceUrl(request);
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY, publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });
    const verified = await client.idPOAuthAccessToken.verify(bearerToken, { audience: resource });
    if (!verified.aud?.includes(resource) || !verified.subject.startsWith("user_") || verified.revoked || verified.expired) return undefined;
    return { token: bearerToken, clientId: verified.clientId, scopes: verified.scopes,
      ...(verified.expiration === null ? {} : { expiresAt: verified.expiration }), extra: { userId: verified.subject } };
  } catch { return undefined; }
}
/** Challenge before running the SDK so OAuth clients can request missing scopes. */
export async function scopeChallenge(request: Request): Promise<Response | null> {
  if (request.method !== "POST") return null;
  let body: unknown;
  try { body = await request.clone().json(); } catch { return null; }
  const parsed = toolCall.safeParse(body);
  if (!parsed.success) return null;
  const name = MCP_TOOLS.find(name => name === parsed.data.params.name);
  if (!name) return null;
  const scopes = operations[name].scopes;
  if (scopes.every(scope => request.auth?.scopes.includes(scope))) return null;
  const resource = `${mcpPublicOrigin(request)}/.well-known/oauth-protected-resource/mcp`;
  return Response.json({ error: "insufficient_scope", error_description: `Authorize ${scopes.join(", ")} and try again.` }, {
    status: 403, headers: { "WWW-Authenticate": `Bearer error="insufficient_scope", scope="${scopes.join(" ")}", resource_metadata="${resource}"`, "Cache-Control": "no-store" },
  });
}
