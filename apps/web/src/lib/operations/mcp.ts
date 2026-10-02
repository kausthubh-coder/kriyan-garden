import { createMcpHandler } from "mcp-handler";
import type { ServerContext } from "@modelcontextprotocol/server";
import type { Caller } from "./index";
import { MCP_TOOLS, operations, runOperation } from "./index";
import { SCOPES } from "./scopes";
import { OperationError, publicError } from "./errors";
import { MCP_INSTRUCTIONS, MCP_PROMPTS } from "./prompts";

export function createPlannerMcp(execute: typeof runOperation = runOperation) {
  return createMcpHandler(server => {
    for (const name of MCP_TOOLS) {
      const definition = operations[name];
      server.registerTool(name, {
        description: definition.description, inputSchema: definition.schema,
        _meta: { securitySchemes: [{ type: "oauth2", scopes: [...SCOPES] }] },
        annotations: definition.annotations,
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
    for (const [name, { title, description, argsSchema, build }] of Object.entries(MCP_PROMPTS))
      server.registerPrompt(name, { title, description, argsSchema }, args => build(args));
  }, {
    serverInfo: { name: "kriyan", version: "0.3.0" }, supportedProtocolVersions: ["2026-07-28", "2025-11-25"], maxSubscriptions: 0,
    instructions: MCP_INSTRUCTIONS,
  });
}
