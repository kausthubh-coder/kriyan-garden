import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  cleanText,
  regionColors,
  regionDto,
  requireOwnerId,
  searchText,
  taskDto,
  taskSummaryDto,
} from "./helpers";
import { completeTaskFor, createRegionFor, createTaskFor, updateTaskFor } from "./operations";
import {
  gardenDataValidator,
  regionDtoValidator,
  taskDtoValidator,
  taskFieldsValidator,
  taskPatchValidator,
} from "./validators";

const demoRegions = [
  ["Kitchen", "A quiet bed."],
  ["The house", "Rooms worth tending."],
  ["Letters", "Words kept close."],
  ["Studio", "Work with room around it."],
  ["Rest", "Nothing planted."],
] as const;

const demoTasks = [
  ["Buy cilantro and limes", 0, 0, 20, "08:00"],
  ["Sharpen the knives", 0, null, null, null],
  ["Ferment the cabbage", 0, 8, null, null],
  ["Oil the front-door hinge", 1, 1, null, null],
  ["Book the chimney sweep", 1, 18, null, null],
  ["Draft the Saturday letter", 2, 6, 45, "08:00"],
  ["Photograph the small still life", 3, 4, 60, null],
  ["Learn to mend the linen", 3, 120, null, null],
] as const;

function dateFromNow(days: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getProfile(ctx: Parameters<typeof requireOwnerId>[0], ownerId: string) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId))
    .unique();
}

const clearBatchSize = 64;
const clearTasksUpToRef = makeFunctionReference<"mutation", { ownerId: string; upTo: number }, null>("garden:clearTasksUpTo");

// Tasks are cleared in small batches so large gardens stay within mutation limits.
async function clearTaskBatch(ctx: MutationCtx, ownerId: string, upTo: number) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId).lte("_creationTime", upTo))
    .take(clearBatchSize);
  for (const task of tasks) await ctx.db.delete(task._id);
  if (tasks.length === clearBatchSize) await ctx.scheduler.runAfter(0, clearTasksUpToRef, { ownerId, upTo });
}

async function clearOwnerData(ctx: MutationCtx, ownerId: string) {
  const regions = await ctx.db.query("regions").withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId)).take(200);
  for (const region of regions) await ctx.db.delete(region._id);
  const newest = await ctx.db.query("tasks").withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId)).order("desc").first();
  if (newest) await clearTaskBatch(ctx, ownerId, newest._creationTime);
}

async function assertOnboardingOpen(ctx: MutationCtx, ownerId: string) {
  const profile = await getProfile(ctx, ownerId);
  if (profile?.onboardingComplete) throw new Error("This garden is already planted");
}

export const clearTasksUpTo = internalMutation({
  args: { ownerId: v.string(), upTo: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await clearTaskBatch(ctx, args.ownerId, args.upTo);
    return null;
  },
});

export const get = query({
  args: {},
  returns: gardenDataValidator,
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx);
    const [profile, regions, tasks] = await Promise.all([
      getProfile(ctx, ownerId),
      ctx.db
        .query("regions")
        .withIndex("by_owner_id_and_sort_order", (q) => q.eq("ownerId", ownerId))
        .take(100),
      ctx.db
        .query("tasks")
        .withIndex("by_owner_id_and_status", (q) => q.eq("ownerId", ownerId).eq("status", "active"))
        .take(500),
    ]);
    return {
      regions: regions.map(regionDto),
      tasks: tasks.map(taskSummaryDto),
      onboardingComplete: profile?.onboardingComplete ?? false,
    };
  },
});

export const getTask = query({
  args: { id: v.id("tasks") },
  returns: v.union(taskDtoValidator, v.null()),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    const task = await ctx.db.get(args.id);
    return task && task.ownerId === ownerId ? taskDto(task) : null;
  },
});

export const completeOnboarding = mutation({
  args: { names: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    const names = Array.from(new Set(args.names.map((name) => cleanText(name, 48)).filter(Boolean))).slice(0, 8);
    if (names.length === 0) throw new Error("Name at least one space");
    await assertOnboardingOpen(ctx, ownerId);
    await clearOwnerData(ctx, ownerId);
    const timestamp = new Date().toISOString();
    for (const [index, name] of names.entries()) {
      await ctx.db.insert("regions", {
        ownerId,
        name,
        color: regionColors[index % regionColors.length],
        note: "Nothing planted.",
        sortOrder: index,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    const profile = await getProfile(ctx, ownerId);
    if (profile) {
      await ctx.db.patch(profile._id, { onboardingComplete: true, updatedAt: timestamp });
    } else {
      await ctx.db.insert("profiles", { ownerId, onboardingComplete: true, createdAt: timestamp, updatedAt: timestamp });
    }
    return null;
  },
});

export const exploreDemo = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx);
    await assertOnboardingOpen(ctx, ownerId);
    await clearOwnerData(ctx, ownerId);
    const timestamp = new Date().toISOString();
    const regionIds = [];
    for (const [index, [name, note]] of demoRegions.entries()) {
      regionIds.push(await ctx.db.insert("regions", {
        ownerId,
        name,
        color: regionColors[index % regionColors.length],
        note,
        sortOrder: index,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
    }
    for (const [index, [title, regionIndex, dueInDays, durationMinutes, time]] of demoTasks.entries()) {
      const content = `<p>Notes for ${title.toLowerCase()}.</p>`;
      await ctx.db.insert("tasks", {
        ownerId,
        title,
        regionId: regionIds[regionIndex],
        dueDate: dueInDays === null ? null : dateFromNow(dueInDays),
        time,
        durationMinutes,
        repeatRule: title === "Draft the Saturday letter" ? "Every week on Saturday, forever" : null,
        reminders: time ? [`each occurrence at ${time}`] : [],
        content,
        status: "active",
        completedAt: null,
        sortOrder: index,
        createdAt: timestamp,
        updatedAt: timestamp,
        searchText: searchText(title, content),
      });
    }
    const profile = await getProfile(ctx, ownerId);
    if (profile) {
      await ctx.db.patch(profile._id, { onboardingComplete: true, updatedAt: timestamp });
    } else {
      await ctx.db.insert("profiles", { ownerId, onboardingComplete: true, createdAt: timestamp, updatedAt: timestamp });
    }
    return null;
  },
});

export const restartOnboarding = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx);
    await clearOwnerData(ctx, ownerId);
    const timestamp = new Date().toISOString();
    const profile = await getProfile(ctx, ownerId);
    if (profile) {
      await ctx.db.patch(profile._id, { onboardingComplete: false, updatedAt: timestamp });
    } else {
      await ctx.db.insert("profiles", { ownerId, onboardingComplete: false, createdAt: timestamp, updatedAt: timestamp });
    }
    return null;
  },
});

export const createRegion = mutation({
  args: { name: v.string() },
  returns: regionDtoValidator,
  handler: async (ctx, args) => await createRegionFor(ctx, await requireOwnerId(ctx), args.name),
});

export const renameRegion = mutation({
  args: { id: v.id("regions"), name: v.string() },
  returns: regionDtoValidator,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    const region = await ctx.db.get(args.id);
    if (!region || region.ownerId !== ownerId) throw new Error("Space not found");
    const name = cleanText(args.name, 48);
    if (!name) throw new Error("A space needs a name");
    await ctx.db.patch(args.id, { name, updatedAt: new Date().toISOString() });
    return regionDto({ ...region, name });
  },
});

export const removeRegion = mutation({
  args: { id: v.id("regions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    const regions = await ctx.db
      .query("regions")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId))
      .take(2);
    if (regions.length <= 1) throw new Error("Keep at least one space");
    const region = await ctx.db.get(args.id);
    if (!region || region.ownerId !== ownerId) throw new Error("Space not found");
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_owner_id_and_region_id", (q) => q.eq("ownerId", ownerId).eq("regionId", args.id))
      .take(500);
    for (const task of tasks) await ctx.db.patch(task._id, { regionId: null, updatedAt: new Date().toISOString() });
    await ctx.db.delete(args.id);
    return null;
  },
});

export const createTask = mutation({
  args: taskFieldsValidator,
  returns: taskDtoValidator,
  handler: async (ctx, args) => await createTaskFor(ctx, await requireOwnerId(ctx), args),
});

export const updateTask = mutation({
  args: { id: v.id("tasks"), patch: taskPatchValidator },
  returns: taskDtoValidator,
  handler: async (ctx, args) => await updateTaskFor(ctx, await requireOwnerId(ctx), args.id, args.patch),
});

export const completeTask = mutation({
  args: { id: v.id("tasks"), completed: v.boolean() },
  returns: taskDtoValidator,
  handler: async (ctx, args) => await completeTaskFor(ctx, await requireOwnerId(ctx), args.id, args.completed),
});
