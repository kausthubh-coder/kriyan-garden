# Brief 16: build the `test-kriyan` skill scripts

Read `AGENTS.md` and `.agents/skills/test-kriyan/SKILL.md`. The skill document is written; your job is to implement every script it lists, make each one work against the real development Clerk instance and Convex deployment, and prove it. Read Clerk's testing docs first: `https://clerk.com/docs/guides/development/testing/test-emails-and-phones`, `https://clerk.com/docs/guides/development/testing/playwright/test-helpers`, and the Backend API reference for users, testing tokens and API keys.

## Where things go

- Scripts: `.agents/skills/test-kriyan/scripts/*.mjs`, plain Node ESM, run from the repository root, importing `@playwright/test`, `@clerk/backend`, `@clerk/testing/playwright` and `convex/browser` from the repository's `node_modules`. No Bun-only APIs.
- Shared helpers in `scripts/lib/` (env loading from `apps/web/.env.local` with a guard that keys are `pk_test_`/`sk_test_`, the service-signing envelope reused from `apps/web/src/lib/service-client.ts` logic, Playwright launch with `channel: "chrome"`, output helpers that never print secrets).
- Fixtures in `scripts/fixtures/*.json`: `sample` (the prototype seed, dated relative to today), `empty-areas`, `overlapping-day` (three tasks that overlap and one across the day's end hour), `late-goal` (a goal whose target date has passed), `dst-week` (tasks and reminders around the next DST change for America/New_York), `long-titles` (titles at the 180-character limit, an area name at 48).
- Session files and logs in `.agents/test-kriyan/`, and add that path to `.gitignore`.
- Make `.claude/skills/test-kriyan` available to Claude Code: try a relative symlink to `../../.agents/skills/test-kriyan`; if symlinks cannot be created on this Windows checkout, copy the folder and add `bun run skills:sync` (a small script) plus a unit test that the two copies are identical.
- Update `apps/web/e2e/auth.setup.ts`, `apps/web/e2e/auth.teardown.ts`, `apps/web/scripts/capture-onboarding-settings.ts` and `apps/mobile/scripts/qa.ts` to use the skill's `lib` for creating, seeding and deleting users, so there is one implementation. Keep their behaviour.

## Requirements per script

- `user.mjs`: `create` sets a password only with `--password` (generate a strong one; print it once); `delete` first runs the owner's data removal through the signed service call for reset, then deletes the Clerk user; `list` shows id, email, created age, and marks the two fixtures; `prune` respects `--older-than` and `--tag`, never touches the fixtures, and prints what it deleted.
- `session.mjs`: default path uses `clerkSetup` and `clerk.signIn`; `--ui` path opens `/sign-in`, uses `setupClerkTestingToken`, types the email, chooses the email-code strategy and enters `424242` (or the password with `--password`), waits for `/app`, and saves `storageState`. Both paths must work; the `--ui` path proves the real sign-in page works.
- `token.mjs`: signs in with the fast path and prints the `convex` template JWT from `window.Clerk.session.getToken`.
- `seed.mjs`: no browser. Uses the signed service functions (`service.*` actions with the HMAC envelope and `SERVICE_SECRET`) to create areas, projects, events, goals, milestones and tasks for the owner from a fixture, and `reset` to remove everything. If a fixture needs a function the service layer lacks, add the service action in `packages/backend` with the same validation as the public one and a test.
- `apikey.mjs`: uses `clerkClient.apiKeys.create` with `subject` = the user id; exits with a clear message if API keys are not enabled.
- `oauth.mjs`: builds a PKCE authorization URL for the given client id, resource (`https://<base>/mcp` or `https://<base>/api/v1`, taken from the app's auth-config endpoint) and scopes; opens it with Playwright as the test user (testing token plus the `--ui` sign-in), clicks the consent approval, catches the redirect to `http://127.0.0.1:<port>/callback` on a loopback listener the script starts, exchanges the code, and prints the access token once with `--reveal`. Exits with a clear message when scopes or the application are missing.
- `mcp.mjs`: speaks the Streamable HTTP transport the server implements (read `apps/web/src/app/mcp/route.ts` and the MCP SDK version in use), sends the right protocol headers, lists tools and calls one with JSON arguments, printing the result.
- `android.mjs`: finds the running emulator with `adb devices`, launches the app, and drives the sign-in screen with `adb shell input` and `uiautomator dump`, entering the email and then the code `424242` or the password. Prints the final screen's visible text as proof.
- `doctor.mjs`: checks key prefixes, `bunx convex dev --once --dry-run` or an equivalent no-diff check, the Clerk instance's OAuth settings and scopes via `clerk api` (the CLI is linked from `apps/web`), and whether API keys are enabled (attempt a create with a disposable user and clean up, or read the setting if the API exposes it). Prints a table of pass/fail with the exact fix for each fail.

## Prove it

Run each script for real and paste the actual output (with secrets redacted by the script itself) into `docs/reports/16-test-kriyan-skill.md`:

1. `user.mjs create --tag proof --password`, `session.mjs --ui`, `token.mjs`, `seed.mjs sample`, a direct Convex query with that token showing the seeded tasks, `seed.mjs reset`, `user.mjs delete`, `user.mjs list`.
2. `doctor.mjs` output.
3. `oauth.mjs` and `mcp.mjs`: if `doctor.mjs` shows the scopes and application are missing, show that they fail with the intended message; do not stub them.
4. `android.mjs signin` on the emulator with a real test user, then delete the user.
5. `bun run typecheck`, `lint`, `test`, `build`, and the web e2e suite, all green with the shared lib in place.

Leave changes uncommitted.
