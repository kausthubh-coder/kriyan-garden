import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { SCOPES } from "./scopes";

vi.mock("server-only", () => ({}));
const fake = vi.hoisted(() => ({ call: vi.fn(), auth: vi.fn(), verifyToken: vi.fn() }));
vi.mock("../service-client", () => ({ serviceCall: fake.call }));
vi.mock("@clerk/nextjs/server", () => ({ auth: fake.auth }));
vi.mock("@clerk/backend", () => ({ createClerkClient: () => ({ idPOAuthAccessToken: { verify: fake.verifyToken } }) }));
vi.mock("@clerk/mcp-tools/server", () => ({ fetchClerkAuthorizationServerMetadata: async () => ({ authorization_endpoint: "https://clerk.test/oauth/authorize", token_endpoint: "https://clerk.test/oauth/token" }) }));
import { operations, runOperation, resolveReference, MCP_TOOLS } from "./index";
import { schemas } from "./schemas";
import { trustedOrigin, mcpResourceUrl, apiResourceUrl } from "./origin";
import { apiRoute } from "./http";
import { createPlannerMcp } from "./mcp";
import { verifyMcpBearer } from "./mcp-auth";
import { GET as authConfig } from "../../app/api/v1/auth-config/route";
import { POST as mcpPost } from "../../app/mcp/route";

function authorizedRequest(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { authorization: "Bearer offline-fixture", ...Object.fromEntries(new Headers(init.headers)) } });
}
const caller = { userId: "user_disposable" };
const area = { _id: "school", _creationTime: 0, ownerId: caller.userId, createdAt: 0, updatedAt: 0, name: "School", color: "blue", sortOrder: 0 };
const profile = { ...area, _id: "profile", timezone: "America/Los_Angeles", dailyCapacityMinutes: 360, dayStartHour: 7, dayEndHour: 23, onboardingComplete: true };
const task = { ...area, _id: "task", title: "Essay", areaId: area._id, projectId: null, goalId: null, date: "2026-09-29", time: null, durationMinutes: null, deadline: null, repeat: null, reminders: [], notes: "Notes", searchText: "Essay Notes", sortOrder: 0, status: "active", completedAt: null };
const day = { date: task.date, timed: [], anytime: [task], unscheduled: [], events: [], plannedMinutes: 0, countWithoutDuration: 1 };
beforeEach(() => {
  fake.call.mockReset(); fake.auth.mockReset(); fake.verifyToken.mockReset();
  fake.auth.mockResolvedValue({ isAuthenticated: true, userId: caller.userId, scopes: [...SCOPES], tokenType: "oauth_token" });
  fake.verifyToken.mockResolvedValue({ aud: ["http://localhost:3005/api/v1"], subject: caller.userId, scopes: [...SCOPES], clientId: "fixture", expiration: null, revoked: false, expired: false });
  fake.call.mockImplementation(async (ref, _owner, _operation, payload) => {
    const name = getFunctionName(ref);
    if (name === "service:plannerContext") return { profile, areas: [area], projects: [] };
    if (name === "service:dayGet") return { ...day, date: payload.date };
    if (name === "service:goalsList") return [];
    if (name === "service:tasksFilteredList") return [task];
    if (name === "service:tasksCompleteWithNext") return { task: { ...task, status: "completed" }, nextOccurrence: { ...task, _id: "next", date: "2026-09-30" } };
    if (name === "service:tasksCreate" || name === "service:tasksQuickAdd") return { ...task, ...payload };
    if (name === "service:tasksUpdate") return { ...task, ...payload.patch };
    if (name === "service:planApply") return { dryRun: payload.dryRun, items: [
      { kind: "project", index: 0, ref: "cs101", name: "CS 101", status: payload.dryRun ? "would_create" : "created", id: payload.dryRun ? null : "p1" },
      { kind: "event", index: 0, ref: null, name: "CS 101 lecture", status: payload.dryRun ? "would_create" : "created", id: payload.dryRun ? null : "e1" },
      { kind: "task", index: 0, ref: null, name: "Problem set 1", status: "exists", id: "task" },
    ] };
    throw new Error("Unexpected mock service operation");
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
test("all parity tools share schemas and reject non-user identities before any backend call", async () => {
  expect(MCP_TOOLS).toHaveLength(42);
  expect(MCP_TOOLS).toEqual(expect.arrayContaining(["apply_plan", "create_event", "log_habit", "delete_task", "update_settings"]));
  for (const name of MCP_TOOLS) {
    expect(operations[name].schema.shape.today).toBeDefined();
    expect(operations[name].schema.shape.timezone).toBeDefined();
    await expect(runOperation(name, {}, { userId: "org_other" })).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  }
  expect(fake.call).not.toHaveBeenCalled();
});
test("today comes from profile timezone across midnight, or explicit caller calendar", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-30T01:00:00Z"));
  expect(await runOperation("get_day", {}, caller)).toMatchObject({ today: "2026-09-29", timezone: "America/Los_Angeles", date: "2026-09-29", freeMinutes: 360 });
  expect(await runOperation("get_day", { timezone: "Asia/Tokyo" }, caller)).toMatchObject({ today: "2026-09-30", date: "2026-09-30" });
  expect(await runOperation("get_day", { today: "2026-10-01", timezone: "Asia/Tokyo", date: "2026-10-04" }, caller)).toMatchObject({ today: "2026-10-01", date: "2026-10-04" });
});
test("names and paths resolve with explicit ambiguity candidates", () => {
  const rows = [{ _id: "a", name: "Essay", path: "School / Essay" }, { _id: "b", name: "Essay", path: "Life / Essay" }];
  expect(resolveReference(rows, "school / essay", "project")._id).toBe("a");
  expect(() => resolveReference(rows, "Essay", "project")).toThrow("More than one");
  try { resolveReference(rows, "Essay", "project"); } catch (error) { expect(error).toMatchObject({ candidates: [{ id: "a", name: "Essay", path: "School / Essay" }, { id: "b", name: "Essay", path: "Life / Essay" }] }); }
});
test("writes preserve optional length, use one sentence and return the actual next occurrence", async () => {
  const added = await runOperation("create_task", { title: "Essay", area: "school", today: "2026-09-29" }, caller);
  expect(added).toMatchObject({ ok: true, id: "task", task: { durationMinutes: null, notes: "Notes" } });
  expect(added.readBack).not.toContain("minutes");
  expect(added.task).not.toHaveProperty("ownerId");
  const completed = await runOperation("complete_task", { id: "task", today: "2026-09-29" }, caller);
  expect(completed).toMatchObject({ ok: true, nextOccurrence: { id: "next" } });
  expect(completed.readBack).toContain("next occurrence \"Essay\" is scheduled for Tomorrow");
  expect(added.readBack).toContain("scheduled for Today");
});
test("apply_plan sends one batch with the caller's today and reads back counts by kind", async () => {
  const plan = { today: "2026-09-29", dryRun: true, projects: [{ ref: "cs101", name: "CS 101", area: "School", kind: "course" }], events: [{ title: "CS 101 lecture", area: "School", weekdays: [1, 3], startTime: "09:00", endTime: "10:15", fromDate: "2026-09-01" }], tasks: [{ title: "Problem set 1", project: "cs101", deadline: "2026-10-02" }] };
  const preview = await runOperation("apply_plan", plan, caller);
  const { today, ...sent } = plan; void today;
  expect(fake.call.mock.calls.at(-1)?.[3]).toEqual({ ...sent, onExisting: "skip", today: "2026-09-29" });
  expect(preview).toMatchObject({ ok: true, dryRun: true });
  expect(preview.readBack).toBe("Would add 1 course and 1 schedule block. Already in Kriyan: 1 task. Nothing is saved yet. Apply the same plan without dryRun to save it.");
  const applied = await runOperation("apply_plan", { ...plan, dryRun: false }, caller);
  expect(applied.readBack).toBe("Added 1 course and 1 schedule block. Already in Kriyan: 1 task.");
  await expect(runOperation("apply_plan", { tasks: [{ title: "Bad", deadline: "2 Oct" }] }, caller)).rejects.toThrow("YYYY-MM-DD");
});
test("move forwards date/time only and update omission differs from explicit null", async () => {
  await runOperation("move_task", { id: "task", date: null, today: "2026-09-29" }, caller);
  expect(fake.call.mock.calls.at(-1)?.[3]).toEqual({ id: "task", patch: { date: null } });
  await runOperation("update_task", { id: "task", notes: "New notes", durationMinutes: null }, caller);
  expect(fake.call.mock.calls.at(-1)?.[3]).toEqual({ id: "task", patch: { notes: "New notes", durationMinutes: null } });
});
test("due filters use deadlines and local calendar, title filtering stays in backend", async () => {
  await runOperation("list_tasks", { today: "2026-09-29", due: "overdue", text: "essay", area: "School" }, caller);
  expect(fake.call.mock.calls.at(-1)?.[3]).toMatchObject({ deadlineTo: "2026-09-28", areaId: "school", text: "essay", limit: 100, status: "active" });
  await expect(runOperation("list_tasks", { due: "today", deadlineFrom: "2026-09-01" }, caller)).rejects.toThrow("Use due or");
});
test("structured schemas reject malformed calendars, clocks, lengths and extra fields", () => {
  for (const input of [{ title: "Essay", date: "2026-02-30" }, { title: "Essay", time: "25:00" }, { title: "Essay", durationMinutes: 0 }, { title: "Essay", timezone: "Invalid/zone" }, { title: "Essay", ownerId: "other" }]) expect(schemas.create_task.safeParse(input).success).toBe(false);
});
test("HTTP authenticates resource-bound OAuth tokens and returns JSON errors without service details", async () => {
  const request = authorizedRequest("http://localhost:3005/api/v1/day?today=2026-09-29");
  let response = await apiRoute("get_day")(request);
  expect(response.status).toBe(200);
  expect(fake.auth).toHaveBeenCalledWith({ acceptsToken: "oauth_token" });
  expect(await response.json()).toMatchObject({ today: "2026-09-29", timezone: profile.timezone });
  fake.auth.mockResolvedValueOnce({ isAuthenticated: false });
  response = await apiRoute("get_day")(request);
  expect(response.status).toBe(401);
  fake.call.mockRejectedValueOnce(new Error("[Request ID: private] Server Error\nCould not find public function for service:plannerContext"));
  response = await apiRoute("get_day")(request);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private");
});
test("HTTP rejects malformed JSON and accepts standard scopes for writes", async () => {
  const malformed = authorizedRequest("http://localhost:3005/api/v1/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  expect((await apiRoute("create_task")(malformed)).status).toBe(400);
  const response = await apiRoute("create_task")(authorizedRequest("http://localhost:3005/api/v1/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: '{"title":"Essay"}' }));
  expect(response.status).toBe(200);
  expect(response.headers.has("www-authenticate")).toBe(false);
});
test("REST verifies the actual OAuth bearer and uses its verified identity", async () => {
  fake.auth.mockResolvedValue({ isAuthenticated: true, tokenType: "oauth_token", userId: "user_untrusted", scopes: [...SCOPES] });
  const verified = { aud: ["http://localhost:3005/api/v1"], subject: caller.userId, scopes: [...SCOPES], clientId: "fixture", expiration: null, revoked: false, expired: false };
  fake.verifyToken.mockResolvedValue(verified);
  const request = new Request("http://localhost:3005/api/v1/day?today=2026-09-29", { headers: { authorization: "Bearer offline-fixture" } });
  expect((await apiRoute("get_day")(request)).status).toBe(200);
  expect(fake.verifyToken).toHaveBeenCalledWith("offline-fixture", { audience: "http://localhost:3005/api/v1" });
  expect(fake.call.mock.calls.every(call => call[1] === caller.userId)).toBe(true);
  fake.call.mockClear();
  const write = await apiRoute("create_task")(new Request("http://localhost:3005/api/v1/tasks", { method: "POST", headers: { authorization: "Bearer offline-fixture", "content-type": "application/json" }, body: '{"title":"Essay"}' }));
  expect(write.status).toBe(200);
  expect(write.headers.has("www-authenticate")).toBe(false);
  expect(fake.call).toHaveBeenCalled();
  fake.call.mockClear();
  for (const patch of [{ aud: undefined }, { aud: ["http://localhost:3005/mcp"] }, { subject: "org_other" }, { subject: "" }, { revoked: true }, { expired: true }]) {
    fake.verifyToken.mockResolvedValueOnce({ ...verified, ...patch });
    const response = await apiRoute("get_day")(request);
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain('error="invalid_token"');
  }
  fake.verifyToken.mockRejectedValueOnce(new Error("Private provider response"));
  const failed = await apiRoute("get_day")(request);
  expect(failed.status).toBe(401);
  expect(await failed.text()).not.toContain("Private");
  fake.verifyToken.mockClear();
  expect((await apiRoute("get_day")(new Request(request.url))).status).toBe(401);
  expect(fake.verifyToken).not.toHaveBeenCalled();
});
test("REST refuses unsupported token types before contacting the backend", async () => {
  fake.auth.mockResolvedValueOnce({ isAuthenticated: true, tokenType: "session_token" });
  expect((await apiRoute("get_day")(authorizedRequest("http://localhost:3005/api/v1/day"))).status).toBe(401);
  expect(fake.call).not.toHaveBeenCalled();
  expect(fake.verifyToken).not.toHaveBeenCalled();
});
test("public login configuration echoes a device calendar and never guesses an anonymous timezone", async () => {
  vi.stubEnv("CLERK_CLI_CLIENT_ID", "public_test_client");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "public_test_key");
  const response = await authConfig(new Request("http://localhost:3005/api/v1/auth-config?today=2026-09-29&timezone=America%2FNew_York"));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ clientId: "public_test_client", resource: "http://localhost:3005/api/v1", today: "2026-09-29", timezone: "America/New_York", scopes: [...SCOPES, "offline_access"] });
  expect((await authConfig(new Request("http://localhost:3005/api/v1/auth-config"))).status).toBe(400);
  vi.stubEnv("CLERK_CLI_CLIENT_ID", "");
  expect((await authConfig(new Request("http://localhost:3005/api/v1/auth-config"))).status).toBe(503);
});
test("MCP refuses an API-audience token before executing a write", async () => {
  const request = authorizedRequest("http://localhost:3005/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "quick_add", arguments: { text: "Essay" } } }) });
  const response = await mcpPost(request);
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toContain('/.well-known/oauth-protected-resource/mcp');
  expect(fake.call).not.toHaveBeenCalled();
});
test("MCP OAuth tokens are bound to this resource and a live user identity", async () => {
  const request = new Request("http://localhost:3005/mcp");
  const verified = { aud: ["http://localhost:3005/mcp"], subject: caller.userId, scopes: [...SCOPES], clientId: "fixture", expiration: null, revoked: false, expired: false };
  fake.verifyToken.mockResolvedValue(verified);
  expect(await verifyMcpBearer(request, "offline-fixture")).toMatchObject({ clientId: "fixture", extra: { userId: caller.userId } });
  expect(fake.verifyToken).toHaveBeenCalledWith("offline-fixture", { audience: "http://localhost:3005/mcp" });
  for (const patch of [{ aud: undefined }, { aud: ["http://localhost:3005/api/v1"] }, { subject: "org_other" }, { revoked: true }, { expired: true }]) {
    fake.verifyToken.mockResolvedValueOnce({ ...verified, ...patch });
    expect(await verifyMcpBearer(request, "offline-fixture")).toBeUndefined();
  }
  fake.verifyToken.mockRejectedValueOnce(new Error("Provider error must remain private"));
  expect(await verifyMcpBearer(request, "offline-fixture")).toBeUndefined();
  expect(await verifyMcpBearer(request)).toBeUndefined();
});
test("compound requests share one signed invocation budget and writes use their own bucket", async () => {
  await runOperation("get_overview", { today: "2026-09-29" }, caller);
  const invocations = fake.call.mock.calls.map(call => call[4]);
  expect(invocations).toHaveLength(3);
  expect(invocations.every(invocation => invocation.id === invocations[0].id && invocation.kind === "read")).toBe(true);
  fake.call.mockClear();
  await runOperation("create_task", { title: "Essay" }, caller);
  expect(fake.call.mock.calls.map(call => call[4]).every(invocation => invocation.kind === "write")).toBe(true);
});
test("Origin checks apply to native callers, local development and explicit browser allowlist", () => {
  const request = (origin?: string) => new Request("http://localhost:3005/mcp", { headers: origin ? { origin } : {} });
  vi.stubEnv("NODE_ENV", "development");
  expect(trustedOrigin(request())).toBe(true);
  expect(trustedOrigin(request("http://localhost:3005"))).toBe(true);
  expect(trustedOrigin(request("http://attacker.test"))).toBe(false);
  expect(trustedOrigin(request("null"))).toBe(false);
  vi.stubEnv("NODE_ENV", "production");
  expect(trustedOrigin(request("http://localhost:3005"))).toBe(false);
  vi.stubEnv("MCP_ALLOWED_ORIGINS", "https://trusted.example");
  expect(trustedOrigin(request("https://trusted.example"))).toBe(true);
});

test("public audience and challenges ignore internal proxy URLs and untrusted forwarded headers", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("MCP_PUBLIC_ORIGIN", "https://planner.example");
  const request = new Request("http://localhost:3000/mcp", { method: "POST", headers: { "x-forwarded-host": "attacker.example", "x-forwarded-proto": "http" }, body: JSON.stringify({ method: "tools/call", params: { name: "quick_add" } }) });
  expect(mcpResourceUrl(request)).toBe("https://planner.example/mcp");
  expect(apiResourceUrl(request)).toBe("https://planner.example/api/v1");
  vi.stubEnv("CLERK_CLI_CLIENT_ID", "public_test_client");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "public_test_key");
  const configured = await authConfig(new Request("http://localhost:3000/api/v1/auth-config?timezone=America%2FNew_York", { headers: { "x-forwarded-host": "attacker.example" } }));
  expect(await configured.json()).toMatchObject({ resource: "https://planner.example/api/v1" });
  fake.auth.mockResolvedValueOnce({ isAuthenticated: false });
  expect((await apiRoute("get_day")(request)).headers.get("www-authenticate")).toContain("https://planner.example/.well-known/oauth-protected-resource/api/v1");
  const unauthenticated = await mcpPost(request);
  expect(unauthenticated.status).toBe(401);
  expect(unauthenticated.headers.get("www-authenticate")).toContain("https://planner.example/.well-known/oauth-protected-resource/mcp");
  fake.verifyToken.mockResolvedValue({ aud: ["https://planner.example/mcp"], subject: caller.userId, scopes: [], clientId: "fixture", expiration: null, revoked: false, expired: false });
  expect(await verifyMcpBearer(request, "offline-fixture")).toBeDefined();
  expect(fake.verifyToken).toHaveBeenCalledWith("offline-fixture", { audience: "https://planner.example/mcp" });
  request.auth = { token: "offline-fixture", clientId: "fixture", scopes: [], extra: { userId: caller.userId } };
});

async function rpc(handler: ReturnType<typeof createPlannerMcp>, method: string, version: string, params: Record<string, unknown> = {}) {
  const modern = version === "2026-07-28";
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json, text/event-stream", "MCP-Protocol-Version": version };
  if (modern) { headers["Mcp-Method"] = method; if (method === "tools/call" || method === "prompts/get") headers["Mcp-Name"] = String(params.name); }
  const request = new Request("http://localhost:3005/mcp", { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: modern ? { ...params, _meta: { "io.modelcontextprotocol/protocolVersion": version, "io.modelcontextprotocol/clientCapabilities": {}, "io.modelcontextprotocol/clientInfo": { name: "offline-test", version: "1" } } } : params }) });
  request.auth = { token: "offline-fixture", clientId: "fixture", scopes: [...SCOPES], extra: { userId: caller.userId } };
  const response = await handler(request);
  const body = await response.text();
  const json: unknown = JSON.parse(body.startsWith("event:") || body.startsWith("data:") ? body.split("\n").find(line => line.startsWith("data: "))?.slice(6) ?? "{}" : body);
  return { response, json };
}
for (const version of ["2025-11-25", "2026-07-28"]) test(`real MCP SDK serves list and call on ${version} without network`, async () => {
  const handler = createPlannerMcp();
  const opening = await rpc(handler, version === "2026-07-28" ? "server/discover" : "initialize", version, version === "2026-07-28" ? {} : { protocolVersion: version, capabilities: {}, clientInfo: { name: "test", version: "1" } });
  expect(opening.response.status, JSON.stringify(opening.json)).toBe(200);
  expect(opening.response.headers.has("mcp-session-id")).toBe(false);
  const listed = await rpc(handler, "tools/list", version);
  expect(listed.response.status).toBe(200);
  expect(listed.json).toMatchObject({ result: { tools: expect.arrayContaining([expect.objectContaining({ name: "quick_add", _meta: { securitySchemes: [{ type: "oauth2", scopes: [...SCOPES] }] } })]) } });
  const prompts = await rpc(handler, "prompts/list", version);
  expect(prompts.json).toMatchObject({ result: { prompts: expect.arrayContaining([expect.objectContaining({ name: "organize_my_life" }), expect.objectContaining({ name: "plan_my_week" })]) } });
  const organise = await rpc(handler, "prompts/get", version, { name: "organize_my_life", arguments: { focus: "this semester" } });
  expect(JSON.stringify(organise.json)).toContain("apply_plan call with dryRun: true");
  expect(JSON.stringify(organise.json)).toContain("Focus: this semester");
  const called = await rpc(handler, "tools/call", version, { name: "get_overview", arguments: { today: "2026-09-29" } });
  expect(called.response.status).toBe(200);
  expect(JSON.stringify(called.json)).toContain("active tasks today");
  const added = await rpc(handler, "tools/call", version, { name: "quick_add", arguments: { text: "Essay", today: "2026-09-29" } });
  expect(added.response.status).toBe(200);
  expect(added.json).toMatchObject({ result: { structuredContent: { ok: true, id: "task", readBack: expect.any(String), task: { id: "task", durationMinutes: null } } } });
  const completed = await rpc(handler, "tools/call", version, { name: "complete_task", arguments: { id: "task", today: "2026-09-29" } });
  expect(completed.response.status).toBe(200);
  expect(completed.json).toMatchObject({ result: { structuredContent: { ok: true, id: "task", nextOccurrence: { id: "next" } } } });
});
