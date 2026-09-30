# Brief 03b: List, Week and Goals views, onboarding, settings, end-to-end tests

Read `AGENTS.md`, `docs/PLAN.md` sections 8 and 9, the prototype in `docs/design/proposals/prototype/`, and the code produced by brief 03a in `apps/web/src/components/app/`. Reuse its components, tokens and patterns; do not create a second styling system.

## Goal

Finish the web app: the remaining three views, first-run onboarding, settings, themed sign-in pages, and Playwright end-to-end tests.

## Views

- List view: grouped by area, then "No date yet"; rows with checkbox, title, meta (deadline, goal, project, time, length).
- Week view: seven columns for the Monday-start week of the current date, plus load chart and deadlines below.
- Goals view: goal cards with value, pace bar with "where you should be today" marker (linear from `startDate` to `targetDate`), status, milestones, and linked tasks. Include an "Add goal" flow and a milestone editor. Goal progress for `kind: "tasks"` is done linked tasks over total; for `kind: "number"` it is `current / target` with an inline field to update `current`; for `kind: "milestones"` it is done milestones over total.

- Filters, keyboard shortcuts, URL state, skeletons, empty and error states follow the same rules as brief 03a.

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
