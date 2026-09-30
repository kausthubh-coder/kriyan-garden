import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { internalQuery, internalMutation } from "./_generated/server";
import * as V from "./validators";
import * as areas from "./model/areas";
import * as projects from "./model/projects";
import * as goals from "./model/goals";
import * as events from "./model/events";
import * as tasks from "./model/tasks";
import * as habits from "./model/habits";
import * as day from "./model/day";
import * as week from "./model/week";
import * as profiles from "./model/profiles";

export const areasList = internalQuery({
  args: { ownerId: v.string(), ...{} },
  returns: v.array(V.area),
  handler: (ctx, { ownerId, ...args }) => areas.list(ctx, ownerId, args),
});

export const areasGet = internalQuery({
  args: { ownerId: v.string(), ...{ id: v.id("areas") } },
  returns: V.area,
  handler: (ctx, { ownerId, ...args }) => areas.get(ctx, ownerId, args),
});

export const areasCreate = internalMutation({
  args: { ownerId: v.string(), ...V.areaCreate },
  returns: V.area,
  handler: (ctx, { ownerId, ...args }) => areas.create(ctx, ownerId, args),
});

export const areasUpdate = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("areas"), patch: V.areaPatch } },
  returns: V.area,
  handler: (ctx, { ownerId, ...args }) => areas.update(ctx, ownerId, args),
});

export const areasRemove = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("areas") } },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => areas.remove(ctx, ownerId, args),
});

export const projectsList = internalQuery({
  args: { ownerId: v.string(), ...{} },
  returns: v.array(V.project),
  handler: (ctx, { ownerId, ...args }) => projects.list(ctx, ownerId, args),
});

export const projectsGet = internalQuery({
  args: { ownerId: v.string(), ...{ id: v.id("projects") } },
  returns: V.project,
  handler: (ctx, { ownerId, ...args }) => projects.get(ctx, ownerId, args),
});

export const projectsCreate = internalMutation({
  args: { ownerId: v.string(), ...V.projectCreate },
  returns: V.project,
  handler: (ctx, { ownerId, ...args }) => projects.create(ctx, ownerId, args),
});

export const projectsUpdate = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("projects"), patch: V.projectPatch } },
  returns: V.project,
  handler: (ctx, { ownerId, ...args }) => projects.update(ctx, ownerId, args),
});

export const projectsRemove = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("projects") } },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => projects.remove(ctx, ownerId, args),
});

export const goalsList = internalQuery({
  args: { ownerId: v.string(), ...{} },
  returns: v.array(V.goalWithProgress),
  handler: (ctx, { ownerId, ...args }) => goals.list(ctx, ownerId, args),
});

export const goalsGet = internalQuery({
  args: { ownerId: v.string(), ...{ id: v.id("goals") } },
  returns: V.goal,
  handler: (ctx, { ownerId, ...args }) => goals.get(ctx, ownerId, args),
});

export const goalsCreate = internalMutation({
  args: { ownerId: v.string(), ...V.goalCreate },
  returns: V.goal,
  handler: (ctx, { ownerId, ...args }) => goals.create(ctx, ownerId, args),
});

export const goalsUpdate = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("goals"), patch: V.goalPatch } },
  returns: V.goal,
  handler: (ctx, { ownerId, ...args }) => goals.update(ctx, ownerId, args),
});

export const goalsRemove = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("goals") } },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => goals.remove(ctx, ownerId, args),
});

export const eventsList = internalQuery({
  args: { ownerId: v.string(), ...{} },
  returns: v.array(V.event),
  handler: (ctx, { ownerId, ...args }) => events.list(ctx, ownerId, args),
});

export const eventsGet = internalQuery({
  args: { ownerId: v.string(), ...{ id: v.id("events") } },
  returns: V.event,
  handler: (ctx, { ownerId, ...args }) => events.get(ctx, ownerId, args),
});

export const eventsCreate = internalMutation({
  args: { ownerId: v.string(), ...V.eventCreate },
  returns: V.event,
  handler: (ctx, { ownerId, ...args }) => events.create(ctx, ownerId, args),
});

export const eventsUpdate = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("events"), patch: V.eventPatch } },
  returns: V.event,
  handler: (ctx, { ownerId, ...args }) => events.update(ctx, ownerId, args),
});

export const eventsRemove = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("events") } },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => events.remove(ctx, ownerId, args),
});

export const tasksList = internalQuery({
  args: { ownerId: v.string(), ...{ status: v.optional(V.taskStatus), limit: v.optional(v.number()) } },
  returns: v.array(V.task),
  handler: (ctx, { ownerId, ...args }) => tasks.list(ctx, ownerId, args),
});

export const tasksGet = internalQuery({
  args: { ownerId: v.string(), ...{ id: v.id("tasks") } },
  returns: V.task,
  handler: (ctx, { ownerId, ...args }) => tasks.get(ctx, ownerId, args),
});

export const tasksCreate = internalMutation({
  args: { ownerId: v.string(), ...V.taskCreate },
  returns: V.task,
  handler: (ctx, { ownerId, ...args }) => tasks.create(ctx, ownerId, args),
});

export const tasksUpdate = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("tasks"), patch: V.taskPatch } },
  returns: V.task,
  handler: (ctx, { ownerId, ...args }) => tasks.update(ctx, ownerId, args),
});

export const tasksRemove = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("tasks") } },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => tasks.remove(ctx, ownerId, args),
});

export const habitsList = internalQuery({
  args: { ownerId: v.string(), ...{} },
  returns: v.array(V.habit),
  handler: (ctx, { ownerId, ...args }) => habits.list(ctx, ownerId, args),
});

export const habitsGet = internalQuery({
  args: { ownerId: v.string(), ...{ id: v.id("habits") } },
  returns: V.habit,
  handler: (ctx, { ownerId, ...args }) => habits.get(ctx, ownerId, args),
});

export const habitsCreate = internalMutation({
  args: { ownerId: v.string(), ...V.habitCreate },
  returns: V.habit,
  handler: (ctx, { ownerId, ...args }) => habits.create(ctx, ownerId, args),
});

export const habitsUpdate = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("habits"), patch: V.habitPatch } },
  returns: V.habit,
  handler: (ctx, { ownerId, ...args }) => habits.update(ctx, ownerId, args),
});

export const habitsRemove = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("habits") } },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => habits.remove(ctx, ownerId, args),
});

export const tasksComplete = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("tasks") } },
  returns: V.task,
  handler: (ctx, { ownerId, ...args }) => tasks.complete(ctx, ownerId, args),
});

export const tasksReopen = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("tasks") } },
  returns: V.task,
  handler: (ctx, { ownerId, ...args }) => tasks.reopen(ctx, ownerId, args),
});

export const tasksQuickAdd = internalMutation({
  args: { ownerId: v.string(), ...{ text: v.string(), today: v.string() } },
  returns: V.task,
  handler: (ctx, { ownerId, ...args }) => tasks.quickAdd(ctx, ownerId, args),
});

export const tasksSearch = internalQuery({
  args: { ownerId: v.string(), ...{ query: v.string(), limit: v.optional(v.number()) } },
  returns: v.array(V.task),
  handler: (ctx, { ownerId, ...args }) => tasks.search(ctx, ownerId, args),
});

export const dayGet = internalQuery({
  args: { ownerId: v.string(), ...{ date: v.string() } },
  returns: V.day,
  handler: (ctx, { ownerId, ...args }) => day.get(ctx, ownerId, args),
});

export const weekGet = internalQuery({
  args: { ownerId: v.string(), ...{ startDate: v.string() } },
  returns: v.array(V.weekDay),
  handler: (ctx, { ownerId, ...args }) => week.get(ctx, ownerId, args),
});

export const profilesGet = internalQuery({
  args: { ownerId: v.string(), ...{} },
  returns: v.union(V.profile, v.null()),
  handler: (ctx, { ownerId, ...args }) => profiles.get(ctx, ownerId, args),
});

export const profilesEnsure = internalMutation({
  args: { ownerId: v.string(), ...{ timezone: v.optional(v.string()) } },
  returns: V.profile,
  handler: (ctx, { ownerId, ...args }) => profiles.ensure(ctx, ownerId, args),
});

export const profilesUpdate = internalMutation({
  args: { ownerId: v.string(), ...{ patch: V.profilePatch } },
  returns: V.profile,
  handler: (ctx, { ownerId, ...args }) => profiles.update(ctx, ownerId, args),
});

export const profilesCompleteOnboarding = internalMutation({
  args: { ownerId: v.string(), ...{} },
  returns: V.profile,
  handler: (ctx, { ownerId, ...args }) => profiles.completeOnboarding(ctx, ownerId, args),
});

export const profilesResetAll = internalMutation({
  args: { ownerId: v.string(), ...{} },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => profiles.resetAll(ctx, ownerId, args),
});

export const goalsCreateMilestone = internalMutation({
  args: { ownerId: v.string(), ...V.milestoneCreate },
  returns: V.milestone,
  handler: (ctx, { ownerId, ...args }) => goals.createMilestone(ctx, ownerId, args),
});

export const goalsUpdateMilestone = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("milestones"), patch: V.milestonePatch } },
  returns: V.milestone,
  handler: (ctx, { ownerId, ...args }) => goals.updateMilestone(ctx, ownerId, args),
});

export const goalsRemoveMilestone = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("milestones") } },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => goals.removeMilestone(ctx, ownerId, args),
});

export const habitsListLogs = internalQuery({
  args: { ownerId: v.string(), ...{ habitId: v.id("habits") } },
  returns: v.array(V.habitLog),
  handler: (ctx, { ownerId, ...args }) => habits.listLogs(ctx, ownerId, args),
});

export const habitsLog = internalMutation({
  args: { ownerId: v.string(), ...{ habitId: v.id("habits"), date: v.string() } },
  returns: V.habitLog,
  handler: (ctx, { ownerId, ...args }) => habits.log(ctx, ownerId, args),
});

export const habitsRemoveLog = internalMutation({
  args: { ownerId: v.string(), ...{ id: v.id("habitLogs") } },
  returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => habits.removeLog(ctx, ownerId, args),
});

export const claimNonce = internalMutation({
  args: { ownerId: v.string(), timestamp: v.number(), nonce: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (Math.abs(Date.now() - args.timestamp) > 300_000) throw new Error("Expired service request.");
    const existing = await ctx.db.query("serviceNonces").withIndex("by_nonce", (q) => q.eq("nonce", args.nonce)).first();
    if (existing) throw new Error("Reused service nonce. Sign a request with a new nonce.");
    const now = Date.now();
    // Global auth infrastructure, not user data: resetAll must not erase replay guards.
    await ctx.db.insert("serviceNonces", { ownerId: "service", nonce: args.nonce, createdAt: now, updatedAt: now, expiresAt: args.timestamp + 600_000 });
    return null;
  },
});
export const resetBatch = internalMutation({
  args: { ownerId: v.string(), upTo: v.number() }, returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => profiles.resetBatch(ctx, ownerId, args),
});
const cleanupRef = makeFunctionReference<"mutation", Record<string, never>, null>("serviceInternal:cleanupNonces");
export const cleanupNonces = internalMutation({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    const rows = await ctx.db.query("serviceNonces").withIndex("by_expires", (q) => q.lt("expiresAt", Date.now())).take(100);
    for (const row of rows) await ctx.db.delete(row._id);
    if (rows.length === 100) await ctx.scheduler.runAfter(0, cleanupRef, {});
    return null;
  },
});
