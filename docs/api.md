# Kriyan API v1

Base URL: `https://app.kriyan.app/api/v1`. This worktree implements the routes but has not deployed them. [The report](reports/05-mcp-api-cli.md) records the current live blockers. MCP and REST call `apps/web/src/lib/operations/` and the same owner-isolated Convex service functions.

## Authentication

Send `Authorization: Bearer <token>` using a Clerk user OAuth access token or user-owned API key. Routes call `auth({ acceptsToken: ["oauth_token", "api_key"] })`. Session JWTs and organization-owned keys are rejected. The token needs the operation's scopes listed below. See [Clerk request authentication](https://clerk.com/docs/reference/backend/authenticate-request) and [API-key creation](https://clerk.com/docs/reference/backend/api-keys/create).

OAuth tokens must target the exact canonical REST resource `https://app.kriyan.app/api/v1`, without a trailing slash. REST verifies the actual bearer through the pinned `@clerk/backend@3.21.0` SDK with that audience and uses the verified subject/scopes. Missing audiences, another resource's audience, revoked/expired tokens and non-user subjects are rejected. A token for `/mcp` cannot authorize REST, and a REST token cannot authorize MCP. User API keys keep Clerk's verified user/scopes path and do not undergo OAuth audience verification.

Public resource metadata is at `/.well-known/oauth-protected-resource/api/v1`. REST 401 and insufficient-scope 403 responses advertise this URL in `WWW-Authenticate`. Both resource URLs use the same configured `MCP_PUBLIC_ORIGIN`, despite its existing name. Set it to the public HTTPS origin for self-hosting. Production defaults to `https://app.kriyan.app`; loopback development uses its request origin. Internal reverse-proxy URLs and forwarded headers cannot change production audiences or challenges.

`GET /auth-config` is public so the CLI can start login. With a configured public `CLERK_CLI_CLIENT_ID`, it returns `clientId`, `authorizationEndpoint`, `tokenEndpoint`, `resource`, `scopes`, `today` and `timezone`. The resource is the canonical REST URL above. Endpoints are discovered from Clerk metadata. The CLI validates the resource against its configured app origin and sends it in authorization, code exchange and refresh. The CLI supplies its device calendar. Anonymous callers must supply an IANA `timezone` because there is no profile to read. An omitted `today` is calculated in that timezone. Missing operator configuration returns 503 `AUTH_NOT_CONFIGURED`. Tokens and client secrets are never returned.

Six planner scopes are supported: `tasks:read`, `tasks:write`, `spaces:read`, `spaces:write`, `goals:read`, `goals:write`. CLI login additionally requests `offline_access` for refresh. The configured Clerk application must allow them. Organization access and task deletion are outside this release.

Supervisor setup payloads and dashboard-only requirements are in [development OAuth setup](setup/05-development-oauth.md). Enable resource-derived audience claims before signing in. Old credentials without the correct audience may need a new `kriyan login`.

## Request conventions

GET parameters go in the query string. POST/PATCH requests need `Content-Type: application/json` and a JSON object. Body fields override query fields, and an ID in a route overrides any body ID. Unknown fields are rejected. Requests have a 150000-character body limit.

Every planner request accepts `today` (`YYYY-MM-DD`) and `timezone` (IANA). The CLI always sends its device values. Otherwise the server uses the profile timezone and its local date. Missing both a profile timezone and a caller timezone returns `TIMEZONE_REQUIRED`. All successful responses include the effective `today` and `timezone`. Neither UTC server date nor an invented task length is used.

Area/project references accept `area`/`project` or `areaId`/`projectId`, by returned ID or case-insensitive exact name. A project can be named as `School / Economics`. Goal references accept `goal` or `goalId`. Do not send both aliases for one reference. Ambiguous names return candidates; retry with a chosen ID.

Writes return `ok: true`, the saved `id`, one plain `readBack` sentence and the saved entity. Quick add includes `parsed`; complete includes `nextOccurrence` when applicable. Entities expose `id` alongside Convex `_id` for compatibility, without owner IDs or internal search text. Creation returns 201; other successful operations return 200. Responses are not cached.

## Routes

Paths below are relative to `/api/v1`.

| Method/path | Inputs and result | Scope |
| --- | --- | --- |
| `GET /auth-config` | Public CLI login settings; supply device timezone | Public |
| `GET /me` | Profile and Clerk user ID | Authenticated user; no planner scope |
| `GET /overview` | Areas, projects/courses, active goals, today's summary | All three read scopes |
| `GET /day?date=YYYY-MM-DD` | Defaults to today; timed/any-time tasks, events, unscheduled tasks, planned/free minutes | `tasks:read` |
| `GET /week?start=YYYY-MM-DD` | Defaults to this calendar week's start; per-day load and deadlines within 14 days of today | `tasks:read` |
| `GET /tasks` | Task filters below, up to 100 | `tasks:read` |
| `POST /tasks/quick-add` | `text`; saved task and parsed fields | `tasks:write` |
| `POST /tasks` | Structured task fields below | `tasks:write` |
| `PATCH /tasks/:id` | Any mutable task fields; omitted fields stay unchanged | `tasks:write` |
| `POST /tasks/:id/complete` | `completed`, defaults true; false reopens | `tasks:write` |
| `POST /tasks/:id/move` | Required nullable `date`, optional nullable `time`; nothing else changes | `tasks:write` |
| `GET /goals` | `status=active|done|archived|all` (default active), optional area | `goals:read` |
| `POST /goals` | Goal fields below | `goals:write` |
| `PATCH /goals/:id` | Any mutable goal fields | `goals:write` |
| `GET /spaces` | Areas, projects and courses | `spaces:read` |

`GET /tasks` accepts area/project/goal references, `status=active|completed|all` (default active), `dateFrom`, `dateTo`, `deadlineFrom`, `deadlineTo`, `text` and `limit` (1 through 100, default 100). Text is a case-insensitive title substring. `due=today|week|overdue` filters deadlines using the effective local date and cannot be combined with explicit deadline bounds. Week means the current calendar week. Bounds are inclusive; reversed ranges are invalid. Filtering happens before the 100-result limit. An excessive broad scan asks for narrower filters instead of silently dropping matches. MCP `search` separately searches titles and notes.

Task create requires a nonempty `title` (max 180). Optional fields are area/project/goal references, nullable `date`, nullable 24-hour `time`, nullable `durationMinutes` (1 through 1440), nullable `deadline`, nullable `repeat`, `reminders` (up to eight), and `notes`. Null length means unknown. Repeat has integer `every`, unit `day|week|month|year` and optional numerical `weekdays` (Sunday 0 through Saturday 6). Reminder objects have type `at_start`, `before` plus positive minutes, `morning_of`, `day_before`, or `at_time` plus `HH:MM`. Reminders need a date; start/before need a time. A project and area must agree. Patches distinguish omission from explicit null. Clearing a task date also clears its time.

Goal create requires `title` (max 120). Optional fields are area, `note` (max 180), nullable `targetDate`, `startDate`, `status=active|done|archived`, and `metric`. Metrics are `{ "kind": "tasks" }`, `{ "kind": "milestones" }`, or `{ "kind": "number", "unit": "pages", "target": 100, "current": 0 }`. Current is nonnegative and target is positive. More goal/milestone/project operations are available through MCP; REST stays within Brief 05's endpoint list.

## Examples

Use your shell or secret manager to set `KRIYAN_API_KEY`. These commands do not print it.

```sh
curl --fail-with-body \
  -H "Authorization: Bearer $KRIYAN_API_KEY" \
  'https://app.kriyan.app/api/v1/day?today=2026-09-29&timezone=America%2FNew_York'

curl --fail-with-body \
  -H "Authorization: Bearer $KRIYAN_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"text":"essay fri #econ 2h","today":"2026-09-29","timezone":"America/New_York"}' \
  'https://app.kriyan.app/api/v1/tasks/quick-add'

curl --fail-with-body \
  -H "Authorization: Bearer $KRIYAN_API_KEY" \
  -H 'Content-Type: application/json' \
  -X PATCH \
  -d '{"durationMinutes":null,"today":"2026-09-29","timezone":"America/New_York"}' \
  'https://app.kriyan.app/api/v1/tasks/RETURNED_TASK_ID'
```

## Errors and limits

Errors have `{ "error": { "code": "...", "message": "..." } }`. Ambiguity adds `candidates` with IDs, names and paths. Errors do not expose private service envelopes or backend stacks.

| HTTP status | Meaning |
| --- | --- |
| 400 | Invalid fields, calendar, JSON, ID or incompatible references |
| 401 | No valid OAuth access token or API key; sign in again |
| 403 | Wrong identity kind or missing scope; approve the required scope |
| 404 | The requested record does not exist for this owner |
| 409 | Ambiguous name; choose a returned candidate |
| 413 | Body too large; shorten it |
| 415 | Wrong content type; send JSON |
| 429 | Per-user limit reached; wait before retrying |
| 500 | Unexpected failure; try again without assuming the write succeeded |
| 503 | Required operator settings or backend functions are unavailable |

Scope errors include `WWW-Authenticate: Bearer error="insufficient_scope"` with required scopes. Rate errors include `Retry-After: 60`. Convex shares fixed-minute limits of 60 reads and 30 writes per user across REST and MCP. Compound operations count once; separate users and read/write budgets are independent.
