import { KRIYAN_APP_ORIGIN } from "../origins";

/** Configured public origin avoids trusting proxy headers or internal Next.js URLs. */
export function mcpPublicOrigin(request: Request): string {
  const configured = process.env.MCP_PUBLIC_ORIGIN;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Set MCP_PUBLIC_ORIGIN to a public HTTPS origin.");
    return url.origin;
  }
  const url = new URL(request.url);
  if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return url.origin;
  return KRIYAN_APP_ORIGIN;
}
export const mcpResourceUrl = (request: Request) => `${mcpPublicOrigin(request)}/mcp`;

export function trustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  const allowed = new Set([mcpPublicOrigin(request), ...(process.env.MCP_ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean)]);
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(request.url);
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) allowed.add(url.origin);
  }
  return allowed.has(origin);
}
