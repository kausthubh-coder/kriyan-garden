/// <reference types="vite/client" />
import { goalProgress } from "@kriyan/core";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { canonicalJson } from "../canonical";
const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
function setup() {
  const t = convexTest(schema, modules);
  return { t, a: t.withIdentity({ subject: "user-a" }), b: t.withIdentity({ subject: "user-b" }) };
}
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

test("sample data is relative to client today, isolated, complete and idempotent", async () => {
  const { t, a, b } = setup();
  await expect(t.mutation(api.profiles.seedSample, { today: "2026-09-29" })).rejects.toThrow("Not authenticated");
  await a.mutation(api.profiles.seedSample, { today: "2026-09-29" });
  expect(await a.query(api.profiles.get, {})).toMatchObject({ onboardingComplete: true });
  const rows = await a.query(api.tasks.list, {});
  expect(rows).toHaveLength(25);
  expect(rows.find(row => row.title === "Send the September invoice to Hartley")).toMatchObject({ date: "2026-09-29", time: "16:00", durationMinutes: null });
  expect(rows.find(row => row.title === "Calculus problem sheet 5")).toMatchObject({ date: "2026-09-30" });
  expect(rows.find(row => row.title === "Gym, legs")?.status).toBe("completed");
  expect(await a.query(api.projects.list, {})).toHaveLength(7);
  const sampleGoals = await a.query(api.goals.list, {});
  expect(sampleGoals).toHaveLength(3);
  for (const goal of sampleGoals) {
    expect(goal.startDate < "2026-09-29").toBe(true);
    expect(goal.targetDate && goal.targetDate > "2026-09-29").toBe(true);
    expect(goalProgress(goal, "2026-09-29").expected).toBeGreaterThan(0);
    expect(goalProgress(goal, "2026-09-29").status).not.toBe("No target date");
  }
  expect(await a.query(api.events.list, {})).toHaveLength(7);
  await a.mutation(api.profiles.seedSample, { today: "2026-09-30" });
  expect(await a.query(api.tasks.list, {})).toEqual(rows);
  expect(await b.query(api.tasks.list, {})).toEqual([]);
  expect(await b.query(api.areas.list, {})).toEqual([]);
  await expect(b.mutation(api.profiles.seedSample, { today: "2026-02-30" })).rejects.toThrow("Invalid date");
});
test("sample refuses to overwrite real onboarding records and transaction rolls back", async () => {
  const { a } = setup();
  await a.mutation(api.profiles.ensure, {});
  const task = await a.mutation(api.tasks.create, { title: "My task" });
  await expect(a.mutation(api.profiles.seedSample, { today: "2026-09-29" })).rejects.toThrow("already has records");
  expect(await a.query(api.tasks.list, {})).toEqual([task]);
  expect(await a.query(api.projects.list, {})).toEqual([]);
  expect(await a.query(api.profiles.get, {})).toMatchObject({ onboardingComplete: false });
});

test("owner isolation for area, project, goal, task, event, habit, milestone and logs", async () => {
  const { a, b } = setup();
  const area = await a.mutation(api.areas.create, { name: "School" });
  const project = await a.mutation(api.projects.create, { areaId: area._id, name: "Econ" });
  const goal = await a.mutation(api.goals.create, { areaId: area._id, title: "Finish course", startDate: "2026-09-28" });
  const task = await a.mutation(api.tasks.create, { title: "Essay", areaId: area._id, projectId: project._id, goalId: goal._id });
  const event = await a.mutation(api.events.create, { title: "Lecture", areaId: area._id, weekdays: [1], startTime: "10:00", endTime: "11:00", fromDate: "2026-09-01" });
  const habit = await a.mutation(api.habits.create, { areaId: area._id, title: "Read", weeklyTarget: 3 });
  for (const ref of [api.areas.list, api.projects.list, api.goals.list, api.tasks.list, api.events.list, api.habits.list]) expect(await b.query(ref, {})).toEqual([]);
  await expect(b.query(api.areas.get, { id: area._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.areas.update, { id: area._id, patch: { name: "Changed" } })).rejects.toThrow("not found");
  await expect(b.mutation(api.areas.remove, { id: area._id })).rejects.toThrow("not found");
  await expect(b.query(api.projects.get, { id: project._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.projects.update, { id: project._id, patch: { name: "Changed" } })).rejects.toThrow("not found");
  await expect(b.mutation(api.projects.remove, { id: project._id })).rejects.toThrow("not found");
  await expect(b.query(api.goals.get, { id: goal._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.goals.update, { id: goal._id, patch: { title: "Changed" } })).rejects.toThrow("not found");
  await expect(b.mutation(api.goals.remove, { id: goal._id })).rejects.toThrow("not found");
  await expect(b.query(api.tasks.get, { id: task._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.tasks.update, { id: task._id, patch: { title: "Changed" } })).rejects.toThrow("not found");
  await expect(b.mutation(api.tasks.remove, { id: task._id })).rejects.toThrow("not found");
  await expect(b.query(api.events.get, { id: event._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.events.update, { id: event._id, patch: { title: "Changed" } })).rejects.toThrow("not found");
  await expect(b.mutation(api.events.remove, { id: event._id })).rejects.toThrow("not found");
  await expect(b.query(api.habits.get, { id: habit._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.habits.update, { id: habit._id, patch: { title: "Changed" } })).rejects.toThrow("not found");
  await expect(b.mutation(api.habits.remove, { id: habit._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.tasks.create, { title: "Wrong owner", areaId: area._id })).rejects.toThrow("not found");
  const milestone = await a.mutation(api.goals.createMilestone, { goalId: goal._id, title: "Outline" });
  const log = await a.mutation(api.habits.log, { habitId: habit._id, date: "2026-09-28" });
  await expect(b.mutation(api.goals.updateMilestone, { id: milestone._id, patch: { title: "Changed" } })).rejects.toThrow("not found");
  await expect(b.mutation(api.goals.removeMilestone, { id: milestone._id })).rejects.toThrow("not found");
  await expect(b.query(api.habits.listLogs, { habitId: habit._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.habits.removeLog, { id: log._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.tasks.complete, { id: task._id })).rejects.toThrow("not found");
  await expect(b.mutation(api.tasks.reopen, { id: task._id })).rejects.toThrow("not found");
});
test("unauthenticated queries and writes fail", async () => {
  const { t } = setup();
  await expect(t.query(api.areas.list, {})).rejects.toThrow("Not authenticated");
  await expect(t.mutation(api.profiles.ensure, {})).rejects.toThrow("Not authenticated");
});
test("ensure creates exactly three default areas once and preserves profile settings", async () => {
  const { a } = setup();
  const first = await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const second = await a.mutation(api.profiles.ensure, { timezone: "Europe/London" });
  expect(second).toEqual(first);
  expect(first).toMatchObject({ dailyCapacityMinutes: 360, dayStartHour: 7, dayEndHour: 23, timezone: "America/New_York", onboardingComplete: false });
  expect((await a.query(api.areas.list, {})).map(({ name, color }) => ({ name, color }))).toEqual([{ name: "School", color: "blue" }, { name: "Business", color: "orange" }, { name: "Life", color: "green" }]);
  expect(await a.mutation(api.profiles.completeOnboarding, {})).toMatchObject({ onboardingComplete: true });
});
test("task project/area, patch semantics, time/date and optional rounded duration rules", async () => {
  const { a } = setup();
  const school = await a.mutation(api.areas.create, { name: " School " });
  const life = await a.mutation(api.areas.create, { name: "Life" });
  const project = await a.mutation(api.projects.create, { areaId: school._id, name: "Econ" });
  await expect(a.mutation(api.tasks.create, { title: "Essay", areaId: life._id, projectId: project._id })).rejects.toThrow("another area");
  const task = await a.mutation(api.tasks.create, { title: " Essay ", projectId: project._id, notes: " <p>Outline</p> " });
  expect(task).toMatchObject({ title: "Essay", areaId: school._id, durationMinutes: null, date: null, time: null, searchText: "Essay Outline" });
  await expect(a.mutation(api.tasks.update, { id: task._id, patch: { time: "10:00" } })).rejects.toThrow("needs a date");
  const scheduled = await a.mutation(api.tasks.update, { id: task._id, patch: { time: "10:00", date: "2026-09-28", durationMinutes: 12.7 } });
  expect(scheduled).toMatchObject({ time: "10:00", durationMinutes: 13, notes: task.notes });
  expect(await a.mutation(api.tasks.update, { id: task._id, patch: { date: null } })).toMatchObject({ date: null, time: null });
  expect(await a.mutation(api.tasks.update, { id: task._id, patch: { areaId: life._id, durationMinutes: 0 } })).toMatchObject({ areaId: life._id, projectId: null, durationMinutes: 1 });
  expect(await a.mutation(api.tasks.update, { id: task._id, patch: { projectId: project._id, durationMinutes: 2000 } })).toMatchObject({ areaId: school._id, durationMinutes: 1440 });
  expect(await a.mutation(api.tasks.update, { id: task._id, patch: { durationMinutes: null } })).toMatchObject({ durationMinutes: null });
  await expect(a.mutation(api.tasks.create, { title: "Bad date", date: "2026-02-30" })).rejects.toThrow("Invalid date");
  await expect(a.mutation(api.tasks.create, { title: "Bad time", date: "2026-09-28", time: "25:00" })).rejects.toThrow("Invalid time");
  await expect(a.mutation(api.areas.remove, { id: school._id })).rejects.toThrow("in use");
});
test("all owner caps and the active-task cap are enforced", async () => {
  const { t, a } = setup();
  const area = await a.mutation(api.areas.create, { name: "School" });
  await t.run(async (ctx) => {
    for (let i = 1; i < 12; i++) await ctx.db.insert("areas", { ownerId: "user-a", createdAt: 0, updatedAt: 0, name: "Area", color: "grey", sortOrder: i });
    for (let i = 0; i < 200; i++) await ctx.db.insert("projects", { ownerId: "user-a", createdAt: 0, updatedAt: 0, areaId: area._id, name: "Project", kind: "project", note: "", sortOrder: i, archivedAt: null });
    for (let i = 0; i < 100; i++) {
      await ctx.db.insert("goals", { ownerId: "user-a", createdAt: 0, updatedAt: 0, areaId: area._id, title: "Goal", note: "", startDate: "2026-09-28", targetDate: null, metric: { kind: "tasks" }, status: "active", sortOrder: i });
      await ctx.db.insert("events", { ownerId: "user-a", createdAt: 0, updatedAt: 0, areaId: area._id, title: "Event", location: "", weekdays: [1], startTime: "10:00", endTime: "11:00", fromDate: "2026-09-28", untilDate: null });
    }
    for (let i = 0; i < 50; i++) await ctx.db.insert("habits", { ownerId: "user-a", createdAt: 0, updatedAt: 0, areaId: area._id, title: "Habit", weeklyTarget: 3, archivedAt: null });
    for (let i = 0; i < 5000; i++) await ctx.db.insert("tasks", { ownerId: "user-a", createdAt: 0, updatedAt: 0, title: "Task", areaId: area._id, projectId: null, goalId: null, date: null, time: null, durationMinutes: null, deadline: null, repeat: null, reminders: [], notes: "", status: "active", completedAt: null, sortOrder: i, searchText: "Task" });
  });
  await expect(a.mutation(api.areas.create, { name: "Extra" })).rejects.toThrow("12 areas");
  await expect(a.mutation(api.projects.create, { name: "Extra", areaId: area._id })).rejects.toThrow("200 projects");
  await expect(a.mutation(api.goals.create, { title: "Extra", areaId: area._id, startDate: "2026-09-28" })).rejects.toThrow("100 goals");
  await expect(a.mutation(api.events.create, { title: "Extra", weekdays: [1], startTime: "10:00", endTime: "11:00", fromDate: "2026-09-28" })).rejects.toThrow("100 events");
  await expect(a.mutation(api.habits.create, { title: "Extra", areaId: area._id, weeklyTarget: 3 })).rejects.toThrow("50 habits");
  await expect(a.mutation(api.tasks.create, { title: "Extra", areaId: area._id })).rejects.toThrow("5000 active tasks");
}, 30_000);
test("weekly and daily completion create the next occurrence; completion is idempotent and reopening keeps it", async () => {
  const { a } = setup();
  await a.mutation(api.profiles.ensure, {});
  const weekly = await a.mutation(api.tasks.create, { title: "Study", date: "2026-09-28", time: "10:00", repeat: { every: 1, unit: "week", weekdays: [1, 4] }, deadline: "2026-10-01", notes: "Notes" });
  await a.mutation(api.tasks.complete, { id: weekly._id });
  await a.mutation(api.tasks.complete, { id: weekly._id });
  let active = await a.query(api.tasks.list, { status: "active" });
  expect(active).toHaveLength(1);
  expect(active[0]).toMatchObject({ date: "2026-10-01", time: "10:00", notes: "Notes", deadline: "2026-10-01" });
  expect(active[0]?._id).not.toBe(weekly._id);
  await a.mutation(api.tasks.reopen, { id: weekly._id });
  expect(await a.query(api.tasks.list, { status: "active" })).toHaveLength(2);
  const daily = await a.mutation(api.tasks.create, { title: "Read", date: "2026-09-28", repeat: { every: 1, unit: "day" } });
  await a.mutation(api.tasks.complete, { id: daily._id });
  active = await a.query(api.tasks.list, { status: "active" });
  expect(active.find((row) => row.title === "Read")?.date).toBe("2026-09-29");
});
test("month-end and leap-year repeats clamp to the final day", async () => {
  const { a } = setup(); await a.mutation(api.profiles.ensure, {});
  for (const input of [{ date: "2026-01-31", unit: "month" as const, expected: "2026-02-28" }, { date: "2024-02-29", unit: "year" as const, expected: "2025-02-28" }]) {
    const task = await a.mutation(api.tasks.create, { title: input.unit, date: input.date, repeat: { every: 1, unit: input.unit } });
    await a.mutation(api.tasks.complete, { id: task._id });
    expect((await a.query(api.tasks.list, { status: "active" })).find((row) => row.title === input.unit)?.date).toBe(input.expected);
  }
});
test("day and week return the same task/event shapes and active duration totals", async () => {
  const { a } = setup(); await a.mutation(api.profiles.ensure, {});
  const areas = await a.query(api.areas.list, {});
  const school = areas[0], business = areas[1];
  if (!school || !business) throw new Error("Missing default areas");
  await a.mutation(api.tasks.create, { title: "Timed", areaId: school._id, date: "2026-09-28", time: "10:00", durationMinutes: 60 });
  await a.mutation(api.tasks.create, { title: "Anytime", areaId: business._id, date: "2026-09-28", durationMinutes: 30 });
  await a.mutation(api.tasks.create, { title: "No length", date: "2026-09-28" });
  await a.mutation(api.tasks.create, { title: "Unscheduled", durationMinutes: 120 });
  const done = await a.mutation(api.tasks.create, { title: "Done", date: "2026-09-28", durationMinutes: 45 });
  await a.mutation(api.tasks.complete, { id: done._id });
  await a.mutation(api.events.create, { title: "Lecture", weekdays: [1], startTime: "11:00", endTime: "12:00", fromDate: "2026-09-28", untilDate: "2026-09-28" });
  await a.mutation(api.events.create, { title: "Outside term", weekdays: [1], startTime: "11:00", endTime: "12:00", fromDate: "2026-10-01" });
  const day = await a.query(api.day.get, { date: "2026-09-28" });
  expect(day.timed.map((row) => row.title)).toEqual(["Timed"]);
  expect(day.anytime.map((row) => row.title)).toEqual(["Anytime", "No length", "Done"]);
  expect(day.unscheduled.map((row) => row.title)).toEqual(["Unscheduled"]);
  expect(day.events.map((row) => row.title)).toEqual(["Lecture"]);
  expect(day.plannedMinutes).toBe(90); expect(day.countWithoutDuration).toBe(1);
  const week = await a.query(api.week.get, { startDate: "2026-09-28" });
  expect(week).toHaveLength(7);
  expect(week[0]).toEqual({ ...day, plannedMinutesByArea: { [school._id]: 60, [business._id]: 30 }, taskCount: 3 });
  expect(week[6]?.date).toBe("2026-10-04"); expect(week[6]?.plannedMinutes).toBe(0);
});
test("quickAdd uses parsed fields, first area by sort order, and today for a time alone", async () => {
  const { a } = setup(); await a.mutation(api.profiles.ensure, {});
  const areas = await a.query(api.areas.list, {}); const first = areas[0];
  if (!first) throw new Error("Missing default area");
  const project = await a.mutation(api.projects.create, { areaId: first._id, name: "Econ 101" });
  expect(await a.mutation(api.tasks.quickAdd, { text: "essay fri 5pm #econ 2h", today: "2026-09-28" })).toMatchObject({ title: "Essay", date: "2026-10-02", time: "17:00", durationMinutes: 120, projectId: project._id, areaId: first._id });
  expect(await a.mutation(api.tasks.quickAdd, { text: "call 3pm", today: "2026-09-28" })).toMatchObject({ title: "Call", date: "2026-09-28", time: "15:00", durationMinutes: null, areaId: first._id });
  expect(await a.mutation(api.tasks.quickAdd, { text: "read", today: "2026-09-28" })).toMatchObject({ date: null, durationMinutes: null, areaId: first._id });
});
test("goals include linked task counts and milestones; habit logging is idempotent", async () => {
  const { a } = setup(); const area = await a.mutation(api.areas.create, { name: "School" });
  const goal = await a.mutation(api.goals.create, { areaId: area._id, title: "Essay", startDate: "2026-09-28" });
  const task = await a.mutation(api.tasks.create, { title: "Outline", areaId: area._id, goalId: goal._id });
  await a.mutation(api.tasks.complete, { id: task._id });
  await a.mutation(api.goals.createMilestone, { goalId: goal._id, title: "Draft" });
  const goals = await a.query(api.goals.list, {});
  expect(goals[0]?.linkedTasks).toEqual({ total: 1, done: 1 }); expect(goals[0]?.milestones).toHaveLength(1);
  const habit = await a.mutation(api.habits.create, { areaId: area._id, title: "Read", weeklyTarget: 3 });
  const args = { habitId: habit._id, date: "2026-09-28" };
  expect(await a.mutation(api.habits.log, args)).toEqual(await a.mutation(api.habits.log, args));
});
async function signed(operation: string, payload: unknown, ownerId = "user-a", timestamp = Date.now(), nonce = crypto.randomUUID()) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode("test-service-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, encoder.encode(canonicalJson([timestamp, nonce, ownerId, operation, payload])));
  const signature = [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { ownerId, timestamp, nonce, signature };
}
test("service signatures reject tampering, expired/future timestamps, cross-owner replay and reused nonces", async () => {
  vi.stubEnv("SERVICE_SECRET", "test-service-secret");
  const { t } = setup();
  const payload = { name: "School" }; const envelope = await signed("areas.create", payload);
  expect(await t.action(api.service.areasCreate, { ...envelope, ...payload })).toMatchObject({ name: "School", ownerId: "user-a" });
  await expect(t.action(api.service.areasCreate, { ...envelope, ...payload })).rejects.toThrow("Reused");
  await expect(t.action(api.service.areasCreate, { ...await signed("areas.create", payload), name: "Tampered" })).rejects.toThrow("signature");
  await expect(t.action(api.service.areasCreate, { ...await signed("areas.create", payload, "user-a", Date.now() - 300_001), ...payload })).rejects.toThrow("Expired");
  await expect(t.action(api.service.areasCreate, { ...await signed("areas.create", payload, "user-a", Date.now() + 600_000), ...payload })).rejects.toThrow("Expired");
  await expect(t.action(api.service.areasCreate, { ...envelope, ownerId: "user-b", ...payload })).rejects.toThrow("signature");
  expect(await t.action(api.service.areasList, { ...await signed("areas.list", {}, "user-b") })).toEqual([]);
  expect(await t.action(api.service.areasList, { ...await signed("areas.list", {}) })).toHaveLength(1);
});
test("signed task writes call the shared rules and reset keeps replay protection", async () => {
  vi.stubEnv("SERVICE_SECRET", "test-service-secret");
  const { t } = setup();
  await t.action(api.service.profilesEnsure, await signed("profiles.ensure", {}));
  const payload = { title: "Essay", date: "2026-09-28", time: "10:00", durationMinutes: 12.7, repeat: { every: 1, unit: "day" as const } };
  const task = await t.action(api.service.tasksCreate, { ...await signed("tasks.create", payload), ...payload });
  expect(task.durationMinutes).toBe(13);
  const badPatch = { id: task._id, patch: { time: "25:00" } };
  await expect(t.action(api.service.tasksUpdate, { ...await signed("tasks.update", badPatch), ...badPatch })).rejects.toThrow("Invalid time");
  const foreign = { id: task._id };
  await expect(t.action(api.service.tasksGet, { ...await signed("tasks.get", foreign, "user-b"), ...foreign })).rejects.toThrow("not found");
  await t.action(api.service.tasksComplete, { ...await signed("tasks.complete", foreign), ...foreign });
  expect(await t.action(api.service.dayGet, { ...await signed("day.get", { date: "2026-09-29" }), date: "2026-09-29" })).toMatchObject({ plannedMinutes: 13 });
  const reset = await signed("profiles.resetAll", {});
  await t.action(api.service.profilesResetAll, reset);
  await expect(t.action(api.service.profilesResetAll, reset)).rejects.toThrow("Reused");
});
test("service supports the legacy secret fallback and cleans expired nonces", async () => {
  vi.stubEnv("SERVICE_SECRET", undefined); vi.stubEnv("MCP_SERVICE_SECRET", "test-service-secret");
  const { t } = setup();
  await t.action(api.service.areasList, await signed("areas.list", {}));
  await t.run(async (ctx) => {
    await ctx.db.insert("serviceNonces", { ownerId: "service", createdAt: 0, updatedAt: 0, nonce: "expired", expiresAt: Date.now() - 1 });
  });
  await t.mutation(internal.serviceInternal.cleanupNonces, {});
  expect(await t.run((ctx) => ctx.db.query("serviceNonces").withIndex("by_nonce", (q) => q.eq("nonce", "expired")).first())).toBeNull();
});
test("resetAll deletes owner data in 100-row batches and preserves another owner", async () => {
  vi.useFakeTimers();
  const { t, a, b } = setup();
  await a.mutation(api.profiles.ensure, {}); await b.mutation(api.profiles.ensure, {});
  const area = (await a.query(api.areas.list, {}))[0]; if (!area) throw new Error("Missing area");
  const habit = await a.mutation(api.habits.create, { areaId: area._id, title: "Read", weeklyTarget: 3 });
  await a.mutation(api.habits.log, { habitId: habit._id, date: "2026-09-28" });
  for (let i = 0; i < 105; i++) await a.mutation(api.tasks.create, { title: "Task", areaId: area._id });
  await a.mutation(api.profiles.resetAll, {});
  expect(await a.query(api.tasks.list, {})).not.toHaveLength(0);
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(await a.query(api.tasks.list, {})).toEqual([]); expect(await a.query(api.areas.list, {})).toEqual([]);
  expect(await a.query(api.profiles.get, {})).toBeNull();
  expect(await b.query(api.areas.list, {})).toHaveLength(3);
  expect(await t.run((ctx) => ctx.db.query("habitLogs").withIndex("by_owner", (q) => q.eq("ownerId", "user-a")).take(100))).toEqual([]);
});


test("goal deletion and undo restore milestones and links without losing changed tasks", async () => {
  const { t, a, b } = setup();
  const area = await a.mutation(api.areas.create, { name: "Life" });
  const goal = await a.mutation(api.goals.create, { areaId: area._id, title: "Read", note: "Books", startDate: "2026-09-01", targetDate: "2026-10-01", metric: { kind: "milestones" } });
  const task = await a.mutation(api.tasks.create, { title: "First book", areaId: area._id, goalId: goal._id });
  const changed = await a.mutation(api.tasks.create, { title: "Second book", areaId: area._id, goalId: goal._id });
  await a.mutation(api.goals.createMilestone, { goalId: goal._id, title: "First chapter", doneAt: 123, targetDate: "2026-09-15" });
  await expect(t.mutation(api.goals.deleteForUndo, { id: goal._id })).rejects.toThrow("Not authenticated");
  await expect(b.mutation(api.goals.deleteForUndo, { id: goal._id })).rejects.toThrow("not found");
  const snapshot = await a.mutation(api.goals.deleteForUndo, { id: goal._id });
  expect(await a.query(api.goals.list, {})).toEqual([]);
  expect((await a.query(api.tasks.get, { id: task._id })).goalId).toBeNull();
  await expect(b.mutation(api.goals.restore, { snapshot })).rejects.toThrow("not found");
  // A later task edit should survive Undo, even if its goal is still empty.
  await t.run(async ctx => { await ctx.db.patch(changed._id, { title: "Changed later", updatedAt: snapshot.tasks[0].updatedAt + 100 }); });
  const restored = await a.mutation(api.goals.restore, { snapshot });
  expect(restored).toMatchObject({ title: "Read", note: "Books", targetDate: "2026-10-01", metric: { kind: "milestones" } });
  expect((await a.query(api.tasks.get, { id: task._id })).goalId).toBe(restored._id);
  expect((await a.query(api.tasks.get, { id: changed._id })).goalId).toBeNull();
  expect((await a.query(api.goals.list, {}))[0].milestones[0]).toMatchObject({ title: "First chapter", doneAt: 123, targetDate: "2026-09-15" });
});

test("goal undo cannot attach another owner's task and rolls back atomically", async () => {
  const { a, b } = setup();
  const area = await a.mutation(api.areas.create, { name: "Life" });
  const goal = await a.mutation(api.goals.create, { areaId: area._id, title: "Read", startDate: "2026-09-01" });
  await b.mutation(api.profiles.ensure, {});
  const other = await b.mutation(api.tasks.create, { title: "Private" });
  const snapshot = await a.mutation(api.goals.deleteForUndo, { id: goal._id });
  await expect(a.mutation(api.goals.restore, { snapshot: { ...snapshot, tasks: [{ id: other._id, updatedAt: other.updatedAt }] } })).rejects.toThrow("not found");
  expect(await a.query(api.goals.list, {})).toEqual([]);
  expect((await b.query(api.tasks.get, { id: other._id })).goalId).toBeNull();
});
