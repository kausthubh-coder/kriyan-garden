# Kriyan for Android

Kriyan uses Expo SDK 57, React Native 0.86.3 and React 19.2.3. SDK versions were checked against [Expo's SDK reference](https://docs.expo.dev/versions/latest/) and `expo/bundledNativeModules.json`. Use Node 22.13 or newer and Bun 1.3.14. Android is the only mobile target.

The app connects to the same Clerk identity and Convex operations as the web app. Task length is optional. Dates use the profile timezone or the device's local timezone before a profile exists. The shared parser reads quick-add text, and the shared tokens script generates native sRGB colours from the approved OKLCH tokens.

## Install and update

[Download Kriyan 1.0.0](/download) for Android 7.0 or newer. The download page shows the release version and APK size, read from GitHub at build time with a static fallback. The stable asset is `kriyan.apk`; each release also includes `kriyan-<version>.apk` and its SHA-256 in the release notes.

1. Download the APK.
2. Allow installs from your browser when Android asks.
3. Open the APK and tap Install.

Android will warn about installing outside the Play Store; tap Settings and allow installs from your browser. You can turn that permission off after installation.

Download updates from the same release page. An update must use the same package identity and signing key. Keep the existing app installed when updating. Web and Android use the same account and planner data on Convex.

Task reminders ask for notification permission. Denying it does not stop you planning tasks. You can change permission in Android's app settings. Connectivity and battery settings may delay delivery. Supported Android versions, permissions, native sign-in, notification delivery and update behavior still need verification against the release artifact.

## Develop

From the repository root:

```sh
bun install --frozen-lockfile
bun run scripts/mobile-dev-env.ts
bun run --filter @kriyan/core tokens
bun run --filter @kriyan/mobile typecheck
bun run --filter @kriyan/mobile lint
bun run --filter @kriyan/mobile test
cd apps/mobile
bunx expo install --check
bunx expo-doctor
bunx expo prebuild --platform android --no-install
bun run android
```

The env preparation script copies only the public Clerk publishable key and Convex URL from the local web/backend env. It prints no values. Keep `.env.local` ignored. Native Google sign-in, incoming shared text, quick actions and push require a native build. Expo Go is insufficient. Metro uses Expo's [built-in Bun monorepo resolution](https://docs.expo.dev/guides/monorepos/).

If native directories are present while changing app configuration, run prebuild again. Generated `apps/mobile/android` is ignored; do not commit the debug signing key or generated build files. No iOS directory is generated. `expo-share-intent` 8 explicitly supports SDK 57 and its Apple extension is disabled. Android accepts shared text. Long-press the app icon to choose Add task when the launcher supports shortcuts.

## Authentication and push setup

Email-code sign-in uses Clerk's current `useSignIn` API and secure token cache. Enter your email, tap Send code, then enter the code and tap Verify code. Development test addresses accept `424242`. Continue with Google uses Clerk's browser-based `useSSO` flow with its shared development credentials. It does not require Google client IDs. The hosted product uses the same Clerk development instance as the web app.

The production EAS profile includes these public values:

```text
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_CONVEX_URL
```

The application ID remains `app.kriyan.android`, and the EAS project ID is stored in `app.json`. The backend is the production Convex deployment. EAS owns the Android signing keystore; keep using that keystore for updates. There is no Apple sign-in.

Set up an EAS project and Android Firebase/FCM v1 push credentials following [Expo's Android push setup](https://docs.expo.dev/push-notifications/fcm-credentials/). Link its project ID using `EXPO_PUBLIC_EAS_PROJECT_ID`. The owner configures the corresponding `google-services.json` through their build environment, outside version control. The app config reads `ANDROID_GOOGLE_SERVICES_FILE` if provided. No cloud settings or credentials are changed by the implementation task.

After review, the owner deploys the backend schema, push component and reminder functions together. Until that deployment, a backend without `pushTokens.register` cannot register mobile tokens. Notification permission alone does not prove delivery. Use a dedicated disposable development user, a development backend, and an FCM-enabled physical device or emulator to test a reminder two minutes out. Delete its planner data with `profiles.resetAll`, then delete its Clerk account. Never use the owner's account for tests.

Onboarding explains notification permission before requesting it. The Android channel is Reminders, with default importance and no custom sound. Tapping a push opens the task. Sign-out unregisters this device. Account deletion unregisters push, starts the bounded planner reset, then deletes the Clerk account.

The server schedules each future reminder using the profile timezone. At start and Before start require a task time; Morning of means 09:00 and Day before means 18:00 on the preceding calendar day. DST gaps shift forward; repeated clock times use their first occurrence. Before start subtracts elapsed minutes. Completing, moving and deleting a task cancel pending jobs. Removing a task's date requires clearing its reminders in the same update, which also cancels pending jobs. Tasks accept at most eight reminders. Repeating tasks schedule the next occurrence. Changing timezone reschedules active tasks in bounded batches.

Reminder job state `sent` means handed to the push component. Consult its delivery receipts for transport status. Expo delivery is best effort, and task reminders do not promise alarm-clock precision. Cancellation cannot recall a push already handed to the transport. Convex reconnects and retries pending mutations while the app stays open; the offline message does not promise a durable outbox after app termination.

## Build an APK

The owner signs in interactively without storing credentials in the repository:

```sh
cd apps/mobile
bunx eas-cli@24.8.0 login
bunx eas-cli@24.8.0 build --platform android --profile preview
bunx eas-cli@24.8.0 build --platform android --profile production --non-interactive
```

Both profiles produce installable APKs. Configure signing once through EAS before using non-interactive builds. The development profile includes the Expo development client. The preview and production profiles bundle JavaScript and connect to the configured backend. Use a production Clerk/Convex environment only after the owner configures it.

A local build on Windows uses an existing JDK and an SDK confined to this worktree:

```powershell
./scripts/build-android-local.ps1
```

Install command-line tools, platform-tools, Android platform 36, build-tools 36.0.0, NDK 27.1.12297006 and CMake 3.31.6 under `.agents/android-sdk` first. The script creates a temporary short drive path, adjusts only ignored generated native files, limits Gradle workers and writes `.agents/builds/kriyan-local-x86_64.apk`. Its local Expo CLI wrapper runs Metro from the canonical workspace so Expo Router discovers the app through Bun's junctions. `-Drive L` chooses another unused drive if K is occupied. It restores process environment and removes a mapping that it created.

These adjustments follow [Reanimated's Windows build guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/) and address long paths and CMake/Ninja regeneration errors without changing the Windows registry. The SDK's CMake 3.31.6 includes Ninja 1.12.1. The script does not download tools, create cloud projects or configure credentials.

This ABI targets an x86_64 emulator. Use the EAS profiles for a multi-ABI APK suitable for phones. A local prebuild release uses the generated development signing key unless the owner configures release signing. Do not publish that APK as a production release.

## Publish a release

Only the owner runs release scripts after reviewing and validating the build:

```powershell
./scripts/release-android.ps1 -Version 1.0.0
```

```sh
bash scripts/release-android.sh 1.0.0
```

The scripts resolve this checkout's repository with `gh repo view`, build with EAS when no APK is supplied, and create `android-v<version>` with both `kriyan.apk` and `kriyan-<version>.apk`. Notes include SHA-256, byte size, minimum Android version and installation steps. They require EAS and GitHub authentication. An existing APK can be published with `./scripts/release-android.ps1 -Version 1.0.0 -Apk <path>` or `./scripts/release-android.sh 1.0.0 <path>` after verifying it. The configured version must match. A failed build leaves any version bump in the working tree for review. The scripts do not commit or push code.

The landing page and `/download` page link directly to the latest release's stable `kriyan.apk` asset. The repository URL lives in `KRIYAN_REPOSITORY` in `apps/web/src/lib/origins.ts`, so a repository rename changes one constant.

The release tag targets the checked-out Git commit. That commit must already exist on GitHub. The scripts do not push commits.
