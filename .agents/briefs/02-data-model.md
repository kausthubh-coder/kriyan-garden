# Brief 02: data model v2, operations layer, service auth, tests

Read `AGENTS.md`, `docs/PLAN.md` sections 3, 4 and 5, and the prototype's `app.js` (its seed data and views show exactly what the model must support). Then read everything in `packages/backend/convex/`.

## Goal

Replace the v1 backend (profiles, regions, tasks) with the v2 model below. The old data may be discarded; the owner has confirmed this. Keep the web app compiling by replacing the old UI with a thin placeholder (the real UI is a later brief). Keep the MCP route compiling with minimal changes.

## Schema (`packages/backend/convex/schema.ts`)

Every table has `ownerId: string`, `createdAt: number` and `updatedAt: number` (epoch milliseconds). Every index starts with `ownerId`. Dates are `YYYY-MM-DD` strings in the local calendar of the user; times are `HH:MM` 24-hour strings. Never store JavaScript Date objects or ISO datetimes for dates and times.

```
profiles      onboardingComplete, timezone (IANA string), dailyCapacityMinutes (default 360),
              dayStartHour (default 7), dayEndHour (default 23)
              index by_owner [ownerId]

areas         name, color (one of "blue" | "orange" | "green" | "red" | "yellow" | "purple" | "teal" | "grey"),
              sortOrder
              index by_owner [ownerId], by_owner_sort [ownerId, sortOrder]

projects      areaId (Id<areas>), name, kind ("project" | "course"), note (string), sortOrder,
              archivedAt (number | null)
              index by_owner [ownerId], by_owner_area [ownerId, areaId]

goals         areaId, title, note, targetDate (string | null), startDate (string),
              metric: { kind: "tasks" } | { kind: "number", unit: string, target: number, current: number } | { kind: "milestones" },
              status ("active" | "done" | "archived"), sortOrder
              index by_owner [ownerId], by_owner_area [ownerId, areaId], by_owner_status [ownerId, status]

milestones    goalId, title, targetDate (string | null), doneAt (number | null), sortOrder
              index by_owner [ownerId], by_owner_goal [ownerId, goalId]

events        areaId (Id<areas> | null), title, location (string), weekdays (number[] 0=Sunday),
              startTime, endTime, fromDate (string), untilDate (string | null)
              index by_owner [ownerId]

tasks         title, areaId, projectId (Id<projects> | null), goalId (Id<goals> | null),
              date (string | null), time (string | null), durationMinutes (number | null),
              deadline (string | null),
              repeat: null | { every: number, unit: "day" | "week" | "month" | "year", weekdays?: number[] },
              reminders: array of
                { type: "at_start" } | { type: "before", minutes: number } | { type: "morning_of" }
                | { type: "day_before" } | { type: "at_time", time: string },
              notes (string, max 100 000 chars),
              status ("active" | "completed"), completedAt (number | null), sortOrder, searchText
              index by_owner [ownerId], by_owner_date [ownerId, date], by_owner_status [ownerId, status],
              by_owner_project [ownerId, projectId], by_owner_goal [ownerId, goalId],
              by_owner_deadline [ownerId, deadline]
              searchIndex search [searchText] filter [ownerId, status]

habits        areaId, title, weeklyTarget (number 1 to 7), archivedAt (number | null)
              index by_owner [ownerId]

habitLogs     habitId, date
              index by_owner_habit [ownerId, habitId], by_owner_date [ownerId, date]

serviceNonces nonce (string), expiresAt (number)
              index by_nonce [nonce], by_expires [expiresAt]
```

Validators for every shape live in `validators.ts` and are reused by public functions, service functions and the MCP route.

## Operations layer (`packages/backend/convex/model/`)

Plain functions that take `(ctx, ownerId, args)` and contain all rules. Public functions and service functions are thin wrappers. Files: `profiles.ts`, `areas.ts`, `projects.ts`, `goals.ts`, `events.ts`, `tasks.ts`, `habits.ts`, `day.ts`, `week.ts`.

Rules that must live here:

- A task's `projectId` must belong to the same `areaId`. Setting a project sets the area. Changing the area clears a project from another area.
- `time` without `date` is invalid: setting a time on an undated task requires a date in the same call.
- Clearing `date` clears `time`.
- `durationMinutes` is optional everywhere. Round to whole minutes, clamp 1 to 1440.
- Completing a task with a `repeat` marks it completed and creates the next occurrence: same fields, `date` advanced by the rule (for weekly with `weekdays`, the next listed weekday after the current date), `status` active, new ids. Reopening a task does not delete the occurrence it created.
- `searchText` is `title` plus `notes` with HTML stripped, capped at 120 000 chars, updated on every write.
- Text limits: title 180, area and project names 48, goal title 120, note 180, location 80. Trim everything.
- Caps per owner: 12 areas, 200 projects, 100 goals, 100 events, 50 habits, 5 000 active tasks. Exceeding a cap throws a clear error.
- `day.get(date)` returns: tasks with that date, split into `timed` (has time) and `anytime`; `events` that occur on that weekday within their date range; and `unscheduled` (active tasks with no date). Plus totals: planned minutes (active tasks with a duration), count without a duration.
- `week.get(startDate)` returns for each of 7 days: planned minutes by area, task count, count without a duration, and the day's tasks and events, using the same shapes as `day.get`.
- `goals.list()` returns goals with `linkedTasks` counts (total and done) and milestones.
- `tasks.quickAdd(text, today)`: if the parse gives a time but no date, use `today` as the date. It uses `@kriyan/core`'s parser with the owner's areas and projects, then creates the task. `defaultAreaId` is the first area by sort order. Add `@kriyan/core` as a dependency of the backend package; Convex bundles workspace packages.

## Public functions (Clerk session identity)

One file per table in `packages/backend/convex/`: `areas.ts`, `projects.ts`, `goals.ts`, `events.ts`, `tasks.ts`, `habits.ts`, `profiles.ts`, `day.ts`, `week.ts`. Each function calls `requireOwnerId(ctx)` first, then the model. Include: list, get, create, update (patch semantics: only supplied fields change), remove (areas: refuse if any project, goal or task still uses it), complete or reopen for tasks, quickAdd, `profiles.ensure` (creates the profile and the three default areas School, Business and Life with colors blue, orange, green on first call), `profiles.completeOnboarding`, and `profiles.resetAll` which deletes every row the owner has, in batches of 100 using the scheduler for continuation.

## Service functions (for MCP and the API)

Rename `mcp.ts` and `mcpInternal.ts` to `service.ts` and `serviceInternal.ts`. Keep the HMAC design from `canonical.ts` and `operations.ts` (PR #1) and extend it:

- The signed envelope is `[timestamp, nonce, ownerId, operation, payload]` in canonical JSON.
- Reject if `|now - timestamp| > 5 minutes`, if the signature is invalid, or if the nonce was seen before. Store nonces in `serviceNonces` with `expiresAt = timestamp + 10 minutes`. Add a cron in `crons.ts` that deletes expired nonces hourly.
- The env var is renamed from `MCP_SERVICE_SECRET` to `SERVICE_SECRET`. Update `apps/web/.env.example`, the README, and `apps/web/src/lib/mcp-convex.ts` (rename it `service-client.ts`). Do not change the value in `.env.local` yourself; note in your report that `SERVICE_SECRET` must be set in Convex and in the web env, and read it from `MCP_SERVICE_SECRET` as a fallback for now so nothing breaks.
- Expose every operation the public functions expose, taking `ownerId` from the verified envelope.

## Remove the v1 backend and UI

- Delete `garden.ts`, `helpers.ts` (fold what is still needed into `model/shared.ts`), `operations.ts` (its logic moves into `model/tasks.ts`), and the `regions` table.
- Delete the old UI: `apps/web/src/components/kriyan/*`, `src/lib/horizon.ts`, `src/lib/types.ts`, `src/lib/today.ts` if nothing uses them, and the `/garden` route. Add a `/app` route, protected by Clerk, that calls `profiles.ensure` and renders a plain placeholder: the signed-in user's areas from `areas.list` as a text list, a text input that calls `tasks.quickAdd`, and the resulting task titles from `day.get` for today (today computed in the browser). No styling beyond what is needed to be readable; the real UI is brief 03. Update `proxy.ts` so `/app` is protected and `/garden` redirects to `/app`. Update the sign-in and sign-up redirect env vars to `/app` in `.env.example`.
- Update `apps/web/src/app/mcp/route.ts` only as much as needed to compile against the new service functions: map `regionId` to `projectId`, `dueDate` to `date`, `content` to `notes`, and add `deadline`. Tool descriptions must not mention gardens or horizons. Full MCP redesign is a later brief.

## Data reset

The v1 tables on the Convex dev deployment have already been emptied, so the new schema will push cleanly. Run `bunx convex dev --once` from `packages/backend` (its `.env.local` selects the deployment) to push the schema and regenerate `_generated`. Commit the regenerated files.

## Tests

Set up `convex-test` with `vitest` and `@edge-runtime/vm` in `packages/backend` (`vitest.config.ts` with `environment: "edge-runtime"`, `server.deps.inline: ["convex-test"]`). Add `"test": "vitest run"` and make the root `bun run test` include it.

Write tests in `packages/backend/convex/__tests__/`:

1. Owner isolation: user A creates an area, a project, a goal, a task and an event; user B lists each and gets nothing; user B trying to `get`, `update` or `remove` any of them by id gets an error.
2. `profiles.ensure` creates exactly three areas once, and is idempotent.
3. Task rules: project must match area; time requires date; clearing date clears time; duration optional and clamped; caps enforced.
4. Repeat: completing a weekly Monday-and-Thursday task on a Monday creates the next occurrence on Thursday; completing a daily task creates tomorrow's.
5. `day.get` splits timed, anytime and unscheduled correctly and computes planned minutes only from tasks with a duration.
6. `week.get` returns 7 days with per-area minutes.
7. Service auth: a correctly signed envelope succeeds; a tampered payload, an old timestamp and a reused nonce each fail.
8. `quickAdd` creates a task with the parsed fields and the default area.

## Verify and report

```
bun install
bun run typecheck
bun run lint
bun run test
bun run build
cd packages/backend && bunx convex dev --once
```

Paste the real final lines of each. List every file created, renamed or deleted. List anything you were unsure about, and anything in the plan you could not follow and why.
