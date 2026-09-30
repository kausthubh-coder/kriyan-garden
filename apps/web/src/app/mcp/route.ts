import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { serviceClient } from "@/lib/service-client";
import { convexToZodFields, convexToZod } from "convex-helpers/server/zod4";
import * as V from "@kriyan/backend/convex/validators";

export const maxDuration = 60;

function ownerIdFrom(context: { http?: { authInfo?: { extra?: Record<string, unknown> } } }) {
  const ownerId = context.http?.authInfo?.extra?.userId;
  if (typeof ownerId !== "string" || !ownerId) throw new Error("Kriyan user identity is missing");
  return ownerId;
}

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

const handler = createMcpHandler((server) => {
  server.registerTool("list_tasks", {
    title: "List Kriyan tasks",
    description: "List the signed-in user's Kriyan tasks. Use this before changing a task when its ID is unknown.",
    inputSchema: z.object({
      status: z.enum(["active", "completed"]).optional().describe("Optional task status filter"),
      limit: z.number().int().min(1).max(100).default(30),
    }),
  }, async ({ status, limit }, context) => json(await serviceClient.listTasks(ownerIdFrom(context), status, limit)));

  server.registerTool("get_task", {
    title: "Read a Kriyan task",
    description: "Read one task, including its notes, schedule, reminders, and project.",
    inputSchema: z.object({ id: z.string().min(1).describe("Task ID from list_tasks or search_notes") }),
  }, async ({ id }, context) => json(await serviceClient.getTask(ownerIdFrom(context), id)));

  server.registerTool("list_spaces", {
    title: "List Kriyan spaces",
    description: "List the user's projects and courses and their IDs.",
    inputSchema: z.object({}),
  }, async (_input, context) => json(await serviceClient.listSpaces(ownerIdFrom(context))));

  server.registerTool("create_space", {
    title: "Create a Kriyan space",
    description: "Create a project for a part of the user's life or work.",
    inputSchema: z.object({ name: z.string().trim().min(1).max(48), areaId: z.string().optional() }),
  }, async ({ name, areaId }, context) => json(await serviceClient.createSpace(ownerIdFrom(context), name, areaId)));

  server.registerTool("search_notes", {
    title: "Search Kriyan notes",
    description: "Search active task titles and notes belonging to the signed-in user.",
    inputSchema: z.object({ query: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(50).default(20) }),
  }, async ({ query, limit }, context) => json(await serviceClient.searchNotes(ownerIdFrom(context), query, limit)));

  server.registerTool("create_task", {
    title: "Create a Kriyan task",
    description: "Create a task with an optional planned date, length and deadline. Select a project or area from the existing IDs.",
    inputSchema: z.object(convexToZodFields(V.taskCreate)),
  }, async (input, context) => json(await serviceClient.createTask(ownerIdFrom(context), input)));


  server.registerTool("update_task", {
    title: "Update a Kriyan task",
    description: "Update selected task fields. Omitted fields remain unchanged.",
    inputSchema: z.object({ id: z.string().min(1), ...convexToZod(V.taskPatch).shape }),
  }, async ({ id, ...patch }, context) => json(await serviceClient.updateTask(ownerIdFrom(context), id, patch)));


  server.registerTool("complete_task", {
    title: "Complete or restore a Kriyan task",
    description: "Mark a task completed, or reopen it.",
    inputSchema: z.object({ id: z.string().min(1), completed: z.boolean().default(true) }),
  }, async ({ id, completed }, context) => json(await serviceClient.completeTask(ownerIdFrom(context), id, completed)));
}, {
  serverInfo: { name: "kriyan", version: "0.1.0" },
  instructions: "Kriyan plans tasks and goals across School, Business and Life. Read before updating and never invent task, area or project IDs.",
});

const authenticatedHandler = withMcpAuth(
  handler,
  async (_request, bearerToken) => verifyClerkToken(await auth({ acceptsToken: "oauth_token" }), bearerToken),
  { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp" },
);

export { authenticatedHandler as GET, authenticatedHandler as POST };
