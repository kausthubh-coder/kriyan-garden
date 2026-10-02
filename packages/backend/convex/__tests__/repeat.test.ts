/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import pushComponent from "@convex-dev/expo-push-notifications/test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T16:00:00Z"));
  const t = convexTest(schema, modules);
  pushComponent.register(t);
  return { t, a: t.withIdentity({ subject: "repeat-a" }) };
}
afterEach(() => vi.useRealTimers());
const jobs = (t: ReturnType<typeof setup>["t"], about?: string) => t.run(async ctx => (await ctx.db.query("reminderJobs").withIndex("by_owner", q => q.eq("ownerId", "repeat-a")).collect()).filter(job => job.state === "pending" && (!about || job.about === about)));

test("completing a monthly 2nd Tuesday task schedules the next one and counts occurrences", async () => {
  const { a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const task = await a.mutation(api.tasks.create, { title: "Club meeting", date: "2026-10-13", repeat: { every: 1, unit: "month", monthDay: { kind: "weekday", nth: 2, weekday: 2 }, ends: { kind: "after", count: 2 } } });
  await a.mutation(api.tasks.complete, { id: task._id });
  const [next] = (await a.query(api.tasks.list, { status: "active" }));
  expect(next).toMatchObject({ title: "Club meeting", date: "2026-11-10", repeatIndex: 2 });
  if (!next) throw new Error("Missing next occurrence");
  // The series was two meetings long, so completing the second ends it.
  await a.mutation(api.tasks.complete, { id: next._id });
  expect(await a.query(api.tasks.list, { status: "active" })).toEqual([]);
});

test("monthly rules keep their day: the 31st returns after a short month", async () => {
  const { a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const task = await a.mutation(api.tasks.create, { title: "Pay rent", date: "2027-01-31", repeat: { every: 1, unit: "month" } });
  expect(task.repeat).toMatchObject({ monthDay: { kind: "day", day: 31 } });
  await a.mutation(api.tasks.complete, { id: task._id });
  const [february] = await a.query(api.tasks.list, { status: "active" });
  if (!february) throw new Error("Missing February");
  expect(february.date).toBe("2027-02-28");
  await a.mutation(api.tasks.complete, { id: february._id });
  expect((await a.query(api.tasks.list, { status: "active" }))[0]?.date).toBe("2027-03-31");
});

test("completion basis counts from the person's local day", async () => {
  const { a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const task = await a.mutation(api.tasks.create, { title: "Water plants", date: "2026-09-20", repeat: { every: 3, unit: "day", basis: "completion" } });
  await a.mutation(api.tasks.complete, { id: task._id });
  expect((await a.query(api.tasks.list, { status: "active" }))[0]?.date).toBe("2026-10-04");
});

test("skip moves to the next occurrence without completing, and refuses at the end of a series", async () => {
  const { a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const task = await a.mutation(api.tasks.create, { title: "Gym", date: "2026-10-02", repeat: { every: 1, unit: "week", weekdays: [1, 5], ends: { kind: "on", date: "2026-10-05" } } });
  const skipped = await a.mutation(api.tasks.skip, { id: task._id });
  expect(skipped).toMatchObject({ date: "2026-10-05", status: "active", repeatIndex: 2 });
  await expect(a.mutation(api.tasks.skip, { id: task._id })).rejects.toThrow("last time this task repeats");
  await expect(a.mutation(api.tasks.create, { title: "Bad", date: "2026-10-02", repeat: { every: 1, unit: "day", weekdays: [1] } })).rejects.toThrow("weekly rule");
});

test("deadline reminders work without a planned day and snooze adds one more", async () => {
  const { t, a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  const task = await a.mutation(api.tasks.create, { title: "Essay", deadline: "2026-10-09", reminders: [{ type: "deadline", daysBefore: 2, time: "18:00" }] });
  expect(await jobs(t, "deadline")).toMatchObject([{ fireAt: Date.parse("2026-10-07T22:00:00Z") }]);
  await expect(a.mutation(api.tasks.create, { title: "No deadline", reminders: [{ type: "deadline", daysBefore: 1, time: "18:00" }] })).rejects.toThrow("Set a deadline");
  await a.mutation(api.tasks.snoozeReminder, { id: task._id, until: Date.now() + 600_000 });
  expect(await jobs(t, "snooze")).toHaveLength(1);
  await expect(a.mutation(api.tasks.snoozeReminder, { id: task._id, until: Date.now() + 8 * 86_400_000 })).rejects.toThrow("up to 7 days");
});

test("the daily summary is scheduled at the local time and reschedules itself", async () => {
  const { t, a } = setup();
  await a.mutation(api.profiles.ensure, { timezone: "America/New_York" });
  await a.mutation(api.tasks.create, { title: "Today's task", date: "2026-10-01" });
  await a.mutation(api.tasks.create, { title: "Due Friday", deadline: "2026-10-02" });
  const profile = await a.mutation(api.profiles.update, { patch: { dailySummaryTime: "07:30" } });
  const jobId = profile.summaryJobId;
  if (!jobId) throw new Error("Missing summary job");
  const first = await t.run(ctx => ctx.db.system.get(jobId));
  // 16:00 UTC is 12:00 in New York, so the next 07:30 is tomorrow.
  expect(first?.scheduledTime).toBe(Date.parse("2026-10-02T11:30:00Z"));
  vi.setSystemTime(new Date("2026-10-01T11:30:00Z"));
  await t.mutation(internal.summary.send, { ownerId: "repeat-a" });
  const after = await a.query(api.profiles.get, {});
  expect(after?.summaryJobId).not.toEqual(profile.summaryJobId);
  const cleared = await a.mutation(api.profiles.update, { patch: { dailySummaryTime: null } });
  expect(cleared.summaryJobId).toBeNull();
});
