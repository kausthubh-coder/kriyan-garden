# Brief 11: Android app UI rebuild from the reference

Read `AGENTS.md` (the control-size, date-format and area-label rules changed). Open `docs/design/reference/android.html` and sections 3 and 7 of `docs/design/reference/web.html` in a browser, and read their HTML and `ref.css`. They are the design to port. `docs/design/reference/audit/android-*.png` show the current app: it works, but it does not look like the product. The app must look like the web app at phone width.

Use the installed Codex plugins for building and testing React Native and Android apps. Work only in `apps/mobile`, plus `packages/core` for shared formatters and tokens.

## What is wrong now (fix all of it)

1. The header takes almost half the screen: a huge title, a separate subtitle, a summary, a row of three big buttons, an "Areas" label, then chips. Replace with the reference header: one row with the title (26sp, weight 700) on the left and the joined date navigation plus a settings icon button on the right; one summary line under it; then the chips. The timeline or list must start in the top third of the screen.
2. Filter chips use coloured text. They must be a coloured dot plus a neutral label, 36dp tall, with the touch area padded to 44dp. The selected chip is filled ink. No "Areas" label.
3. The settings button shows a sun icon. Use a gear icon, labelled "Settings" for screen readers.
4. Timeline blocks have no checkbox and truncate titles to a few letters. Blocks follow the reference: checkbox, title (up to two lines when the block is tall enough), one meta line, start time on the right. Tasks without a length are the outlined marker. Classes are neutral with an area dot. The now line sits under blocks.
5. The task sheet is a stack of full-width outlined buttons with labels like "Pick a day: 2026-10-01". Rebuild it as the property list: grab handle, project line with close button, title with checkbox (inline editable, no boxed input, no separate "Complete task" button), notes, then rows Area, Project, Day, Time, Length, Deadline, Goal, Repeat, Reminders. Each row shows its value and expands inline to its editor, one open at a time. Use the platform date and time pickers only inside the "Pick a day" and time editors.
6. Raw ISO dates appear throughout ("due 2026-10-07", "2026-10-01"). Every date goes through the shared formatter in `packages/core` ("Thu 1 Oct", "Today", "Tomorrow"). If brief 09 has already added these formatters, use them; if not, add them with tests.
7. Goals: cards follow the reference (value with small unit, name, subtitle, pace bar, one status sentence, linked task rows). "Add goal" is a quiet button in the header, not a full-width primary button. The tab icon is the target (two circles), not a clock.
8. Week: the day strip follows the reference (weekday, date number, a thin load bar; no "0m" labels; the selected day has a filled background; an over-capacity day's number is in the hot colour and the sentence under the strip says so in words). Below it, the selected day's tasks use the same rows as the List screen (checkbox, title, meta, time). Remove the boxed clock and calendar icon buttons from rows. Deadlines rows follow the reference.
9. List: rows and area section headings follow the reference. Swipe right completes; swipe left opens the Day editor of the task sheet.
10. Quick add sheet follows the reference: a plain text line with the caret, parsed tags under it, one primary "Add task" button.
11. Settings is a list screen: rows for Areas, Projects and courses, Classes and meetings, Habits, Daily capacity, Day starts and ends, Notifications, Account, then "Sign out" and "Delete account and data". Each row pushes its own screen. No "Return to planner" button; use a back arrow in the header and the system back gesture.
12. Areas screen: rows with a 12dp colour dot, the name and a count; tapping opens the edit sheet with a name field, colour swatches (the eight token colours as 36dp circles, selected one ringed, each with an accessibility label naming the colour), "Delete area" as a quiet danger text button and "Save area" as the primary button. Remove the "Edit School" style buttons and the "School blue" text chips everywhere.
13. Onboarding follows the reference: "Step 1 of 5", a plain-language heading, one sentence, the content, a full-width primary "Continue" pinned above the bottom inset, and a quiet text button under it ("Use sample data" on step 1, "Skip" on the others). Areas on step 1 are rows with a remove button, plus "Add another area".
14. Plurals: "1 task left", not "1 tasks left". Fix the shared summary formatter and test it.
15. Type scale on Android: body 16sp, meta 13.5sp, section headings 14.5sp weight 600, screen title 26sp weight 700. Nothing larger than 38sp (goal values). Respect the system font scale up to 1.3 without clipping.
16. The launcher icon is Android's template icon and the "Add task" shortcut icon is blank. Create an adaptive icon: the lowercase "k" wordmark glyph in ink on the app background colour, with a monochrome layer for themed icons, and a plus glyph for the shortcut.

## Components

Build a small set of shared primitives in `apps/mobile/src/ui/` and use them everywhere, so screens cannot drift: `Header`, `SegmentedNav`, `Chip`, `Check`, `TaskRow`, `TaskCard`, `PropertyList` and `PropertyRow`, `Sheet`, `ListRow`, `Swatches`, `PrimaryButton`, `QuietButton`, `TextButton`. Values come from the generated theme; no hard-coded colours or sizes in screens.

## Verify and report

```
bun run typecheck
bun run lint
bun run test
cd apps/mobile && npx expo-doctor
```

Then build and run on the Android emulator with a Clerk test user and sample data (use the sample-data onboarding path), and capture every screen in the reference plus the task sheet with the Length row open, the Areas edit sheet, and onboarding steps 1 and 5. Save to `.agents/screenshots/11/`. Build `.agents/screenshots/11/compare.html` placing each capture next to the matching frame of `docs/design/reference/android.html`, and list every visible difference that remains and why. Also save the Day capture as `apps/web/public/landing/android-day.webp` at 2x for the landing page. Clean up the test user afterwards. Write the report to `docs/reports/11-android-ui.md`. Do not commit.
