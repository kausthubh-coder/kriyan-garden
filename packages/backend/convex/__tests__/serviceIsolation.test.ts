/// <reference types="vite/client" />
import { readFileSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import { canonicalJson } from "../canonical";
import schema from "../schema";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
const source = readFileSync(new URL("../service.ts", import.meta.url), "utf8");
const actions = [...source.matchAll(/export const (\w+) = action\([\s\S]*?await verify\(ctx, "([^"]+)"/g)].map(m => ({ name: m[1], operation: m[2] }));
afterEach(() => vi.unstubAllEnvs());

test.each(actions)("$name binds the signed owner and cannot access foreign records", async ({ name, operation }) => {
  vi.stubEnv("SERVICE_SECRET", "isolation-test-secret");
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  const a = t.withIdentity({ subject: "service-isolation-a" });
  const b = t.withIdentity({ subject: "service-isolation-b" });
  await a.mutation(api.profiles.ensure, { timezone: "Pacific/Auckland" });
  await b.mutation(api.profiles.ensure, { timezone: "Pacific/Honolulu" });
  const area = (await a.query(api.areas.list, {}))[0];
  if (!area) throw new Error("Missing fixture area");
  const project = await a.mutation(api.projects.create, { name: "Private course", areaId: area._id });
  const goal = await a.mutation(api.goals.create, { title: "Private goal", areaId: area._id, startDate: "2026-09-30", metric: { kind: "number", current: 0, target: 10, unit: "pages" } });
  const task = await a.mutation(api.tasks.create, { title: "Private task", areaId: area._id, projectId: project._id, goalId: goal._id, date: "2026-09-30" });
  const event = await a.mutation(api.events.create, { title: "Private class", areaId: area._id, weekdays: [1], startTime: "10:00", endTime: "11:00", fromDate: "2026-09-30" });
  const habit = await a.mutation(api.habits.create, { title: "Private habit", areaId: area._id, weeklyTarget: 3 });
  const milestone = await a.mutation(api.goals.createMilestone, { goalId: goal._id, title: "Private milestone" });
  const log = await a.mutation(api.habits.log, { habitId: habit._id, date: "2026-09-30" });
  const [group, verb] = operation.split(".");
  const idByGroup: Record<string, string> = { areas: area._id, projects: project._id, goals: goal._id, tasks: task._id, events: event._id, habits: habit._id };
  let payload: Record<string, unknown>;
  let foreignReference = false;
  if (group === "profiles") {
    payload = verb === "update" ? { patch: { dailyCapacityMinutes: 90 } } : {};
  } else if (operation === "day.get") payload = { date: "2026-09-30" };
  else if (operation === "week.get") payload = { startDate: "2026-09-30" };
  else if (["list", "get", "update", "remove"].includes(verb)) {
    payload = verb === "list" ? {} : { id: idByGroup[group], ...(verb === "update" ? { patch: {} } : {}) };
    foreignReference = verb !== "list";
  } else if (verb === "create") {
    payload = {
      areas: { name: "Own new area" },
      projects: { areaId: area._id, name: "Blocked project" },
      goals: { areaId: area._id, title: "Blocked goal", startDate: "2026-09-30" },
      tasks: { areaId: area._id, title: "Blocked task" },
      events: { areaId: area._id, title: "Blocked class", weekdays: [1], startTime: "10:00", endTime: "11:00", fromDate: "2026-09-30" },
      habits: { areaId: area._id, title: "Blocked habit", weeklyTarget: 3 },
    }[group] ?? {};
    foreignReference = group !== "areas";
  } else {
    const payloads: Record<string, Record<string, unknown>> = {
      "planner.context": {}, "profiles.ensure": {}, "profiles.completeOnboarding": {}, "profiles.resetAll": {},
      "profiles.update": { patch: { dailyCapacityMinutes: 90 } },
      "tasks.complete": { id: task._id }, "tasks.completeWithNext": { id: task._id }, "tasks.reopen": { id: task._id },
      "tasks.quickAdd": { text: "Own capture today", today: "2026-09-30" }, "tasks.search": { query: "Private" },
      "tasks.filteredList": { projectId: project._id },
      "goals.setProgress": { id: goal._id, current: 3 },
      "goals.createMilestone": { goalId: goal._id, title: "Blocked milestone" },
      "goals.updateMilestone": { id: milestone._id, patch: {} }, "goals.removeMilestone": { id: milestone._id },
      "habits.listLogs": { habitId: habit._id }, "habits.log": { habitId: habit._id, date: "2026-09-30" }, "habits.removeLog": { id: log._id },
    };
    if (operation === "day.get") payload = { date: "2026-09-30" };
    else if (operation === "week.get") payload = { startDate: "2026-09-30" };
    else {
      if (!(operation in payloads)) throw new Error(`Add isolation input for ${operation}`);
      payload = payloads[operation];
    }
    foreignReference = "id" in payload || "goalId" in payload || "habitId" in payload || "projectId" in payload;
  }
  const ref = makeFunctionReference<"action", Record<string, unknown>, unknown>(`service:${name}`);
  const sign = (ownerId: string) => {
    const timestamp = Date.now(), nonce = randomUUID();
    const signature = createHmac("sha256", "isolation-test-secret").update(canonicalJson([timestamp, nonce, ownerId, operation, payload])).digest("hex");
    return { ...payload, ownerId, timestamp, nonce, signature };
  };
  await expect(t.action(ref, { ...sign("service-isolation-a"), ownerId: "service-isolation-b" })).rejects.toThrow("signature");
  const ownBefore = await t.run(async ctx => {
    const tables = ["profiles", "areas", "projects", "goals", "tasks", "events", "habits", "milestones", "habitLogs"] as const;
    return Promise.all(tables.map(table => ctx.db.query(table).withIndex("by_owner", q => q.eq("ownerId", "service-isolation-a")).collect()));
  });
  if (foreignReference) await expect(t.action(ref, sign("service-isolation-b"))).rejects.toThrow("not found");
  else {
    const result = await t.action(ref, sign("service-isolation-b"));
    expect(JSON.stringify(result)).not.toContain("service-isolation-a");
    expect(JSON.stringify(result)).not.toContain("Private task");
    expect(JSON.stringify(result)).not.toContain("Private goal");
  }
  const ownAfter = await t.run(async ctx => {
    const tables = ["profiles", "areas", "projects", "goals", "tasks", "events", "habits", "milestones", "habitLogs"] as const;
    return Promise.all(tables.map(table => ctx.db.query(table).withIndex("by_owner", q => q.eq("ownerId", "service-isolation-a")).collect()));
  });
  expect(ownAfter).toEqual(ownBefore);
});

test("service action inventory includes every exported action", () => {
  expect(actions.length).toBe([...source.matchAll(/export const \w+ = action\(/g)].length);
});
