import { addDays, getWeekday, parse, toIsoDate } from "@kriyan/core";
import type { Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { TaskCreate, TaskPatch } from "../validators";
import * as V from "../validators";
import { owned, stamps, text, nullableDate, date, time, duration, finite, weekdays, searchText, taskCap } from "./shared";
import * as areas from "./areas";
import * as projects from "./projects";

export async function list(ctx: QueryCtx, ownerId: string, args: { status?: "active" | "completed"; limit?: number }) {
  const limit = Math.max(1, Math.min(5000, Math.round(finite(args.limit ?? 5000))));
  const status = args.status;
  return status
    ? ctx.db.query("tasks").withIndex("by_owner_status", (q) => q.eq("ownerId", ownerId).eq("status", status)).take(limit)
    : ctx.db.query("tasks").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(limit);
}
export const get = (ctx: QueryCtx, ownerId: string, args: { id: Id<"tasks"> }) => owned(ctx, ownerId, args.id);
function cleanRepeat(value: Infer<typeof V.repeat>) {
  if (!value) return null;
  if (!Number.isInteger(value.every) || value.every < 1 || value.every > 1000) throw new Error("Invalid repeat interval. Use a whole number from 1 to 1000.");
  const days = value.weekdays === undefined ? undefined : weekdays(value.weekdays);
  if (days && (value.unit !== "week" || days.length === 0)) throw new Error("Repeat weekdays need a weekly rule and at least one day.");
  return { ...value, ...(days ? { weekdays: days } : {}) };
}
function cleanReminders(values: Infer<typeof V.reminder>[]) {
  return values.map((value) => {
    if (value.type === "at_time") return { ...value, time: time(value.time) };
    if (value.type === "before") {
      if (finite(value.minutes) < 1) throw new Error("Invalid reminder. Set minutes to at least 1.");
      return { ...value, minutes: Math.round(value.minutes) };
    }
    return value;
  });
}
async function fields(ctx: QueryCtx, ownerId: string, args: TaskCreate | TaskPatch, current?: Doc<"tasks">) {
  let areaId = args.areaId ?? current?.areaId;
  let projectId = args.projectId === undefined ? current?.projectId ?? null : args.projectId;
  if (args.projectId) {
    const project = await owned(ctx, ownerId, args.projectId);
    // An explicitly contradictory pair is an error; choosing only a project selects its area.
    if (args.areaId !== undefined && args.areaId !== project.areaId) throw new Error("Project belongs to another area. Choose its area or another project.");
    areaId = project.areaId;
  } else if (args.areaId !== undefined && projectId) {
    const project = await owned(ctx, ownerId, projectId);
    if (project.areaId !== args.areaId) projectId = null;
  }
  if (!areaId) areaId = (await areas.list(ctx, ownerId))[0]?._id;
  if (!areaId) throw new Error("No areas available. Add an area first.");
  await owned(ctx, ownerId, areaId);
  const goalId = args.goalId === undefined ? current?.goalId ?? null : args.goalId;
  if (goalId) await owned(ctx, ownerId, goalId);
  const taskDate = nullableDate(args.date === undefined ? current?.date ?? null : args.date);
  let taskTime = args.time === undefined ? current?.time ?? null : args.time;
  if (args.date === null) taskTime = null;
  if (taskTime !== null) {
    taskTime = time(taskTime);
    if (!taskDate) throw new Error("A time needs a date. Supply a date in the same call.");
  }
  const result = {
    title: text(args.title ?? current?.title ?? "", 180, true),
    areaId, projectId, goalId, date: taskDate, time: taskTime,
    durationMinutes: duration(args.durationMinutes === undefined ? current?.durationMinutes ?? null : args.durationMinutes),
    deadline: nullableDate(args.deadline === undefined ? current?.deadline ?? null : args.deadline),
    repeat: cleanRepeat(args.repeat === undefined ? current?.repeat ?? null : args.repeat),
    reminders: cleanReminders(args.reminders ?? current?.reminders ?? []),
    notes: text(args.notes ?? current?.notes ?? "", 100_000),
    sortOrder: finite(args.sortOrder ?? current?.sortOrder ?? Date.now()),
  };
  if (result.repeat && !result.date) throw new Error("A repeating task needs a date. Set its first occurrence.");
  return { ...result, searchText: searchText(result.title, result.notes) };
}
export async function create(ctx: MutationCtx, ownerId: string, args: TaskCreate) {
  await taskCap(ctx, ownerId);
  const cleaned = await fields(ctx, ownerId, args);
  const id = await ctx.db.insert("tasks", { ...stamps(ownerId), ...cleaned, status: "active", completedAt: null });
  return owned(ctx, ownerId, id);
}
export async function update(ctx: MutationCtx, ownerId: string, args: { id: Id<"tasks">; patch: TaskPatch }) {
  const current = await owned(ctx, ownerId, args.id);
  const cleaned = await fields(ctx, ownerId, args.patch, current);
  await ctx.db.patch(args.id, { ...cleaned, updatedAt: Date.now() });
  return owned(ctx, ownerId, args.id);
}
function nextDate(value: string, rule: NonNullable<Doc<"tasks">["repeat"]>) {
  if (rule.unit === "day") return addDays(value, rule.every);
  if (rule.unit === "week") {
    if (!rule.weekdays) return addDays(value, rule.every * 7);
    const currentDay = (getWeekday(value) + 6) % 7;
    const later = rule.weekdays.map((day) => (day + 6) % 7).sort((a, b) => a - b).find((day) => day > currentDay);
    if (later !== undefined) return addDays(value, later - currentDay);
    const first = Math.min(...rule.weekdays.map((day) => (day + 6) % 7));
    return addDays(value, rule.every * 7 - currentDay + first);
  }
  const [year, month, day] = value.split("-").map(Number);
  const offset = rule.unit === "month" ? rule.every : rule.every * 12;
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return toIsoDate(target.getUTCFullYear(), target.getUTCMonth() + 1, Math.min(day, lastDay));
}
export async function complete(ctx: MutationCtx, ownerId: string, args: { id: Id<"tasks"> }) {
  const current = await owned(ctx, ownerId, args.id);
  if (current.status === "completed") return current;
  await ctx.db.patch(args.id, { status: "completed", completedAt: Date.now(), updatedAt: Date.now(), searchText: searchText(current.title, current.notes) });
  if (current.repeat && current.date) {
    const { _id, _creationTime, ownerId: ignoredOwner, createdAt, updatedAt, status, completedAt, searchText: ignoredSearch, ...copy } = current;
    void [_id, _creationTime, ignoredOwner, createdAt, updatedAt, status, completedAt, ignoredSearch];
    await create(ctx, ownerId, { ...copy, date: nextDate(current.date, current.repeat) });
  }
  return owned(ctx, ownerId, args.id);
}
export async function reopen(ctx: MutationCtx, ownerId: string, args: { id: Id<"tasks"> }) {
  const current = await owned(ctx, ownerId, args.id);
  if (current.status === "active") return current;
  await taskCap(ctx, ownerId);
  await ctx.db.patch(args.id, { status: "active", completedAt: null, updatedAt: Date.now(), searchText: searchText(current.title, current.notes) });
  return owned(ctx, ownerId, args.id);
}
export async function remove(ctx: MutationCtx, ownerId: string, args: { id: Id<"tasks"> }) {
  await owned(ctx, ownerId, args.id); await ctx.db.delete(args.id); return null;
}
export async function quickAdd(ctx: MutationCtx, ownerId: string, args: { text: string; today: string }) {
  const [ownerAreas, ownerProjects] = await Promise.all([areas.list(ctx, ownerId), projects.list(ctx, ownerId)]);
  const defaultArea = ownerAreas[0];
  if (!defaultArea) throw new Error("No areas available. Add an area first.");
  const parsed = parse(args.text, { today: date(args.today), defaultDate: null, defaultAreaId: defaultArea._id, areas: ownerAreas.map((row) => ({ id: row._id, name: row.name })), projects: ownerProjects.map((row) => ({ id: row._id, name: row.name, areaId: row.areaId })) });
  const areaId = ownerAreas.find((row) => row._id === parsed.areaId)?._id;
  const projectId = parsed.projectId === null ? null : ownerProjects.find((row) => row._id === parsed.projectId)?._id;
  if (!areaId || projectId === undefined) throw new Error("Task area or project not found. Try adding it again.");
  return create(ctx, ownerId, { ...parsed, areaId, projectId, date: parsed.time && !parsed.date ? args.today : parsed.date });
}
export async function search(ctx: QueryCtx, ownerId: string, args: { query: string; limit?: number }) {
  const query = text(args.query, 200);
  if (!query) return [];
  return ctx.db.query("tasks").withSearchIndex("search", (q) => q.search("searchText", query).eq("ownerId", ownerId).eq("status", "active")).take(Math.max(1, Math.min(100, Math.round(args.limit ?? 20))));
}
