# Brief 12: rebuild web onboarding and settings from the reference

Read `AGENTS.md`. Open `docs/design/reference/onboarding-settings.html` in a browser and read its HTML, its `<style>` block and `ref.css`. It is the design to port. `docs/design/reference/audit/welcome-step-*.png` and `settings-*.png` show the current screens: a bare text column with tiny buttons and raw forms, and a settings page with four outlined buttons on every row. The owner called the current onboarding "so bad". Port the reference exactly; do not reinterpret it.

## Working arrangement

Another Codex session is running in a different worktree on the landing page, the goal panel and the Week view. To avoid conflicts:

- Put all new styles in new files: `apps/web/src/components/app/Onboarding.module.css` and `Settings.module.css`. Compose from the existing module where you need shared classes, but do not edit `App.module.css`, `GoalPanel.tsx`, `GoalsView.tsx`, `WeekView.tsx`, anything under `apps/web/src/app/(marketing)` or the landing components, or `packages/core/src/tokens.ts`.
- You may read and reuse `PropertyList.tsx`, `Timeline.tsx`, `TimelineBlock.tsx`, `Filters.tsx`, `QuickAdd.tsx`, `DateEditor.tsx` and the goal card. If a component needs a small change to be reusable in a preview (for example a `static` prop that disables drag and clicks), add it without changing existing behaviour.
- Run your dev server and Playwright on port 3400, not 3000 (`E2E_BASE_URL=http://localhost:3400`, and start Next with `--port 3400`). Do not stop processes on other ports.
- First run `bun install` in this worktree.

## Onboarding (`/app/welcome`)

Frame, identical on every step:

- Top bar: wordmark on the left; "Use sample data" and "Sign out" as quiet text buttons on the right.
- Two columns on desktop (1024px and wider): the question on the left (520px), a live preview on the right. Exact sizes, spacing and type are in the reference.
- Left column: "Step N of 5", a plain-language heading at 40px, one sentence, the inputs, and a footer pinned to the bottom of the column with the primary button (46px tall), then "Back" and "Skip" as quiet text buttons ("Skip" right-aligned). Step 1 has no Back or Skip. The last step's primary button reads "Open my planner".
- Right column: a framed preview with a one-line caption. The preview is built from the real app components with the data entered so far, rendered static (no drag, no click, `aria-hidden`, excluded from the tab order). It updates as the person types.
- Below 1024px: one column; the preview sits under the inputs at 260px tall; on phones the primary button is full width and pinned above the bottom safe-area inset.

Steps, headings and content:

1. **"What do you plan for?"** Area rows with a colour dot, the name and a remove button. Clicking a name edits it in place (soft fill, Enter or blur saves, Escape cancels). Clicking the dot opens the colour swatches. "Add another area" adds a row in edit mode with the next unused colour. At least one area must remain; removing the last shows "Keep at least one area." Preview: the Day header, the filter chips for the areas, and an empty timeline with the now line.
2. **"What are you working on?"** Under each area heading, a row per project or course and an "Add a project or course" row (type, Enter to add; a small toggle picks Project or Course, defaulting to Course under an area named School and Project elsewhere). Preview: the areas as section headings with their projects listed.
3. **"Anything fixed each week?"** Added classes and meetings are rows ("CS 201 lecture", "Tue, Thu 10:00 to 11:15", remove). The add form is: name; weekday toggles starting on Monday; start and end as 24-hour text fields that accept "10", "1015", "10:15" or "10.15am" and normalise on blur (never a native time input); optional place; area chips; "Add class". End must be after start ("End time must be after the start."). Preview: the timeline for the next day that has one of the classes, with those classes on it; caption names the day.
4. **"What are you aiming for?"** Title field; area chips; target chips (End of the month, In 3 months, Pick a day); measure chips (Tasks done, A number, Milestones), with Number revealing target and unit fields. One goal only in onboarding. Preview: the goal card with its pace bar.
5. **"What is on your mind?"** The one-line quick add (the same parser and chip behaviour as the app), not a textarea. Enter adds the task to a list below (checkbox circle, title, understood day/time/length, remove). "Try" chips fill the field. Preview: today's timeline with the classes from step 3 and the tasks as they are added; tasks without a time appear in an "Any time today" list above the timeline in the preview.

Behaviour:

- Every answer saves to the backend as it is made (areas, projects, events, goal, tasks), so leaving and returning resumes on the same step with the same data. The step is in the URL (`/app/welcome?step=3`).
- "Use sample data" confirms nothing: it calls the existing sample seed and goes to the Day view. If the person has already entered areas or tasks, it first asks "Replace what you have entered with sample data?" with "Replace" and "Keep mine".
- Finishing sets `onboardingComplete` and lands on the Day view with the existing one-time hint.
- Loading: the frame renders immediately with skeleton rows; no layout shift when data arrives. Errors appear inline under the input that caused them.
- Keyboard: Enter in a single-field step advances only when the field is empty (otherwise it adds the item); Alt+Left goes back. Focus moves to the step heading on each step change, and the step is announced to screen readers.

## Settings (`/app/settings`)

- Layout from the reference: the app rail, a plain section index (34px rows, soft fill on the current one, no outlines; "Reset everything" in the hot colour, set apart), and the content column (max 760px).
- Sections: Areas, Projects and courses, Classes and meetings, Habits, Planning, Account, Reset everything. The section is in the URL (`/app/settings/areas`).
- **Areas**: rows with a drag grip, colour dot, name, a count ("3 courses, 12 tasks") and a chevron. A row opens inline to: name field (saves on blur), colour swatches (saves on click), "Delete area" (quiet danger text; the backend's refusal message shows inline when the area is in use). Reorder by dragging the grip; with the grip focused, arrow up and down move the row. "Add an area" is the last row. Remove every per-row "Save area", "Move up", "Move down" and "Delete area" button from the closed state.
- **Projects and courses**: grouped under each area heading; rows open inline to name, kind (Project or Course), area chips, archive and delete.
- **Classes and meetings**: grouped by area; each row summarises itself ("Tue, Thu 10:00 to 11:15, Room 4.12"; add ", until 19 Dec" when it ends) and opens to the same editor as onboarding step 3, plus "Runs from" and "Until" day editors (the shared day chips; a native date field only behind "Pick a day").
- **Habits**: rows with the name and "5 of 7 a week"; open to name, area, weekly target chips 1 to 7.
- **Planning**: the shared `PropertyList`: Daily capacity (chips 4h to 8h and a custom field), Day starts, Day ends (24-hour text fields), Timezone (searchable list; shows "New York (UTC−4)").
- **Account**: Clerk's `UserProfile` with the dark appearance, as today.
- **Reset everything**: one sentence on what it deletes, a field to type RESET, and the danger button. Nothing else on that section.
- Phone: the index becomes a list screen; choosing a section pushes it with a back arrow, as in the Android reference.
- Every save shows a brief inline "Saved" next to the field (not a toast) and failures show the message inline.

## Shared

- Extract the editable row (`EditableRow`), weekday toggles (`WeekdayToggles`), 24-hour time field (`TimeField`, with its parser in `packages/core/src/timeInput.ts` plus tests for "10", "1015", "10:15", "10.15am", "9pm", "24:00" rejected, empty allowed) and colour swatches (`Swatches`) as components used by both onboarding and settings.
- All dates and times shown as values go through `packages/core/src/format.ts`.

## Verify and report

```
bun run typecheck
bun run lint
bun run test
bun run build
E2E_BASE_URL=http://localhost:3400 bun run e2e
```

Update the Playwright tests for the new onboarding and settings flows. Capture, signed in with a disposable Clerk test user: all five onboarding steps with realistic data entered, at 1440x900 and 390x844; settings Areas with a row open, Projects and courses, Classes and meetings with a row open, Habits, Planning with a row open, Reset everything, at both sizes. Save to `.agents/screenshots/12/` and build `.agents/screenshots/12/compare.html` next to the matching reference boards. List every remaining visible difference and why. Write `docs/reports/12-onboarding-settings.md`. Do not commit.
