import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { cleanText, regionDto, taskDto } from "./helpers";
import { completeTaskFor, createRegionFor, createTaskFor, updateTaskFor } from "./operations";
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
  handler: async (ctx, args) => await createRegionFor(ctx, args.ownerId, args.name),
});

export const createTask = internalMutation({
  args: { ownerId: v.string(), ...taskFieldsValidator },
  returns: taskDtoValidator,
  handler: async (ctx, { ownerId, ...fields }) => await createTaskFor(ctx, ownerId, fields),
});

export const updateTask = internalMutation({
  args: { ownerId: v.string(), id: v.id("tasks"), patch: taskPatchValidator },
  returns: taskDtoValidator,
  handler: async (ctx, args) => await updateTaskFor(ctx, args.ownerId, args.id, args.patch),
});

export const completeTask = internalMutation({
  args: { ownerId: v.string(), id: v.id("tasks"), completed: v.boolean() },
  returns: taskDtoValidator,
  handler: async (ctx, args) => await completeTaskFor(ctx, args.ownerId, args.id, args.completed),
});
