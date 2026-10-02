/// <reference types="vite/client" />
import { readFileSync } from "node:fs";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import pushComponent from "@convex-dev/expo-push-notifications/test";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
const extras = ["profiles.seedSample", "profiles.saveOnboarding", "areas.reorder", "tasks.lookup", "goals.deleteForUndo", "goals.restore", "pushTokens.register", "pushTokens.unregister", "tasks.snoozeReminder"];

test("every public user function has a native isolation case", () => {
  const service = readFileSync(new URL("../service.ts", import.meta.url), "utf8");
  const covered = new Set([...service.matchAll(/await verify\(ctx, "([^"]+)"/g)].map(match => match[1]));
  for (const name of extras) covered.add(name);
  const missing: string[] = [];
  for (const file of ["profiles", "areas", "projects", "tasks", "goals", "events", "habits", "day", "week", "pushTokens"]) {
    const source = readFileSync(new URL(`../${file}.ts`, import.meta.url), "utf8");
    for (const match of source.matchAll(/export const (\w+) = (query|mutation)\(/g)) if (!covered.has(`${file}.${match[1]}`)) missing.push(`${file}.${match[1]}`);
  }
  expect(missing).toEqual([]);
});

test.each(extras)("%s refuses anonymous access and preserves another owner's rows", async name => {
  const t = convexTest(schema, modules);
  pushComponent.register(t);
  const a = t.withIdentity({ subject: "public-isolation-a" }), b = t.withIdentity({ subject: "public-isolation-b" });
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  await b.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const area = (await a.query(api.areas.list, {}))[0];
  if (!area) throw new Error("Missing area fixture");
  const task = await a.mutation(api.tasks.create, { title: "Private task", areaId: area._id });
  const goal = await a.mutation(api.goals.create, { title: "Private goal", areaId: area._id, startDate: "2026-10-01" });
  const deleted = await a.mutation(api.goals.create, { title: "Private restore", areaId: area._id, startDate: "2026-10-01" });
  const snapshot = await a.mutation(api.goals.deleteForUndo, { id: deleted._id });
  const token = "ExpoPushToken[private_device]";
  await a.mutation(api.pushTokens.register, { token, platform: "android" });
  const rows = () => t.run(async ctx => Promise.all((["profiles", "areas", "projects", "tasks", "goals", "milestones", "events", "habits", "habitLogs", "pushTokens"] as const).map(table => ctx.db.query(table).withIndex("by_owner", q => q.eq("ownerId", "public-isolation-a")).collect())));
  const before = await rows();
  const call = (authenticated: boolean) => {
    const client = authenticated ? b : t;
    switch (name) {
      case "profiles.seedSample": return client.mutation(api.profiles.seedSample, { today: "2026-10-01" });
      case "profiles.saveOnboarding": return client.mutation(api.profiles.saveOnboarding, { step: 3, drafts: { example: "Own draft" } });
      case "areas.reorder": return client.mutation(api.areas.reorder, { ids: [area._id] });
      case "tasks.lookup": return client.query(api.tasks.lookup, { key: task._id });
      case "goals.deleteForUndo": return client.mutation(api.goals.deleteForUndo, { id: goal._id });
      case "goals.restore": return client.mutation(api.goals.restore, { snapshot });
      case "pushTokens.register": return client.mutation(api.pushTokens.register, { token: "ExpoPushToken[own_device]", platform: "android" });
      case "pushTokens.unregister": return client.mutation(api.pushTokens.unregister, { token });
      case "tasks.snoozeReminder": return client.mutation(api.tasks.snoozeReminder, { id: task._id, until: Date.now() + 600_000 });
      default: throw new Error(`Missing case ${name}`);
    }
  };
  await expect(call(false)).rejects.toThrow("Not authenticated");
  if (["areas.reorder", "goals.deleteForUndo", "goals.restore", "tasks.snoozeReminder"].includes(name)) await expect(call(true)).rejects.toThrow();
  else if (name === "tasks.lookup") expect(await call(true)).toBeNull();
  else await call(true);
  expect(await rows()).toEqual(before);
});
