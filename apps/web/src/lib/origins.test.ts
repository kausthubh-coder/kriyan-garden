import { expect, test } from "bun:test";
import { hostRedirect } from "./origins";
test("marketing retains public routes and redirects only product/automation routes", () => {
  for (const host of ["kriyan.app", "www.kriyan.app"]) {
    for (const route of ["/app", "/app/settings", "/sign-in", "/sign-up/a", "/mcp", "/api/v1/tasks", "/.well-known/oauth-protected-resource"]) expect(hostRedirect(host, route, "?date=2026-09-29")).toBe(`https://app.kriyan.app${route}?date=2026-09-29`);
    for (const route of ["/", "/demo", "/docs", "/docs/mcp", "/privacy", "/terms", "/download", "/sitemap.xml", "/robots.txt", "/opengraph-image", "/application", "/apiary"]) expect(hostRedirect(host, route)).toBeNull();
  }
  expect(hostRedirect("app.kriyan.app", "/", "?x=1")).toBe("https://app.kriyan.app/app?x=1");
  for (const host of ["localhost", "127.0.0.1", "preview.vercel.app", "evil-kriyan.app"]) expect(hostRedirect(host, "/app")).toBeNull();
});
