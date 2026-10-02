import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { PlanInput, PlanResult, TaskPatch } from "../validators";
import { caps } from "./shared";
import * as areas from "./areas";
import * as projects from "./projects";
import * as events from "./events";
import * as goals from "./goals";
import * as tasks from "./tasks";
import * as habits from "./habits";

type Kind = "area" | "project" | "event" | "goal" | "task" | "habit";
type Item = PlanResult["items"][number];
type Named = { _id: string; name: string; path?: string };
export const PLAN_MAX_ITEMS = 200;
const MAX_ACTIVE_TASKS = 5000;
const key = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const sameDays = (left: number[], right: number[]) => [...new Set(left)].sort().join() === [...new Set(right)].sort().join();

function message(error: unknown) {
  // Model rules throw ConvexError with a sentence; anything else stays private.
  return error instanceof ConvexError && typeof error.data === "string" ? error.data : "Check this item and try again.";
}

/**
 * Store a whole plan in one transaction: any failing item rolls back every write.
 * Items that already exist are reported, and patched only when `onExisting` is "update".
 */
export async function apply(ctx: MutationCtx, ownerId: string, plan: PlanInput): Promise<PlanResult> {
  const lists = { area: plan.areas ?? [], project: plan.projects ?? [], event: plan.events ?? [], goal: plan.goals ?? [], task: plan.tasks ?? [], habit: plan.habits ?? [] };
  const total = Object.values(lists).reduce((sum, rows) => sum + rows.length, 0);
  if (total === 0) throw new ConvexError("Plan has no items. Add areas, projects, events, goals, tasks or habits.");
  if (total > PLAN_MAX_ITEMS) throw new ConvexError(`Plan has ${total} items. Send at most ${PLAN_MAX_ITEMS} per call.`);
  const update = plan.onExisting === "update";
  const items: Item[] = [];
  const refs = new Map<string, { kind: Kind; id: string }>();
  const seen = new Set<string>();
  for (const [kind, rows] of Object.entries(lists))
    for (const [index, row] of rows.entries()) {
      if (row.ref === undefined) continue;
      const ref = key(row.ref);
      if (!ref || seen.has(ref)) throw new ConvexError(`${kind}s[${index}]: Plan ref "${row.ref}" is empty or used twice. Give each item its own ref.`);
      seen.add(ref);
    }

  const record = (kind: Kind, index: number, ref: string | undefined, name: string, id: string, status: "created" | "exists" | "updated") => {
    if (ref !== undefined) refs.set(key(ref), { kind, id });
    items.push({ kind, index, ref: ref ?? null, name, id, status });
  };
  async function each<T>(kind: Kind, rows: readonly T[], run: (row: T, index: number) => Promise<void>) {
    for (const [index, row] of rows.entries()) {
      try { await run(row, index); }
      catch (error) { throw new ConvexError(`${kind}s[${index}]: ${message(error)}`); }
    }
  }
  function pick<T extends Named>(kind: Kind, reference: string, rows: readonly T[]): T["_id"] {
    const local = refs.get(key(reference));
    if (local) {
      if (local.kind !== kind) throw new ConvexError(`Plan ref "${reference}" names a ${local.kind}, not a ${kind}.`);
      return local.id as T["_id"];
    }
    const byId = rows.find(row => row._id === reference);
    if (byId) return byId._id;
    const matches = rows.filter(row => key(row.name) === key(reference) || (row.path !== undefined && key(row.path) === key(reference)));
    if (matches.length > 1) throw new ConvexError(`More than one ${kind} is named "${reference}". Use its ID or its "Area / Name" path.`);
    if (!matches[0]) throw new ConvexError(`${kind.charAt(0).toUpperCase()}${kind.slice(1)} "${reference}" not found. Add it to the plan or use an existing name or ID.`);
    return matches[0]._id;
  }
  const changed = <T extends object>(patch: T) => Object.values(patch).some(value => value !== undefined);

  // Areas first: everything else can point at them.
  const areaRows = await areas.list(ctx, ownerId);
  await each("area", lists.area, async (row, index) => {
    const existing = areaRows.find(area => key(area.name) === key(row.name));
    if (!existing) {
      const created = await areas.create(ctx, ownerId, { name: row.name, ...(row.color ? { color: row.color } : {}) });
      areaRows.push(created);
      return record("area", index, row.ref, created.name, created._id, "created");
    }
    if (update && row.color && row.color !== existing.color) {
      await areas.update(ctx, ownerId, { id: existing._id, patch: { color: row.color } });
      return record("area", index, row.ref, existing.name, existing._id, "updated");
    }
    record("area", index, row.ref, existing.name, existing._id, "exists");
  });
  const areaId = (reference: string) => pick("area", reference, areaRows) as Id<"areas">;
  const areaName = (id: string) => areaRows.find(area => area._id === id)?.name ?? "Area";

  const projectRows = await projects.list(ctx, ownerId);
  const projectNamed = () => projectRows.map(row => ({ ...row, path: `${areaName(row.areaId)} / ${row.name}` }));
  await each("project", lists.project, async (row, index) => {
    const area = areaId(row.area);
    const existing = projectRows.find(project => project.areaId === area && key(project.name) === key(row.name));
    if (!existing) {
      const created = await projects.create(ctx, ownerId, { areaId: area, name: row.name, ...(row.kind ? { kind: row.kind } : {}), ...(row.note !== undefined ? { note: row.note } : {}) });
      projectRows.push(created);
      return record("project", index, row.ref, created.name, created._id, "created");
    }
    const patch = { kind: row.kind !== existing.kind ? row.kind : undefined, note: row.note !== undefined && row.note !== existing.note ? row.note : undefined, archivedAt: existing.archivedAt !== null ? null : undefined };
    if (update && changed(patch)) {
      await projects.update(ctx, ownerId, { id: existing._id, patch: Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) });
      return record("project", index, row.ref, existing.name, existing._id, "updated");
    }
    record("project", index, row.ref, existing.name, existing._id, "exists");
  });

  const eventRows = await events.list(ctx, ownerId);
  await each("event", lists.event, async (row, index) => {
    const area = row.area ? areaId(row.area) : row.area === null ? null : undefined;
    const existing = eventRows.find(event => key(event.title) === key(row.title) && event.startTime === row.startTime.trim() && sameDays(event.weekdays, row.weekdays));
    if (!existing) {
      const created = await events.create(ctx, ownerId, { title: row.title, weekdays: row.weekdays, startTime: row.startTime, endTime: row.endTime, fromDate: row.fromDate, areaId: area ?? null, ...(row.location !== undefined ? { location: row.location } : {}), ...(row.untilDate !== undefined ? { untilDate: row.untilDate } : {}) });
      eventRows.push(created);
      return record("event", index, row.ref, created.title, created._id, "created");
    }
    const patch = { endTime: row.endTime !== existing.endTime ? row.endTime : undefined, location: row.location !== undefined && row.location !== existing.location ? row.location : undefined, fromDate: row.fromDate !== existing.fromDate ? row.fromDate : undefined, untilDate: row.untilDate !== undefined && row.untilDate !== existing.untilDate ? row.untilDate : undefined, areaId: area !== undefined && area !== existing.areaId ? area : undefined };
    if (update && changed(patch)) {
      await events.update(ctx, ownerId, { id: existing._id, patch: Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) });
      return record("event", index, row.ref, existing.title, existing._id, "updated");
    }
    record("event", index, row.ref, existing.title, existing._id, "exists");
  });

  const goalRows = await ctx.db.query("goals").withIndex("by_owner", q => q.eq("ownerId", ownerId)).take(caps.goals);
  await each("goal", lists.goal, async (row, index) => {
    const area = areaId(row.area);
    const existing = goalRows.find(goal => key(goal.title) === key(row.title) && goal.status !== "archived");
    if (!existing) {
      const created = await goals.create(ctx, ownerId, { areaId: area, title: row.title, startDate: plan.today, ...(row.note !== undefined ? { note: row.note } : {}), ...(row.targetDate !== undefined ? { targetDate: row.targetDate } : {}), ...(row.metric ? { metric: row.metric } : {}) });
      goalRows.push(created);
      return record("goal", index, row.ref, created.title, created._id, "created");
    }
    const patch = { note: row.note !== undefined && row.note !== existing.note ? row.note : undefined, targetDate: row.targetDate !== undefined && row.targetDate !== existing.targetDate ? row.targetDate : undefined };
    if (update && changed(patch)) {
      await goals.update(ctx, ownerId, { id: existing._id, patch: Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) });
      return record("goal", index, row.ref, existing.title, existing._id, "updated");
    }
    record("goal", index, row.ref, existing.title, existing._id, "exists");
  });
  const goalNamed = () => goalRows.map(goal => ({ _id: goal._id, name: goal.title }));

  // One cap check for the batch: the per-task scan would exceed transaction read limits.
  const activeTasks: Doc<"tasks">[] = await ctx.db.query("tasks").withIndex("by_owner_status", q => q.eq("ownerId", ownerId).eq("status", "active")).take(MAX_ACTIVE_TASKS);
  let activeCount = activeTasks.length;
  await each("task", lists.task, async (row, index) => {
    const { ref, area: areaRef, project: projectRef, goal: goalRef, ...fields } = row;
    const area = areaRef ? areaId(areaRef) : undefined;
    const project = projectRef === null ? null : projectRef ? pick("project", projectRef, projectNamed().filter(item => !area || item.areaId === area)) as Id<"projects"> : undefined;
    const goal = goalRef === null ? null : goalRef ? pick("goal", goalRef, goalNamed()) as Id<"goals"> : undefined;
    const projectArea = project ? projectRows.find(item => item._id === project)?.areaId : undefined;
    const resolvedArea = area ?? projectArea ?? areaRows[0]?._id;
    const date = fields.date ?? null, deadline = fields.deadline ?? null;
    const existing = activeTasks.find(task => key(task.title) === key(row.title) && task.areaId === resolvedArea && (
      // A completed repeat moves its date forward, so a repeating task matches on its title alone.
      task.repeat !== null || (date === null && deadline === null && task.date === null && task.deadline === null) || (date !== null && task.date === date) || (deadline !== null && task.deadline === deadline)));
    const patch: TaskPatch = { ...fields, ...(area ? { areaId: area } : {}), ...(project !== undefined ? { projectId: project } : {}), ...(goal !== undefined ? { goalId: goal } : {}) };
    if (!existing) {
      if (activeCount >= MAX_ACTIVE_TASKS) throw new ConvexError(`Limit of ${MAX_ACTIVE_TASKS} active tasks reached. Complete or remove tasks before adding another.`);
      const created = await tasks.insert(ctx, ownerId, { ...patch, title: row.title });
      activeTasks.push(created); activeCount++;
      return record("task", index, ref, created.title, created._id, "created");
    }
    if (update) {
      const updated = await tasks.update(ctx, ownerId, { id: existing._id, patch });
      if (JSON.stringify({ ...updated, updatedAt: 0 }) !== JSON.stringify({ ...existing, updatedAt: 0 }))
        return record("task", index, ref, existing.title, existing._id, "updated");
    }
    record("task", index, ref, existing.title, existing._id, "exists");
  });

  const habitRows = await habits.list(ctx, ownerId);
  await each("habit", lists.habit, async (row, index) => {
    const area = areaId(row.area);
    const existing = habitRows.find(habit => key(habit.title) === key(row.title));
    if (!existing) {
      const created = await habits.create(ctx, ownerId, { areaId: area, title: row.title, weeklyTarget: row.weeklyTarget });
      habitRows.push(created);
      return record("habit", index, row.ref, created.title, created._id, "created");
    }
    const patch = { weeklyTarget: row.weeklyTarget !== existing.weeklyTarget ? row.weeklyTarget : undefined, archivedAt: existing.archivedAt !== null ? null : undefined };
    if (update && changed(patch)) {
      await habits.update(ctx, ownerId, { id: existing._id, patch: Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) });
      return record("habit", index, row.ref, existing.title, existing._id, "updated");
    }
    record("habit", index, row.ref, existing.title, existing._id, "exists");
  });

  const result: PlanResult = { dryRun: plan.dryRun, items };
  // A dry run performs every write for full validation, then throws so Convex rolls them all back.
  if (plan.dryRun) throw new ConvexError({ kind: "PLAN_PREVIEW", result: preview(result) });
  return result;
}

function preview(result: PlanResult): PlanResult {
  return { dryRun: true, items: result.items.map(item => item.status === "created" ? { ...item, status: "would_create", id: null } : item.status === "updated" ? { ...item, status: "would_update" } : item) };
}
export function isPreview(data: unknown): data is { kind: "PLAN_PREVIEW"; result: PlanResult } {
  return typeof data === "object" && data !== null && "kind" in data && data.kind === "PLAN_PREVIEW" && "result" in data;
}
