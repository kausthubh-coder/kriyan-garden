# Brief 05: MCP, API and CLI

Date: 29 September 2026. Worktree: `C:/Users/kaust/Documents/Codex/2026-09-29/ge/work/kriyan-services`. Base: `09542a0f6e5ed79e0d6a212dbbcf9f8d9a74ca80`.

**Implementation and offline verification: PASS. Live authenticated integration: BLOCKED.** All work remains uncommitted for supervisor review. No deployment, npm publish, commit, push or cloud-setting change was performed. Goals/settings/onboarding UI components were not touched. The only live mutations were disposable development identities/sessions, followed by cleanup. The owner's account and planner data were not mutated.

## Changes

| Files | Result |
| --- | --- |
| `apps/web/src/lib/operations/` | Shared strict schemas and operations for every MCP tool and REST route; local-calendar handling, name/path resolution, ambiguity candidates, patch/null semantics, optional task length, stored read-back and sanitized errors |
| `apps/web/src/app/mcp/route.ts` | All 21 tools over both protocol revisions; Clerk user OAuth, resource audience validation, per-tool scopes, HTTP 403 step-up, Origin checks and CORS |
| `apps/web/src/app/.well-known/oauth-protected-resource/mcp/route.ts` | Public metadata for the exact `/mcp` resource and all six scopes |
| `apps/web/src/app/api/v1/` | Every requested endpoint plus public CLI auth-config; Clerk OAuth/API-key auth and shared operations |
| `apps/web/src/lib/service-client.ts` | Optional signed invocation grouping, preserved old call compatibility and disabled credential-bearing SDK error logs |
| `packages/backend/convex/{service,serviceAuth,serviceInternal,validators,schema}.ts` | Shared rate limits, replay checks, owner-isolated invocation claims, filtered task service, planner context, actual next occurrence and atomic number-goal progress |
| `packages/backend/convex/model/{tasks,goals}.ts` | Filter before limiting; owner checks; shared reminder rules; recurrence read-back; atomic progress preserving target/unit |
| `packages/backend/convex/convex.config.ts`, generated API types and package | Rate-limiter component installed and registered |
| Web/backend tests and `apps/web/vitest.config.mts` | Offline transport, auth, calendar, owner, replay, rate, recurrence and filter coverage |
| `packages/cli/` | All requested commands, `--json`, output/exit codes, PKCE loopback login, refresh, OS keyring, protected fallback, shared date parser, tests, README and one ESM executable |
| `.github/workflows/release.yml` | Future `cli-v*` tag release with version check, CLI verification and `NPM_TOKEN`; not executed |
| Web package, `bun.lock`, public configuration placeholders | Compatible pinned MCP packages and direct audience-aware Clerk backend SDK |
| `docs/mcp.md`, `docs/api.md` | Protocol findings, scopes, complete tool/API contracts and current client setup |
| `.agents/scripts/05-{live,config}-check.ts` | Reproducible disposable live checks and read-only linked configuration checks; credentials remain in memory |

Areas are read-only over MCP, and there are no delete tools. Existing service exports remain available. Each external operation consumes one read or write slot even when it calls several backend functions. Group IDs are generated on the server, signed, owner-bound and expire after five minutes; a read group cannot authorize a write. Limits are 60 reads and 30 writes per user per fixed minute.

Task lengths remain nullable and are never inferred. Complete reports the actual next occurrence created by the backend. Atomic goal progress updates only `metric.current`; it cannot overwrite a concurrent target/unit update. The CLI searches completed tasks for `reopen`, so a previously completed task can be reopened; done/move search active tasks. Multiple matches or an unsafe 100-result match set exit 2 without writing.

## Package and protocol findings

Pinned versions: `mcp-handler@2.2.0`, `@modelcontextprotocol/server@2.2.0`, compatibility `@modelcontextprotocol/sdk@1.31.0`, `@clerk/mcp-tools@0.6.0`, direct runtime `@clerk/backend@3.21.0`, `@convex-dev/rate-limiter@0.4.0`. The installed Next.js integration retains its own older Clerk backend SDK; MCP explicitly uses the direct newer SDK for audience-aware verification. The older nested SDK does not support the audience option.

The actual handler/SDK offline tests pass initialization/discovery, tools/list, get_overview, quick_add and complete_task for both `2025-11-25` and `2026-07-28`, without sessions. The newer protocol uses the mandatory method/version/name headers and protocol/client metadata. Clerk MCP metadata helpers remain compatible. [docs/mcp.md](../mcp.md) links the official protocol/package sources and explains the transport difference.

## Required verification

All final commands below exited 0. Output excerpts retain real counts and messages. Full local logs are under the ignored `.data/brief05/` directory; they contain validation output, not credentials.

| Command | Result |
| --- | --- |
| `bun install` | PASS; dependencies installed, Bun lockfile only |
| `bun run typecheck` | PASS; route types plus core, backend, web and CLI |
| `bun run lint` | PASS; web and CLI checks |
| `bun run test` | PASS; 104 tests across eight files: core 27, CLI 37, backend 23, web 17 |
| `bun run build` | PASS; Next.js production build with every new API/MCP route |
| `cd packages/cli; bun run build; node dist/kriyan.js --help` | PASS; one 37,001-byte ESM file with Node shebang |
| Local packed package through npx and bunx | PASS; both help commands exit 0, no registry publish |
| `git diff --check` | PASS; no output |
| `bun .agents/scripts/05-live-check.ts` | Runner exits 0 with successful cleanup; authenticated functionality remains blocked as detailed below |
| `bun .agents/scripts/05-config-check.ts` | PASS; read-only settings, metadata and disposable identity cleanup |

Initial install output:

```text
bun install v1.3.14 (0d9b296a)
Resolved, downloaded and extracted [60]
Saved lockfile
10 packages installed [6.71s]
```

Final dependency refresh after promoting the Clerk SDK to runtime:

```text
bun install v1.3.14 (0d9b296a)
Saved lockfile
Checked 515 installs across 644 packages (no changes) [732.00ms]
```

### Typecheck, lint and test output

```text
$ bun run --filter @kriyan/web typegen && bun run --filter '*' typecheck
@kriyan/web typegen: Generating route types...
@kriyan/web typegen: ✓ Types generated successfully
@kriyan/web typegen: Exited with code 0
@kriyan/core typecheck: Exited with code 0
kriyan typecheck: Exited with code 0
@kriyan/backend typecheck: Exited with code 0
@kriyan/web typecheck: Exited with code 0

$ bun run --filter '*' lint
kriyan lint: Exited with code 0
@kriyan/web lint: Exited with code 0

@kriyan/core test:  27 pass
@kriyan/core test:  0 fail
@kriyan/core test:  47 expect() calls
@kriyan/core test: Ran 27 tests across 3 files. [481.00ms]
@kriyan/core test: Exited with code 0
kriyan test:  37 pass
kriyan test:  0 fail
kriyan test:  118 expect() calls
kriyan test: Ran 37 tests across 2 files. [971.00ms]
kriyan test: Exited with code 0
@kriyan/backend test:  Test Files  2 passed (2)
@kriyan/backend test:       Tests  23 passed (23)
@kriyan/backend test: Exited with code 0
@kriyan/web test:  Test Files  1 passed (1)
@kriyan/web test:       Tests  17 passed (17)
@kriyan/web test: Exited with code 0
```

### Production build output

```text
$ bun run --filter @kriyan/web build
@kriyan/web build: ▲ Next.js 16.3.3 (Turbopack)
@kriyan/web build: - Environments: .env.local
@kriyan/web build: ✓ Running next.config.ts took 42ms
@kriyan/web build:
@kriyan/web build:   Creating an optimized production build ...
@kriyan/web build: ✓ Compiled successfully in 10.5s
@kriyan/web build:   Running TypeScript ...
@kriyan/web build:   Finished TypeScript in 7.1s ...
@kriyan/web build:   Collecting page data using 15 workers ...
@kriyan/web build:   Generating static pages using 15 workers (0/19) ...
@kriyan/web build:   Generating static pages using 15 workers (4/19)
@kriyan/web build:   Generating static pages using 15 workers (9/19)
@kriyan/web build:   Generating static pages using 15 workers (14/19)
@kriyan/web build: ✓ Generating static pages using 15 workers (19/19) in 559ms
@kriyan/web build:   Finalizing page optimization ...
@kriyan/web build:
@kriyan/web build: Route (app)
@kriyan/web build: ┌ ○ /
@kriyan/web build: ├ ○ /_not-found
@kriyan/web build: ├ ƒ /.well-known/oauth-authorization-server
@kriyan/web build: ├ ƒ /.well-known/oauth-protected-resource/mcp
@kriyan/web build: ├ ƒ /api/v1/auth-config
@kriyan/web build: ├ ƒ /api/v1/day
@kriyan/web build: ├ ƒ /api/v1/goals
@kriyan/web build: ├ ƒ /api/v1/goals/[id]
@kriyan/web build: ├ ƒ /api/v1/me
@kriyan/web build: ├ ƒ /api/v1/overview
@kriyan/web build: ├ ƒ /api/v1/spaces
@kriyan/web build: ├ ƒ /api/v1/tasks
@kriyan/web build: ├ ƒ /api/v1/tasks/[id]
@kriyan/web build: ├ ƒ /api/v1/tasks/[id]/complete
@kriyan/web build: ├ ƒ /api/v1/tasks/[id]/move
@kriyan/web build: ├ ƒ /api/v1/tasks/quick-add
@kriyan/web build: ├ ƒ /api/v1/week
@kriyan/web build: ├ ƒ /app
@kriyan/web build: ├ ƒ /app/settings
@kriyan/web build: ├ ƒ /app/welcome
@kriyan/web build: ├ ƒ /mcp
@kriyan/web build: ├ ƒ /sign-in/[[...sign-in]]
@kriyan/web build: └ ƒ /sign-up/[[...sign-up]]
@kriyan/web build:
@kriyan/web build:
@kriyan/web build: ƒ Proxy (Middleware)
@kriyan/web build:
@kriyan/web build: ○  (Static)   prerendered as static content
@kriyan/web build: ƒ  (Dynamic)  server-rendered on demand
@kriyan/web build:
@kriyan/web build: Exited with code 0
```

### CLI build and help output

```text
$ tsdown
ℹ tsdown v0.23.0 powered by rolldown v1.2.11
ℹ entry: src/kriyan.ts
ℹ target: node22
ℹ dist\kriyan.js  37.00 kB │ gzip: 11.28 kB
ℹ 1 files, total: 37.00 kB
✔ Build complete in 105ms
Kriyan CLI

Usage: kriyan <command> [--json]

  login                              Sign in through your browser
  logout                             Clear saved credentials
  add "<text>"                       Add a task with quick add
  today                              Show today's plan
  day <YYYY-MM-DD>                    Show a day's plan
  week                               Show this week's load and deadlines
  list [--area <name>] [--project <name>]
       [--due today|week|overdue] [--all]
  done <id or text>                   Complete an active task
  reopen <id or text>                 Reopen a completed task
  move <id or text> <when>            Move an active task, e.g. tomorrow 3pm
  goals                              Show goals
  open                               Open the web app
  mcp                                Print AI client setup snippets
  whoami                             Show the signed-in account

Use quotes around task text or a task name containing spaces.
Every command supports --json. --help shows this help.
KRIYAN_URL defaults to https://app.kriyan.app.
Set KRIYAN_API_KEY for scripts and CI.
```

The local packed package contains package.json, README and the executable: 14.4 kB packed, 44.3 kB unpacked. Shared core code is bundled; the optional native keyring dependency is installed separately by the package manager. npm returned 404 for `kriyan` during the availability check, so the package uses `kriyan@0.1.0`. Availability must be rechecked before publication. No `npx kriyan` registry release is claimed.

Exact packed-package checks, with `packages/cli` as working directory; each exited 0:

```powershell
npm pack --ignore-scripts --pack-destination C:\Users\kaust\AppData\Local\Temp\kriyan-cli-final-pack-f4530828dda24c4f8ce7ca401a98ea94
npx --yes --package=C:/Users/kaust/AppData/Local/Temp/kriyan-cli-final-pack-f4530828dda24c4f8ce7ca401a98ea94/kriyan-0.1.0.tgz kriyan --help
bunx --package C:/Users/kaust/AppData/Local/Temp/kriyan-cli-final-pack-f4530828dda24c4f8ce7ca401a98ea94/kriyan-0.1.0.tgz kriyan --help
```

Pack stdout was `kriyan-0.1.0.tgz`; npm reported three files, 14.4 kB packed and 44.3 kB unpacked. Both executions printed the full help beginning `Kriyan CLI`; Bun also printed dependency-resolution messages.

Offline tests cover fake HTTP and keychain adapters, PKCE/state/callback rejection, public token exchange, refresh retry, device calendars, credential origin separation and fallback cleanup. The Windows fallback additionally applies a current-user-only NTFS directory ACL. Actual browser consent, OAuth exchange against a registered client and an actual OS keyring round trip are blocked or untested; fake adapter tests do not establish those passes.

### Failures encountered and resolved

- Initial web tests had three failures: a fixture expected 22 tools instead of the brief's 21, one malformed-input assertion expected the wrong shape, and the new protocol fixture omitted mandatory client-capability metadata. Corrected fixtures now exercise real list/read/write calls under both protocols.
- Initial TypeScript checks found test-helper typing and operation-result inference errors, plus an implicit callback parameter. Corrected strict types; no `any` or suppression was added.
- Two early production builds failed on generated `.next/dev/types/routes.d.ts` with `TS1109`/`TS1160`, and `.next/dev/types/validator.ts` with `TS1005`/`TS1002`/`TS1128`. A concurrently running Next dev/type generation process had corrupted those generated files. Stopped that server, removed only generated files, then ran type generation/build serially. The final build passed. The tracked Next type entrypoint was restored after dev validation.
- After the supervisor requested audience validation, the first implementation used Next's older nested Clerk SDK. Typecheck failed exactly with `src/lib/operations/mcp-auth.ts(13,75): error TS2554: Expected 1 arguments, but got 2.` and `(14,19): error TS2339: Property 'aud' does not exist on type 'IdPOAuthAccessToken'.` The fix uses the pinned direct runtime SDK; final typecheck and tests pass.
- An early disposable-session token request without a JSON body failed. Sending `{}` as required by the provider succeeded. Temporary records from all attempts were removed.
- `clerk config get` is not a supported command. `clerk config pull --instance dev --keys oauth_applications` failed with `unknown_config_key` and `Failed to fetch config (400): Unknown config key 'oauth_applications'`. OAuth settings were then inspected read-only through the linked CLI's Backend API.
- API-key creation still fails with `feature_not_enabled`, CLI auth-config still returns 503, and the new backend function is still absent. These are unresolved live configuration/deployment blockers, not test passes.

`bunx convex codegen --typecheck disable` generated bindings for the component. Its output included `Downloading current deployment state...` and `Uploading functions to Convex...` during code generation. This is an analysis upload, without the deployment activation step; the installed Convex CLI explicitly documents that codegen does not modify the running deployment. No `convex deploy` or `convex dev --once` was run. Live validation still reports the new `service:plannerContext` unavailable; code generation did not make these functions callable in the linked deployment.

## Live validation

Ran the web app on distinct port **3005** using `bun run --filter @kriyan/web dev --port 3005`; port 3000 was left alone. The test script created a random disposable `+clerk_test` dev user and a real active Clerk session. It kept the JWT in memory. A session token is deliberately rejected as an OAuth access token. No registered OAuth client exists, audience claims are disabled, and custom planner scopes are absent from authorization metadata, so no valid MCP OAuth token could be obtained without changing forbidden settings.

For each protocol the script attempted opening, tools/list, get_overview, quick_add and complete_task. All returned 401 before the tools ran. Because no task could be created, the completion probe has no invented task ID and is only an auth-rejection check. These responses do not establish a functional read/create/complete pass. The offline SDK tests cover that flow with a fake backend.

The attempted disposable user-owned API-key creation failed with `feature_not_enabled`. Therefore the requested three authenticated API endpoint checks could not run. The script is ready to check me, overview, day, tasks and spaces after keys/backend are enabled, and tests that a read-only key cannot write.

Actual safe runner responses:

```text
{"label":"Backend service precondition","ok":false,"missingFunction":true,"message":"Could not find public function for service:plannerContext. Backend changes have not been deployed."}
{"label":"API unauthenticated","status":401,"body":{"error":{"code":"UNAUTHENTICATED","message":"Sign in with kriyan login or supply a user API key."}},"challenge":"Bearer"}
{"label":"CLI login configuration","status":503,"body":{"error":{"code":"AUTH_NOT_CONFIGURED","message":"CLI login is not configured. Ask the administrator to register Kriyan CLI and set CLERK_CLI_CLIENT_ID."}},"challenge":null}
Clerk POST /api_keys failed: feature_not_enabled. No credential output was recorded.
{"label":"MCP 2025-11-25 initialize","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2025-11-25 tools/list","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2025-11-25 tools/call get_overview","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2025-11-25 tools/call quick_add","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2025-11-25 tools/call complete_task","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2026-07-28 server/discover","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2026-07-28 tools/list","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2026-07-28 tools/call get_overview","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2026-07-28 tools/call quick_add","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP 2026-07-28 tools/call complete_task","status":401,"body":{"error":"invalid_token","error_description":"No authorization provided"},"challenge":"Bearer error=\"invalid_token\", error_description=\"No authorization provided\", resource_metadata=\"http://localhost:3005/.well-known/oauth-protected-resource/mcp\""}
{"label":"MCP untrusted Origin","status":403,"body":{"error":{"code":"INVALID_ORIGIN","message":"This origin is not allowed to call Kriyan."}},"challenge":null}
{"label":"MCP protected resource metadata","status":200,"body":{"resource":"http://localhost:3005/mcp","authorization_servers":["https://aware-glowworm-503.clerk.accounts.dev"],"token_types_supported":["urn:ietf:params:oauth:token-type:access_token"],"token_introspection_endpoint":"https://aware-glowworm-503.clerk.accounts.dev/oauth/token","token_introspection_endpoint_auth_methods_supported":["client_secret_post","client_secret_basic"],"jwks_uri":"https://aware-glowworm-503.clerk.accounts.dev/.well-known/jwks.json","authorization_data_types_supported":["oauth_scope"],"authorization_data_locations_supported":["header","body"],"key_challenges_supported":[{"challenge_type":"urn:ietf:params:oauth:pkce:code_challenge","challenge_algs":["S256"]}],"service_documentation":"https://clerk.com/docs","scopes_supported":["tasks:read","tasks:write","spaces:read","spaces:write","goals:read","goals:write"],"resource_name":"Kriyan","resource_documentation":"https://app.kriyan.app/docs/mcp"},"challenge":null}
{"cleanup":[{"label":"Cleanup sessions","ok":true},{"label":"Cleanup users","ok":true}]}
```

An isolated CLI login check used a temporary credential store, returned exit 1, saved no credentials and made zero browser calls:

```json
{"error":{"code":"command_failed","message":"Browser login is not configured on this Kriyan server. Ask its owner to configure the Clerk CLI client."}}
```

Session revocation and user deletion succeeded. A final read-only query for the disposable test-user prefix returned **0 remaining identities**. No planner records were created because auth/backend prerequisites prevented writes. The local server was stopped after validation.

## Linked Clerk configuration and exact remaining settings

`clerk config pull --instance dev` ran from `apps/web`; provider payloads were parsed in memory, and only section names were emitted. Read-only `clerk api /instance/oauth_application_settings --instance dev`, `/oauth_applications`, and public authorization metadata returned:

```json
{"check":"OAuth settings","settings":{"dynamic_oauth_client_registration":true,"default_scopes":null,"oauth_jwt_access_tokens":false,"aud_claim_enabled":false,"pkce_required":false,"client_id_metadata_documents_advertised":false,"client_id_metadata_documents_only_allow_pre_registered_clients":false}}
{"check":"OAuth applications","total":0,"listed":0}
{"check":"Authorization metadata","scopes":["openid","profile","email","public_metadata","private_metadata","offline_access"],"cimd":false,"dcr":true}
{"check":"Disposable identity cleanup","remaining":0}
```

The public authorization metadata advertises only built-in scopes; it does not advertise any of the six planner scopes. No OAuth applications are registered. DCR is already on; CIMD support is off. Consent is enforced for DCR clients by Clerk; a new manually registered CLI application must also retain its consent screen.

The owner must complete these steps in the dev instance before live checks, and separately in the production instance before release. Production configuration was not inspected.

| Location | Exact required setting |
| --- | --- |
| Clerk **OAuth applications > Scopes** | Create `tasks:read`, `tasks:write`, `spaces:read`, `spaces:write`, `goals:read`, `goals:write`; advertise them in authorization metadata and assign them to allowed clients. Advertising alone does not grant an application access. |
| Clerk **OAuth applications > Settings > Client onboarding** | Enable **Publish CIMD support** (`client_id_metadata_documents_advertised=true`). Allow the intended CIMD clients under the existing client admission policy. |
| Same settings | Keep **Publish DCR support** on (`dynamic_oauth_client_registration=true`, already enabled), as required by this brief. |
| Same settings | Set **Default scopes for dynamic clients** to the six planner scopes; add `offline_access` when refresh is needed. Currently `default_scopes=null`; clients omitting scope would not receive planner permissions. |
| Clerk OAuth audience configuration | Enable audience claims (`aud_claim_enabled=true`, currently false). MCP authorization/token requests must bind the token to the exact public `/mcp` resource URL, such as `https://app.kriyan.app/mcp`. Tokens lacking that audience are rejected. If this switch is unavailable in the dashboard, ask Clerk to expose it for the linked instance; its current provider field is confirmed by the CLI. |
| Clerk **OAuth applications > Add application** | Create **Kriyan CLI**, enable **Public**, register redirect `http://127.0.0.1/callback`, enable **Require PKCE**, allow the six planner scopes plus `offline_access`, and keep the **Consent screen** enabled. No client secret is needed. Clerk accepts the OS-selected loopback port at runtime. |
| Web/Vercel environment configuration | Set `CLERK_CLI_CLIENT_ID` to that public CLI client ID. Authorization/token endpoints are discovered from Clerk using the existing publishable key, not a new hard-coded issuer. |
| Clerk **API keys > Enable API keys** | Select **Enable User API keys**, then **Enable**. User-owned test/script keys need the appropriate six scopes. Organization keys are rejected by this product. |
| Convex development deployment, later with owner authorization | Deploy the new service functions, schema, invocation table and registered rate-limiter component. The deployed backend currently lacks `service:plannerContext`. Keep the web/backend service secret aligned without exposing it. |
| Web self-hosted deployment | If the public origin differs from the default, set `MCP_PUBLIC_ORIGIN` to its HTTPS origin. Metadata, 401/403 challenges and audience verification all use it, avoiding internal proxy URLs. |
| Web browser-origin configuration | Set `MCP_ALLOWED_ORIGINS` only for exact additional browser origins actually needed. Native/cloud clients with no Origin do not need additions. |
| GitHub Actions repository secrets, before release | Add **NPM_TOKEN**. The future release tag must match the CLI package version, for example `cli-v0.1.0`. Recheck npm name availability first. |

Audience claims and the public client are required; switching opaque tokens to JWT is not required. The current opaque-token configuration is supported. Instance-wide PKCE is currently false; the requested CLI application's own **Require PKCE** must be true. No existing client settings were changed.

Official setup references: [Clerk OAuth settings and custom scopes](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth), [Clerk CLI loopback guidance](https://clerk.com/blog/adding-clerk-auth-to-your-cli), [user API-key enablement](https://clerk.com/docs/guides/development/machine-auth/api-keys), [MCP audience binding](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#token-audience-binding-and-validation).

## Supervisor review and remaining gates

Implementation/CLI delegation used the requested GPT-6.1 Sol at high reasoning. A separate supervising agent reviewed the backend, shared operations, auth and protocol code read-only. Findings addressed: atomic progress, one rate slot per compound operation, HTTP scope challenges, name/short-ID CLI matching, ID error sanitization, exact resource metadata, OAuth audience checks, canonical proxy-safe origins and correct runtime SDK selection. Its final review found no remaining code blocker and confirmed the docs distinguish offline and live validation.

Still blocked: valid live OAuth consent/token exchange and refresh, authenticated MCP read/create/complete, three user-API-key REST checks, and live rate-limit enforcement on the undeployed functions. Actual provider-client UI linking and native OS keyring operation remain unverified. Publishing/deploying/releasing are intentionally left to the owner. All requested implementation and possible checks are complete in the working tree.
