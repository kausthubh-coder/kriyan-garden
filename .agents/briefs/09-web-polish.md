# Brief 09: web app visual polish, ported from the reference

Read `AGENTS.md` (the control-size, date-format and area-label rules changed). Open `docs/design/reference/web.html` in a browser and read its HTML and `ref.css`. It is the design to port. The screenshots in `docs/design/reference/audit/` named `demo-*.png` show the current build and what is wrong with it.

Port the reference the same way the original prototype was ported: match its structure, spacing, sizes and copy. Do not reinterpret it. Everything lives in the existing components in `apps/web/src/components/app/` and their CSS module; the demo mode at `/demo` must get every change for free because it shares the components.

## 1. Control sizes and header (reference section 1 and 7)

- Add `--ctl` (32px) and `--ctl-lg` (36px) tokens in `packages/core/src/tokens.ts`, switched to 44px under `@media (pointer: coarse)` in the generated CSS. Filter chips, segmented buttons, icon buttons, panel chips and inputs use `--ctl`. Primary buttons use `--ctl-lg`. Remove hard-coded 44px control heights on desktop.
- Date navigation is one joined segmented control: previous, "Today", next.
- Remove the "Ctrl K" button from page headers. Search stays in the rail and on Ctrl K.
- Every page header (Day, List, Week, Goals, Settings) uses the same header component: title, subtitle, actions on the right, in one row, inside the same content column as the body so the actions are never stranded at the far right of an empty area. On List this means the header is constrained to the 760px column.
- Phone width: title and date navigation share one row; the date moves into the summary line ("30 September. 7 tasks left, 4h 5m planned."). The demo banner is a single line ("Demo with sample data. Nothing is saved." plus one "Sign up" link).
- Rail tooltips appear only under `@media (hover: hover) and (pointer: fine)`. They must never appear after a tap on a touch device.

## 2. Now line (reference section 2)

The now line renders under the timeline blocks (lower z-index) so it never crosses a task title. Its time label stays in the gutter above everything.

## 3. Task panel (reference section 3 and the phone sheet in section 7)

Rebuild `TaskPanel` as: top line (project with area dot, close button), title with checkbox, notes, then the property list. Details:

- Title is an auto-growing textarea styled as a heading. Focus shows a soft fill (`--s2`), not an outline box. It saves on blur and on Enter.
- Notes sit directly under the title as an auto-growing borderless textarea with the placeholder "Add notes". Saved on blur. No "Saved when you leave this field" helper text.
- The property list has these rows in this order: Area, Project, Day, Time, Length, Deadline, Goal, Repeat, Reminders. Each row is a button showing the label and the current value. Clicking it opens that row's editor inline beneath it; opening one closes any other. `aria-expanded` on the button, and the editor is a labelled group.
- Value formatting: Day "Today, Wed 30 Sep" or "No date yet"; Time "14:30 to 15:30" when there is a length, "14:30" without, "Any time" when none; Length "1h" or "None"; Deadline "Sat 3 Oct, in 3 days" in the hot colour when within 7 days, "None" otherwise; Repeat in words ("Every week on Mon and Thu", "Does not repeat"); Reminders joined in words ("10 min before, at start") or "None". Put these formatters in `packages/core` with tests, because the Android app and the MCP read-backs will use them too.
- Editors per row are described under the panels in the reference. "Pick a day" reveals a date input; that input is the only place a native date field appears, and the row value always shows the app format.
- Footer: "Added 29 Sep" on the left, "Delete task" as a quiet danger text button on the right. No "Done" button.
- Keyboard: `M` on a focused task opens the panel with the Time row open and focused; `L` opens it with the Length row open. Arrow up and down move between rows; Enter toggles a row; Escape closes the open row first, then the panel.
- Phone: the same content in the bottom sheet, rows 50px tall, editors full width.

## 4. Goals (reference section 4)

- "Add goal" moves to the page header, right side, as a quiet button with a plus icon.
- The goal header (value, name, subtitle, status) is one button that opens the goal panel. Remove the "Details" button. Hover shows a subtle background on fine pointers.
- A number goal shows its unit small next to the value (`3.74` large, `GPA` small). A percent goal shows `%` small.
- The line under the pace bar is one sentence stating the expected value ("You should be at 48% today. 2 of 5 milestones done."). Remove the repeated "The marker shows where you should be today."
- Milestones show as the compact inline list in the reference.
- Linked task rows do not show the goal name; they show date, time and length only.
- The goal panel uses the same property-list component as the task panel (extract a shared `PropertyList`): Area, Target date, Start date, Measure (Tasks, Number, Milestones), Current value and Unit and Target for number goals, Status, then a milestones editor and notes. Footer has "Delete goal".

## 5. Week (reference section 5)

- One item style: 13px, weight 500, with a 12px meta line. Tasks are filled (`--s2`), classes and meetings are outlined, done tasks are plain and struck through. No bold class names.
- Day header: weekday, date number, and the planned total on the right. An over-capacity day shows the total in the hot colour followed by ", over".
- An empty day shows nothing under its header. Remove the "Free" box.
- Phone: a vertical list of days with the same item style.

## 6. Dialogs (reference section 6)

- Quick add and command palette text fields have no outline. Everything else keeps its focus ring.
- The shortcuts sheet has its close button on the title row and the two-column key list from the reference. Use arrow glyphs for the arrow keys.
- Check every dialog at 1440x900 and 390x844 for overlap between the close button and content.

## 7. Sweep

- Search the web app's CSS for any remaining `44px` or `min-height: 44px` that applies on desktop and move it to the tokens.
- The sign-in and sign-up pages: fix the "Sign up" link baseline misalignment under the Clerk card (see `signin-d` behaviour: the link sits lower than the sentence). If it is inside Clerk's component, use the appearance API.
- List view: on desktop wider than 1240px show the same side rail as the Day view (week load, deadlines, goals) to the right of the list, so the right half is not empty.

## Verify and report

```
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
```

Update the Playwright tests for the new panel interaction. Then capture, with Playwright at 1440x900 and 390x844 against `/demo`: Day, Day with the task panel open and the Length row expanded, List, Week, Goals, the goal panel, quick add with text typed, the command palette, and the shortcuts sheet. Save to `.agents/screenshots/09/`. Build a side-by-side HTML page `.agents/screenshots/09/compare.html` with each capture next to the matching section of `docs/design/reference/web.html` and list every remaining visible difference and why it remains. Write the report to `docs/reports/09-web-polish.md`. Do not commit.
