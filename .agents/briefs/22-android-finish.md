# Brief 22: finish Android 1.0.1, the Android gallery and the reports

You are the only Codex session. Brief 21's session crashed twice on this machine with Windows error 1450 (out of system resources), the last time two minutes after it started the emulator. Treat memory as the main risk:

- Run exactly one heavy thing at a time: the emulator, or Gradle, or a browser, or a web build. Stop one before starting the next (Gradle and the emulator never overlap).
- Before starting the emulator or Gradle, read `Win32_OperatingSystem.FreeVirtualMemory`. Start only with at least 3 GB of commit free (the reviewer lowered this from 5 GB on 2026-10-01: the owner's browser holds about 22 GB and the machine sits near 3.5 GB free, so 5 GB never arrives). While either runs, a watchdog checks every 10 seconds and stops your heavy process at once if free commit falls below 1 GB, so the owner's applications never hit an out-of-memory failure because of this work. Never stop the owner's applications, including the Codex desktop app's own helper processes.
- Order the work to need the least memory: diagnose the blank screen first with the APK that already exists (`.agents/builds/kriyan-1.0.1.apk`, which includes x86_64) on the emulator, with no build at all. Build locally only once you know what to change.
- The emulator is always headless: `-no-window -no-audio -no-snapshot -memory 1024`, with `-dns-server 8.8.8.8,1.1.1.1`. Confirm networking with a real request from the device before any app test, so a dead network is never recorded as an app defect.
- Owner's rule: test Android changes on a local build on this computer (`scripts/build-android-local.ps1`). Use the Expo cloud build once, for the build that will be released, after the local smoke passes.
- Save your progress as you go: commit on `v2` after each job, and keep `docs/reports/21-final-qa.md` current, so a crash loses little.

Read `AGENTS.md`, `.agents/briefs/21-final-qa-gallery.md`, `docs/reports/21-final-qa.md`, `docs/reports/20-android-release.md` and the `test-kriyan` skill.

## State

- Brief 21's web and backend fixes are committed (`0adc5ef`), and the reviewer deployed them: the Convex production deployment and `https://app.kriyan.app` / `https://kriyan.app` now run them. The reviewer also restyled the web email-code sign-in block.
- The Android 1.0.1 source is committed (`75395d6`). EAS build `190704dd-1737-46a9-9bc0-739b628c6293` finished from that source; the APK is `.agents/builds/kriyan-1.0.1.apk`. It is not released.
- On the emulator that APK showed a **blank white screen** at launch and the sign-in checks failed (`docs/design/gallery/android-auth-empty.png`, `.agents/logs/21/android-auth-empty.xml`, `android-native-final.log`). The emulator had no network at the time. Nobody has established whether the JavaScript crashed, hung waiting for Clerk, or was only slow.
- The web and CLI gallery exists (`docs/design/gallery/`, 302 web captures, CLI manifest). The Android section holds only that blank capture.

## Job 1: the blank screen

1. Reproduce on a local build that uses the production public configuration (the `production` profile's `env` in `apps/mobile/eas.json`). Read `adb logcat` for a JavaScript error. Test with the network on and with it off (airplane mode).
2. Whatever the cause, these must hold in the fixed app:
   - The native window and the splash screen use the app background colour from the tokens (`app.json` `backgroundColor`, `android.backgroundColor`, and the `expo-splash-screen` plugin's `backgroundColor`), so nothing white is ever shown, including during a cold start.
   - With the network on, a signed-out launch shows the sign-in form within three seconds of the first frame, and a signed-in relaunch opens Day.
   - With the network off, the app shows a dark screen that says what happened and what to do ("Kriyan could not reach the sign-in service. Check your connection and try again.") with a "Try again" button, within five seconds. It never stays blank and never spins forever.
3. Prove each with a capture and the logcat excerpt.

## Job 2: verify 1.0.1 on the local build

Against production, with `+clerk_test` users from the skill:

- The Android items in brief 21 section 5 (empty Day card and example chips, add row, hidden zero count, centred sign-in, disabled token style).
- Sign-in: email code, password, create account. Cross-surface in both directions: an account created in the Android app signs in on the web (email-code block on `/sign-in`), and an account created on the web with a password signs in on Android and sees the task it added on the web.
- The smoke path from brief 20 and the two-account isolation check.
- Gallery: capture every Android screen and state at normal font scale into `docs/design/gallery/` with seeded sample data and each empty state: sign-in (email code, password, create account, error), offline start, onboarding steps 1 to 5, Day (sample, empty, hint), List, Week, Goals (sample, empty), quick add, task sheet with each property editor, goal sheet, Settings and every destination, Account, delete confirmation. Replace the blank capture, update `android-manifest.json` and regenerate `index.html` with `.agents/scripts/21-gallery-index.mjs`.

Fix what fails, on local builds.

## Job 3: release

Only after job 2 passes:

1. One Expo cloud build with the `production` profile. Version `1.0.1`; raise `versionCode` to 3, since 2 belongs to the unreleased build.
2. Install that APK on the emulator and run the short smoke (cold start, sign in, quick add, complete, sign out) so the released artifact itself is proven.
3. Publish `android-v1.0.1` with `scripts/release-android.ps1`. This brief authorises that one release on `kausthubh-coder/kriyan-garden` and no other GitHub write. Never touch any other repository.
4. Refresh the committed release fallback (`apps/web/src/lib/android-release-info.json`) and confirm `https://github.com/kausthubh-coder/kriyan-garden/releases/latest/download/kriyan.apk` serves the new file (SHA-256 match).

## Job 4: confirm the deployed fixes on production

Short and paced (do not trip the rate limit by accident): the API returns 400 for a time without a date, 404 for another user's task id, 429 with `Retry-After` after a paced burst, and refuses a 181-character title; `/sign-in` reads "Sign in to Kriyan" and the email-code block signs a passwordless user in; phone Week shows compact empty days; the account screen's controls are at least 44px on a phone viewport.

## Job 5: close the reports and clean up

- Finish `docs/reports/21-final-qa.md`: replace the "still running" status, fill every pending section from real receipts, and list each defect with its final status. Finish `docs/reports/13-gallery.md` and `docs/reports/15-functional-qa.md` the same way.
- Delete every test user from Clerk (`user.mjs list` shows only the two fixtures) and their rows from both Convex deployments; show the counts.
- Stop the emulator and every process you started.
- `bun run typecheck`, `lint`, `test`, `build` green. Commit on `v2`. Do not push and do not deploy; the reviewer does both.
