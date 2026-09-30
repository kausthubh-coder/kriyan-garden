# Independent web hardening

Reviewed locally on 29–30 September 2026, America/New_York. Base: reviewed web checkpoint `3d8a526`. Changes are uncommitted. No deployment, publishing, production configuration, owner-data reset, Android implementation, or MCP/API operation implementation was performed.

**This is not the complete brief 07 audit.** The independent web changes and available local/browser checks are complete. Live identity-deletion cleanup is blocked on supervisor deployment and webhook registration. The dependency audit has two explained moderate findings. Production cutover, integrated reminder/transport isolation, Android, landing/demo integration, and the cross-surface journeys remain for the supervisor's post-integration pass.

## Changes and evidence

| Item | Result |
|---|---|
| CSP | Enforced policy on documents, real Clerk development authentication and Convex subscriptions verified in development and production builds. App/auth documents use per-request nonces and dynamic rendering. |
| Existing headers | `nosniff`, framing protection, strict-origin referrer policy and camera/microphone/geolocation denial retained. |
| Framing | App/auth retain `DENY` and `frame-ancestors 'none'`. Public `/`, `/demo`, `/docs`, `/privacy`, `/terms` permit same-origin framing. Real browser loads the public page in a same-origin iframe and cannot render Settings in an iframe. The integrated demo itself is not present in this branch. |
| Identity deletion | New verified Clerk `user.deleted` receiver and signed, operation-bound backend cleanup reuse `model/profiles.resetAll`. Local signature, replay, multi-batch cleanup, retry and ownership tests pass. Live deployment gate explicitly skips. |
| Reset | Actual Settings RESET guard and mutation tested with two newly created disposable development identities. One planner clears; the second owner's record survives. |
| Optional Sentry | Server/client instrumentation and app/account error capture, disabled with absent/invalid DSNs. Strict error-event reconstruction strips content and identity. An actual SDK transport test confirms scoped private data does not reach the outgoing envelope. |
| Account contrast | Primary badge was **1.1641:1**, now **9.2030:1**. Profile and Security text styles, including Clerk's footer, have a measured minimum **5.2815:1**. |
| Account controls | Previously 32px navigation buttons, a 24px action width and a 14px footer link. Measured Profile/Security controls now meet 44px width/height at 1440×900 and 390×844, with visible keyboard focus and no page overflow. |
| Motion | Clerk controls have no transitions or animations, including keyboard actions and reduced-motion mode. Existing planner motion stays unchanged. |
| Loading/error UI | The existing Account fallback could remain a loading message indefinitely, and its embedding had no local recovery boundary. Slow loading now offers retry after 15 seconds; rendering failure offers a private error and remount retry. Both failure/recovery cases are covered by injected component tests. Planner error UI no longer displays raw exception text. |
| Deletion confirmation | Real Clerk Security panel and confirmation opened on phone width. The input can be scrolled into view. Lowercase text keeps Delete account disabled; exact `Delete account` enables it; incorrect text disables it again. Final destructive confirmation was not clicked because webhook delivery is not configured here. |

The account appearance uses shared CSS tokens and Schibsted Grotesk. The approved dark layout and optional task length remain intact. Clerk UI is bundled and pinned at `@clerk/ui` **1.37.0**, using its documented `ui` provider option, so styling does not depend on a silently changing remote UI. No DOM interception implements deletion.

Screenshots and numeric evidence are ignored local artifacts under `.agents/screenshots/07/`: `account-before-1440.png`, `account-before-390.png`, `account-before.json`, `account-1440.png`, `account-390.png`, `account-measurements.json`, `security-1440.png`, `security-390.png`, `security-measurements.json`, and `delete-confirmation-390.png`. Measurements convert computed colours through the browser canvas into sRGB and calculate WCAG relative luminance against composited ancestor backgrounds; text opacity is included. They measure the rendered account fixture, not every possible Clerk modal or linked-provider state.

## CSP implementation and concessions

Read the installed Next **16.3.3** guides at `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`, the app instrumentation/client instrumentation references, and the font guide before changing code. The nonce implementation follows those guides: Proxy supplies the policy and `x-nonce` on forwarded request headers and the policy on the response; app/sign-in/sign-up layouts read the request nonce and use dynamic Clerk providers. Dynamic document responses are private/no-store. Static public pages retain static rendering.

Policy details:

- Default source is same-origin; objects are forbidden, base URLs and form actions are same-origin.
- Clerk's exact Frontend API origin comes from its installed publishable-key parser. Convex HTTP and WebSocket origins come from the configured deployment URL. Optional browser Sentry adds only the configured HTTPS ingest origin.
- Clerk's documented Cloudflare challenge and `*.protect.clerk.com` script/frame hosts are allowed; protection connections include its required non-443 ports. Clerk avatar images, `data:`/`blob:` images and blob workers are allowed.
- Production app/auth scripts require a nonce and use `strict-dynamic`. Trusted scripts can load descendants under CSP's delegation rules; this is a documented concession, not a promise that script host allowlists constrain every descendant in modern browsers.
- Static public Next hydration requires script `unsafe-inline`. App/auth document responses override this fallback with nonce CSP. This limits the public static policy's protection against inline script injection; it is not a nonce policy for marketing pages.
- Inline styles remain allowed for Clerk's runtime CSS and the planner's position styles. No global `https:`/`http:` script or connection source, Stripe, Maps, analytics or remote Google font origin is added.
- `unsafe-eval` and localhost WebSocket allowances exist only in development. Production uses `upgrade-insecure-requests` and excludes these allowances. The focused production browser test asserts their absence.
- Compatibility checks passed with enforcement. No report-only policy is left behind. A script inserted into an actual HTML response without a nonce is blocked in Chromium. Initial injection through the trusted automation evaluation context was unsuitable for testing CSP and was replaced with response-body injection.

Authentication uses real disposable Clerk development identities and the real development Convex backend. `@clerk/testing` performs development sign-in; its testing token bypasses CAPTCHA. **Google OAuth, real CAPTCHA and production Clerk sign-up were not verified.** The documented required origins are present, but these live production gates remain separate.

Font integration: this branch's `next/font/google` already serves generated font assets from same-origin at runtime, so its builds succeed without Google origins in the browser CSP. Read the landing worker's root layout and font directory only. Preserve its `apps/web/public/fonts/SchibstedGrotesk.woff2` and `next/font/local` configuration (`weight: "400 700"`) when merging; it removes the remaining build-time Google font fetch.

Reference: [Clerk CSP requirements](https://clerk.com/docs/guides/secure/best-practices/csp-headers) and [Clerk component versioning](https://clerk.com/docs/reference/components/versioning).

## Deletion delivery and integration requirements

`POST /api/webhooks/clerk` verifies the original webhook with the installed `@clerk/backend/webhooks.verifyWebhook` API. Only a verified `user.deleted` event with a string Clerk user ID can start cleanup. Other event types return 204. Missing signing configuration returns 503; forged/expired/malformed requests or invalid IDs return 400. Cleanup failure returns a generic 503 so Clerk can retry. Nothing logs the event body, identity, credentials or signed service envelope.

After verification, the existing server-only `serviceCall` signs the exact `accountDeletion.cleanup` operation, owner, timestamp, nonce and empty payload. New `accountDeletion:cleanup` verifies those values and replay protection before invoking its internal mutation. It reuses the existing bounded reset and scheduling implementation; no web copy of business logic and no MCP/API operation changes were introduced. Duplicate webhook delivery obtains a fresh signature and is harmless; replaying a signed request is rejected.

**202 means cleanup was durably accepted, not that every scheduled batch has completed.** Clerk identity removal happens before webhook delivery. Consequently, this is asynchronous verified cleanup, not an atomic transaction across Clerk and Convex. A missing webhook registration still permits Clerk's built-in identity removal without cleanup; do not approve the live deletion gate until the steps below are complete. Settings gives an accurate manual option to clear planner data in Danger zone first and does not claim the unregistered webhook is live.

Supervisor steps after integration:

1. Review and deploy the integrated development backend, including `accountDeletion.ts`, and regenerate normal Convex references. No deploy or cloud codegen was run here; typed `makeFunctionReference` calls avoid manually editing generated API files.
2. Preserve the shared `SERVICE_SECRET` contract on the web server and Convex deployment. The cleanup action uses the existing nonce verifier and existing reset model; retain global replay guards during worker merges.
3. Register a Clerk **development** webhook endpoint at the externally reachable development/preview URL ending in `/api/webhooks/clerk`, subscribed to **`user.deleted`**. Set its signing secret as server-only `CLERK_WEBHOOK_SIGNING_SECRET` on that web environment. A local browser port is not an externally reachable webhook receiver; use a reviewed preview or an explicitly configured forwarding endpoint.
4. Confirm the route remains public to the webhook sender while enforcing signature verification. Merge landing's public-route Proxy bypass and redirect handling without losing nonce forwarding on app/auth documents or the legacy redirect.
5. Create two disposable development identities with data, delete the first through Clerk Account, observe successful delivery, and verify all its rows disappear after scheduled batches while the second owner's rows remain. Exercise delivery retry as well. Repeat for Clerk dashboard deletion if that behavior is to be claimed.
6. After merging Android/services reset changes, verify reminder-job cancellation, push-token/component cleanup, service-invocation cleanup, replay-guard retention, stale-token/concurrent-write behavior and the complete new-function isolation matrix. This branch does not contain those workers' tables or implementations; its tests cannot establish those guarantees. Scheduled follow-up failures also require an operational check rather than treating an initial 202 as final completion.

Only after the human Clerk production setup should a separate production `user.deleted` endpoint/signing secret be registered for `https://app.kriyan.app/api/webhooks/clerk` and tested with disposable identities. No production setting was read or changed in this independent pass. The supervisor's previously reported human-terminal Clerk production blocker remains a cutover gate, not a local-code gate.

No custom web sign-up submission endpoint exists in this branch: sign-in/sign-up use Clerk's components and provider protection. The new webhook is signature-authenticated deletion delivery, not a sign-up submission endpoint. API/MCP rate limits remain with the services worker.

## Optional Sentry setup and privacy

New `src/instrumentation.ts` uses Next's register/onRequestError hooks; `src/instrumentation-client.ts` enables only the browser global error handler when configured. App and Account boundaries capture errors explicitly. Missing or malformed DSNs cause no initialization. No replay, automatic performance tracing, sessions integration, analytics, console breadcrumbs, request/body integrations, metrics or logs are enabled; default integrations, OpenTelemetry setup and client reports are disabled.

`beforeSend` reconstructs error events from an allowlist: a validated event ID, timestamp, constant platform/level, known error type, a fixed content-free error description and limited compiled stack locations/line numbers. It drops identity, email, IP fields, request URL/query/body/headers, cookies, credentials/tokens, user content, exception messages, breadcrumbs, tags, contexts, extras, function names, source context, local filesystem prefixes and unknown future fields. Stack files outside the compiled application patterns become `external`. This deliberately trades detail for privacy. Transactions and logs are also rejected.

The owner must create a Sentry **Next.js project** in their desired organization/free plan, leave replay and tracing disabled, and add the same project DSN to **`SENTRY_DSN`** and **`NEXT_PUBLIC_SENTRY_DSN`** for the chosen web environment. Rebuild because the public variable is bundled at build time. Enable project-side sensitive-data scrubbing and avoid storing IP addresses/default PII. No Sentry account or project was created here; real hosted delivery is unverified. Direct browser transport necessarily exposes its network source IP to the receiving service even though the event payload carries no IP/user data.

No Sentry auth token or source-map upload is required by this implementation. Source maps were not uploaded. Tests use a fake DSN with an in-memory transport and private canary values; those values do not reach the outgoing SDK envelope. Browser/server hosted-event ingestion still needs an owner-provided project for a live check.

## Verification commands and final output

Commands below ran in this worktree with Bun. Local servers used **3007**, and were stopped before build/type generation. The original 3000 suite and other workers' 3004/3005 servers were not touched.

| Command | Final real result |
|---|---|
| `bun install` | Exit 0. Initial install: `473 packages installed [54.20s]`. After adding dependencies, fresh lock resolution: `58 packages installed [34.09s]`. |
| `bun run typecheck` | Exit 0; Next `✓ Types generated successfully`; core, backend and web each `Exited with code 0`. |
| `bun run lint` | Exit 0; `@kriyan/web lint: Exited with code 0`. |
| `bun run test` | Exit 0; core `27 pass / 0 fail`; backend `Test Files 3 passed (3), Tests 23 passed (23)`; web `Test Files 2 passed (2), Tests 10 passed (10)`. **60 tests total.** |
| `bun run build` | Exit 0; final Next 16.3.3 build `✓ Compiled successfully in 12.8s`; `Finished TypeScript in 19.7s`; `✓ Generating static pages ... (11/11) in 1818ms`. `/` static; app/settings/welcome, sign-in/sign-up and webhook dynamic. |
| `$env:E2E_BASE_URL='http://localhost:3007'; bun run e2e` | Exit 0 against the production build: **`15 passed (1.1m)`**. Development build also passed all 15. Includes onboarding, optional duration, complete/undo, mouse drag, search, URL reload, goal editing/deletion/undo, settings, both viewport captures and disposable reset/identity teardown. |
| From `apps/web`: `$env:E2E_EXPECT_PRODUCTION='1'; bunx playwright test --config playwright.hardening.config.ts` | Exit 0: **`1 skipped, 3 passed (23.6s)`** on the production build. Skip is explicitly `accountDeletion:cleanup` undeployed. |
| Same config, `--grep 'account security'` | Exit 0: **`1 passed (7.5s)`**, additionally checking the exact deletion confirmation text guard and scrolling the input into view. |
| `git diff --check` | Exit 0, no output. |
| `bun audit` | Exit **1**, **`2 vulnerabilities (2 moderate)`**, explained below. Not claimed clean. |

Expected non-failure notices: Playwright's NO_COLOR/FORCE_COLOR warning, dotenv's injection notices, and Clerk development-instance notices. Optional `core-js`, `bufferutil` and `utf-8-validate` lifecycle scripts remain blocked under Bun's trust policy; they were not newly trusted. Build and browser checks work without them.

After the last production browser run, Sentry's server OpenTelemetry setup was explicitly disabled in addition to zero tracing/default integrations. The final targeted web test run passed all 10 tests (`15.10s`), direct web typecheck passed, and the final build above passed. No DSNs were configured in the browser journeys, so this additional optional-server flag does not alter those observed journeys. Port 3007 is stopped and disposable auth files were removed.

Earlier failures were fixed, not hidden: initial Primary contrast check failed at 1.1641; the first Sentry SDK transport fixture needed the current stack parser and ErrorEvent typing; bundling Clerk UI initially exposed stale nested Clerk types in the old lockfile. Resolving the dependency graph afresh selected compatible Clerk packages (`@clerk/nextjs` 7.9.8, React SDK 6.17.3, shared 4.37.0) and the final typecheck/build pass. The existing declared package ranges are respected; Next and React remain pinned. No `any`, ignored types or forced cast was added to bypass the mismatch.

## Dependency audit exceptions

The first audit reported 11 findings, including six high findings in fast-uri/brace-expansion and moderate ip-address findings. A fresh Bun lock resolution within existing ranges removed those findings: installed fast-uri 3.1.8, ip-address 10.7.2 and patched brace-expansion variants. The final two moderate findings are introduced by bundling Clerk's UI and originate in its optional Solana wallet dependency graph:

| Finding | Installed path and assessment |
|---|---|
| [stream-json GHSA-528h-pc64-c93x](https://github.com/advisories/GHSA-528h-pc64-c93x) | `@clerk/ui → Solana adapters → @solana/web3.js → jayson → stream-json 1.9.1`. Advisory concerns path filters doing quadratic work on nested JSON. The installed jayson source imports StreamValues/Verifier rather than those path filters; Kriyan adds no wallet flow or stream-json endpoint. This is an assessment of the inspected use path, not a blanket guarantee. Patched stream-json 3.5.0 is outside jayson's declared 1.x range. No untested major override was forced. Recheck upstream before enabling wallet sign-in. |
| [uuid GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | Same graph, jayson requires uuid 8.3.2. Advisory concerns v3/v5/v6 with caller-provided output buffers. Inspected browser/generateRequest/utils sources call v4 without an output buffer. The reported affected version remains installed; it was not suppressed. A major override to 11.1.1+ was not forced through the wallet graph. Recheck an upstream compatible dependency update during integration. |

The expanded lockfile reflects bundled Clerk UI, Sentry and tests as well as compatible patch refreshes. Supervisor should preserve the reviewed UI pin while resolving the combined workers' lockfile. The audit output above remains a known exception, not a production approval.
