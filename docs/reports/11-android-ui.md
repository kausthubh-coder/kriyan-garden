# Brief 11: Android UI

Status: COMPLETE. Changes are left in the working tree. No commit, push, deployment or cloud-configuration change was made.

The mobile app now uses the approved Android layout with compact headers, shared controls, task properties, list-based settings, five-step onboarding and Android launcher assets. The report records the remaining visual differences rather than claiming pixel identity.

## Scope and design sources

Read `AGENTS.md`, the brief and `docs/PLAN.md`; opened `docs/design/reference/android.html` and `web.html` sections 3 and 7 in a browser and read their HTML and `ref.css`. The Android emulator QA and agent-browser skills supplied the build/inspection workflow. UI automation used accessibility labels and bounds from live UI XML.

Application changes are confined to `apps/mobile`. Neither web, backend, shared formatters nor generated mobile theme was edited. The root `bun.lock` changed only as the generated dependency receipt for the mobile React type pin. This report and ignored local verification artifacts are the brief's requested exceptions to the mobile source scope. No iOS-specific work was added.

## Implementation

| Brief items | Result |
| --- | --- |
| 1?3 | Shared compact Header, joined date navigation, accessible gear, one summary run, neutral area labels and 36dp chips with 44dp touch targets. |
| 4 | Checkbox task blocks, title/meta/right-hand time, outlined no-length markers, neutral classes and the now line beneath blocks. Existing drag/resize behavior is retained. |
| 5?6 | Inline editable title and notes; Area, Project, Day, Time, Length, Deadline, Goal, Repeat and Reminders property rows. One editor expands at a time. Native date/time pickers are inside editors. Displayed values use the existing shared formatters; no extra core formatter was needed. Saves are serialized to avoid concurrent blur/property updates losing fields. |
| 7 | Goal value and unit, name, neutral area label with dot, date subtitle, real progress/status and linked tasks. Quiet header Add goal action and target tab icon. |
| 8?9 | Week selection/load strip with over-capacity number and words, shared task rows, deadline capacity rows and a three-task preview that expands to the full list. List has area sections, swipe-right completion/reopening and swipe-left Day editing. |
| 10 | Plain quick-add input, parsed tags and one primary Add task action using the existing parser. |
| 11?12 | Settings rows push their own screens; header and Android system back return correctly. Areas have counts and edit sheets with name, eight named swatches, a selected ring, quiet deletion and primary save. Habits has its own functional screen using existing backend operations. |
| 13?15 | Five onboarding steps with pinned Continue and sample/Skip actions. Areas use rows/removal and Add another area. Shared count/summary formatting handles singulars. Body 16sp, meta 13.5sp, section 14.5sp, title 26sp and goal values 38sp; native text follows system scale up to 1.3. |
| 16 | Bundled Schibsted lowercase k adaptive foreground/background, monochrome layer and a plus shortcut icon. The launcher shortcut opens quick add. |

`apps/mobile/src/ui/` owns Header, SegmentedNav, Chip, Check, TaskRow, TaskCard, PropertyList, PropertyRow, Sheet, ListRow, Swatches and the button primitives. Screens consume the generated theme through a mobile adapter. The current theme lacks the brief's 26sp title, 38sp value and 36dp visual-control entries; these additions are centralized in `ui/tokens.ts`, alongside the reference's 380dp timeline viewport. Covered values continue to come from the generated theme.

Mobile `@types/react` is pinned to `~19.2.4` (resolved 19.2.18), matching Expo Doctor's supported range. Bun retains the existing 19.3 types where web dependencies require them. Existing secrets stayed in ignored env files; the disposable identity's credentials and tokens existed only in memory.

## Verification

First command: `bun install`, exit 0, `1365 packages installed [157.20s]`.

All required commands were rerun after the final application changes:

| Command | Real result | Receipt |
| --- | --- | --- |
| `bun run typecheck` | Exit 0; web type generation and every workspace typecheck exited 0. | [typecheck](../../.agents/logs/11-typecheck-final.txt) |
| `bun run lint` | Exit 0; CLI, mobile and web lint exited 0. | [lint](../../.agents/logs/11-lint-final.txt) |
| `bun run test` | Exit 0; 235 tests passed, zero failures. Backend 42, core 92, mobile 2, web Bun 13, web Vitest 45, CLI 41. | [tests](../../.agents/logs/11-test-final.txt) |
| `npx expo-doctor` from `apps/mobile` | Exit 0: `21/21 checks passed. No issues detected!` | [Doctor](../../.agents/logs/11-doctor-final.txt) |
| `git diff --check` | Exit 0. | Run again before handoff. |

No implementation-mirroring UI tests were added. Real emulator checks below provide evidence for the new mobile interactions.

## Native build and emulator

Used the repository's existing `scripts/build-android-local.ps1`, with a repository-local Android SDK, API 36 Google APIs x86_64 image, build tools, NDK 27.1.12297006 and CMake 3.31.6. Existing Java 21 was used. Generated Android files, Gradle caches, SDK, AVD and APKs stay in ignored repository directories. The temporary K: mapping resolved to this repository and was removed after each build.

Build command:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Djava.net.preferIPv4Stack=true'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-local.ps1
```

After prebuild, final UI iterations reused the generated native tree with:

```powershell
./gradlew.bat :app:assembleRelease --console=plain --no-daemon -PreactNativeArchitectures=x86_64 --max-workers=2 '-Dorg.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=768m' -I 'K:/.agents/android-cmake.init.gradle'
```

The incremental environment recipe is retained in [11-incremental.ps1](../../.agents/cache/11-incremental.ps1). The final build output was `BUILD SUCCESSFUL in 5m 56s`, `1021 actionable tasks: 24 executed, 997 up-to-date`; no native verification tasks were disabled. See [final build log](../../.agents/logs/11-build-marker-final.txt).

Final APK: [.agents/builds/kriyan-local-x86_64.apk](../../.agents/builds/kriyan-local-x86_64.apk), 51,962,079 bytes.
SHA-256: `49196751e7f99795fb6fbc17b6026285a287aeefbd546c39d45512f5fe6a70fa`.
This is a development-signed release-mode x86_64 emulator APK, not a store-signed or physical-device release.

Installed with `adb install -r` (`Success`) and launched `app.kriyan.android/.MainActivity`. The Pixel 7 profile ran at 1080?2400 pixels, density 420, New York timezone and 24-hour time. Font scales 1.0 and 1.3 were exercised with `adb shell settings put system font_scale`; scale was restored to 1.0.

Recovered failures and environment limits:

- Expo config initially could not load an imported generated TypeScript theme. The config now reads the theme's background without requiring a TS import loader.
- First Gradle attempt failed resolving `dl.google.com`, `BUILD FAILED in 10m 12s`. Process-local IPv4 preference recovered the build. [Failed attempt](../../.agents/logs/11-build-first.txt).
- PowerShell stderr redirection once treated ordinary Expo plugin output as a terminating native-command error; Python subprocess logging fixed the wrapper. A later logger decoding failure happened after a successful Gradle build; subsequent logs used safe byte capture. [Prebuild wrapper failure](../../.agents/logs/11-build-final-prebuild-failed.txt), [successful full build](../../.agents/logs/11-build-final.txt).
- At 1536MB the emulator produced System UI/launcher ANRs under host memory pressure. A 2048MB AVD recovered; startup also required dismissing one System UI Wait dialog. Later emulator DNS loss prevented a pending onboarding save. Restarting this task's emulator with explicit DNS and restoring Wi-Fi/IPv4 recovered it; the completion was then verified against the backend. No app-level permission or cloud setting was changed.
- Gradle emitted existing deprecation warnings about Gradle 10 compatibility. The successful build used the existing Gradle version.

## Live interaction checks

Created one disposable Clerk **test-instance** user. Signed in through the app, used the test verification flow, then tapped **Use sample data** on onboarding step 1. Sample data was created through `profiles.seedSample` from that UI action, not injected by a fixture helper. Subsequent onboarding captures only reset that user's onboarding flag, without replacing task data.

| Interaction | Verified result |
| --- | --- |
| Swipe right on Call Amma | Backend status became `completed`; swiping again reopened it. |
| Swipe left on Call Amma, choose Tomorrow | Day editor opened and backend date became `2026-10-01`. Restored to Today afterwards. |
| Length editor on signing-fix task | Choosing 30m persisted `durationMinutes: 30`. Restored to 1h. |
| Quick add `QA task tomorrow 7am #life` | Created title QA task, local date `2026-10-01`, time `07:00`, optional duration null. Deleted the QA task afterwards. |
| Area colour | Business saved as Teal; reopening showed Teal selected. Restored Orange. |
| Settings | All eight destinations plus delete confirmation opened and Android back returned correctly; returning to planner worked. Destructive account confirmation was not submitted. |
| Onboarding | Captured all five steps at both scales; Continue/Skip navigation and final completion persisted. [Completion receipt](../../.agents/logs/11-onboarding-complete.json). |
| Launcher | Native popup displayed a plus glyph beside Add task; tapping it opened quick add. Generated adaptive XML includes its monochrome layer. [Launcher](../../.agents/screenshots/11/launcher-shortcut.png), [shortcut result](../../.agents/screenshots/11/shortcut-quick-add.png). |

Backend receipts for task mutations: [11-qa-mutations.json](../../.agents/logs/11-qa-mutations.json). Native captions and XML confirm the restored sample state and swatch selection. These are emulator and real test-backend checks; reminder delivery, physical-device interaction and Play Store signing were not exercised.

Touch-target checks used live accessibility-node bounds divided by emulator density. Across 45 captures (22 screens at each scale, plus the final Day recapture), **504 fully visible controls were checked, with zero undersized controls**. The threshold is 44dp with a 0.5dp pixel-rounding tolerance. Offscreen and scroll-clipped nodes are explicitly excluded; this is a bounds audit, not a TalkBack navigation certification. [Detailed checks](../../.agents/logs/11-targets.txt), [summary](../../.agents/logs/11-touch-summary.json).

## Captures and comparison

[Open compare.html](../../.agents/screenshots/11/compare.html). It pairs each required capture with the corresponding browser-rendered reference and toggles between 1.0 and 1.3 scale. Browser verification loaded all 20 images at normal scale and all 20 at large scale (10 large actual captures), with zero missing images. [Receipt](../../.agents/logs/11-compare-browser.txt).

Captured Day, List, Week, Goals, quick add, Settings, Areas edit, task sheet with Length open and onboarding steps 1 and 5 at both scales. Also captured Areas, every settings destination, delete confirmation and onboarding steps 2?4. PNGs are unedited device captures; adjacent XML retains accessible labels and bounds. Reference crops are from full browser screenshots, avoiding the browser CLI's failed element-screenshot path.

The landing-page asset is [apps/mobile/assets/store/android-day.png](../../apps/mobile/assets/store/android-day.png), **1080?2400**, byte-identical to the final normal-scale Day capture.

### Remaining visible differences and reasons

Across the frames:

- Native device size is about 411?914dp versus the reference's 390?844px. Native status clock/icons, gesture bar, safe insets and proportions differ. Schibsted rasterization, line breaks and native SVG strokes also differ from browser rendering.
- Shared generated/native values differ slightly: timeline hours 56dp versus 62px; task-card radius 12 versus 14; field radius 9 versus 12; sheet radius 24 versus 22; chip gap 8 versus 5; dot-label gap 8 versus 7; checkbox 24 versus 23; small dot 8 versus 9; goal bar 8 versus 6. These centralized native choices use the current mobile theme; the parallel shared-token source was left untouched. Goal sections include a quiet top divider.
- Joined navigation uses 44dp native footprints and 16sp text instead of the static 36px controls and 13.5px text. No-length markers are 52dp high rather than the illustrative 34px so the entire checkbox target fits inside its border; this changes only presentation, never the task's stored duration.
- The summary uses one shared-formatted text run rather than separately bolded fragments. Native task/property/editor rows grow to fit 16sp body text and 44dp targets, changing how much is visible before scrolling. Card titles wrap; List and short timeline titles ellipsize, with full titles available in task details.
- At 1.3 scale, long weekday headers abbreviate (full accessible name preserved), body text wraps and content scrolls. Timed blocks remain aligned to time, and short blocks use a single title line. The normal scale has the full weekday header.
- Onboarding uses 24dp horizontal padding versus 22px; its title is the brief's 26sp versus the HTML's 30px. Settings uses the brief's 26sp title versus the static frame's 20px. Footer positioning follows the device inset. The native keyboard follows system appearance, including spelling/suggestion UI, while the app stays dark.
- Dates, counts, progress and capacity come from the actual sample records and local user date. They are not replaced by illustrative reference values.

- **Day:** The timeline uses the live clock and opens near the current hour. Visible classes, tasks and the now line differ from the fixed 11:45 reference. The seed has longer task titles, a 16:00 invoice and an additional evening task. Completed tasks remain in List. The any-time count includes the word tasks.
- **List:** The seed includes completed reading and another evening reading task. Longer titles and two active Life tasks change the counts and scrolling. The settings gear is present as requested by the brief, though this frame omits it.
- **Week:** The seed has 15h 40m planned instead of the illustrative 19h. Seven active Wednesday tasks use a three-row preview plus Show all tasks. Deadlines use the shared capacity calculation and additional deadline rows continue below. The settings gear is present as requested.
- **Goals:** Dates, linked tasks, status and bars come from the seed and shared goalProgress. The GPA bar is nearly full and its status is Ahead, whereas the reference shows an illustrative partial bar and On pace. Two dated linked tasks appear per goal; the full linked list is available in goal details. A third seeded goal continues below.
- **Quick add:** The explicit #life tag selects Life using the existing parser. The native Android keyboard replaces the Keyboard placeholder. Input, caret, parsed tags and Add task are functional.
- **Settings:** The disposable account, seven classes and meetings, zero habits, notifications Off and actual version 0.1.0 replace the illustrative account, counts, On and 1.0.0. The Account summary ellipsizes its long email while preserving the label.
- **Area edit sheet:** All eight 36dp swatches have 44dp targets, which determine spacing and wrapping. The sheet uses the real Android bottom inset and a 44dp quiet close target.
- **Onboarding step 1:** The heading is 26sp as required by the brief; the HTML onboarding heading is 30px. Rows and remove controls retain 44dp targets. The footer sits above the real navigation inset.
- **Task sheet with Length open:** This reference is the phone frame in web.html section 7, as directed by android.html. The title is inline editable and may wrap. The functional editor includes the required Reminders row, optional-length explanation and custom-minute field omitted by this static frame. Nine property rows scroll while one editor stays open.
- **Onboarding step 5:** android.html supplies only a step-1 frame. This pair compares that shared heading and pinned-footer layout with step 5. Its first-task input, examples and Skip action intentionally differ.

The Android reference has no step-5 frame. The comparison explicitly uses its step-1 frame to assess the common onboarding structure; it does not imply that step-5 content appears in the reference.

## Cleanup and handoff

Reset the disposable user's planner data, deleted its Clerk identity and cleared app-local sign-in data. [Cleanup receipt](../../.agents/logs/11-cleanup.json):

```json
{"plannerDataRemoved":true,"clerkTestUserRemoved":true}
```

Stopped the task's emulator and local reference server, closed its browser session and removed temporary drive mappings. Repository-local SDK, build caches and ignored evidence remain available for review. Changes are uncommitted; no deploy or cloud-configuration change occurred.
