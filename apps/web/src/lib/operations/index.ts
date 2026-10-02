import { z } from "zod";
import { randomUUID } from "node:crypto";
import { addDays, goalProgress, localClock, weekStart, deadlineCapacity, relativeDay, repeatText, remindersValue, eventValue, countText } from "@kriyan/core";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc, Id } from "@kriyan/backend/convex/_generated/dataModel";
import type { PlanResult, TaskPatch } from "@kriyan/backend/convex/validators";
import { serviceCall, type ServiceInvocation } from "../service-client";
import { OperationError } from "./errors";
import { schemas } from "./schemas";

export type Caller = { userId: string };
type Context = Awaited<ReturnType<typeof loadContext>>;
async function loadContext(userId: string, input: { today?: string; timezone?: string }, invocation: ServiceInvocation) {
  const call: typeof serviceCall = (ref, owner, operation, payload) => serviceCall(ref, owner, operation, payload, invocation);
  const stored = await call(api.service.plannerContext, userId, "planner.context", {});
  const timezone = input.timezone ?? stored.profile?.timezone;
  if (!timezone) throw new OperationError("TIMEZONE_REQUIRED", "Set a profile timezone or pass timezone with this request.");
  return { ...stored, call, userId, timezone, today: input.today ?? localClock(new Date(), timezone).today };
}
function operation<S extends z.ZodObject>(schema: S, flags: boolean | { write: boolean; destructive?: boolean; idempotent?: boolean }, description: string, handler: (input: z.output<S>, context: Context) => Promise<Record<string, unknown>>) {
  const { write, destructive = false, idempotent = !write } = typeof flags === "boolean" ? { write: flags } : flags;
  return {
    schema, write, description, annotations: { readOnlyHint: !write, destructiveHint: destructive, idempotentHint: idempotent, openWorldHint: false },
    async execute(input: unknown, caller: Caller): Promise<Record<string, unknown> & { today: string; timezone: string }> {
      if (!caller.userId.startsWith("user_")) throw new OperationError("FORBIDDEN", "Use a token owned by a user account.", 403);
      const parsed = schema.parse(input);
      const context = await loadContext(caller.userId, parsed, { id: randomUUID(), kind: write ? "write" : "read" });
      return { ...await handler(parsed, context), today: context.today, timezone: context.timezone };
    },
  };
}
const identify = <T extends { _id: string; ownerId: string; searchText?: string }>(row: T) => {
  const { ownerId, searchText, ...publicRow } = row;
  void [ownerId, searchText];
  return { ...publicRow, id: row._id };
};
function alias(name: string, first?: string | null, second?: string | null) {
  if (first !== undefined && second !== undefined && first !== second) throw new OperationError("INVALID_INPUT", `Supply one ${name} reference and try again.`);
  return first !== undefined ? first : second;
}
export function resolveReference<T extends { _id: string; name: string; path?: string }>(rows: readonly T[], reference: string, kind: string): T {
  const id = rows.find(row => row._id === reference);
  if (id) return id;
  const key = reference.trim().toLocaleLowerCase();
  const matches = rows.filter(row => row.name.trim().toLocaleLowerCase() === key || row.path?.trim().toLocaleLowerCase() === key);
  if (matches.length > 1) throw new OperationError("AMBIGUOUS", `More than one ${kind} matches. Choose an ID from the candidates.`, 409, matches.map(row => ({ id: row._id, name: row.name, ...(row.path ? { path: row.path } : {}) })));
  const match = matches[0];
  if (!match) throw new OperationError("NOT_FOUND", `${kind.charAt(0).toUpperCase() + kind.slice(1)} not found. Read the list and choose a name or ID.`, 404);
  return match;
}
const allProjectRows = (context: Context) => context.projects.map(row => ({ ...row, path: `${context.areas.find(area => area._id === row.areaId)?.name ?? "Area"} / ${row.name}` }));
const projectRows = (context: Context) => allProjectRows(context).filter(row => row.archivedAt === null);
const areaRef = (context: Context, reference?: string | null) => reference ? resolveReference(context.areas, reference, "area")._id : undefined;
const projectRef = (context: Context, reference?: string | null, areaId?: Id<"areas">) => reference === null ? null : reference ? resolveReference(projectRows(context).filter(row => !areaId || row.areaId === areaId), reference, "project")._id : undefined;
async function goalRef(context: Context, reference?: string | null) {
  if (reference === undefined || reference === null) return reference;
  const goals = await context.call(api.service.goalsList, context.userId, "goals.list", {});
  return resolveReference(goals.map(row => ({ ...row, name: row.title })), reference, "goal")._id;
}
async function taskPatch(input: z.output<typeof schemas.update_task> | z.output<typeof schemas.create_task>, context: Context): Promise<TaskPatch> {
  const { area, areaId: rawAreaId, project, projectId: rawProjectId, goal, goalId: rawGoalId, today, timezone, ...fields } = input;
  void [today, timezone];
  const areaId = areaRef(context, alias("area", area, rawAreaId));
  const projectId = projectRef(context, alias("project", project, rawProjectId), areaId);
  const goalId = await goalRef(context, alias("goal", goal, rawGoalId));
  const result = { ...fields, ...(areaId ? { areaId } : {}), ...(projectId !== undefined ? { projectId } : {}), ...(goalId !== undefined ? { goalId } : {}) };
  // The tool ID is not part of the backend patch.
  const { id, ...patch } = { id: undefined, ...result };
  void id;
  return patch;
}
const line = (value: string) => value.replace(/\s+/g, " ").trim();
function taskReadBack(task: Doc<"tasks">, context: Context, verb: string) {
  const area = context.areas.find(row => row._id === task.areaId)?.name ?? "Area";
  const project = context.projects.find(row => row._id === task.projectId)?.name;
  const parts = [`${verb} task "${line(task.title)}" in ${line(area)}${project ? ` / ${line(project)}` : ""}`, task.date ? `scheduled for ${relativeDay(task.date, context.today)}${task.time ? ` at ${task.time}` : " at any time"}` : "with no planned date"];
  if (task.durationMinutes !== null) parts.push(`length ${task.durationMinutes} minutes`);
  if (task.deadline) parts.push(`deadline ${relativeDay(task.deadline, context.today)}`);
  if (task.repeat) parts.push(`repeating ${repeatText(task.repeat).toLocaleLowerCase()}`);
  if (task.reminders.length) parts.push(`reminders: ${remindersValue(task.reminders).toLocaleLowerCase()}`);
  return `${parts.join("; ")}.`;
}
const taskWrite = (task: Doc<"tasks">, context: Context, verb: string) => ({ ok: true, id: task._id, task: identify(task), readBack: taskReadBack(task, context, verb) });
const capacity = (context: Context) => context.profile?.dailyCapacityMinutes ?? 360;
const rowWrite = <T extends { _id: string; ownerId: string }>(kind: string, row: T, readBack: string) => ({ ok: true, id: row._id, [kind]: identify(row), readBack });
const plannerSettings = ({ timezone, dailyCapacityMinutes, dayStartHour, dayEndHour }: Doc<"profiles">) => ({ timezone, dailyCapacityMinutes, dayStartHour, dayEndHour });
async function eventRef(ctx: Context, reference: string) {
  return resolveReference((await ctx.call(api.service.eventsList, ctx.userId, "events.list", {})).map(row => ({ ...row, name: row.title })), reference, "event");
}
async function habitRef(ctx: Context, reference: string) {
  return resolveReference((await ctx.call(api.service.habitsList, ctx.userId, "habits.list", {})).map(row => ({ ...row, name: row.title })), reference, "habit");
}
async function milestoneRef(ctx: Context, reference: string) {
  return resolveReference((await ctx.call(api.service.goalsList, ctx.userId, "goals.list", {})).flatMap(goal => goal.milestones.map(row => ({ ...row, name: row.title, path: `${goal.title} / ${row.title}` }))), reference, "milestone");
}
async function dayView(context: Context, date: string) {
  const day = await context.call(api.service.dayGet, context.userId, "day.get", { date });
  return { ...day, timed: day.timed.map(identify), anytime: day.anytime.map(identify), unscheduled: day.unscheduled.map(identify), events: day.events.map(identify), capacityMinutes: capacity(context), freeMinutes: Math.max(0, capacity(context) - day.plannedMinutes) };
}
async function goalRows(context: Context) {
  const goals = await context.call(api.service.goalsList, context.userId, "goals.list", {});
  return goals.map(goal => ({ ...identify(goal), progress: goalProgress(goal, context.today), milestones: goal.milestones.map(identify) }));
}

const planNouns = { area: ["area", "areas"], project: ["project", "projects"], course: ["course", "courses"], event: ["schedule block", "schedule blocks"], goal: ["goal", "goals"], task: ["task", "tasks"], habit: ["habit", "habits"] } as const;
const planVerbs = { created: "Added", would_create: "Would add", updated: "Updated", would_update: "Would update", exists: "Already in Kriyan:" } as const;
function joinCounts(parts: readonly string[]) { return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`; }
/** "Added 3 courses, 6 schedule blocks and 4 tasks. Already in Kriyan: 2 tasks." */
function planReadBack(result: PlanResult, input: z.output<typeof schemas.apply_plan>) {
  const sentences = (Object.keys(planVerbs) as (keyof typeof planVerbs)[]).flatMap(status => {
    const counts = new Map<keyof typeof planNouns, number>();
    for (const item of result.items.filter(row => row.status === status)) {
      const noun = item.kind === "project" && input.projects?.[item.index]?.kind === "course" ? "course" : item.kind;
      counts.set(noun, (counts.get(noun) ?? 0) + 1);
    }
    const parts = [...counts].map(([noun, count]) => countText(count, planNouns[noun][0], planNouns[noun][1]));
    return parts.length ? [`${planVerbs[status]} ${joinCounts(parts)}.`] : [];
  });
  if (result.dryRun) sentences.push("Nothing is saved yet. Apply the same plan without dryRun to save it.");
  return sentences.join(" ");
}

export const operations = {
  apply_plan: operation(schemas.apply_plan, { write: true, idempotent: true }, "Set up or refresh many things in one call: areas, courses and projects, class times and other fixed weekly blocks, goals, tasks and habits. Use it to organise someone's life from their syllabi, assignment lists and project notes. Items can point at each other with ref. Anything already stored is reported as exists, never duplicated, so the same plan can be applied again. Run it with dryRun: true first, show the person the summary, and apply only after they agree. All writes are saved together or not at all; at most 200 items per call.", async (input, ctx) => {
    const { today, timezone, ...plan } = input; void [today, timezone];
    const result = await ctx.call(api.service.planApply, ctx.userId, "planner.apply", { ...plan, today: ctx.today });
    return { ok: true, ...result, readBack: planReadBack(result, input) };
  }),
  // Account deletion, reset all, sample data, onboarding and push tokens are deliberately not exposed.
  list_events: operation(schemas.list_events, false, "Read the class schedule and other fixed weekly blocks before arranging work around them.", async (_input, ctx) => ({ events: (await ctx.call(api.service.eventsList, ctx.userId, "events.list", {})).map(row => ({ ...identify(row), area: ctx.areas.find(area => area._id === row.areaId)?.name ?? null })) })),
  create_event: operation(schemas.create_event, true, "Add a class, lecture, lab, shift or other block that repeats on fixed weekdays at fixed times. Use tasks for homework and to-dos.", async (input, ctx) => {
    const { today, timezone, area, ...fields } = input; void [today, timezone];
    const event = await ctx.call(api.service.eventsCreate, ctx.userId, "events.create", { ...fields, areaId: areaRef(ctx, area) ?? null });
    return rowWrite("event", event, `Added "${line(event.title)}" to the schedule: ${eventValue(event)}.`);
  }),
  update_event: operation(schemas.update_event, { write: true, destructive: true, idempotent: true }, "Change a class time or fixed weekly block; omitted fields keep their values and null clears its area or end date.", async (input, ctx) => {
    const current = await eventRef(ctx, input.id);
    const { id, today, timezone, area, ...patch } = input; void [id, today, timezone];
    const event = await ctx.call(api.service.eventsUpdate, ctx.userId, "events.update", { id: current._id, patch: { ...patch, ...(area !== undefined ? { areaId: areaRef(ctx, area) ?? null } : {}) } });
    return rowWrite("event", event, `Updated "${line(event.title)}" in the schedule: ${eventValue(event)}.`);
  }),
  delete_event: operation(schemas.delete_event, { write: true, destructive: true }, "Remove a class time or fixed weekly block that no longer belongs in the schedule.", async (input, ctx) => {
    const event = await eventRef(ctx, input.id); await ctx.call(api.service.eventsRemove, ctx.userId, "events.remove", { id: event._id });
    return rowWrite("event", event, `Deleted "${line(event.title)}" from the schedule.`);
  }),
  list_habits: operation(schemas.list_habits, false, "Review routines, weekly targets and this week's logged dates, including archived habits.", async (_input, ctx) => {
    const start = weekStart(ctx.today), end = addDays(start, 6);
    const habits = await ctx.call(api.service.habitsList, ctx.userId, "habits.list", {});
    return { weekStart: start, habits: await Promise.all(habits.map(async habit => ({ ...identify(habit), area: ctx.areas.find(area => area._id === habit.areaId)?.name, loggedDates: (await ctx.call(api.service.habitsListLogs, ctx.userId, "habits.listLogs", { habitId: habit._id })).filter(log => log.date >= start && log.date <= end).map(log => log.date) }))) };
  }),
  create_habit: operation(schemas.create_habit, true, "Add a routine with a weekly target of 1 to 7 days. Use repeating tasks when a routine needs a planned time.", async (input, ctx) => {
    const habit = await ctx.call(api.service.habitsCreate, ctx.userId, "habits.create", { title: input.title, areaId: resolveReference(ctx.areas, input.area, "area")._id, weeklyTarget: input.weeklyTarget });
    return rowWrite("habit", habit, `Added habit "${line(habit.title)}" with a target of ${habit.weeklyTarget} days per week.`);
  }),
  update_habit: operation(schemas.update_habit, { write: true, destructive: true, idempotent: true }, "Change a routine's title, area or weekly target, or archive or unarchive it while keeping logs.", async (input, ctx) => {
    const current = await habitRef(ctx, input.id);
    const { id, today, timezone, area, archived, ...patch } = input; void [id, today, timezone];
    const habit = await ctx.call(api.service.habitsUpdate, ctx.userId, "habits.update", { id: current._id, patch: { ...patch, ...(area ? { areaId: areaRef(ctx, area) } : {}), ...(archived !== undefined ? { archivedAt: archived ? current.archivedAt ?? Date.now() : null } : {}) } });
    return rowWrite("habit", habit, `Updated habit "${line(habit.title)}"${habit.archivedAt === null ? "" : "; archived"}.`);
  }),
  delete_habit: operation(schemas.delete_habit, { write: true, destructive: true }, "Remove an unused routine. Archive a habit with logs to preserve its history.", async (input, ctx) => {
    const habit = await habitRef(ctx, input.id); await ctx.call(api.service.habitsRemove, ctx.userId, "habits.remove", { id: habit._id });
    return rowWrite("habit", habit, `Deleted habit "${line(habit.title)}".`);
  }),
  log_habit: operation(schemas.log_habit, { write: true, destructive: true, idempotent: true }, "Mark a routine done on a date (today by default), or remove that date's log with done: false.", async (input, ctx) => {
    const habit = await habitRef(ctx, input.habit), date = input.date ?? ctx.today;
    if (input.done) await ctx.call(api.service.habitsLog, ctx.userId, "habits.log", { habitId: habit._id, date });
    else {
      const logs = await ctx.call(api.service.habitsListLogs, ctx.userId, "habits.listLogs", { habitId: habit._id });
      for (const log of logs.filter(row => row.date === date)) await ctx.call(api.service.habitsRemoveLog, ctx.userId, "habits.removeLog", { id: log._id });
    }
    return rowWrite("habit", habit, `${input.done ? "Logged" : "Removed log for"} habit "${line(habit.title)}" on ${relativeDay(date, ctx.today)}.`);
  }),
  create_area: operation(schemas.create_area, true, "Add one of the person's own areas to organise related projects, tasks and routines.", async (input, ctx) => {
    const area = await ctx.call(api.service.areasCreate, ctx.userId, "areas.create", { name: input.name, ...(input.color ? { color: input.color } : {}) });
    return rowWrite("area", area, `Added area "${line(area.name)}".`);
  }),
  update_area: operation(schemas.update_area, { write: true, destructive: true, idempotent: true }, "Rename an area or change its named colour to match the person's organisation.", async (input, ctx) => {
    const id = resolveReference(ctx.areas, input.id, "area")._id;
    const area = await ctx.call(api.service.areasUpdate, ctx.userId, "areas.update", { id, patch: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.color !== undefined ? { color: input.color } : {}) } });
    return rowWrite("area", area, `Updated area "${line(area.name)}".`);
  }),
  delete_area: operation(schemas.delete_area, { write: true, destructive: true }, "Remove an empty area after moving or removing all its linked records.", async (input, ctx) => {
    const area = resolveReference(ctx.areas, input.id, "area"); await ctx.call(api.service.areasRemove, ctx.userId, "areas.remove", { id: area._id });
    return rowWrite("area", area, `Deleted area "${line(area.name)}".`);
  }),
  reorder_areas: operation(schemas.reorder_areas, { write: true, destructive: true, idempotent: true }, "Set the display order of all areas; supply each current area exactly once by name or ID.", async (input, ctx) => {
    const rows = input.areas.map(reference => resolveReference(ctx.areas, reference, "area"));
    await ctx.call(api.service.areasReorder, ctx.userId, "areas.reorder", { ids: rows.map(row => row._id) });
    return { ok: true, id: ctx.userId, areas: rows.map((row, sortOrder) => identify({ ...row, sortOrder })), readBack: `Areas now appear in this order: ${rows.map(row => line(row.name)).join(", ")}.` };
  }),
  delete_project: operation(schemas.delete_project, { write: true, destructive: true }, "Remove a project or course after unlinking its tasks.", async (input, ctx) => {
    const project = resolveReference(allProjectRows(ctx), input.id, "project"); await ctx.call(api.service.projectsRemove, ctx.userId, "projects.remove", { id: project._id });
    return rowWrite("project", project, `Deleted ${project.kind} "${line(project.name)}".`);
  }),
  delete_task: operation(schemas.delete_task, { write: true, destructive: true }, "Permanently remove a task that is no longer needed, cancelling its reminders.", async (input, ctx) => {
    const task = resolveReference((await ctx.call(api.service.tasksList, ctx.userId, "tasks.list", {})).map(row => ({ ...row, name: row.title })), input.id, "task");
    await ctx.call(api.service.tasksRemove, ctx.userId, "tasks.remove", { id: task._id }); return taskWrite(task, ctx, "Deleted");
  }),
  delete_goal: operation(schemas.delete_goal, { write: true, destructive: true }, "Remove an unused goal after removing its task and milestone links.", async (input, ctx) => {
    const goal = resolveReference((await ctx.call(api.service.goalsList, ctx.userId, "goals.list", {})).map(row => ({ ...row, name: row.title })), input.id, "goal");
    await ctx.call(api.service.goalsRemove, ctx.userId, "goals.remove", { id: goal._id }); return rowWrite("goal", goal, `Deleted goal "${line(goal.title)}".`);
  }),
  update_milestone: operation(schemas.update_milestone, { write: true, destructive: true, idempotent: true }, "Rename a goal milestone or change or clear its target date.", async (input, ctx) => {
    const current = await milestoneRef(ctx, input.id);
    const milestone = await ctx.call(api.service.goalsUpdateMilestone, ctx.userId, "goals.updateMilestone", { id: current._id, patch: { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}) } });
    return rowWrite("milestone", milestone, `Updated milestone "${line(milestone.title)}"${milestone.targetDate ? ` with target date ${relativeDay(milestone.targetDate, ctx.today)}` : " with no target date"}.`);
  }),
  delete_milestone: operation(schemas.delete_milestone, { write: true, destructive: true }, "Remove a goal milestone that is no longer part of the goal.", async (input, ctx) => {
    const milestone = await milestoneRef(ctx, input.id); await ctx.call(api.service.goalsRemoveMilestone, ctx.userId, "goals.removeMilestone", { id: milestone._id });
    return rowWrite("milestone", milestone, `Deleted milestone "${line(milestone.title)}".`);
  }),
  get_settings: operation(schemas.get_settings, false, "Read timezone, daily capacity and day hours before proposing a realistic schedule.", async (_input, ctx) => {
    const profile = await ctx.call(api.service.profilesGet, ctx.userId, "profiles.get", {}); return { settings: profile ? plannerSettings(profile) : null };
  }),
  update_settings: operation(schemas.update_settings, { write: true, destructive: true, idempotent: true }, "Change planner timezone, daily capacity or day hours when the person asks to adjust their schedule preferences.", async (input, ctx) => {
    const { today, ...patch } = input; void today;
    const profile = await ctx.call(api.service.profilesUpdate, ctx.userId, "profiles.update", { patch });
    return { ok: true, id: profile._id, settings: plannerSettings(profile), readBack: `Planner uses ${profile.timezone}, ${profile.dailyCapacityMinutes} minutes of daily capacity and the saved day hours.` };
  }),
  me: operation(schemas.me, false, "Read the caller's profile and local calendar.", async (_input, ctx) => ({ userId: ctx.userId, profile: ctx.profile ? identify(ctx.profile) : null })),
  get_overview: operation(schemas.get_overview, false, "Start here: user-defined areas, projects, courses, active goals and today's summary. Use the person's area names and never assume the defaults.", async (_input, ctx) => {
    const [day, goals] = await Promise.all([dayView(ctx, ctx.today), goalRows(ctx)]);
    const count = [...day.timed, ...day.anytime].filter(task => task.status === "active").length;
    return { areas: ctx.areas.map(identify), projects: projectRows(ctx).map(identify), goals: goals.filter(goal => goal.status === "active"), summary: `${count} active tasks today, ${day.plannedMinutes} minutes planned, ${day.freeMinutes} minutes free.`, day };
  }),
  get_day: operation(schemas.get_day, false, "Read one day: timed tasks, any-time tasks, class times and other schedule blocks, unscheduled tasks, and free minutes against capacity. Use before planning or moving work on that day.", (input, ctx) => dayView(ctx, input.date ?? ctx.today)),
  get_week: operation(schemas.get_week, false, "Read a week of daily load by area and the next 14 days of deadlines, with time needed against time free. Use for weekly planning and to spot overload.", async (input, ctx) => {
    const startDate = input.start ?? weekStart(ctx.today);
    const [days, deadlineDays, followingDays, deadlines] = await Promise.all([
      ctx.call(api.service.weekGet, ctx.userId, "week.get", { startDate }),
      ctx.call(api.service.weekGet, ctx.userId, "week.get", { startDate: ctx.today }),
      ctx.call(api.service.weekGet, ctx.userId, "week.get", { startDate: addDays(ctx.today, 7) }),
      ctx.call(api.service.tasksFilteredList, ctx.userId, "tasks.filteredList", { status: "active", deadlineFrom: ctx.today, deadlineTo: addDays(ctx.today, 13), limit: 100 }),
    ]);
    const planned = [...deadlineDays, ...followingDays].flatMap(day => [...day.timed, ...day.anytime]);
    return { start: startDate, days: days.map(day => ({ ...day, timed: day.timed.map(identify), anytime: day.anytime.map(identify), unscheduled: day.unscheduled.map(identify), events: day.events.map(identify), capacityMinutes: capacity(ctx), freeMinutes: Math.max(0, capacity(ctx) - day.plannedMinutes) })), deadlines: deadlines.map(task => ({ ...identify(task), timeNeededMinutes: task.durationMinutes, timeFreeMinutes: task.deadline ? deadlineCapacity(ctx.today, task.deadline, capacity(ctx), planned) : 0 })), deadlinesMayHaveMore: deadlines.length === 100 };
  }),
  list_tasks: operation(schemas.list_tasks, false, "List up to 100 tasks filtered by area, project, goal, status, planned dates, deadlines, due (today, week, overdue) or title text. Use to check what exists before adding or changing tasks.", async (input, ctx) => {
    const { area, areaId: rawArea, project, projectId: rawProject, goal, goalId: rawGoal, today, timezone, due, status, ...filters } = input;
    void [today, timezone];
    const areaId = areaRef(ctx, alias("area", area, rawArea));
    const projectId = projectRef(ctx, alias("project", project, rawProject), areaId);
    const goalId = await goalRef(ctx, alias("goal", goal, rawGoal));
    const dueRange = due === "today" ? { deadlineFrom: ctx.today, deadlineTo: ctx.today } : due === "week" ? { deadlineFrom: weekStart(ctx.today), deadlineTo: addDays(weekStart(ctx.today), 6) } : due === "overdue" ? { deadlineTo: addDays(ctx.today, -1) } : {};
    if (due && (input.deadlineFrom || input.deadlineTo)) throw new OperationError("INVALID_INPUT", "Use due or a deadline range, then try again.");
    if (input.dateFrom && input.dateTo && input.dateFrom > input.dateTo || input.deadlineFrom && input.deadlineTo && input.deadlineFrom > input.deadlineTo) throw new OperationError("INVALID_INPUT", "Put the range start before its end.");
    const tasks = await ctx.call(api.service.tasksFilteredList, ctx.userId, "tasks.filteredList", { ...filters, ...dueRange, ...(status === "all" ? {} : { status }), ...(areaId ? { areaId } : {}), ...(projectId ? { projectId } : {}), ...(goalId ? { goalId } : {}) });
    return { tasks: tasks.map(task => ({ ...identify(task), area: ctx.areas.find(area => area._id === task.areaId)?.name ?? "Area" })), mayHaveMore: tasks.length === input.limit };
  }),
  get_task: operation(schemas.get_task, false, "Read one task including its notes, repeat and reminders.", async (input, ctx) => ({ task: identify(await ctx.call(api.service.tasksGet, ctx.userId, "tasks.get", { id: input.id as Id<"tasks"> })) })),
  quick_add: operation(schemas.quick_add, true, "Add one task from the same short text a person types in the app, such as \"Essay draft fri 14:00 #school\". Prefer create_task when you already have structured fields.", async (input, ctx) => {
    // Reject ambiguous tags before the shared parser can select the first match.
    for (const match of input.text.matchAll(/(?:^|\s)#([\w-]+)/g)) {
      const tag = match[1].toLocaleLowerCase();
      const areas = ctx.areas.filter(row => row._id.startsWith(tag) || row.name.toLocaleLowerCase().startsWith(tag));
      const projects = projectRows(ctx).filter(row => row._id.startsWith(tag) || row.name.toLocaleLowerCase().replace(/\s/g, "").startsWith(tag));
      const candidates = [...areas, ...projects];
      if (candidates.length > 1) throw new OperationError("AMBIGUOUS", `The #${tag} tag matches several spaces. Choose a unique name or ID.`, 409, candidates.map(row => ({ id: row._id, name: row.name })));
    }
    const task = await ctx.call(api.service.tasksQuickAdd, ctx.userId, "tasks.quickAdd", { text: input.text, today: ctx.today });
    const { title, areaId, projectId, date, time, durationMinutes } = task;
    return { ...taskWrite(task, ctx, "Added"), parsed: { title, areaId, projectId, date, time, durationMinutes } };
  }),
  create_task: operation(schemas.create_task, true, "Add one task: homework, a to-do, an errand or a deliverable. date is the day it is planned for; deadline is when it is due; both are optional, as is its length, so never invent them. repeat makes it recur ({ every, unit, weekdays } with Sunday=0 to Saturday=6; a repeating task needs a date). reminders need a date, and at_start or before need a time. For many items at once use apply_plan.", async (input, ctx) => {
    const fields = await taskPatch(input, ctx);
    const task = await ctx.call(api.service.tasksCreate, ctx.userId, "tasks.create", { ...fields, title: input.title });
    return taskWrite(task, ctx, "Added");
  }),
  update_task: operation(schemas.update_task, { write: true, destructive: true, idempotent: true }, "Change a task. Omitted fields keep their values; null clears an optional value such as date, deadline, repeat or project.", async (input, ctx) => taskWrite(await ctx.call(api.service.tasksUpdate, ctx.userId, "tasks.update", { id: input.id as Id<"tasks">, patch: await taskPatch(input, ctx) }), ctx, "Updated")),
  complete_task: operation(schemas.complete_task, { write: true, destructive: true, idempotent: true }, "Mark a task done, or reopen it with completed: false. Completing a repeating task creates its next occurrence and names it in the readBack.", async (input, ctx) => {
    if (!input.completed) return taskWrite(await ctx.call(api.service.tasksReopen, ctx.userId, "tasks.reopen", { id: input.id as Id<"tasks"> }), ctx, "Reopened");
    const result = await ctx.call(api.service.tasksCompleteWithNext, ctx.userId, "tasks.completeWithNext", { id: input.id as Id<"tasks"> });
    return { ...taskWrite(result.task, ctx, "Completed"), nextOccurrence: result.nextOccurrence ? identify(result.nextOccurrence) : null, readBack: result.nextOccurrence ? `${taskReadBack(result.task, ctx, "Completed").slice(0, -1)}; next occurrence "${line(result.nextOccurrence.title)}" is scheduled for ${result.nextOccurrence.date ? relativeDay(result.nextOccurrence.date, ctx.today) : "no date"}${result.nextOccurrence.time ? ` at ${result.nextOccurrence.time}` : ""}.` : taskReadBack(result.task, ctx, "Completed") };
  }),
  move_task: operation(schemas.move_task, { write: true, destructive: true, idempotent: true }, "Reschedule a task to another day or time (or date: null to unschedule it) without touching anything else.", async (input, ctx) => taskWrite(await ctx.call(api.service.tasksUpdate, ctx.userId, "tasks.update", { id: input.id as Id<"tasks">, patch: { date: input.date, ...(input.time !== undefined ? { time: input.time } : {}) } }), ctx, "Moved")),
  search: operation(schemas.search, false, "Find active tasks by words in their title or notes.", async (input, ctx) => ({ tasks: (await ctx.call(api.service.tasksSearch, ctx.userId, "tasks.search", { query: input.query, limit: input.limit })).map(identify) })),
  list_goals: operation(schemas.list_goals, false, "Read goals with progress, pace, linked task counts and milestones.", async (input, ctx) => {
    const areaId = areaRef(ctx, alias("area", input.area, input.areaId));
    return { goals: (await goalRows(ctx)).filter(goal => (input.status === "all" || goal.status === input.status) && (!areaId || goal.areaId === areaId)) };
  }),
  get_goal: operation(schemas.get_goal, false, "Read one goal and its progress and milestones.", async (input, ctx) => {
    const goals = await goalRows(ctx);
    const goal = resolveReference(goals.map(row => ({ ...row, name: row.title })), input.id, "goal");
    return { goal };
  }),
  create_goal: operation(schemas.create_goal, true, "Add a goal the person is working toward. Progress comes from linked tasks, milestones, or a number they update (metric kind tasks, milestones or number).", async (input, ctx) => {
    const { area, areaId: rawArea, today, timezone, ...fields } = input;
    void [today, timezone];
    const areaId = areaRef(ctx, alias("area", area, rawArea)) ?? ctx.areas[0]?._id;
    if (!areaId) throw new OperationError("INVALID_INPUT", "Add an area before creating a goal.");
    const goal = await ctx.call(api.service.goalsCreate, ctx.userId, "goals.create", { ...fields, areaId, startDate: input.startDate ?? ctx.today });
    return { ok: true, id: goal._id, goal: identify(goal), readBack: `Added goal "${line(goal.title)}"${goal.targetDate ? ` with target date ${relativeDay(goal.targetDate, ctx.today)}` : " with no target date"}.` };
  }),
  update_goal: operation(schemas.update_goal, { write: true, destructive: true, idempotent: true }, "Patch a goal without changing omitted fields.", async (input, ctx) => {
    const { id, area, areaId: rawArea, today, timezone, ...patch } = input;
    void [today, timezone];
    const areaId = areaRef(ctx, alias("area", area, rawArea));
    const goal = await ctx.call(api.service.goalsUpdate, ctx.userId, "goals.update", { id: id as Id<"goals">, patch: { ...patch, ...(areaId ? { areaId } : {}) } });
    return { ok: true, id: goal._id, goal: identify(goal), readBack: `Updated goal "${line(goal.title)}"${goal.targetDate ? ` with target date ${relativeDay(goal.targetDate, ctx.today)}` : " with no target date"}.` };
  }),
  set_goal_progress: operation(schemas.set_goal_progress, { write: true, destructive: true, idempotent: true }, "Set the current value of a number goal. Task and milestone progress comes from their records.", async (input, ctx) => {
    const stored = await ctx.call(api.service.goalsSetProgress, ctx.userId, "goals.setProgress", { id: input.id as Id<"goals">, current: input.current });
    if (stored.metric.kind !== "number") throw new OperationError("INVALID_INPUT", "Complete linked tasks or milestones to change this goal's progress.");
    return { ok: true, id: stored._id, goal: identify(stored), readBack: `Goal "${line(stored.title)}" now records ${stored.metric.current} ${line(stored.metric.unit)} of ${stored.metric.target}.` };
  }),
  add_milestone: operation(schemas.add_milestone, true, "Add a milestone to an existing goal.", async (input, ctx) => {
    const goalId = await goalRef(ctx, alias("goal", input.goal, input.goalId));
    if (!goalId) throw new OperationError("INVALID_INPUT", "Choose a goal before adding a milestone.");
    const milestone = await ctx.call(api.service.goalsCreateMilestone, ctx.userId, "goals.createMilestone", { goalId, title: input.title, ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}) });
    return { ok: true, id: milestone._id, milestone: identify(milestone), readBack: `Added milestone "${line(milestone.title)}"${milestone.targetDate ? ` with target date ${relativeDay(milestone.targetDate, ctx.today)}` : " with no target date"}.` };
  }),
  complete_milestone: operation(schemas.complete_milestone, { write: true, destructive: true }, "Complete or reopen a milestone.", async (input, ctx) => {
    const milestone = await ctx.call(api.service.goalsUpdateMilestone, ctx.userId, "goals.updateMilestone", { id: input.id as Id<"milestones">, patch: { doneAt: input.completed ? Date.now() : null } });
    return { ok: true, id: milestone._id, milestone: identify(milestone), readBack: `${input.completed ? "Completed" : "Reopened"} milestone "${line(milestone.title)}".` };
  }),
  list_spaces: operation(schemas.list_spaces, false, "Read areas, projects and courses before adding or updating spaces. Areas can be created, edited, reordered and removed.", async (_input, ctx) => ({ areas: ctx.areas.map(identify), projects: allProjectRows(ctx).map(identify) })),
  create_project: operation(schemas.create_project, true, "Add a project or a course (kind: course for a class) inside an existing area, so related tasks can be grouped under it.", async (input, ctx) => {
    const areaId = areaRef(ctx, alias("area", input.area, input.areaId));
    if (!areaId) throw new OperationError("INVALID_INPUT", "Choose an area before adding a project or course.");
    const project = await ctx.call(api.service.projectsCreate, ctx.userId, "projects.create", { areaId, name: input.name, kind: input.kind, ...(input.note !== undefined ? { note: input.note } : {}) });
    return { ok: true, id: project._id, project: identify(project), readBack: `Added ${project.kind} "${line(project.name)}" in ${line(ctx.areas.find(row => row._id === project.areaId)?.name ?? "Area")}.` };
  }),
  update_project: operation(schemas.update_project, { write: true, destructive: true, idempotent: true }, "Rename or move a project or course, switch kind, edit its note, or archive or unarchive it.", async (input, ctx) => {
    const current = resolveReference(allProjectRows(ctx), input.id, "project");
    const { id, today, timezone, area, archived, ...patch } = input; void [id, today, timezone];
    const project = await ctx.call(api.service.projectsUpdate, ctx.userId, "projects.update", { id: current._id, patch: { ...patch, ...(area ? { areaId: areaRef(ctx, area) } : {}), ...(archived !== undefined ? { archivedAt: archived ? current.archivedAt ?? Date.now() : null } : {}) } });
    return { ok: true, id: project._id, project: identify(project), readBack: `${project.kind === "course" ? "Course" : "Project"} is now named "${line(project.name)}".` };
  }),
};
export type OperationName = keyof typeof operations;
export const MCP_TOOLS = Object.keys(operations).filter((name): name is Exclude<OperationName, "me"> => name !== "me");
export function runOperation(name: OperationName, input: unknown, caller: Caller) { return operations[name].execute(input, caller); }
