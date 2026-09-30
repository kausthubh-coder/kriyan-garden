import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const regionColors = ["#637b54", "#bb6546", "#c5a04f", "#8a7c6c", "#6f7784", "#8a6f86"];

export async function requireOwnerId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

export function horizonFromDueDate(dueDate: string | null) {
  if (!dueDate) return "someday" as const;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const due = new Date(`${dueDate}T00:00:00.000Z`);
  if (Number.isNaN(due.getTime())) return "someday" as const;
  const daysAway = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (daysAway <= 7) return "now" as const;
  if (daysAway <= 90) return "season" as const;
  return "someday" as const;
}

export function regionDto(region: Doc<"regions">) {
  return {
    id: region._id as string,
    name: region.name,
    color: region.color,
    note: region.note,
    sortOrder: region.sortOrder,
  };
}

export function taskDto(task: Doc<"tasks">) {
  return {
    id: task._id as string,
    title: task.title,
    regionId: task.regionId ? (task.regionId as string) : null,
    horizon: horizonFromDueDate(task.dueDate),
    dueDate: task.dueDate,
    time: task.time,
    durationMinutes: task.durationMinutes,
    repeatRule: task.repeatRule,
    reminders: task.reminders,
    content: task.content,
    status: task.status,
    completedAt: task.completedAt,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function taskSummaryDto(task: Doc<"tasks">) {
  const { content, ...summary } = taskDto(task);
  void content;
  return summary;
}

export function cleanDuration(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, Math.min(Math.round(value), 1440));
}

export function cleanText(value: string, maximum = 180) {
  return value.trim().slice(0, maximum);
}

export function cleanNullableText(value: string | null, maximum = 180) {
  if (value === null) return null;
  const cleaned = cleanText(value, maximum);
  return cleaned || null;
}

export function cleanContent(value: string) {
  return value.slice(0, 100_000);
}

export function cleanReminders(values: string[]) {
  return values.map((value) => cleanText(value, 100)).filter(Boolean).slice(0, 8);
}

export function searchText(title: string, content: string) {
  return `${title} ${content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")}`.slice(0, 120_000);
}

export async function assertRegionOwner(
  ctx: QueryCtx | MutationCtx,
  ownerId: string,
  regionId: Id<"regions"> | null,
) {
  if (!regionId) return;
  const region = await ctx.db.get(regionId);
  if (!region || region.ownerId !== ownerId) throw new Error("Space not found");
}

export async function getOwnedTask(
  ctx: QueryCtx | MutationCtx,
  ownerId: string,
  taskId: Id<"tasks">,
) {
  const task = await ctx.db.get(taskId);
  if (!task || task.ownerId !== ownerId) throw new Error("Task not found");
  return task;
}
