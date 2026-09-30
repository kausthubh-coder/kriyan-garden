# Brief 03b: remaining web views

Date: 29 September 2026. Changes are left in the working tree. No commit, push, deployment or cloud configuration change was made.

## Implementation

- List groups the selected day's tasks by area, then shows active tasks with no date. Shared rows include completion, project, goal, deadline, time and optional length.
- Week uses the Monday-start calendar week, seven desktop columns, stacked mobile days, fixed events, task opening, the shared load chart and deadlines below the calendar.
- Goals uses shared core calculations for linked task counts, number values and milestones. Cards show actual progress, linear calendar pace, status and linked tasks. Number values update inline; the add-goal dialog and milestone editor save through the existing backend operations.
- The five-step welcome route reuses the settings editors, supports skipping each step, creates real first tasks, completes onboarding and displays the one-time drag/N hint on Day. Successful task lines are removed before retrying a partially failed submission.
- `profiles.seedSample` checks identity first and calls the shared backend models. It adds the prototype's 25 tasks, seven projects/courses, three goals and seven events, with task/event dates relative to the client-supplied today. It preserves null lengths, completed tasks and links, refuses to overwrite existing onboarding records, and is idempotent after completion.
- Settings supports area names, colours, ordering and backend deletion refusal; project/course editing; meeting recurrence, times and location; habits; capacity, day hours and timezone; Clerk account/security; and an exact, case-sensitive RESET guard. Reset returns to the welcome route with default areas.
- Today and the clock use the profile timezone, initially supplied by the browser. Shared date tests cover midnight and DST.
- The app host redirects `/` to `/app`; marketing hosts retain the landing page. Clerk sign-in, sign-up and UserProfile use the app's dark tokens.
- Shared rail, filters, dialogs, keyboard shortcuts, task rows, skeletons, error boundary, URL state and token styles remain in use. Task opening preserves the originating view. Add task now handles an in-flight area query correctly. Dialog/Toast entrance animation mode is fixed per opening so switching from keyboard to pointer cannot restart an entrance animation during a click.

## Verification

All five required commands completed successfully. Final output excerpts are copied from `.agents/logs/03b-*.log`.

### `bun run typecheck`

```text
@kriyan/web typegen: Generating route types...
@kriyan/web typegen: ✓ Types generated successfully
@kriyan/web typegen: Exited with code 0
@kriyan/core typecheck: Exited with code 0
@kriyan/backend typecheck: Exited with code 0
@kriyan/web typecheck: Exited with code 0
```

### `bun run lint`

```text
$ bun run --filter '*' lint
@kriyan/web lint: Exited with code 0
```

### `bun run test`

```text
@kriyan/core test:  27 pass
@kriyan/core test:  0 fail
@kriyan/core test:  47 expect() calls
@kriyan/core test: Ran 27 tests across 3 files. [229.00ms]
@kriyan/core test: Exited with code 0
@kriyan/backend test:  Test Files  1 passed (1)
@kriyan/backend test:       Tests  16 passed (16)
@kriyan/backend test:    Start at  22:12:39
@kriyan/backend test:    Duration  3.76s (tests 73%, environment 10%, transform 9%, import 7%, worker 1%)
@kriyan/backend test: Exited with code 0
```

### `bun run build`

```text
@kriyan/web build: ✓ Compiled successfully in 4.0s
@kriyan/web build:   Finished TypeScript in 6.7s ...
@kriyan/web build: ✓ Generating static pages using 13 workers (10/10) in 785ms
@kriyan/web build:   Finalizing page optimization ...
@kriyan/web build: Exited with code 0
```

The build includes `/app`, `/app/settings`, `/app/welcome`, `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]`.

### `bun run e2e`

```text
@kriyan/web e2e:   ok 10 [configuration] › e2e\configuration.spec.ts:101:5 › settings saves preferences and enforces the area deletion refusal (6.0s)
@kriyan/web e2e:   ok 11 [screenshots] › e2e\screenshots.spec.ts:12:7 › capture six planner screens at 1440x900 (10.0s)
@kriyan/web e2e:   ok 12 [screenshots] › e2e\screenshots.spec.ts:12:7 › capture six planner screens at 390x844 (10.6s)
@kriyan/web e2e:   ok 13 [cleanup] › e2e\auth.teardown.ts:6:5 › reset the disposable planner and remove its test user (2.7s)
@kriyan/web e2e:   13 passed (1.1m)
@kriyan/web e2e: Exited with code 0
```

The seven requested journeys passed: Clerk sign-in/default onboarding; quick add tomorrow at 07:00 without length; 45-minute block/end time; complete/Undo; real mouse drag from tray; keyboard command palette; reload preserving view, date, area and open task.

Additional live checks passed for all three goal metrics, milestone completion, area rename/colour/order/deletion refusal, project creation/deletion, meeting creation/update/deletion, habit creation/update/deletion, persisted capacity/day hours, account rendering and RESET behaviour. The final run clears its disposable planner and deletes its Clerk test user.

Clerk testing tokens come from `@clerk/testing`, using development keys. Required environment names are in `apps/web/.env.example`; setup and browser installation instructions are in `apps/web/e2e/README.md`. Browser binaries, authentication state, traces and logs stay in ignored repository directories.

Earlier E2E attempts failed before the final successful run: missing local browser binaries, incorrect case/role/exact-label selectors, screenshot authentication state, reading the task URL too early, an optimistic drag card being replaced, the loading/Add race and a dialog animation restarting on a change of input modality. These were corrected and all 13 tests were rerun with retries disabled. Expected backend refusal output appears during the area-deletion test. Clerk development-key and terminal colour warnings also appear.

## Screenshots

All twelve files were captured by Playwright, with fonts ready and animations disabled. The screenshot tests assert no horizontal document overflow. Captures are viewport-sized; longer views and task panels scroll. Desktop and mobile output was visually inspected.

| Screen | 1440 × 900 | 390 × 844 |
| --- | --- | --- |
| Day | `.agents/screenshots/03/day-1440.png` | `.agents/screenshots/03/day-390.png` |
| List | `.agents/screenshots/03/list-1440.png` | `.agents/screenshots/03/list-390.png` |
| Week | `.agents/screenshots/03/week-1440.png` | `.agents/screenshots/03/week-390.png` |
| Goals | `.agents/screenshots/03/goals-1440.png` | `.agents/screenshots/03/goals-390.png` |
| Quick add | `.agents/screenshots/03/quick-add-1440.png` | `.agents/screenshots/03/quick-add-390.png` |
| Task panel | `.agents/screenshots/03/task-panel-1440.png` | `.agents/screenshots/03/task-panel-390.png` |

## Assumptions and limits

- The new `profiles.seedSample` mutation is verified with local Convex tests for authentication, ownership, relative dates, record counts, completion, idempotence and refusal/rollback. It has not been deployed. The hosted sample-data onboarding button therefore remains unverified until a separately authorized backend deployment.
- The prototype has decorative goal percentages and expected markers but no stored goal start dates or numeric metric schema. Sample goal targets use the 29 September reference with offsets of 77, 80 and 54 days; start offsets of 71, 120 and 75 days reproduce the approximate expected markers. Launch is 42/100 percent, GPA is 3.74/3.8 and the run is 6.5/10 km. GPA consequently displays about 98% under the brief's required current/target formula, rather than the prototype's decorative 68%.
- Screenshot captures use the existing dedicated prototype fixture from brief 03a, through `E2E_SCREENSHOT_USER_EMAIL`. Its missing goal dates were temporarily filled through existing deployed operations and restored in `finally`. Captures do not demonstrate a live call to the new sample mutation.
- Production DNS/host deployment and sign-up account creation were not performed. Host routing and themed sign-up compile in the production build; live tests sign in through Clerk and render its account component.
- Early development authentication attempts before the cleanup project was added may have left disposable test users in the development instance; those older accounts were not independently audited. The final run's cleanup passed.
