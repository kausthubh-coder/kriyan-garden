import { addDays, getWeekday } from "./dates";

export const weekStart = (date: string) =>
  addDays(date, -((getWeekday(date) + 6) % 7));
export const minutesOf = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const timeOf = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const formatMinutes = (minutes: number) =>
  minutes < 60
    ? `${minutes}m`
    : minutes % 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${minutes / 60}h`;

type PlannedTask = {
  date: string | null;
  status: "active" | "completed";
  durationMinutes: number | null;
};
export function plannedMinutes(tasks: readonly PlannedTask[]) {
  return tasks.reduce(
    (sum, task) =>
      sum + (task.status === "active" ? (task.durationMinutes ?? 0) : 0),
    0,
  );
}
/** Capacity counts every area, even when the view is filtered. */
export function deadlineCapacity(
  today: string,
  deadline: string,
  dailyCapacity: number,
  tasks: readonly PlannedTask[],
) {
  let free = 0;
  for (let day = today; day <= deadline; day = addDays(day, 1)) {
    free += Math.max(
      0,
      dailyCapacity - plannedMinutes(tasks.filter((task) => task.date === day)),
    );
  }
  return free;
}

export interface Interval {
  start: number;
  end: number;
}
/** Use visual extent for slim markers, as in the prototype. */
export function layoutIntervals<T extends Interval>(intervals: readonly T[]) {
  const sorted = intervals
    .map((interval) => ({
      ...interval,
      visualEnd: Math.max(interval.end, interval.start + 32),
      column: 0,
      columns: 1,
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  let ends: number[] = [],
    group: typeof sorted = [],
    end = -1;
  const flush = () => {
    for (const item of group) item.columns = ends.length;
    ends = [];
    group = [];
    end = -1;
  };
  for (const item of sorted) {
    if (group.length && item.start >= end) flush();
    let column = ends.findIndex((value) => value <= item.start);
    if (column < 0) column = ends.length;
    ends[column] = item.visualEnd;
    item.column = column;
    group.push(item);
    end = Math.max(end, item.visualEnd);
  }
  flush();
  return sorted;
}
