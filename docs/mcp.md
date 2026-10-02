# Kriyan MCP

Kriyan gives assistants the same reach as the app: tasks, goals and milestones, areas, projects and courses, the class schedule and other weekly blocks, habits and planner settings. Plan with the AI you already use in your own areas. Your assistant uses your area names and never assumes the suggested defaults. It uses the same operations and backend rules as the REST API. There are 43 tools and 5 prompts. Account deletion, reset, sample data, onboarding and push registration stay in the app. The server's instructions (`apps/web/src/lib/operations/prompts.ts`) ask assistants to read before writing, preview larger changes, use returned IDs and repeat the stored result's `readBack` sentence.

The production endpoint is `https://app.kriyan.app/mcp`, using Streamable HTTP. Protected-resource metadata is at `https://app.kriyan.app/.well-known/oauth-protected-resource/mcp`. These URLs describe the hosted endpoint. This brief verifies the local server against the development backend with real Clerk OAuth and does not deploy the web app. See [the auth report](reports/18-auth.md).

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

The v1 SDK alone cannot serve the new revision. The handler's v2 SDK integration supports both revisions and creates a fresh server for each request. Protocol tests discover the server, list tools, read overview, quick add and complete a task under both revisions. Those protocol unit tests use a fake backend. The auth report separately records real OAuth and backend proof under both revisions. Sources: [SDK protocol versions](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions), [Vercel handler](https://github.com/vercel-labs/mcp-handler), [current Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).

## Authorization and limits

Clerk is the OAuth authorization server. A client discovers it through protected-resource metadata, signs in and obtains a user OAuth access token intended for the exact `/mcp` resource URL. Session JWTs, organization identities and API keys cannot substitute for MCP OAuth tokens. Verification supplies the expected audience to Clerk and rejects missing or different audiences. Audience claims are enabled on the configured development instance; otherwise valid-looking tokens without an audience are rejected. See [MCP audience requirements](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#token-audience-binding-and-validation).

REST and CLI use the distinct `/api/v1` resource and its own protected-resource metadata. Both URLs use `MCP_PUBLIC_ORIGIN` for a shared canonical public origin, and each rejects tokens intended only for the other. See [development OAuth setup](setup/05-development-oauth.md) for the configuration confirmed through the Clerk CLI. Clerk's dynamic-client default scopes must exclude `offline_access`; refresh-capable clients request it explicitly.

Clients request `openid profile email`, plus `offline_access` when refresh is needed. A token for the exact MCP resource grants full access to the verified user's own planner. There are no custom scopes or per-operation scope challenges. Tool descriptors advertise the standard OAuth scopes.

Convex enforces 60 read operations and 30 write operations per user per fixed minute, independently. A compound operation consumes one slot even if it needs several backend calls. Its signed, short-lived invocation ID cannot be reused by another owner or used to promote a read to a write. REST and MCP share these budgets. Rate errors say to wait and try again. See [the Convex component](https://www.convex.dev/components/rate-limiter).

All requests validate a supplied `Origin`. Production accepts the app's origin and exact origins in `MCP_ALLOWED_ORIGINS`, a comma-separated server configuration value. An absent Origin is allowed for native and server clients. Local development additionally accepts the request's loopback origin. Add a browser client's origin only when that client sends it. No wildcard Origins are allowed. Self-hosted operators set `MCP_PUBLIC_ORIGIN` to the public HTTPS origin. Metadata, audience checks and OAuth challenges use it consistently, ignoring internal proxy URLs and forwarded headers. The production default is `https://app.kriyan.app`.

## Calendar, names and writes

Every tool accepts optional `today` in `YYYY-MM-DD` and `timezone` as an IANA name. Missing values use the user's profile timezone and its local date. A profile without a timezone must supply one; the server does not guess from UTC. Responses include the effective `today` and `timezone`. The date selected by `get_day` or `get_week` can differ from `today`.

Areas and projects accept IDs or case-insensitive exact names. A project may also use a full path such as `School / Economics`. Ambiguous names return `AMBIGUOUS` with ID/name/path candidates. Use one returned ID for the next request. Quick-add hashtags use the shared parser and reject ambiguous known names.

Task length is optional. Omitted lengths remain unknown.

Repeats: `{ "every": 1, "unit": "week", "weekdays": [1, 3] }`, where weekdays run Sunday 0 through Saturday 6 (`[1,2,3,4,5]` is every weekday). Monthly and yearly rules take `monthDay`: `{ "kind": "weekday", "nth": 2, "weekday": 2 }` is the 2nd Tuesday (`nth: -1` is the last), `{ "kind": "day", "day": 31 }` falls back to the last day in short months without drifting, and `{ "kind": "last_day" }`. `"basis": "completion"` counts the next date from the day it was done. `ends` is `{ "kind": "on", "date": "2026-12-18" }` or `{ "kind": "after", "count": 10 }`. A repeating task needs a date. `skip_occurrence` moves a repeat to its next date without completing it.

Reminders: `at_start`, `before` with minutes (up to 7 days), `morning_of`, `day_before`, `at_time` with `HH:MM`, and `{ "type": "deadline", "daysBefore": 2, "time": "18:00" }`, which counts back from the deadline and works without a planned date. Date reminders require a task date; start and before reminders also require a time. Notifications read like "Today 14:30" or "Due Thu 1 Oct". `update_settings` also sets `dailySummaryTime` (`HH:MM`, or null to turn it off), a daily push with the day's tasks and this week's deadlines.

Writes return `{ "ok": true, "id": "...", "readBack": "...", "today": "...", "timezone": "..." }` plus the saved entity. Stored fields stay ISO; `readBack` sentences use people's dates such as "Today" or "Thu 1 Oct". Complete returns the actual next occurrence for a repeat, when one was created. `quick_add` also returns parsed fields. Patches preserve omitted values and clear nullable fields only when explicitly given `null`. Moving changes date/time only; clearing the date clears time. Errors contain a short code and actionable sentence, without private backend details.

## Tools

Reading:

| Tool | Purpose |
| --- | --- |
| `get_overview` | Start here: areas, projects and courses, active goals and today's summary |
| `get_day` | Timed and any-time tasks, schedule blocks, unscheduled tasks and free capacity for a date |
| `get_week` | Per-day area loads and the next 14 days' deadlines against free time |
| `list_tasks` | Filter by area, project, goal, status, dates, deadlines, due or title text, up to 100 |
| `get_task` | A task with notes, repeat and reminders |
| `search` | Full-text search over active task titles and notes |
| `list_goals`, `get_goal` | Goals with progress, pace and milestones |
| `list_spaces` | Areas, projects and courses, including archived ones |
| `list_events` | The class schedule and other fixed weekly blocks |
| `list_habits` | Habits with weekly targets and this week's logged dates |
| `get_settings` | Timezone, daily capacity and day hours |

Writing:

| Tool | Purpose |
| --- | --- |
| `apply_plan` | Set up or refresh many records at once, with a dry run and no duplicates (below) |
| `quick_add` | Parse the app's text grammar and save a task |
| `create_task`, `update_task` | Structured task fields: dates, deadline, optional length, repeat, reminders, notes |
| `complete_task` | Complete or reopen; reports a repeat's next occurrence |
| `skip_occurrence` | Move a repeating task to its next date without completing it |
| `move_task` | Change only a task's date and time |
| `delete_task` | Remove a task and cancel its reminders |
| `create_event`, `update_event`, `delete_event` | Classes, lectures, labs, shifts and other weekly blocks |
| `create_habit`, `update_habit`, `delete_habit` | Habits; `update_habit` archives and unarchives |
| `log_habit` | Mark a habit done on a date, or undo it with `done: false` |
| `create_area`, `update_area`, `delete_area`, `reorder_areas` | The person's areas and their colours and order |
| `create_project`, `update_project`, `delete_project` | Projects and courses; `update_project` moves, renames, switches kind and archives |
| `create_goal`, `update_goal`, `delete_goal`, `set_goal_progress` | Goals and number progress |
| `add_milestone`, `update_milestone`, `complete_milestone`, `delete_milestone` | Goal milestones |
| `update_settings` | Timezone, daily capacity, day hours and the daily summary time |

Deletes keep the app's rules: an area, project, goal or habit still in use is refused with a sentence saying what to move or archive first. Every tool declares MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) from one definition in `apps/web/src/lib/operations/index.ts`.

## Organise a whole life in one call: `apply_plan`

`apply_plan` takes optional arrays of `areas`, `projects`, `events`, `goals`, `tasks` and `habits`, at most 200 items in total. Each item may carry a `ref` so later items in the same call can point at it; otherwise references resolve by ID, name or `Area / Name` path, as in the single tools.

- **No duplicates.** Before creating, each item is matched against what is stored, ignoring case and extra spaces: areas by name, projects by area and name, events by title, weekdays and start time, goals and habits by title, active tasks by title, area and the same date or deadline (a repeating task by title and area alone). A match is reported as `exists`. With `onExisting: "update"` the stored record is patched with the fields given and reported as `updated`. Applying the same plan twice creates nothing the second time.
- **All or nothing.** The whole plan runs in one Convex mutation. If any item fails, nothing is saved and the error names the item, for example `tasks[3]: Project "Chemistry" not found. Add it to the plan or use an existing name or ID.`
- **Dry run.** `dryRun: true` performs every step, including validation, then rolls back and reports `would_create` and `would_update`. Assistants are told to preview first and apply only after the person agrees.
- **Limits.** One call counts as one write against the rate limit. A plan reads every active task once (up to 5000) and each create reads its table's cap, which stays inside Convex's per-transaction read limits at 200 items.

The result lists `{ kind, index, ref, name, status, id }` for each item and a `readBack` such as "Added 3 courses, 6 schedule blocks and 4 tasks. Already in Kriyan: 2 tasks."

```json
{
  "dryRun": true,
  "projects": [
    { "ref": "cs101", "name": "CS 101", "area": "School", "kind": "course" },
    { "ref": "hist", "name": "Modern history", "area": "School", "kind": "course" },
    { "ref": "site", "name": "Portfolio site", "area": "Projects" }
  ],
  "events": [
    { "title": "CS 101 lecture", "area": "School", "weekdays": [1, 3], "startTime": "09:00", "endTime": "10:15", "fromDate": "2026-09-01", "untilDate": "2026-12-11", "location": "Hall 2" },
    { "title": "CS 101 lab", "area": "School", "weekdays": [4], "startTime": "14:00", "endTime": "15:50", "fromDate": "2026-09-01", "untilDate": "2026-12-11" },
    { "title": "Modern history seminar", "area": "School", "weekdays": [2], "startTime": "11:00", "endTime": "12:30", "fromDate": "2026-09-01" }
  ],
  "tasks": [
    { "title": "Problem set 3", "project": "cs101", "deadline": "2026-10-09" },
    { "title": "Essay: causes of the First World War", "project": "hist", "deadline": "2026-10-16", "notes": "1500 words, Chicago citations." },
    { "title": "Ship the about page", "project": "site", "date": "2026-10-03" }
  ]
}
```

## Prompts

Clients that show MCP prompts list these (Claude Code shows them as `/mcp__kriyan__<name>`). The server instructions carry the same guidance for clients that do not.

| Prompt | What it does |
| --- | --- |
| `organize_my_life` | Reads classes, homework and projects from the workspace and conversation, previews one `apply_plan`, applies after approval. Optional `focus`. |
| `add_class_schedule` | Turns a timetable into courses and weekly class times. Optional `source`. |
| `plan_my_week` | Proposes days for unscheduled work with deadlines within each day's capacity. |
| `plan_today` | Fixed commitments, overdue work and an order that fits free time. |
| `weekly_review` | What got done, what slipped, goal and habit progress, and what to move. |

## Organise your life from your work folder

Connect Kriyan to Codex, Claude Code or another assistant that can read your files, open it in the folder where your syllabi, assignment lists and projects live, and paste:

```text
Use the Kriyan MCP server to organise my life. Read my class schedule, assignments and projects from this folder and our conversation, show me the plan, and add it to Kriyan once I agree.
```

The assistant maps classes to schedule blocks and courses, homework to tasks with deadlines, longer efforts to projects or goals, and routines to habits or repeating tasks. It never invents a length or a due date. Run the same sentence again after new work arrives; existing items are recognised and left alone.

## Client setup

Complete the Clerk and deployment requirements in [the report](reports/05-mcp-api-cli.md) first. Use a public HTTPS endpoint for cloud clients. Replace the origin below when self-hosting. `kriyan mcp` prints these snippets.

### Claude web and desktop

Open **Settings > Connectors > Add custom connector**. Use name **Kriyan** and remote MCP server URL `https://app.kriyan.app/mcp`. Connect, sign in through Clerk and approve access to your planner. The desktop app uses the same remote custom connector flow. A local `localhost` server cannot be reached by Claude's cloud connector. See [Claude's connector setup](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

### Claude Code

```sh
claude mcp add --transport http kriyan https://app.kriyan.app/mcp
```

Open `/mcp` in Claude Code to authenticate Kriyan. See [Claude Code MCP](https://code.claude.com/docs/en/mcp).

### ChatGPT

Open **Settings > Security and login > Developer mode**. Open **Plugins**, select **+**, name the connection **Kriyan**, enter `https://app.kriyan.app/mcp`, choose OAuth and connect. Review the discovered tools, sign in through Clerk and approve access to your planner. Add the connection from the conversation's tools menu. Access depends on account and workspace policy. See [OpenAI's current connection instructions](https://developers.openai.com/plugins/deploy/connect-chatgpt). OAuth metadata and tool annotations follow [the plugin reference](https://developers.openai.com/plugins/reference). No ChatGPT UI or live account-linking test was performed in this worktree.

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
