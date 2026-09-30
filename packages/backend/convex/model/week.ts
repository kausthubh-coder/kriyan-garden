import { addDays } from "@kriyan/core";
import type { QueryCtx } from "../_generated/server";
import { date } from "./shared";
import { assemble } from "./day";

export async function get(ctx: QueryCtx, ownerId: string, args: { startDate: string }) {
  const startDate = date(args.startDate);
  const [tasks, events, undated] = await Promise.all([
    ctx.db.query("tasks").withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId).gte("date", startDate).lte("date", addDays(startDate, 6))).take(10000),
    ctx.db.query("events").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(100),
    ctx.db.query("tasks").withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId).eq("date", null)).take(10000),
  ]);
  const unscheduled = undated.filter((task) => task.status === "active");
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(startDate, index);
    const dayTasks = tasks.filter((task) => task.date === day);
    const plannedMinutesByArea: Record<string, number> = {};
    for (const task of dayTasks) if (task.status === "active" && task.durationMinutes !== null) plannedMinutesByArea[task.areaId] = (plannedMinutesByArea[task.areaId] ?? 0) + task.durationMinutes;
    return { ...assemble(day, dayTasks, events, unscheduled), plannedMinutesByArea, taskCount: dayTasks.filter((task) => task.status === "active").length };
  });
}
