# Brief 18: MCP, API and CLI auth with no Clerk dashboard work

Read `AGENTS.md`, `docs/PLAN.md` section 5, `docs/setup/05-development-oauth.md`, `apps/web/src/lib/operations/`, `apps/web/src/app/api/v1/auth-config/route.ts`, `apps/web/src/app/mcp/route.ts`, `packages/cli/src/`, `docs/site/mcp.md`, `docs/site/api.md` and `docs/site/cli.md`.

## The decision

The owner will not run a Clerk production instance, and the two dashboard-only settings the current design depends on (custom OAuth scopes and Clerk API keys) will not be set up. The product runs on the Clerk **development** instance in production. Every AI client, the API and the CLI must work with what the Clerk API alone can configure. Two changes make that true:

1. **No custom scopes.** A token that Clerk issued for the right resource (`.../mcp` or `.../api/v1`) grants the caller full access to their own planner, which is all the data there is. Remove the per-operation scope gating and the `INSUFFICIENT_SCOPE` path. Advertise only Clerk's standard scopes in OAuth metadata and requests: `openid profile email`, plus `offline_access` where refresh is needed (the CLI). Keep the `scopes` field on operation definitions only if it is used for documentation; otherwise delete it and the `Scope` type. Update the tests that assert scope refusal to assert resource-audience refusal instead (a token for the API resource is still refused by MCP, and the reverse).
2. **No Clerk API keys.** The CLI signs in through the browser (PKCE, loopback) and refreshes silently; that is the only CLI auth. Remove `KRIYAN_API_KEY` and `acceptsToken: "api_key"` from the code, docs and README, or keep API-key acceptance strictly optional behind a clearly documented "if your Clerk instance has API keys enabled" note; the default path must not mention it. Settings and docs must not promise API keys.

## Configuration

- A public OAuth application named "Kriyan CLI" now exists on the development instance (`redirect_uris` `http://127.0.0.1/callback`, PKCE required, consent on, scopes `openid profile email offline_access`). Its client id is in `CLERK_CLI_CLIENT_ID` in `apps/web/.env.local` and in Vercel. Read it from there; do not print it in reports or logs.
- Confirm with `clerk api /instance/oauth_application_settings --instance dev` that dynamic client registration, client metadata documents and the audience claim are on (they are). Do not change instance settings.
- Update `docs/setup/05-development-oauth.md` into a short "how Clerk is configured" page that lists what is set, that it was done through the CLI, and that no dashboard steps remain.

## Prove it end to end

Use the `test-kriyan` skill (`.agents/skills/test-kriyan/SKILL.md`; its scripts are being built by another session in `../kriyan-skill`; if `oauth.mjs` and `mcp.mjs` are not merged yet, write the minimal equivalent in your report's scratch folder, not in the skill):

1. MCP: as a `+clerk_test` user, complete dynamic client registration or CIMD, the PKCE flow and consent with Playwright, then `tools/list` and `get_overview`, `get_day`, `quick_add`, `complete_task` with real read-backs. Then the negative cases: a token for the API resource is refused by `/mcp`; an expired token is refused; a request with no token gets the protected-resource metadata challenge.
2. API: the same user's token for the API resource against `GET /api/v1/day`, `POST /api/v1/tasks/quick-add` and one refusal (another user's task id).
3. CLI: build it, run `kriyan login` with the loopback flow completed by Playwright as the test user, then `whoami`, `today`, `add`, `done`, `logout`, from PowerShell and from Git Bash. Force a refresh by shortening the token lifetime if the instance allows it, otherwise by deleting the access token from the store and confirming the refresh token recovers it.
4. Delete the test users afterwards.

Update `docs/site/mcp.md`, `docs/site/api.md`, `docs/site/cli.md`, the landing AI section snippets (they are read from `docs/site/mcp.md`) and `docs/PLAN.md` section 5 and 13 (no Clerk production instance; the development instance is the production identity provider, with its limits: 100 users, Clerk's development banner on its hosted pages). Write `docs/reports/18-auth.md` with the real transcripts. Typecheck, lint, tests, build and e2e green. Do not commit.
