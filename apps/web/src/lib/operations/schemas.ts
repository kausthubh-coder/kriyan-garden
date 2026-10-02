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
export const color = z.enum(["blue", "orange", "green", "red", "yellow", "purple", "teal", "grey"]);
export const eventFields = { title: z.string().trim().min(1).max(180), area: ref.nullable().optional(), location: z.string().max(80).optional(), weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7), startTime: clock, endTime: clock, fromDate: isoDate, untilDate: isoDate.nullable().optional() };
export const habitFields = { title: z.string().trim().min(1).max(180), area: ref, weeklyTarget: z.number().int().min(1).max(7) };
const settingsFields = { timezone: calendar.timezone, dailyCapacityMinutes: z.number().int().min(1).max(1440).optional(), dayStartHour: z.number().min(0).max(24).optional(), dayEndHour: z.number().min(0).max(24).optional() };
const planRef = z.string().trim().min(1).max(60).optional();
const nullableRef = ref.nullable().optional();
export const planFields = {
  dryRun: z.boolean().default(false),
  onExisting: z.enum(["skip", "update"]).default("skip"),
  areas: z.array(z.object({ ref: planRef, name: z.string().trim().min(1).max(48), color: color.optional() }).strict()).max(12).optional(),
  projects: z.array(z.object({ ref: planRef, name: z.string().trim().min(1).max(48), area: ref, kind: z.enum(["project", "course"]).optional(), note: z.string().max(180).optional() }).strict()).max(200).optional(),
  events: z.array(z.object({ ref: planRef, ...eventFields, area: nullableRef }).strict()).max(100).optional(),
  goals: z.array(z.object({ ref: planRef, title: z.string().trim().min(1).max(120), area: ref, note: z.string().max(180).optional(), targetDate: isoDate.nullable().optional(), metric: metric.optional() }).strict()).max(100).optional(),
  tasks: z.array(z.object({ ref: planRef, title: taskFields.title, area: ref.optional(), project: nullableRef, goal: nullableRef, date: taskFields.date, time: taskFields.time, durationMinutes: taskFields.durationMinutes, deadline: taskFields.deadline, repeat: taskFields.repeat, reminders: taskFields.reminders, notes: taskFields.notes }).strict()).max(200).optional(),
  habits: z.array(z.object({ ref: planRef, ...habitFields }).strict()).max(50).optional(),
};
export const schemas = {
  apply_plan: z.object({ ...calendar, ...planFields }).strict(),
  list_events: z.object(calendar).strict(),
  create_event: z.object({ ...calendar, ...eventFields }).strict(),
  update_event: z.object({ ...calendar, ...z.object(eventFields).partial().shape, id: ref }).strict(),
  delete_event: z.object({ ...calendar, id: ref }).strict(),
  list_habits: z.object(calendar).strict(),
  create_habit: z.object({ ...calendar, ...habitFields }).strict(),
  update_habit: z.object({ ...calendar, ...z.object(habitFields).partial().shape, id: ref, archived: z.boolean().optional() }).strict(),
  delete_habit: z.object({ ...calendar, id: ref }).strict(),
  log_habit: z.object({ ...calendar, habit: ref, date: isoDate.optional(), done: z.boolean().default(true) }).strict(),
  create_area: z.object({ ...calendar, name: z.string().trim().min(1).max(48), color: color.optional() }).strict(),
  update_area: z.object({ ...calendar, id: ref, name: z.string().trim().min(1).max(48).optional(), color: color.optional() }).strict(),
  delete_area: z.object({ ...calendar, id: ref }).strict(),
  reorder_areas: z.object({ ...calendar, areas: z.array(ref).max(12) }).strict(),
  delete_project: z.object({ ...calendar, id: ref }).strict(),
  delete_task: z.object({ ...calendar, id: ref }).strict(),
  delete_goal: z.object({ ...calendar, id: ref }).strict(),
  update_milestone: z.object({ ...calendar, id: ref, title: z.string().trim().min(1).max(180).optional(), targetDate: isoDate.nullable().optional() }).strict(),
  delete_milestone: z.object({ ...calendar, id: ref }).strict(),
  get_settings: z.object(calendar).strict(),
  update_settings: z.object({ today: calendar.today, ...settingsFields }).strict(),
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
  update_project: z.object({ ...calendar, id: ref, name: z.string().trim().min(1).max(48).optional(), note: z.string().max(180).optional(), area: ref.optional(), kind: z.enum(["project", "course"]).optional(), archived: z.boolean().optional() }).strict(),
};
