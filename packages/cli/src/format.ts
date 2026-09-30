import { formatMinutes } from "@kriyan/core";
import { CliError, object } from "./errors";

export type Row = Record<string, unknown>;
export function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new CliError("Kriyan returned an invalid list. Try again.");
  return value.map(object);
}
export function id(row: Row): string {
  const value = row.id ?? row._id;
  if (typeof value !== "string" || !value) throw new CliError("Kriyan returned a task without an id. Try again.");
  return value;
}
export const plain = (value: unknown): string => String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
export const shortId = (row: Row): string => id(row).slice(0, 8);
export function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T00:00:00Z`).valueOf()) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function formatDate(value: unknown): string {
  if (typeof value !== "string" || !isDate(value)) return "Unscheduled";
  const date = new Date(`${value}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month").slice(0, 3)}`;
}
export function aligned(headers: string[], data: string[][]): string {
  const widths = headers.map((header, index) => Math.max(header.length, ...data.map((row) => row[index]?.length ?? 0)));
  return [headers, ...data].map((row) => row.map((cell, index) => cell.padEnd(widths[index] ?? cell.length)).join("  ").trimEnd()).join("\n");
}
export function areaName(row: Row, areas: readonly Row[]): string {
  if (typeof row.areaName === "string") return plain(row.areaName);
  if (typeof row.area === "string") return plain(row.area);
  if (row.area && typeof row.area === "object" && "name" in row.area) return plain(row.area.name);
  const area = areas.find((candidate) => id(candidate) === row.areaId);
  return area ? plain(area.name) : "No area";
}
export function formatTasks(tasks: readonly Row[], areas: readonly Row[] = []): string {
  if (!tasks.length) return "No tasks.";
  return aligned(["Id", "Task", "Area", "Date", "Time", "Length", "Status"], tasks.map((task) => [
    shortId(task), plain(task.title), areaName(task, areas), formatDate(task.date), plain(task.time) || "Any time",
    typeof task.durationMinutes === "number" ? formatMinutes(task.durationMinutes) : "", plain(task.status),
  ]));
}
export function formatDay(day: Row, areas: readonly Row[]): string {
  const sections = [formatDate(day.date)];
  const capacity = typeof day.capacityMinutes === "number" ? ` against ${formatMinutes(day.capacityMinutes)} capacity` : "";
  sections.push(`${formatMinutes(typeof day.plannedMinutes === "number" ? day.plannedMinutes : 0)} planned${capacity}${typeof day.freeMinutes === "number" ? `, ${formatMinutes(day.freeMinutes)} free` : ""}`);
  for (const [key, label] of [["timed", "Timed tasks"], ["anytime", "Any-time tasks"], ["unscheduled", "Unscheduled tasks"]]) {
    sections.push(`${label}\n${formatTasks(rows(day[key]), areas)}`);
  }
  const events = rows(day.events);
  sections.push(`Events\n${events.length ? aligned(["Event", "Area", "Time"], events.map((event) => [plain(event.title), areaName(event, areas), `${plain(event.startTime)} to ${plain(event.endTime)}`])) : "No events."}`);
  return sections.join("\n\n");
}
export function formatWeek(week: Row, areas: readonly Row[]): string {
  const days = rows(week.days);
  const headers = ["Day", ...areas.map((area) => plain(area.name)), "Planned", "Free"];
  const data = days.map((day) => {
    const byArea = day.plannedMinutesByArea ? object(day.plannedMinutesByArea) : {};
    return [formatDate(day.date), ...areas.map((area) => formatMinutes(typeof byArea[id(area)] === "number" ? Number(byArea[id(area)]) : 0)), formatMinutes(Number(day.plannedMinutes ?? 0)), typeof day.freeMinutes === "number" ? formatMinutes(day.freeMinutes) : ""];
  });
  const deadlines = rows(week.deadlines);
  return `${days.length ? aligned(headers, data) : "No days."}\n\nDeadlines\n${deadlines.length ? aligned(["Task", "Area", "Deadline", "Time needed", "Time free"], deadlines.map((task) => [plain(task.title), areaName(task, areas), formatDate(task.deadline), typeof task.timeNeededMinutes === "number" ? formatMinutes(task.timeNeededMinutes) : "Not set", typeof task.timeFreeMinutes === "number" ? formatMinutes(task.timeFreeMinutes) : ""])) : "No deadlines in the next 14 days."}`;
}
export function formatGoals(goals: readonly Row[], areas: readonly Row[]): string {
  if (!goals.length) return "No goals.";
  return aligned(["Goal", "Area", "Target date", "Progress", "Status"], goals.map((goal) => {
    const metric = object(goal.metric);
    let progress = "";
    if (metric.kind === "number") progress = `${plain(metric.current)}/${plain(metric.target)} ${plain(metric.unit)}`.trim();
    if (metric.kind === "tasks") { const tasks = object(goal.linkedTasks); progress = `${plain(tasks.done)}/${plain(tasks.total)} tasks`; }
    if (metric.kind === "milestones") { const milestones = rows(goal.milestones); progress = `${milestones.filter((milestone) => milestone.doneAt !== null).length}/${milestones.length} milestones`; }
    return [plain(goal.title), areaName(goal, areas), goal.targetDate ? formatDate(goal.targetDate) : "Not set", progress, plain(goal.status)];
  }));
}

export function matchTask(tasks: readonly Row[], reference: string): Row {
  const exact = tasks.find((task) => id(task) === reference);
  if (exact) return exact;
  const wanted = reference.toLocaleLowerCase("en-US");
  const matches = tasks.filter((task) => id(task).startsWith(reference) || plain(task.title).toLocaleLowerCase("en-US").includes(wanted));
  if (!matches.length) throw new CliError(`No task matches "${plain(reference)}". Run kriyan list and use a task id.`);
  if (matches.length > 1) {
    const candidates = matches.map((task) => ({ id: id(task), shortId: shortId(task), title: plain(task.title) }));
    throw new CliError(`More than one task matches "${plain(reference)}". Use a task id.\n${aligned(["Id", "Task"], candidates.map((task) => [task.shortId, task.title]))}`, 2, { candidates });
  }
  const match = matches[0];
  if (!match) throw new CliError("No task matched. Run kriyan list and use a task id.");
  return match;
}
