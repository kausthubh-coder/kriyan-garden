import type { OptimisticLocalStore } from "convex/browser";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import type { TaskCreate, TaskPatch } from "@kriyan/backend/convex/validators";
import { api } from "@kriyan/backend/convex/_generated/api";
import { plannedMinutes } from "@kriyan/core";
import type { Day, Task } from "./types";

export function findTask(store: OptimisticLocalStore, id: Id<"tasks">) {
  const direct = store.getQuery(api.tasks.get, { id });
  if (direct) return direct;
  for (const { value } of store.getAllQueries(api.tasks.list)) {
    const task = value?.find((task) => task._id === id);
    if (task) return task;
  }
  for (const { value } of store.getAllQueries(api.day.get)) {
    const task =
      value &&
      [...value.timed, ...value.anytime, ...value.unscheduled].find(
        (task) => task._id === id,
      );
    if (task) return task;
  }
}
function replace(tasks: Task[], id: Id<"tasks">, next: Task | null) {
  return [...tasks.filter((task) => task._id !== id), ...(next ? [next] : [])];
}
function dayWithTask(day: Day, id: Id<"tasks">, next: Task | null): Day {
  const tasks = replace(
    [...day.timed, ...day.anytime],
    id,
    next?.date === day.date ? next : null,
  );
  return {
    ...day,
    timed: tasks
      .filter((task) => task.time !== null)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    anytime: tasks
      .filter((task) => task.time === null)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    unscheduled: replace(
      day.unscheduled,
      id,
      next?.date === null && next.status === "active" ? next : null,
    ),
    plannedMinutes: plannedMinutes(tasks),
    countWithoutDuration: tasks.filter(
      (task) => task.status === "active" && task.durationMinutes === null,
    ).length,
  };
}
export function cacheTask(
  store: OptimisticLocalStore,
  id: Id<"tasks">,
  next: Task | null,
) {
  for (const { args, value } of store.getAllQueries(api.tasks.list))
    if (value)
      store.setQuery(
        api.tasks.list,
        args,
        replace(
          value,
          id,
          next && (!args.status || next.status === args.status) ? next : null,
        ),
      );
  for (const { args, value } of store.getAllQueries(api.day.get))
    if (value) store.setQuery(api.day.get, args, dayWithTask(value, id, next));
  for (const { args, value } of store.getAllQueries(api.week.get))
    if (value)
      store.setQuery(
        api.week.get,
        args,
        value.map((day) => {
          const updated = dayWithTask(day, id, next),
            active = [...updated.timed, ...updated.anytime].filter(
              (task) => task.status === "active",
            );
          const plannedMinutesByArea: Record<string, number> = {};
          for (const task of active)
            plannedMinutesByArea[task.areaId] =
              (plannedMinutesByArea[task.areaId] ?? 0) +
              (task.durationMinutes ?? 0);
          return { ...updated, taskCount: active.length, plannedMinutesByArea };
        }),
      );
  if (store.getQuery(api.tasks.get, { id }) && next)
    store.setQuery(api.tasks.get, { id }, next);
}
export function optimisticPatch(
  store: OptimisticLocalStore,
  { id, patch }: { id: Id<"tasks">; patch: TaskPatch },
) {
  const current = findTask(store, id);
  if (current)
    cacheTask(store, id, {
      ...current,
      ...patch,
      ...(patch.date === null ? { time: null } : {}),
    });
}
export function optimisticStatus(
  store: OptimisticLocalStore,
  id: Id<"tasks">,
  status: Task["status"],
) {
  const current = findTask(store, id);
  if (current) cacheTask(store, id, { ...current, status });
}
export function optimisticCreate(
  store: OptimisticLocalStore,
  args: TaskCreate,
) {
  const areaId = args.areaId ?? store.getQuery(api.areas.list, {})?.[0]?._id;
  if (!areaId) return;
  const timestamp = Date.now();
  // Convex replaces this local-only row with the returned server row atomically.
  const id = `optimistic-${timestamp}-${args.title}` as Id<"tasks">;
  const task: Task = {
    _id: id,
    _creationTime: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ownerId: "",
    title: args.title,
    areaId,
    projectId: args.projectId ?? null,
    goalId: args.goalId ?? null,
    date: args.date ?? null,
    time: args.time ?? null,
    durationMinutes: args.durationMinutes ?? null,
    deadline: args.deadline ?? null,
    repeat: args.repeat ?? null,
    reminders: args.reminders ?? [],
    notes: args.notes ?? "",
    sortOrder: args.sortOrder ?? timestamp,
    status: "active",
    completedAt: null,
    searchText: args.title,
  };
  cacheTask(store, id, task);
}
export function taskValues(task: Task): TaskCreate {
  return {
    title: task.title,
    areaId: task.areaId,
    projectId: task.projectId,
    goalId: task.goalId,
    date: task.date,
    time: task.time,
    durationMinutes: task.durationMinutes,
    deadline: task.deadline,
    repeat: task.repeat,
    reminders: task.reminders,
    notes: task.notes,
    sortOrder: task.sortOrder,
  };
}
