import { getWeekday } from "@kriyan/core";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { date } from "./shared";

export function assemble(day: string, tasks: Doc<"tasks">[], events: Doc<"events">[], unscheduled: Doc<"tasks">[]) {
  const active = tasks.filter((task) => task.status === "active");
  return {
    date: day,
    timed: tasks.filter((task) => task.time !== null).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "") || a.sortOrder - b.sortOrder),
    anytime: tasks.filter((task) => task.time === null).sort((a, b) => a.sortOrder - b.sortOrder),
    unscheduled,
    events: events.filter((event) => event.weekdays.includes(getWeekday(day)) && event.fromDate <= day && (event.untilDate === null || event.untilDate >= day)).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    plannedMinutes: active.reduce((sum, task) => sum + (task.durationMinutes ?? 0), 0),
    countWithoutDuration: active.filter((task) => task.durationMinutes === null).length,
  };
}
export async function get(ctx: QueryCtx, ownerId: string, args: { date: string }) {
  const day = date(args.date);
  const [tasks, events, undated] = await Promise.all([
    ctx.db.query("tasks").withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId).eq("date", day)).take(10000),
    ctx.db.query("events").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(100),
    ctx.db.query("tasks").withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId).eq("date", null)).take(10000),
  ]);
  return assemble(day, tasks, events, undated.filter((task) => task.status === "active"));
}
