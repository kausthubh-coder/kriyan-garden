# Kriyan for Android

Kriyan uses Expo SDK 57, React Native 0.86.3 and React 19.2.3. SDK versions were checked against [Expo's SDK reference](https://docs.expo.dev/versions/latest/) and `expo/bundledNativeModules.json`. Use Node 22.13 or newer and Bun 1.3.14. Android is the only mobile target.

The app connects to the same Clerk identity and Convex operations as the web app. Task length is optional. Dates use the profile timezone or the device's local timezone before a profile exists. The shared parser reads quick-add text, and the shared tokens script generates native sRGB colours from the approved OKLCH tokens.

## Install and update

[Check the latest GitHub release](/download) for an Android APK. If the release has no APK asset, a download is not available yet. Download only from the project's release page, open the APK, and allow installs from that source when Android asks. You can turn that permission off after installation. Kriyan is not on the Play Store. You can [use the web app](https://app.kriyan.app/app) on your phone now. The landing page phone image shows the mobile web demo, labelled as such.

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

Email/password sign-in uses Clerk's current `useSignIn` API and secure token cache. The app handles [Device Trust email verification](https://clerk.com/docs/guides/development/custom-flows/authentication/device-trust), authenticator codes and backup codes. Google sign-in uses `@clerk/expo-google-signin` and `useSignInWithGoogle` from `@clerk/expo/google`. Configure the following public values locally and in the chosen EAS environment before building:

```text
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_CONVEX_URL
EXPO_PUBLIC_EAS_PROJECT_ID
EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID
```

The owner must register `app.kriyan.android` in Clerk and Google's Android OAuth settings with the SHA-1 of the actual signing certificate. Follow [Clerk's native Google guide](https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google). Rebuild after changing native configuration. There is no Apple sign-in.

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
./scripts/release-android.ps1 -Version 0.2.0
```

```sh
bash scripts/release-android.sh 0.2.0
```

The scripts bump `app.json` version and Android version code, build the production APK through EAS, download the completed artifact into `.agents/builds`, and create GitHub release `android-v<version>` with the APK attached. They require EAS and GitHub authentication and configured Android signing/push. A failed build leaves the version bump in the working tree for review; restore or choose another version before retrying. They do not commit or push code. Neither release script was run during implementation.

The web `/download` route redirects to the repository's latest GitHub release. Until the owner publishes an Android release, that URL can point to an older release or return no release.
