/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { api } from "../_generated/api";
import schema from "../schema";
import { canonicalJson } from "../canonical";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
function setup() { const t = convexTest(schema, modules); rateLimiter.register(t); vi.stubEnv("SERVICE_SECRET", "test-secret"); return t; }
afterEach(() => { vi.unstubAllEnvs(); });
async function signed<P extends Record<string, unknown>>(operation: string, payload: P = {} as P, ownerId = "user_test") {
  const timestamp = Date.now(), nonce = crypto.randomUUID();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode("test-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const raw = await crypto.subtle.sign("HMAC", key, encoder.encode(canonicalJson([timestamp, nonce, ownerId, operation, payload])));
  const signature = [...new Uint8Array(raw)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return { ...payload, ownerId, timestamp, nonce, signature };
}
const semester = {
  today: "2026-09-29", onExisting: "skip" as const,
  areas: [{ ref: "uni", name: "University", color: "purple" as const }],
  projects: [{ ref: "cs101", name: "CS 101", area: "uni", kind: "course" as const }, { name: "Portfolio site", area: "Life" }],
  events: [{ title: "CS 101 lecture", area: "uni", weekdays: [1, 3], startTime: "09:00", endTime: "10:15", fromDate: "2026-09-01", untilDate: "2026-12-11", location: "Hall 2" }],
  goals: [{ ref: "gpa", title: "Finish the term strong", area: "uni" }],
  tasks: [
    { title: "Problem set 1", project: "cs101", goal: "gpa", deadline: "2026-10-02" },
    { title: "Read chapter 3", project: "University / CS 101", date: "2026-09-30" },
    { title: "Gym", area: "Life", date: "2026-09-29", repeat: { every: 1, unit: "week" as const, weekdays: [1, 4] } },
  ],
  habits: [{ title: "Review notes", area: "uni", weeklyTarget: 4 }],
};
const counts = (items: { status: string }[]) => items.reduce<Record<string, number>>((all, item) => ({ ...all, [item.status]: (all[item.status] ?? 0) + 1 }), {});

test("a dry run previews everything and saves nothing", async () => {
  const t = setup();
  await t.action(api.service.profilesEnsure, await signed("profiles.ensure"));
  const preview = await t.action(api.service.planApply, await signed("planner.apply", { ...semester, dryRun: true }));
  expect(preview.dryRun).toBe(true);
  expect(counts(preview.items)).toEqual({ would_create: 9 });
  expect(preview.items.every(item => item.id === null)).toBe(true);
  expect(await t.action(api.service.areasList, await signed("areas.list"))).toHaveLength(3);
  expect(await t.action(api.service.tasksList, await signed("tasks.list", {}))).toHaveLength(0);
});

test("a plan resolves local refs, links records, and a second run creates nothing", async () => {
  const t = setup();
  await t.action(api.service.profilesEnsure, await signed("profiles.ensure"));
  const first = await t.action(api.service.planApply, await signed("planner.apply", { ...semester, dryRun: false }));
  expect(counts(first.items)).toEqual({ created: 9 });
  const tasks = await t.action(api.service.tasksList, await signed("tasks.list", {}));
  const course = first.items.find(item => item.ref === "cs101");
  const goal = first.items.find(item => item.ref === "gpa");
  expect(tasks.find(task => task.title === "Problem set 1")).toMatchObject({ projectId: course?.id, goalId: goal?.id, deadline: "2026-10-02", durationMinutes: null });
  expect(tasks.find(task => task.title === "Read chapter 3")).toMatchObject({ projectId: course?.id });

  const second = await t.action(api.service.planApply, await signed("planner.apply", { ...semester, dryRun: false }));
  expect(counts(second.items)).toEqual({ exists: 9 });
  expect(second.items.map(item => item.id)).toEqual(first.items.map(item => item.id));
  expect(await t.action(api.service.tasksList, await signed("tasks.list", {}))).toHaveLength(3);
});

test("one bad item rolls back the whole plan and names the item", async () => {
  const t = setup();
  await t.action(api.service.profilesEnsure, await signed("profiles.ensure"));
  const broken = { ...semester, dryRun: false, tasks: [...semester.tasks, { title: "Lab report", project: "Chemistry" }] };
  await expect(t.action(api.service.planApply, await signed("planner.apply", broken))).rejects.toThrow('tasks[3]: Project "Chemistry" not found');
  expect(await t.action(api.service.areasList, await signed("areas.list"))).toHaveLength(3);
  expect(await t.action(api.service.projectsList, await signed("projects.list"))).toHaveLength(0);
});

test("onExisting update patches only what changed", async () => {
  const t = setup();
  await t.action(api.service.profilesEnsure, await signed("profiles.ensure"));
  await t.action(api.service.planApply, await signed("planner.apply", { ...semester, dryRun: false }));
  const changed = { ...semester, dryRun: false, onExisting: "update" as const, events: [{ ...semester.events[0], location: "Hall 5" }] };
  const result = await t.action(api.service.planApply, await signed("planner.apply", changed));
  expect(result.items.filter(item => item.status === "updated").map(item => item.name)).toEqual(["CS 101 lecture"]);
  const events = await t.action(api.service.eventsList, await signed("events.list"));
  expect(events).toMatchObject([{ location: "Hall 5" }]);
});
