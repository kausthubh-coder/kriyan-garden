/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { canonicalJson } from "../canonical";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
function setup() { const t = convexTest(schema, modules); rateLimiter.register(t); vi.stubEnv("SERVICE_SECRET", "test-secret"); return t; }
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
async function signed(operation: string, payload: Record<string, unknown> = {}, ownerId = "user_test", invocation?: { id: string; kind: "read" | "write" }) {
  const timestamp = Date.now(), nonce = crypto.randomUUID();
  const body = { ...payload, ...(invocation ? { invocation } : {}) };
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode("test-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const raw = await crypto.subtle.sign("HMAC", key, encoder.encode(canonicalJson([timestamp, nonce, ownerId, operation, body])));
  const signature = [...new Uint8Array(raw)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return { ...body, ownerId, timestamp, nonce, signature };
}
test("60 read and 30 write invocations per minute, independent users and categories", async () => {
  const t = setup(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-29T12:00:01Z"));
  for (let index = 0; index < 60; index++) await t.action(api.service.areasList, await signed("areas.list"));
  await expect(t.action(api.service.areasList, await signed("areas.list"))).rejects.toThrow("RATE_LIMITED");
  expect(await t.action(api.service.areasList, await signed("areas.list", {}, "user_other"))).toEqual([]);
  for (let index = 0; index < 30; index++) await t.action(api.service.profilesEnsure, await signed("profiles.ensure"));
  await expect(t.action(api.service.profilesEnsure, await signed("profiles.ensure"))).rejects.toThrow("RATE_LIMITED");
  vi.setSystemTime(new Date("2026-09-29T12:01:01Z"));
  expect(await t.action(api.service.areasList, await signed("areas.list"))).toHaveLength(3);
});
test("compound calls debit once, read budgets cannot authorize writes, invocation claims expire", async () => {
  const t = setup(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-29T12:00:01Z"));
  for (let index = 0; index < 60; index++) {
    const invocation = { id: crypto.randomUUID(), kind: "read" as const };
    await t.action(api.service.plannerContext, await signed("planner.context", {}, "user_test", invocation));
    await t.action(api.service.areasList, await signed("areas.list", {}, "user_test", invocation));
    await t.action(api.service.projectsList, await signed("projects.list", {}, "user_test", invocation));
  }
  await expect(t.action(api.service.areasList, await signed("areas.list", {}, "user_test", { id: "new", kind: "read" }))).rejects.toThrow("RATE_LIMITED");
  await expect(t.action(api.service.profilesEnsure, await signed("profiles.ensure", {}, "user_test", { id: "read-only", kind: "read" }))).rejects.toThrow("Invalid service invocation");
  const invocation = { id: "stale", kind: "write" as const };
  await t.action(api.service.profilesEnsure, await signed("profiles.ensure", {}, "user_test", invocation));
  vi.setSystemTime(new Date("2026-09-29T12:06:01Z"));
  await expect(t.action(api.service.areasList, await signed("areas.list", {}, "user_test", invocation))).rejects.toThrow("Expired or invalid");
  await t.mutation(internal.serviceInternal.cleanupNonces, {});
  expect(await t.run(ctx => ctx.db.query("serviceInvocations").withIndex("by_owner_request", q => q.eq("ownerId", "user_test").eq("requestId", "stale")).first())).toBeNull();
});
test("tampering with an invocation changes the signature and cross-owner records remain private", async () => {
  const t = setup();
  const envelope = await signed("areas.list", {}, "user_test", { id: "original", kind: "read" });
  await expect(t.action(api.service.areasList, { ...envelope, invocation: { id: "altered", kind: "write" } })).rejects.toThrow("signature");
  await t.action(api.service.profilesEnsure, await signed("profiles.ensure"));
  const created = await t.action(api.service.tasksCreate, { ...await signed("tasks.create", { title: "Owned task" }), title: "Owned task" });
  await expect(t.action(api.service.tasksGet, { ...await signed("tasks.get", { id: created._id }, "user_other"), id: created._id })).rejects.toThrow("not found");
});
test("task filters apply before limit, combine indexed references and exclude other owners", async () => {
  const t = setup(); const a = t.withIdentity({ subject: "user_test" });
  await a.mutation(api.profiles.ensure, {});
  const areas = await a.query(api.areas.list, {}), area = areas[0];
  if (!area) throw new Error("Missing fixture area");
  const project = await a.mutation(api.projects.create, { areaId: area._id, name: "Econ" });
  await t.run(async ctx => {
    for (let index = 0; index < 110; index++) await ctx.db.insert("tasks", { ownerId: "user_test", createdAt: 0, updatedAt: 0, title: "Other task", areaId: area._id, projectId: null, goalId: null, date: null, time: null, durationMinutes: null, deadline: null, repeat: null, reminders: [], notes: "", status: "active", completedAt: null, sortOrder: index, searchText: "Other task" });
  });
  const task = await a.mutation(api.tasks.create, { title: "Essay needle", projectId: project._id, date: "2026-09-29", deadline: "2026-10-01" });
  const filters = { projectId: project._id, status: "active" as const, text: "NEEDLE", dateFrom: "2026-09-29", dateTo: "2026-09-29", deadlineFrom: "2026-10-01", deadlineTo: "2026-10-01", limit: 1 };
  expect(await t.action(api.service.tasksFilteredList, { ...await signed("tasks.filteredList", filters), ...filters })).toEqual([task]);
  const text = { text: "needle", limit: 1 };
  expect(await t.action(api.service.tasksFilteredList, { ...await signed("tasks.filteredList", text), ...text })).toEqual([task]);
  expect(await t.action(api.service.tasksFilteredList, { ...await signed("tasks.filteredList", text, "user_other"), ...text })).toEqual([]);
});
test("repeat completion names the actual created occurrence, duplicate complete creates nothing", async () => {
  const t = setup(); const a = t.withIdentity({ subject: "user_test" });
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-29T12:00:00Z"));
  await a.mutation(api.profiles.ensure, { timezone: "UTC" });
  const task = await a.mutation(api.tasks.create, { title: "Practice", date: "2026-09-29", time: "14:00", repeat: { every: 1, unit: "day" }, reminders: [{ type: "at_start" }] });
  const args = { id: task._id };
  const first = await t.action(api.service.tasksCompleteWithNext, { ...await signed("tasks.completeWithNext", args), ...args });
  expect(first.task.status).toBe("completed");
  expect(first.nextOccurrence).toMatchObject({ title: "Practice", date: "2026-09-30", status: "active", durationMinutes: null });
  expect((await t.action(api.service.tasksCompleteWithNext, { ...await signed("tasks.completeWithNext", args), ...args })).nextOccurrence).toBeNull();
  expect(await a.query(api.tasks.list, {})).toHaveLength(2);
  const jobs = await t.run(ctx => ctx.db.query("reminderJobs").withIndex("by_owner", q => q.eq("ownerId", "user_test")).collect());
  expect(jobs).toHaveLength(2);
  expect(jobs.find(job => job.taskId === task._id)).toMatchObject({ state: "cancelled" });
  expect(jobs.find(job => job.taskId === first.nextOccurrence?._id)).toMatchObject({ state: "pending", fireAt: Date.parse("2026-09-30T14:00:00Z") });
});
test("progress mutation keeps the current target/unit and rejects task metrics or foreign owners", async () => {
  const t = setup(); const a = t.withIdentity({ subject: "user_test" });
  const area = await a.mutation(api.areas.create, { name: "Life" });
  const goal = await a.mutation(api.goals.create, { areaId: area._id, title: "Read", startDate: "2026-09-29", metric: { kind: "number", current: 0, target: 10, unit: "books" } });
  await a.mutation(api.goals.update, { id: goal._id, patch: { metric: { kind: "number", current: 0, target: 20, unit: "chapters" } } });
  const args = { id: goal._id, current: 3 };
  expect(await t.action(api.service.goalsSetProgress, { ...await signed("goals.setProgress", args), ...args })).toMatchObject({ metric: { current: 3, target: 20, unit: "chapters" } });
  await expect(t.action(api.service.goalsSetProgress, { ...await signed("goals.setProgress", args, "user_other"), ...args })).rejects.toThrow("not found");
  await a.mutation(api.goals.update, { id: goal._id, patch: { metric: { kind: "tasks" } } });
  await expect(t.action(api.service.goalsSetProgress, { ...await signed("goals.setProgress", args), ...args })).rejects.toThrow("Invalid goal progress");
});
test("reminders require a date and timed reminders require a time", async () => {
  const t = setup(); const a = t.withIdentity({ subject: "user_test" }); await a.mutation(api.profiles.ensure, {});
  await expect(a.mutation(api.tasks.create, { title: "Call", reminders: [{ type: "morning_of" }] })).rejects.toThrow("Set a date");
  await expect(a.mutation(api.tasks.create, { title: "Call", date: "2026-09-29", reminders: [{ type: "before", minutes: 10 }] })).rejects.toThrow("Set a time");
  await expect(a.mutation(api.tasks.create, { title: "Call", date: "2026-09-29", reminders: [{ type: "at_start" }] })).rejects.toThrow("Set a time");
  await expect(a.mutation(api.tasks.create, { title: "Call", date: "2026-09-29", reminders: Array.from({ length: 9 }, () => ({ type: "morning_of" as const })) })).rejects.toThrow("at most 8");
});
