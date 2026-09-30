# Brief 05 REST OAuth resource review fix

Completed the scoped implementation on top of supervisor commit `286e27c`. Changes remain uncommitted in the services worktree. No backend functions, Goals/settings/onboarding UI, Android code, cloud settings, identities, keys, commits, deployments or publishing were changed by this follow-up. The existing supervising agent reviewed the code and official setup schema and found no remaining blocker in the fix.

## Changes

- Added `apps/web/src/lib/operations/oauth.ts`: the pinned installed `@clerk/backend@3.21.0` verifies the actual bearer through `idPOAuthAccessToken.verify(token, { audience })`. Missing/wrong audience, revoked/expired tokens and non-user subjects are rejected. Identity and scopes come from that verification, rather than middleware OAuth claims.
- Updated REST `http.ts` to require the exact canonical `/api/v1` resource for OAuth. Clerk-authenticated, correctly scoped user API keys retain their separate path without an OAuth audience requirement. Organization keys are rejected.
- Added `/.well-known/oauth-protected-resource/api/v1` and REST authentication/scope challenges pointing to it. Public `auth-config` includes `resource`.
- Reused the configured public origin for both REST and MCP. `MCP_PUBLIC_ORIGIN` retains its existing name and validation. Production defaults to the established app origin and ignores internal proxy URLs and forwarded headers. MCP continues to verify the exact `/mcp` resource; REST tokens cannot substitute for MCP tokens.
- Updated CLI authorization, code exchange and refresh to send the same REST resource. Configuration must match `KRIYAN_URL`'s origin plus exactly `/api/v1`; altered origins, paths, trailing slash or query are rejected. Stored credentials retain resource binding, and refresh cannot switch a previously bound resource. Legacy credentials without the field can refresh into the new binding.
- Updated `docs/api.md`, `docs/mcp.md`, CLI README and the original Brief 05 report. Added [development setup payloads](../setup/05-development-oauth.md).

No package upgrade was necessary: the reviewed baseline already pins the newer direct Clerk backend dependency. Its installed SDK implementation and types were inspected; the older backend nested under Next.js does not provide the same audience option. The implementation deliberately imports the pinned direct SDK.

## Offline evidence

Web tests exercise OAuth using the actual bearer, exact REST audience and verified user/scopes, regardless of middleware's asserted identity/scopes. They reject absent audience, MCP audience, invalid subjects, revoked/expired tokens, provider errors and missing bearer. User API-key success and scope denial remain covered, with no OAuth verification call on that path. Existing MCP tests retain exact `/mcp` validation. Canonical-origin tests use an internal request URL and hostile forwarded headers and confirm public REST configuration/challenges and MCP audience/challenges.

A separate test runs the **actual installed Clerk SDK**, with only its BAPI fetch transport replaced. It checks the token-verification POST and rejects missing or MCP audience in genuine SDK response mapping. This is offline contract evidence, not a live Clerk authentication pass.

CLI tests check PKCE authorization plus code exchange resource, refresh form/resource persistence, rejection of mismatched configuration and stored resource, and prevention of caller resource overrides. Final unit tests use fake HTTP and do not make network requests.

## Commands and real results

Commands were run from the worktree root unless a different directory is stated. All final gates below exited 0.

| Command | Real output/result |
| --- | --- |
| `bun run --filter @kriyan/web typegen` | Route types generated successfully |
| `bun run --filter @kriyan/web typecheck` | `@kriyan/web typecheck: Exited with code 0` |
| `bun run --filter @kriyan/web lint` | Exited with code 0 |
| `bun run --filter @kriyan/web test` | `Test Files 2 passed (2)`; `Tests 20 passed (20)`; duration `4.73s` |
| `bun run typecheck` in `packages/cli` | `$ tsc --noEmit`; exit 0 |
| `bun run lint` in `packages/cli` | `$ eslint src tsdown.config.ts`; exit 0 |
| `bun run test` in `packages/cli` | `41 pass`, `0 fail`, `142 expect() calls`; 2 files; `663ms` |
| `bun run build` in `packages/cli` | tsdown `0.23.0`, Rolldown `1.2.11`; one ESM file; `37.73 kB`, gzip `11.45 kB`; `103ms` |
| `node dist/kriyan.js --help` in `packages/cli` | Printed Kriyan CLI usage and all commands; exit 0 |
| `npm pack --ignore-scripts --pack-destination ../../.data/brief05-audience` in `packages/cli` | `kriyan-0.1.0.tgz`; 3 files; package `14.9 kB`, unpacked `45.9 kB`; exit 0 |
| `npx --yes --package=C:/Users/kaust/Documents/Codex/2026-09-29/ge/work/kriyan-services/.data/brief05-audience/kriyan-0.1.0.tgz kriyan --help` | Printed Kriyan CLI usage and all commands; exit 0 |
| `bunx --package C:/Users/kaust/Documents/Codex/2026-09-29/ge/work/kriyan-services/.data/brief05-audience/kriyan-0.1.0.tgz kriyan --help` | Printed Kriyan CLI usage and all commands; exit 0 |
| `git diff --check` | No output; exit 0 |

Final bundle is 37,730 bytes; local tarball is 14,922 bytes. `npm pack` was only a local packaging check, with scripts disabled after the Bun bundle build. It did not publish or add another package-manager lockfile to the worktree. Raw final web test output and temporary package/schema artifacts are under ignored `.data/brief05-audience/`.

Production builds, Android builds, root-wide verification and new live identities were intentionally skipped under the narrower follow-up instruction. This report does not reuse the prior production build as evidence for these changes.

### Failures encountered and resolved

- The first two runs of the new installed-SDK test failed its positive case: expected a matching object but received `undefined`. The fake BAPI response used `object: "oauth_access_token"`, which selects a different SDK resource mapper. Inspection of the installed SDK established the correct IdP discriminator, `clerk_idp_oauth_access_token`. Correcting the offline fixture made the positive and negative cases pass; production verification was not weakened.
- An attempted Python schema parse failed with `ModuleNotFoundError: No module named 'yaml'`. Used the already installed `js-yaml` through Bun instead; no dependency was added.
- A diagnostic Bun probe imported Clerk before replacing fetch, so the SDK captured the original transport and the dummy fixture verification returned `ClerkAPIResponseError: Unauthorized`. This was not a real user/provider login or a live integration pass. Final tests install the fake transport before importing Clerk and use no live credentials or token values in their assertions/output.

## Current official setup findings

Reviewed Clerk's current token-verification documentation, MCP authorization/resource binding specification, Clerk's official BAPI OpenAPI document `2026-05-12.yml`, Platform API schema and read-only linked `clerk config schema --instance dev`. Exact source links and non-secret request examples are in the [setup guide](../setup/05-development-oauth.md).

The supported settings endpoint is `PATCH /instance/oauth_application_settings`. Verified fields include `dynamic_oauth_client_registration`, `client_id_metadata_documents_advertised`, `aud_claim_enabled` and `default_scopes`. **`offline_access` is rejected in default scopes**, as are unknown/duplicate keys. Clients request refresh access explicitly. The original Brief 05 report's default-scope recommendation has been corrected.

`POST /oauth_applications` supports `public: true`, loopback `redirect_uris`, `pkce_required: true`, `consent_screen_enabled: true` and a space-delimited `scopes` string. `POST /api_keys` supports a user `subject`, scope array and `seconds_until_expiration` once User API keys are enabled. Complete creation responses may contain secrets and must not be logged.

No verified public custom-scope catalog creation payload or User API-key feature-enablement payload was found in the official schemas/CLI catalog. The guide documents the official dashboard steps instead of inventing an API field.

## Remaining configuration and live-validation blockers

These requirements belong to the supervisor. No settings were mutated or live identity created here. The earlier empty OAuth-app list and disabled API-key state are historical snapshots, not freshly verified current state.

1. Create and advertise the six `tasks`, `spaces`, `goals` read/write custom scope keys and assign permitted applications. Scope advertisement alone is not assignment.
2. Enable resource-derived audience claims with `aud_claim_enabled: true`; retain DCR and advertise CIMD. Set custom `default_scopes` without `offline_access` after those keys exist.
3. Create or reuse the public Kriyan CLI application, enable consent and required PKCE, allow the loopback callback and six scopes plus explicit `offline_access`. Configure the web server's public `CLERK_CLI_CLIENT_ID`.
4. Enable User API keys in the documented dashboard flow for script/CI checks. Organization API keys remain unsupported.
5. Configure `MCP_PUBLIC_ORIGIN` to the actual public development origin when it differs from the default, and use that origin as CLI `KRIYAN_URL`. Both audiences are exact public URLs, separately ending `/api/v1` and `/mcp`.
6. After configuration and deployment of required backend functions, complete real CLI login/REST access/refresh, cross-resource rejection in both directions and user-key checks with an isolated disposable identity, then clean up its keys and records.

**Live OAuth/API-key validation remains blocked on supervisor configuration; no live pass is claimed.** The scoped code, offline tests and local CLI package are ready for review. The worker made no deployment to make undeployed backend functions available.
