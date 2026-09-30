import { withMcpAuth } from "mcp-handler";
import { createPlannerMcp } from "@/lib/operations/mcp";
import { trustedOrigin, mcpPublicOrigin } from "@/lib/operations/origin";
import { scopeChallenge, verifyMcpBearer } from "@/lib/operations/mcp-auth";

export const maxDuration = 60;
const planner = createPlannerMcp();
async function handle(request: Request) {
  if (!trustedOrigin(request)) return Response.json({ error: { code: "INVALID_ORIGIN", message: "This origin is not allowed to call Kriyan." } }, { status: 403 });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": request.headers.get("origin") ?? "https://app.kriyan.app",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id, Last-Event-ID",
    "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Protocol-Version", "Vary": "Origin",
  } });
  const response = await withMcpAuth(async request => await scopeChallenge(request) ?? planner(request), verifyMcpBearer,
    { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp", resourceUrl: mcpPublicOrigin(request) })(request);
  response.headers.set("Cache-Control", "no-store");
  if (request.headers.has("origin")) {
    response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") ?? "");
    response.headers.set("Access-Control-Expose-Headers", "WWW-Authenticate, MCP-Protocol-Version");
    response.headers.set("Vary", "Origin");
  }
  return response;
}
export { handle as POST, handle as GET, handle as DELETE, handle as OPTIONS, handle as PUT, handle as PATCH, handle as HEAD };
