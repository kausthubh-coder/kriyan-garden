# Kriyan API v1

Base URL: `https://app.kriyan.app/api/v1`. The routes were verified locally against the development backend with real Clerk OAuth. [The auth report](reports/18-auth.md) records the proof; this brief does not deploy the web app. MCP and REST call `apps/web/src/lib/operations/` and the same owner-isolated Convex service functions.

## Authentication

Send `Authorization: Bearer <token>` with a Clerk user OAuth access token for the exact `/api/v1` resource. Browser login with S256 PKCE requests `openid profile email`; the CLI also requests `offline_access` for silent refresh. A valid token grants full access to its verified user's own planner. Session tokens and non-user identities cannot authorize the API. There is no per-operation scope gate.

REST verifies the actual bearer against `https://app.kriyan.app/api/v1`, with no trailing slash. A token for `/mcp`, a missing audience, an expired or revoked token or a non-user subject gets 401. Every backend read and write remains owner-isolated.

Public metadata lives at `/.well-known/oauth-protected-resource/api/v1`. A 401 advertises it in `WWW-Authenticate`. Both resources use `MCP_PUBLIC_ORIGIN`, defaulting to `https://app.kriyan.app` in production and the request's loopback origin in local development. Internal URLs and forwarded headers cannot choose the production audience.

`GET /auth-config` returns public client ID, authorization and token endpoints, resource, standard scopes, today and timezone. Supply your device's IANA timezone. An omitted today is calculated in that timezone. The CLI checks the resource matches its app origin and sends it in authorization, exchange and refresh. Missing configuration gets 503.

The hosted product uses the Clerk development instance, with its 100-user limit and development banner. Configuration was done through the Clerk CLI and needs no dashboard work. See [how Clerk is configured](setup/05-development-oauth.md).

## Request conventions

GET parameters go in the query string. POST/PATCH requests need `Content-Type: application/json` and a JSON object. Body fields override query fields, and an ID in a route overrides any body ID. Unknown fields are rejected. Requests have a 150000-character body limit.

Every planner request accepts `today` (`YYYY-MM-DD`) and `timezone` (IANA). The CLI always sends its device values. Otherwise the server uses the profile timezone and its local date. Missing both a profile timezone and a caller timezone returns `TIMEZONE_REQUIRED`. All successful responses include the effective `today` and `timezone`. Neither UTC server date nor an invented task length is used.

Area/project references accept `area`/`project` or `areaId`/`projectId`, by returned ID or case-insensitive exact name. A project can be named as `School / Economics`. Goal references accept `goal` or `goalId`. Do not send both aliases for one reference. Ambiguous names return candidates; retry with a chosen ID.

Writes return `ok: true`, the saved `id`, one plain `readBack` sentence and the saved entity. Quick add includes `parsed`; complete includes `nextOccurrence` when applicable. Entities expose `id` alongside Convex `_id` for compatibility, without owner IDs or internal search text. Creation returns 201; other successful operations return 200. Responses are not cached.

## Routes

Paths below are relative to `/api/v1`.

| Method/path | Inputs and result |
| --- | --- |
| `GET /auth-config` | Public CLI login settings; supply device timezone |
| `GET /me` | Profile and Clerk user ID |
| `GET /overview` | Areas, projects/courses, active goals, today's summary |
| `GET /day?date=YYYY-MM-DD` | Defaults to today; timed/any-time tasks, events, unscheduled tasks, planned/free minutes |
| `GET /week?start=YYYY-MM-DD` | Defaults to this calendar week's start; per-day load and deadlines within 14 days of today |
| `GET /tasks` | Task filters below, up to 100 |
| `POST /tasks/quick-add` | `text`; saved task and parsed fields |
| `POST /tasks` | Structured task fields below |
| `PATCH /tasks/:id` | Any mutable task fields; omitted fields stay unchanged |
| `POST /tasks/:id/complete` | `completed`, defaults true; false reopens |
| `POST /tasks/:id/move` | Required nullable `date`, optional nullable `time`; nothing else changes |
| `GET /goals` | `status=active|
| `POST /goals` | Goal fields below |
| `PATCH /goals/:id` | Any mutable goal fields |
| `GET /spaces` | Areas, projects and courses |

`GET /tasks` accepts area/project/goal references, `status=active|completed|all` (default active), `dateFrom`, `dateTo`, `deadlineFrom`, `deadlineTo`, `text` and `limit` (1 through 100, default 100). Text is a case-insensitive title substring. `due=today|week|overdue` filters deadlines using the effective local date and cannot be combined with explicit deadline bounds. Week means the current calendar week. Bounds are inclusive; reversed ranges are invalid. Filtering happens before the 100-result limit. An excessive broad scan asks for narrower filters instead of silently dropping matches. MCP `search` separately searches titles and notes.

Task create requires a nonempty `title` (max 180). Optional fields are area/project/goal references, nullable `date`, nullable 24-hour `time`, nullable `durationMinutes` (1 through 1440), nullable `deadline`, nullable `repeat`, `reminders` (up to eight), and `notes`. Null length means unknown. Repeat has integer `every`, unit `day|week|month|year` and optional numerical `weekdays` (Sunday 0 through Saturday 6). Reminder objects have type `at_start`, `before` plus positive minutes, `morning_of`, `day_before`, or `at_time` plus `HH:MM`. Reminders need a date; start/before need a time. A project and area must agree. Patches distinguish omission from explicit null. Clearing a task date also clears its time.

Goal create requires `title` (max 120). Optional fields are area, `note` (max 180), nullable `targetDate`, `startDate`, `status=active|done|archived`, and `metric`. Metrics are `{ "kind": "tasks" }`, `{ "kind": "milestones" }`, or `{ "kind": "number", "unit": "pages", "target": 100, "current": 0 }`. Current is nonnegative and target is positive. More goal/milestone/project operations are available through MCP; REST stays within Brief 05's endpoint list.

## Examples

Obtain a resource-bound OAuth access token through PKCE and keep it in a private token store. These examples read it from `KRIYAN_ACCESS_TOKEN`; do not print it.

```sh
curl --fail-with-body \
  -H "Authorization: Bearer $KRIYAN_ACCESS_TOKEN" \
  'https://app.kriyan.app/api/v1/day?today=2026-09-29&timezone=America%2FNew_York'

curl --fail-with-body \
  -H "Authorization: Bearer $KRIYAN_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"text":"essay fri #econ 2h","today":"2026-09-29","timezone":"America/New_York"}' \
  'https://app.kriyan.app/api/v1/tasks/quick-add'

curl --fail-with-body \
  -H "Authorization: Bearer $KRIYAN_ACCESS_TOKEN" \
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
| 401 | No valid resource-bound OAuth access token; sign in again |
| 403 | The request origin is not allowed; use the configured origin |
| 404 | The requested record does not exist for this owner |
| 409 | Ambiguous name; choose a returned candidate |
| 413 | Body too large; shorten it |
| 415 | Wrong content type; send JSON |
| 429 | Per-user limit reached; wait before retrying |
| 500 | Unexpected failure; try again without assuming the write succeeded |
| 503 | Required operator settings or backend functions are unavailable |

Rate errors include `Retry-After: 60`. Convex shares fixed-minute limits of 60 reads and 30 writes per user across REST and MCP. Compound operations count once; separate users and read/write budgets are independent.
