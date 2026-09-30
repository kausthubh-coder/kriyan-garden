# Brief 05: MCP server v2, `/api/v1`, and the `kriyan` CLI

Read `AGENTS.md`, `docs/PLAN.md` sections 5, 6 and 7, the service functions in `packages/backend/convex/service.ts`, the web service client in `apps/web/src/lib/service-client.ts`, and the current `apps/web/src/app/mcp/route.ts`. Also read `git show f35eeaf:src/lib/mcp-garden.ts` and `git show f35eeaf:src/app/mcp/route.ts` (an earlier, uncommitted-then-archived design for the MCP tools): reuse its ideas of resolving spaces by name, structured repeat and reminder inputs, ambiguity handling, and a one-line `readBack` after every write. Do not reuse its garden wording.

## Part A: MCP server

### Protocol and packages

1. Check the installed versions of `mcp-handler`, `@clerk/mcp-tools` and `@modelcontextprotocol/sdk` and which MCP spec revisions they implement. The 2026-07-28 revision removed sessions and the initialize handshake and requires `MCP-Protocol-Version` and `Mcp-Method` headers plus a `server/discover` method; the 2025-11-25 revision is what most clients still speak. Choose the newest versions of the packages that work together, write what you found in `docs/mcp.md`, and make the server answer both revisions if the library allows it. If they cannot both be supported, support 2025-11-25 and say so in the doc.
2. Keep Clerk OAuth as the authorization server. Keep the `/.well-known/oauth-protected-resource/mcp` metadata. Validate the `Origin` header on every request.
3. Turn on scopes: `tasks:read`, `tasks:write`, `spaces:read`, `spaces:write`, `goals:read`, `goals:write`. Read tools need the read scope; write tools need the write scope. Use `clerk config` from `apps/web` (the CLI is linked to the app) to check the OAuth application settings and list, in your report, exactly what must be changed in the Clerk dashboard if the CLI cannot do it: scopes, consent screen on, Client ID Metadata Documents on, dynamic client registration on. Do not change Clerk settings yourself.
4. Rate limit each user with `@convex-dev/rate-limiter`: 60 calls a minute for reads, 30 a minute for writes, applied inside the service functions so the CLI gets the same limits.

### Tools

Every tool takes an optional `today` (`YYYY-MM-DD`) and `timezone` (IANA) and uses them for anything that means "today", "this week" or "overdue"; if absent, use the profile timezone. Every write returns `{ ok: true, id, readBack }` where `readBack` is one plain sentence describing what is now stored, for the assistant to repeat to the user. Errors return a short sentence naming what to fix, never a stack trace. Areas and projects can be given by id or by name; an ambiguous name returns the candidates.

| Tool | Purpose |
|---|---|
| `get_overview` | Areas, projects and courses, active goals with status, today's summary line. The place to start. |
| `get_day` | The Day view for a date: timed tasks, any-time tasks, events, unscheduled tasks, planned minutes, free minutes against capacity. |
| `get_week` | The Week view: per-day load by area, deadlines in the next 14 days with time needed against time free. |
| `list_tasks` | Filter by area, project, goal, status, date range, deadline range, or text. Max 100. |
| `get_task` | One task with everything, including notes. |
| `quick_add` | Same text a person would type. Returns the parsed fields and the created task. |
| `create_task` | Structured create: title, area, project, goal, date, time, durationMinutes (optional), deadline, repeat, reminders, notes. |
| `update_task` | Patch semantics. |
| `complete_task` | Complete or reopen. For repeating tasks the read-back names the next occurrence. |
| `move_task` | Change date and time only, with the same rules as drag in the app. |
| `search` | Full-text over titles and notes. |
| `list_goals`, `get_goal`, `create_goal`, `update_goal`, `set_goal_progress`, `add_milestone`, `complete_milestone` | Goals. |
| `list_spaces`, `create_project`, `update_project` | Areas are read-only over MCP in this release; projects and courses can be created and renamed. |

No delete tools. `instructions` in the server info: two sentences on reading before writing and on never inventing ids.

### Docs

`docs/mcp.md`: what the server does, the endpoint, the scopes, and copy-and-paste setup for Claude (web and desktop custom connector), Claude Code (`claude mcp add --transport http kriyan https://app.kriyan.app/mcp`), ChatGPT, Cursor (`mcp.json`) and VS Code. Include the tool list with one line each.

## Part B: `/api/v1` for the CLI

Route handlers under `apps/web/src/app/api/v1/`. JSON in, JSON out. Auth with `auth({ acceptsToken: ["oauth_token", "api_key"] })` from `@clerk/nextjs/server`; read the Clerk docs on verifying OAuth access tokens and API keys. On success take the user id and call the same service functions the MCP tools use, so the two surfaces cannot drift: put the tool implementations in `apps/web/src/lib/operations/` and have both the MCP handlers and the API routes call them.

Endpoints: `GET /me`, `GET /overview`, `GET /day?date=`, `GET /week?start=`, `GET /tasks` with the same filters as `list_tasks`, `POST /tasks/quick-add`, `POST /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/complete`, `POST /tasks/:id/move`, `GET /goals`, `POST /goals`, `PATCH /goals/:id`, `GET /spaces`. Errors are `{ error: { code, message } }` with sensible status codes. Apply the same rate limits. Document in `docs/api.md`.

Every request and response includes the caller's `today` and `timezone` handling exactly like the MCP tools.

## Part C: the `kriyan` CLI (`packages/cli`)

- TypeScript, bundled to one ESM file with a `#!/usr/bin/env node` shebang using `tsdown`. `bin: { kriyan: "dist/kriyan.js" }`. `npx kriyan` and `bunx kriyan` must both work. Check on npm whether the name `kriyan` is free; if not, use `@kriyan/cli` and say so.
- Config: `KRIYAN_URL` (default `https://app.kriyan.app`), `KRIYAN_API_KEY` for scripts.
- `kriyan login`: OAuth authorization code with PKCE against Clerk, using a pre-registered public client. Bind a loopback server on `127.0.0.1:0`, open the browser to the authorize URL, exchange the code, store the access and refresh tokens in the OS keychain with `@napi-rs/keyring` (service `kriyan`), falling back to `~/.config/kriyan/credentials.json` with mode 600 when no keychain is available, and say which was used. Refresh silently when a request gets 401. `kriyan logout` clears both. The client id and the authorize and token URLs come from `GET /api/v1/auth-config` so the CLI has nothing hard-coded except the app URL. In your report, list what must be created in the Clerk dashboard: a public OAuth application named "Kriyan CLI" with redirect `http://127.0.0.1/callback`, PKCE required, scopes as above. Do not create it yourself.
- Commands, each with `--json`:
  - `kriyan add "<text>"` (quick add), `kriyan today`, `kriyan day <date>`, `kriyan week`, `kriyan list [--area] [--project] [--due today|week|overdue] [--all]`, `kriyan done <id or text>`, `kriyan reopen <id or text>`, `kriyan move <id or text> <when>` (when parsed by `@kriyan/core`), `kriyan goals`, `kriyan open` (opens the web app), `kriyan mcp` (prints the MCP setup snippets from `docs/mcp.md`), `kriyan whoami`.
  - Text matching for `done`, `reopen` and `move`: case-insensitive substring over active tasks; if more than one matches, print the candidates with short ids and exit 2.
- Output: plain aligned text, dates as "Tue 29 Sep", times 24-hour, area shown as a word, never colour alone. No emoji. Exit codes: 0 ok, 1 error, 2 ambiguous, 3 not logged in.
- Tests with `bun test` for argument parsing, text matching and output formatting, using a fake HTTP layer. No network in tests.
- `packages/cli/README.md` with install and every command. Add a `release` GitHub Actions workflow that publishes to npm on a `cli-v*` tag using an `NPM_TOKEN` secret (the owner will add the secret; do not add it).

## Verify and report

```
bun run typecheck
bun run lint
bun run test
bun run build
cd packages/cli && bun run build && node dist/kriyan.js --help
```

Then, with the web app running locally and a real signed-in session, exercise the MCP server with a script that speaks Streamable HTTP (list tools, call `get_overview`, `quick_add`, `complete_task`) and paste the real responses. Do the same for three API endpoints with an API key if one can be created in the Clerk dashboard for the dev instance; if not, say so. List everything that needs a dashboard change, with exact settings.
