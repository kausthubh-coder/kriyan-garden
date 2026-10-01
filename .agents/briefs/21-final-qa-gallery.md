# Brief 21: final QA against production, review nits, and the screen gallery

You are the only Codex session running. The machine has little free memory: one dev server or one Playwright run or one emulator at a time. Stop every process you start.

Read `AGENTS.md`, `.agents/briefs/15-functional-qa.md`, `.agents/briefs/13-screen-gallery.md` and the `test-kriyan` skill. Brief 15 was started earlier and crashed when the machine ran out of memory; its partial fixes and specs (`apps/web/e2e/functional-qa.spec.ts`, `apps/web/playwright.qa.config.ts`, `.agents/scripts/15-*.{ts,mjs}`, `packages/backend/convex/__tests__/serviceIsolation.test.ts`) are merged. No report was written.

## Job 1: reviewer nits (do these first)

1. Week on a phone (below 700px): a day with nothing in it is a compact row, 56px high, with the day name and date on the left and nothing else. Days with items keep their card. The seven-tall-empty-cards stack goes away. Desktop stays as it is.
2. List, empty day: the "Nothing planned for today." line sits 20px under the add field, not 8px, and uses the same muted text style as the tray's empty lines.
3. Week on desktop: the card for today is marked by the day name in full ink and a 1px `--line-strong` border, not a bright 2px outline. The bright ring is reserved for keyboard focus.
4. Clerk's sign-in card says "Sign in to kriyan" (the Clerk application name is lowercase). Use Clerk's `localization` prop on the provider so the titles read "Sign in to Kriyan" and "Create your Kriyan account", with the subtitle lines in the product's voice (no exclamation marks). Do not change Clerk instance settings.
5. Android, from the reviewer's read of `.agents/screenshots/20/` (release 1.0.0 is published; these go into 1.0.1):
   - Empty Day: the first-task prompt is a card (`--s1` background, 12dp radius, 16dp padding) sitting on the timeline, and its three examples are bordered chips in a wrapping row, left aligned, exactly like the web empty Day. Today they are centred bare text with hour labels showing through beside them.
   - "Add a task" in the Day tray and List is a field-like row: a plus icon and left-aligned muted text on an `--s1` surface, 48dp high, the same as the web add row. Today it is centred bare text.
   - The "N tasks left" count is hidden when N is 0.
   - Sign-in: the block (name, line, form) is vertically centred in the space above the keyboard instead of pinned to the top, and "Send code" at rest (empty email) uses the disabled token style from `packages/core`, not a mid-grey fill with a light border.
   - After these, build 1.0.1 with EAS (same profile, `versionCode` 2), run the production smoke on the headless emulator (`-no-window`), and publish release `android-v1.0.1` with `scripts/release-android.ps1`. This brief authorises that one release. The landing and download pages pick the version up from the release metadata script; commit the refreshed fallback.
6. Run the `unslop` pass over any copy you touch.

Cross-surface sign-in must be proven: an account created in the Android app with an email code can sign in on the web (what does the web sign-in offer it?), and an account created on the web with a password can sign in on Android. If either direction is impossible, fix it in the app (for example a password field on Android, or Clerk's email-code strategy on the web sign-in component) without changing Clerk instance settings, and say what you did.

## Facts about production (checked by the reviewer)

- `https://kriyan.app` serves the landing page, `www` redirects to it, `https://app.kriyan.app` serves the app; the Convex production deployment is `calm-salamander-183`. A test user signed in there and reached onboarding with no page errors.
- Sign-up offers Google or email plus password. Sign-in for a user without a password offers only Google, so the skill's `session.mjs --ui` needs a password user (`user.mjs create --password`); the helper path works for any user.
- One leftover test user exists with rows in production: its email starts with `kriyan-smoke-`. Sign in as it (helper path) and remove it with the app's own delete account flow, which is also your test of that flow on production. Confirm with `user.mjs list` and a production read that nothing remains.

## Job 2: finish brief 15

Do every part of brief 15 that has no evidence yet, this time against both a local build and production (`https://app.kriyan.app`, `https://kriyan.app`), with real `+clerk_test` users made by the skill. Production uses the Clerk development instance and the Convex production deployment; the skill's `seed.mjs` talks to the development deployment only, so on production create data through the UI, the API or MCP. Cover, with real read-backs:

- Web: sign up, onboarding, Day, List, Week, Goals, quick add grammar, task panel, drag on the timeline, repeat, reminders, command palette, keyboard shortcuts, settings, areas with custom names and more than three areas, reset, delete account.
- Landing and docs: every link, the demo, `/download`, the docs pages, 404, Open Graph tags, `robots.txt`, `sitemap.xml`. `https://kriyan.app` serves the landing page and `https://app.kriyan.app/` goes to the app or sign-in.
- MCP, API and CLI on production with the flows from brief 18.
- Isolation: two users, each trying the other's ids through the web backend, the API and MCP.
- Accessibility: axe on every view, keyboard-only pass of Day and the task panel, 200% zoom, reduced motion.
- Performance: Lighthouse on the landing page and the signed-in Day view.

Fix what you find. A bug you cannot fix goes in the report with exact steps.

## Job 3: the gallery (brief 13)

Build the gallery of every screen and state on web (1440 and 390), Android (from the emulator, using the release APK from brief 20 if it is installed, otherwise a local build) and the CLI (terminal captures as text). One HTML page, `docs/design/gallery/index.html`, with the images beside it, grouped by surface and view, each captioned with the state it shows. The reviewer reads this page to judge the design, so capture real seeded data, not blank accounts, plus each empty and error state.

## Finish

`bun run typecheck`, `lint`, `test`, `build`, all e2e suites. Write `docs/reports/21-final-qa.md`: what was tested, where, the result, and every defect found with its status. Delete every test user you created on the Clerk instance and remove their rows from both Convex deployments. Commit on `v2` (one commit per job). Do not push.
