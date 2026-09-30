import { getWeekday } from "@kriyan/core";
import type { Doc } from "../_generated/dataModel";

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
