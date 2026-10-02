import { nextDate } from "./nextDate";
import { parse } from "@kriyan/core";
import { ConvexError, v, type Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { TaskCreate, TaskPatch } from "../validators";
import * as V from "../validators";
import {
  owned,
  stamps,
  text,
  nullableDate,
  date,
  time,
  duration,
  finite,
  weekdays,
  searchText,
  taskCap,
} from "./shared";
import * as areas from "./areas";
import * as projects from "./projects";
import * as reminders from "./reminders";

export async function list(
  ctx: QueryCtx,
  ownerId: string,
  args: { status?: "active" | "completed"; limit?: number },
) {
  const limit = Math.max(
    1,
    Math.min(5000, Math.round(finite(args.limit ?? 5000))),
  );
  const status = args.status;
  return status
    ? ctx.db
        .query("tasks")
        .withIndex("by_owner_status", (q) =>
          q.eq("ownerId", ownerId).eq("status", status),
        )
        .take(limit)
    : ctx.db
        .query("tasks")
        .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
        .take(limit);
}
export const get = (
  ctx: QueryCtx,
  ownerId: string,
  args: { id: Id<"tasks"> },
) => owned(ctx, ownerId, args.id);
/** URL selections are optional UI state, unlike the strict record API. */
export async function lookup(
  ctx: QueryCtx,
  ownerId: string,
  args: { key: string },
) {
  const id = ctx.db.normalizeId("tasks", args.key);
  if (!id) return null;
  const row = await ctx.db.get(id);
  return row?.ownerId === ownerId ? row : null;
}
const filterValidator = v.object(V.taskFilters);
/** Service filters run before the response limit, over an owner-prefixed index. */
export async function filteredList(
  ctx: QueryCtx,
  ownerId: string,
  args: Infer<typeof filterValidator>,
) {
  const limit = Math.max(
    1,
    Math.min(100, Math.round(finite(args.limit ?? 100))),
  );
  for (const value of [
    args.dateFrom,
    args.dateTo,
    args.deadlineFrom,
    args.deadlineTo,
  ])
    if (value !== undefined) date(value);
  for (const id of [args.areaId, args.projectId, args.goalId])
    if (id) await owned(ctx, ownerId, id);
  const base = ctx.db.query("tasks");
  const { projectId, goalId, areaId, status } = args;
  const source = projectId
    ? base.withIndex("by_owner_project", (q) =>
        q.eq("ownerId", ownerId).eq("projectId", projectId),
      )
    : goalId
      ? base.withIndex("by_owner_goal", (q) =>
          q.eq("ownerId", ownerId).eq("goalId", goalId),
        )
      : areaId
        ? base.withIndex("by_owner_area", (q) =>
            q.eq("ownerId", ownerId).eq("areaId", areaId),
          )
        : args.deadlineFrom || args.deadlineTo
          ? base.withIndex("by_owner_deadline", (q) => {
              const owner = q.eq("ownerId", ownerId);
              const from = args.deadlineFrom
                ? owner.gte("deadline", args.deadlineFrom)
                : owner.gt("deadline", null);
              return args.deadlineTo
                ? from.lte("deadline", args.deadlineTo)
                : from;
            })
          : args.dateFrom || args.dateTo
            ? base.withIndex("by_owner_date", (q) => {
                const owner = q.eq("ownerId", ownerId);
                const from = args.dateFrom
                  ? owner.gte("date", args.dateFrom)
                  : owner.gt("date", null);
                return args.dateTo ? from.lte("date", args.dateTo) : from;
              })
            : status
              ? base.withIndex("by_owner_status", (q) =>
                  q.eq("ownerId", ownerId).eq("status", status),
                )
              : base.withIndex("by_owner", (q) => q.eq("ownerId", ownerId));
  const result: Doc<"tasks">[] = [];
  let examined = 0;
  for await (const task of source) {
    if (++examined > 12000)
      throw new ConvexError(
        "Too many tasks to filter. Narrow the area or date range.",
      );
    if (
      (args.status && task.status !== args.status) ||
      (args.areaId && task.areaId !== args.areaId) ||
      (args.projectId && task.projectId !== args.projectId) ||
      (args.goalId && task.goalId !== args.goalId)
    )
      continue;
    if (
      (args.dateFrom && (!task.date || task.date < args.dateFrom)) ||
      (args.dateTo && (!task.date || task.date > args.dateTo))
    )
      continue;
    if (
      (args.deadlineFrom &&
        (!task.deadline || task.deadline < args.deadlineFrom)) ||
      (args.deadlineTo && (!task.deadline || task.deadline > args.deadlineTo))
    )
      continue;
    if (
      args.text &&
      !task.title.toLocaleLowerCase().includes(args.text.toLocaleLowerCase())
    )
      continue;
    result.push(task);
    if (result.length === limit) break;
  }
  return result;
}
function cleanRepeat(value: Infer<typeof V.repeat>) {
  if (!value) return null;
  if (!Number.isInteger(value.every) || value.every < 1 || value.every > 1000)
    throw new ConvexError(
      "Invalid repeat interval. Use a whole number from 1 to 1000.",
    );
  const days =
    value.weekdays === undefined ? undefined : weekdays(value.weekdays);
  if (days && (value.unit !== "week" || days.length === 0))
    throw new ConvexError("Repeat weekdays need a weekly rule and at least one day.");
  return { ...value, ...(days ? { weekdays: days } : {}) };
}
function cleanReminders(values: Infer<typeof V.reminder>[]) {
  if (values.length > 8)
    throw new ConvexError("Invalid reminder. Use at most 8 reminders.");
  return values.map((value) => {
    if (value.type === "at_time") return { ...value, time: time(value.time) };
    if (value.type === "before") {
      if (finite(value.minutes) < 1)
        throw new ConvexError("Invalid reminder. Set minutes to at least 1.");
      return { ...value, minutes: Math.round(value.minutes) };
    }
    return value;
  });
}
async function fields(
  ctx: QueryCtx,
  ownerId: string,
  args: TaskCreate | TaskPatch,
  current?: Doc<"tasks">,
) {
  const title = (args.title ?? current?.title ?? "").trim();
  if (title.length > 180)
    throw new ConvexError("A task title must be 180 characters or fewer. Shorten the title and try again.");
  let areaId = args.areaId ?? current?.areaId;
  let projectId =
    args.projectId === undefined
      ? (current?.projectId ?? null)
      : args.projectId;
  if (args.projectId) {
    const project = await owned(ctx, ownerId, args.projectId);
    // An explicitly contradictory pair is an error; choosing only a project selects its area.
    if (args.areaId !== undefined && args.areaId !== project.areaId)
      throw new ConvexError(
        "Project belongs to another area. Choose its area or another project.",
      );
    areaId = project.areaId;
  } else if (args.areaId !== undefined && projectId) {
    const project = await owned(ctx, ownerId, projectId);
    if (project.areaId !== args.areaId) projectId = null;
  }
  if (!areaId) areaId = (await areas.list(ctx, ownerId))[0]?._id;
  if (!areaId) throw new ConvexError("No areas available. Add an area first.");
  await owned(ctx, ownerId, areaId);
  const goalId =
    args.goalId === undefined ? (current?.goalId ?? null) : args.goalId;
  if (goalId) await owned(ctx, ownerId, goalId);
  const taskDate = nullableDate(
    args.date === undefined ? (current?.date ?? null) : args.date,
  );
  let taskTime = args.time === undefined ? (current?.time ?? null) : args.time;
  if (args.date === null && args.time == null) taskTime = null;
  if (taskTime !== null) {
    taskTime = time(taskTime);
    if (!taskDate)
      throw new ConvexError("A time needs a date. Supply a date in the same call.");
  }
  const result = {
    title: text(title, 180, true),
    areaId,
    projectId,
    goalId,
    date: taskDate,
    time: taskTime,
    durationMinutes: duration(
      args.durationMinutes === undefined
        ? (current?.durationMinutes ?? null)
        : args.durationMinutes,
    ),
    deadline: nullableDate(
      args.deadline === undefined ? (current?.deadline ?? null) : args.deadline,
    ),
    repeat: cleanRepeat(
      args.repeat === undefined ? (current?.repeat ?? null) : args.repeat,
    ),
    reminders: cleanReminders(args.reminders ?? current?.reminders ?? []),
    notes: text(args.notes ?? current?.notes ?? "", 100_000),
    sortOrder: finite(args.sortOrder ?? current?.sortOrder ?? Date.now()),
  };
  if (result.repeat && !result.date)
    throw new ConvexError("A repeating task needs a date. Set its first occurrence.");
  if (result.reminders.length > 8)
    throw new ConvexError("Invalid reminder. Use at most 8 reminders.");
  if (result.reminders.length && !result.date)
    throw new ConvexError("Invalid reminder. Set a date before adding reminders.");
  if (
    result.reminders.some(
      (reminder) => reminder.type === "at_start" || reminder.type === "before",
    ) &&
    !result.time
  )
    throw new ConvexError(
      "Invalid reminder. Set a time for at_start or before reminders.",
    );
  return { ...result, searchText: searchText(result.title, result.notes) };
}
export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: TaskCreate,
) {
  await taskCap(ctx, ownerId);
  return insert(ctx, ownerId, args);
}
/** Create without the per-call cap scan; callers check the cap once for a whole batch. */
export async function insert(
  ctx: MutationCtx,
  ownerId: string,
  args: TaskCreate,
) {
  const cleaned = await fields(ctx, ownerId, args);
  const id = await ctx.db.insert("tasks", {
    ...stamps(ownerId),
    ...cleaned,
    status: "active",
    completedAt: null,
  });
  const task = await owned(ctx, ownerId, id);
  await reminders.schedule(ctx, task);
  return task;
}
export async function update(
  ctx: MutationCtx,
  ownerId: string,
  args: { id: Id<"tasks">; patch: TaskPatch },
) {
  const current = await owned(ctx, ownerId, args.id);
  const cleaned = await fields(ctx, ownerId, args.patch, current);
  await ctx.db.patch(args.id, { ...cleaned, updatedAt: Date.now() });
  const task = await owned(ctx, ownerId, args.id);
  await reminders.schedule(ctx, task);
  return task;
}
export async function completeWithNext(
  ctx: MutationCtx,
  ownerId: string,
  args: { id: Id<"tasks"> },
) {
  const current = await owned(ctx, ownerId, args.id);
  if (current.status === "completed")
    return { task: current, nextOccurrence: null };
  await reminders.cancel(ctx, ownerId, args.id);
  await ctx.db.patch(args.id, {
    status: "completed",
    completedAt: Date.now(),
    updatedAt: Date.now(),
    searchText: searchText(current.title, current.notes),
  });
  let nextOccurrence: Doc<"tasks"> | null = null;
  if (current.repeat && current.date) {
    const {
      _id,
      _creationTime,
      ownerId: ignoredOwner,
      createdAt,
      updatedAt,
      status,
      completedAt,
      searchText: ignoredSearch,
      ...copy
    } = current;
    void [
      _id,
      _creationTime,
      ignoredOwner,
      createdAt,
      updatedAt,
      status,
      completedAt,
      ignoredSearch,
    ];
    nextOccurrence = await create(ctx, ownerId, {
      ...copy,
      date: nextDate(current.date, current.repeat),
    });
  }
  return { task: await owned(ctx, ownerId, args.id), nextOccurrence };
}
export async function complete(
  ctx: MutationCtx,
  ownerId: string,
  args: { id: Id<"tasks"> },
) {
  return (await completeWithNext(ctx, ownerId, args)).task;
}
export async function reopen(
  ctx: MutationCtx,
  ownerId: string,
  args: { id: Id<"tasks"> },
) {
  const current = await owned(ctx, ownerId, args.id);
  if (current.status === "active") return current;
  await taskCap(ctx, ownerId);
  await ctx.db.patch(args.id, {
    status: "active",
    completedAt: null,
    updatedAt: Date.now(),
    searchText: searchText(current.title, current.notes),
  });
  const task = await owned(ctx, ownerId, args.id);
  await reminders.schedule(ctx, task);
  return task;
}
export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { id: Id<"tasks"> },
) {
  await owned(ctx, ownerId, args.id);
  await reminders.cancel(ctx, ownerId, args.id);
  await ctx.db.delete(args.id);
  return null;
}
export async function quickAdd(
  ctx: MutationCtx,
  ownerId: string,
  args: { text: string; today: string },
) {
  const [ownerAreas, ownerProjects] = await Promise.all([
    areas.list(ctx, ownerId),
    projects.list(ctx, ownerId),
  ]);
  const defaultArea = ownerAreas[0];
  if (!defaultArea) throw new ConvexError("No areas available. Add an area first.");
  const parsed = parse(args.text, {
    today: date(args.today),
    defaultDate: null,
    defaultAreaId: defaultArea._id,
    areas: ownerAreas.map((row) => ({ id: row._id, name: row.name })),
    projects: ownerProjects.map((row) => ({
      id: row._id,
      name: row.name,
      areaId: row.areaId,
    })),
  });
  const areaId = ownerAreas.find((row) => row._id === parsed.areaId)?._id;
  const projectId =
    parsed.projectId === null
      ? null
      : ownerProjects.find((row) => row._id === parsed.projectId)?._id;
  if (!areaId || projectId === undefined)
    throw new ConvexError("Task area or project not found. Try adding it again.");
  return create(ctx, ownerId, {
    ...parsed,
    areaId,
    projectId,
    date: parsed.time && !parsed.date ? args.today : parsed.date,
  });
}
export async function search(
  ctx: QueryCtx,
  ownerId: string,
  args: { query: string; limit?: number },
) {
  const query = text(args.query, 200);
  if (!query) return [];
  return ctx.db
    .query("tasks")
    .withSearchIndex("search", (q) =>
      q
        .search("searchText", query)
        .eq("ownerId", ownerId)
        .eq("status", "active"),
    )
    .take(Math.max(1, Math.min(100, Math.round(args.limit ?? 20))));
}
