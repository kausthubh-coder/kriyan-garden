# MCP end-to-end test 23

2026-10-02. Tested `cb1796e` on `t3code/42c69ded`, using `http://localhost:3423` and development Convex `avid-stingray-875`. A–E passed. No product-blocking failure was found. Two nested Codex runs exited 0 and the second left the stored planner unchanged.

| Test | Result | Evidence |
| --- | --- | --- |
| A. Discovery | PASS | Both `2026-07-28` and `2025-11-25` returned 42 tools, including the five named in the brief. All delete annotations were destructive and all read annotations were read-only. Five prompts; `organize_my_life` included `Focus: this semester`. Both discovery methods returned identical instructions. |
| B. Student plan | PASS | All 14 items were `would_create` in preview, with overview/events/tasks unchanged. Apply returned 14 `created`; repeat returned 14 `exists`, without new rows. Two weekly class blocks appeared in Monday/day and week reads. Seven tasks had correct project/course links, null lengths and planned dates, four supplied deadlines and three null deadlines. Reapplying the full plan with Hall 2 changed to Hall 3 returned exactly one event `updated` and 13 `exists`. Invalid project reference rolled back the whole plan, including a preceding area creation. |
| C. Parity tools | PASS | 64 checks passed. Event CRUD, habit logging/undo/archive, area CRUD/reordering, repeat/reminders/completion/deletion, course deletion refusal, milestone CRUD, goal deletion and capacity update/restore all behaved as expected. Successful write readBacks were readable and contained no ISO dates. Next repeat was Thu 8 Oct at 15:00. Capacity restored to 360 minutes. |
| D. App | PASS | Signed in with `session.mjs`, completed the existing setup without adding planner items, and visually checked both screenshots at 1440 px wide. Monday shows CS 101 and all seven unscheduled tasks. Week shows both courses, homework deadlines and the next occurrence from C. |
| E. Nested Codex | PASS, with wording observations below | Fresh planner independently verified empty. Both runs read all three source files, previewed before applying and stored only the supplied information. Second run returned 14 `exists`; independent snapshots, including IDs, were identical. |

Setup verification used `bunx convex dev --once --codegen disable --typecheck disable` from `packages/backend`. The environment selected `dev:avid-stingray-875`, its URL matched, and CLI output explicitly identified `[Development]` before reporting `Convex functions ready!`. Code generation was disabled to preserve source files. `doctor.mjs --base http://localhost:3423` exited 0 with all four checks PASS: development keys, Convex deployment/no-diff, OAuth instance settings and CLI OAuth application. Clerk keys were verified as `pk_test_`/`sk_test_`; values were withheld. Initial `FreeVirtualMemory` was 6,228,752 KiB, above 3 GiB; admission checks before browser work also exceeded 3 GiB. Browser runs were serial, with none active during nested Codex. No Android work.

The [student folder](../../.agents/test-kriyan/student/) supplied the user's area names, timezone, classes, five assignments and two portfolio next steps. The [plan](../../.agents/test-kriyan/23/plan.json), [exact calls/responses](../../.agents/test-kriyan/23/calls.jsonl), [A/B checks](../../.agents/test-kriyan/23/ab-checks.json), [C checks](../../.agents/test-kriyan/23/c-checks.json) and [full-plan update](../../.agents/test-kriyan/23/full-update.json) preserve the evidence. Calls supplied `today: "2026-10-02"` and `timezone: "America/New_York"`, except settings writes use timezone only as a requested setting. Exact server instructions and prompt responses are recorded in [discovery.jsonl](../../.agents/test-kriyan/23/discovery.jsonl), including “Start with get_overview”, the class/course/homework mapping, preview/consent and readBack instructions.

Expected refusals were successful tests. These responses had `isError: true` and code `INVALID_INPUT`:

| Call, in addition to the common calendar fields | Exact error message | Expectation |
| --- | --- | --- |
| `apply_plan({areas:[{name:"Rollback marker"}],tasks:[{title:"Invalid project task",area:"Studies",project:"Does not exist"}]})` | `tasks[0]: Project "Does not exist" not found. Add it to the plan or use an existing name or ID.` | Named invalid item; nothing stored. Verified. |
| `delete_habit({id:<returned logged habit ID>})` after archive | `Habit has logs. Remove its logs or archive it first.` | Refuse deletion and suggest archive. Verified. |
| `delete_area({id:"Studies"})` | `Area is in use. Move or remove its records first.` | Refuse an occupied area. Verified. |
| `delete_project({id:"CS 101"})` | `Project has linked tasks. Unlink them before removing the project.` | Refuse a course with tasks. Verified. |

The exact returned IDs and complete arguments are in the call log. Reading the deleted task additionally returned `NOT_FOUND`, `Record not found. Read the list and check the ID.`, as expected.

[Day screenshot](../../.agents/test-kriyan/23/day.png) and [Week screenshot](../../.agents/test-kriyan/23/week.png) show Monday 5 October and its week. Tasks with only deadlines correctly remain unscheduled. Playwright closed before E.

Both nested runs used the exact prompt from the brief, model `gpt-6.1-sol`, medium reasoning and command-line MCP URL/bearer-environment overrides. Added `--ignore-user-config` to keep unrelated configured MCP servers out and `--json` for evidence; no personal configuration was edited. The token was loaded privately into `KRIYAN_MCP_TOKEN`. The first user's planner was reset using `seed.mjs <email> reset`.

Both runs called tools in this order: `get_overview`, `apply_plan(dryRun:true)`, `apply_plan` to apply. They showed the preview between the two plan calls. Run 1 returned 14 `would_create`, then 14 `created`; run 2 returned 14 `exists` both times. Independent MCP reads confirmed 2 user-named areas, 2 courses, 1 project, 2 term-bounded schedule blocks and 7 correctly linked tasks. No invented duration, planned date, due date, area, goal or habit. The four deadlines, class weekdays, times, locations and term dates matched the files.

Short quotes from [the nested log](../../.agents/logs/23-nested-codex.log):

> All seven tasks will have no planned work date or duration.

> Added 2 areas, 2 courses, 1 project, 2 schedule blocks and 7 tasks.

> All items existed, so nothing was duplicated.

[Nested analysis](../../.agents/test-kriyan/23/nested-analysis.json) records tool order and data comparisons. Neither run reported a confusing tool schema or tool error. Both paraphrased the preview readBack rather than repeating its exact sentence. Run 1's final wording said “five assignments with the supplied deadlines”, although only four have deadlines; its preview and stored data correctly retained the undated fifth assignment. Neither run called `list_events` or performed its own post-write reads. Unrelated inherited Studi/skill instructions also caused extra document reads; no unrelated application was opened or changed.

Suggestions only: put explicit `list_events` and post-write `get_day`/`get_week` instructions into the server instructions, as the named organize prompt already asks for schedule/week reads. Clarify whether readBack must be quoted exactly, including previews. Say “four dated assignments and one undated assignment” when summarizing this data. For a logged habit, “Archive the habit instead to preserve its history” would avoid telling someone to archive an already archived habit.

Recovered setup/harness failures: `user.mjs create --tag mcp23 --password --base http://localhost:3423` exited 1 with `Unknown option or missing option value. Read .agents/skills/test-kriyan/SKILL.md.` The script does not accept `--base`; retry without it succeeded. An erroneous local `MCP_PUBLIC_ORIGIN=http://localhost:3423` override made `GET /api/v1/auth-config?timezone=America%2FNew_York` return 500, `Set MCP_PUBLIC_ORIGIN to a public HTTPS origin.` Removing that override restored 200 and OAuth succeeded. The first screenshot harness attempted `getByRole('button', {name:'Skip',exact:true}).click()` at setup step 1 and timed out after 30000 ms; step 1 requires Continue. A subsequent strict exact-text CS 101 wait on Week was interrupted after about a minute; matching text that includes the displayed class time fixed it. Final screenshots passed. These were tester setup/selector errors, not product failures.

Cleanup completed: Next dev stopped, port 3423 had no listener, the disposable OAuth application and test user were deleted, and `user.mjs list` reported `Test users: 2; fixtures: 2.` Only `kriyan-03a+clerk_test@example.com` and `kriyan+clerk_test@example.com` remain. [Cleanup evidence](../../.agents/test-kriyan/23/cleanup.json). Development Convex remains as pushed. Next dev automatically rewrote `next-env.d.ts`; its original content was restored after shutdown. No source/test changes remain, no other docs were changed, no commit/push or production deployment occurred. The pre-existing untracked test brief was preserved.
