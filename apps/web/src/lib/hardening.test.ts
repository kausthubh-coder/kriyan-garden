import { createHmac, randomBytes } from "node:crypto";
import { expect, test, vi } from "vitest";
import { handleAccountWebhook } from "./account-webhook";
import { securityPolicy, permitsPublicFrame } from "./security-policy";
import { scrubSentryEvent, sentryOptions } from "./sentry-options";
import { NodeClient, Scope, defaultStackParser } from "@sentry/nextjs";
import { NextRequest } from "next/server";
// Next 16.3.3's public entry exports this type but not its runtime constructor.
import { NextFetchEvent } from "next/dist/server/web/spec-extension/fetch-event";
import nextConfig from "../../next.config";
import proxy from "../proxy";

const identity = vi.hoisted(() => ({ protect: vi.fn().mockResolvedValue(undefined), calls: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: (auth: { protect: () => Promise<void> }, request: NextRequest) => Promise<unknown>) =>
    (request: NextRequest) => { identity.calls(); return handler(identity, request); },
}));

const secret = `whsec_${randomBytes(32).toString("base64")}`;
function webhook(body: string, age = 0) {
  const id = "msg_disposable";
  const timestamp = String(Math.floor(Date.now() / 1000) - age);
  const signature = createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Request("https://app.kriyan.app/api/webhooks/clerk", { method: "POST", body, headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` } });
}
const deleted = JSON.stringify({ type: "user.deleted", data: { id: "user_disposable", deleted: true }, object: "event" });

test("webhook binds cleanup to the verified deleted identity and tolerates duplicate delivery", async () => {
  const cleanup = vi.fn().mockResolvedValue(null);
  expect((await handleAccountWebhook(webhook(deleted), cleanup, secret)).status).toBe(202);
  expect((await handleAccountWebhook(webhook(deleted), cleanup, secret)).status).toBe(202);
  expect(cleanup.mock.calls).toEqual([["user_disposable"], ["user_disposable"]]);
});
test("forged, expired and malformed deliveries cannot start cleanup", async () => {
  const cleanup = vi.fn();
  const forged = webhook(deleted); forged.headers.set("svix-signature", "v1,invalid");
  for (const request of [forged, webhook(deleted, 600), webhook("not-json")]) {
    expect((await handleAccountWebhook(request, cleanup, secret)).status).toBe(400);
  }
  expect(cleanup).not.toHaveBeenCalled();
});
test("unrelated events and missing IDs do not delete data", async () => {
  const cleanup = vi.fn();
  expect((await handleAccountWebhook(webhook(JSON.stringify({ type: "user.created", data: { id: "user_disposable" } })), cleanup, secret)).status).toBe(204);
  expect((await handleAccountWebhook(webhook(JSON.stringify({ type: "user.deleted", data: {} })), cleanup, secret)).status).toBe(400);
  expect((await handleAccountWebhook(webhook(JSON.stringify({ type: "user.deleted", data: { id: 7 } })), cleanup, secret)).status).toBe(400);
  expect(cleanup).not.toHaveBeenCalled();
});
test("missing configuration and cleanup failures ask the sender to retry without exposing details", async () => {
  const cleanup = vi.fn().mockRejectedValue(new Error("private credential and identity"));
  expect((await handleAccountWebhook(webhook(deleted), cleanup, undefined)).status).toBe(503);
  expect(cleanup).not.toHaveBeenCalled();
  const response = await handleAccountWebhook(webhook(deleted), cleanup, secret);
  expect(response.status).toBe(503);
  expect(await response.text()).toBe("Account cleanup could not start. Retry delivery.");
});
test("CSP constrains connections, forbids objects and preserves authenticated framing protection", () => {
  const configuration = { development: false, publishableKey: `pk_test_${Buffer.from("example.clerk.accounts.dev$").toString("base64")}`, convexUrl: "https://disposable.convex.cloud", sentryDsn: "https://public@o123.ingest.sentry.io/456" };
  const policy = securityPolicy(configuration, "random-test-nonce");
  expect(policy).toContain("https://example.clerk.accounts.dev");
  expect(policy).toContain("wss://disposable.convex.cloud");
  expect(policy).toContain("https://o123.ingest.sentry.io");
  expect(policy).toContain("script-src 'self' 'nonce-random-test-nonce' 'strict-dynamic'");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("fonts.googleapis.com");
  expect(permitsPublicFrame("/demo")).toBe(true);
  for (const path of ["/", "/docs", "/docs/self-hosting", "/privacy", "/terms", "/app", "/app/settings", "/sign-in", "/sign-up", "/api", "/demo/private", "/demo-private"]) expect(permitsPublicFrame(path)).toBe(false);
  expect(securityPolicy(configuration, undefined, true)).toContain("frame-ancestors 'self'");
  expect(securityPolicy({ development: true })).toContain("'unsafe-eval'");
});
test("configured document headers permit only the exact demo and retain the complete CSP", async () => {
  if (!nextConfig.headers) throw new Error("Security headers are missing.");
  const rules = await nextConfig.headers();
  expect(rules.map((rule) => rule.source)).toEqual(["/:path*", "/demo"]);
  for (const path of ["/demo", "/", "/docs", "/docs/mcp", "/privacy", "/terms", "/app/settings", "/sign-in", "/sign-up", "/demo/private"]) {
    const headers = new Headers();
    for (const rule of rules) {
      if (rule.source === "/:path*" || rule.source === path) {
        for (const header of rule.headers) headers.set(header.key, header.value);
      }
    }
    const allowed = permitsPublicFrame(path);
    expect(headers.get("X-Frame-Options")).toBe(allowed ? "SAMEORIGIN" : "DENY");
    expect(headers.get("Content-Security-Policy")).toContain(allowed ? "frame-ancestors 'self'" : "frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  }
});
test("public pages and legacy redirects bypass Clerk while host redirects retain query strings", async () => {
  identity.calls.mockClear(); identity.protect.mockClear();
  for (const path of ["/", "/demo", "/docs", "/docs/mcp", "/privacy", "/terms", "/download", "/garden", "/garden/day"]) {
    const request = new NextRequest(`https://kriyan.app${path}`);
    const response = await proxy(request, new NextFetchEvent({ request, page: path, context: undefined }));
    expect(response?.status).toBe(path.startsWith("/garden") ? 307 : 200);
    if (path.startsWith("/garden")) expect(response?.headers.get("location")).toBe("https://kriyan.app/app");
  }
  for (const [url, target] of [["https://kriyan.app/app/settings?section=account", "https://app.kriyan.app/app/settings?section=account"], ["https://app.kriyan.app/?view=week", "https://app.kriyan.app/app?view=week"]]) {
    const request = new NextRequest(url, { headers: { host: new URL(url).host } });
    const response = await proxy(request, new NextFetchEvent({ request, page: "/", context: undefined }));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(target);
  }
  expect(identity.calls).not.toHaveBeenCalled();
  expect(identity.protect).not.toHaveBeenCalled();
});
test("app and auth requests forward a fresh nonce and enforce private uncached responses", async () => {
  identity.protect.mockClear();
  const nonces = new Set<string>();
  for (const path of ["/app", "/app/settings", "/sign-in", "/sign-up", "/sign-in/continue"]) {
    const request = new NextRequest(`https://app.kriyan.app${path}`, { headers: { "x-nonce": "untrusted-input" } });
    const response = await proxy(request, new NextFetchEvent({ request, page: path, context: undefined }));
    const nonce = response?.headers.get("x-middleware-request-x-nonce");
    expect(nonce).toBeTruthy();
    expect(nonce).not.toBe("untrusted-input");
    if (!nonce) throw new Error("Request nonce was not forwarded.");
    nonces.add(nonce);
    const policy = response?.headers.get("Content-Security-Policy");
    expect(policy).toContain(`'nonce-${nonce}' 'strict-dynamic'`);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(response?.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(response?.headers.get("Cache-Control")).toBe("private, no-store");
  }
  expect(nonces.size).toBe(5);
  expect(identity.protect).toHaveBeenCalledTimes(2);
});
test("missing or malformed Sentry DSNs disable cleanly; no automatic analytics, logs or replay", () => {
  for (const value of [undefined, "", "not-a-url", "http://public@sentry.example/1", "https://sentry.example/1", "https://public@sentry.example/1?token=secret"]) expect(sentryOptions(value).enabled).toBe(false);
  const options = sentryOptions("https://public@sentry.example/1");
  expect(options.enabled).toBe(true);
  expect(options.sendDefaultPii).toBe(false);
  expect(options.defaultIntegrations).toBe(false);
  expect(options.enableOpenTelemetrySetup).toBe(false);
  expect(options.tracesSampleRate).toBe(0);
  expect(options.beforeSendTransaction()).toBeNull();
  expect(options.beforeSendLog()).toBeNull();
});
test("Sentry denies content, identity, headers, request bodies, tokens and arbitrary new fields", () => {
  const sensitive = "private-canary-email@example.com secret-token task-title";
  const event = scrubSentryEvent({
    type: undefined,
    event_id: "a".repeat(32), timestamp: 123, message: sensitive,
    user: { id: sensitive, email: sensitive, ip_address: "127.0.0.1" },
    request: { url: `https://app.kriyan.app/app?token=${sensitive}`, data: sensitive, headers: { Authorization: sensitive } },
    breadcrumbs: [{ message: sensitive, data: { content: sensitive } }],
    contexts: { auth: { token: sensitive } }, extra: { body: sensitive }, tags: { title: sensitive }, transaction: sensitive,
    exception: { values: [{ type: sensitive, value: sensitive, stacktrace: { frames: [{ filename: "https://app.kriyan.app/_next/static/chunks/app.js?token=secret-token", function: sensitive, vars: { token: sensitive }, context_line: sensitive, lineno: 2 }, { filename: sensitive }] } }] },
  });
  const serialized = JSON.stringify(event);
  for (const word of [sensitive, "secret-token", "Authorization", "127.0.0.1", "breadcrumbs", "contexts", "request", "user", "transaction", "context_line", "vars"]) expect(serialized).not.toContain(word);
  expect(event.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({ filename: "app/chunks/app.js", lineno: 2 });
});

test("actual Sentry SDK transport receives only scrubbed error events", async () => {
  const envelopes: unknown[] = [];
  const client = new NodeClient({ ...sentryOptions("https://public@sentry.example/1"), stackParser: defaultStackParser, integrations: [], transport: () => ({ send: async (envelope) => { envelopes.push(envelope); return { statusCode: 200 }; }, flush: async () => true }) });
  const scope = new Scope();
  scope.setUser({ id: "private-user", email: "private-email@example.com", ip_address: "127.0.0.1" });
  scope.setExtra("task", "private-task-content");
  scope.addBreadcrumb({ message: "private-breadcrumb" });
  client.captureException(new Error("private-error-token"), {}, scope);
  expect(await client.flush(2000)).toBe(true);
  expect(envelopes).toHaveLength(1);
  const serialized = JSON.stringify(envelopes);
  for (const value of ["private-user", "private-email", "private-task-content", "private-breadcrumb", "private-error-token", "127.0.0.1"]) expect(serialized).not.toContain(value);
  expect(serialized).toContain("Content removed for privacy");
  await client.close();
});
