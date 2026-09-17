import "server-only";

import { createHmac } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { canonicalJson } from "../../convex/canonical";
import type { Id } from "../../convex/_generated/dataModel";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const serviceSecret = process.env.MCP_SERVICE_SECRET;

if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
if (!serviceSecret) throw new Error("MCP_SERVICE_SECRET is not configured");

const convex = new ConvexHttpClient(convexUrl);

function serviceEnvelope(ownerId: string, operation: string, payload: unknown) {
  const timestamp = Date.now();
  const signature = createHmac("sha256", serviceSecret!)
    .update(canonicalJson([timestamp, ownerId, operation, payload]))
    .digest("hex");
  return { ownerId, timestamp, signature };
}

export const mcpGarden = {
  listTasks(ownerId: string, status: "active" | "completed" | undefined, limit: number) {
    const payload = { status, limit };
    return convex.action(api.mcp.listTasks, { ...serviceEnvelope(ownerId, "list_tasks", payload), ...payload });
  },
  getTask(ownerId: string, id: string) {
    const payload = { id: id as Id<"tasks"> };
    return convex.action(api.mcp.getTask, { ...serviceEnvelope(ownerId, "get_task", payload), ...payload });
  },
  listSpaces(ownerId: string) {
    const payload = {};
    return convex.action(api.mcp.listRegions, serviceEnvelope(ownerId, "list_spaces", payload));
  },
  searchNotes(ownerId: string, query: string, limit: number) {
    const payload = { query, limit };
    return convex.action(api.mcp.searchNotes, { ...serviceEnvelope(ownerId, "search_notes", payload), ...payload });
  },
  createSpace(ownerId: string, name: string) {
    const payload = { name };
    return convex.action(api.mcp.createRegion, { ...serviceEnvelope(ownerId, "create_space", payload), ...payload });
  },
  createTask(ownerId: string, input: {
    title: string;
    regionId: string | null;
    dueDate: string | null;
    time: string | null;
    durationMinutes: number | null;
    repeatRule: string | null;
    reminders: string[];
    content: string;
  }) {
    const payload = { ...input, regionId: input.regionId as Id<"regions"> | null };
    return convex.action(api.mcp.createTask, { ...serviceEnvelope(ownerId, "create_task", payload), ...payload });
  },
  updateTask(ownerId: string, id: string, patch: {
    title?: string;
    regionId?: string | null;
    dueDate?: string | null;
    time?: string | null;
    durationMinutes?: number | null;
    repeatRule?: string | null;
    reminders?: string[];
    content?: string;
  }) {
    const payload = {
      id: id as Id<"tasks">,
      patch: { ...patch, regionId: patch.regionId as Id<"regions"> | null | undefined },
    };
    return convex.action(api.mcp.updateTask, { ...serviceEnvelope(ownerId, "update_task", payload), ...payload });
  },
  completeTask(ownerId: string, id: string, completed: boolean) {
    const payload = { id: id as Id<"tasks">, completed };
    return convex.action(api.mcp.completeTask, { ...serviceEnvelope(ownerId, "complete_task", payload), ...payload });
  },
};
