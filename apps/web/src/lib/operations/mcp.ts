import { createMcpHandler } from "mcp-handler";
import type { ServerContext } from "@modelcontextprotocol/server";
import type { Caller } from "./index";
import { MCP_TOOLS, operations, runOperation } from "./index";
import { SCOPES } from "./scopes";
import { OperationError, publicError } from "./errors";

export function createPlannerMcp(execute: typeof runOperation = runOperation) {
  return createMcpHandler(server => {
    for (const name of MCP_TOOLS) {
      const definition = operations[name];
      server.registerTool(name, {
        description: definition.description, inputSchema: definition.schema,
        _meta: { securitySchemes: [{ type: "oauth2", scopes: [...SCOPES] }] },
        annotations: { readOnlyHint: !definition.write, destructiveHint: ["update_task", "move_task", "update_goal", "set_goal_progress", "update_project"].includes(name), idempotentHint: !definition.write || ["update_task", "move_task", "update_goal", "set_goal_progress", "update_project", "complete_milestone"].includes(name), openWorldHint: false },
      }, async (input: unknown, context: ServerContext) => {
        try {
          const auth = context.http?.authInfo;
          const userId = auth?.extra?.userId;
          if (typeof userId !== "string") throw new OperationError("UNAUTHENTICATED", "Authorize Kriyan and try again.", 401);
          const caller: Caller = { userId };
          const result = await execute(name, input, caller);
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result };
        } catch (error) {
          const safe = publicError(error);
          const result = { error: { code: safe.code, message: safe.message, ...(safe.candidates ? { candidates: safe.candidates } : {}) } };
          return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result,
          };
        }
      });
    }
  }, {
    serverInfo: { name: "kriyan", version: "0.2.0" }, supportedProtocolVersions: ["2026-07-28", "2025-11-25"], maxSubscriptions: 0,
    instructions: "Help the person organise and plan their life with the AI they already use. Areas are user-defined; use the person's area names and never assume the defaults. Read the relevant tasks, goals and spaces before writing, and repeat each write's readBack sentence to the user. Never invent IDs; use returned IDs or resolve a unique name and ask the user to choose when names are ambiguous.",
  });
}
