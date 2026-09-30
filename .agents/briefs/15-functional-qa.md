# Brief 15: functional QA of everything, with real accounts

You are the tester. The reviewer handles visual design separately; your job is to prove that every feature works end to end on every surface, find what does not, fix what is straightforward, and report the rest with exact reproduction steps. Read `AGENTS.md`, `docs/PLAN.md`, `docs/mcp.md`, `docs/api.md`, `packages/cli/README.md` and `docs/site/android.md` first.

Use the Codex plugins and tools that fit: the browser and Playwright tools for the web app, the Android testing plugin and emulator for the app, the Convex plugin for backend inspection, the Vercel plugin for deployment checks, and the GitHub plugin for CI.

## Accounts and data

- The Clerk CLI is linked to the app's development instance from `apps/web`. Create disposable test users with the Backend API (`+clerk_test` addresses, as `apps/web/e2e/auth.setup.ts` does). Create at least two users, A and B, so isolation can be tested. Delete every test user and its data when you finish, and confirm with a final listing that none remain.
- Never print secrets, tokens or the contents of env files.
- The Convex development deployment is shared with other sessions. Only touch rows owned by your test users.

## Clerk development settings you may change

These are required for the MCP server, the API and the CLI, and cannot be set through the API. If the owner's browser is signed in to the Clerk dashboard, use the browser tools to make exactly these changes on the **development** instance of the `kriyan` application, and nothing else. If it is not signed in, stop this part, report it, and continue with everything that does not depend on it.

1. OAuth applications, Scopes: create `tasks:read`, `tasks:write`, `spaces:read`, `spaces:write`, `goals:read`, `goals:write` with the descriptions in `docs/setup/05-development-oauth.md`.
2. API keys: enable user API keys.
3. Then, with the Clerk CLI (`clerk api`, development instance only): set the instance default scopes and create the public "Kriyan CLI" OAuth application exactly as `docs/setup/05-development-oauth.md` describes, after listing existing applications to avoid a duplicate. Put the resulting client id where the web app expects it and say which env var you set (names only).

Do not touch a production instance, billing, or any other application.

## What to test

Record each item as pass, fail or blocked, with evidence (the command and its output, or a screenshot path).

### Web app (signed in, desktop and phone width)

1. Sign up, sign in, sign out; a signed-out request to `/app` redirects to sign in.
2. Onboarding start to finish with typed data; resume after a reload mid-way; the sample-data path.
3. Quick add: every row of the grammar table in `docs/site/quick-add.md`, checked against what is stored.
4. Task edits from the panel: every property, including clearing each one; a time without a date is refused; clearing the date clears the time; length stays optional.
5. Timeline: drag from tray, move, resize, overlapping tasks, tasks across the day's start and end hours, the now line at the right minute for the profile timezone.
6. Complete, reopen, delete, and Undo for each; Undo after a reload is gone.
7. Repeats: daily, weekly on chosen weekdays, monthly on the 31st, yearly on 29 February; completing creates exactly one next occurrence; completing twice quickly does not create two.
8. Reminders: each of the five kinds is stored; "at start" and "before" are refused without a time; more than eight are refused.
9. Goals: all three measure kinds, milestones, pace status on, ahead, behind and late, deleting a goal with linked tasks and Undo.
10. Areas, projects, classes, habits and planning settings: create, rename, recolour, reorder, delete; deleting an area in use is refused with a clear message.
11. Filters, URL state and reload for every view; browser back and forward.
12. Command palette and every keyboard shortcut.
13. Offline: go offline, make three changes, come back online, confirm all three are stored once.
14. Two browser windows for the same user: a change in one appears in the other without a reload.
15. Isolation: user B cannot see or change anything of user A, including by pasting A's task and goal ids into B's URL and into direct Convex calls.
16. Dates: set the profile timezone to Auckland and to Honolulu and confirm "today", deadlines and reminders follow the profile, across a DST change date.
17. Reset everything and delete account: all rows of that user are gone (check every table), and another user's rows are untouched.
18. Accessibility: run axe on every view and dialog; tab order and focus return for every dialog; screen-reader names on icon buttons.

### Website

19. Landing page: every link, the live demo (add, drag, complete inside it, nothing persisted after reload), the quick-add strip, each setup tab and its copy button, `/download`.
20. Docs: every page renders, every internal link resolves, code samples match the real commands.
21. `robots.txt`, `sitemap.xml`, the Open Graph image, and security headers on every route; the CSP does not block anything the pages need (no console violations).
22. Lighthouse on `/` and `/docs` at desktop and mobile.

### MCP server

23. With a script that speaks Streamable HTTP: discovery metadata, the OAuth flow with PKCE through Clerk for user A, `tools/list`, and every tool with a real call and its read-back. Both protocol revisions the server claims to support.
24. Scope enforcement: a token with only read scopes is refused on a write tool.
25. A token for the API resource is refused by the MCP endpoint, and the reverse.
26. Rate limits trigger and recover.
27. If a real client is available in this environment (Claude Code via `claude mcp add --transport http`), connect it and have it run `get_day` and `quick_add`; record the transcript.

### REST API and CLI

28. Every `/api/v1` endpoint with an OAuth token and with a user API key: happy path, validation error, another user's id, missing scope.
29. CLI: `login` through the browser with PKCE and the loopback redirect, token stored in the OS keychain, `whoami`, `add`, `today`, `day`, `week`, `list` with each filter, `done` and `move` including the ambiguous-match exit code, `goals`, `logout`, `--json` on each, `KRIYAN_API_KEY` mode, and token refresh after expiry (shorten the lifetime or force a 401). Run from PowerShell and from Git Bash.
30. `npx` and `bunx` both run the built package from a local tarball (`npm pack`).

### Android (emulator)

31. Install the APK fresh; sign in with email; onboarding; every tab; quick add; task sheet edits; drag and resize on the timeline; swipe actions; goals; settings including area edit and delete account; offline then back online.
32. A change made on the web appears on the phone without a manual refresh, and the reverse.
33. Reminders: if push credentials are not configured, say so and test the scheduling side only (the job exists in Convex at the right time, and is cancelled when the task moves or completes). If they are configured, schedule one two minutes out and capture the notification.
34. Font scale 1.3 and the system back gesture on every screen.

### Backend and deployment

35. Every Convex function has an owner-isolation test; list any that do not and add them.
36. The Convex dev deployment's functions match the repository (`convex dev --once` reports no diff).
37. CI passes on GitHub for the current branch, or list what fails.
38. `bun audit`: clean, or each finding explained.

## Fixing

- Fix bugs that are clearly bugs and small in scope, each with a test that fails before and passes after.
- Do not change visual design, copy or layout; report those under "Design notes for the reviewer".
- Do not deploy to production, publish to npm, create releases, or merge branches.

## Report

`docs/reports/15-functional-qa.md`:

1. A summary table: area, tests run, passed, failed, blocked.
2. Every failure: steps to reproduce, expected, actual, severity (blocks launch, should fix, minor), and whether you fixed it (with the test name).
3. Everything blocked, and exactly what would unblock it.
4. What needs the owner (for example Clerk production, push credentials, npm token), one line each.
5. Confirmation that all test users and their data were removed.

Leave code changes uncommitted.
