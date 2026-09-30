# Brief 14: empty states, add goal, page not found, hint, phone tab bar

Read `AGENTS.md`. Open `docs/design/reference/states.html` in a browser and read its HTML, its `<style>` block and `ref.css`. It is the design to port. `docs/design/reference/audit/state-*.png` show the current screens, captured with a real signed-in test account: up to five bordered "nothing here" boxes on one screen, an old stacked "Add goal" form with raw date boxes and the browser's own validation bubble, the default white Next.js 404 page, a hint banner across every view, and a settings gear squeezed into the phone tab bar.

Port the reference exactly. The same rules apply to `/demo`, because it shares the components.

## 1. Empty text is never a bordered box

- Remove the bordered empty-state box component everywhere in the app. Empty text is a quiet line (13.5px, `--ink-3`), as in the reference.
- Exact copy:
  - Tray, "Any time today": "Tasks for today without a time wait here."
  - Tray, "No date yet": "Tasks without a day land here until you schedule them."
  - Side rail, week with no hours: "Hours you plan show up here by area." and no "Free" labels under the days.
  - Side rail, Deadlines: "Nothing due in the next two weeks."
  - Side rail, Goals: "No goals yet." followed by the link "Add a goal", which opens the add-goal dialog.
  - Day summary for a brand-new account: "Nothing planned yet." For an account that has tasks but none on this day: "Nothing planned."
  - List: "Nothing planned for today." (or "for Thursday").
  - Week: "Nothing planned this week." under the header; columns are 120px tall when every day is empty.
  - When an area filter hides everything, name the area: "Nothing in School."
- The tray always shows the "Add a task" line with the `N` key hint under "Any time today" (reference section 1). It opens quick add.

## 2. First-run prompt on the timeline

For an account with no tasks at all, the Day view shows the "Your day starts here." card on the timeline just under the now line (or at 09:00 when now is outside the visible hours), with three example chips that open quick add pre-filled. It disappears as soon as the account has one task and never returns.

## 3. Hint

- Remove the hint banner that spans the top of the app.
- The one-time drag hint is a single line inside the tray under the task cards with a "Got it" text button (reference section 5). Show it only on the Day view, only when the tray has at least one task, and only until dismissed. Remove the permanent helper paragraph at the bottom of the tray ("Drag a task onto the day to give it a time…"); the hint replaces it. On touch the wording is "Tap a task to give it a time."

## 4. Goals with no goals

The Goals view shows the centred-left empty state from reference section 2: heading, one sentence, the primary "Add your first goal" button, and three example chips that open the add-goal dialog pre-filled (title, area, measure).

## 5. Add goal dialog

Rebuild it to reference section 3:

- A plain title line with the placeholder "Name the goal", focused on open.
- Three rows: Area (chips from the user's areas), Target (End of the month, In 3 months, End of the year, Pick a day, No date), Measure (Tasks done, A number, Milestones). "Pick a day" reveals the shared day editor. "A number" reveals Target and Unit fields.
- Footer: a one-line summary of what will be created ("Due Wed 30 Dec. You can add milestones next.") and the primary "Add goal".
- No "Close dialog" text button. Escape and a click outside close it; keep an accessible close control that is visually an icon in the top right.
- Validation is inline text under the title ("Give the goal a name."). Turn off native validation (`noValidate`) on this and every other form in the app; no browser validation bubbles anywhere.
- After adding a Milestones goal, open its goal panel with the milestones editor focused.

## 6. Page not found

Add `not-found.tsx` at the root and under `/app` so both hosts render reference section 4: dark surface, wordmark, "This page does not exist.", one sentence, and the two buttons. On the app host the primary is "Open Kriyan"; on the marketing host it is "Go to the home page". Returns HTTP 404.

## 7. Phone tab bar

Exactly five slots: Day, List, add, Week, Goals. Move settings to a gear icon button in the page header, to the right of the date navigation, on phone widths. Desktop keeps settings in the rail.

## Verify and report

```
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
```

Add Playwright coverage: a brand-new account sees the first-run prompt, an example chip opens quick add pre-filled, adding a task removes the prompt; the add-goal dialog validates inline and creates each of the three measure kinds; an unknown route returns 404 with the designed page on both hosts. Capture at 1440x900 and 390x844 with a disposable signed-in test user: empty Day, List, Week and Goals; the add-goal dialog empty, with the validation message, and with "A number" chosen; the 404 page; the Day view with the tray hint. Save to `.agents/screenshots/14/` with `compare.html` against the reference, list remaining differences and why, and write `docs/reports/14-states.md`. Do not commit.
