# Brief 12: onboarding and settings

Status: **PARTIAL verification**. The implementation and requested visual artifacts are in the working tree. Local checks pass. Full signed-in onboarding/resume and area reorder cannot pass against the configured hosted Convex deployment because it does not expose the two new mutations. No commit, push, deployment or cloud configuration change was made.

## Implementation

Read `AGENTS.md`, `docs/PLAN.md`, the brief, the onboarding/settings HTML and `ref.css`, and the relevant bundled Next.js guides before implementation. Opened the HTML references in Chromium, captured their actual boards, and inspected the captures. Also opened the Android settings/onboarding boards and the web goal-card board. Used the existing shared backend architecture and strict TypeScript.

- Rebuilt all five onboarding steps with the reference desktop geometry, 520px question column, 46px primary action, live inert previews, URL step navigation, heading focus, step announcements, Alt+Left, skeleton frame and inline feedback. Phones use a single column, 260px preview and a fixed full-width primary action above the safe area.
- Added shared editable rows, weekday toggles, colour swatches, area chips and forgiving 24-hour time fields. Areas save on blur/Enter and cancel on Escape; projects/courses add on Enter; class forms validate weekday/time ranges; one goal is created and subsequently updated; task capture reuses the existing QuickAdd parser and chips.
- Rebuilt settings as URL-addressable sections with inline editors and phone list/section/back navigation. Added grip drag/arrow-key reorder, real course/project/task counts, grouped project/class editors, habit target chips, shared PropertyList planning controls, formatted timezone search, existing dark Clerk account settings and the isolated typed-RESET section.
- Added owner-scoped merged onboarding draft/step persistence and atomic area reorder. Confirmed sample replacement clears only the current owner's setup records in one bounded transaction, cancels pending reminder schedules and preserves the existing idempotent seed path. Planning accepts minute precision for start/end hours.
- Reused Filters, Timeline, QuickAdd, DateEditor, PropertyList and the actual GoalsView card. Timeline's new static mode preserves the interactive defaults. All new styles live in the two permitted CSS modules.

The forbidden shared/design files were not modified: `App.module.css`, `GoalPanel.tsx`, `GoalsView.tsx`, `WeekView.tsx`, marketing/landing components and `packages/core/src/tokens.ts`. Bun remains the package manager; no alternate lockfile or dependency change was introduced.

## Verification

Commands ran from this repository. The development server and all signed-in Playwright work used port **3400**. No processes on other ports were stopped.

| Command | Result | Real output / evidence |
| --- | --- | --- |
| `bun install` | PASS | Installed 1365 packages in 183.61s. Existing lockfile unchanged. |
| `bun run typecheck` | PASS, exit 0 | Next route types generated successfully; core, CLI, backend, mobile and web typechecks exited 0; root scripts check completed. |
| `bun run lint` | PASS, exit 0 | CLI, mobile and web lint exited 0. |
| `bun run test` | PASS, exit 0 | Backend 46, core 106, mobile 2, web Bun 13, web Vitest 48, CLI 41: **256 passed, 0 failed**. Quick-add documentation matches grammar fixtures. |
| `bun run build` | PASS, exit 0 | Compiled in 27.3s; TypeScript finished in 37.7s; generated 37/37 pages in 3.9s. `/app/settings/[section]` is included as a dynamic route. |
| `$env:E2E_BASE_URL='http://localhost:3400'; bun run e2e` | FAIL, exit 1 | **12 passed, 2 failed, 12 did not run (2.6m)**. Details below. |
| `git diff --check` | PASS | No whitespace errors; protected-file check passed. |
| Open comparison in Chromium | PASS | 12 comparison sections, 54 image elements, 0 image decode failures. Overview: `.agents/screenshots/12/compare-overview.png`. |

New core coverage includes the requested clock strings, invalid `24:00` and allowed empty values. Backend tests execute the actual functions through convex-test: unauthenticated rejection, owner-isolated merged drafts, bounds, confirmed sample replacement without affecting another owner, atomic reorder with foreign/duplicate IDs rejected, and minute-precision planning with inverted hours rejected. DOM regression tests use mocked mutations to verify one goal creation during queued edits, Continue waiting for pending goal saves, Escape cancellation and last-area refusal. These controlled tests do not prove a live provider flow.

Earlier verification exposed a syntax error, a hook-name lint error, controlled colour-selection feedback, an overly broad alert locator, test locator typing, and impure initial preview setup. Those were corrected; the final local command results above supersede the earlier failures. Cold Next compilation initially exceeded the auth setup timeout; the setup timeout is now 120 seconds. Node runs the capture bundle because Bun's Windows Playwright launch stalled on the remote-debugging pipe; package installation and project commands still use Bun.

### Browser results and blocker

The independent signed-in settings project passes these real hosted-data flows:

1. Area name blur/save, colour selection/save, reload/persistence and backend refusal to delete an area in use.
2. Class clock normalization, exact end-after-start validation, creation and title edits, with backend values checked.
3. Habit weekly target, planning capacity/day start persistence and timezone search, without form-wide Save actions.
4. Phone section navigation/back and typed-RESET guarding.

Both disposable-user setup/cleanup projects pass. Four existing desktop/phone polish and property-editor tests pass.

Failures:

- `onboarding-settings.spec.ts:132`, grip keyboard reorder: row order never changes. A direct authenticated probe confirms `Could not find public function for 'areas:reorder'.`
- `planner.spec.ts:20`, onboarding/resume/finish: first Continue stays on `/app/welcome` instead of step 2. A direct authenticated probe confirms `Could not find public function for 'profiles:saveOnboarding'.`

Because the planner suite is serial and downstream projects depend on it, six later planner tests plus configuration/screenshots dependencies did not run. They are not passes. Traces and error contexts are retained under `apps/web/test-results/` for the two failed tests. Full step resume, the live end-to-end completion/hint path, drag reorder, confirmed replacement and minute-precision hosted planning remain unverified with the new backend code. The local production build does not update the hosted Convex deployment. This brief explicitly forbids deployment, so no deployment was attempted.

## Signed-in captures

Artifacts: [comparison gallery](../../.agents/screenshots/12/compare.html), [capture receipts](../../.agents/screenshots/12/capture-results.json).

The reproducible capture source is `apps/web/scripts/capture-onboarding-settings.ts`. It creates a disposable development Clerk user, signs in, creates realistic owned records through existing hosted mutations, captures the views, resets that user's planner and deletes the Clerk user. It uses direct step URLs for visual coverage because the deployed save-step endpoint is absent. No network responses or backend functions were mocked for these signed-in screenshots. The existing hosted completeOnboarding mutation only unlocks settings for the disposable fixture; that does not prove the five-step completion flow.

Capture commands (PowerShell):

```powershell
# Start the server in this worktree, on the required port.
bun run --filter @kriyan/web dev --port 3400
bun build apps/web/scripts/capture-onboarding-settings.ts --target=node --packages=external --outfile=.agents/capture-onboarding-settings.mjs
# Run from apps/web so Next loads this worktree's ignored environment config.
node ../../.agents/capture-onboarding-settings.mjs
# Reference boards, from the repository root:
$env:PLAYWRIGHT_BROWSERS_PATH=(Resolve-Path '.agents/playwright-browsers').Path
node .agents/capture-reference-12.mjs
```

Captured **29 signed-in viewport screenshots**: the 22 required captures (all five onboarding steps plus Areas open, Projects/courses, Classes open, Habits, Planning open and Reset at 1440x900 and 390x844), five additional scrolled phone previews and two section-index captures. The phone capture refresh uses mobile Chromium with touch/coarse pointer enabled. Desktop captures retain fine-pointer controls. The receipt confirms disposable-user deletion, zero uncaught page errors, no horizontal overflow at the requested sizes, 260px phone previews, and a 520px question column at 1024px. Six onboarding/settings reference boards, three Android boards and the web Goals board are included alongside them.

## Remaining visible differences

| View / detail | Difference and reason |
| --- | --- |
| Reference presentation chrome | The reference PNGs include rounded board outlines and, on Android, a simulated system status bar. The running web app fills the browser viewport and uses its existing app rail/bottom navigation. These are reference-page/native chrome, not missing product controls. |
| Dates, times, counts, titles and pace | Captures use actual local dates/time, actual owner-scoped counts and real goal pace. The reference uses illustrative records and a fixed now line. The fixture renames Business to Work and has two courses, one project and three tasks. Numbers are not inflated to match decorative reference totals. |
| Onboarding step 1 | The native editing caret may blink or disappear in a screenshot; the reference draws a permanent artificial caret. The preview clock is live, not the board's fixed clock. |
| Onboarding step 2 | No dedicated reference board exists. The shared desktop/phone frame is compared explicitly; grouped project/course controls follow the written brief. |
| Onboarding step 3 | The capture shows a saved CS 201 class and an empty add form. The reference shows an unsubmitted Calculus lecture with Mon/Wed/Fri selected and different time values. New draft persistence is unavailable on the hosted backend; the gallery does not pretend this fixture proves draft saving. The real event block says ?Class or meeting, Room 4.12? rather than the reference's abbreviated ?Class?. The location appears in the row summary because it is real data. Selected area chips retain their dot as required by the project rules; the static reference omits the dot on one selected chip. |
| Onboarding step 4 | No dedicated onboarding board exists. The card is the existing permitted GoalsView component, compared separately with the web Goals board. Its empty-linked-task explanation and real pace are preserved. |
| Onboarding step 5 | The quick-add field is empty after fixture insertion rather than holding the reference's pending ?gym tomorrow 7am? text. It uses the same parser/placeholder as the app. Call Amma appears above the timeline under ?Any time today?, per the brief. The real current day is Wednesday, so the saved Tuesday/Thursday class appears in the next-class-day preview on step 3, not falsely on today's timeline. The timeline's range follows the entered task/event times. |
| Desktop settings Areas | The real app rail is populated; the reference rail is an empty frame. Swatch targets are 32px on a fine pointer instead of the reference's 30px painted circles. Name input height follows the shared compact control style, with minor editor spacing differences from the static excerpt. The count and Work name come from actual records. |
| Projects/courses and Habits | No dedicated boards exist. The gallery labels the nearest Areas/section-frame comparison; grouping, summaries and expanded editors come from the written specification. |
| Classes settings | The provided board is a compact 700px content excerpt with collapsed rows. The requested capture shows an expanded editor in the full app, including required shared date chips. On a phone, lower fields are reached by scrolling above the existing bottom navigation. |
| Planning | The provided board is a compact 560px excerpt. The full app uses the shared PropertyList and includes the explicitly required custom-minute field. The actual timezone includes the current UTC offset. The custom field and chips share a wrapping editor row rather than a fabricated static sample. |
| Reset | No dedicated board exists. The isolated description, RESET field and danger action follow the brief; no additional reset cards or unrelated controls were added. |
| Phone settings | The newer seven-section index replaces older Android-only notifications, version, sign-out and account-deletion entries. Section back navigation and existing web bottom navigation are preserved. Editors are inline and autosave, replacing the older Android reference's area sheet and Save area button, as this brief expressly requires. |
| Phone controls and scrolling | Touch targets are at least 44px; weekday rows and swatches take more space/wrap compared with the static fine-pointer boards. The pinned onboarding footer reserves safe-area space. Long inputs may put the 260px preview below the initial viewport; extra scrolled captures show it. The preview crops timeline contents to its required height. |

There is no claim of pixel identity for boards that do not exist or for data-dependent fields. The comparison page names each matching or nearest board and displays both required sizes. Remaining live-provider gates require the new backend code to be made available in an authorized later deployment and the same browser commands to be rerun.
