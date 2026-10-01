import { afterEach, expect, test, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
test("installed Clerk SDK verifies the actual token through BAPI and enforces resource audience", async () => {
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_offline_fixture");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
  let audience: string[] | undefined = ["https://planner.example/api/v1"];
  let expiration: number | null = null;
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    expect(String(url)).toContain("/oauth_applications/access_tokens/verify");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ access_token: "offline-token-fixture" });
    return Response.json({ object: "clerk_idp_oauth_access_token", id: "fixture", subject: "user_disposable", client_id: "public_fixture", scopes: ["openid", "profile", "email"], type: "opaque", aud: audience, revoked: false, expired: false, expiration, created_at: 0, updated_at: 0 });
  });
  vi.stubGlobal("fetch", fetch);
  // The SDK captures fetch when first imported, so install the fake transport first.
  const { verifyUserOAuth } = await import("./oauth");
  expect(await verifyUserOAuth("offline-token-fixture", "https://planner.example/api/v1")).toMatchObject({ extra: { userId: "user_disposable" }, scopes: ["openid", "profile", "email"] });
  audience = ["https://planner.example/mcp"];
  expect(await verifyUserOAuth("offline-token-fixture", "https://planner.example/api/v1")).toBeUndefined();
  audience = undefined;
  expect(await verifyUserOAuth("offline-token-fixture", "https://planner.example/api/v1")).toBeUndefined();
  audience = ["https://planner.example/api/v1"];
  expiration = Math.floor(Date.now() / 1000) - 1;
  expect(await verifyUserOAuth("offline-token-fixture", "https://planner.example/api/v1")).toBeUndefined();
  expiration = Math.floor(Date.now() / 1000) + 60;
  expect(await verifyUserOAuth("offline-token-fixture", "https://planner.example/api/v1")).toMatchObject({ expiresAt: expiration });
  expect(fetch).toHaveBeenCalledTimes(5);
});
