# Test brief 23: the MCP server end to end

You are a tester. Claude wrote and committed the code (`cb1796e` on `t3code/42c69ded`); your job is to use it as a real user would and report what works and what does not. **Do not change any source, test or doc file.** You may only write inside `.agents/test-kriyan/` and `.agents/logs/` (both ignored by git) and write your report at `docs/reports/23-mcp-test.md`. Do not commit, push or deploy to production. When something fails, record the exact call, the response and what you expected, and keep going.

Keep it short: the owner prefers shipping once the core works. Aim for under an hour.

## Machine rules

You are the only heavy Codex session on this laptop (16 GB; the owner's browser holds about 22 GB of commit). Before starting `next dev` or Playwright, read `Win32_OperatingSystem.FreeVirtualMemory` and start only with at least 3 GB free. One heavy process at a time. Never stop the owner's applications or the Codex desktop app's helper processes. No emulator and no Android build in this brief.

## Read first

`AGENTS.md`, `.agents/skills/test-kriyan/SKILL.md` (use its scripts, run with Node), `docs/mcp.md` (the tools, `apply_plan`, prompts), `apps/web/src/lib/operations/prompts.ts`.

## Setup

1. This worktree has no `apps/web/.env.local`. Find a development one in another Kriyan checkout (the main checkout is `C:\Users\kaust\OneDrive\Documents\ChatGPT\kriyan`, which has a root `.env.local`; other worktrees are under `C:\Users\kaust\.t3\worktrees\kriyan\` and possibly `C:\Users\kaust\.codex\worktrees\`). Copy what the skill needs into this worktree's `apps/web/.env.local` (and `packages/backend/.env.local` if the Convex CLI needs it). If `SERVICE_SECRET` is missing, read it from the **development** Convex deployment's environment with the Convex CLI. Never print any value. Keys must be `pk_test_` / `sk_test_`.
2. Push this checkout's backend to the **development** Convex deployment only (`bunx convex dev --once` from `packages/backend`). Before pushing, confirm the target is the dev deployment named in `CONVEX_DEPLOYMENT` and not production; if you cannot confirm it, stop and report.
3. Start one `next dev` for `apps/web` on port 3423 and pass `--base http://localhost:3423` to every script.
4. `node .agents/skills/test-kriyan/scripts/doctor.mjs`. All checks must pass.
5. Create a password test user (`user.mjs create --tag mcp23 --password`) and get an MCP token with `oauth.mjs ... --resource mcp --register --refresh --out mcp23.json`.

## Tests

### A. Discovery

- `mcp.mjs --list` under both protocols (`2026-07-28` default, `--protocol 2025-11-25`). Expect 42 tools including `apply_plan`, `create_event`, `log_habit`, `delete_task`, `update_settings`. Check that `delete_*` tools carry `destructiveHint: true` and reads carry `readOnlyHint: true`.
- `mcp.mjs` may not support prompts. If not, write a small client in `.agents/test-kriyan/` that calls `prompts/list` and `prompts/get organize_my_life` with `{ "focus": "this semester" }`. Expect 5 prompts. Record the server `instructions` text returned at discovery or initialize.

### B. Organise a student's life with `apply_plan`

Make a small fake work folder at `.agents/test-kriyan/student/`: a `syllabus.md` with two courses and their class times (for example CS 101 Mon/Wed/Fri 09:00 to 09:50 in Hall 2, and Calculus II Tue/Thu 11:00 to 12:15, term 2026-09-01 to 2026-12-11), an `assignments.md` with five assignments and due dates in the next three weeks (one with no due date), and a `projects/portfolio/README.md` for a side project with two next steps. Then, acting as the assistant, build one `apply_plan` from those files the way the server instructions say (classes to events and courses, homework to tasks with deadlines, no invented lengths or due dates, refs between items).

1. Dry run. Expect every item `would_create`, a readable `readBack`, and nothing stored (`get_overview`, `list_events`, `list_tasks` unchanged).
2. Apply. Expect every item `created`. Then check with `list_events`, `list_tasks`, `get_week`, and `get_day` on a Monday in the term (the CS 101 class should appear among the day's events). Tasks have deadlines, `durationMinutes: null`, and the right course.
3. Apply the identical plan again. Expect every item `exists` and no new rows.
4. Change one class's location and apply with `onExisting: "update"`. Expect exactly that event `updated`.
5. A plan where one task points at a project that does not exist. Expect an `INVALID_INPUT` error naming the item (`tasks[N]: ...`) and nothing stored from that plan.

### C. Parity tools, one pass each

`create_event`, `update_event`, `delete_event`; `create_habit`, `log_habit` (today, then `done: false`), `list_habits`, `update_habit` with `archived: true`, `delete_habit` on a habit with logs (expect a refusal that says to archive); `create_area`, `update_area`, `reorder_areas`, `delete_area` on an area in use (expect a refusal) and on an empty one; `create_task` with `repeat` (weekly on two weekdays) and reminders, `complete_task` (the readBack should name the next occurrence with a date like "Thu 8 Oct", never `2026-10-08`), `delete_task`; `delete_project` on a course with tasks (refusal); `add_milestone`, `update_milestone`, `delete_milestone`, `delete_goal`; `get_settings`, `update_settings` (capacity), and set it back. Check every write's `readBack` reads naturally and has no ISO dates.

### D. The app shows it

Sign the user in with `session.mjs` and take two screenshots with Playwright at 1440 wide: the Day view for that Monday and the Week view, showing the classes and tasks created through MCP. Save them in `.agents/test-kriyan/23/` and link them in the report.

### E. The real experience: Codex organises the folder

Stop Playwright first. Then run one nested Codex, in `.agents/test-kriyan/student/`, connected only through command-line overrides (do not edit `~/.codex/config.toml`):

```
codex exec -m gpt-6.1-sol -c model_reasoning_effort="medium" -c 'mcp_servers.kriyan.url="http://localhost:3423/mcp"' -c 'mcp_servers.kriyan.bearer_token_env_var="KRIYAN_MCP_TOKEN"' --dangerously-bypass-approvals-and-sandbox "<prompt>"
```

Set `KRIYAN_MCP_TOKEN` from the token file without printing it. Use a **fresh** test user for this (reset the first one with `seed.mjs <email> reset`, or create a second user and token) so the run starts empty. The prompt is the one people will paste, plus consent because the run is not interactive:

> Use the Kriyan MCP server to organise my life. Read my class schedule, assignments and projects from this folder and our conversation, show me the plan, and add it to Kriyan once I agree. I agree in advance: show the plan, then apply it.

Save its output to `.agents/logs/23-nested-codex.log`. Then check with `mcp.mjs` what it stored. Report: which tools it called and in what order, whether it used `apply_plan` with `dryRun` first, whether everything in the folder landed in the right place, anything it invented (lengths, due dates, areas), and anything it got wrong or found confusing in the tool descriptions or instructions. Run the same prompt a second time and confirm nothing is duplicated.

## Clean up

Stop `next dev`. Delete every test user you created (`user.mjs delete`) and any dynamically registered OAuth application, then run `user.mjs list` and confirm only the two fixtures remain. Leave the dev Convex deployment as pushed.

## Report

`docs/reports/23-mcp-test.md`: a pass/fail table for A to E, each failure with the call, the response and the expectation, the nested Codex findings with short quotes from its log, the screenshot paths, and your suggestions for the tool descriptions or instructions (suggestions only; do not edit them).
