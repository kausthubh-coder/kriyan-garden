import { v, type Infer } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { action } from "./_generated/server";
import * as V from "./validators";
import { envelope, verify } from "./serviceAuth";

const areasListArgs = v.object({});
const areasListReturn = v.array(V.area);
const areasListRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof areasListArgs>, Infer<typeof areasListReturn>>("serviceInternal:areasList");
export const areasList = action({
  args: { ...envelope, ...{} },
  returns: v.array(V.area),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof areasListReturn>> => {
    await verify(ctx, "areas.list", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(areasListRef, { ownerId, ...payload });
  },
});

const areasGetArgs = v.object({ id: v.id("areas") });
const areasGetReturn = V.area;
const areasGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof areasGetArgs>, Infer<typeof areasGetReturn>>("serviceInternal:areasGet");
export const areasGet = action({
  args: { ...envelope, ...{ id: v.id("areas") } },
  returns: V.area,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof areasGetReturn>> => {
    await verify(ctx, "areas.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(areasGetRef, { ownerId, ...payload });
  },
});

const areasCreateArgs = v.object(V.areaCreate);
const areasCreateReturn = V.area;
const areasCreateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof areasCreateArgs>, Infer<typeof areasCreateReturn>>("serviceInternal:areasCreate");
export const areasCreate = action({
  args: { ...envelope, ...V.areaCreate },
  returns: V.area,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof areasCreateReturn>> => {
    await verify(ctx, "areas.create", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(areasCreateRef, { ownerId, ...payload });
  },
});

const areasUpdateArgs = v.object({ id: v.id("areas"), patch: V.areaPatch });
const areasUpdateReturn = V.area;
const areasUpdateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof areasUpdateArgs>, Infer<typeof areasUpdateReturn>>("serviceInternal:areasUpdate");
export const areasUpdate = action({
  args: { ...envelope, ...{ id: v.id("areas"), patch: V.areaPatch } },
  returns: V.area,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof areasUpdateReturn>> => {
    await verify(ctx, "areas.update", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(areasUpdateRef, { ownerId, ...payload });
  },
});

const areasRemoveArgs = v.object({ id: v.id("areas") });
const areasRemoveReturn = v.null();
const areasRemoveRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof areasRemoveArgs>, Infer<typeof areasRemoveReturn>>("serviceInternal:areasRemove");
export const areasRemove = action({
  args: { ...envelope, ...{ id: v.id("areas") } },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof areasRemoveReturn>> => {
    await verify(ctx, "areas.remove", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(areasRemoveRef, { ownerId, ...payload });
  },
});

const projectsListArgs = v.object({});
const projectsListReturn = v.array(V.project);
const projectsListRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof projectsListArgs>, Infer<typeof projectsListReturn>>("serviceInternal:projectsList");
export const projectsList = action({
  args: { ...envelope, ...{} },
  returns: v.array(V.project),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof projectsListReturn>> => {
    await verify(ctx, "projects.list", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(projectsListRef, { ownerId, ...payload });
  },
});

const projectsGetArgs = v.object({ id: v.id("projects") });
const projectsGetReturn = V.project;
const projectsGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof projectsGetArgs>, Infer<typeof projectsGetReturn>>("serviceInternal:projectsGet");
export const projectsGet = action({
  args: { ...envelope, ...{ id: v.id("projects") } },
  returns: V.project,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof projectsGetReturn>> => {
    await verify(ctx, "projects.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(projectsGetRef, { ownerId, ...payload });
  },
});

const projectsCreateArgs = v.object(V.projectCreate);
const projectsCreateReturn = V.project;
const projectsCreateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof projectsCreateArgs>, Infer<typeof projectsCreateReturn>>("serviceInternal:projectsCreate");
export const projectsCreate = action({
  args: { ...envelope, ...V.projectCreate },
  returns: V.project,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof projectsCreateReturn>> => {
    await verify(ctx, "projects.create", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(projectsCreateRef, { ownerId, ...payload });
  },
});

const projectsUpdateArgs = v.object({ id: v.id("projects"), patch: V.projectPatch });
const projectsUpdateReturn = V.project;
const projectsUpdateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof projectsUpdateArgs>, Infer<typeof projectsUpdateReturn>>("serviceInternal:projectsUpdate");
export const projectsUpdate = action({
  args: { ...envelope, ...{ id: v.id("projects"), patch: V.projectPatch } },
  returns: V.project,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof projectsUpdateReturn>> => {
    await verify(ctx, "projects.update", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(projectsUpdateRef, { ownerId, ...payload });
  },
});

const projectsRemoveArgs = v.object({ id: v.id("projects") });
const projectsRemoveReturn = v.null();
const projectsRemoveRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof projectsRemoveArgs>, Infer<typeof projectsRemoveReturn>>("serviceInternal:projectsRemove");
export const projectsRemove = action({
  args: { ...envelope, ...{ id: v.id("projects") } },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof projectsRemoveReturn>> => {
    await verify(ctx, "projects.remove", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(projectsRemoveRef, { ownerId, ...payload });
  },
});

const goalsListArgs = v.object({});
const goalsListReturn = v.array(V.goalWithProgress);
const goalsListRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof goalsListArgs>, Infer<typeof goalsListReturn>>("serviceInternal:goalsList");
export const goalsList = action({
  args: { ...envelope, ...{} },
  returns: v.array(V.goalWithProgress),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof goalsListReturn>> => {
    await verify(ctx, "goals.list", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(goalsListRef, { ownerId, ...payload });
  },
});

const goalsGetArgs = v.object({ id: v.id("goals") });
const goalsGetReturn = V.goal;
const goalsGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof goalsGetArgs>, Infer<typeof goalsGetReturn>>("serviceInternal:goalsGet");
export const goalsGet = action({
  args: { ...envelope, ...{ id: v.id("goals") } },
  returns: V.goal,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof goalsGetReturn>> => {
    await verify(ctx, "goals.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(goalsGetRef, { ownerId, ...payload });
  },
});

const goalsCreateArgs = v.object(V.goalCreate);
const goalsCreateReturn = V.goal;
const goalsCreateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof goalsCreateArgs>, Infer<typeof goalsCreateReturn>>("serviceInternal:goalsCreate");
export const goalsCreate = action({
  args: { ...envelope, ...V.goalCreate },
  returns: V.goal,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof goalsCreateReturn>> => {
    await verify(ctx, "goals.create", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(goalsCreateRef, { ownerId, ...payload });
  },
});

const goalsUpdateArgs = v.object({ id: v.id("goals"), patch: V.goalPatch });
const goalsUpdateReturn = V.goal;
const goalsUpdateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof goalsUpdateArgs>, Infer<typeof goalsUpdateReturn>>("serviceInternal:goalsUpdate");
export const goalsUpdate = action({
  args: { ...envelope, ...{ id: v.id("goals"), patch: V.goalPatch } },
  returns: V.goal,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof goalsUpdateReturn>> => {
    await verify(ctx, "goals.update", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(goalsUpdateRef, { ownerId, ...payload });
  },
});

const goalsRemoveArgs = v.object({ id: v.id("goals") });
const goalsRemoveReturn = v.null();
const goalsRemoveRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof goalsRemoveArgs>, Infer<typeof goalsRemoveReturn>>("serviceInternal:goalsRemove");
export const goalsRemove = action({
  args: { ...envelope, ...{ id: v.id("goals") } },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof goalsRemoveReturn>> => {
    await verify(ctx, "goals.remove", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(goalsRemoveRef, { ownerId, ...payload });
  },
});

const eventsListArgs = v.object({});
const eventsListReturn = v.array(V.event);
const eventsListRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof eventsListArgs>, Infer<typeof eventsListReturn>>("serviceInternal:eventsList");
export const eventsList = action({
  args: { ...envelope, ...{} },
  returns: v.array(V.event),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof eventsListReturn>> => {
    await verify(ctx, "events.list", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(eventsListRef, { ownerId, ...payload });
  },
});

const eventsGetArgs = v.object({ id: v.id("events") });
const eventsGetReturn = V.event;
const eventsGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof eventsGetArgs>, Infer<typeof eventsGetReturn>>("serviceInternal:eventsGet");
export const eventsGet = action({
  args: { ...envelope, ...{ id: v.id("events") } },
  returns: V.event,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof eventsGetReturn>> => {
    await verify(ctx, "events.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(eventsGetRef, { ownerId, ...payload });
  },
});

const eventsCreateArgs = v.object(V.eventCreate);
const eventsCreateReturn = V.event;
const eventsCreateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof eventsCreateArgs>, Infer<typeof eventsCreateReturn>>("serviceInternal:eventsCreate");
export const eventsCreate = action({
  args: { ...envelope, ...V.eventCreate },
  returns: V.event,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof eventsCreateReturn>> => {
    await verify(ctx, "events.create", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(eventsCreateRef, { ownerId, ...payload });
  },
});

const eventsUpdateArgs = v.object({ id: v.id("events"), patch: V.eventPatch });
const eventsUpdateReturn = V.event;
const eventsUpdateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof eventsUpdateArgs>, Infer<typeof eventsUpdateReturn>>("serviceInternal:eventsUpdate");
export const eventsUpdate = action({
  args: { ...envelope, ...{ id: v.id("events"), patch: V.eventPatch } },
  returns: V.event,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof eventsUpdateReturn>> => {
    await verify(ctx, "events.update", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(eventsUpdateRef, { ownerId, ...payload });
  },
});

const eventsRemoveArgs = v.object({ id: v.id("events") });
const eventsRemoveReturn = v.null();
const eventsRemoveRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof eventsRemoveArgs>, Infer<typeof eventsRemoveReturn>>("serviceInternal:eventsRemove");
export const eventsRemove = action({
  args: { ...envelope, ...{ id: v.id("events") } },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof eventsRemoveReturn>> => {
    await verify(ctx, "events.remove", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(eventsRemoveRef, { ownerId, ...payload });
  },
});

const tasksListArgs = v.object({ status: v.optional(V.taskStatus), limit: v.optional(v.number()) });
const tasksListReturn = v.array(V.task);
const tasksListRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof tasksListArgs>, Infer<typeof tasksListReturn>>("serviceInternal:tasksList");
export const tasksList = action({
  args: { ...envelope, ...{ status: v.optional(V.taskStatus), limit: v.optional(v.number()) } },
  returns: v.array(V.task),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksListReturn>> => {
    await verify(ctx, "tasks.list", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(tasksListRef, { ownerId, ...payload });
  },
});

const tasksGetArgs = v.object({ id: v.id("tasks") });
const tasksGetReturn = V.task;
const tasksGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof tasksGetArgs>, Infer<typeof tasksGetReturn>>("serviceInternal:tasksGet");
export const tasksGet = action({
  args: { ...envelope, ...{ id: v.id("tasks") } },
  returns: V.task,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksGetReturn>> => {
    await verify(ctx, "tasks.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(tasksGetRef, { ownerId, ...payload });
  },
});

const tasksCreateArgs = v.object(V.taskCreate);
const tasksCreateReturn = V.task;
const tasksCreateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof tasksCreateArgs>, Infer<typeof tasksCreateReturn>>("serviceInternal:tasksCreate");
export const tasksCreate = action({
  args: { ...envelope, ...V.taskCreate },
  returns: V.task,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksCreateReturn>> => {
    await verify(ctx, "tasks.create", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(tasksCreateRef, { ownerId, ...payload });
  },
});

const tasksUpdateArgs = v.object({ id: v.id("tasks"), patch: V.taskPatch });
const tasksUpdateReturn = V.task;
const tasksUpdateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof tasksUpdateArgs>, Infer<typeof tasksUpdateReturn>>("serviceInternal:tasksUpdate");
export const tasksUpdate = action({
  args: { ...envelope, ...{ id: v.id("tasks"), patch: V.taskPatch } },
  returns: V.task,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksUpdateReturn>> => {
    await verify(ctx, "tasks.update", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(tasksUpdateRef, { ownerId, ...payload });
  },
});

const tasksRemoveArgs = v.object({ id: v.id("tasks") });
const tasksRemoveReturn = v.null();
const tasksRemoveRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof tasksRemoveArgs>, Infer<typeof tasksRemoveReturn>>("serviceInternal:tasksRemove");
export const tasksRemove = action({
  args: { ...envelope, ...{ id: v.id("tasks") } },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksRemoveReturn>> => {
    await verify(ctx, "tasks.remove", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(tasksRemoveRef, { ownerId, ...payload });
  },
});

const habitsListArgs = v.object({});
const habitsListReturn = v.array(V.habit);
const habitsListRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof habitsListArgs>, Infer<typeof habitsListReturn>>("serviceInternal:habitsList");
export const habitsList = action({
  args: { ...envelope, ...{} },
  returns: v.array(V.habit),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof habitsListReturn>> => {
    await verify(ctx, "habits.list", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(habitsListRef, { ownerId, ...payload });
  },
});

const habitsGetArgs = v.object({ id: v.id("habits") });
const habitsGetReturn = V.habit;
const habitsGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof habitsGetArgs>, Infer<typeof habitsGetReturn>>("serviceInternal:habitsGet");
export const habitsGet = action({
  args: { ...envelope, ...{ id: v.id("habits") } },
  returns: V.habit,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof habitsGetReturn>> => {
    await verify(ctx, "habits.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(habitsGetRef, { ownerId, ...payload });
  },
});

const habitsCreateArgs = v.object(V.habitCreate);
const habitsCreateReturn = V.habit;
const habitsCreateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof habitsCreateArgs>, Infer<typeof habitsCreateReturn>>("serviceInternal:habitsCreate");
export const habitsCreate = action({
  args: { ...envelope, ...V.habitCreate },
  returns: V.habit,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof habitsCreateReturn>> => {
    await verify(ctx, "habits.create", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(habitsCreateRef, { ownerId, ...payload });
  },
});

const habitsUpdateArgs = v.object({ id: v.id("habits"), patch: V.habitPatch });
const habitsUpdateReturn = V.habit;
const habitsUpdateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof habitsUpdateArgs>, Infer<typeof habitsUpdateReturn>>("serviceInternal:habitsUpdate");
export const habitsUpdate = action({
  args: { ...envelope, ...{ id: v.id("habits"), patch: V.habitPatch } },
  returns: V.habit,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof habitsUpdateReturn>> => {
    await verify(ctx, "habits.update", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(habitsUpdateRef, { ownerId, ...payload });
  },
});

const habitsRemoveArgs = v.object({ id: v.id("habits") });
const habitsRemoveReturn = v.null();
const habitsRemoveRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof habitsRemoveArgs>, Infer<typeof habitsRemoveReturn>>("serviceInternal:habitsRemove");
export const habitsRemove = action({
  args: { ...envelope, ...{ id: v.id("habits") } },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof habitsRemoveReturn>> => {
    await verify(ctx, "habits.remove", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(habitsRemoveRef, { ownerId, ...payload });
  },
});

const tasksCompleteArgs = v.object({ id: v.id("tasks") });
const tasksCompleteReturn = V.task;
const tasksCompleteRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof tasksCompleteArgs>, Infer<typeof tasksCompleteReturn>>("serviceInternal:tasksComplete");
export const tasksComplete = action({
  args: { ...envelope, ...{ id: v.id("tasks") } },
  returns: V.task,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksCompleteReturn>> => {
    await verify(ctx, "tasks.complete", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(tasksCompleteRef, { ownerId, ...payload });
  },
});

const tasksReopenArgs = v.object({ id: v.id("tasks") });
const tasksReopenReturn = V.task;
const tasksReopenRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof tasksReopenArgs>, Infer<typeof tasksReopenReturn>>("serviceInternal:tasksReopen");
export const tasksReopen = action({
  args: { ...envelope, ...{ id: v.id("tasks") } },
  returns: V.task,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksReopenReturn>> => {
    await verify(ctx, "tasks.reopen", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(tasksReopenRef, { ownerId, ...payload });
  },
});

const tasksQuickAddArgs = v.object({ text: v.string(), today: v.string() });
const tasksQuickAddReturn = V.task;
const tasksQuickAddRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof tasksQuickAddArgs>, Infer<typeof tasksQuickAddReturn>>("serviceInternal:tasksQuickAdd");
export const tasksQuickAdd = action({
  args: { ...envelope, ...{ text: v.string(), today: v.string() } },
  returns: V.task,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksQuickAddReturn>> => {
    await verify(ctx, "tasks.quickAdd", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(tasksQuickAddRef, { ownerId, ...payload });
  },
});

const tasksSearchArgs = v.object({ query: v.string(), limit: v.optional(v.number()) });
const tasksSearchReturn = v.array(V.task);
const tasksSearchRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof tasksSearchArgs>, Infer<typeof tasksSearchReturn>>("serviceInternal:tasksSearch");
export const tasksSearch = action({
  args: { ...envelope, ...{ query: v.string(), limit: v.optional(v.number()) } },
  returns: v.array(V.task),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof tasksSearchReturn>> => {
    await verify(ctx, "tasks.search", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(tasksSearchRef, { ownerId, ...payload });
  },
});

const dayGetArgs = v.object({ date: v.string() });
const dayGetReturn = V.day;
const dayGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof dayGetArgs>, Infer<typeof dayGetReturn>>("serviceInternal:dayGet");
export const dayGet = action({
  args: { ...envelope, ...{ date: v.string() } },
  returns: V.day,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof dayGetReturn>> => {
    await verify(ctx, "day.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(dayGetRef, { ownerId, ...payload });
  },
});

const weekGetArgs = v.object({ startDate: v.string() });
const weekGetReturn = v.array(V.weekDay);
const weekGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof weekGetArgs>, Infer<typeof weekGetReturn>>("serviceInternal:weekGet");
export const weekGet = action({
  args: { ...envelope, ...{ startDate: v.string() } },
  returns: v.array(V.weekDay),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof weekGetReturn>> => {
    await verify(ctx, "week.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(weekGetRef, { ownerId, ...payload });
  },
});

const profilesGetArgs = v.object({});
const profilesGetReturn = v.union(V.profile, v.null());
const profilesGetRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof profilesGetArgs>, Infer<typeof profilesGetReturn>>("serviceInternal:profilesGet");
export const profilesGet = action({
  args: { ...envelope, ...{} },
  returns: v.union(V.profile, v.null()),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof profilesGetReturn>> => {
    await verify(ctx, "profiles.get", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(profilesGetRef, { ownerId, ...payload });
  },
});

const profilesEnsureArgs = v.object({ timezone: v.optional(v.string()) });
const profilesEnsureReturn = V.profile;
const profilesEnsureRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof profilesEnsureArgs>, Infer<typeof profilesEnsureReturn>>("serviceInternal:profilesEnsure");
export const profilesEnsure = action({
  args: { ...envelope, ...{ timezone: v.optional(v.string()) } },
  returns: V.profile,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof profilesEnsureReturn>> => {
    await verify(ctx, "profiles.ensure", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(profilesEnsureRef, { ownerId, ...payload });
  },
});

const profilesUpdateArgs = v.object({ patch: V.profilePatch });
const profilesUpdateReturn = V.profile;
const profilesUpdateRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof profilesUpdateArgs>, Infer<typeof profilesUpdateReturn>>("serviceInternal:profilesUpdate");
export const profilesUpdate = action({
  args: { ...envelope, ...{ patch: V.profilePatch } },
  returns: V.profile,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof profilesUpdateReturn>> => {
    await verify(ctx, "profiles.update", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(profilesUpdateRef, { ownerId, ...payload });
  },
});

const profilesCompleteOnboardingArgs = v.object({});
const profilesCompleteOnboardingReturn = V.profile;
const profilesCompleteOnboardingRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof profilesCompleteOnboardingArgs>, Infer<typeof profilesCompleteOnboardingReturn>>("serviceInternal:profilesCompleteOnboarding");
export const profilesCompleteOnboarding = action({
  args: { ...envelope, ...{} },
  returns: V.profile,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof profilesCompleteOnboardingReturn>> => {
    await verify(ctx, "profiles.completeOnboarding", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(profilesCompleteOnboardingRef, { ownerId, ...payload });
  },
});

const profilesResetAllArgs = v.object({});
const profilesResetAllReturn = v.null();
const profilesResetAllRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof profilesResetAllArgs>, Infer<typeof profilesResetAllReturn>>("serviceInternal:profilesResetAll");
export const profilesResetAll = action({
  args: { ...envelope, ...{} },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof profilesResetAllReturn>> => {
    await verify(ctx, "profiles.resetAll", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(profilesResetAllRef, { ownerId, ...payload });
  },
});

const goalsCreateMilestoneArgs = v.object(V.milestoneCreate);
const goalsCreateMilestoneReturn = V.milestone;
const goalsCreateMilestoneRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof goalsCreateMilestoneArgs>, Infer<typeof goalsCreateMilestoneReturn>>("serviceInternal:goalsCreateMilestone");
export const goalsCreateMilestone = action({
  args: { ...envelope, ...V.milestoneCreate },
  returns: V.milestone,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof goalsCreateMilestoneReturn>> => {
    await verify(ctx, "goals.createMilestone", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(goalsCreateMilestoneRef, { ownerId, ...payload });
  },
});

const goalsUpdateMilestoneArgs = v.object({ id: v.id("milestones"), patch: V.milestonePatch });
const goalsUpdateMilestoneReturn = V.milestone;
const goalsUpdateMilestoneRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof goalsUpdateMilestoneArgs>, Infer<typeof goalsUpdateMilestoneReturn>>("serviceInternal:goalsUpdateMilestone");
export const goalsUpdateMilestone = action({
  args: { ...envelope, ...{ id: v.id("milestones"), patch: V.milestonePatch } },
  returns: V.milestone,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof goalsUpdateMilestoneReturn>> => {
    await verify(ctx, "goals.updateMilestone", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(goalsUpdateMilestoneRef, { ownerId, ...payload });
  },
});

const goalsRemoveMilestoneArgs = v.object({ id: v.id("milestones") });
const goalsRemoveMilestoneReturn = v.null();
const goalsRemoveMilestoneRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof goalsRemoveMilestoneArgs>, Infer<typeof goalsRemoveMilestoneReturn>>("serviceInternal:goalsRemoveMilestone");
export const goalsRemoveMilestone = action({
  args: { ...envelope, ...{ id: v.id("milestones") } },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof goalsRemoveMilestoneReturn>> => {
    await verify(ctx, "goals.removeMilestone", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(goalsRemoveMilestoneRef, { ownerId, ...payload });
  },
});

const habitsListLogsArgs = v.object({ habitId: v.id("habits") });
const habitsListLogsReturn = v.array(V.habitLog);
const habitsListLogsRef = makeFunctionReference<"query", { ownerId: string } & Infer<typeof habitsListLogsArgs>, Infer<typeof habitsListLogsReturn>>("serviceInternal:habitsListLogs");
export const habitsListLogs = action({
  args: { ...envelope, ...{ habitId: v.id("habits") } },
  returns: v.array(V.habitLog),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof habitsListLogsReturn>> => {
    await verify(ctx, "habits.listLogs", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runQuery(habitsListLogsRef, { ownerId, ...payload });
  },
});

const habitsLogArgs = v.object({ habitId: v.id("habits"), date: v.string() });
const habitsLogReturn = V.habitLog;
const habitsLogRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof habitsLogArgs>, Infer<typeof habitsLogReturn>>("serviceInternal:habitsLog");
export const habitsLog = action({
  args: { ...envelope, ...{ habitId: v.id("habits"), date: v.string() } },
  returns: V.habitLog,
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof habitsLogReturn>> => {
    await verify(ctx, "habits.log", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(habitsLogRef, { ownerId, ...payload });
  },
});

const habitsRemoveLogArgs = v.object({ id: v.id("habitLogs") });
const habitsRemoveLogReturn = v.null();
const habitsRemoveLogRef = makeFunctionReference<"mutation", { ownerId: string } & Infer<typeof habitsRemoveLogArgs>, Infer<typeof habitsRemoveLogReturn>>("serviceInternal:habitsRemoveLog");
export const habitsRemoveLog = action({
  args: { ...envelope, ...{ id: v.id("habitLogs") } },
  returns: v.null(),
  handler: async (ctx, { ownerId, timestamp, nonce, signature, ...payload }): Promise<Infer<typeof habitsRemoveLogReturn>> => {
    await verify(ctx, "habits.removeLog", { ownerId, timestamp, nonce, signature }, payload);
    return ctx.runMutation(habitsRemoveLogRef, { ownerId, ...payload });
  },
});
