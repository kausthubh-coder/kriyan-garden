# Kriyan v2 implementation plan

Written 29 September 2026. Replaces the delivery phases in `PLAN.md`. Product decisions in `PLAN.md` that are not contradicted here still stand (hosted product, open source, Clerk + Convex + Vercel, Bun).

Kriyan is an open-source planner that makes organising and planning your life easy and lets the AI you already use plan with you. The approved design is the interactive prototype in `design/proposals/prototype/`: a dark, time-first Day view, with List, Week and Goals views, optional task length and user-defined areas. School, Business and Life are suggested starting points only.

## 1. What we are building

| Surface | What it is | Where it runs |
|---|---|---|
| Landing page | Public marketing page at `kriyan.app` | Vercel |
| Web app | The full product at `app.kriyan.app` | Vercel |
| Android app | Expo app for Android | GitHub APK releases |
| MCP server | Remote server at `app.kriyan.app/mcp` for AI clients | Vercel (inside the web app) |
| CLI | `kriyan` command, installed from npm | The user's machine |
| Backend | One Convex deployment shared by everything | Convex |

All of it is open source under MIT in one repository.

## 2. Repository layout

Bun workspaces, hoisted installs (`linker = "hoisted"` in `bunfig.toml`, because Expo warns that isolated installs break some React Native libraries).

```
apps/
  web/        Next.js 16: landing, app, /mcp, /api/v1
  mobile/     Expo SDK 57
packages/
  backend/    convex/ (schema, functions, tests)
  core/       shared logic with no React or DOM: quick-add parser, dates,
              repeat rules, reminder rules, types, design tokens
  cli/        the `kriyan` npm package
```

- Apps import the backend as `@kriyan/backend/convex/_generated/api`. This mirrors Convex's official monorepo template, which uses pnpm; we keep Bun.
- One React version across the repo, pinned to what Expo SDK 57 expects (19.2.3). React Native is tied to an exact React version, so the web app follows the mobile app here.
- `packages/core` is the reason web, mobile, CLI and MCP all parse "essay fri 5pm #econ 2h" the same way.

## 3. Data model

Current tables are `profiles`, `regions` and `tasks`. Changes:

| Table | Change | Why |
|---|---|---|
| `regions` | Add `parentId`, `kind` (`area`, `project`, `course`) | Areas at the top, projects and courses inside. `parentId` already exists in the uncommitted nested-spaces work. |
| `tasks` | Rename `dueDate` to `date`; add `deadline`, `goalId`. Keep `durationMinutes` nullable. | Today `dueDate` means "the day I plan to do it". The new design separates that from the deadline. |
| `tasks` | `repeatRule` and `reminders` become structured objects | They are free-text strings today. The uncommitted MCP work already defines the structured shapes. |
| `goals` (new) | `areaId`, `title`, `targetDate`, `metric` (`tasks`, `number`, `milestones`), `target`, `current` | Goals with a pace marker. |
| `events` (new) | `areaId`, `title`, `location`, weekly recurrence, start and end time, term dates | Classes and fixed meetings on the timeline. |
| `habits` (new) | `areaId`, `title`, `weeklyTarget`, completion log | Weekly targets, no streak that resets. |
| `profiles` | Add `timezone`, `dailyCapacityMinutes`, `theme` | Capacity warnings and correct "today". |
| `pushTokens` (new) | `ownerId`, `token`, `platform` | Mobile notifications. |
| `reminderJobs` (new) | `taskId`, `fireAt`, `scheduledFunctionId`, `state` | So a reminder can be cancelled when a task moves. |

Rules that do not change: every row has `ownerId`, every query uses an owner index, every function checks identity first.

Migration is widen, backfill, narrow: add new optional fields, run a backfill mutation in batches, then make them required. Existing top-level spaces become areas.

## 4. One operations layer

PR #1 adds `convex/operations.ts`, which holds create, update and complete logic once. Everything calls it:

```
web app  ─┐  (Clerk session)
mobile   ─┼─▶ Convex public functions ─┐
          │                            ├─▶ operations.ts ─▶ database
MCP      ─┼─▶ Convex service functions ─┘
CLI/API  ─┘  (signed by the web server)
```

`convex/mcp.ts` and `convex/mcpInternal.ts` are renamed to `service.ts` and `serviceInternal.ts`, since the CLI uses them too.

## 5. Authentication

Clerk is the only identity provider. The hosted product uses the Clerk development instance, including production. There is no Clerk production instance to create. Development is limited to 100 users and shows a development banner on hosted sign-in and consent pages. The Clerk user ID is the owner ID everywhere.

| Surface | Sign-in | Convex trust |
| --- | --- | --- |
| Web and Android | Clerk session | Clerk JWT from the convex template, verified by auth.config.ts |
| MCP | Browser OAuth with S256 PKCE and consent, through dynamic registration or a client metadata document | Web server verifies the token for its exact MCP resource, then signs the service request for the verified owner |
| API and CLI | Browser OAuth with S256 PKCE, consent and an ephemeral 127.0.0.1 callback; CLI refreshes silently | Web server verifies the token for its exact API resource, then signs the same service request |

OAuth uses `openid profile email`, adding `offline_access` when refresh is needed. No custom scopes or user API keys are required. A valid token for `/mcp` or `/api/v1` grants full access to the verified user's own planner; each resource refuses tokens intended for the other. Expired, revoked, audience-less and non-user tokens are refused.

Dynamic client registration, client metadata documents, audience claims and the public Kriyan CLI application were configured through the Clerk CLI. The application requires PKCE and consent, registers `http://127.0.0.1/callback` and allows `openid profile email offline_access`. `CLERK_CLI_CLIENT_ID` is configured in the web environment and Vercel. Nothing needs the Clerk dashboard. See `docs/setup/05-development-oauth.md`.

External callers go through the web server rather than forwarding their token to Convex. Service requests use canonical JSON, HMAC signatures, an owner-bound nonce and a five-minute window. The service secret lives only in server environments. Convex checks ownership and owner indexes on every operation.

The CLI stores tokens in the OS keychain and falls back to a user-only config file when the keychain is unavailable. Refresh preserves the exact resource and client binding. MCP and CLI have no destructive delete until a trash with restore exists.

## 6. MCP server

Keep the existing server and land the uncommitted improvements (spaces by name or path, structured repeat and reminders, a plain-English read-back after every write).

Tools at launch:

| Group | Tools |
|---|---|
| Find | `list_areas`, `open_space`, `search` |
| Plan | `get_day` (timeline, any-time tasks, free time), `get_week` (load per day, deadlines) |
| Tasks | `list_tasks`, `get_task`, `create_task`, `update_task`, `complete_task`, `quick_add` (takes the same text a person would type) |
| Goals | `list_goals`, `get_goal`, `update_goal_progress` |
| Spaces | `create_space`, `update_space` |

Work to do:
1. Every tool takes the user's local date or timezone, so "today" is never the server's UTC date.
2. Turn on Client ID Metadata Documents in Clerk (the method the spec now prefers) and keep dynamic client registration for older clients.
3. Check protocol versions. `mcp-handler` and `@clerk/mcp-tools` depend on different major versions of the MCP SDK, and the 2026-07-28 spec removed sessions and the handshake. We test against both the current and the previous spec revision.
4. Test the deployed server from Claude, ChatGPT, Cursor and VS Code.
5. Rate limit per user with `@convex-dev/rate-limiter`.

## 7. CLI

A thin client over `/api/v1`. It holds no business logic; parsing comes from `packages/core`.

```
kriyan login                      browser sign-in
kriyan logout
kriyan add "essay fri 5pm #econ 2h"
kriyan today                      today's timeline and any-time tasks
kriyan week
kriyan list [--area school] [--due today|week|overdue]
kriyan done <id or text>
kriyan move <id or text> tomorrow 3pm
kriyan goals
kriyan open                       opens the web app
kriyan mcp                        prints setup steps for each AI client
```

- Every command supports `--json` for scripts.
- Shipped to npm as one bundled file with a Node shebang, so `npx kriyan` and `bunx kriyan` both work.
- `done` and `move` match by text and ask when more than one task matches.

## 8. Web app

Rebuild the UI from the prototype in React, on the existing Next.js 16 app. Read the bundled Next.js docs in `node_modules/next/dist/docs/` before writing routes, as `AGENTS.md` requires.

| Area | Scope |
|---|---|
| Views | Day (timeline, any-time tray, week load, deadlines, goals), List, Week, Goals |
| Capture | Quick add with live parsing, command palette, single-key shortcuts |
| Task detail | Area, project, day, time, optional length, deadline, goal, plus the features already on `main`: notes editor with slash commands, repeat builder, reminders |
| Drag | Tray to timeline, move, resize. Keyboard alternatives for each. |
| State | Convex `useQuery` and `useMutation` with optimistic updates and undo |
| Settings | Areas and projects, timetable, daily capacity, timezone, connected AI clients, export, delete account |
| Theme | Dark only. Colours are tokens in `packages/core`. |
| Quality | Loading skeletons, empty states, error states, offline banner, reduced motion, full keyboard use, 4.5:1 contrast |

Styling stays CSS Modules with tokens, as today. State that belongs in the URL (view, date, area filter, open task) goes in the URL.

## 9. Onboarding

Five short steps, skippable, under two minutes:

1. **Areas.** Choose your areas. The suggested defaults are starting points; rename, remove or add your own.
2. **Projects and courses.** Add a few under each area, or skip.
3. **Timetable.** Add classes and fixed meetings, or skip. Mobile offers a calendar import later.
4. **First goal.** One goal with a target date, or skip.
5. **First tasks.** A quick-add box with three examples. Whatever is typed becomes real tasks.

Then the Day view, with a one-time hint for drag and for `N`. The "explore a sample" option stays, using the prototype's seed data.

## 10. Landing page

`kriyan.app`, static, fast, no sign-in needed.

1. Headline and one-line promise, with the real Day view as the hero image.
2. An interactive quick-add box: type a task and watch it parse. It runs `packages/core` in the browser.
3. Three sections, one per question the app answers: when will I do it (Day), am I on pace (Goals and deadlines), what is left (List).
4. "Works with your AI": the MCP server with copy-and-paste setup for Claude, ChatGPT and Cursor, and the CLI.
5. Open source: link to the repository, licence, self-hosting guide.
6. Download links for iOS and Android, and "Open the web app".

Also: `/privacy`, `/terms`, `/docs` (MCP, CLI, quick-add grammar, self-hosting), social preview image, sitemap.

## 11. Mobile app

Expo SDK 57 with Expo Router, `@clerk/expo`, Convex.

| Area | Scope |
|---|---|
| Tabs | Day, List, add button, Week, Goals |
| Day | Timeline with long-press to drag, any-time list on top |
| Capture | Bottom sheet with the same parser and chips |
| Task detail | Bottom sheet |
| Gestures | Swipe right to complete, swipe left to schedule, haptics on complete and drop |
| Sign-in | Native Google and Apple. Apple sign-in is required on iOS once Google is offered. |
| Notifications | See below |
| Later | Home-screen widget, share-sheet capture, calendar import |

Native sign-in and push both need a development build, so we use EAS from the start, not Expo Go. Fonts ship as static weight files.

**Reminders.** Sent from the server, so a task created on the web or by an AI still rings the phone.
- When a task with a reminder is saved, Convex schedules a function at that time with `scheduler.runAt` and stores the job ID.
- When the task moves, is completed or is deleted, the job is cancelled and rescheduled.
- The function sends through `@convex-dev/expo-push-notifications`.
- Limits to accept: scheduled actions run at most once with no retry, and Expo's push service is best effort. Reminders are reliable enough for tasks, and we do not promise alarm-clock precision.
- Web gets browser notifications as a later step.

## 12. Open source

- Licence: MIT (already in the repo).
- `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue and pull request templates.
- Self-hosting guide: create Clerk and Convex projects, set environment variables, deploy. The hosted product stays the default.
- GitHub Actions on every pull request: typecheck, lint, Convex tests, web build, CLI build.
- Secret scanning and a check that no `.env` file is committed. `.env.local` is already ignored.
- Convex tests with `convex-test`: owner isolation for every function, service signature checks, reminder scheduling.

## 13. Production and publishing

| Item | Action |
|---|---|
| Domain | Move the app from `kriyan.vercel.app` to `app.kriyan.app`. Keep the configured public OAuth resource origin aligned with the domain. |
| Clerk | Keep the development instance as the production identity provider. OAuth is configured through the CLI with standard scopes, PKCE, consent, DCR, CIMD and audience claims. Accept the 100-user limit and development banner. |
| Convex | Production deployment with its own environment variables. |
| Vercel | Production environment variables, preview deployments pointed at the Convex dev deployment. |
| Monitoring | Error tracking on web and mobile, Convex log alerts. |
| Legal | Privacy policy, terms, in-app account deletion (Apple requires it). |
| npm | Publish `kriyan`. Check the name is free first. |
| Apple | Developer Program, 99 USD per year. TestFlight, then review. |
| Google | 25 USD once. New personal accounts must run a closed test with 12 testers for 14 days before production. |
| EAS | Free tier gives 15 iOS and 15 Android builds a month, which is enough to start. |

## 14. Order of work

Sizes are rough: S is about a day of focused work, M is several days, L is a week or more.

| Phase | What | Size | Done when |
|---|---|---|---|
| 0 | Land existing work: merge PR #1; commit the nested-spaces and MCP work as its own PR on top; commit the design proposals; archive the old design branches and worktrees | S | `main` has the audit fixes and nested spaces, and no work exists only on disk |
| 1 | Monorepo: move to `apps/web`, `packages/backend`, `packages/core`; CI | M | Web deploys from the new layout with no behaviour change |
| 2 | Data model v2, operations layer, migration, tests, rate limits | M | Tests pass, existing data migrated on dev |
| 3 | Web app rebuild and onboarding | L | Every prototype interaction works against real data, plus notes, repeats and reminders |
| 4 | Landing page, docs, legal pages, open-source files | M | `kriyan.app` is live with the new page |
| 5 | MCP v2, `/api/v1`, CLI | M | Claude, ChatGPT and Cursor can plan a day; `npx kriyan add` works |
| 6 | Production cutover for web: Clerk production, domain, monitoring | S | Real sign-ups work on `app.kriyan.app` |
| 7 | Mobile app and push reminders | L | TestFlight and Android closed test builds in testers' hands |
| 8 | Store release | S, plus waiting | Live on both stores |

Phases 4 and 5 can run alongside phase 3. Start the Google closed test as early as phase 7 allows, since the 14 days cannot be shortened.

## 15. Risks

| Risk | Mitigation |
|---|---|
| MCP package versions and the new spec revision may not interoperate | Check first in phase 5, before adding tools. Pin versions. |
| Bun workspaces with Expo are supported but less travelled than pnpm | Hoisted installs, one React version, `expo install --check` in CI. If it fights us, switch the package manager to pnpm; nothing else changes. |
| Timeline drag on touch is hard to get right | Build it first in phase 7. Fall back to setting time in the sheet, as the prototype does. |
| Server-sent reminders can be late or dropped | State it plainly in the app. Add local scheduled notifications as a backup for the next 24 hours if it proves a problem. |
| Renaming `dueDate` touches every surface | Do it in phase 2 with the migration, before the UI rebuild. |
| The work in two worktrees is uncommitted | Phase 0 comes first. |

## 16. Decisions needed from the owner

1. Move the app to `app.kriyan.app`? Recommended, and needed for Clerk production.
2. Dark theme only at launch, with light to follow? Recommended.
3. Both stores at once, or iOS first? Google's 14-day test makes Android slower whichever is chosen.
4. Are you willing to pay for the Apple (99 USD per year) and Google (25 USD) developer accounts, and can you find 12 Android testers?
5. Is there anyone else's data on the current deployment, or only yours? This decides how careful the migration must be.
6. Keep the name and the word "garden" anywhere, or drop the garden language completely?
