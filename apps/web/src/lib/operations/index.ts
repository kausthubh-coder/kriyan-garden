import { z } from "zod";
import { randomUUID } from "node:crypto";
import { addDays, goalProgress, localClock, weekStart, deadlineCapacity } from "@kriyan/core";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc, Id } from "@kriyan/backend/convex/_generated/dataModel";
import type { TaskPatch } from "@kriyan/backend/convex/validators";
import { serviceCall, type ServiceInvocation } from "../service-client";
import { OperationError } from "./errors";
import { schemas } from "./schemas";
import type { Scope } from "./scopes";

export type Caller = { userId: string; scopes: readonly string[] };
type Context = Awaited<ReturnType<typeof loadContext>>;
async function loadContext(userId: string, input: { today?: string; timezone?: string }, invocation: ServiceInvocation) {
  const call: typeof serviceCall = (ref, owner, operation, payload) => serviceCall(ref, owner, operation, payload, invocation);
  const stored = await call(api.service.plannerContext, userId, "planner.context", {});
  const timezone = input.timezone ?? stored.profile?.timezone;
  if (!timezone) throw new OperationError("TIMEZONE_REQUIRED", "Set a profile timezone or pass timezone with this request.");
  return { ...stored, call, userId, timezone, today: input.today ?? localClock(new Date(), timezone).today };
}
function operation<S extends z.ZodObject>(schema: S, scopes: readonly Scope[], write: boolean, description: string, handler: (input: z.output<S>, context: Context) => Promise<Record<string, unknown>>) {
  return {
    schema, scopes, write, description,
    async execute(input: unknown, caller: Caller): Promise<Record<string, unknown> & { today: string; timezone: string }> {
      if (!caller.userId.startsWith("user_")) throw new OperationError("FORBIDDEN", "Use a token owned by a user account.", 403);
      const missing = scopes.filter(scope => !caller.scopes.includes(scope));
      if (missing.length) throw new OperationError("INSUFFICIENT_SCOPE", `Authorize ${missing.join(", ")} and try again.`, 403);
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
  const matches = rows.filter(row => row.name.toLocaleLowerCase() === key || row.path?.toLocaleLowerCase() === key);
  if (matches.length > 1) throw new OperationError("AMBIGUOUS", `More than one ${kind} matches. Choose an ID from the candidates.`, 409, matches.map(row => ({ id: row._id, name: row.name, ...(row.path ? { path: row.path } : {}) })));
  const match = matches[0];
  if (!match) throw new OperationError("NOT_FOUND", `${kind.charAt(0).toUpperCase() + kind.slice(1)} not found. Read the list and choose a name or ID.`, 404);
  return match;
}
const projectRows = (context: Context) => context.projects.filter(row => row.archivedAt === null).map(row => ({ ...row, path: `${context.areas.find(area => area._id === row.areaId)?.name ?? "Area"} / ${row.name}` }));
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
  const parts = [`${verb} task "${line(task.title)}" in ${line(area)}${project ? ` / ${line(project)}` : ""}`, task.date ? `scheduled for ${task.date}${task.time ? ` at ${task.time}` : " at any time"}` : "with no planned date"];
  if (task.durationMinutes !== null) parts.push(`length ${task.durationMinutes} minutes`);
  if (task.deadline) parts.push(`deadline ${task.deadline}`);
  if (task.repeat) parts.push(`repeating every ${task.repeat.every} ${task.repeat.unit}${task.repeat.every === 1 ? "" : "s"}${task.repeat.weekdays ? ` on weekdays ${task.repeat.weekdays.join(", ")}` : ""}`);
  if (task.reminders.length) parts.push(`${task.reminders.length} reminder${task.reminders.length === 1 ? "" : "s"}`);
  return `${parts.join("; ")}.`;
}
const taskWrite = (task: Doc<"tasks">, context: Context, verb: string) => ({ ok: true, id: task._id, task: identify(task), readBack: taskReadBack(task, context, verb) });
const capacity = (context: Context) => context.profile?.dailyCapacityMinutes ?? 360;
async function dayView(context: Context, date: string) {
  const day = await context.call(api.service.dayGet, context.userId, "day.get", { date });
  return { ...day, timed: day.timed.map(identify), anytime: day.anytime.map(identify), unscheduled: day.unscheduled.map(identify), events: day.events.map(identify), capacityMinutes: capacity(context), freeMinutes: Math.max(0, capacity(context) - day.plannedMinutes) };
}
async function goalRows(context: Context) {
  const goals = await context.call(api.service.goalsList, context.userId, "goals.list", {});
  return goals.map(goal => ({ ...identify(goal), progress: goalProgress(goal, context.today), milestones: goal.milestones.map(identify) }));
}

export const operations = {
  me: operation(schemas.me, [], false, "Read the caller's profile and local calendar.", async (_input, ctx) => ({ userId: ctx.userId, profile: ctx.profile ? identify(ctx.profile) : null })),
  get_overview: operation(schemas.get_overview, ["tasks:read", "spaces:read", "goals:read"], false, "Start here: areas, projects, courses, active goals and today's summary.", async (_input, ctx) => {
    const [day, goals] = await Promise.all([dayView(ctx, ctx.today), goalRows(ctx)]);
    const count = [...day.timed, ...day.anytime].filter(task => task.status === "active").length;
    return { areas: ctx.areas.map(identify), projects: projectRows(ctx).map(identify), goals: goals.filter(goal => goal.status === "active"), summary: `${count} active tasks today, ${day.plannedMinutes} minutes planned, ${day.freeMinutes} minutes free.`, day };
  }),
  get_day: operation(schemas.get_day, ["tasks:read"], false, "Read timed tasks, any-time tasks, events, unscheduled tasks and free capacity for a date.", (input, ctx) => dayView(ctx, input.date ?? ctx.today)),
  get_week: operation(schemas.get_week, ["tasks:read"], false, "Read daily load by area and the next 14 days of deadlines with capacity.", async (input, ctx) => {
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
  list_tasks: operation(schemas.list_tasks, ["tasks:read"], false, "List up to 100 tasks filtered by area, project, goal, status, dates, deadlines or title text.", async (input, ctx) => {
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
  get_task: operation(schemas.get_task, ["tasks:read"], false, "Read one task including its notes, repeat and reminders.", async (input, ctx) => ({ task: identify(await ctx.call(api.service.tasksGet, ctx.userId, "tasks.get", { id: input.id as Id<"tasks"> })) })),
  quick_add: operation(schemas.quick_add, ["tasks:write"], true, "Parse the same quick-add text as the app, create a task and return the stored fields.", async (input, ctx) => {
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
  create_task: operation(schemas.create_task, ["tasks:write"], true, "Create a structured task. Length is optional. Repeat weekdays use Sunday=0 to Saturday=6.", async (input, ctx) => {
    const fields = await taskPatch(input, ctx);
    const task = await ctx.call(api.service.tasksCreate, ctx.userId, "tasks.create", { ...fields, title: input.title });
    return taskWrite(task, ctx, "Added");
  }),
  update_task: operation(schemas.update_task, ["tasks:write"], true, "Patch a task. Omitted fields remain stored; null clears optional values.", async (input, ctx) => taskWrite(await ctx.call(api.service.tasksUpdate, ctx.userId, "tasks.update", { id: input.id as Id<"tasks">, patch: await taskPatch(input, ctx) }), ctx, "Updated")),
  complete_task: operation(schemas.complete_task, ["tasks:write"], true, "Complete or reopen a task. Completing a repeat creates and names its next occurrence.", async (input, ctx) => {
    if (!input.completed) return taskWrite(await ctx.call(api.service.tasksReopen, ctx.userId, "tasks.reopen", { id: input.id as Id<"tasks"> }), ctx, "Reopened");
    const result = await ctx.call(api.service.tasksCompleteWithNext, ctx.userId, "tasks.completeWithNext", { id: input.id as Id<"tasks"> });
    return { ...taskWrite(result.task, ctx, "Completed"), nextOccurrence: result.nextOccurrence ? identify(result.nextOccurrence) : null, readBack: result.nextOccurrence ? `${taskReadBack(result.task, ctx, "Completed").slice(0, -1)}; next occurrence "${line(result.nextOccurrence.title)}" is scheduled for ${result.nextOccurrence.date}${result.nextOccurrence.time ? ` at ${result.nextOccurrence.time}` : ""}.` : taskReadBack(result.task, ctx, "Completed") };
  }),
  move_task: operation(schemas.move_task, ["tasks:write"], true, "Move only the date and time, using the app's schedule rules.", async (input, ctx) => taskWrite(await ctx.call(api.service.tasksUpdate, ctx.userId, "tasks.update", { id: input.id as Id<"tasks">, patch: { date: input.date, ...(input.time !== undefined ? { time: input.time } : {}) } }), ctx, "Moved")),
  search: operation(schemas.search, ["tasks:read"], false, "Search full text in active task titles and notes.", async (input, ctx) => ({ tasks: (await ctx.call(api.service.tasksSearch, ctx.userId, "tasks.search", { query: input.query, limit: input.limit })).map(identify) })),
  list_goals: operation(schemas.list_goals, ["goals:read"], false, "Read goals with progress, pace, linked task counts and milestones.", async (input, ctx) => {
    const areaId = areaRef(ctx, alias("area", input.area, input.areaId));
    return { goals: (await goalRows(ctx)).filter(goal => (input.status === "all" || goal.status === input.status) && (!areaId || goal.areaId === areaId)) };
  }),
  get_goal: operation(schemas.get_goal, ["goals:read"], false, "Read one goal and its progress and milestones.", async (input, ctx) => {
    const goals = await goalRows(ctx);
    const goal = resolveReference(goals.map(row => ({ ...row, name: row.title })), input.id, "goal");
    return { goal };
  }),
  create_goal: operation(schemas.create_goal, ["goals:write"], true, "Create a goal with a task, number or milestone metric.", async (input, ctx) => {
    const { area, areaId: rawArea, today, timezone, ...fields } = input;
    void [today, timezone];
    const areaId = areaRef(ctx, alias("area", area, rawArea)) ?? ctx.areas[0]?._id;
    if (!areaId) throw new OperationError("INVALID_INPUT", "Add an area before creating a goal.");
    const goal = await ctx.call(api.service.goalsCreate, ctx.userId, "goals.create", { ...fields, areaId, startDate: input.startDate ?? ctx.today });
    return { ok: true, id: goal._id, goal: identify(goal), readBack: `Added goal "${line(goal.title)}"${goal.targetDate ? ` with target date ${goal.targetDate}` : " with no target date"}.` };
  }),
  update_goal: operation(schemas.update_goal, ["goals:write"], true, "Patch a goal without changing omitted fields.", async (input, ctx) => {
    const { id, area, areaId: rawArea, today, timezone, ...patch } = input;
    void [today, timezone];
    const areaId = areaRef(ctx, alias("area", area, rawArea));
    const goal = await ctx.call(api.service.goalsUpdate, ctx.userId, "goals.update", { id: id as Id<"goals">, patch: { ...patch, ...(areaId ? { areaId } : {}) } });
    return { ok: true, id: goal._id, goal: identify(goal), readBack: `Updated goal "${line(goal.title)}"${goal.targetDate ? ` with target date ${goal.targetDate}` : " with no target date"}.` };
  }),
  set_goal_progress: operation(schemas.set_goal_progress, ["goals:write"], true, "Set the current value of a number goal. Task and milestone progress comes from their records.", async (input, ctx) => {
    const stored = await ctx.call(api.service.goalsSetProgress, ctx.userId, "goals.setProgress", { id: input.id as Id<"goals">, current: input.current });
    if (stored.metric.kind !== "number") throw new OperationError("INVALID_INPUT", "Complete linked tasks or milestones to change this goal's progress.");
    return { ok: true, id: stored._id, goal: identify(stored), readBack: `Goal "${line(stored.title)}" now records ${stored.metric.current} ${line(stored.metric.unit)} of ${stored.metric.target}.` };
  }),
  add_milestone: operation(schemas.add_milestone, ["goals:write"], true, "Add a milestone to an existing goal.", async (input, ctx) => {
    const goalId = await goalRef(ctx, alias("goal", input.goal, input.goalId));
    if (!goalId) throw new OperationError("INVALID_INPUT", "Choose a goal before adding a milestone.");
    const milestone = await ctx.call(api.service.goalsCreateMilestone, ctx.userId, "goals.createMilestone", { goalId, title: input.title, ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}) });
    return { ok: true, id: milestone._id, milestone: identify(milestone), readBack: `Added milestone "${line(milestone.title)}"${milestone.targetDate ? ` with target date ${milestone.targetDate}` : " with no target date"}.` };
  }),
  complete_milestone: operation(schemas.complete_milestone, ["goals:write"], true, "Complete or reopen a milestone.", async (input, ctx) => {
    const milestone = await ctx.call(api.service.goalsUpdateMilestone, ctx.userId, "goals.updateMilestone", { id: input.id as Id<"milestones">, patch: { doneAt: input.completed ? Date.now() : null } });
    return { ok: true, id: milestone._id, milestone: identify(milestone), readBack: `${input.completed ? "Completed" : "Reopened"} milestone "${line(milestone.title)}".` };
  }),
  list_spaces: operation(schemas.list_spaces, ["spaces:read"], false, "Read the areas and their projects and courses. Areas are read-only here.", async (_input, ctx) => ({ areas: ctx.areas.map(identify), projects: projectRows(ctx).map(identify) })),
  create_project: operation(schemas.create_project, ["spaces:write"], true, "Create a project or course within an existing area.", async (input, ctx) => {
    const areaId = areaRef(ctx, alias("area", input.area, input.areaId));
    if (!areaId) throw new OperationError("INVALID_INPUT", "Choose an area before adding a project or course.");
    const project = await ctx.call(api.service.projectsCreate, ctx.userId, "projects.create", { areaId, name: input.name, kind: input.kind, ...(input.note !== undefined ? { note: input.note } : {}) });
    return { ok: true, id: project._id, project: identify(project), readBack: `Added ${project.kind} "${line(project.name)}" in ${line(ctx.areas.find(row => row._id === project.areaId)?.name ?? "Area")}.` };
  }),
  update_project: operation(schemas.update_project, ["spaces:write"], true, "Rename a project or course, or update its note.", async (input, ctx) => {
    const projectId = resolveReference(projectRows(ctx), input.id, "project")._id;
    const project = await ctx.call(api.service.projectsUpdate, ctx.userId, "projects.update", { id: projectId, patch: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.note !== undefined ? { note: input.note } : {}) } });
    return { ok: true, id: project._id, project: identify(project), readBack: `${project.kind === "course" ? "Course" : "Project"} is now named "${line(project.name)}".` };
  }),
};
export type OperationName = keyof typeof operations;
export const MCP_TOOLS = Object.keys(operations).filter((name): name is Exclude<OperationName, "me"> => name !== "me");
export function runOperation(name: OperationName, input: unknown, caller: Caller) { return operations[name].execute(input, caller); }
