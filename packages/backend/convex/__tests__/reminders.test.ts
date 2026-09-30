/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import pushComponent from "@convex-dev/expo-push-notifications/test";
import { reminderTimes } from "@kriyan/core";
import schema from "../schema";
import { api, internal, components } from "../_generated/api";
const modules = import.meta.glob([
  "../**/*.ts",
  "../_generated/*.js",
  "!./**",
  "!../**/*.d.ts",
]);
function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));
  const t = convexTest(schema, modules);
  pushComponent.register(t);
  return {
    t,
    a: t.withIdentity({ subject: "reminder-a" }),
    b: t.withIdentity({ subject: "reminder-b" }),
  };
}
afterEach(() => vi.useRealTimers());
test("scheduling uses profile timezone, cancels on move, complete, delete and date removal", async () => {
  const { t, a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const task = await a.mutation(api.tasks.create, {
    title: "Essay",
    date: "2026-03-08",
    time: "10:00",
    reminders: [
      { type: "at_start" },
      { type: "before", minutes: 15 },
      { type: "morning_of" },
      { type: "day_before" },
    ],
  });
  const jobs = () =>
    t.run((ctx) =>
      ctx.db
        .query("reminderJobs")
        .withIndex("by_owner", (q) => q.eq("ownerId", "reminder-a"))
        .take(100),
    );
  expect(
    (await jobs()).map((j) => new Date(j.fireAt).toISOString()).sort(),
  ).toEqual([
    "2026-03-07T23:00:00.000Z",
    "2026-03-08T13:00:00.000Z",
    "2026-03-08T13:45:00.000Z",
    "2026-03-08T14:00:00.000Z",
  ]);
  const initial = await jobs();
  await a.mutation(api.tasks.update, {
    id: task._id,
    patch: { date: "2026-03-09" },
  });
  expect((await jobs()).filter((j) => j.state === "cancelled")).toHaveLength(4);
  for (const job of initial)
    expect(
      await t.run(async (ctx) =>
        job.scheduledId ? ctx.db.system.get(job.scheduledId) : null,
      ),
    ).toMatchObject({ state: { kind: "canceled" } });
  await a.mutation(api.tasks.complete, { id: task._id });
  expect((await jobs()).filter((j) => j.state === "pending")).toHaveLength(0);
  await a.mutation(api.tasks.reopen, { id: task._id });
  expect((await jobs()).filter((j) => j.state === "pending")).toHaveLength(4);
  await expect(
    a.mutation(api.tasks.update, { id: task._id, patch: { date: null } }),
  ).rejects.toThrow("Set a date");
  expect((await jobs()).filter((j) => j.state === "pending")).toHaveLength(4);
  await a.mutation(api.tasks.update, {
    id: task._id,
    patch: { date: null, reminders: [] },
  });
  expect((await jobs()).filter((j) => j.state === "pending")).toHaveLength(0);
  await a.mutation(api.tasks.update, {
    id: task._id,
    patch: { date: "2026-03-09", time: "10:00", reminders: task.reminders },
  });
  expect((await jobs()).filter((j) => j.state === "pending")).toHaveLength(4);
  await a.mutation(api.tasks.remove, { id: task._id });
  expect((await jobs()).filter((j) => j.state === "pending")).toHaveLength(0);
});
test("DST gap shifts forward, fold picks earlier, calendar reminder and elapsed before differ", () => {
  const at = (date: string, time: string) =>
    reminderTimes(
      { date, time, reminders: [{ type: "at_start" }] },
      "America/New_York",
      0,
    )[0];
  expect(new Date(at("2026-03-08", "02:30")).toISOString()).toBe(
    "2026-03-08T07:30:00.000Z",
  );
  expect(new Date(at("2026-11-01", "01:30")).toISOString()).toBe(
    "2026-11-01T05:30:00.000Z",
  );
  expect(
    reminderTimes(
      {
        date: "2026-03-08",
        time: "03:30",
        reminders: [{ type: "before", minutes: 60 }],
      },
      "America/New_York",
      0,
    )[0],
  ).toBe(Date.parse("2026-03-08T06:30:00Z"));
});
test("before reminder in past is skipped; timeless tasks skip start rules but support explicit times", async () => {
  const { t, a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "UTC" });
  await a.mutation(api.tasks.create, {
    title: "Soon",
    date: "2026-03-07",
    time: "12:05",
    reminders: [{ type: "before", minutes: 15 }, { type: "at_start" }],
  });
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("reminderJobs")
        .withIndex("by_owner", (q) => q.eq("ownerId", "reminder-a"))
        .take(20),
    ),
  ).toHaveLength(1);
  expect(
    reminderTimes(
      {
        date: "2026-03-08",
        time: null,
        reminders: [
          { type: "at_start" },
          { type: "before", minutes: 10 },
          { type: "at_time", time: "12:00" },
        ],
      },
      "UTC",
      0,
    ),
  ).toEqual([Date.parse("2026-03-08T12:00:00Z")]);
});
test("repeat creates reminders for next occurrence and profile timezone change reschedules", async () => {
  const { t, a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const task = await a.mutation(api.tasks.create, {
    title: "Daily",
    date: "2026-03-07",
    time: "10:00",
    repeat: { unit: "day", every: 1 },
    reminders: [{ type: "at_start" }],
  });
  await a.mutation(api.tasks.complete, { id: task._id });
  const next = (await a.query(api.tasks.list, { status: "active" }))[0];
  expect(next.date).toBe("2026-03-08");
  await a.mutation(api.profiles.update, {
    patch: { timezone: "Europe/London" },
  });
  const pending = await t.run((ctx) =>
    ctx.db
      .query("reminderJobs")
      .withIndex("by_owner_task_state", (q) =>
        q
          .eq("ownerId", "reminder-a")
          .eq("taskId", next._id)
          .eq("state", "pending"),
      )
      .take(20),
  );
  expect(pending.map((j) => j.fireAt)).toEqual([
    Date.parse("2026-03-08T10:00:00Z"),
  ]);
});
test("tokens are isolated, idempotent, dispatch fans out once, cancelled/foreign callbacks do nothing", async () => {
  const { t, a, b } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "UTC" });
  await expect(
    t.mutation(api.pushTokens.register, {
      token: "ExpoPushToken[a]",
      platform: "android",
    }),
  ).rejects.toThrow("Not authenticated");
  await expect(
    a.mutation(api.pushTokens.register, { token: "bad", platform: "android" }),
  ).rejects.toThrow("invalid");
  for (const token of [
    "ExpoPushToken[a]",
    "ExpoPushToken[b]",
    "ExpoPushToken[a]",
  ])
    await a.mutation(api.pushTokens.register, { token, platform: "android" });
  await b.mutation(api.pushTokens.unregister, { token: "ExpoPushToken[a]" });
  const tokens = await t.run((ctx) =>
    ctx.db
      .query("pushTokens")
      .withIndex("by_owner", (q) => q.eq("ownerId", "reminder-a"))
      .take(20),
  );
  expect(tokens).toHaveLength(2);
  const task = await a.mutation(api.tasks.create, {
    title: "Send now",
    date: "2026-03-08",
    reminders: [{ type: "morning_of" }],
  });
  const job = (
    await t.run((ctx) =>
      ctx.db
        .query("reminderJobs")
        .withIndex("by_owner", (q) => q.eq("ownerId", "reminder-a"))
        .take(20),
    )
  )[0];
  await t.mutation(internal.reminders.dispatch, {
    ownerId: "reminder-b",
    jobId: job._id,
  });
  expect(await t.run((ctx) => ctx.db.get(job._id))).toMatchObject({
    state: "pending",
  });
  await t.action(internal.reminders.deliver, {
    ownerId: "reminder-a",
    jobId: job._id,
  });
  await t.action(internal.reminders.deliver, {
    ownerId: "reminder-a",
    jobId: job._id,
  });
  for (const token of tokens) {
    const messages = await t.query(
      components.pushNotifications.public.getNotificationsForUser,
      { userId: token._id, limit: 20, logLevel: "ERROR" },
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      title: task.title,
      channelId: "Reminders",
      data: { taskId: task._id },
    });
  }
  await a.mutation(api.pushTokens.unregister, { token: "ExpoPushToken[a]" });
  expect(await t.run((ctx) => ctx.db.get(tokens[0]._id))).toBeNull();
});
test("account reset cancels jobs and removes push component data", async () => {
  const { t, a } = setup();
  await a.mutation(api.profiles.ensure, {});
  await a.mutation(api.pushTokens.register, {
    token: "ExpoPushToken[a]",
    platform: "android",
  });
  const token = (
    await t.run((ctx) =>
      ctx.db
        .query("pushTokens")
        .withIndex("by_owner", (q) => q.eq("ownerId", "reminder-a"))
        .take(20),
    )
  )[0];
  await a.mutation(api.tasks.create, {
    title: "Reset",
    date: "2026-03-08",
    reminders: [{ type: "morning_of" }],
  });
  await a.mutation(api.profiles.resetAll, {});
  expect(
    await t.query(components.pushNotifications.public.getStatusForUser, {
      userId: token._id,
      logLevel: "ERROR",
    }),
  ).toMatchObject({ hasToken: false });
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("reminderJobs")
        .withIndex("by_owner", (q) => q.eq("ownerId", "reminder-a"))
        .take(20),
    ),
  ).toHaveLength(0);
});
test("removing reminders cancels jobs and a stale callback cannot queue a push", async () => {
  const { t, a } = setup(); await a.mutation(api.profiles.ensure, { timezone: "UTC" });
  const task = await a.mutation(api.tasks.create, { title: "Remove reminder", date: "2026-03-08", reminders: [{ type: "morning_of" }] });
  const job = (await t.run(ctx => ctx.db.query("reminderJobs").withIndex("by_owner", q => q.eq("ownerId", "reminder-a")).take(20)))[0];
  await a.mutation(api.tasks.update, { id: task._id, patch: { reminders: [] } });
  await t.action(internal.reminders.deliver, { ownerId: "reminder-a", jobId: job._id });
  expect(await t.run(ctx => ctx.db.get(job._id))).toMatchObject({ state: "cancelled" });
});
test("push queue failures are logged safely and marked failed without throwing to the scheduler", async () => {
  const { t, a } = setup(); await a.mutation(api.profiles.ensure, { timezone: "UTC" });
  await t.run(ctx => ctx.db.insert("pushTokens", { ownerId: "reminder-a", token: "ExpoPushToken[not-registered]", platform: "android", updatedAt: Date.now() }));
  await a.mutation(api.tasks.create, { title: "Failed push", date: "2026-03-08", reminders: [{ type: "morning_of" }] });
  const job = (await t.run(ctx => ctx.db.query("reminderJobs").withIndex("by_owner", q => q.eq("ownerId", "reminder-a")).take(20)))[0];
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  await expect(t.action(internal.reminders.deliver, { ownerId: "reminder-a", jobId: job._id })).resolves.toBeNull();
  expect(await t.run(ctx => ctx.db.get(job._id))).toMatchObject({ state: "failed" });
  expect(log.mock.calls.flat().join(" ")).not.toContain("ExpoPushToken"); log.mockRestore();
});
