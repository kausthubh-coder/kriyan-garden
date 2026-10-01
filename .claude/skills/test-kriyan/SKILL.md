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
| `oauth.mjs <email> --resource mcp\|api --base <url> [--register] [--refresh] [--out <file>]` | Runs real sign-in, PKCE and consent. Uses the configured CLI client by default; `--register` creates a disposable dynamic client. Requests `openid profile email`, adding `offline_access` only with `--refresh`. Saves private token files without printing credentials. |
| `mcp.mjs --token <token> --base <url> [--list] [--call <tool> <json>]` | A minimal Streamable HTTP MCP client for calling the server with a token from `oauth.mjs`. Also accepts `--token-file <file>` inside `.agents/test-kriyan/`; defaults to protocol `2026-07-28`, with `--protocol 2025-11-25` for the legacy stateless handshake. |
| `android.mjs signin <email> [--password <pw>]` | Signs the running emulator app in through its real email-code screen with `adb` and UI Automator, using `424242`. Older password-first APKs also accept `--password`. Waits up to 30 minutes for an unavailable or busy emulator; accepts `--serial` and `--wait-minutes`. Never starts an emulator or clears another session. |
| `doctor.mjs` | Checks development keys, matching Convex deployment, dynamic registration, client metadata documents, audience claims and the public Kriyan CLI application with PKCE, consent and the loopback redirect. |

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

1. Run `doctor.mjs`. All checks must pass. Fix missing configuration through the Clerk CLI using `docs/setup/05-development-oauth.md`.
2. Create a password test user with `user.mjs create --tag mcp --password`, then run `oauth.mjs <email> --password <pw> --resource mcp --register --base http://localhost:3400 --out mcp.json`. This tests dynamic registration, real sign-in, S256 PKCE and consent. The standard scopes grant access to that user's planner for the exact `/mcp` resource.
3. `mcp.mjs --token-file mcp.json --base http://localhost:3400 --list`, then call `get_overview`, `get_day`, `quick_add` and `complete_task`. Read back the stored result after each write. The MCP script accepts a token file containing `accessToken`.
4. Test an API-resource token against MCP and an MCP-resource token against API. Each must get 401. No token must get the protected-resource metadata challenge. Verify expiration with a real Clerk-verified token and a controlled resource-server clock advance, without changing Clerk settings.
5. Delete any dynamically registered test OAuth application and every test user when finished. Use the Clerk Backend API application's ID, never the long-lived Kriyan CLI application's ID.

### REST API and CLI

1. Create a password test user, then `oauth.mjs <email> --password <pw> --resource api --base http://localhost:3400 --out api.json` obtains a resource-bound token for `/api/v1`. Load its `accessToken` from the private file into the request's Bearer header. Do not print it.
2. Read `/api/v1/day`, quick-add a task and try another test user's task ID. Reads and writes share the same owner-isolated backend as MCP.
3. Build with `bun run --filter kriyan build`. Set `KRIYAN_URL` to the test origin and `BROWSER=none`, then run `node packages/cli/dist/kriyan.js login`. Capture the authorize URL privately and complete its real sign-in and consent with Playwright. The CLI listens on an ephemeral `127.0.0.1` loopback port.
4. Run `whoami`, `today`, `add`, `done` and `logout` from PowerShell and Git Bash. Tokens go into the OS keychain, with a protected file fallback. Test refresh by removing only the access token from the saved credential while keeping its refresh token, client ID and resource. The next command must recover and save a new access token without another browser sign-in.
5. Logout and delete the test users. Browser login and silent refresh are the only CLI authentication path.

### Android

1. Coordinate with the shared emulator owner and use the existing device. If an APK needs building, `scripts/build-android-local.ps1` requires an Android SDK inside `.agents/android-sdk`; install the APK only when the device is free. `apps/mobile/scripts/qa.ts` holds a disposable account for manual QA; it does not start an emulator.
2. `user.mjs create --tag android`, then `android.mjs signin <email>`. For an older password-first APK, create with `--password` and pass `--password <pw>`.
3. Drive the app with `adb` and UI Automator dumps; capture with `adb exec-out screencap -p`.
4. Cross-surface check: add a task with `seed.mjs` or the web session, confirm it appears on the phone without a restart.
5. `user.mjs delete <email>`.

### Cleanup

Always finish with `user.mjs prune --older-than 0m --tag <your tag>` or explicit deletes, then `user.mjs list`. If another session owns active test accounts, leave those accounts alone and report them; verify every account created by your session was removed.

## Nothing needs the Clerk dashboard

The development instance is the hosted product's identity provider. Dynamic client registration, client metadata documents and resource audience claims were enabled through `clerk api /instance/oauth_application_settings --instance dev`. The public Kriyan CLI application was created through `clerk api /oauth_applications --instance dev` with S256 PKCE, consent, the loopback callback and `openid profile email offline_access`. Its client ID is configured in the web environment and Vercel and is never printed by this skill.

MCP and API tokens for the correct resource grant access only to the verified user's own planner. There are no custom OAuth scopes or user API keys to configure. `doctor.mjs` checks the configuration without changing it. Clerk development limits still apply: 100 users and a development banner on its hosted pages.
