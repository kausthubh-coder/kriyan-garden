import { addDays, weekStart } from "@kriyan/core";
import { assemble } from "@kriyan/backend/convex/model/assemble";
import { nextDate } from "@kriyan/backend/convex/model/nextDate";
import { text, date, nullableDate, finite, caps } from "@kriyan/backend/convex/model/shared";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import type { TaskCreate } from "@kriyan/backend/convex/validators";
import type { TaskTransport, GoalTransport } from "../app/dataAccess";
import type { Task } from "../app/types";
import { goalValue, selectGoal } from "../app/goalSelection";
import { seed, id } from "./seed";

/** One store per mounted demo. No network, storage, identity or server writes. */
export function createDemoStore(today: string) {
  let state = seed(today), counter = 0;
  let lastStamp = 0;
  const stamp = () => (lastStamp = Math.max(Date.now(), lastStamp + 1));
  const listeners = new Set<() => void>();
  const notify = () => { state = { ...state }; listeners.forEach((listener) => listener()); };
  const find = (key: string) => {
    const task = state.tasks.find((task) => task._id === key);
    if (!task) throw new Error("Task was removed. Close its details and choose another task.");
    return task;
  };
  const create = async (args: TaskCreate) => {
    if (!args.title.trim()) throw new Error("Task title is empty. Enter a title and try again.");
    const now = stamp();
    const row: Task = { ownerId: "public-demo", _id: id<"tasks">(`added-${counter++}`), _creationTime: now, createdAt: now, updatedAt: now,
      title: args.title.trim(), areaId: args.areaId ?? id<"areas">("life"), projectId: args.projectId ?? null, goalId: args.goalId ?? null,
      date: args.date ?? null, time: args.time ?? null, durationMinutes: args.durationMinutes ?? null, deadline: args.deadline ?? null,
      repeat: args.repeat ?? null, reminders: args.reminders ?? [], notes: args.notes ?? "", sortOrder: args.sortOrder ?? now,
      status: "active", completedAt: null, searchText: args.title.toLowerCase() };
    state.tasks = [...state.tasks, row]; notify(); return row;
  };
  const tasks: TaskTransport = {
    create,
    update: async ({ id, patch }) => {
      const current = find(id);
      const row = { ...current, ...patch, ...(patch.date === null ? { time: null } : {}), updatedAt: stamp() };
      if (!row.title.trim()) throw new Error("Task title is empty. Enter a title and try again.");
      if (row.durationMinutes !== null && (!Number.isFinite(row.durationMinutes) || row.durationMinutes < 1)) throw new Error("Length is invalid. Choose a positive length or None.");
      state.tasks = state.tasks.map((task) => task._id === id ? row : task); notify(); return row;
    },
    complete: async ({ id }) => {
      const current = find(id);
      if (current.status === "completed") return current;
      const now = stamp();
      const row: Task = { ...current, status: "completed", completedAt: now, updatedAt: now };
      state.tasks = state.tasks.map((task) => task._id === id ? row : task);
      if (current.repeat && current.date) await create({ ...current, date: nextDate(current.date, current.repeat) });
      notify(); return row;
    },
    reopen: async ({ id }) => {
      const row: Task = { ...find(id), status: "active", completedAt: null, updatedAt: stamp() };
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
  const requireArea = (areaId: string) => {
    if (!state.areas.some((area) => area._id === areaId)) throw new Error("Area was removed. Choose another area.");
  };
  const cleanGoal = (goal: Doc<"goals">): Doc<"goals"> => {
    requireArea(goal.areaId);
    const metric = goal.metric.kind === "number" ? { ...goal.metric, unit: text(goal.metric.unit, 48, true), target: finite(goal.metric.target), current: finite(goal.metric.current) } : goal.metric;
    return { ...goal, title: text(goal.title, 120, true), note: text(goal.note, 180), startDate: date(goal.startDate), targetDate: nullableDate(goal.targetDate), metric, sortOrder: finite(goal.sortOrder) };
  };
  const cleanMilestone = (row: Doc<"milestones">): Doc<"milestones"> => ({ ...row, title: text(row.title, 180, true), targetDate: nullableDate(row.targetDate), sortOrder: finite(row.sortOrder) });
  const findMilestone = (key: string) => {
    const row = state.goals.flatMap((goal) => goal.milestones).find((row) => row._id === key);
    if (!row) throw new Error("Milestone was removed. Choose another milestone.");
    return row;
  };
  const goals: GoalTransport = {
    create: async (args) => {
      if (state.goals.length >= caps.goals) throw new Error("Limit of 100 goals reached. Remove one before adding another.");
      const now = stamp();
      const row = cleanGoal({ ...args, _id: id<"goals">(`goal-${counter++}`), ownerId: "public-demo", _creationTime: now, createdAt: now, updatedAt: now, note: args.note ?? "", targetDate: args.targetDate ?? null, metric: args.metric ?? { kind: "tasks" }, status: args.status ?? "active", sortOrder: args.sortOrder ?? state.goals.length });
      state.goals = [...state.goals, { ...row, linkedTasks: { total: 0, done: 0 }, milestones: [] }]; notify(); return row;
    },
    update: async ({ id, patch }) => {
      const current = findGoal(id), row = cleanGoal({ ...goalValue(current), ...patch, updatedAt: stamp() });
      state.goals = state.goals.map((g) => g._id === id ? { ...g, ...row } : g); notify(); return row;
    },
    createMilestone: async (args) => {
      const goal = findGoal(args.goalId), now = stamp();
      const row = cleanMilestone({ ...args, _id: id<"milestones">(`milestone-${counter++}`), ownerId: "public-demo", _creationTime: now, createdAt: now, updatedAt: now, targetDate: args.targetDate ?? null, doneAt: args.doneAt ?? null, sortOrder: args.sortOrder ?? 0 });
      state.goals = state.goals.map((g) => g._id === goal._id ? { ...g, milestones: [...g.milestones, row] } : g); notify(); return row;
    },
    updateMilestone: async ({ id, patch }) => {
      const row = findMilestone(id);
      const next = cleanMilestone({ ...row, ...patch, updatedAt: stamp() });
      state.goals = state.goals.map((g) => ({ ...g, milestones: g.milestones.map((m) => m._id === id ? next : m) })); notify(); return next;
    },
    removeMilestone: async ({ id }) => { findMilestone(id); state.goals = state.goals.map((g) => ({ ...g, milestones: g.milestones.filter((m) => m._id !== id) })); notify(); return null; },
    deleteForUndo: async ({ id }) => {
      const current = findGoal(id), linked = state.tasks.filter((task) => task.goalId === id);
      if (linked.length > 5000 || current.milestones.length > 1000) throw new Error("Goal has too many linked records to delete at once. Remove some links and try again.");
      const updatedAt = stamp();
      const snapshot = structuredClone({ goal: goalValue(current), milestones: current.milestones, tasks: linked.map((task) => ({ id: task._id, updatedAt })) });
      state = { ...state, tasks: state.tasks.map((task) => task.goalId === id ? { ...task, goalId: null, updatedAt } : task), goals: state.goals.filter((goal) => goal._id !== id) };
      notify(); return snapshot;
    },
    restore: async ({ snapshot }) => {
      const { goal, milestones, tasks } = snapshot;
      if (goal.ownerId !== "public-demo" || milestones.some((row) => row.ownerId !== "public-demo" || row.goalId !== goal._id)) throw new Error("Deleted goal not found.");
      if (tasks.length > 5000 || milestones.length > 1000) throw new Error("Too many records to restore. Try again with fewer records.");
      if (state.goals.some((row) => row._id === goal._id)) throw new Error("Goal already exists. Refresh your planner.");
      if (state.goals.length >= caps.goals) throw new Error("Limit of 100 goals reached. Remove one before adding another.");
      const now = stamp();
      const restored = cleanGoal({ ...goal, _id: id<"goals">(`goal-${counter++}`), ownerId: "public-demo", _creationTime: now, createdAt: now, updatedAt: now });
      const restoredMilestones = milestones.map((row) => cleanMilestone({ ...row, _id: id<"milestones">(`milestone-${counter++}`), goalId: restored._id, _creationTime: now, createdAt: now, updatedAt: now }));
      for (const reference of tasks) {
        const task = state.tasks.find((row) => row._id === reference.id);
        if (task && task.ownerId !== "public-demo") throw new Error("Linked task not found.");
      }
      const detached = new Map(tasks.map((row) => [row.id, row.updatedAt]));
      state = { ...state, goals: [...state.goals, { ...restored, milestones: restoredMilestones, linkedTasks: { total: 0, done: 0 } }], tasks: state.tasks.map((task) => task.goalId === null && task.updatedAt === detached.get(task._id) ? { ...task, goalId: restored._id, updatedAt: now } : task) };
      notify(); return restored;
    },
  };
  return {
    tasks, goals,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => state,
    selectedGoal: (key: string | null) => selectGoal(key, state.goals),
    day: (date: string) => assemble(date, state.tasks.filter((task) => task.date === date), state.events, state.tasks.filter((task) => task.date === null && task.status === "active")),
    week: (date: string) => Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart(date), i), rows = state.tasks.filter((task) => task.date === day), plannedMinutesByArea: Record<string, number> = {};
      for (const task of rows) if (task.status === "active") plannedMinutesByArea[task.areaId] = (plannedMinutesByArea[task.areaId] ?? 0) + (task.durationMinutes ?? 0);
      return { ...assemble(day, rows, state.events, state.tasks.filter((task) => task.date === null && task.status === "active")), plannedMinutesByArea, taskCount: rows.filter((t) => t.status === "active").length };
    }),
  };
}
