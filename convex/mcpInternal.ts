import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  assertRegionOwner,
  cleanContent,
  cleanNullableText,
  cleanReminders,
  cleanText,
  getOwnedTask,
  regionColors,
  regionDto,
  searchText,
  taskDto,
} from "./helpers";
import {
  regionDtoValidator,
  taskDtoValidator,
  taskFieldsValidator,
  taskPatchValidator,
  taskStatusValidator,
} from "./validators";

export const listTasks = internalQuery({
  args: {
    ownerId: v.string(),
    status: v.optional(taskStatusValidator),
    limit: v.number(),
  },
  returns: v.array(taskDtoValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit, 100));
    const tasks = args.status
      ? await ctx.db
          .query("tasks")
          .withIndex("by_owner_id_and_status", (q) => q.eq("ownerId", args.ownerId).eq("status", args.status!))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("tasks")
          .withIndex("by_owner_id_and_updated_at", (q) => q.eq("ownerId", args.ownerId))
          .order("desc")
          .take(limit);
    return tasks.map(taskDto);
  },
});

export const getTask = internalQuery({
  args: { ownerId: v.string(), id: v.id("tasks") },
  returns: v.union(taskDtoValidator, v.null()),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    return task && task.ownerId === args.ownerId ? taskDto(task) : null;
  },
});

export const listRegions = internalQuery({
  args: { ownerId: v.string() },
  returns: v.array(regionDtoValidator),
  handler: async (ctx, args) => {
    const regions = await ctx.db
      .query("regions")
      .withIndex("by_owner_id_and_sort_order", (q) => q.eq("ownerId", args.ownerId))
      .take(100);
    return regions.map(regionDto);
  },
});

export const searchNotes = internalQuery({
  args: { ownerId: v.string(), query: v.string(), limit: v.number() },
  returns: v.array(taskDtoValidator),
  handler: async (ctx, args) => {
    const queryText = cleanText(args.query, 200);
    if (!queryText) return [];
    const tasks = await ctx.db
      .query("tasks")
      .withSearchIndex("search_notes", (q) =>
        q.search("searchText", queryText).eq("ownerId", args.ownerId).eq("status", "active"),
      )
      .take(Math.max(1, Math.min(args.limit, 50)));
    return tasks.map(taskDto);
  },
});

export const createRegion = internalMutation({
  args: { ownerId: v.string(), name: v.string() },
  returns: regionDtoValidator,
  handler: async (ctx, args) => {
    const name = cleanText(args.name, 48);
    if (!name) throw new Error("A space needs a name");
    const last = await ctx.db
      .query("regions")
      .withIndex("by_owner_id_and_sort_order", (q) => q.eq("ownerId", args.ownerId))
      .order("desc")
      .first();
    const sortOrder = (last?.sortOrder ?? -1) + 1;
    const timestamp = new Date().toISOString();
    const id = await ctx.db.insert("regions", {
      ownerId: args.ownerId,
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
  },
});

export const createTask = internalMutation({
  args: { ownerId: v.string(), ...taskFieldsValidator },
  returns: taskDtoValidator,
  handler: async (ctx, args) => {
    await assertRegionOwner(ctx, args.ownerId, args.regionId);
    const title = cleanText(args.title);
    if (!title) throw new Error("A task needs a title");
    const last = await ctx.db
      .query("tasks")
      .withIndex("by_owner_id_and_sort_order", (q) => q.eq("ownerId", args.ownerId))
      .order("desc")
      .first();
    const timestamp = new Date().toISOString();
    const content = cleanContent(args.content);
    const id = await ctx.db.insert("tasks", {
      ownerId: args.ownerId,
      title,
      regionId: args.regionId,
      dueDate: cleanNullableText(args.dueDate, 10),
      time: cleanNullableText(args.time, 40),
      durationMinutes: args.durationMinutes && args.durationMinutes > 0 ? Math.min(args.durationMinutes, 1440) : null,
      repeatRule: cleanNullableText(args.repeatRule, 180),
      reminders: cleanReminders(args.reminders),
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
  },
});

export const updateTask = internalMutation({
  args: { ownerId: v.string(), id: v.id("tasks"), patch: taskPatchValidator },
  returns: taskDtoValidator,
  handler: async (ctx, args) => {
    const task = await getOwnedTask(ctx, args.ownerId, args.id);
    if (args.patch.regionId !== undefined) await assertRegionOwner(ctx, args.ownerId, args.patch.regionId);
    const patch: Partial<Omit<Doc<"tasks">, "_id" | "_creationTime">> = { updatedAt: new Date().toISOString() };
    if (args.patch.title !== undefined) {
      const title = cleanText(args.patch.title);
      if (!title) throw new Error("A task needs a title");
      patch.title = title;
    }
    if (args.patch.regionId !== undefined) patch.regionId = args.patch.regionId;
    if (args.patch.dueDate !== undefined) patch.dueDate = cleanNullableText(args.patch.dueDate, 10);
    if (args.patch.time !== undefined) patch.time = cleanNullableText(args.patch.time, 40);
    if (args.patch.durationMinutes !== undefined) patch.durationMinutes = args.patch.durationMinutes && args.patch.durationMinutes > 0 ? Math.min(args.patch.durationMinutes, 1440) : null;
    if (args.patch.repeatRule !== undefined) patch.repeatRule = cleanNullableText(args.patch.repeatRule, 180);
    if (args.patch.reminders !== undefined) patch.reminders = cleanReminders(args.patch.reminders);
    if (args.patch.content !== undefined) patch.content = cleanContent(args.patch.content);
    patch.searchText = searchText(patch.title ?? task.title, patch.content ?? task.content);
    await ctx.db.patch(args.id, patch);
    const updated = await ctx.db.get(args.id);
    if (!updated) throw new Error("Task not found");
    return taskDto(updated);
  },
});

export const completeTask = internalMutation({
  args: { ownerId: v.string(), id: v.id("tasks"), completed: v.boolean() },
  returns: taskDtoValidator,
  handler: async (ctx, args) => {
    await getOwnedTask(ctx, args.ownerId, args.id);
    const timestamp = new Date().toISOString();
    await ctx.db.patch(args.id, {
      status: args.completed ? "completed" : "active",
      completedAt: args.completed ? timestamp : null,
      updatedAt: timestamp,
    });
    const updated = await ctx.db.get(args.id);
    if (!updated) throw new Error("Task not found");
    return taskDto(updated);
  },
});
