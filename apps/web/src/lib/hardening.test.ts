import { createHmac, randomBytes } from "node:crypto";
import { expect, test, vi } from "vitest";
import { handleAccountWebhook } from "./account-webhook";
import { securityPolicy, permitsPublicFrame } from "./security-policy";
import { scrubSentryEvent, sentryOptions } from "./sentry-options";
import { NodeClient, Scope, defaultStackParser } from "@sentry/nextjs";

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
  for (const path of ["/", "/demo", "/docs/self-hosting", "/privacy", "/terms"]) expect(permitsPublicFrame(path)).toBe(true);
  for (const path of ["/app", "/app/settings", "/sign-in", "/api", "/demo-private"]) expect(permitsPublicFrame(path)).toBe(false);
  expect(securityPolicy(configuration, undefined, true)).toContain("frame-ancestors 'self'");
  expect(securityPolicy({ development: true })).toContain("'unsafe-eval'");
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
