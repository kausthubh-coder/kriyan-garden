# Brief 20: finish the Android app and release the APK

You are the only Codex session running. The machine has little free memory: one emulator, one Metro or one Gradle at a time, never together with a web dev server or Playwright. Stop every process you start.

Read `AGENTS.md`, `docs/design/reference/android.html`, `docs/design/reference/states.html` (the phone parts), `docs/reports/11-android-ui.md`, `apps/mobile/`, `scripts/release-android.ps1` and the `test-kriyan` skill (`.agents/skills/test-kriyan/SKILL.md`).

## Facts

- Production is live: the web app is `https://app.kriyan.app`, the landing page is `https://kriyan.app`, the Convex production deployment is `https://calm-salamander-183.convex.cloud`. Identity is the Clerk **development** instance, in production too. There is no Clerk production instance and there will not be one.
- The GitHub repository is `kausthubh-coder/kriyan-garden` for now (the name `kriyan` is taken by an older, unrelated repository of the owner; the owner may rename later). Do not rename anything on GitHub and never touch any other repository. Keep the repository URL in exactly one place, `KRIYAN_REPOSITORY` in `apps/web/src/lib/origins.ts`, plus `gh repo view --json nameWithOwner` in scripts, so a later rename is a one-line change; docs and README may link it directly.
- Expo (EAS) is logged in on this machine as the owner, on the free plan. `gh` is logged in.
- No paid accounts, no Play Store. The APK is distributed from GitHub releases.

## Job 1: screen leftovers

Fix these, each against the reference, and capture before and after on the emulator at normal font scale:

1. Day: the screen is one vertical scroll. The header and area chips stay fixed; "Any time today", "No date yet" and the timeline scroll together. The nested timeline scroll that clips a block goes away.
2. Any-time tasks: open tasks first, completed tasks after, each group in its saved order.
3. Goals: the subtitle's area dot is vertically centred on the text's x-height line, and there is one divider between cards, not two.
4. Onboarding step 1: area rows are plain list rows with a hairline between them (reference: `.lrow`), not boxed cards.
5. Account and sign-in screens: every control is at least 44dp high.
6. Empty and first-run states from `states.html`: empty Day, List, Week and Goals, and the one-line hint under the first task. Use the same copy as the web app (import shared strings from `packages/core` if the web already put them there; otherwise move them there and use them from both).
7. Copy: nothing on any screen assumes School, Business and Life except the default areas and sample data.

## Job 2: sign-in that works on the development instance

- Email plus code must work for a real address and for `+clerk_test` addresses (code `424242`).
- "Continue with Google": use Clerk's browser-based flow (`useSSO`), which works on a development instance with Clerk's shared credentials and needs no Google client ids. If native Google sign-in code needs `EXPO_PUBLIC_CLERK_GOOGLE_*` ids, show that button only when they are set. Prove the browser flow reaches Google's account chooser and returns to the app on cancel; you cannot complete a real Google login, so stop there.
- Sign out, then sign in as a second user, and confirm no data from the first user is shown at any moment.

## Job 3: production configuration and build with Expo

1. Put the public production values in `apps/mobile/eas.json` under the `production` profile's `env`: `EXPO_PUBLIC_CONVEX_URL` (the production URL above) and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (the development instance's publishable key, read from `apps/mobile/.env.local`; a publishable key is public and may be committed). Nothing secret goes in the file.
2. `bunx eas-cli init --non-interactive --force` to create the Expo project if none is linked, and commit the project id in `app.json`/`app.config.ts` (it is public).
3. Version `1.0.0`, `versionCode` 1, application id unchanged.
4. `bunx eas-cli build --platform android --profile production --non-interactive --wait`. Let EAS create and keep the keystore (do not generate a local one; updates must be signed by the same key). The free queue can take an hour; wait for it. If the build fails, read the EAS log, fix and retry. Only if EAS cannot build at all, fall back to a local `arm64-v8a` build signed with a keystore you generate once into `.agents/keys/` (ignored by git), and say so plainly in the report with the backup instructions for that keystore.
5. Download the APK. Install it on the emulator (`adb install`), sign in as a new `+clerk_test` user, and run the smoke path against production: onboarding, quick add "lunch with Priya 1pm", complete it, add a goal, open Week, sign out. Then confirm in the web app (`https://app.kriyan.app`, same user, Playwright with the skill's `session.mjs --base https://app.kriyan.app`) that the task and goal exist. Delete the user.

## Job 4: release

1. Rewrite `scripts/release-android.ps1` and `scripts/release-android.sh` so they take the repository from `gh repo view`, upload two assets, `kriyan.apk` (stable name) and `kriyan-<version>.apk`, and write release notes with the SHA-256 of the APK, the minimum Android version, and the three-step install instructions (download, allow installs from the browser, open).
2. Create the release `android-v1.0.0` with those assets. This brief authorises that one release and nothing else on GitHub.
3. The landing page download button and `/download` page use `https://github.com/<owner>/<repo>/releases/latest/download/kriyan.apk` and show the version and size read at build time from the GitHub API with a static fallback. The page says, in one plain sentence, that Android will warn about installing outside the Play Store and what to tap. Update `docs/site/android.md` to match.
4. `README.md`: a short "Get Kriyan" section (web, Android APK, MCP, CLI) with the real links.

## Verify and report

`bun run typecheck`, `lint`, `test`, `build`; the mobile QA script on the emulator. Write `docs/reports/20-android-release.md` with the screenshots list, the EAS build URL, the APK SHA-256 and size, the smoke transcript, and anything that failed. Commit on `v2` (one commit per job is fine). Do not push; the reviewer pushes and deploys.
