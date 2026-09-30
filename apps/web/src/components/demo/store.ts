import { addDays, weekStart } from "@kriyan/core";
import { assemble } from "@kriyan/backend/convex/model/assemble";
import { nextDate } from "@kriyan/backend/convex/model/nextDate";
import type { TaskCreate } from "@kriyan/backend/convex/validators";
import type { TaskTransport, GoalTransport } from "../app/dataAccess";
import type { Task, Goal } from "../app/types";
import { seed, id } from "./seed";

/** One store per mounted demo. No network, storage, identity or server writes. */
export function createDemoStore(today: string) {
  let state = seed(today), counter = 0;
  const listeners = new Set<() => void>();
  const notify = () => { state = { ...state }; listeners.forEach((listener) => listener()); };
  const find = (key: string) => {
    const task = state.tasks.find((task) => task._id === key);
    if (!task) throw new Error("Task was removed. Close its details and choose another task.");
    return task;
  };
  const create = async (args: TaskCreate) => {
    if (!args.title.trim()) throw new Error("Task title is empty. Enter a title and try again.");
    const stamp = Date.now();
    const row: Task = { ownerId: "public-demo", _id: id<"tasks">(`added-${counter++}`), _creationTime: stamp, createdAt: stamp, updatedAt: stamp,
      title: args.title.trim(), areaId: args.areaId ?? id<"areas">("life"), projectId: args.projectId ?? null, goalId: args.goalId ?? null,
      date: args.date ?? null, time: args.time ?? null, durationMinutes: args.durationMinutes ?? null, deadline: args.deadline ?? null,
      repeat: args.repeat ?? null, reminders: args.reminders ?? [], notes: args.notes ?? "", sortOrder: args.sortOrder ?? stamp,
      status: "active", completedAt: null, searchText: args.title.toLowerCase() };
    state.tasks = [...state.tasks, row]; notify(); return row;
  };
  const tasks: TaskTransport = {
    create,
    update: async ({ id, patch }) => {
      const current = find(id);
      const row = { ...current, ...patch, ...(patch.date === null ? { time: null } : {}), updatedAt: Date.now() };
      if (!row.title.trim()) throw new Error("Task title is empty. Enter a title and try again.");
      if (row.durationMinutes !== null && (!Number.isFinite(row.durationMinutes) || row.durationMinutes < 1)) throw new Error("Length is invalid. Choose a positive length or None.");
      state.tasks = state.tasks.map((task) => task._id === id ? row : task); notify(); return row;
    },
    complete: async ({ id }) => {
      const current = find(id);
      if (current.status === "completed") return current;
      const row: Task = { ...current, status: "completed", completedAt: Date.now() };
      state.tasks = state.tasks.map((task) => task._id === id ? row : task);
      if (current.repeat && current.date) await create({ ...current, date: nextDate(current.date, current.repeat) });
      notify(); return row;
    },
    reopen: async ({ id }) => {
      const row: Task = { ...find(id), status: "active", completedAt: null };
      state.tasks = state.tasks.map((task) => task._id === id ? row : task); notify(); return row;
    },
    remove: async ({ id }) => { find(id); state.tasks = state.tasks.filter((task) => task._id !== id); notify(); return null; },
    listActive: async () => state.tasks.filter((task) => task.status === "active"),
  };
  const findGoal = (key: string) => {
    const goal = state.goals.find((goal) => goal._id === key);
    if (!goal) throw new Error("Goal was removed. Choose another goal.");
    return goal;
  };
  const goals: GoalTransport = {
    create: async (args) => {
      const stamp = Date.now();
      const row: Goal = { ...args, _id: id<"goals">(`goal-${counter++}`), ownerId: "public-demo", _creationTime: stamp, createdAt: stamp, updatedAt: stamp, note: args.note ?? "", targetDate: args.targetDate ?? null, metric: args.metric ?? { kind: "tasks" }, status: args.status ?? "active", sortOrder: args.sortOrder ?? stamp, linkedTasks: { total: 0, done: 0 }, milestones: [] };
      state.goals = [...state.goals, row]; notify(); return row;
    },
    update: async ({ id, patch }) => {
      const row = { ...findGoal(id), ...patch, updatedAt: Date.now() };
      state.goals = state.goals.map((g) => g._id === id ? row : g); notify(); return row;
    },
    createMilestone: async (args) => {
      const goal = findGoal(args.goalId), stamp = Date.now();
      const row = { ...args, _id: id<"milestones">(`milestone-${counter++}`), ownerId: "public-demo", _creationTime: stamp, createdAt: stamp, updatedAt: stamp, targetDate: args.targetDate ?? null, doneAt: args.doneAt ?? null, sortOrder: args.sortOrder ?? stamp };
      state.goals = state.goals.map((g) => g._id === goal._id ? { ...g, milestones: [...g.milestones, row] } : g); notify(); return row;
    },
    updateMilestone: async ({ id, patch }) => {
      const row = state.goals.flatMap((g) => g.milestones).find((m) => m._id === id);
      if (!row) throw new Error("Milestone was removed. Choose another milestone.");
      const next = { ...row, ...patch };
      state.goals = state.goals.map((g) => ({ ...g, milestones: g.milestones.map((m) => m._id === id ? next : m) })); notify(); return next;
    },
    removeMilestone: async ({ id }) => { state.goals = state.goals.map((g) => ({ ...g, milestones: g.milestones.filter((m) => m._id !== id) })); notify(); return null; },
  };
  return {
    tasks, goals,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => state,
    day: (date: string) => assemble(date, state.tasks.filter((task) => task.date === date), state.events, state.tasks.filter((task) => task.date === null && task.status === "active")),
    week: (date: string) => Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart(date), i), rows = state.tasks.filter((task) => task.date === day), plannedMinutesByArea: Record<string, number> = {};
      for (const task of rows) if (task.status === "active") plannedMinutesByArea[task.areaId] = (plannedMinutesByArea[task.areaId] ?? 0) + (task.durationMinutes ?? 0);
      return { ...assemble(day, rows, state.events, state.tasks.filter((task) => task.date === null && task.status === "active")), plannedMinutesByArea, taskCount: rows.filter((t) => t.status === "active").length };
    }),
  };
}
