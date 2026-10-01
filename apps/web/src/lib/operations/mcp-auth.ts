import { verifyUserOAuth } from "./oauth";
import { mcpResourceUrl } from "./origin";

/** Verify the bearer for the exact MCP resource before exposing planner tools. */
export async function verifyMcpBearer(request: Request, bearerToken?: string) {
  return verifyUserOAuth(bearerToken, mcpResourceUrl(request));
}
