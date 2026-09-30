# Brief 03: rebuild the web app from the prototype

Read `AGENTS.md`, `docs/PLAN.md` sections 8 and 9, and then read the whole prototype: `docs/design/proposals/prototype/index.html`, `app.css`, `app.js`. Open the prototype in a browser and use it before writing code, so you know how it feels. Then read the backend public functions in `packages/backend/convex/*.ts` and the models in `packages/backend/convex/model/`.

## Goal

The web app at `/app` looks and behaves like the prototype, on real data from Convex, for the signed-in user. Every interaction in the prototype works. In addition, the task panel gains notes, repeat and reminders, and there is a first-run onboarding.

## Design tokens first

Create `packages/core/src/tokens.ts` exporting the values from the prototype's `:root` in `app.css` (colours as OKLCH strings, the area colour map, spacing scale 4/8/12/16/24/32/48, radii 8/9/10/11/12/14/16, type sizes, motion durations and the ease-out curve). Generate `apps/web/src/app/tokens.css` from it with a small script (`bun run tokens` in `packages/core`) so CSS and TypeScript never drift. Commit the generated file.

## Structure

- Route: `/app` renders the shell. View, date and filters live in the URL: `/app?view=day&date=2026-09-29&area=school&task=<id>`. Reloading restores the same screen. Use Next.js 16 conventions (read the docs in `node_modules/next/dist/docs/` for App Router, route handlers and `useSearchParams`).
- Components in `apps/web/src/components/app/`: `Rail`, `DayView`, `Timeline`, `TimelineBlock`, `Tray`, `SideRail` (week load, deadlines, goals), `ListView`, `WeekView`, `GoalsView`, `QuickAdd`, `CommandPalette`, `TaskPanel`, `Toast`, `HelpSheet`, `Onboarding`. Styling with CSS Modules using `tokens.css` variables. Port the prototype's CSS class by class; do not restyle.
- Data: Convex `useQuery` for `day.get`, `week.get`, `goals.list`, `areas.list`, `projects.list`, and `useMutation` for writes, with optimistic updates for complete, move, resize and quick add. Undo re-applies the previous values through the same mutations.
- One typeface, Schibsted Grotesk, loaded with `next/font/google`, weights 400, 500, 600, 700.

## Behaviour to port, exactly as the prototype does it

- Day view: timeline from the profile's `dayStartHour` to `dayEndHour`, hour lines, the now line (only on today, ticking every 30 s), events as grey blocks, timed tasks with a duration as solid blocks, timed tasks without a duration as slim outlined markers, overlapping blocks laid out in columns, done tasks faded and struck through. The tray shows "Any time today" and "No date yet". Header shows the day name, date, previous/next/today, and the summary line ("6 tasks left, 4h 5m planned, 1 with no length").
- Drag with the mouse: tray card onto the timeline (sets date and time, keeps duration null if it was null), block move (snap 15 min), block resize from the bottom edge (sets duration, min 15). Keyboard alternatives: with a task focused, `M` opens a "move to" time field, `L` opens the length chips. Touch does not drag; it opens the panel.
- List view: grouped by area, then "No date yet"; rows with checkbox, title, meta (deadline, goal, project, time, length).
- Week view: seven columns for the Monday-start week of the current date, plus load chart and deadlines below.
- Goals view: goal cards with value, pace bar with "where you should be today" marker (linear from `startDate` to `targetDate`), status, milestones, and linked tasks. Include an "Add goal" flow and a milestone editor. Goal progress for `kind: "tasks"` is done linked tasks over total; for `kind: "number"` it is `current / target` with an inline field to update `current`; for `kind: "milestones"` it is done milestones over total.
- Quick add (`N` or the add button): the prototype's dialog with live chips from `@kriyan/core`'s parser using the user's real areas and projects, `Enter` to add, and the toast "Added: Today at 18:00" with Undo.
- Command palette (`Ctrl K`): tasks by title plus the commands in the prototype. Arrow keys, Enter, Escape. No animation for keyboard-initiated opening.
- Task panel: everything in the prototype plus: a notes editor (textarea with autosave on blur, stored as plain text in `notes`; no rich text in this brief), a repeat builder (none, daily, weekly with weekday toggles, monthly, yearly, "every N"), reminders (add and remove from the five structured kinds, disabled with an explanation when the task has no time for `at_start` and `before`), deadline picker, goal picker, project select filtered by area. Delete asks nothing and offers Undo in the toast.
- Filters by area, kept in the URL.
- Keyboard: `N`, `Ctrl K`, `1` to `4`, `T`, arrow left and right, `?`, `Escape`, `Enter` and `Space` on a focused task.
- Toast with Undo for complete, delete, move, resize and quick add. Five seconds.
- Deadlines rail: real data. For each active task with a `deadline` within 14 days, compute time needed (its duration, or 60 minutes if none, and say so) against time free (daily capacity minus planned minutes for each day up to the deadline) and show "3h to spare" or "3h short". Week load: from `week.get`; "Thursday is over capacity" uses the profile's `dailyCapacityMinutes`.
- States: skeletons that mirror the final layout while queries load (show after 150 ms), an empty state with one action for each view, an error state that names the problem and offers retry, and an "offline, changes will sync" banner when the Convex client is disconnected.

## Onboarding (first sign-in, `onboardingComplete` false)

A full-screen, five-step flow at `/app/welcome`, skippable at every step, in the same visual language:

1. Areas: School, Business and Life preselected; rename, remove, add.
2. Projects and courses under each area, or skip.
3. Classes and fixed meetings (title, weekdays, start and end time, location), or skip.
4. One goal with a target date, or skip.
5. First tasks: a quick-add field with three example lines; each entry becomes a real task.

Finish sets `onboardingComplete` and lands on the Day view with a one-time hint for drag and for `N`. An "Explore with sample data" link on step 1 creates the prototype's seed data for this user (add a `profiles.seedSample` mutation in the backend for it, using the same rows as `app.js`, dated relative to today) and finishes onboarding.

## Settings (`/app/settings`)

Areas (rename, recolour, reorder, delete with the backend's refusal message when in use), projects and courses, classes (events), habits, daily capacity, day start and end hours, timezone (default from the browser), "Reset everything" (calls `profiles.resetAll` after typing the word RESET), and the Clerk `UserProfile` for account and security. Plain forms in the app's style. No API keys section yet.

## Routing and hosts

- `/` on marketing hosts stays the landing page (a later brief replaces it). On the app host, `/` redirects to `/app`.
- `/sign-in` and `/sign-up` keep Clerk's components but wrapped in the dark theme using Clerk's appearance options so they match.

## Quality bar

- Lighthouse accessibility on `/app` is 95 or higher. All interactive elements reachable by keyboard with a visible focus ring. `aria-label` on icon-only buttons. Dialogs trap focus and restore it on close.
- No layout shift when the timeline loads. Skeleton and content have the same height.
- `prefers-reduced-motion` swaps movement for fades.
- No console errors or warnings in development.
- `bun run typecheck`, `lint` and `build` pass.

## Playwright tests

Add `apps/web/e2e/` with Playwright (install `@playwright/test` as a dev dependency and a `bun run e2e` script). Tests run against `bun run dev` with a Clerk test user. Read Clerk's testing docs for the testing token approach (`@clerk/testing`) and use it; put the required env names in `.env.example`. Cover:

1. Sign in, complete onboarding with the defaults, land on Day view with three areas.
2. Quick add `gym tomorrow 7am`, see the toast, go to tomorrow, see the block at 07:00 without an end time.
3. Open the task, set a length of 45 min, see the block grow and the end time appear.
4. Complete a task, Undo, see it return.
5. Drag a tray card onto the timeline (Playwright mouse) and see it scheduled.
6. Command palette finds a task by title and opens it.
7. Reload keeps view, date and open task from the URL.

## Out of scope

Landing page redesign, MCP tools, CLI, mobile, light theme, rich-text notes, browser notifications.

## Verify and report

```
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
```

Paste the real final lines. Then take screenshots with Playwright of Day, List, Week, Goals, the quick-add dialog and the task panel at 1440x900 and 390x844, save them to `.agents/screenshots/03/` and list the paths. List anything you were unsure about or could not do.
