# Brief 06: Android app and server reminders

Status: PARTIAL. Code, automated checks, a local installable APK and the required task emulator journeys are complete. Live push and native Google sign-in require external configuration and were not passed. All source changes remain uncommitted for supervisor review.

## Changes

- Added the Android-only Expo app in `apps/mobile`, using the approved phone layout, Schibsted Grotesk 400–700, generated core tokens, the shared parser and existing authenticated Convex operations. Day, List, Week, Goals, onboarding, settings, quick add and task editing use real backend data. Task length stays optional.
- Added email/password and native Google sign-in, SecureStore token cache, offline connection status, notification permission explanation, Expo token registration/unregistration, notification task links, Android text sharing and launcher Add task shortcut.
- Added long-press timeline/tray drag, 15-minute snapping, selected block resizing, row swipe completion/scheduling, haptic requests, touch feedback and reduced-motion handling. Explicit controls provide alternatives to gestures.
- Added owner-scoped push tokens and scheduled reminder jobs, the Expo push component, shared timezone/DST calculations, cancellation, repeating-occurrence scheduling, bounded timezone rescheduling and account reset cleanup. Job `sent` means queued to the push component, not delivered to Android.
- Added CI checks, APK EAS profiles, release scripts, a reproducible Windows local build script, safe public mobile env preparation and disposable-user QA helpers. Added the brief's web `/download` redirect only. No unrelated web UI edits.
- Added [Android setup and release documentation](../site/android.md). Release scripts were not run. Source changes remain uncommitted.

## Versions and environment

Verified installed versions against official docs and installed package metadata, rather than relying only on the brief:

| Item | Version |
| --- | --- |
| Bun | 1.3.14 |
| Node | 24.19.0 |
| Expo | 57.0.26 |
| React Native | 0.86.3 |
| React | 19.2.3 |
| Mobile TypeScript | 6.0.3 |
| Clerk Expo / native Google package | 4.7.2 / 1.0.4 |
| Expo push component | 0.3.1 |
| Share intent / quick actions | 8.0.1 / 6.0.2 |
| Existing Java | Temurin 21.0.12.1 |
| Android emulator | 37.1.11 |
| Android platform / build tools | 36 / 36.0.0 |
| Android NDK | 27.1.12297006 |
| Local CMake / Ninja | 3.31.6 / 1.12.1 |

Read-only discovery found an existing Java installation and Expo authentication, but no Android SDK. SDK tools, system image, AVD, downloads, caches and Gradle state were installed inside this worktree's ignored `.agents` directories. The command-line tools archive SHA-256 was `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`.

The Pixel 7 API 36 Google APIs x86_64 emulator booted headlessly. `adb devices` reported `emulator-5554 device`; `adb shell getprop sys.boot_completed` returned `1`. Virtualization and WHPX are available. The supervisor stopped the emulator during compilation to free memory on this 16 GiB host; this is not a virtualization blocker. No visible helper windows were opened.

The supervisor separately linked the existing Expo account, added the public EAS project fields and preview environment values, and submitted an internal preview cloud build. The Android worker did not initiate those cloud actions. No FCM or native Google credentials were configured. No backend deployment or public release was performed by this worker. Convex code generation was used for component type analysis; `convex dev` and `convex deploy` were not run.

## Automated verification

Logs are under `.agents/logs/`. The following are actual command outputs:

```text
bun run typecheck
@kriyan/web typegen: ✓ Types generated successfully
@kriyan/core typecheck: Exited with code 0
@kriyan/backend typecheck: Exited with code 0
@kriyan/web typecheck: Exited with code 0
@kriyan/mobile typecheck: Exited with code 0

bun run lint
@kriyan/mobile lint: Exited with code 0
@kriyan/web lint: Exited with code 0

bun run test
@kriyan/core test: 27 pass, 0 fail, 47 expect() calls
@kriyan/backend test: Test Files 2 passed (2), Tests 24 passed (24)
@kriyan/mobile test: 2 pass, 0 fail, 10 expect() calls

cd apps/mobile; bunx expo-doctor
Running 21 checks on your project...
21/21 checks passed. No issues detected!

cd apps/mobile; bunx expo install --check
Dependencies are up to date

bun install --frozen-lockfile
Checked 1319 installs across 1223 packages (no changes)
```

Total: 53 tests passed. The eight new backend tests cover reminder scheduling and deduplication, move/complete/reopen/delete/date/reminder cancellation, elapsed Before start offsets, DST gaps/folds, recurring next occurrences, profile timezone updates, owner isolation, idempotent token registration, multi-device queueing, stale callback rejection, account reset and safe failure handling. These are controlled tests; they do not prove Expo/FCM delivery.

`bunx tsc -p scripts` passed. PowerShell build/release scripts parsed successfully, Bash release syntax passed, and `git diff --check` passed. Publishing scripts were syntax-checked only.

`bun run build` also passed: Next.js 16.3.3 compiled the web app, checked TypeScript, generated its pages including `/download`, and exited with code 0 (`.agents/logs/root-build.txt`).

Standalone Android export was run from the canonical workspace with source maps, to verify Expo Router includes the app routes. The final native build separately rebundled the current source after the resize adjustment:

```text
bunx expo export --platform android --max-workers 2 --source-maps
› android bundles (2):
_expo/static/js/android/entry-8791a4eeb226e68948cd9a90889403de.hbc (5.4MB)
_expo/static/js/android/entry-8791a4eeb226e68948cd9a90889403de.hbc.map (12MB)
metadata.json (2.1KB)
Exported: dist
```

Source-map inspection found 19 app source files, with both `app/index.tsx` and `app/_layout.tsx` present.

## Native build attempts

The first CMake 3.22.1 build failed after 15m 39s with `ninja: error: manifest 'build.ninja' still dirty after 100 tries`. Updating its bundled Ninja to 1.13.2 exposed a Windows 260-character header path failure. A short-path retry still encountered a regeneration loop. CMake 3.31.6 plus short paths for autolinked native projects resolved native compilation.

The next build failed at Metro workspace resolution because Bun's junctions pointed back to the canonical worktree drive. Moving only the Gradle React root caused `this and base files have different roots`. That approach was removed. A later APK built successfully but crashed with `No routes found`: its 2.6 MB short-path bundle omitted the app route context. That export/build was not a functional pass. The local Expo CLI wrapper now runs Metro from the canonical workspace while Gradle retains its short paths. Metro conditionally watches that workspace; ordinary workspaces retain Expo's automatic monorepo handling. The corrected native bundle includes 2,077 modules and the actual app files. Logs retain the failures in `android-build.txt`, `android-build-short.txt`, `android-build-cmake331.txt` and `android-build-final.txt`.

The complete local build script succeeded:

```text
./scripts/build-android-local.ps1
BUILD SUCCESSFUL in 12m 22s
1021 actionable tasks: 989 executed, 32 up-to-date
Development-signed emulator APK: C:\Users\kaust\Documents\Codex\2026-09-29\ge\work\kriyan-android\.agents\builds\kriyan-local-x86_64.apk
```

The final incremental build includes both the timeline marker target correction and an in-block resize handle. Android clips touches extending outside a parent, so the handle now stays inside the block with a 44dp neutral icon control:

```text
BUILD SUCCESSFUL in 3m 47s
1021 actionable tasks: 24 executed, 997 up-to-date
```

`apksigner.bat verify` returned exit 0. Final APK: `.agents/builds/kriyan-local-x86_64.apk`, 51,929,805 bytes, SHA-256 `96CFE1D264E79A76591EB0169787CC3C268AE47579BA47E170F82D7A344D4113`. This APK is development-signed, x86_64 and intended for emulator review. Do not publish it as a phone production release. The supervisor's earlier cloud preview APK is a separate older snapshot and does not contain the final auth/control fixes.

## Emulator journeys and screenshots

The headless Pixel 7 API 36 emulator installed the APK successfully. Taps and gestures used bounds from Android UI XML, following the Android testing skill. This host occasionally displayed a System UI ANR during boot; selecting Wait let testing proceed. It was separate from the corrected app route crash.

| Journey | Actual result |
| --- | --- |
| Email/password sign-in | Passed with a disposable development user. Clerk required Device Trust email verification; the app completed it using Clerk's documented development test code. No password or token was logged or saved. |
| Onboarding | Visited all five steps, skipped optional project/class/goal creation, finished the final step. Backend `onboardingComplete` changed from false to true. Notification explanation appeared afterward; Skip notifications worked. |
| Quick add | Added `Android QA capture today 7:30am`. Backend returned title `Android QA capture`, date `2026-09-30`, time `07:30`, length null. |
| Timeline drag | Held the timed block and dragged 110 physical pixels. Backend time changed from `09:30` to snapped `10:15`; length remained 45 minutes. Haptics are requested by code; physical vibration was not measured. |
| Resize | On the final APK, selected the timed block and dragged the resize handle. Backend lengths saved as 60 then 105 minutes, in 15-minute steps. Repeated timeline drag also snapped `10:45` to `11:00`. |
| Swipe right | Swiped the any-time row right. Backend status changed to completed. |
| Swipe left | Swiped the marker row left. Schedule sheet appeared; Tomorrow saved date `2026-10-01`. |
| Task sheet | Opened the marker, selected 30m and saved. Backend length changed from null to 30. |
| Week | Seven-day strip, load bars, selected-day list and deadline row rendered from fixtures. |
| Goals | Goal card and milestone rendered. Completing its milestone updated the UI to `100%, Complete`. |
| Shared text | Android ACTION_SEND text opened pre-filled quick add; saving produced backend task `Android shared`, today at `08:00`, length null. |
| Launcher shortcut | Long-pressed the Kriyan icon in the Pixel launcher. Add task appeared and opened the app's quick-add sheet. |
| Offline | Disabled emulator Wi-Fi and data. `Offline, changes will sync` appeared with cached planner content; restored connectivity afterward. |
| Target sizes | Sign-in, onboarding, List, Week and Goals checks passed. Day initially found a marker at about 42dp and the selected resize control clipped to 22dp. Both were corrected and rebuilt. Final Day and selected-state checks passed with 17 and 14 visible controls respectively, no undersized controls. |
| Push delivery and notification tap | Not run: FCM credentials/configuration and deployment of the new push backend functions are absent. No delivery pass is claimed. |
| Native Google sign-in | Not run: Android OAuth client/signing certificate configuration is absent. |

Screenshots and matching UI XML are in `.agents/screenshots/06/`: `day.png`, `list.png`, `week.png`, `goals.png`, `task-sheet.png`, `task-sheet-length.png`, `quick-add.png`, `onboarding-areas.png`, `onboarding-tasks.png`, `goal-details.png`, `share.png`, `offline.png`, `settings.png`, `launcher-shortcut.png`, `launcher-quick-add.png` and `timeline-selected.png`. Day, Week, Goals, task length and selected timeline captures were visually inspected. Earlier startup-failure captures are diagnostic artifacts, not passing evidence. Screenshots of sign-in were taken with blank credential fields only.

Disposable-user cleanup reset planner rows through authenticated operations, verified no remaining tasks, deleted the Clerk user, cleared app storage and removed temporary device UI XML. `.agents/logs/android-qa-cleanup.json` reports `plannerResetVerified`, `disposableUserDeleted` and `deviceSessionCleared` all true. An independent paginated Clerk query returned `disposableAndroidUsersRemaining: 0` (`android-user-cleanup.txt`). The QA helper and headless emulator were stopped after cleanup.

## Unmet external gates

- Configure native Google Android OAuth for `app.kriyan.android`, the signing certificate SHA-1, Clerk's native app settings and public Google client IDs; rebuild and exercise Google sign-in.
- Configure Firebase/FCM v1 and the corresponding Android `google-services.json` through the build environment. The EAS project ID alone is insufficient for push.
- After review, deploy the backend schema, push component and reminder functions together to the intended development backend. This task did not deploy shared functions.
- Then schedule a reminder two minutes out, observe the actual Android notification and tap it to open the task. Live delivery is untested, not passed.
- Review signing and production environment configuration before running the release scripts. No GitHub release was created and no source was committed or pushed.
