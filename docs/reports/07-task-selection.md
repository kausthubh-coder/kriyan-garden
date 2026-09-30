# Safe task URL selection

Implemented locally on 30 September 2026 over clean HEAD `3ea290b` in `C:/Users/kaust/OneDrive/Documents/ChatGPT/kriyan-v2`. All changes remain unstaged and uncommitted for root review. Work was limited to the selected-task URL finding in the supervisor integration review. Android integration and the full audit still follow.

## Code decisions

The previous `useConvexSelectedTask` cast an unchecked URL string to a task ID and subscribed to the throwing public `tasks.get`. An invalid or unavailable selection could therefore reach the whole planner error boundary.

Added `tasks.lookup` with a string `key` argument and a task-or-null return validator. The public query requires identity before interpreting the key. Its shared model helper uses `ctx.db.normalizeId("tasks", key)`, reads the normalized ID directly and checks the row's owner before returning any task data. Invalid keys, wrong-table IDs, missing/deleted rows and foreign-owner rows all return `null`. There is no guessed ID regex or owner ID supplied by the caller. Direct ID lookup preserves owned deep links outside a bounded planner list without scanning that list or adding a schema index.

Existing `tasks.get`, shared strict `get`, REST/MCP operations and mutation semantics remain unchanged. Backend tests verify strict get still rejects foreign and deleted rows. The existing generated API imports the tasks module, so its types already include the new export; generated Convex files were not edited and no cloud codegen was run.

The live data-access hook now subscribes to `api.tasks.lookup` with the original string. `taskSelectionArgs` keeps absent, empty, locally generated optimistic and unauthenticated selections skipped. `undefined` remains the normal query loading/skipped result, with the request arguments identifying skipped selections; `null` means unavailable. The memory demo uses `selectTask` with the same result contract and its own reactive store. It invokes no Convex hook for selection.

`TaskSelectionPanel` adds a loading/recovery wrapper around the existing polished TaskPanel. Pending selections stay open with a loading status. A null result shows a generic unavailable alert and Close task details. Closing or Escape uses the existing AppShell URL cleanup and Dialog focus restoration. Ordinary owned-row updates keep the editor mounted under the same selection key, preserving unsaved title/notes drafts and rejected-save retry state. Existing task/goal exclusivity, view navigation, optional duration and mutation callbacks are retained. `TaskPanel.tsx` and `usePlanner.ts` have no changes.

The optimistic cache now finds selected tasks in the safe lookup cache and updates/removes matching lookup results by returned task ID. It preserves the subscribed string arguments, including normalized aliases, and leaves unrelated, null and loading selections alone. This covers owned tasks available only through a deep link, outside the bounded list. Existing strict-get/list/day/week cache behavior remains.

The new UI uses existing panel, header, empty-state and control styles. No CSS tokens, fonts, packages, pins or lockfile were changed. Changed source text is LF; an inherited CRLF copy of `tasks.ts` was normalized so its diff contains only the new endpoint.

## Regression coverage

Four new local Convex tests cover identity checks before valid/invalid keys, owned lookup outside a one-row list, edited owned rows, optional length, malformed/wrong-table keys, foreign owners, deleted/missing rows and preserved strict-get errors. These use convex-test data only.

Twelve new web tests cover raw-string query arguments, auth/optimistic skips, loading/null/row results, loading-to-ready panels, unavailable recovery and URL preservation, deep links outside the planner list, draft retention on ordinary updates, external deletion, Escape/focus cleanup, task/goal exclusivity, view navigation, rejected edits/retry and optimistic lookup cache changes. The real AppShell, selection wrapper, TaskPanel, Dialog and action hooks run against injected data. Unrelated planner views supply navigation controls; dialog opening and media queries use DOM fixtures. The demo regression asserts no Convex hooks are called. These are offline DOM tests, with no live browser, CSS geometry or hosted subscription claims.

Root `bun run test` passed **213 tests across all 18 intended files**, with zero failures or skips. It ran the grammar check followed by workspaces sequentially. All three existing web Bun suites remain in `test:bun`; both services SDK/operation files, hardening, Account Settings and the new selection DOM file are collected by web Vitest. Both DOM files select happy-dom through per-file pragmas. Bun-importing suites remain outside Vitest. Backend and web Vitest retain `--maxWorkers=1`.

| Runner | Collected file | Passed tests |
| --- | --- | ---: |
| Bun | `packages/core/src/goals.test.ts` | 3 |
| Bun | `packages/core/src/planning.test.ts` | 2 |
| Bun | `packages/core/src/quickAdd.test.ts` | 75 |
| Vitest | `packages/backend/convex/__tests__/isolation.test.ts` | 3 |
| Vitest | `packages/backend/convex/__tests__/model.test.ts` | 18 |
| Vitest | `packages/backend/convex/__tests__/service.test.ts` | 7 |
| Vitest | `packages/backend/convex/__tests__/accountDeletion.test.ts` | 2 |
| Vitest | `packages/backend/convex/__tests__/taskSelection.test.ts` | 4 |
| Bun | `apps/web/src/lib/origins.test.ts` | 1 |
| Bun | `apps/web/src/components/app/goalSelection.test.ts` | 1 |
| Bun | `apps/web/src/components/demo/store.test.ts` | 11 |
| Vitest | `apps/web/src/lib/operations/operations.test.ts` | 19 |
| Vitest | `apps/web/src/lib/operations/oauth.test.ts` | 1 |
| Vitest | `apps/web/src/lib/hardening.test.ts` | 11 |
| Vitest, happy-dom | `apps/web/src/components/app/AccountSettings.test.tsx` | 2 |
| Vitest, happy-dom | `apps/web/src/components/app/TaskSelection.test.tsx` | 12 |
| Bun | `packages/cli/src/cli.test.ts` | 36 |
| Bun | `packages/cli/src/credentials.test.ts` | 5 |
| Total | 18 files | 213 |

Actual runner totals were backend `Test Files 5 passed (5)`, `Tests 34 passed (34)`; core `80 pass`, `0 fail`, `Ran 80 tests across 3 files`; web Bun `13 pass`, `0 fail`, `Ran 13 tests across 3 files`; web Vitest `Test Files 5 passed (5)`, `Tests 45 passed (45)`; CLI `41 pass`, `0 fail`, `Ran 41 tests across 2 files`. File inventory and runner totals agree. Bun file counts come from actual pass output; Vitest per-file declarations, including both MCP protocol cases, match its reported totals.

## Checks and actual results

Commands ran from the checkout root with Bun 1.3.14, one at a time. No server or browser was started while Android QA was active elsewhere. Logs are ignored under `.data/07-task-selection/`.

| Command | Actual result | Log |
| --- | --- | --- |
| `bun run --filter @kriyan/web typegen` | Exit 0; `Generating route types...`, `Types generated successfully`, `Exited with code 0` | `typegen.log` |
| `bun run --filter @kriyan/core typecheck` | Exit 0; `@kriyan/core typecheck: Exited with code 0` | `core-typecheck.log` |
| `bun run --filter @kriyan/backend typecheck` | Exit 0; `@kriyan/backend typecheck: Exited with code 0` | `backend-typecheck.log` |
| `bun run --filter @kriyan/web typecheck` | Initial exit 2 for fixture typings; final exit 0, `@kriyan/web typecheck: Exited with code 0` | `web-typecheck.log`, `web-typecheck-final.log` |
| `bun run --filter @kriyan/web lint` | Exit 0; `@kriyan/web lint: Exited with code 0`, no warnings or errors | `web-lint.log` |
| `bun run test` | Exit 0; `Quick-add docs match tested grammar fixtures.` and all 213 tests passed across 18 files | `root-test.log` |
| `git diff --check`, `git diff --cached --check` | Exit 0; no output | Final workspace checks |

The initial web typecheck found only new fixture typing errors. The installed Convex auth result requires `isRefreshing`; the dialog fixture needed an explicit `this: HTMLDialogElement`; React Testing Library role selectors do not accept Playwright's `exact` option. Those fixtures were corrected without type suppression. The subsequent web typecheck, lint and first root test run passed. No test run failed or skipped a collected test. Core/backend have no configured lint scripts.

Package manifests, dependency pins and `bun.lock` have no diff. No install or dependency regeneration was needed. No generated Convex file, REST/MCP/CLI source, native source or existing task mutation was changed. Scratch logs remain ignored and unstaged.

## Deployment and review limits

The new `tasks:lookup` function has not been deployed. Root must review and deploy the integrated DEV backend before combined live/public browser QA. Authenticated subscriptions, real browser focus behavior and public demo traffic checks remain for that pass; offline tests do not replace it. Production web builds, Lighthouse, native builds, hosted owner-data operations, cloud changes and publishing were skipped under the requested scope.

Read root/web `AGENTS.md`, current data access, AppShell, TaskPanel and usePlanner sources, the supervisor finding, existing integration reports and relevant bundled Next Vitest/navigation guides. Applied Convex expert guidance and unslop. Implementation/checks ran directly in this session, with no agents or nested Codex CLI. No commit, staging, push, deploy or cloud change was made, and no credentials, env values, tokens or signed envelopes were printed. All changes remain in this checkout for root review.
