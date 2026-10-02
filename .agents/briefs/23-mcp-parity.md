# Brief 23: the MCP server can do everything the app can

You are the only Codex session on this machine. Work in this checkout (branch `t3code/42c69ded`). This brief touches only the backend, the web operations layer, the MCP route and docs. No emulator, no Gradle, no Android build.

Memory is the main risk on this laptop (the owner's browser holds about 22 GB). Before `next build` or a Playwright run, read `Win32_OperatingSystem.FreeVirtualMemory` and start only with at least 3 GB of commit free. Run one heavy process at a time. Never stop the owner's applications or the Codex desktop app's helper processes. Commit locally on `t3code/42c69ded` after each part below so a crash loses little. Do not push and do not deploy; the reviewer does both.

Read first: `AGENTS.md`, `apps/web/src/lib/operations/` (all of it), `apps/web/src/lib/operations/mcp.ts`, `packages/backend/convex/service.ts`, `packages/backend/convex/serviceInternal.ts`, `packages/backend/convex/model/`, `packages/backend/convex/validators.ts`, `docs/mcp.md`, `docs/site/mcp.md`, and `.agents/briefs/05-mcp-api-cli.md` (the original MCP brief; keep its conventions).

## Why

The owner's goal: open Codex (or Claude, ChatGPT, Cursor) inside the folder where their schoolwork and projects live and say "organize my life in Kriyan". The assistant already knows their class schedule, homework and projects from that folder, and it should be able to put all of it into Kriyan correctly in one go, and keep it current when asked again later, without duplicates. Today the MCP exposes only 21 tools and cannot touch the class schedule (events), habits, areas, settings, or delete anything, so that cannot work.

## Part A: parity tools

Everything below already exists as a service action in `packages/backend/convex/service.ts`. Wrap each one as an operation in `apps/web/src/lib/operations/index.ts` with a zod schema in `schemas.ts`, using the same patterns as the existing tools: optional `today`/`timezone`, references by ID or by name with `AMBIGUOUS` candidates, a `{ ok: true, id, <row>, readBack }` result for writes, plain-sentence errors. Business rules stay in the backend; do not reimplement them in the operation layer.

| Tool | Wraps | Notes |
|---|---|---|
| `list_events` | `eventsList` | The class schedule and other repeating time blocks. Include the area name. |
| `create_event` | `eventsCreate` | title, area (optional), location, weekdays (Sunday=0), startTime, endTime, fromDate, untilDate. Describe it as the tool for classes, lectures, labs, work shifts and other fixed weekly blocks. |
| `update_event` | `eventsUpdate` | Patch semantics. |
| `delete_event` | `eventsRemove` | |
| `list_habits` | `habitsList` + `habitsListLogs` | Each habit with its weekly target and this week's logged dates (week from `weekStart(today)`). |
| `create_habit`, `update_habit` | `habitsCreate`, `habitsUpdate` | `update_habit` can archive (`archived: true` sets `archivedAt`) and unarchive. |
| `delete_habit` | `habitsRemove` | The backend refuses when logs exist; pass that message through and suggest archiving. |
| `log_habit` | `habitsLog` / `habitsRemoveLog` | `{ habit, date?, done = true }`. `done: false` removes that date's log. |
| `create_area`, `update_area` | `areasCreate`, `areasUpdate` | name and colour (the eight named colours). |
| `delete_area` | `areasRemove` | The backend refuses when the area is in use; pass that through. |
| `reorder_areas` | `areasReorder` | Add the service action if it does not exist, following the existing service pattern and signature checks. |
| `update_project` | `projectsUpdate` | Extend the existing tool: also move between areas, switch kind, archive and unarchive, if `V.projectPatch` allows them. |
| `delete_project` | `projectsRemove` | Refused while tasks are linked; pass through. |
| `delete_task` | `tasksRemove` | |
| `delete_goal` | `goalsRemove` | Refused while linked; pass through. |
| `update_milestone`, `delete_milestone` | `goalsUpdateMilestone`, `goalsRemoveMilestone` | Title and target date. |
| `get_settings`, `update_settings` | `profilesGet`, `profilesUpdate` | timezone, dailyCapacityMinutes, dayStartHour, dayEndHour only. |
| `list_spaces` | | Fix its description: areas are no longer read-only. |

Out of scope on purpose: account deletion, reset all, sample data, onboarding, push tokens. Write a one-line comment in `index.ts` saying these are deliberately not exposed.

Set MCP annotations correctly for every tool: `readOnlyHint` for reads, `destructiveHint` for every `delete_*` and for patch tools that overwrite, `idempotentHint` where repeating the call changes nothing. Replace the hard-coded name lists in `mcp.ts` with flags on each operation definition so new tools cannot be forgotten.

## Part B: `apply_plan`, one call to organise everything

Add one write tool, `apply_plan`, for setting up or refreshing a whole plan in one call. Input, all arrays optional, at most 200 items in total:

```
{
  dryRun?: boolean,                    // default false
  onExisting?: "skip" | "update",      // default "skip"
  areas?:    [{ ref?, name, color? }],
  projects?: [{ ref?, name, area, kind: "project" | "course", note? }],
  events?:   [{ ref?, title, area?, location?, weekdays, startTime, endTime, fromDate, untilDate? }],
  goals?:    [{ ref?, title, area, note?, targetDate?, metric? }],
  tasks?:    [{ ref?, title, area?, project?, goal?, date?, time?, durationMinutes?, deadline?, repeat?, reminders?, notes? }],
  habits?:   [{ ref?, title, area, weeklyTarget }],
}
```

- `ref` is a local name the assistant chooses so later items in the same call can point at earlier ones (a task's `project: "cs101"` resolves to the course created with `ref: "cs101"`). References otherwise resolve by ID or name exactly like the single tools.
- Duplicates: before creating, match each item against what is stored, case-insensitively after trimming: areas by name; projects by area and name; events by title, weekdays and start time; goals by title; habits by title; active tasks by title plus area plus the same date or deadline. A match is reported as `exists` (and patched when `onExisting: "update"`), never created twice. Running the same plan twice must create nothing the second time. This is what lets the owner say "update Kriyan with my new homework" every week.
- All writes in one call happen in one Convex mutation, so either the whole plan is stored or nothing is. Add a service action in `service.ts` that calls the existing model functions inside one internal mutation; keep ownership checks and validation in those model functions. Check the Convex transaction limits and state them in the doc.
- `dryRun: true` runs the same resolution and duplicate matching and returns what would happen, writing nothing.
- Result: per item `{ kind, ref, status: "created" | "exists" | "updated" | "would_create" | "would_update", id }`, counts per kind, and a `readBack` of a few plain sentences ("Added 4 courses, 12 class times and 9 tasks in School. 2 tasks were already there.").
- Validation errors name the item (`tasks[3]: Use YYYY-MM-DD for deadline.`) and nothing is written.

## Part C: what the assistant is told

1. Server `instructions` in `mcp.ts`. Rewrite them as a short guide, at most about 250 words, covering: start with `get_overview`; use the person's own area names and never assume the defaults; when asked to organise or plan their life, gather what the assistant can already see (syllabi, assignment lists, calendars, project notes, READMEs in the working folder, and the conversation), then map classes and other fixed weekly blocks to events, each class to a course, homework and deliverables to tasks with deadlines (and a planned date only when the person wants one), longer efforts to projects or goals, and routines to habits or repeating tasks; never invent a task length or a due date; preview with `apply_plan` and `dryRun: true`, show the person a short summary, and apply only after they agree; after every write, repeat its `readBack`; never invent IDs.
2. MCP prompts. Register these with the MCP server's prompt API (check the installed `@modelcontextprotocol/server` and `mcp-handler` versions for how) so clients that show prompts (Claude Code lists them as `/mcp__kriyan__<name>`) can run them:
   - `organize_my_life`: argument `focus` (optional, free text). The full organise flow from point 1.
   - `plan_my_week`: read the week, deadlines and capacity, propose dates for unscheduled work, apply after agreement.
   - `plan_today`: what is on today, what is overdue, and a realistic order within free capacity.
   - `weekly_review`: what got done, what slipped, goal progress, and what to move.
   - `add_class_schedule`: argument `source` (optional). Turn a timetable into events and courses.
   Keep the prompt text in one module (for example `apps/web/src/lib/operations/prompts.ts`) and reuse the same words in the instructions where they overlap.
3. Tool descriptions. Every description says when to use the tool, not just what it does. Example for `create_event`: "Add a class, lecture, lab, shift or other block that repeats on fixed weekdays at fixed times. Use tasks for homework and to-dos."
4. `readBack` dates read like people's dates ("Thu 1 Oct", "Today", "14:30"), using the formatter already in `@kriyan/core`. The stored fields in the result stay ISO.
5. Setup prompts in `apps/web/src/lib/mcpClients.ts`: keep `KRIYAN_SETUP_PROMPT` and add `KRIYAN_ORGANIZE_PROMPT`, the sentence a person pastes into Codex or Claude Code inside their work folder, for example: "Use the Kriyan MCP server to organise my life. Read my class schedule, assignments and projects from this folder and our conversation, show me the plan, and add it to Kriyan once I agree." Show it in `docs/mcp.md` and `docs/site/mcp.md`. Do not change the landing page layout in this brief.

## Docs

Update `docs/mcp.md` and `docs/site/mcp.md`: the full tool list with one line each, the prompts, the `apply_plan` input with one worked example (a student with three courses, their class times, two assignments with deadlines, one side project), and the "organise my life from your work folder" flow for Codex and Claude Code.

## Tests

Keep it short (the owner prefers shipping once the core works):

- Unit tests in `apps/web/src/lib/operations/operations.test.ts` for: every new tool's schema and reference resolution with a fake service call, `apply_plan` local refs, duplicate matching, dry run, and the per-item error message.
- A Convex test (`packages/backend/convex/__tests__/`) that `apply_plan`'s mutation is all-or-nothing and that applying the same plan twice creates nothing the second time.
- One live smoke run with the test-kriyan skill (`.agents/skills/test-kriyan/`): a disposable `+clerk_test` account, the web app running locally, then over Streamable HTTP: list tools and prompts, `apply_plan` with `dryRun`, `apply_plan` for real, the same `apply_plan` again (all `exists`), `get_week`, `delete_event`. Paste the real responses in the report, then delete the test user.

## Verify and report

```
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

Write `docs/reports/23-mcp-parity.md`: the tools added, anything you could not wrap and why, the Convex limits for `apply_plan`, the live smoke output, and the real output of the commands above including failures. Commit on `t3code/42c69ded`. Do not push or deploy.
