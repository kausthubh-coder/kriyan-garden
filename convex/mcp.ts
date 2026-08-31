import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import {
  regionDtoValidator,
  taskDtoValidator,
  taskFieldsValidator,
  taskPatchValidator,
  taskStatusValidator,
} from "./validators";

async function verifyRequest(
  operation: string,
  ownerId: string,
  timestamp: number,
  payload: unknown,
  signature: string,
) {
  const secret = process.env.MCP_SERVICE_SECRET;
  if (!secret) throw new Error("MCP service is not configured");
  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) throw new Error("Expired MCP service request");
  if (!/^[0-9a-f]{64}$/i.test(signature)) throw new Error("Invalid MCP service request");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const supplied = Uint8Array.from(signature.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    supplied,
    encoder.encode(JSON.stringify([timestamp, ownerId, operation, payload])),
  );
  if (!valid) {
    throw new Error("Invalid MCP service request");
  }
}

const serviceArgs = {
  ownerId: v.string(),
  timestamp: v.number(),
  signature: v.string(),
};

type TaskDto = {
  id: string;
  title: string;
  regionId: string | null;
  horizon: "now" | "season" | "someday";
  dueDate: string | null;
  time: string | null;
  durationMinutes: number | null;
  repeatRule: string | null;
  reminders: string[];
  content: string;
  status: "active" | "completed";
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type RegionDto = { id: string; name: string; color: string; note: string; sortOrder: number };
type TaskFields = {
  title: string;
  regionId: Id<"regions"> | null;
  dueDate: string | null;
  time: string | null;
  durationMinutes: number | null;
  repeatRule: string | null;
  reminders: string[];
  content: string;
};
type TaskPatch = Partial<TaskFields>;

const listTasksRef = makeFunctionReference<"query", { ownerId: string; status?: "active" | "completed"; limit: number }, TaskDto[]>("mcpInternal:listTasks");
const getTaskRef = makeFunctionReference<"query", { ownerId: string; id: Id<"tasks"> }, TaskDto | null>("mcpInternal:getTask");
const listRegionsRef = makeFunctionReference<"query", { ownerId: string }, RegionDto[]>("mcpInternal:listRegions");
const searchNotesRef = makeFunctionReference<"query", { ownerId: string; query: string; limit: number }, TaskDto[]>("mcpInternal:searchNotes");
const createRegionRef = makeFunctionReference<"mutation", { ownerId: string; name: string }, RegionDto>("mcpInternal:createRegion");
const createTaskRef = makeFunctionReference<"mutation", { ownerId: string } & TaskFields, TaskDto>("mcpInternal:createTask");
const updateTaskRef = makeFunctionReference<"mutation", { ownerId: string; id: Id<"tasks">; patch: TaskPatch }, TaskDto>("mcpInternal:updateTask");
const completeTaskRef = makeFunctionReference<"mutation", { ownerId: string; id: Id<"tasks">; completed: boolean }, TaskDto>("mcpInternal:completeTask");

export const listTasks = action({
  args: { ...serviceArgs, status: v.optional(taskStatusValidator), limit: v.number() },
  returns: v.array(taskDtoValidator),
  handler: async (ctx, args) => {
    const payload = { status: args.status, limit: args.limit };
    await verifyRequest("list_tasks", args.ownerId, args.timestamp, payload, args.signature);
    return await ctx.runQuery(listTasksRef, { ownerId: args.ownerId, ...payload });
  },
});

export const getTask = action({
  args: { ...serviceArgs, id: v.id("tasks") },
  returns: v.union(taskDtoValidator, v.null()),
  handler: async (ctx, args) => {
    const payload = { id: args.id };
    await verifyRequest("get_task", args.ownerId, args.timestamp, payload, args.signature);
    return await ctx.runQuery(getTaskRef, { ownerId: args.ownerId, ...payload });
  },
});

export const listRegions = action({
  args: serviceArgs,
  returns: v.array(regionDtoValidator),
  handler: async (ctx, args) => {
    const payload = {};
    await verifyRequest("list_spaces", args.ownerId, args.timestamp, payload, args.signature);
    return await ctx.runQuery(listRegionsRef, { ownerId: args.ownerId });
  },
});

export const searchNotes = action({
  args: { ...serviceArgs, query: v.string(), limit: v.number() },
  returns: v.array(taskDtoValidator),
  handler: async (ctx, args) => {
    const payload = { query: args.query, limit: args.limit };
    await verifyRequest("search_notes", args.ownerId, args.timestamp, payload, args.signature);
    return await ctx.runQuery(searchNotesRef, { ownerId: args.ownerId, ...payload });
  },
});

export const createRegion = action({
  args: { ...serviceArgs, name: v.string() },
  returns: regionDtoValidator,
  handler: async (ctx, args) => {
    const payload = { name: args.name };
    await verifyRequest("create_space", args.ownerId, args.timestamp, payload, args.signature);
    return await ctx.runMutation(createRegionRef, { ownerId: args.ownerId, ...payload });
  },
});

export const createTask = action({
  args: { ...serviceArgs, ...taskFieldsValidator },
  returns: taskDtoValidator,
  handler: async (ctx, args) => {
    const payload = {
      title: args.title,
      regionId: args.regionId,
      dueDate: args.dueDate,
      time: args.time,
      durationMinutes: args.durationMinutes,
      repeatRule: args.repeatRule,
      reminders: args.reminders,
      content: args.content,
    };
    await verifyRequest("create_task", args.ownerId, args.timestamp, payload, args.signature);
    return await ctx.runMutation(createTaskRef, { ownerId: args.ownerId, ...payload });
  },
});

export const updateTask = action({
  args: { ...serviceArgs, id: v.id("tasks"), patch: taskPatchValidator },
  returns: taskDtoValidator,
  handler: async (ctx, args) => {
    const payload = { id: args.id, patch: args.patch };
    await verifyRequest("update_task", args.ownerId, args.timestamp, payload, args.signature);
    return await ctx.runMutation(updateTaskRef, { ownerId: args.ownerId, ...payload });
  },
});

export const completeTask = action({
  args: { ...serviceArgs, id: v.id("tasks"), completed: v.boolean() },
  returns: taskDtoValidator,
  handler: async (ctx, args) => {
    const payload = { id: args.id, completed: args.completed };
    await verifyRequest("complete_task", args.ownerId, args.timestamp, payload, args.signature);
    return await ctx.runMutation(completeTaskRef, { ownerId: args.ownerId, ...payload });
  },
});
