/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
const date = "2026-09-28";

async function fixture() {
  const t = convexTest(schema, modules);
  const a = t.withIdentity({ subject: "isolation-a" });
  const b = t.withIdentity({ subject: "isolation-b" });
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const area = (await a.query(api.areas.list, {}))[0];
  if (!area) throw new Error("Default area missing.");
  const project = await a.mutation(api.projects.create, { areaId: area._id, name: "Private project" });
  const goal = await a.mutation(api.goals.create, { areaId: area._id, title: "Private goal", startDate: date });
  const task = await a.mutation(api.tasks.create, { title: "Confidential planning", areaId: area._id, projectId: project._id, goalId: goal._id, date, time: "10:00", durationMinutes: 45, notes: "Confidential notes" });
  const event = await a.mutation(api.events.create, { areaId: area._id, title: "Private meeting", weekdays: [1], startTime: "12:00", endTime: "13:00", fromDate: date });
  const habit = await a.mutation(api.habits.create, { areaId: area._id, title: "Private habit", weeklyTarget: 3 });
  const milestone = await a.mutation(api.goals.createMilestone, { goalId: goal._id, title: "Private milestone" });
  const log = await a.mutation(api.habits.log, { habitId: habit._id, date });
  return { t, a, b, area, project, goal, task, event, habit, milestone, log };
}

test("every public planner query rejects an unauthenticated caller before reading records", async () => {
  const { t, area, project, goal, task, event, habit } = await fixture();
  const calls: [string, () => Promise<unknown>][] = [
    ["profiles.get", () => t.query(api.profiles.get, {})],
    ["areas.list", () => t.query(api.areas.list, {})],
    ["areas.get", () => t.query(api.areas.get, { id: area._id })],
    ["projects.list", () => t.query(api.projects.list, {})],
    ["projects.get", () => t.query(api.projects.get, { id: project._id })],
    ["goals.list", () => t.query(api.goals.list, {})],
    ["goals.get", () => t.query(api.goals.get, { id: goal._id })],
    ["tasks.list", () => t.query(api.tasks.list, {})],
    ["tasks.get", () => t.query(api.tasks.get, { id: task._id })],
    ["tasks.search", () => t.query(api.tasks.search, { query: "Confidential" })],
    ["events.list", () => t.query(api.events.list, {})],
    ["events.get", () => t.query(api.events.get, { id: event._id })],
    ["habits.list", () => t.query(api.habits.list, {})],
    ["habits.get", () => t.query(api.habits.get, { id: habit._id })],
    ["habits.listLogs", () => t.query(api.habits.listLogs, { habitId: habit._id })],
    ["day.get", () => t.query(api.day.get, { date })],
    ["week.get", () => t.query(api.week.get, { startDate: date })],
  ];
  for (const [name, invoke] of calls) await expect(invoke(), name).rejects.toThrow("Not authenticated");
});

test("every public planner mutation rejects an unauthenticated caller before writing", async () => {
  const { t, a, area, project, goal, task, event, habit, milestone, log } = await fixture();
  const calls: [string, () => Promise<unknown>][] = [
    ["profiles.ensure", () => t.mutation(api.profiles.ensure, {})],
    ["profiles.update", () => t.mutation(api.profiles.update, { patch: { timezone: "UTC" } })],
    ["profiles.completeOnboarding", () => t.mutation(api.profiles.completeOnboarding, {})],
    ["profiles.resetAll", () => t.mutation(api.profiles.resetAll, {})],
    ["profiles.seedSample", () => t.mutation(api.profiles.seedSample, { today: date })],
    ["areas.create", () => t.mutation(api.areas.create, { name: "Injected" })],
    ["areas.update", () => t.mutation(api.areas.update, { id: area._id, patch: { name: "Injected" } })],
    ["areas.remove", () => t.mutation(api.areas.remove, { id: area._id })],
    ["projects.create", () => t.mutation(api.projects.create, { areaId: area._id, name: "Injected" })],
    ["projects.update", () => t.mutation(api.projects.update, { id: project._id, patch: { name: "Injected" } })],
    ["projects.remove", () => t.mutation(api.projects.remove, { id: project._id })],
    ["goals.create", () => t.mutation(api.goals.create, { areaId: area._id, title: "Injected", startDate: date })],
    ["goals.update", () => t.mutation(api.goals.update, { id: goal._id, patch: { title: "Injected" } })],
    ["goals.remove", () => t.mutation(api.goals.remove, { id: goal._id })],
    ["goals.createMilestone", () => t.mutation(api.goals.createMilestone, { goalId: goal._id, title: "Injected" })],
    ["goals.updateMilestone", () => t.mutation(api.goals.updateMilestone, { id: milestone._id, patch: { title: "Injected" } })],
    ["goals.removeMilestone", () => t.mutation(api.goals.removeMilestone, { id: milestone._id })],
    ["goals.deleteForUndo", () => t.mutation(api.goals.deleteForUndo, { id: goal._id })],
    ["goals.restore", () => t.mutation(api.goals.restore, { snapshot: { goal, milestones: [milestone], tasks: [] } })],
    ["tasks.create", () => t.mutation(api.tasks.create, { title: "Injected" })],
    ["tasks.update", () => t.mutation(api.tasks.update, { id: task._id, patch: { title: "Injected" } })],
    ["tasks.remove", () => t.mutation(api.tasks.remove, { id: task._id })],
    ["tasks.complete", () => t.mutation(api.tasks.complete, { id: task._id })],
    ["tasks.reopen", () => t.mutation(api.tasks.reopen, { id: task._id })],
    ["tasks.quickAdd", () => t.mutation(api.tasks.quickAdd, { text: "Injected today", today: date })],
    ["events.create", () => t.mutation(api.events.create, { title: "Injected", weekdays: [1], startTime: "12:00", endTime: "13:00", fromDate: date })],
    ["events.update", () => t.mutation(api.events.update, { id: event._id, patch: { title: "Injected" } })],
    ["events.remove", () => t.mutation(api.events.remove, { id: event._id })],
    ["habits.create", () => t.mutation(api.habits.create, { areaId: area._id, title: "Injected", weeklyTarget: 3 })],
    ["habits.update", () => t.mutation(api.habits.update, { id: habit._id, patch: { title: "Injected" } })],
    ["habits.remove", () => t.mutation(api.habits.remove, { id: habit._id })],
    ["habits.log", () => t.mutation(api.habits.log, { habitId: habit._id, date })],
    ["habits.removeLog", () => t.mutation(api.habits.removeLog, { id: log._id })],
  ];
  for (const [name, invoke] of calls) await expect(invoke(), name).rejects.toThrow("Not authenticated");
  expect(await a.query(api.tasks.get, { id: task._id })).toEqual(task);
  expect(await a.query(api.goals.get, { id: goal._id })).toMatchObject(goal);
});

test("profile, search, day and week never expose another owner's records", async () => {
  const { a, b, task, habit } = await fixture();
  expect(await b.query(api.profiles.get, {})).toBeNull();
  expect(await b.query(api.tasks.search, { query: "Confidential" })).toEqual([]);
  await expect(b.query(api.habits.listLogs, { habitId: habit._id })).rejects.toThrow("not found");
  await b.mutation(api.profiles.ensure, { timezone: "Europe/London" });
  await b.mutation(api.profiles.update, { patch: { dailyCapacityMinutes: 90 } });
  const own = await b.mutation(api.tasks.create, { title: "Confidential personal", date, time: "14:00", durationMinutes: 15 });
  expect(await b.query(api.tasks.search, { query: "Confidential" })).toEqual([own]);
  const day = await b.query(api.day.get, { date });
  expect(day.timed).toEqual([own]);
  expect(day.events).toEqual([]);
  expect(day.anytime).toEqual([]);
  expect(day.unscheduled).toEqual([]);
  expect(day.plannedMinutes).toBe(15);
  const week = await b.query(api.week.get, { startDate: date });
  expect(week.flatMap((item) => item.timed)).toEqual([own]);
  expect(week.flatMap((item) => item.events)).toEqual([]);
  expect(await a.query(api.profiles.get, {})).toMatchObject({ timezone: "America/New_York", dailyCapacityMinutes: 360 });
  expect(await a.query(api.tasks.get, { id: task._id })).toEqual(task);
});
