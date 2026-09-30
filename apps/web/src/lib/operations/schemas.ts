import { z } from "zod";
import { addDays } from "@kriyan/core";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").refine(value => addDays(value, 0) === value, "Use a valid calendar date.");
export const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM.");
export const ref = z.string().trim().min(1).max(200);
export const calendar = {
  today: isoDate.optional(),
  timezone: z.string().max(100).refine(value => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
  }, "Use an IANA timezone such as America/New_York.").optional(),
};
export const repeat = z.object({ every: z.number().int().min(1).max(1000), unit: z.enum(["day", "week", "month", "year"]), weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional() }).strict();
export const reminder = z.discriminatedUnion("type", [
  z.object({ type: z.literal("at_start") }).strict(),
  z.object({ type: z.literal("before"), minutes: z.number().int().min(1).max(10080) }).strict(),
  z.object({ type: z.literal("morning_of") }).strict(),
  z.object({ type: z.literal("day_before") }).strict(),
  z.object({ type: z.literal("at_time"), time: clock }).strict(),
]);
export const taskFields = {
  title: z.string().trim().min(1).max(180), area: ref.optional(), areaId: ref.optional(),
  project: ref.nullable().optional(), projectId: ref.nullable().optional(), goal: ref.nullable().optional(), goalId: ref.nullable().optional(),
  date: isoDate.nullable().optional(), time: clock.nullable().optional(), durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  deadline: isoDate.nullable().optional(), repeat: repeat.nullable().optional(), reminders: z.array(reminder).max(8).optional(), notes: z.string().max(100000).optional(),
};
export const taskPatch = z.object(taskFields).partial();
export const metric = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("tasks") }).strict(), z.object({ kind: z.literal("milestones") }).strict(),
  z.object({ kind: z.literal("number"), unit: z.string().trim().min(1).max(48), target: z.number().positive(), current: z.number().nonnegative() }).strict(),
]);
export const goalFields = { title: z.string().trim().min(1).max(120), area: ref.optional(), areaId: ref.optional(), note: z.string().max(180).optional(), targetDate: isoDate.nullable().optional(), startDate: isoDate.optional(), metric: metric.optional(), status: z.enum(["active", "done", "archived"]).optional() };
export const filters = {
  area: ref.optional(), areaId: ref.optional(), project: ref.optional(), projectId: ref.optional(), goal: ref.optional(), goalId: ref.optional(),
  status: z.enum(["active", "completed", "all"]).default("active"), dateFrom: isoDate.optional(), dateTo: isoDate.optional(),
  deadlineFrom: isoDate.optional(), deadlineTo: isoDate.optional(), text: z.string().trim().min(1).max(200).optional(),
  due: z.enum(["today", "week", "overdue"]).optional(), limit: z.number().int().min(1).max(100).default(100),
};
export const schemas = {
  me: z.object(calendar).strict(), get_overview: z.object(calendar).strict(),
  get_day: z.object({ ...calendar, date: isoDate.optional() }).strict(), get_week: z.object({ ...calendar, start: isoDate.optional() }).strict(),
  list_tasks: z.object({ ...calendar, ...filters }).strict(), get_task: z.object({ ...calendar, id: ref }).strict(),
  quick_add: z.object({ ...calendar, text: z.string().trim().min(1).max(1000) }).strict(),
  create_task: z.object({ ...calendar, ...taskFields }).strict(), update_task: z.object({ ...calendar, ...taskPatch.shape, id: ref }).strict(),
  complete_task: z.object({ ...calendar, id: ref, completed: z.boolean().default(true) }).strict(),
  move_task: z.object({ ...calendar, id: ref, date: isoDate.nullable(), time: clock.nullable().optional() }).strict(),
  search: z.object({ ...calendar, query: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(100).default(20) }).strict(),
  list_goals: z.object({ ...calendar, status: z.enum(["active", "done", "archived", "all"]).default("active"), area: ref.optional(), areaId: ref.optional() }).strict(),
  get_goal: z.object({ ...calendar, id: ref }).strict(), create_goal: z.object({ ...calendar, ...goalFields }).strict(),
  update_goal: z.object({ ...calendar, ...z.object(goalFields).partial().shape, id: ref }).strict(),
  set_goal_progress: z.object({ ...calendar, id: ref, current: z.number().nonnegative() }).strict(),
  add_milestone: z.object({ ...calendar, goal: ref.optional(), goalId: ref.optional(), title: z.string().trim().min(1).max(180), targetDate: isoDate.nullable().optional() }).strict(),
  complete_milestone: z.object({ ...calendar, id: ref, completed: z.boolean().default(true) }).strict(),
  list_spaces: z.object(calendar).strict(),
  create_project: z.object({ ...calendar, name: z.string().trim().min(1).max(48), area: ref.optional(), areaId: ref.optional(), kind: z.enum(["project", "course"]).default("project"), note: z.string().max(180).optional() }).strict(),
  update_project: z.object({ ...calendar, id: ref, name: z.string().trim().min(1).max(48).optional(), note: z.string().max(180).optional() }).strict(),
};
