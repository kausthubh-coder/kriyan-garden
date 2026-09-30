import { v, type Infer } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import * as V from "../validators";
import { checkCap, owned, stamps, text, date, nullableDate, finite } from "./shared";
const createArgs = v.object(V.goalCreate);
const milestoneArgs = v.object(V.milestoneCreate);
function cleanMetric(value: Infer<typeof V.metric>) {
  if (value.kind !== "number") return value;
  return { ...value, unit: text(value.unit, 48, true), target: finite(value.target), current: finite(value.current) };
}
export async function list(ctx: QueryCtx, ownerId: string, _args = {}) {
  const goals = await ctx.db.query("goals").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(100);
  return Promise.all(goals.map(async (goal) => {
    let total = 0, done = 0;
    for await (const task of ctx.db.query("tasks").withIndex("by_owner_goal", (q) => q.eq("ownerId", ownerId).eq("goalId", goal._id))) {
      total++; if (task.status === "completed") done++;
    }
    const milestones = await ctx.db.query("milestones").withIndex("by_owner_goal", (q) => q.eq("ownerId", ownerId).eq("goalId", goal._id)).take(1000);
    return { ...goal, linkedTasks: { total, done }, milestones: milestones.sort((a, b) => a.sortOrder - b.sortOrder) };
  }));
}
export const get = (ctx: QueryCtx, ownerId: string, args: { id: Id<"goals"> }) => owned(ctx, ownerId, args.id);
export async function create(ctx: MutationCtx, ownerId: string, args: Infer<typeof createArgs>) {
  const count = await checkCap(ctx, ownerId, "goals");
  await owned(ctx, ownerId, args.areaId);
  const id = await ctx.db.insert("goals", { ...stamps(ownerId), ...args, title: text(args.title, 120, true), note: text(args.note ?? "", 180), startDate: date(args.startDate), targetDate: nullableDate(args.targetDate ?? null), metric: cleanMetric(args.metric ?? { kind: "tasks" }), status: args.status ?? "active", sortOrder: finite(args.sortOrder ?? count) });
  return owned(ctx, ownerId, id);
}
export async function update(ctx: MutationCtx, ownerId: string, args: { id: Id<"goals">; patch: Infer<typeof V.goalPatch> }) {
  await owned(ctx, ownerId, args.id);
  const patch = { ...args.patch, updatedAt: Date.now() };
  if (patch.areaId !== undefined) await owned(ctx, ownerId, patch.areaId);
  if (patch.title !== undefined) patch.title = text(patch.title, 120, true);
  if (patch.note !== undefined) patch.note = text(patch.note, 180);
  if (patch.startDate !== undefined) patch.startDate = date(patch.startDate);
  if (patch.targetDate !== undefined) patch.targetDate = nullableDate(patch.targetDate);
  if (patch.metric !== undefined) patch.metric = cleanMetric(patch.metric);
  if (patch.sortOrder !== undefined) finite(patch.sortOrder);
  await ctx.db.patch(args.id, patch);
  return owned(ctx, ownerId, args.id);
}
export async function remove(ctx: MutationCtx, ownerId: string, args: { id: Id<"goals"> }) {
  await owned(ctx, ownerId, args.id);
  if (await ctx.db.query("tasks").withIndex("by_owner_goal", (q) => q.eq("ownerId", ownerId).eq("goalId", args.id)).first() || await ctx.db.query("milestones").withIndex("by_owner_goal", (q) => q.eq("ownerId", ownerId).eq("goalId", args.id)).first()) throw new Error("Goal has linked tasks or milestones. Remove those links first.");
  await ctx.db.delete(args.id);
  return null;
}
export async function createMilestone(ctx: MutationCtx, ownerId: string, args: Infer<typeof milestoneArgs>) {
  await owned(ctx, ownerId, args.goalId);
  const id = await ctx.db.insert("milestones", { ...stamps(ownerId), ...args, title: text(args.title, 180, true), targetDate: nullableDate(args.targetDate ?? null), doneAt: args.doneAt ?? null, sortOrder: finite(args.sortOrder ?? 0) });
  return owned(ctx, ownerId, id);
}
export async function updateMilestone(ctx: MutationCtx, ownerId: string, args: { id: Id<"milestones">; patch: Infer<typeof V.milestonePatch> }) {
  await owned(ctx, ownerId, args.id);
  const patch = { ...args.patch, updatedAt: Date.now() };
  if (patch.title !== undefined) patch.title = text(patch.title, 180, true);
  if (patch.targetDate !== undefined) patch.targetDate = nullableDate(patch.targetDate);
  await ctx.db.patch(args.id, patch);
  return owned(ctx, ownerId, args.id);
}
export async function removeMilestone(ctx: MutationCtx, ownerId: string, args: { id: Id<"milestones"> }) {
  await owned(ctx, ownerId, args.id); await ctx.db.delete(args.id); return null;
}

/** Delete and detach in one transaction so a failed deletion leaves no partial changes. */
export async function deleteForUndo(ctx: MutationCtx, ownerId: string, args: { id: Id<"goals"> }) {
  const goal = await owned(ctx, ownerId, args.id);
  const tasks = await ctx.db.query("tasks").withIndex("by_owner_goal", q => q.eq("ownerId", ownerId).eq("goalId", goal._id)).take(5001);
  const milestones = await ctx.db.query("milestones").withIndex("by_owner_goal", q => q.eq("ownerId", ownerId).eq("goalId", goal._id)).take(1001);
  if (tasks.length > 5000 || milestones.length > 1000) throw new Error("Goal has too many linked records to delete at once. Remove some links and try again.");
  const updatedAt = Date.now();
  for (const task of tasks) await ctx.db.patch(task._id, { goalId: null, updatedAt });
  for (const milestone of milestones) await ctx.db.delete(milestone._id);
  await ctx.db.delete(goal._id);
  return { goal, milestones, tasks: tasks.map(task => ({ id: task._id, updatedAt })) };
}

/** Reuse validated operations and never overwrite a task changed since deletion. */
export async function restore(ctx: MutationCtx, ownerId: string, args: { snapshot: Infer<typeof V.deletedGoal> }) {
  const { goal, milestones, tasks } = args.snapshot;
  if (goal.ownerId !== ownerId || milestones.some(row => row.ownerId !== ownerId || row.goalId !== goal._id)) throw new Error("Deleted goal not found.");
  if (tasks.length > 5000 || milestones.length > 1000) throw new Error("Too many records to restore. Try again with fewer records.");
  if (await ctx.db.get(goal._id)) throw new Error("Goal already exists. Refresh your planner.");
  const restored = await create(ctx, ownerId, {
    title: goal.title, areaId: goal.areaId, note: goal.note, startDate: goal.startDate,
    targetDate: goal.targetDate, metric: goal.metric, status: goal.status, sortOrder: goal.sortOrder,
  });
  for (const milestone of milestones) await createMilestone(ctx, ownerId, {
    goalId: restored._id, title: milestone.title, targetDate: milestone.targetDate,
    doneAt: milestone.doneAt, sortOrder: milestone.sortOrder,
  });
  for (const reference of tasks) {
    const task = await ctx.db.get(reference.id);
    if (task && task.ownerId !== ownerId) throw new Error("Linked task not found.");
    if (task && task.goalId === null && task.updatedAt === reference.updatedAt)
      await ctx.db.patch(task._id, { goalId: restored._id, updatedAt: Date.now() });
  }
  return restored;
}
