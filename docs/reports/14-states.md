# Brief 14: states

Status: **COMPLETE**. All five required verification commands passed. Changes are uncommitted.

## Section 0 was completed first

Ran the original full suite before changing the states. It reproduced the reported result: **18 passed, 1 failed, 12 did not run**, with the exact `Task` lookup timing out in onboarding step 5. Log: `.agents/14-section-0-baseline.log`.

The field already had the accessible name `Task`. The actual failure happened in step 4: choosing **A number** immediately autosaved a goal with an empty unit. Convex rejected that incomplete metric. Continue waited for that rejected save, leaving onboarding on step 4, so the step 5 task field never appeared.

`OnboardingGoal.save` now waits until a number draft has a positive finite target and a nonempty unit before autosaving it. The component regression checks that selecting the measure makes no invalid update, editing a valid unit saves it, and Continue waits for that save without duplicating the goal. The original planner test and its exact `Task` assertion remain unchanged.

The next full run reached a separate fixture collision: onboarding and configuration both created “Read ten books”, making a strict title lookup match two goals. The configuration fixture now uses “Read ten more books”; its assertions remain strict. That intermediate run had **25 passed, 1 failed, 5 did not run** (`.agents/14-section-0-fixed.log`).

The full suite then passed **31 tests in 5.1 minutes**, exit 0 (`.agents/14-section-0-green.log`). Sections 1–7 started only after that gate passed.

## Changes

| Brief section | Result |
| --- | --- |
| 1. Empty text | Tray, summaries, List, Week, named area filters and side rail use quiet 13.5px text. Exact requested copy is present. Empty week columns are 120px; empty hour charts have flat bars and no Free labels. The tray always offers Add a task with the N hint. |
| 2. First run | The timeline prompt opens quick add with each example prefilled. It sits below the now line, or at 09:00 when now is outside the visible hours. The first saved task removes it. A per-account marker prevents its return after deleting that task and reloading. |
| 3. Hint | Removed the global banner and permanent tray paragraph. The dismissible hint appears only inside the Day tray when a task is present. Touch uses “Tap a task to give it a time.” Dismissal survives reload. |
| 4. Empty Goals | Ported the heading, sentence, primary action and three example chips. Each example prefills the title, matching area and metric. |
| 5. Add goal | Shared dialog has a focused plain title, area/target/measure rows, shared day editor, number fields, inline validation, summary footer and accessible icon close control. All custom app forms have noValidate. Creating a Milestones goal opens its panel with Add a milestone focused, including on touch. |
| 6. Not found | Root and /app have the dark designed page, correct primary action per host, and HTTP 404. The root fallback also recognizes forwarded /app paths because Next can select the root not-found boundary for unmatched segments. |
| 7. Phone tabs | Exactly Day, List, add, Week, Goals. Settings moves to the page header on phone widths; desktop retains its rail. |

The `/demo` uses the same view and goal-dialog components, with its existing memory transport. Hint dismissal stays in memory there, consistent with “Nothing is saved.” Its pre-existing settings editing restriction remains; the phone header gear is disabled in the demo.

The calendar target calculation moved into `packages/core` and is reused by onboarding and add goal. Tests cover month-end clamping, year boundaries and leap years. Planner guidance markers use the existing owner-checked `profiles.saveOnboarding` draft merge operation; no backend schema change or cloud deployment was needed.

## Verification

All development and browser checks use **http://localhost:3000**. The default signed-in Playwright configuration now uses port 3000. Section 0 and the implementation checks used the development server. The final browser suites use the local production build, started with `bun run --filter @kriyan/web start --port 3000`; this is a local preview, with no deployment. No command reads or prints environment-file contents.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run typecheck` | Exit 0; route generation and all five workspace checks passed | `.agents/14-typecheck-final.log` |
| `bun run lint` | Exit 0; root, web and mobile passed with no warnings | `.agents/14-lint-final.log` |
| `bun run test` | Exit 0; 258 tests passed: backend 46, core 107, mobile 2, web 61, CLI 42 | `.agents/14-test.log` |
| `bun run build` | Exit 0; Next 16.3.3 compiled successfully, TypeScript passed, 37/37 static-page generation steps completed | `.agents/14-build.log` |
| `bun run e2e` | Exit 0; **37 passed in 3.7 minutes**, including state setup/cleanup and all existing projects | `.agents/14-e2e-final.log` |
| `bun run --filter @kriyan/web e2e --project=states` | Earlier focused run: exit 0, 6 passed in 1.2 minutes. The final state tests, including the later 09:00 fallback assertion, also passed within the full production suite | `.agents/14-states-e2e-green.log`, `.agents/14-e2e-final.log` |
| `bun run --filter @kriyan/web test:public` with `PUBLIC_BASE_URL=http://localhost:3000` | Exit 0; **9 passed, 1 skipped in 52.8 seconds**. The existing desktop-drag test is intentionally skipped on touch; both demo goal tests passed without backend traffic | `.agents/14-public-e2e.log` |
| `node .agents/screenshots/14/verify-compare.mjs` with repo-local `PLAYWRIGHT_BROWSERS_PATH` | Exit 0: 10 states, 20 captures checked, no missing images or script errors; all image dimensions correct | `.agents/14-compare.log`, comparison verification script and PNGs |
| `git diff --check` | Exit 0 | Checked after implementation |

Earlier typecheck caught a duplicate noValidate attribute and an outdated planner test fixture; both were corrected. New state-test iterations caught a hidden desktop summary being selected on phone and an ambiguous Target date group name; the test now checks visible summary text and the group has the distinct accessible name Goal target.

One full verification attempt had **36 passed, 1 failed in 6.0 minutes**, exit 1. I overlapped Playwright commands that used the same `apps/web/test-results` directory. Their startup cleanup removed another run's trace artifacts, causing `browserContext.close: ENOENT` in the screenshot test. The overlapping focused run had 2 passed, 2 failed and 2 not run; the public run had 7 passed, 2 failed and 1 skipped, including an artifact collision and a 30-second cold-route timeout. These failed logs remain in `.agents/14-e2e-artifact-collision.log`, `.agents/14-states-artifact-collision.log` and `.agents/14-public-artifact-collision.log`. Final browser runs are sequential. No test retries or weakened assertions were added.

The build's TypeScript phase was unusually slow: Next reported 82.7 minutes. It completed successfully; that duration is retained in the build log rather than hidden or treated as a failed gate.

No required gate is skipped or failing. After verification, the local production preview was stopped and the development server restored with `bun run dev --port 3000` for review. Its log is `.agents/14-review-dev.log`.

## Added browser coverage

`apps/web/e2e/states.spec.ts` uses a fresh disposable signed-in account and an America/New_York clock fixed to Wed 30 Sep 2026. Setup and teardown create, reset and delete that account. It checks:

- Empty Day, List, Week and Goals at both requested viewports, including no horizontal overflow and the five phone slots.
- The first-run examples, prefilled accessible Task input, prompt removal, persistent first-task marker after deleting the task, and the 09:00 fallback on both viewports.
- Day-only hint placement, touch wording, dismissal and persistence after reload.
- Goal example fields, title and number validation, custom target date and backend persistence for all three measure kinds.
- Milestone-panel focus and adding a milestone immediately after creation.
- HTTP 404 for both Host headers and the correct primary actions, plus public and /app route captures.
- Goal-title focus on desktop and touch, Escape closing, focus restoration and noValidate.

Existing configuration and public goal tests were adapted to the new Pick a day disclosure and Milestones panel opening. They still verify persisted edits, deletion/Undo and dialog focus. The public suite also checks that demo operations make no Clerk or Convex requests.

## Screenshots and comparison

[Open comparison](../../.agents/screenshots/14/compare.html). The interactive comparison contains all **20 product captures**, six reference crops, the full reference capture, a state selector and a viewport selector. Both desktop and phone layouts of the comparison itself were captured and verified.

Product filename stems, each with `-1440.png` and `-390.png`:

- `empty-day`, `empty-list`, `empty-week`, `empty-goals`
- `goal-empty`, `goal-validation`, `goal-number`
- `404-home`, `404-app`, `day-hint`

Remaining differences and reasons:

- Static reference boards have different heights and the Goals board omits the desktop rail. The app fills the requested viewport and retains functional navigation.
- The disposable account has its default 07:00–22:00 hours and a fixed 09:00 clock. Reference dates, clock position, task totals and example values differ.
- The web app does not draw the phone reference's illustrative operating-system status bar. Touch targets are at least 44px, following AGENTS.md, which makes some rows taller than the board.
- The required close icon and keyboard focus states remain visible. The empty dialog defaults to Tasks done and the account's first area; the first reference sample selects Business and Milestones. The number capture matches the reference's 3.8 GPA and No date validation sample.
- The brief requires Tap wording on touch, replacing the reference board's drag wording. The brief also requires the always-present Add a task line below task cards.
- List, Week, inline validation and the phone dialog/404 have written requirements but no separate static reference board. The comparison labels these cases and uses the nearest applicable board.
- Icons come from the existing Phosphor system, preserving meanings and placements rather than replacing them with illustrative reference SVGs.

## Scope

No commit, push, deploy, cloud settings change or Android implementation. All changes and generated review artifacts are inside this repository. Screenshots, browser binaries, test auth state and logs remain in ignored repository paths. No credentials are included in the report or captures.

`apps/web/next-env.d.ts` was already modified at the start. Next regenerates it between build and dev; the final dev server points it at `.next/dev/types`. It remains generated output in the working tree.
