# Landing and polish merge integration

Completed locally on 30 September 2026 in `C:\Users\kaust\OneDrive\Documents\ChatGPT\kriyan-v2`. The open merge combines reviewed landing commit `693329c` with reviewed polish HEAD `3d8a526`. This report covers integration work and local verification, not a production release.

## Changes

- Resolved `GoalsView.tsx` to the reviewed HEAD implementation. Cards remain read-only, with title/value/Details opening the polished panel, milestone summaries, pace and linked tasks. URL selection and goal delete/Undo remain intact.
- Combined `namedAreaColors` and `socialImageTokens` in core tokens. Regenerated both token CSS files; the merged CSS already matched the generator.
- Renamed the data-access transport hook to `useGoalTransport`. The existing `useGoalActions` state hook retains its name. GoalForm, GoalPanel, milestone operations and delete/Undo now use injected, backend-typed transports, including `deleteForUndo` and `restore`.
- Added injected selected-goal access. The live implementation selects from the planner's existing reactive goals list. The memory implementation subscribes to its own store. Both return a raw backend goal value or `undefined` for loading, absent, optimistic, missing or deleted selections. No additional query or panel loading delay was added. The panel still receives milestones and progress from the list.
- The demo deletes a goal, its milestones and its task links in one state change and one notification. Its snapshot has the backend validator's raw goal, milestone and task-reference shapes. Undo creates fresh goal/milestone IDs, validates the area, cap, snapshot ownership and milestone values before committing, and only relinks existing tasks whose goal is still null and whose detached timestamp is unchanged. Edited, deleted, completed, reopened and relinked tasks survive Undo. Monotonic timestamps prevent same-millisecond edits from bypassing the guard.
- Reused backend text/date/number validation helpers through a package export. Existing shared `assemble` and `nextDate` helpers, optional-length SideRail behavior and memoized optimistic task wrappers remain intact.
- Preserved reviewed onboarding, Settings sections and swatches, as well as landing/public routes, fonts, docs, legal, metadata and redirects. Corrected privacy/getting-started/terms copy to describe the actual Settings reset and Clerk account controls. There is no export control in this Settings implementation; the docs now direct export requests to the contact email.
- Added 10 unit regressions and a desktop/mobile public Goals workflow. Existing tests remain. Added a narrow Goals capture script that verifies the other landing asset hashes remain unchanged.

## Supervisor correction

The supervisor's follow-up is recorded in `.agents/logs/04-integration/supervisor-followup.md`. It identified that introducing `useQuery(api.goals.get)` would regress reviewed 03c behavior: the authenticated get operation throws for stale/deleted IDs. The final implementation uses the already-reactive list through a pure injected selector. A unit test covers valid, skipped, missing and after-delete selection; public tests cover direct goal URLs, Escape, focus return, task/goal exclusivity, navigation cleanup and missing/optimistic IDs. Backend authentication/get behavior was not changed.

The follow-up also identified a stale privacy sentence about brief 03c. Source inspection confirmed reset and Clerk account controls, but did not find a planner export control. The revised copy distinguishes planner reset from identity deletion and avoids promising an absent export UI. Production-region and release caveats remain.

## Final verification

Commands ran from the checkout root unless a working directory is noted. Output and exit codes are in `.agents/logs/04-integration/`; `commands.md` maps every invocation to its output file. The final type generation/typecheck sequence and subsequent checks were awaited individually. No mobile workspace was typechecked or compiled.

| Command | Real result | Log |
|---|---|---|
| `bun run --filter @kriyan/core tokens` | Exit 0; generated core and web CSS | `01-tokens.log` |
| `bun run --filter @kriyan/web typegen` | Exit 0; route types generated successfully | `22-typegen-final.log` |
| `bun run --filter @kriyan/web typecheck` | Exit 0 | `23-web-typecheck-final.log` |
| `bun run --filter @kriyan/core typecheck` | Exit 0 | `24-core-typecheck-final.log` |
| `bun run --filter @kriyan/backend typecheck` | Exit 0 | `25-backend-typecheck-final.log` |
| `bun run --filter @kriyan/web lint` | Exit 0; no warnings or errors | `26-web-lint-final.log` |
| `bun run --filter @kriyan/web test` | Exit 0; 13 passed, 0 failed, 122 assertions across 3 files | `15-web-unit-final.log` |
| `bun run --filter @kriyan/core test` | Exit 0; 80 passed, 0 failed, 100 assertions across 3 files | `10-core-unit.log` |
| `bun run --filter @kriyan/backend test` | Exit 0; 21 passed across 2 files | `11-backend-unit.log` |
| `bun run packages/core/scripts/quick-add-docs.ts --check` | Exit 0; "Quick-add docs match tested grammar fixtures." | `12-grammar.log` |
| From `apps/web`: `bun run dev --port 3008 --hostname 127.0.0.1` | Checked port free, started local Next dev server, Ready | `17-next-dev.log` |
| `PUBLIC_BASE_URL=http://localhost:3008 bun run --filter @kriyan/web test:public` | Exit 0; 9 passed, 1 skipped, 0 failed using 1 worker in 37.8s | `20-public-final.log` |
| From `apps/web`: `PUBLIC_BASE_URL=http://localhost:3008 node scripts/capture-integration-goals.mjs` | Exit 0; Goals capture only, zero page/console errors or Clerk/Convex traffic, other landing hashes unchanged | `21-goals-capture.log` |
| Same Goals capture command after supervisor crop correction | Exit 0; full heading retained, zero page/console errors or Clerk/Convex traffic, other landing hashes unchanged | `supervisor-goals-capture.log` |
| From `apps/web`: `bun run lint scripts/capture-integration-goals.mjs` | Exit 0; supervisor crop script passes ESLint | `supervisor-capture-lint.log` |

Public test and capture processes used `PLAYWRIGHT_BROWSERS_PATH=<checkout>/.agents/playwright-browsers`. PowerShell syntax and concrete invocation details are in the command log. Core/backend have no lint scripts; the scoped lint command ran the web workspace's configured ESLint checks. Backend tests used local convex-test, not a hosted deployment.

The added Goals public workflow passed on desktop at 1440x900 and mobile web at 390x844. It verifies every editable panel field after saving/reopening, number/task/milestone metrics, adding/renaming/dating/completing/reopening/deleting milestones, goal creation, deletion, Undo with a fresh goal ID and restored links, and the URL selection contract. Both device runs observed zero Clerk/Convex HTTP or socket requests and zero page errors. The one skip is the existing mobile pointer-drag case; touch scheduling/editing is exercised through task details. These are mobile-web tests and captures, with no Android/native claims.

## Initial failures and corrections

- The initial web typecheck exited 2 because the existing installation lacked `react-markdown` and `remark-gfm` from the landing merge, and one new assertion compared a branded goal ID with a plain string. `bun install --frozen-lockfile` installed 196 packages without changing the lockfile; the assertion now uses the typed ID helper. Final typechecks pass.
- Initial lint exited 0 with two unused destructured-field warnings. A later run reported one obsolete type import after extracting the selector. Both were removed; final lint is clean.
- Initial public suite exited 1 with 2 failures, 7 passes and 1 skip. Both Goals runs timed out on an exact-label Area selector. The retry had the same counts, then timed out on the exact-label Note selector. Accessible combobox/textbox role selectors fixed the wrapped-control locators, and the Goals group now has a 10-second action timeout. Final suite passes. Logs `18-public-initial.log` and `19-public-retry.log` preserve the failures; traces/error contexts are copied under `public-initial-artifacts/` and `public-retry-artifacts/` before subsequent runs.
- The first core typecheck was accidentally started while the web typecheck session was finishing. This scheduling error is recorded in the command log. The final web/core/backend sequence ran strictly in order, with each command completed before the next began.
- The first handoff metadata lookup passed two revisions to `git rev-parse --short`, which Git rejected with "Needed a single revision". Separate lookups then confirmed both commits and the open merge. Both diff whitespace checks passed, and `git ls-files -u` is empty. Logs `27-merge-state.log` and `28-merge-state-final.log` record the correction.

## Artifacts and changed paths

The original integrated capture is `.agents/screenshots/04-integration/demo-goals-1440.png`, at 1440x900. `capture-results.json` records the source `/demo?view=goals`, crop coordinates, empty error/traffic arrays and unchanged hashes for day, deadlines, list, week and mobile-web assets. The updated landing asset is `apps/web/public/landing/goals.webp`, cropped to 1180x740. Supervisor visual inspection found that the inherited top=110 crop clipped the Goals heading. The final script and metadata use left=100, top=80; the supervisor reran capture and inspected the corrected WebP. Existing captures/reports under `work/kriyan-landing` were read-only and were not modified.

Integration changes beyond the automatic merge are limited to:

- `apps/web/src/components/app/GoalsView.tsx`, `dataAccess.tsx`, `AppShell.tsx`, `GoalForm.tsx`, `GoalPanel.tsx`, `useGoalActions.ts`, plus new `goalSelection.ts` and `goalSelection.test.ts`.
- `apps/web/src/components/demo/Demo.tsx`, `store.ts`, `store.test.ts`.
- `apps/web/e2e/public/public.spec.ts`, `apps/web/package.json`, new `apps/web/scripts/capture-integration-goals.mjs`, and `apps/web/public/landing/goals.webp`.
- `packages/core/src/tokens.ts`, and `packages/backend/package.json` for the existing validation helper export.
- `docs/site/privacy.md`, `docs/site/index.md`, `docs/site/terms.md`, and this report.
- Ignored local command logs, failure traces and the screenshot/receipt paths described above.

## Scope and review state

Implementation and testing ran through Codex CLI v0.159.1 with model `gpt-6.1-sol` and reasoning effort `high`; the supervisor verified these settings in the CLI startup banner. Invocation and observed runtime details are recorded in `.agents/logs/04-integration/cli-runtime.txt`. The supervisor reviewed the diff, raised selection/legal/test-locator findings, inspected the captures, and corrected screenshot framing.

No commit, push, deployment, publishing, cloud setting change, production build, Lighthouse run, Android compilation, native capture or authenticated/cloud e2e run was performed. No collaboration sub-agents were spawned. No env values, tokens or credentials were printed. Only this checkout was edited.

Only the two existing conflict paths are marked resolved with `git add`: `apps/web/src/components/app/GoalsView.tsx` and `packages/core/src/tokens.ts`. All other integration edits and new files remain unstaged; the incoming automatic merge's staged paths are retained. HEAD remains `3d8a526`, MERGE_HEAD remains `693329c`, and the merge stays open for supervisor review. The local server remains on port 3008 for review; no unrelated processes were stopped.

Local unit and public demo coverage pass. Authenticated production behavior and Android/native behavior were not re-exercised in this scope; existing backend authorization and restore tests passed locally.
