---
name: test-kriyan
description: Test any part of Kriyan end to end with real Clerk test accounts. Use when you need to sign in as a user, seed or reset planner data, drive the web app, the Android app, the MCP server, the REST API or the CLI as a real user, or clean up test users. Covers creating disposable +clerk_test accounts, the fixed 424242 code, Playwright sessions, service-signed seeding, OAuth tokens for MCP and API, and cleanup.
license: MIT
metadata:
  scope: development instance only
---

# Test Kriyan end to end

Everything in Kriyan needs a signed-in user. Clerk's development instance lets you make real accounts that sign in without email: any address ending in `+clerk_test@example.com` accepts the verification code `424242`, and users created through the Backend API can also be given a password. This skill gives you one way to create such accounts, sign them in on every surface, seed their planner, and remove them.

## Rules

- Development instance only. The keys in `apps/web/.env.local` must start with `pk_test_` and `sk_test_`. Never run these scripts with production keys.
- Name accounts `kriyan-<purpose>-<timestamp>+clerk_test@example.com` so they can be found and pruned.
- Delete every account you create when you finish (`user.mjs delete`), then run `user.mjs list` and confirm only the two long-lived fixtures remain: `kriyan-03a+clerk_test@example.com` and `kriyan+clerk_test@example.com`. Development instances are capped at 100 users.
- Never print secrets, tokens, API keys or env file contents. Scripts print ids, emails and file paths only, unless `--reveal` is passed for a one-time secret you must use immediately.
- One dev server per worktree, on its own port. Pass `--base http://localhost:<port>` to every script; never assume 3000.
- Clerk rate limits on a dev instance: 100 Backend API requests per 10 seconds, and 5 sign-ins per 10 seconds per IP. Run sign-ins serially.

## Scripts

All scripts live in `.agents/skills/test-kriyan/scripts/` and run from the repository root with Node (not Bun; Playwright hangs under Bun on Windows):

```
node .agents/skills/test-kriyan/scripts/<script>.mjs ...
```

They read `apps/web/.env.local` themselves. Session files go to `.agents/test-kriyan/` (ignored by git).

| Script | What it does |
|---|---|
| `user.mjs create --tag <purpose> [--password]` | Creates a `+clerk_test` user (optionally with a password so the password strategy works) and prints `{ id, email }` and, with `--password`, the password once. |
| `user.mjs list` | Lists test users with age. |
| `user.mjs delete <id or email>` | Deletes the user and, first, every planner row they own (through the signed service functions), so nothing is orphaned in Convex. |
| `user.mjs prune --older-than 2h` | Deletes every `kriyan-*+clerk_test` user older than the given age, except the two fixtures. |
| `session.mjs <email> --base <url> [--ui] [--out <file>]` | Signs the user in with Playwright and saves a storage state file. Default: Clerk's testing helper (`clerk.signIn`), fastest. `--ui`: the real sign-in page, typing the email and the code `424242` (or the password with `--password`), with a testing token to pass bot detection. Use `--ui` when the sign-in UI itself is under test. |
| `token.mjs <email> --base <url> [--out <file> \| --reveal]` | Gets a short-lived Convex JWT for the user (template `convex`). Default output redacts it; `--out` saves it inside the ignored test directory for direct backend calls with `ConvexHttpClient.setAuth`. `--reveal` prints it once for immediate use. |
| `seed.mjs <email or id> sample` | Loads the prototype's sample data into that user's planner through the signed service functions (no browser). |
| `seed.mjs <email or id> reset` | Deletes every row the user owns. |
| `seed.mjs <email or id> fixture <name>` | Loads a named fixture from `scripts/fixtures/` (for example `empty-areas`, `overlapping-day`, `late-goal`, `dst-week`). |
| `apikey.mjs <email or id> --scopes tasks:read,tasks:write ... --reveal` | Creates a user API key (needs user API keys enabled in the Clerk dashboard) and prints the secret once. |
| `oauth.mjs <email> --resource mcp\|api --client <client id> --base <url> --reveal` | Runs the PKCE authorization flow against Clerk as that user with Playwright, approving the consent screen, and prints the access token once. Needs the OAuth scopes and application to exist in Clerk. |
| `mcp.mjs --token <token> --base <url> [--list] [--call <tool> <json>]` | A minimal Streamable HTTP MCP client for calling the server with a token from `oauth.mjs`. Also accepts `--token-file <file>` inside `.agents/test-kriyan/`; defaults to protocol `2026-07-28`, with `--protocol 2025-11-25` for the legacy stateless handshake. |
| `android.mjs signin <email> [--password <pw>]` | Signs the running emulator app in through its real sign-in screen with `adb` and UI Automator. The current native screen requires a password first, then `424242` if it asks for email verification. Waits up to 30 minutes for an unavailable or busy emulator; accepts `--serial` and `--wait-minutes`. Never starts an emulator or clears another session. |
| `doctor.mjs` | Checks keys are development keys, the Convex deployment matches the repository, the Clerk instance has the six planner scopes and user API keys enabled, and reports what is missing. |

Every script exits non-zero with a one-line reason on failure.

Fixtures replace the selected test user's planner. Date placeholders are resolved in the fixture's timezone (America/New_York); `--today YYYY-MM-DD` makes fixture checks reproducible. `empty-areas` contains areas with no planner records. The sample preserves the prototype's 25 tasks, optional lengths, completion states, seven projects, three goals and seven events.

On checkouts where a relative symlink is unavailable, `.claude/skills/test-kriyan` is a copy. Run `bun run skills:sync` after editing the skill; `bun run test` checks byte parity. Do not put credentials in either skill folder.

## Procedures

### Web app as a user

1. `node .agents/skills/test-kriyan/scripts/user.mjs create --tag web` → note the id and email.
2. `node .agents/skills/test-kriyan/scripts/seed.mjs <email> sample` if you need data, or skip for a brand-new account (onboarding will show).
3. `node .agents/skills/test-kriyan/scripts/session.mjs <email> --base http://localhost:3400` → storage state path.
4. Drive the app with Playwright using that `storageState`, or point the Playwright MCP / browser tools at the same base URL after loading the state.
5. `user.mjs delete <email>`.

### Backend directly

`token.mjs` gives a Convex JWT for `ConvexHttpClient.setAuth`; call public functions as that user. For owner isolation tests, create two users and try each one's ids from the other. For rules that do not need a real identity, use `convex-test` in `packages/backend`.

### MCP server

1. Run `doctor.mjs`. If the scopes or OAuth application are missing, stop and report the exact dashboard steps from `docs/setup/05-development-oauth.md`; do not try to work around it.
2. `oauth.mjs <email> --resource mcp --client <id> --base <url> --reveal` → access token.
3. `mcp.mjs --token <token> --base <url> --list`, then `--call get_day '{"date":"2026-10-01"}'` and so on. Read-backs should match what `token.mjs` plus a direct query shows.
4. For a real client, `claude mcp add --transport http kriyan <url>/mcp` and complete the browser sign-in with the test email and `424242`.

### REST API and CLI

- API with an OAuth token: `oauth.mjs --resource api`, then `curl -H "Authorization: Bearer <token>" <url>/api/v1/day?date=...`.
- API with a key: `apikey.mjs`, then `Authorization: Bearer <key>`.
- CLI, key mode: `KRIYAN_URL=<url> KRIYAN_API_KEY=<key> node packages/cli/dist/kriyan.js today`.
- CLI, browser login: run `kriyan login` with `BROWSER=none` so it prints the authorize URL, open that URL with Playwright as the test user (the same flow `oauth.mjs` uses), and let the loopback redirect complete. Run from both PowerShell and Git Bash on Windows.

### Android

1. Coordinate with the shared emulator owner and use the existing device. If an APK needs building, `scripts/build-android-local.ps1` requires an Android SDK inside `.agents/android-sdk`; install the APK only when the device is free. `apps/mobile/scripts/qa.ts` holds a disposable account for manual QA; it does not start an emulator.
2. `user.mjs create --tag android --password`, then `android.mjs signin <email> --password <pw>`.
3. Drive the app with `adb` and UI Automator dumps; capture with `adb exec-out screencap -p`.
4. Cross-surface check: add a task with `seed.mjs` or the web session, confirm it appears on the phone without a restart.
5. `user.mjs delete <email>`.

### Cleanup

Always finish with `user.mjs prune --older-than 0m --tag <your tag>` or explicit deletes, then `user.mjs list`. If another session owns active test accounts, leave those accounts alone and report them; verify every account created by your session was removed.

## What still needs a person

The Clerk dashboard has no API for two settings the MCP server, API and CLI depend on: custom OAuth scopes (`tasks:read`, `tasks:write`, `spaces:read`, `spaces:write`, `goals:read`, `goals:write`) and enabling user API keys. `doctor.mjs` tells you whether they exist. If they do not, report it; everything else in this skill still works.
