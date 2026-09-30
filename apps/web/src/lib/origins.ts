export const KRIYAN_APP_ORIGIN = "https://app.kriyan.app";

export const KRIYAN_MARKETING_HOSTS = new Set(["kriyan.app", "www.kriyan.app"]);

export const KRIYAN_MARKETING_ORIGIN = "https://kriyan.app";
export const KRIYAN_REPOSITORY = "https://github.com/kausthubh-coder/kriyan-garden";
export const KRIYAN_RELEASES = `${KRIYAN_REPOSITORY}/releases/latest`;
export const appHref = (path: string) => process.env.NODE_ENV === "development" ? path : `${KRIYAN_APP_ORIGIN}${path}`;

export function hostRedirect(hostname: string, pathname: string, search = "") {
  const product = ["/app", "/sign-in", "/sign-up", "/mcp", "/api", "/.well-known"].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (KRIYAN_MARKETING_HOSTS.has(hostname) && product) return `${KRIYAN_APP_ORIGIN}${pathname}${search}`;
  if (hostname === "app.kriyan.app" && pathname === "/") return `${KRIYAN_APP_ORIGIN}/app${search}`;
  return null;
}
