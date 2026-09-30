/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { api } from "../_generated/api";
import schema from "../schema";
const modules = import.meta.glob([
  "../**/*.ts",
  "../_generated/*.js",
  "!./**",
  "!../**/*.d.ts",
]);
function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return {
    t,
    a: t.withIdentity({ subject: "setup-a" }),
    b: t.withIdentity({ subject: "setup-b" }),
  };
}
test("setup saves merged drafts and a bounded step, isolated by identity", async () => {
  const { t, a, b } = setup();
  await expect(
    t.mutation(api.profiles.saveOnboarding, { step: 3 }),
  ).rejects.toThrow("Not authenticated");
  await a.mutation(api.profiles.ensure, {});
  await b.mutation(api.profiles.ensure, {});
  await a.mutation(api.profiles.saveOnboarding, {
    step: 3,
    drafts: { "event.title": "CS 201" },
  });
  await a.mutation(api.profiles.saveOnboarding, {
    drafts: { "event.start": "1015" },
  });
  expect(await a.query(api.profiles.get, {})).toMatchObject({
    onboardingStep: 3,
    onboardingDraft: { "event.title": "CS 201", "event.start": "1015" },
  });
  expect(
    (await b.query(api.profiles.get, {}))?.onboardingDraft,
  ).toBeUndefined();
  await expect(
    a.mutation(api.profiles.saveOnboarding, { step: 6 }),
  ).rejects.toThrow("Invalid setup step");
  await expect(
    a.mutation(api.profiles.saveOnboarding, {
      drafts: { title: "x".repeat(1001) },
    }),
  ).rejects.toThrow("too long");
});
test("confirmed sample replaces the setup records without touching another owner", async () => {
  const { a, b } = setup();
  await a.mutation(api.profiles.ensure, {});
  await b.mutation(api.profiles.ensure, {});
  const area = (await a.query(api.areas.list, {}))[0];
  await a.mutation(api.areas.update, {
    id: area._id,
    patch: { name: "Study" },
  });
  await a.mutation(api.tasks.create, {
    title: "Replace this task",
    areaId: area._id,
  });
  await b.mutation(api.tasks.create, { title: "Keep this task" });
  await a.mutation(api.profiles.saveOnboarding, {
    step: 5,
    drafts: { "tasks.text": "draft" },
  });
  await a.mutation(api.profiles.seedSample, {
    today: "2026-09-30",
    replace: true,
  });
  expect(await a.query(api.areas.list, {})).toMatchObject([
    { name: "School" },
    { name: "Business" },
    { name: "Life" },
  ]);
  expect(await a.query(api.tasks.list, {})).toHaveLength(25);
  expect((await b.query(api.tasks.list, {}))[0].title).toBe("Keep this task");
  expect(await a.query(api.profiles.get, {})).toMatchObject({
    onboardingComplete: true,
    onboardingDraft: {},
  });
});
test("area reorder is atomic and rejects missing, duplicate and foreign IDs", async () => {
  const { t, a, b } = setup();
  await a.mutation(api.profiles.ensure, {});
  await b.mutation(api.profiles.ensure, {});
  const ids = (await a.query(api.areas.list, {})).map((a) => a._id);
  await expect(t.mutation(api.areas.reorder, { ids })).rejects.toThrow(
    "Not authenticated",
  );
  await expect(
    a.mutation(api.areas.reorder, { ids: [ids[0], ids[0], ids[2]] }),
  ).rejects.toThrow("areas changed");
  await expect(b.mutation(api.areas.reorder, { ids })).rejects.toThrow(
    "areas changed",
  );
  await a.mutation(api.areas.reorder, { ids: [...ids].reverse() });
  expect((await a.query(api.areas.list, {})).map((a) => a._id)).toEqual(
    [...ids].reverse(),
  );
});
test("planning saves clock times at minute precision and rejects inverted hours", async () => {
  const { a } = setup();
  await a.mutation(api.profiles.ensure, {});
  expect(
    await a.mutation(api.profiles.update, {
      patch: { dayStartHour: 6.5, dayEndHour: 22.25 },
    }),
  ).toMatchObject({ dayStartHour: 6.5, dayEndHour: 22.25 });
  await expect(
    a.mutation(api.profiles.update, { patch: { dayStartHour: 23 } }),
  ).rejects.toThrow("Invalid day hours");
});
