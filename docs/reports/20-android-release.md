# Brief 20: Android release

Status: RELEASED. Verification is PARTIAL because real-address email codes and Google's account chooser need user input. The final artifact, production Android/web smoke and account isolation passed. No code was pushed or deployed.

[Kriyan Android 1.0.0](https://github.com/kausthubh-coder/kriyan-garden/releases/tag/android-v1.0.0) contains both `kriyan.apk` and `kriyan-1.0.0.apk`.

## Changes

- Day has a fixed header and area filters, with one scroll containing any-time tasks, undated tasks and the full timeline. Any-time tasks retain their saved order within open and completed groups.
- Goal subtitles align their dot with the text. Linked task rows and the next goal share one divider. Onboarding areas are plain rows with a hairline.
- Android and web import empty-state and first-task copy from `packages/core`. Day includes the first-task examples and a dismissible tray hint. List has an add row, and Week and Goals show the shared empty copy.
- Sign-in uses email codes and Clerk's browser `useSSO` flow. The backend connection is recreated when the signed-in user changes. Google client IDs are not needed for the browser flow.
- The production EAS profile includes the public production Convex URL and development Clerk publishable key. Version is 1.0.0, version code 1, application ID `app.kriyan.android`.
- Release scripts derive the repository using `gh repo view`, target the checked-out commit, upload stable and versioned APKs, and include the checksum, minimum Android version and install steps. The landing and download pages use the stable APK URL. A web build script reads release version and size from GitHub with a committed static fallback. README and the Android guide describe the real download/access paths.
- Mobile QA supports production disposable accounts, email-code sign-in, reliable UI dumps/captures, reverse scrolling and cleanup. The test skill's Android sign-in helper supports the code flow; its Claude copy remains synchronized.

## Cloud builds and signing

The project was already linked to `6c332d90-6af8-4ea6-8c10-4ee8e0e93562`; `bunx eas-cli@24.8.0 project:info` confirmed `@kausthubh/kriyan`. No new project was needed. EAS used its existing managed keystore, Build Credentials Ic6lQPn1Cp. No local keystore was generated.

1. [Early production build](https://expo.dev/accounts/kausthubh/projects/kriyan/builds/29e7340f-9857-4d4d-b4f4-7de80c2925a8). Started immediately after public production configuration was in place. FINISHED. Used for the before captures and production preflight.
2. [Canceled intermediate build](https://expo.dev/accounts/kausthubh/projects/kriyan/builds/cd483147-b85e-4763-a13d-873325e26e60). Canceled after the remaining linked-task divider was found during review.
3. [Rejected smoke build](https://expo.dev/accounts/kausthubh/projects/kriyan/builds/098beefe-3a61-4d37-831b-6a035c3c1d82). FINISHED at 2026-10-01 03:38:51 UTC. Installed successfully, and email-code sign-in and onboarding worked. Day then crashed because Hermes does not implement `Array.toSorted`. Replaced it with a copied stable `sort`, and deferred closing the per-user Convex connection until provider auth cleanup finishes. This APK will not be published.
4. [Corrected release build](https://expo.dev/accounts/kausthubh/projects/kriyan/builds/35a701e8-3f9e-42a7-9070-6ff4683600b9). FINISHED at 2026-10-01 04:03:13 UTC. Includes both runtime corrections. Downloaded to `.agents/builds/kriyan-1.0.0.apk` and installed with `adb install -r`, exit 0. The complete production smoke passed without recurrence of either JavaScript error.

The early and final signed APKs declare Android 7.0, API 24, as their minimum and Android 16, API 36, as their target. `aapt dump badging` confirms their package/version and native libraries: `arm64-v8a`, `armeabi-v7a`, `x86` and `x86_64`. `apksigner verify --print-certs` confirms the same certificate SHA-256 on both: `d28c6ec5b0c6d12cac403a2d1b661bcd951fbd06b0e2d8ffae32ddab3a34300e`.

Final APK SHA-256: `86b40f879054c2064bd80c30939464233a665438d25641c53451a774c8c089a7`.

Final APK size: **114,293,562 bytes**, displayed as **109.0 MB**. Both GitHub assets report this exact SHA-256 and size. A fresh download from the stable `releases/latest/download/kriyan.apk` URL matched the EAS APK. Receipts: `.agents/logs/20-apk.json`, `20-github-release.json`, `20-download-proof.json`.

The release tag targets the already-published `v2` baseline, `54f6445a1821d976683506874dbe2d5b44b63c1b`. EAS built the changed working tree. The fixes are committed locally for reviewer push; the no-push instruction prevents tagging the new local commit on GitHub during this run.

## Verification

| Command | Real result | Receipt |
| --- | --- | --- |
| `bun run typecheck` | Exit 0 after final QA helper changes, every workspace and scripts typecheck passed. | `.agents/logs/20-typecheck-final-all.log` |
| `bun run lint` | Exit 0 after final QA helper changes, CLI, mobile and web passed. | `.agents/logs/20-lint-final-all.log` |
| `bun run test` | Exit 0 after runtime corrections, 315 workspace tests and 6 skill tests passed. | `.agents/logs/20-test-release.log` |
| `bun run build`, first run | Exit 1, stale generated `.next/dev/types/validator.ts` referenced the removed download route. | `.agents/logs/20-build.log` |
| `bun run build`, retry | Exit 0 after removing that generated validator and rerunning type generation. | `.agents/logs/20-build-retry.log` |
| Final `bun run build` with release metadata | Exit 0. Compiled in 16 seconds; TypeScript and all routes passed. | `.agents/logs/20-build-final.log` |
| Mobile `scripts/qa.ts --production` and `scripts/ui.ts` | Passed final APK smoke, both accounts and populated/empty views. | `.agents/logs/20-final-mobile-smoke.json`, `20-isolation.json`, `20-populated-qa.json` |
| `node .agents/logs/20-ui-audit.mjs` | Exit 0: one Day scroll; unchanged header/filter bounds; saved task order; persisted hint; no observed cross-account data. | `.agents/logs/20-ui-audit.json` |
| Touch targets | Auth 3, onboarding 9, Account 3 controls, zero undersized. Populated Goals: 24 visible controls, zero undersized; one clipped viewport-edge control excluded. | Screenshot XML and UI command output |
| Production web read-back | Exit 0 using the skill's `session.mjs --base https://app.kriyan.app`; task checkbox checked and goal visible for the same account. | `.agents/logs/20-final-web-session.log`, `20-web-smoke.json`, `20-web-smoke.log` |
| Release scripts | PowerShell parser and `bash -n` passed; PowerShell publication exited 0. | `.agents/logs/20-github-release.json` |
| Metadata/offline audit | Exit 0: GitHub HTTP 200, version 1.0.0, exact byte size, offline fallback retained. | `.agents/logs/20-metadata-audit.json` |
| `bunx playwright test --config playwright.public.config.ts --grep 'Android download page'` | Exit 0, 2 tests passed: desktop and phone. Download page, warning, minimum Android version, docs, metadata and redirects passed. | `.agents/logs/20-public-download.log` |
| Public page captures | Exit 0: desktop/phone landing and download pages show 1.0.0 and 109.0 MB, correct stable links and no horizontal overflow. | `.agents/logs/20-public-capture.json` |
| `git diff --check` | Exit 0. | |

Screenshots and XML are in `.agents/screenshots/20/`, at normal font scale. Android tools and the AVD were reused from the earlier Android UI checkout. The initial emulator exited during setup; testing resumed on the same AVD headlessly with 1024 MB RAM. Emulator, local build and browser verification are run separately. No Metro server or local Gradle build was started.

The final emulator briefly showed “System UI isn't responding” under host memory pressure. After the dialog cleared, Kriyan restarted and the smoke passed. QA retries corrected an onboarding wait label, the parser's capitalized task title and web selectors. The first two web assertions timed out on incorrect selectors despite the task/goal appearing in the accessibility snapshots: completion exposes a checkbox, and the goal title is the button's accessible name. Corrected assertions passed. An inline metadata audit failed when PowerShell stripped quotes; the file-based audit passed.

The any-time audit observed open `Reply to Priya about the launch deck`, then completed `Read chapter 6, hash tables` and `Call Amma`, matching each group's saved order. The hint's `planner.hintDismissed` value is persisted in production, and its text/button stayed absent after switching views.

## Screenshots

Before captures from the earlier UI APK: `before-day.png`, `before-goals.png`, `before-onboarding.png`, `before-account.png`, `before-sign-in.png`. The Day capture visibly shows the clipped nested timeline block. The Goals capture shows the linked-task bottom border followed by a separate goal divider.

Before captures from the early signed production build: `before-sign-in-production.png`, `before-onboarding-production.png`, `before-empty-day.png`, `before-empty-list.png`, `before-empty-week.png`, `before-empty-goals.png`.

- After: `after-day-top.png`, `after-day-scroll.png`, `after-day-timeline.png`, `after-anytime-order.png`, `after-goals.png`, `after-onboarding.png`, `after-account.png`, `after-sign-in.png`.
- Empty/first-run: `after-empty-day.png`, `after-empty-list.png`, `after-empty-week.png`, `after-empty-goals.png`. Day includes the first-task prompt and three examples.
- Hint: `after-hint.png`, `after-hint-dismissed.png`, `after-hint-persisted.png`.
- Auth/isolation: `google-flow.png`, `google-cancel.png`, `isolation-empty-day.png`, `isolation-empty-list.png`, `isolation-empty-goals.png`. `google-flow.png` shows Chrome's terms screen, not Google's chooser.
- Smoke: `smoke-quick-add.png`, `smoke-completed.png`, `smoke-goal.png`, `smoke-week.png`, `smoke-sign-out.png`, `production-web-task.png`, `production-web-goal.png`.
- Public pages: `public-download-desktop.png`, `public-download-phone.png`, `public-landing-desktop.png`, `public-landing-phone.png`.

Browser-rendered references: `reference-android-1.png` through `reference-android-8.png`, and `reference-states-1.png`. These are from the required Android and phone-state HTML references.

## Production smoke transcript

Fresh account: `user_3K4pYuMCt1IQoeE2JwxzPTgmQtX`, a disposable `+clerk_test` address. Backend: `https://calm-salamander-183.convex.cloud`.

1. Signed out of the first account. Auth showed no planner data. Sent an email code to the fresh account and verified `424242` on the final APK.
2. Completed onboarding using the default areas, skipping optional projects, events, goal and tasks. Skipped notifications. Day, List and Goals were empty; backend task and goal counts were zero. No first-account data was observed across the captured transitions/views.
3. Quick-added exactly `lunch with Priya 1pm`. The shared parser saved `Lunch with Priya`, local date `2026-10-01`, time `13:00`, duration `null`.
4. Completed the task. Production status is `completed`; its date, time and optional duration are unchanged.
5. Added `Plan my week` with a task-count metric and no target date. Production contains one task and one goal.
6. Opened Week and signed out. Auth returned normally.
7. Stopped the emulator. Created the same account's production web session using the skill. On `/app?view=list&date=2026-10-01`, the task checkbox was checked. On `/app?view=goals`, the goal was visible. Captured both.
8. Reset production data, confirmed its profile was gone, reset development test data and deleted the Clerk account. Also cleaned the first account used for populated visual checks.

**Real-address email code: unverified.** The user was asked for the address to test and its one-time code. Neither was supplied. Test-address codes passed on both accounts.

The Google button opened the browser SSO flow, but Chrome stopped at its first-run terms screen. Computer-use policy requires the user to accept legally binding terms personally, so the user was given the exact handoff command. Cancellation returned to the app. Google's account chooser itself remains unverified until that handoff is performed. Captures: `google-flow.png`, `google-cancel.png`.

## Cleanup and handoff

All accounts created by this run were removed. Final-account receipts: `.agents/logs/20-cleanup-user_3K4nsXaXTARNggq1Ij2NNbTOnJS.json` and `20-cleanup-user_3K4pYuMCt1IQoeE2JwxzPTgmQtX.json`; earlier capture-account receipts are retained. Final `user.mjs list` reports two fixtures and one pre-existing test account, `user_3K4jqIi5flTJyMRKHuFXhaBYFkn`, which this run did not create or modify. Inventory: `.agents/logs/20-user-inventory.json`.

EAS jobs, emulator, QA helpers, browser sessions and the local web server are stopped. The APK is available now; web download-page changes await reviewer push/deployment.

This report is included in the final Brief 20 commit on `v2`. No push, web deployment, backend deployment, repository rename or unrelated GitHub write was performed. The unrelated working-tree edit to `.agents/briefs/21-final-qa-gallery.md` stays outside the release commit.
