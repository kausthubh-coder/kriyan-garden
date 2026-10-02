import { v, ConvexError } from "convex/values";
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
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
import * as plan from "./model/plan";

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
export const goalsSetProgress = internalMutation({
  args: { ownerId: v.string(), id: v.id("goals"), current: v.number() }, returns: V.goal,
  handler: (ctx, { ownerId, ...args }) => goals.setProgress(ctx, ownerId, args),
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
export const tasksFilteredList = internalQuery({
  args: { ownerId: v.string(), ...V.taskFilters }, returns: v.array(V.task),
  handler: (ctx, { ownerId, ...args }) => tasks.filteredList(ctx, ownerId, args),
});
export const tasksCompleteWithNext = internalMutation({
  args: { ownerId: v.string(), id: v.id("tasks") },
  returns: v.object({ task: V.task, nextOccurrence: v.union(V.task, v.null()) }),
  handler: (ctx, { ownerId, ...args }) => tasks.completeWithNext(ctx, ownerId, args),
});
export const plannerContext = internalQuery({
  args: { ownerId: v.string() },
  returns: v.object({ profile: v.union(V.profile, v.null()), areas: v.array(V.area), projects: v.array(V.project) }),
  handler: async (ctx, { ownerId }) => {
    const [profile, ownerAreas, ownerProjects] = await Promise.all([profiles.get(ctx, ownerId), areas.list(ctx, ownerId), projects.list(ctx, ownerId)]);
    return { profile, areas: ownerAreas, projects: ownerProjects };
  },
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
  args: { ownerId: v.string(), timestamp: v.number(), nonce: v.string(), kind: v.union(v.literal("read"), v.literal("write")), invocation: v.optional(V.invocation) },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (Math.abs(Date.now() - args.timestamp) > 300_000) throw new Error("Expired service request.");
    const existing = await ctx.db.query("serviceNonces").withIndex("by_nonce", (q) => q.eq("nonce", args.nonce)).first();
    if (existing) throw new Error("Reused service nonce. Sign a request with a new nonce.");
    const now = Date.now();
    let debit = true;
    if (args.invocation) {
      if (!args.invocation.id || args.invocation.id.length > 200 || args.kind === "write" && args.invocation.kind !== "write") throw new Error("Invalid service invocation.");
      const requestId = args.invocation.id;
      const prior = await ctx.db.query("serviceInvocations").withIndex("by_owner_request", q => q.eq("ownerId", args.ownerId).eq("requestId", requestId)).first();
      if (prior) {
        if (prior.expiresAt <= now || prior.kind !== args.invocation.kind) throw new Error("Expired or invalid service invocation.");
        debit = false;
      } else {
        await ctx.db.insert("serviceInvocations", { ownerId: args.ownerId, requestId, kind: args.invocation.kind, expiresAt: now + 300000, createdAt: now, updatedAt: now });
      }
    }
    if (debit) {
      const kind = args.invocation?.kind ?? args.kind;
      const result = await serviceLimiter.limit(ctx, kind === "read" ? "serviceReads" : "serviceWrites", { key: args.ownerId });
      if (!result.ok) throw new ConvexError({ code: "RATE_LIMITED", message: "Too many calls. Wait a minute and try again.", retryAfter: result.retryAfter ?? 60000 });
    }
    // Global auth infrastructure, not user data: resetAll must not erase replay guards.
    await ctx.db.insert("serviceNonces", { ownerId: "service", nonce: args.nonce, createdAt: now, updatedAt: now, expiresAt: args.timestamp + 600_000 });
    return null;
  },
});
const serviceLimiter = new RateLimiter(components.rateLimiter, {
  serviceReads: { kind: "fixed window", rate: 60, period: MINUTE, start: 0 },
  serviceWrites: { kind: "fixed window", rate: 30, period: MINUTE, start: 0 },
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
    const invocations = await ctx.db.query("serviceInvocations").withIndex("by_expires", q => q.lt("expiresAt", Date.now())).take(100);
    for (const row of invocations) await ctx.db.delete(row._id);
    if (rows.length === 100 || invocations.length === 100) await ctx.scheduler.runAfter(0, cleanupRef, {});
    return null;
  },
});
export const areasReorder = internalMutation({
  args: { ownerId: v.string(), ids: v.array(v.id("areas")) }, returns: v.null(),
  handler: (ctx, { ownerId, ...args }) => areas.reorder(ctx, ownerId, args),
});
export const planApply = internalMutation({
  args: { ownerId: v.string(), ...V.planInput }, returns: V.planResult,
  handler: (ctx, { ownerId, ...args }) => plan.apply(ctx, ownerId, args),
});
