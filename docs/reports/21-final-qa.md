# Brief 21 final QA and gallery

1 October 2026. Branch `v2`.

Status: PARTIAL, Brief 22 Job 1 is blocked by its mandatory memory start gate. The retry correction is saved but not yet proven on a rebuilt APK. The release is not published. Jobs 2 to 5 have not started in this continuation.

## Brief 22 continuation

The reviewer revised the memory policy on 1 October: start at 3 GB free commit and stop the owned heavy process below 1 GB, checked every 10 seconds. Diagnosis now starts with the existing signed APK, without a build. The gate scripts follow that policy. The watchdog records free commit and its owned process IDs and checks creation times before termination. It never targets owner applications or Codex desktop helpers.

The first API 36 launch silently raised the requested 1024 MB to 2560 MB. The watchdog stopped it at 668,804 KB free commit. A QEMU RAM override then produced `MemTotal: 988624 kB` in the guest. API 36 booted, but its APK installation crossed the memory floor; the watchdog stopped it at 1,026,628 KB. Those incomplete installations are setup failures, not application defects. An API 30 image was installed, but that emulator attempt was interrupted before app verification. The owner then freed commit, and this continuation returned to the original API 36 AVD.

On API 36, the existing EAS APK installed using `adb install --no-streaming -r`. The host's public DNS requests were refused on the campus network. The emulator launcher now includes the connected adapter's DNS servers before the requested public fallbacks, without changing host settings. A real device HTTP request returned 204 before testing. Initial captures obscured by a System UI ANR dialog were discarded and repeated after the guest settled.

The settled original APK still showed a white startup surface at the five-second capture. Its ten-second online capture showed the sign-in form. Logcat recorded `Displayed` at +2.157 seconds, `Running "main"` at +4.435 seconds and Clerk initialization at +5.290 seconds, with no JavaScript crash. Airplane-mode startup remained on "Loading your account." at ten seconds. This establishes the unset native/splash colours and unbounded account startup as real defects, independently of the earlier dead network. Receipts: `.agents/logs/22/original-{online,offline}-*.png`, matching XML/logcat, and `original-network-{on,off}.txt`.

The local fix generates Expo's native and splash backgrounds from the shared token, loads fonts and Clerk in parallel, hides the splash when the dark app frame lays out, and bounds account startup with a 2.5-second timer outside Clerk's provider. It offers the requested message and "Try again". Native Clerk client synchronization is disabled because the app uses custom React Native auth controls and browser SSO, rather than Clerk native components. Startup frame diagnostics will measure the form and retry view layouts. Mobile typecheck and all three mobile helper tests pass.

Local build preparation caught three problems: the initial token generator wrote CSS OKLCH into native resources, PowerShell split an unquoted dotted Kotlin argument, and the Expo splash plugin referenced a missing logo when configured without an image. The generator now uses the existing native colour conversion and existing Kriyan foreground icon; the compiler argument is quoted. The background test guards Android-compatible colours and the logo configuration. The first successful local build reported `BUILD SUCCESSFUL in 21m 1s` and produced a development-signed, x86_64-only release-mode APK, 51,883,855 bytes, SHA-256 `a8f97159875d4fd3e99665f5b8e8749dc09b2ab09175c8b30797683a1399a9a5`. It is an emulator verification artifact, not the release APK. Restart receipts are `gradle-{native-color,argument,splash-logo}-restart.{stdout,stderr}.log` and `gradle-before-retry.{stdout,stderr}.log` in `.agents/logs/22/`.

After the API 36 guest settled, that APK's signed-out form laid out 1,562 ms after the first app layout, or 1,146 ms after Android's `Displayed` event. Its offline retry view laid out after 2,533 ms, or 2,066 ms after `Displayed`. Captures show the dark native Kriyan splash and dark form/error screens. Receipts are `fixed-{online,offline}-milestones.json`, matching logcat, XML and timed PNG captures. The initial boot's System UI ANR obscured the screen; those discarded receipts are retained in `.agents/logs/22/boot-anr/`.

The reconnection check exposed a remaining defect: the device returned HTTP 204 after leaving airplane mode, but tapping "Try again" did not recover sign-in. Source inspection found that the public Clerk `load()` call without options restores its browser defaults. Retry now supplies Expo's native headless options. Verification of that correction is pending the rebuild. During its first rebuild, Ninja launched 18 C++ compilers independently of Gradle's one-worker setting. The owned build was stopped before the memory floor; no owner process was stopped. The build helper now defines one-compiler and one-linker CMake job pools. Receipt: `gradle-ninja-memory-stop.{stdout,stderr}.log`.

At 19:58:36 America/New_York, the following guarded rebuild was stopped by the watchdog at 1,036,200 KB free commit. Its daemon-disappeared error is the expected result of that stop, not a passing build. Free commit recovered to only 1.98 GB after the stop, and the largest owner browser process measured 18.01 GB private memory. No Java or emulator process remained. The owner was asked to free commit again, and the next build must wait for the existing 3 GB gate. Receipts: `gradle-job-pool-watchdog-stop.{stdout,stderr}.log` and `gradle-memory.jsonl`. The latest preparation checks pass: three mobile tests, fourteen assertions, JavaScript syntax and zero PowerShell parser errors. Job 1 remains incomplete until retry recovery and signed-in relaunch pass on the rebuilt APK.

The guarded helper then waited from 19:59 to 20:06 without reaching 3 GB free commit. The final reading was 915,292 KB. It was stopped without starting Gradle; no owned emulator or compiler remained. Source checkpoint: `694e972`. Latest receipt: `.agents/logs/22/memory-gate-blocked-latest.json`. Continuing requires memory to become available before rerunning `.agents/scripts/22-local-build.ps1`; the gate and watchdog must remain enabled. The one final EAS build has not been requested.

The paragraphs below describe the earlier attempt under the superseded 5 GB rule.

The initial Windows reading was 4,663,860 KB of free virtual memory, below the brief's 5 GB minimum. No Kriyan Gradle, emulator or QA process remained. Five unused Playwright/security helper processes were verified as descendants of this Codex session and stopped. Owner applications and other sessions were left running. The guarded build then refused to start at 4.83 GB free commit, exit 1. Receipt: `.agents/logs/22/local-build-original.log`.

`.agents/scripts/22-local-build.ps1` selects the production profile's public configuration, checks free commit immediately before the existing local build script, and refuses overlap with an emulator or Java process. A separate gate checks memory immediately before Gradle. Windows PowerShell's handling of informational native stderr stopped the first prebuild; OS-level stdout/stderr redirection corrected it. The original source then completed prebuild. Gradle started after a fresh 5.22 GB reading. Its separate Kotlin compiler daemon increased allocation, and free commit fell to about 2.1 GB. That session-owned build and compiler were stopped before native compilation. Its partial output is retained in `gradle-original-memory-stop.stdout.log` and `gradle-original-memory-stop.stderr.log`. This is not a passing local build.

The retry uses one Gradle/Metro worker, Kotlin compilation in the Gradle process, a 1536 MB heap and a 512 MB metaspace limit. It waits for at least 5 GB free commit before starting. No emulator or cloud build has been started, and no test accounts have been created in this continuation. Android and phone-state references were opened in a headless browser and captured in `.agents/logs/22/reference-{android,states}.png`; that browser is closed. The native/splash background configuration is unset and account initialization has no deadline; these are source findings, not an established explanation of the blank launch.

The reduced-memory retry waited about eight minutes without reaching the required threshold. Free commit fluctuated between about 3.3 and 4.5 GB, then measured 3.41 GB at 18:03 America/New_York. The owned waiting helper was stopped. There are no remaining Java/emulator processes from this continuation. The final memory reading is `.agents/logs/22/memory-blocked.json`. Owner applications were not terminated. Continuing requires at least 5 GB free commit, ideally enough margin for prebuild, before invoking `.agents/scripts/22-local-build.ps1` again.

Verification of the preparation: PowerShell parsing reports zero errors for the local build script and both new PowerShell helpers; `node --check` passes for both new JavaScript helpers; `git diff --check` passes. App startup reproduction, native smoke, gallery replacement, cloud build, release, production recheck, final workspace gates and account inventory cleanup remain unrun. This checkpoint does not claim completion of any Brief 22 job.

## Environments and limits

Web QA uses a compiled local build and the live sites `https://kriyan.app` and `https://app.kriyan.app`. Local data belongs to disposable users on `avid-stingray-875`; production data belongs to disposable users on `calm-salamander-183`. Both use the existing Clerk development instance. No Clerk instance settings, custom scopes or API-key settings were changed. Brief 18 supersedes those parts of Brief 15.

The reviewer has deployed the Brief 21 web and backend fixes. Brief 22 Job 4 will verify their production behavior. This session does not push or deploy. Earlier authorized `convex dev --once` runs synchronized only the development backend.

Heavy checks run sequentially. Every browser used for QA is headless. Every Android emulator must use `-no-window -no-audio`. The owner's applications are not terminated.

## Job 1 changes

- Empty phone Week days are 56px rows below 700px. Populated days keep their cards. Desktop keeps 120px empty cards.
- Empty List copy uses muted text and a 20px gap below the add field.
- Today on desktop Week uses full-ink day text and a 1px `--line-strong` border.
- Clerk provider localization supplies "Sign in to Kriyan" and "Create your Kriyan account", with plain subtitle copy.
- Android empty Day uses the timeline prompt card and wrapping bordered examples. Day and List use a left-aligned 48dp add row. Zero task counts are hidden. Authentication is centered above the keyboard and uses shared disabled tokens.
- Android offers password sign-in and account creation with email-code verification. Web also offers an email-code form. These app changes avoid changing Clerk instance settings.
- Android version is 1.0.1, version code 2. Final EAS build ID is `190704dd-1737-46a9-9bc0-739b628c6293`. Two earlier jobs were canceled after source corrections; neither is a release artifact.

The web-created password account was created through the production sign-up UI and verified with its test email code. The same account also added a task through the web UI for native visibility verification. Native cross-surface verification and the release receipt are pending the signed artifact.

## Defects found

| Defect | Severity | Reproduction and actual result | Fix and evidence | Status |
|---|---|---|---|---|
| Phone Day scroll region has no keyboard target | Should fix | Run axe while the phone Day view is loading. `scrollable-region-focusable` is serious. | Added a named, focusable Day planner region. Functional sample accessibility passes locally. | Local fix; production needs reviewer deployment. |
| Expected model errors become generic production errors | Should fix | Submit a task time with no date through the production API. Expected 400, actual 500. Patch another user's task or goal ID. Expected 404, actual 500. Delete an area with linked records. Expected useful refusal, actual generic server error. | Use `ConvexError` for the affected shared model rules. Read its data in the public error adapter and web feedback helpers. Tests cover production-style hidden messages, input errors, foreign IDs and safe fallbacks. | Local fix; reviewer must deploy backend and web. |
| Rate limit error loses its public status | Should fix | Burst 65 production API reads in one minute. The expected 429 response does not survive error translation. | Read structured `RATE_LIMITED` Convex data and return 429 with `Retry-After: 60`. The paced local HTTP probe returns 429 with Retry-After 60, and MCP shares the limit. Its original recovery check ran too close to the backend minute boundary. The final probe returns 60 successes and five 429 responses, refuses a shared MCP read, and succeeds after the full advertised delay. | Local fix; production deployment needed. |
| Next.js dependency advisory | Blocks launch until patched | Initial `bun audit` reports a critical `next/og` advisory on 16.3.3. | Updated Next, `@next/env` and `eslint-config-next` to 16.3.6. Patched build compiles and the critical finding disappears. | Fixed locally; reviewer deploys the web update. |

The status defects did not permit cross-user access. The production API and MCP isolation probe attempted task and goal operations in both directions. Both owners' tasks and goals were unchanged; all five API attempts returned 500 and MCP refused the operations. Receipt: `.agents/logs/21/isolation-production.json`.

The Next advisory concerns attacker-controlled SVG values in Node `ImageResponse`. Kriyan's Open Graph image uses constants. The dependency was still patched. [Maintainer advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j).

Phone Quick add and Self-hosting documentation tables also trigger serious `scrollable-region-focusable` violations in the expanded gallery scan. The Markdown table wrapper now has a named, focusable region. The regression failed on both widths before the fix. The rebuilt public suite passes 11 checks with one intentional mobile pointer-drag skip. Keyboard scrolling and axe pass, and both pages were recaptured. Production needs the reviewer to deploy the web fix.

A separate title regression fails before the fix and passes afterward. Creating or updating a title over 180 characters previously truncated and saved it; the shared task model now refuses it and preserves the existing row. The API adapter recognizes the same safe validation message. Receipts: `title-validation-before.log` has 1 failed and 19 passed; `title-validation-after.log` has 20 passed. Production needs the reviewer to deploy this backend fix.


Planning property labels lose contrast on hover because the settings opacity dims muted text. The new "Planning property labels keep contrast on hover and press" check fails before the fix and passes afterward. Property controls now keep full opacity and use the existing surface token for press feedback. All four properties pass the final gallery axe checks. This should be fixed in production by the reviewer deploying the web commit.

The hardening suite finds a 36px-wide account menu button and a 32px-high link at the phone viewport, below the 44px requirement. Scoped account styles enforce both dimensions on narrow or coarse-pointer surfaces. Account/security tests fail before the fix; all four local hardening checks pass afterward. Production reproduces both target failures. Its reset and invalid signed-cleanup refusal pass. The latter test expects production's sanitized error and independently verifies that the task was preserved. Reviewer deployment is required for the target fix.

Clerk's new-device verification field may have autocomplete one-time-code without inputmode numeric. The UI helper now recognizes both. Two timeout receipts are superseded by successful local MCP/API PKCE, consent, all 15 REST method/route validation probes, and rate recovery. The Claude skill copy was synchronized; the skill-copy test and full test command pass.

Visual review found Goals captures taken before its skeleton disappeared. Readiness now waits for the view and selected dialog. All affected empty/sample/late Goals and every goal property were replaced, including the phone rows missed by the earlier timing error. Empty Day has a scrolled capture of its prompt. The current web gallery has 287 captures with zero violations across 272 axe state checks. Actual Chrome zoom factor 2 replaces the CSS-only zoom shots; computed CSS zoom is 1 and the add-task dialog works in both.

Hardening receipts: hardening-local-before.log has two failed and two passed; hardening-local-after.log has four passed. Production's original run has three failed and one passed: two real target failures and a harness assertion expecting an internal error message. hardening-production-sanitized.log passes the corrected refusal/preservation check. The final local rate receipt is services-local-rate-final-results.json: all four checks pass.

## Harness corrections

- Signup waits for Clerk's verification preparation before entering a code. Cleanup records the created user before assertions that can fail.
- UI history checks navigate Week and Goals through the app and wait for the committed URL before back and forward. Both production widths now pass.
- Production `www` correctly redirects with 308, and the app-root redirect may be relative. Tests resolve the location before comparison.
- Anonymous navigation uses `Accept: text/html`. API-style anonymous `/app` requests intentionally receive Clerk's 404 response; HTML navigation receives the sign-in handshake.
- Production Playwright does not start an unnecessary local dev server.
- E2E cleanup uses the user's native authenticated reset on both deployments. The old helper combines a development service secret with an inherited production URL and fails; it is not used for final production cleanup.
- Local production-build OAuth must use a configured HTTPS resource. The initial HTTP override was invalid. Final local service verification uses an ephemeral loopback TLS proxy and its certificate, with no certificate-store or product origin-policy changes.

The original 65-request parallel rate probe also exceeded Convex action capacity: 20 reads succeeded and 45 failed as generic internal errors. A paced direct signed-service diagnostic reaches the intended limiter: 60 accepted, 5 structured `RATE_LIMITED` errors. Final HTTP probes are paced to distinguish capacity from application rate limits.

Gallery sample setup now resets the disposable profile to incomplete before invoking the idempotent sample operation, and asserts 25 stored tasks. Earlier captures labeled sample used a no-op call after onboarding; they are superseded by the verified rerun.

Historical failures remain in `.agents/logs/21/`. Superseding receipts are identified below; an orchestration wrapper returning zero is not evidence that each child check passed.

## Established verification

| Command or check | Result | Receipt |
|---|---|---|
| `bun run typecheck` | Exit 0, all workspaces and scripts. | `completion-typecheck.log`, `completion-typecheck.json` |
| `bun run lint` | Exit 0, all linted workspaces. | `completion-lint.log`, `completion-lint.json` |
| `bun run test` | Exit 0, 336 tests: skill 6, backend 110, core 109, mobile 2, web 67, CLI 42. | `completion-test-after.log`, `completion-test-after.json` |
| `bun run build` | Exit 0 on Next 16.3.6. Release fallback still 1.0.0 at this stage. | `completion-build.log`, `completion-build.json` |
| Targeted native and signed-service isolation | 61 tests passed. | `native-isolation-tests.log` |
| Production functional suite | 8 passed at 1440 and 390. Real signup, task properties, clearing, Undo, shortcuts, offline writes, history, timezone/DST and sample onboarding. | `functional-production.log` |
| Full local planner suite | 37 passed, including all views, settings, lifecycle, states and modal focus. | `e2e-local-complete.log` |
| Local public suite | 11 passed, 1 intentional mobile pointer-drag skip. | `public-docs-complete.log` |
| Rebuilt local functional suite | 10 passed, including the 699/700px Week breakpoint, email-code sign-in and planning hover/press contrast. | `functional-local-final.log` |
| Production public suite | 7 original passing checks plus 2 passing corrected metadata checks, 1 intentional mobile pointer-drag skip. | `public-production-all.log`, `public-production-metadata-final.log` |
| Production MCP | Real DCR, PKCE and consent; both protocol revisions; every one of 21 tools, saved read-backs and audience refusal. | `services-production-results.json` |
| Real Claude Code client | Called `get_day` and `quick_add`; saved task verified directly. | `claude-client.jsonl`, `services-production-results.json` |
| Production CLI, both shells | PKCE and consent, keychain storage, reads with area/project/due/all filters, optional-length add, move, done, ambiguous match exit 2, forced-401 refresh, removed-token refresh and logout. | `cli-production-complete.log`, `cli-live-production.json` |
| Packed CLI | `npm pack --ignore-scripts`, local tarball run through `npx` and `bunx`; both help commands exit 0. | `cli-pack-final.log`, `cli-npx.log`, `cli-bunx.log` |
| Leftover smoke account | Deleted using the production app's Security confirmation form, then absent from Clerk listing. | `delete-smoke.json`, `delete-smoke-complete.log` |

The live planner script separately verifies the complete quick-add grammar, all four repeat rules, concurrent exactly-once completion, five reminder kinds and cancellation, pace states, milestones, realtime between two windows, three offline additions stored exactly once, Auckland/Honolulu calendar behavior across DST, direct ownership checks and reset of all 13 tables while preserving user B. Local and production evidence is in the corresponding `live-*` result folders.

## Dependency audit

Initial audit: one critical and three moderate findings. After the Next patch: three moderate findings remain, exit 1.

| Dependency | Path and remaining issue | Treatment |
|---|---|---|
| `decode-uri-component <=0.4.2` | Expo Router transitive dependency. Malformed URI decoding can consume excessive CPU. Patched upstream version is 0.5.0. | Reported for the Expo dependency update. No broad mobile dependency override or unverified claim of safety. [Advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr). |
| `stream-json <=3.4.0` | Clerk UI and Expo auth dependency. Deep input in stream filters can consume excessive CPU. | Reported for the Clerk dependency update; application tests do not establish that every upstream path is unreachable. [Advisory](https://github.com/advisories/GHSA-528h-pc64-c93x). |
| `uuid <11.1.1` | Expo and Clerk transitive dependency. Buffer bounds issue in v3, v5 and v6 when a caller supplies a buffer. | Reported. A forced major-version override across Expo's native dependency graph was not made. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq). |

Receipts: `audit-final.log` and `audit-patched.log`.

## Remaining report sections

Final EAS artifact and release, Android/native cross-surface results, all local e2e totals, full gallery counts and missing-state reasons, Lighthouse metrics, final 13-table cleanup, CI and three local commits will be filled from their actual receipts.

## Lighthouse measurements

Lighthouse runs use one headless Chrome, real signed-in sample accounts for Day, desktop settings and mobile simulated throttling. These are one-run measurements on the memory-constrained owner machine. All final URLs match the intended route, all runs have no warnings, and CLS is zero. They are not a repeatable performance benchmark.

| Environment and route | Device | Performance | Accessibility | Best practices | SEO | LCP ms | TBT ms |
|---|---|---|---|---|---|---|---|
| Local / | desktop | 100 | 100 | 100 | 100 | 516 | 45 |
| Local / | mobile | 90 | 100 | 100 | 100 | 2575 | 317 |
| Local /docs | desktop | 100 | 100 | 100 | 100 | 628 | 31 |
| Local /docs | mobile | 95 | 100 | 100 | 100 | 2621 | 141 |
| Production / | desktop | 100 | 100 | 100 | 100 | 380 | 0 |
| Production / | mobile | 90 | 100 | 100 | 100 | 2126 | 365 |
| Production /docs | desktop | 100 | 100 | 100 | 100 | 386 | 73 |
| Production /docs | mobile | 94 | 100 | 100 | 100 | 2258 | 234 |
| Local /app | desktop | 98 | 100 | 100 | 63 | 1052 | 28 |
| Local /app | mobile | 71 | 100 | 100 | 63 | 4953 | 431 |
| Production /app | desktop | 98 | 100 | 100 | 63 | 1007 | 4 |
| Production /app | mobile | 74 | 100 | 100 | 63 | 4522 | 372 |

Mobile Day is a performance follow-up, with LCP 4.95 seconds locally and 4.52 seconds in production under simulated mobile throttling. This was not fixed by widening the brief into an application loading redesign. The private app SEO score of 63 includes deliberate noindex policy, which is appropriate for signed-in content. Raw LHR and HTML reports are `.agents/logs/21/lighthouse-*`; `lighthouse-summary.json` records scores, final URLs and metrics.
