import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  assertRegionOwner,
  cleanContent,
  cleanDuration,
  cleanNullableText,
  cleanReminders,
  cleanText,
  getOwnedTask,
  regionColors,
  regionDto,
  searchText,
  taskDto,
} from "./helpers";

export const maxRegions = 100;

export type TaskFields = {
  title: string;
  regionId: Id<"regions"> | null;
  dueDate: string | null;
  time: string | null;
  durationMinutes: number | null;
  repeatRule: string | null;
  reminders: string[];
  content: string;
};

export async function createRegionFor(ctx: MutationCtx, ownerId: string, rawName: string) {
  const name = cleanText(rawName, 48);
  if (!name) throw new Error("A space needs a name");
  const existing = await ctx.db
    .query("regions")
    .withIndex("by_owner_id_and_sort_order", (q) => q.eq("ownerId", ownerId))
    .order("desc")
    .take(maxRegions);
  if (existing.length >= maxRegions) throw new Error("This garden has no room for another space");
  const sortOrder = (existing[0]?.sortOrder ?? -1) + 1;
  const timestamp = new Date().toISOString();
  const id = await ctx.db.insert("regions", {
    ownerId,
    name,
    color: regionColors[sortOrder % regionColors.length],
    note: "Nothing planted.",
    sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const region = await ctx.db.get(id);
  if (!region) throw new Error("Space could not be created");
  return regionDto(region);
}

export async function createTaskFor(ctx: MutationCtx, ownerId: string, fields: TaskFields) {
  await assertRegionOwner(ctx, ownerId, fields.regionId);
  const title = cleanText(fields.title);
  if (!title) throw new Error("A task needs a title");
  const last = await ctx.db
    .query("tasks")
    .withIndex("by_owner_id_and_sort_order", (q) => q.eq("ownerId", ownerId))
    .order("desc")
    .first();
  const timestamp = new Date().toISOString();
  const content = cleanContent(fields.content);
  const id = await ctx.db.insert("tasks", {
    ownerId,
    title,
    regionId: fields.regionId,
    dueDate: cleanNullableText(fields.dueDate, 10),
    time: cleanNullableText(fields.time, 40),
    durationMinutes: cleanDuration(fields.durationMinutes),
    repeatRule: cleanNullableText(fields.repeatRule, 180),
    reminders: cleanReminders(fields.reminders),
    content,
    status: "active",
    completedAt: null,
    sortOrder: (last?.sortOrder ?? -1) + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    searchText: searchText(title, content),
  });
  const task = await ctx.db.get(id);
  if (!task) throw new Error("Task could not be created");
  return taskDto(task);
}

export async function updateTaskFor(ctx: MutationCtx, ownerId: string, id: Id<"tasks">, fields: Partial<TaskFields>) {
  const task = await getOwnedTask(ctx, ownerId, id);
  if (fields.regionId !== undefined) await assertRegionOwner(ctx, ownerId, fields.regionId);
  const patch: Partial<Omit<Doc<"tasks">, "_id" | "_creationTime">> = { updatedAt: new Date().toISOString() };
  if (fields.title !== undefined) {
    const title = cleanText(fields.title);
    if (!title) throw new Error("A task needs a title");
    patch.title = title;
  }
  if (fields.regionId !== undefined) patch.regionId = fields.regionId;
  if (fields.dueDate !== undefined) patch.dueDate = cleanNullableText(fields.dueDate, 10);
  if (fields.time !== undefined) patch.time = cleanNullableText(fields.time, 40);
  if (fields.durationMinutes !== undefined) patch.durationMinutes = cleanDuration(fields.durationMinutes);
  if (fields.repeatRule !== undefined) patch.repeatRule = cleanNullableText(fields.repeatRule, 180);
  if (fields.reminders !== undefined) patch.reminders = cleanReminders(fields.reminders);
  if (fields.content !== undefined) patch.content = cleanContent(fields.content);
  patch.searchText = searchText(patch.title ?? task.title, patch.content ?? task.content);
  await ctx.db.patch(id, patch);
  const updated = await ctx.db.get(id);
  if (!updated) throw new Error("Task not found");
  return taskDto(updated);
}

export async function completeTaskFor(ctx: MutationCtx, ownerId: string, id: Id<"tasks">, completed: boolean) {
  await getOwnedTask(ctx, ownerId, id);
  const timestamp = new Date().toISOString();
  await ctx.db.patch(id, {
    status: completed ? "completed" : "active",
    completedAt: completed ? timestamp : null,
    updatedAt: timestamp,
  });
  const updated = await ctx.db.get(id);
  if (!updated) throw new Error("Task not found");
  return taskDto(updated);
}
