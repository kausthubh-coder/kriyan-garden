/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
function setup() {
  const t = convexTest(schema, modules);
  return { t, a: t.withIdentity({ subject: "selection-a" }), b: t.withIdentity({ subject: "selection-b" }) };
}

test("task URL lookup requires identity before inspecting any selection key", async () => {
  const { t, a } = setup();
  const area = await a.mutation(api.areas.create, { name: "Life" });
  const task = await a.mutation(api.tasks.create, { title: "Owned", areaId: area._id });
  for (const key of [task._id, "", "malformed"])
    await expect(t.query(api.tasks.lookup, { key })).rejects.toThrow("Not authenticated");
});

test("owned deep links remain useful outside a bounded list and follow edits", async () => {
  const { a } = setup();
  const area = await a.mutation(api.areas.create, { name: "Life" });
  await a.mutation(api.tasks.create, { title: "Listed", areaId: area._id });
  const task = await a.mutation(api.tasks.create, { title: "Outside list", areaId: area._id });
  expect(await a.query(api.tasks.list, { limit: 1 })).not.toContainEqual(task);
  expect(await a.query(api.tasks.lookup, { key: task._id })).toEqual(task);
  const edited = await a.mutation(api.tasks.update, { id: task._id, patch: { notes: "An ordinary edit", date: "2026-09-30" } });
  expect(await a.query(api.tasks.lookup, { key: task._id })).toEqual(edited);
  expect(edited.durationMinutes).toBeNull();
});

test("malformed and wrong-table keys return null without guessing ID formats", async () => {
  const { a } = setup();
  const area = await a.mutation(api.areas.create, { name: "Life" });
  for (const key of ["", " ", "malformed", "../../tasks", "☃", "x".repeat(200), area._id])
    expect(await a.query(api.tasks.lookup, { key })).toBeNull();
});

test("foreign and deleted selections are unavailable while strict task get still rejects them", async () => {
  const { a, b } = setup();
  const area = await b.mutation(api.areas.create, { name: "Business" });
  const task = await b.mutation(api.tasks.create, { title: "Private other-owner task", areaId: area._id });
  expect(await a.query(api.tasks.lookup, { key: task._id })).toBeNull();
  await expect(a.query(api.tasks.get, { id: task._id })).rejects.toThrow("Record not found");
  expect(await b.query(api.tasks.lookup, { key: task._id })).toEqual(task);
  await b.mutation(api.tasks.remove, { id: task._id });
  expect(await b.query(api.tasks.lookup, { key: task._id })).toBeNull();
  expect(await a.query(api.tasks.lookup, { key: task._id })).toBeNull();
  await expect(b.query(api.tasks.get, { id: task._id })).rejects.toThrow("Record not found");
});
