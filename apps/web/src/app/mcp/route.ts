import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { mcpGarden } from "@/lib/mcp-convex";

export const maxDuration = 60;

function ownerIdFrom(context: { http?: { authInfo?: { extra?: Record<string, unknown> } } }) {
  const ownerId = context.http?.authInfo?.extra?.userId;
  if (typeof ownerId !== "string" || !ownerId) throw new Error("Kriyan user identity is missing");
  return ownerId;
}

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function notesToHtml(notes: string | undefined) {
  if (!notes) return "";
  const escaped = notes.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return escaped.split(/\n{2,}/).map((paragraph) => `<p>${paragraph.replaceAll("\n", "<br>")}</p>`).join("");
}

const handler = createMcpHandler((server) => {
  server.registerTool("list_tasks", {
    title: "List Kriyan tasks",
    description: "List the signed-in user's Kriyan tasks. Use this before changing a task when its ID is unknown.",
    inputSchema: z.object({
      status: z.enum(["active", "completed"]).optional().describe("Optional task status filter"),
      limit: z.number().int().min(1).max(100).default(30),
    }),
  }, async ({ status, limit }, context) => json(await mcpGarden.listTasks(ownerIdFrom(context), status, limit)));

  server.registerTool("get_task", {
    title: "Read a Kriyan task",
    description: "Read one task, including its notes, schedule, reminders, and space.",
    inputSchema: z.object({ id: z.string().min(1).describe("Task ID from list_tasks or search_notes") }),
  }, async ({ id }, context) => json(await mcpGarden.getTask(ownerIdFrom(context), id)));

  server.registerTool("list_spaces", {
    title: "List Kriyan spaces",
    description: "List the user's color-coded spaces and their IDs.",
    inputSchema: z.object({}),
  }, async (_input, context) => json(await mcpGarden.listSpaces(ownerIdFrom(context))));

  server.registerTool("create_space", {
    title: "Create a Kriyan space",
    description: "Create a color-coded space for a part of the user's life or work.",
    inputSchema: z.object({ name: z.string().trim().min(1).max(48) }),
  }, async ({ name }, context) => json(await mcpGarden.createSpace(ownerIdFrom(context), name)));

  server.registerTool("search_notes", {
    title: "Search Kriyan notes",
    description: "Search active task titles and notes belonging to the signed-in user.",
    inputSchema: z.object({ query: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(50).default(20) }),
  }, async ({ query, limit }, context) => json(await mcpGarden.searchNotes(ownerIdFrom(context), query, limit)));

  server.registerTool("create_task", {
    title: "Create a Kriyan task",
    description: "Create a task. A due date determines whether it appears in Now, This season, or Someday.",
    inputSchema: z.object({
      title: z.string().trim().min(1).max(180),
      regionId: z.string().min(1).nullable().default(null).describe("Space ID from list_spaces, or null"),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
      time: z.string().regex(/^\d{2}:\d{2}$/).nullable().default(null),
      durationMinutes: z.number().int().min(1).max(1440).nullable().default(null),
      repeatRule: z.string().max(180).nullable().default(null).describe("Natural language recurrence, for example: Every week on Monday and Tuesday, forever"),
      reminders: z.array(z.string().max(80)).max(8).default([]),
      notes: z.string().max(100000).optional().describe("Plain-text notes for the task page"),
    }),
  }, async ({ notes, ...input }, context) => json(await mcpGarden.createTask(ownerIdFrom(context), { ...input, content: notesToHtml(notes) })));

  server.registerTool("update_task", {
    title: "Update a Kriyan task",
    description: "Update selected task fields. Omitted fields remain unchanged.",
    inputSchema: z.object({
      id: z.string().min(1),
      title: z.string().trim().min(1).max(180).optional(),
      regionId: z.string().min(1).nullable().optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
      repeatRule: z.string().max(180).nullable().optional(),
      reminders: z.array(z.string().max(80)).max(8).optional(),
      notes: z.string().max(100000).optional(),
    }),
  }, async ({ id, notes, ...patch }, context) => json(await mcpGarden.updateTask(ownerIdFrom(context), id, {
    ...patch,
    ...(notes === undefined ? {} : { content: notesToHtml(notes) }),
  })));

  server.registerTool("complete_task", {
    title: "Complete or restore a Kriyan task",
    description: "Lift a task from the garden as completed, or restore it.",
    inputSchema: z.object({ id: z.string().min(1), completed: z.boolean().default(true) }),
  }, async ({ id, completed }, context) => json(await mcpGarden.completeTask(ownerIdFrom(context), id, completed)));
}, {
  serverInfo: { name: "kriyan", version: "0.1.0" },
  instructions: "Kriyan is a calm personal task garden. Read before updating, use due dates instead of a separate horizon, and never invent task or space IDs.",
});

const authenticatedHandler = withMcpAuth(
  handler,
  async (_request, bearerToken) => verifyClerkToken(await auth({ acceptsToken: "oauth_token" }), bearerToken),
  { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp" },
);

export { authenticatedHandler as GET, authenticatedHandler as POST };
