# Web hardening integration into v2

Integrated reviewed `codex/kriyan-hardening` at `792d75aab6878222f6f0844d72fabe6e4e65b87e` into the existing no-commit merge over v2 HEAD `edf36ae9ddf58b2716ec29cd4100dd85bea84765`. Work ran locally on 30 September 2026, America/New_York, using Bun 1.3.14. Only this checkout was edited. HEAD and MERGE_HEAD are unchanged, and the merge remains open for root review.

This is web integration verification. It does not complete brief 07 or the production hardening audit. Android integration and the full audit still follow.

## Changes

- Resolved the five conflicts in `apps/web/next.config.ts`, `apps/web/package.json`, `apps/web/src/proxy.ts`, `apps/web/vitest.config.mts` and `bun.lock`.
- Preserved the root `next/font/local` configuration, its `400 700` weight range, both local Schibsted font files and the font licence. Root layout and font assets have no diff from HEAD. Marketing, docs, legal, demo and download routes remain intact, with the app origin `https://app.kriyan.app`.
- Kept `hostRedirect`, including query strings, and the legacy `/garden` redirect before Clerk middleware selection. Public pages and the memory demo still bypass Clerk middleware. No root Clerk provider was introduced. Offline regressions exercise these bypasses and redirects; browser traffic checks were not repeated here.
- Combined enforced CSP with forwarded `x-nonce` and request CSP headers on app/sign-in/sign-up requests. Those layouts retain dynamic Clerk providers, request nonces and bundled `@clerk/ui` 1.37.0. Document responses use `private, no-store`. Tests assert fresh nonces, replacement of caller-supplied nonce headers, request/response policy equality and private cache headers.
- Narrowed same-origin embedding to the exact `/demo` route used by the landing iframe. Every other document keeps `DENY` and `frame-ancestors 'none'`. The demo exception retains the complete policy instead of replacing it with a framing-only policy. `next.config.ts`, `permitsPublicFrame`, unit regressions and the existing hardening browser assertions agree. Nested demo paths do not receive an embedding exception.
- Retained reviewed Account Profile/Security token styling, contrast fixes, focus rings, 44px controls, disabled/hover/active states and motion suppression. Loading retry and private recoverable error boundaries remain, and both DOM tests pass. Numeric contrast and geometry measurements are prior evidence in [07-web-hardening.md](07-web-hardening.md); they were not remeasured in this integration.
- Kept the signed Clerk account-deletion webhook and operation-bound backend cleanup. The cleanup tests now register the existing rate-limiter component because the integrated service verifier uses it. Tests cover signature/operation/owner binding, expiry, multiple local cleanup batches, another owner's data, fresh duplicate delivery and replay rejection. No hosted deletion or real owner data was used.
- Retained optional Sentry instrumentation, disabled initialization without a valid DSN, error-event reconstruction from an allowlist and the actual SDK transport privacy test. These tests use an in-memory transport rather than hosted ingestion.
- Preserved exact verified OAuth resource audiences, user API keys, PKCE CLI resource binding, service invocation budgets, read/write limits and global replay guards. `apps/web/src/lib/operations`, `packages/cli`, `serviceAuth.ts`, `serviceInternal.ts` and the existing reset model have no source diff from HEAD.

The deleted-owner tombstone, concurrent/stale-token behavior, comprehensive reset cleanup, service-invocation cleanup, scheduled reminder cancellation and push-token/component cleanup remain reserved for the full post-Android audit. The existing cleanup acceptance response does not establish that all later batches or future Android data have been removed.

## Test runners and collection

Root `bun run test` retains the quick-add documentation check and `bun run --sequential --filter '*' test`. Web `test:bun` explicitly collects the three existing Bun files. Web `test:services` runs Vitest with `--maxWorkers=1` and now collects both services files plus hardening and Account Settings. The existing script name is preserved even though that runner also covers hardening.

Vitest uses the Node environment for SDK/operation/hardening tests and the per-file `happy-dom` pragma for `AccountSettings.test.tsx`. Its include list excludes Bun-importing suites. Backend Vitest also retains `--maxWorkers=1`. No test suite was converted or removed.

Final root output reports **197 passed tests across all 16 intended unit files, zero failures and zero skips**. Runner file totals match the checkout inventory. Bun counts below come from per-file pass output. Vitest per-file declarations, including both MCP protocol cases, match its actual package totals.

| Runner | File | Passed tests |
| --- | --- | ---: |
| Bun | `packages/core/src/goals.test.ts` | 3 |
| Bun | `packages/core/src/planning.test.ts` | 2 |
| Bun | `packages/core/src/quickAdd.test.ts` | 75 |
| Vitest | `packages/backend/convex/__tests__/isolation.test.ts` | 3 |
| Vitest | `packages/backend/convex/__tests__/model.test.ts` | 18 |
| Vitest | `packages/backend/convex/__tests__/service.test.ts` | 7 |
| Vitest | `packages/backend/convex/__tests__/accountDeletion.test.ts` | 2 |
| Bun | `apps/web/src/lib/origins.test.ts` | 1 |
| Bun | `apps/web/src/components/app/goalSelection.test.ts` | 1 |
| Bun | `apps/web/src/components/demo/store.test.ts` | 11 |
| Vitest | `apps/web/src/lib/operations/operations.test.ts` | 19 |
| Vitest | `apps/web/src/lib/operations/oauth.test.ts` | 1 |
| Vitest | `apps/web/src/lib/hardening.test.ts` | 11 |
| Vitest, happy-dom | `apps/web/src/components/app/AccountSettings.test.tsx` | 2 |
| Bun | `packages/cli/src/cli.test.ts` | 36 |
| Bun | `packages/cli/src/credentials.test.ts` | 5 |
| Total | 16 files | 197 |

Actual final summaries were backend `Test Files 4 passed (4)`, `Tests 30 passed (30)`; core `80 pass`, `0 fail`, `100 expect() calls`, `Ran 80 tests across 3 files`; web Bun `13 pass`, `0 fail`, `122 expect() calls`, `Ran 13 tests across 3 files`; web Vitest `Test Files 4 passed (4)`, `Tests 33 passed (33)`; CLI `41 pass`, `0 fail`, `142 expect() calls`, `Ran 41 tests across 2 files`.

## Dependencies

Combined the incoming hardening dependency records with the existing services/CLI workspace manifests and reviewed pins, then regenerated the lockfile through Bun. Final lock contains 1184 packages. Removed obsolete nested Clerk shared 4.30.2 records under the updated Next.js/React SDK packages; otherwise they shadow the compatible shared types required by UI 1.37.0.

Verified preserved versions against HEAD: direct Clerk backend 3.21.0, MCP tools 0.6.0, MCP core/server 2.2.0, direct MCP SDK 1.31.0, MCP tools' nested SDK 1.30.0, mcp-handler 2.2.0, rate limiter 0.4.0, keyring 2.1.0, tsdown 0.23.0, Vitest 5.0.2 and sharp 0.35.4. Hardening's compatible Clerk Next.js 7.9.8, React SDK 6.17.3 and shared 4.37.0 remain with UI pinned to 1.37.0. Next stays 16.3.3, React/React DOM stay 19.2.3, and Sentry remains present. No npm, pnpm or yarn lockfile was added.

The independent report records two moderate audit exceptions in Clerk UI's optional wallet dependency graph. `bun audit` was not rerun for this integration; no clean audit of the combined dependency graph is claimed. Recheck it during the full final audit.

## Commands and real results

Every command completed before the next validation command started. All commands below ran from the checkout root. Final results are exit 0 unless listed in the failure section. Raw logs and temporary dependency scripts are ignored under `.data/07-integration/`.

| Command | Actual result | Log |
| --- | --- | --- |
| `bun install --lockfile-only --ignore-scripts` | First combined lock: `Saved bun.lock (1187 packages)`; final corrected lock: `Saved bun.lock (1184 packages)` | `lockfile.log`, `lockfile-final.log` |
| `bun install --frozen-lockfile --ignore-scripts` | Initial `392 packages installed [73.75s]`; final confirmation `Checked 1168 installs across 1184 packages (no changes) [1074.00ms]` | `install-frozen.log`, `install-frozen-confirmation.log` |
| `bun install --frozen-lockfile --ignore-scripts --force` | `999 packages installed [129.76s]`; refreshed stale installed nested Clerk copies | `install-frozen-force.log` |
| `bun run --filter @kriyan/core tokens` | `Generated core and web tokens.css from tokens.ts`, `Exited with code 0`; generated files match HEAD | `tokens.log` |
| `bun run --filter @kriyan/web typegen` | `Generating route types...`, `Types generated successfully`, `Exited with code 0` | `typegen.log` |
| `bun run --filter @kriyan/core typecheck` | `@kriyan/core typecheck: Exited with code 0` | `core-typecheck.log` |
| `bun run --filter @kriyan/backend typecheck` | `@kriyan/backend typecheck: Exited with code 0`, including the adjusted deletion fixture | `backend-typecheck-final.log` |
| `bun run --filter @kriyan/web typecheck` | `@kriyan/web typecheck: Exited with code 0`, including the final proxy fixture import | `web-typecheck-fixture-final.log` |
| `bun run --filter kriyan typecheck` | `kriyan typecheck: Exited with code 0` | `cli-typecheck.log` |
| `bun run --filter @kriyan/web lint` | `@kriyan/web lint: Exited with code 0`; no warnings/errors | `web-lint.log` |
| `bun run --filter @kriyan/web lint src/lib/hardening.test.ts` | `@kriyan/web lint: Exited with code 0` after the fixture import correction | `web-lint-fixture-final.log` |
| `bun run --filter kriyan lint` | `kriyan lint: Exited with code 0` | `cli-lint.log` |
| `bun run test` | `Quick-add docs match tested grammar fixtures.` and all 197 tests passed across 16 files | `root-test-final.log` |
| Local lock pin assertion script | All reviewed service/CLI pins and compatible Clerk/UI versions matched | `pins.log` |
| `git diff --check`, `git diff --cached --check` | No output; exit 0 | Final workspace check |
| `git ls-files -u` | No output; no unmerged entries | Final merge check |

Core/backend have no configured lint scripts. No full production build, Lighthouse, CLI bundle, Android check/build, browser journey, authenticated provider check, cloud codegen/deployment, hosted deletion or hosted Sentry delivery was run. The browser assertions were updated but not executed. Prior live account measurements and provider checks remain historical evidence, not new integration results.

## Failures and corrections

- Initial web typecheck exited 2. It found incompatible nested Clerk shared types on all three `ui={ui}` providers and missing `context` fields in the new Next event fixtures. The fixture constructors were corrected, and obsolete nested lock records were removed. The next web typecheck still exited 2 because Bun's regular frozen install left the old nested packages on disk. Logs `web-typecheck.log` and `web-typecheck-final.log` retain both failures.
- A targeted removal of those stale installed directories was rejected by automatic tool policy before execution. No directories were removed by that command. Bun's frozen `--force` reinstall completed successfully and refreshed the installation. Subsequent web typechecks passed without casts or type suppression.
- Initial root tests exited 1. Backend passed 30 tests in 4 files, core passed 80 in 3 files and web Bun passed 13 in 3 files. Web Vitest collected all 4 intended files and reported `2 failed | 31 passed (33)`. Both failures were new proxy fixtures using `NextFetchEvent` from `next/server`, whose runtime entry does not export that constructor in Next 16.3.3. CLI tests were not reached in that failed sequential run. The tests now import the installed internal constructor, preserving real `NextRequest`/`NextResponse` behavior. Final root tests passed all 197 tests. The failed run is retained in `root-test.log`.

No required check remains failed. No collected test is skipped. The full post-Android audit, production identity configuration, deletion delivery registration, production OAuth/CAPTCHA/signup checks and hosted monitoring verification remain outside this integration's claims.

## Review state

Read root and web `AGENTS.md`, `docs/PLAN.md`, the relevant brief and existing hardening/integration reports. Consulted bundled Next CSP, Proxy, header overriding, local font, Vitest and server/client instrumentation guides before implementation. Used the Convex expert guidance for the local backend test setup and unslop for report copy. No agents or nested Codex CLI workers were launched.

Only the five original conflict paths were explicitly staged to mark them resolved, after source checks and tests passed. Automatically staged incoming merge files remain as supplied by Git. Integration edits to the policy helper, hardening unit/browser tests and deletion test remain unstaged alongside their incoming staged versions; this report remains unstaged. Scratch scripts/logs remain ignored and unstaged. No commit, push, deploy, publishing or cloud setting change was made. No env values, credentials, bearer tokens or signed service envelopes were printed.
