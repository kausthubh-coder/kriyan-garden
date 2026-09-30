# Brief 03a: web app shell, Day view, quick add, task panel

Read `AGENTS.md`, `docs/PLAN.md` sections 8 and 9, and then read the whole prototype: `docs/design/proposals/prototype/index.html`, `app.css`, `app.js`. Open the prototype in a browser and use it before writing code, so you know how it feels. Then read the backend public functions in `packages/backend/convex/*.ts` and the models in `packages/backend/convex/model/`.

## Goal

The web app at `/app` looks and behaves like the prototype's Day view, on real data from Convex, for the signed-in user. This brief covers the shell, the Day view, quick add, the command palette, the task panel (with notes, repeat and reminders) and toasts. List, Week, Goals, onboarding, settings and end-to-end tests are brief 03b; leave their rail buttons in place but routing to a simple 'Coming soon' placeholder in the same style.

## Design tokens first

Create `packages/core/src/tokens.ts` exporting the values from the prototype's `:root` in `app.css` (colours as OKLCH strings, the area colour map, spacing scale 4/8/12/16/24/32/48, radii 8/9/10/11/12/14/16, type sizes, motion durations and the ease-out curve). Generate `apps/web/src/app/tokens.css` from it with a small script (`bun run tokens` in `packages/core`) so CSS and TypeScript never drift. Commit the generated file.

## Structure

- Route: `/app` renders the shell. View, date and filters live in the URL: `/app?view=day&date=2026-09-29&area=school&task=<id>`. Reloading restores the same screen. Use Next.js 16 conventions (read the docs in `node_modules/next/dist/docs/` for App Router, route handlers and `useSearchParams`).
- Components in `apps/web/src/components/app/`: `Rail`, `DayView`, `Timeline`, `TimelineBlock`, `Tray`, `SideRail` (week load, deadlines, goals), `ListView`, `WeekView`, `GoalsView`, `QuickAdd`, `CommandPalette`, `TaskPanel`, `Toast`, `HelpSheet`, `Onboarding`. Styling with CSS Modules using `tokens.css` variables. Port the prototype's CSS class by class; do not restyle.
- Data: Convex `useQuery` for `day.get`, `week.get`, `goals.list`, `areas.list`, `projects.list`, and `useMutation` for writes, with optimistic updates for complete, move, resize and quick add. Undo re-applies the previous values through the same mutations.
- One typeface, Schibsted Grotesk, loaded with `next/font/google`, weights 400, 500, 600, 700.

## Backend changes you may make

If the UI needs a different read shape (for example `week.get` should not repeat the unscheduled list seven times, or `day.get` should include the tasks' project and goal names), change the backend read functions in `packages/backend/convex/model/` and their public wrappers, keep every existing test passing, and add tests for what you change. Do not change write rules.

## Behaviour to port, exactly as the prototype does it
- Day view: timeline from the profile's `dayStartHour` to `dayEndHour`, hour lines, the now line (only on today, ticking every 30 s), events as grey blocks, timed tasks with a duration as solid blocks, timed tasks without a duration as slim outlined markers, overlapping blocks laid out in columns, done tasks faded and struck through. The tray shows "Any time today" and "No date yet". Header shows the day name, date, previous/next/today, and the summary line ("6 tasks left, 4h 5m planned, 1 with no length").
- Drag with the mouse: tray card onto the timeline (sets date and time, keeps duration null if it was null), block move (snap 15 min), block resize from the bottom edge (sets duration, min 15). Keyboard alternatives: with a task focused, `M` opens a "move to" time field, `L` opens the length chips. Touch does not drag; it opens the panel.
- Quick add (`N` or the add button): the prototype's dialog with live chips from `@kriyan/core`'s parser using the user's real areas and projects, `Enter` to add, and the toast "Added: Today at 18:00" with Undo.
- Command palette (`Ctrl K`): tasks by title plus the commands in the prototype. Arrow keys, Enter, Escape. No animation for keyboard-initiated opening.
- Task panel: everything in the prototype plus: a notes editor (textarea with autosave on blur, stored as plain text in `notes`; no rich text in this brief), a repeat builder (none, daily, weekly with weekday toggles, monthly, yearly, "every N"), reminders (add and remove from the five structured kinds, disabled with an explanation when the task has no time for `at_start` and `before`), deadline picker, goal picker, project select filtered by area. Delete asks nothing and offers Undo in the toast.
- Filters by area, kept in the URL.
- Keyboard: `N`, `Ctrl K`, `1` to `4`, `T`, arrow left and right, `?`, `Escape`, `Enter` and `Space` on a focused task.
- Toast with Undo for complete, delete, move, resize and quick add. Five seconds.
- Deadlines rail: real data. For each active task with a `deadline` within 14 days, compute time needed (its duration, or 60 minutes if none, and say so) against time free (daily capacity minus planned minutes for each day up to the deadline) and show "3h to spare" or "3h short". Week load: from `week.get`; "Thursday is over capacity" uses the profile's `dailyCapacityMinutes`.
- States: skeletons that mirror the final layout while queries load (show after 150 ms), an empty state with one action for each view, an error state that names the problem and offers retry, and an "offline, changes will sync" banner when the Convex client is disconnected.

## Quality bar

- Lighthouse accessibility on `/app` is 95 or higher. All interactive elements reachable by keyboard with a visible focus ring. `aria-label` on icon-only buttons. Dialogs trap focus and restore it on close.
- No layout shift when the timeline loads. Skeleton and content have the same height.
- `prefers-reduced-motion` swaps movement for fades.
- No console errors or warnings in development.
- `bun run typecheck`, `lint` and `build` pass.

## Out of scope

List, Week and Goals views, onboarding, settings, landing page, MCP tools, CLI, mobile, light theme, rich-text notes, browser notifications, Playwright tests (all in later briefs).

## Verify and report

```
bun run typecheck
bun run lint
bun run test
bun run build
```

Paste the real final lines. Then run the app locally, sign in with a Clerk test user (create one with the Clerk CLI if needed; it is linked to the app), and use the Playwright MCP or browser tools to exercise: quick add, drag a tray card onto the timeline, move a block, resize a block, complete with undo, open and edit a task, command palette. Take screenshots of the Day view, quick add and the task panel at 1440x900 and 390x844, save them to `.agents/screenshots/03a/`, and compare them side by side with the prototype screenshots in `docs/design/proposals/prototype/shots/`. List every visible difference from the prototype and whether you fixed it. List anything you could not do.
