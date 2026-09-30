# Brief 03c: review fixes for the Goals view, onboarding and settings

Read `AGENTS.md`. These are review findings on briefs 03a and 03b. Fix each one, keep every test green, and update the Playwright tests where behaviour changes.

## Goals view

1. **Goal cards are cluttered with always-visible editing controls.** The prototype's card is: value, title, area and target, status word, pace bar, one line of explanation, then linked tasks. Remove the inline "Current value" field, "Update progress" button, "Status" select and "Edit milestones" button from the card. Show milestones on the card as a compact read-only list (done ones struck through) under the pace bar, before the linked tasks. Clicking the card title, value or a "Details" control opens a **goal panel** that uses the same panel component as tasks (`TaskPanel` style, right side on desktop, bottom sheet on phone) with: editable title, area, target date, start date, metric kind and its fields (current value for number goals, with the unit), status, milestones editor (add, rename, set date, complete, delete), note, and "Delete goal" with undo. The URL carries `goal=<id>` the way it carries `task=<id>`.
2. "No target date" appears twice on a card. Show it once, in the subtitle, and drop the right-hand status text when there is no target date.
3. The percentage on `tasks` and `milestones` goals should read as "2 of 5 done", not a bare percent, in the subtitle; the big number stays the percent.
4. Sample goals from `profiles.seedSample` must have `startDate` and `targetDate` so the pace marker and status show on a fresh sample account.

## Onboarding

5. Capture `/app/welcome` at each of the five steps at 1440x900 and 390x844 into `.agents/screenshots/03c/` and check it against the design rules: one column, generous spacing, a clear primary action per step, skip as a quiet secondary action, progress shown as "Step 2 of 5" text (no dots, no bars). Fix what does not match and list what you changed.

## Settings

6. Capture `/app/settings` at both sizes into the same folder. Settings must not be one long undifferentiated form: use a left index (desktop) or top segmented control (phone) with sections Areas, Projects and courses, Classes and meetings, Habits, Planning, Account, Danger zone. Each section has a heading and one sentence of explanation. Danger zone holds "Reset everything" only.
7. Area colour choice uses the eight named colours as 32px swatches with the name on hover and as `aria-label`, not a select.

## Both

8. Every dialog and panel: check that `Escape` closes it, focus returns to the trigger, and the first field is focused on open (desktop only).
9. Run the full verification and the e2e suite. Report the real output and list the screenshot paths.
