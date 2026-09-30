# Kriyan MCP

Kriyan gives assistants access to the signed-in user's tasks, goals, areas, projects and courses. It uses the same operations and backend rules as the REST API. There are 21 tools and no delete tools. The server asks assistants to read before writing, use returned IDs and repeat the stored result's `readBack` sentence.

The production endpoint is `https://app.kriyan.app/mcp`, using Streamable HTTP. Protected-resource metadata is at `https://app.kriyan.app/.well-known/oauth-protected-resource/mcp`. These URLs describe the intended deployment; this worktree has not been deployed. See [the implementation report](reports/05-mcp-api-cli.md) for current blockers.

## Protocol and package versions

Checked against official package releases and protocol documentation on 29 September 2026:

| Package | Pinned version | Role |
| --- | --- | --- |
| `mcp-handler` | 2.2.0 | Next.js route adapter using the v2 SDK and stateless legacy support |
| `@modelcontextprotocol/server` | 2.2.0 | Current server implementation |
| `@modelcontextprotocol/sdk` | 1.31.0 | Compatibility dependency for Clerk MCP types |
| `@clerk/mcp-tools` | 0.6.0 | Clerk authorization-server and protected-resource metadata |
| `@clerk/backend` | 3.21.0 | Explicit audience-aware OAuth verification (the Next.js package's older nested SDK lacks it) |
| `@convex-dev/rate-limiter` | 0.4.0 | Per-user backend limits shared with REST |

Both `2025-11-25` and `2026-07-28` work in offline tests through the actual SDK and handler. The older revision uses `initialize`; requests carry `MCP-Protocol-Version: 2025-11-25`. The server runs statelessly, without a session ID. The newer revision starts with `server/discover`, has no initialization handshake or sessions, and requires `MCP-Protocol-Version` and `Mcp-Method`. Tool calls also use `Mcp-Name`. Its request metadata includes `io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities` and `io.modelcontextprotocol/clientInfo`. Use a compatible client rather than constructing these messages manually.

The v1 SDK alone cannot serve the new revision. The handler's v2 SDK integration supports both revisions and creates a fresh server for each request. Protocol tests discover the server, list tools, read overview, quick add and complete a task under both revisions. They use a fake backend and do not establish a live OAuth integration pass. Sources: [SDK protocol versions](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions), [Vercel handler](https://github.com/vercel-labs/mcp-handler), [current Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).

## Authorization and limits

Clerk is the OAuth authorization server. A client discovers it through protected-resource metadata, signs in and obtains a user OAuth access token intended for the exact `/mcp` resource URL. Session JWTs, organization identities and API keys cannot substitute for MCP OAuth tokens. Verification supplies the expected audience to Clerk and rejects missing or different audiences. The operator must enable Clerk audience claims; otherwise valid-looking tokens without an audience are rejected. See [MCP audience requirements](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#token-audience-binding-and-validation).

REST and CLI use the distinct `/api/v1` resource and its own protected-resource metadata. Both URLs use `MCP_PUBLIC_ORIGIN` for a shared canonical public origin, and each rejects tokens intended only for the other. See [development OAuth setup](setup/05-development-oauth.md) for supervisor payloads. Clerk's dynamic-client default scopes must exclude `offline_access`; refresh-capable clients request it explicitly.

| Scope | Allows |
| --- | --- |
| `tasks:read` | Read tasks, day/week plans and search |
| `tasks:write` | Add, edit, move, complete and reopen tasks |
| `spaces:read` | Read areas, projects and courses |
| `spaces:write` | Create or rename projects and courses |
| `goals:read` | Read goals and milestones |
| `goals:write` | Create or edit goals, progress and milestones |

Overview needs `tasks:read`, `spaces:read` and `goals:read`. Other read tools need their own read scope, and write tools need their own write scope. Missing scopes produce HTTP 403 with a `WWW-Authenticate` scope challenge before execution. Tool descriptors also expose OAuth scopes in `_meta.securitySchemes`. Clients should request the scopes needed for their actions and show Clerk's consent screen.

Convex enforces 60 read operations and 30 write operations per user per fixed minute, independently. A compound operation consumes one slot even if it needs several backend calls. Its signed, short-lived invocation ID cannot be reused by another owner or used to promote a read to a write. REST and MCP share these budgets. Rate errors say to wait and try again. See [the Convex component](https://www.convex.dev/components/rate-limiter).

All requests validate a supplied `Origin`. Production accepts the app's origin and exact origins in `MCP_ALLOWED_ORIGINS`, a comma-separated server configuration value. An absent Origin is allowed for native and server clients. Local development additionally accepts the request's loopback origin. Add a browser client's origin only when that client sends it. No wildcard Origins are allowed. Self-hosted operators set `MCP_PUBLIC_ORIGIN` to the public HTTPS origin. Metadata, audience checks and OAuth challenges use it consistently, ignoring internal proxy URLs and forwarded headers. The production default is `https://app.kriyan.app`.

## Calendar, names and writes

Every tool accepts optional `today` in `YYYY-MM-DD` and `timezone` as an IANA name. Missing values use the user's profile timezone and its local date. A profile without a timezone must supply one; the server does not guess from UTC. Responses include the effective `today` and `timezone`. The date selected by `get_day` or `get_week` can differ from `today`.

Areas and projects accept IDs or case-insensitive exact names. A project may also use a full path such as `School / Economics`. Ambiguous names return `AMBIGUOUS` with ID/name/path candidates. Use one returned ID for the next request. Quick-add hashtags use the shared parser and reject ambiguous known names.

Task length is optional. Omitted lengths remain unknown. Repeat input is `{ "every": 1, "unit": "week", "weekdays": [1, 3] }`, where weekdays run Sunday 0 through Saturday 6. Reminder forms are `at_start`, `before` with minutes, `morning_of`, `day_before`, or `at_time` with `HH:MM`. Reminders require a task date; start and before reminders also require a time.

Writes return `{ "ok": true, "id": "...", "readBack": "...", "today": "...", "timezone": "..." }` plus the saved entity. Complete returns the actual next occurrence for a repeat, when one was created. `quick_add` also returns parsed fields. Patches preserve omitted values and clear nullable fields only when explicitly given `null`. Moving changes date/time only; clearing the date clears time. Errors contain a short code and actionable sentence, without private backend details.

## Tools

| Tool | Purpose | Scope |
| --- | --- | --- |
| `get_overview` | Areas, projects/courses, active goals and today's summary | All three read scopes |
| `get_day` | Timed/any-time tasks, events, unscheduled tasks and capacity | `tasks:read` |
| `get_week` | Per-day area loads and the next 14 days' deadlines | `tasks:read` |
| `list_tasks` | Filter by area, project, goal, status, dates, deadlines or title text, up to 100 | `tasks:read` |
| `get_task` | A task with notes, repeat and reminders | `tasks:read` |
| `quick_add` | Parse the app's text grammar and save a task | `tasks:write` |
| `create_task` | Save structured task fields with optional length | `tasks:write` |
| `update_task` | Patch task fields | `tasks:write` |
| `complete_task` | Complete or reopen and report a repeat's next occurrence | `tasks:write` |
| `move_task` | Change only a task's date and time | `tasks:write` |
| `search` | Full-text search over titles and notes | `tasks:read` |
| `list_goals` | List goals, filtered by status or area | `goals:read` |
| `get_goal` | Read a goal with progress and milestones | `goals:read` |
| `create_goal` | Add a goal and its metric | `goals:write` |
| `update_goal` | Patch a goal | `goals:write` |
| `set_goal_progress` | Set a number metric's current value atomically | `goals:write` |
| `add_milestone` | Add a goal milestone | `goals:write` |
| `complete_milestone` | Complete or reopen a milestone | `goals:write` |
| `list_spaces` | Read areas, projects and courses | `spaces:read` |
| `create_project` | Create a project or course in an area | `spaces:write` |
| `update_project` | Rename a project/course or edit its note | `spaces:write` |

## Client setup

Complete the Clerk and deployment requirements in [the report](reports/05-mcp-api-cli.md) first. Use a public HTTPS endpoint for cloud clients. Replace the origin below when self-hosting. `kriyan mcp` prints these snippets.

### Claude web and desktop

Open **Settings > Connectors > Add custom connector**. Use name **Kriyan** and remote MCP server URL `https://app.kriyan.app/mcp`. Connect, sign in through Clerk and approve the requested scopes. The desktop app uses the same remote custom connector flow. A local `localhost` server cannot be reached by Claude's cloud connector. See [Claude's connector setup](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

### Claude Code

```sh
claude mcp add --transport http kriyan https://app.kriyan.app/mcp
```

Open `/mcp` in Claude Code to authenticate Kriyan. See [Claude Code MCP](https://code.claude.com/docs/en/mcp).

### ChatGPT

Open **Settings > Security and login > Developer mode**. Open **Plugins**, select **+**, name the connection **Kriyan**, enter `https://app.kriyan.app/mcp`, choose OAuth and connect. Review the discovered tools, sign in through Clerk and approve scopes. Add the connection from the conversation's tools menu. Access depends on account and workspace policy. See [OpenAI's current connection instructions](https://developers.openai.com/plugins/deploy/connect-chatgpt). OAuth metadata and tool annotations follow [the plugin reference](https://developers.openai.com/plugins/reference). No ChatGPT UI or live account-linking test was performed in this worktree.

### Cursor

Save `.cursor/mcp.json` in your project, or `~/.cursor/mcp.json` for a personal configuration:

```json
{
  "mcpServers": {
    "kriyan": { "url": "https://app.kriyan.app/mcp" }
  }
}
```

Connect and authorize Kriyan from Cursor's MCP settings. See [Cursor MCP setup](https://prod.cursor.com/help/customization/mcp).

### VS Code

Save `.vscode/mcp.json`:

```json
{
  "servers": {
    "kriyan": { "type": "http", "url": "https://app.kriyan.app/mcp" }
  }
}
```

Start the server entry, complete OAuth and allow the tools you need. See [VS Code MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers).
