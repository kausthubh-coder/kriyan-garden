# Brief 21: final QA against production, review nits, and the screen gallery

You are the only Codex session running. The machine has little free memory: one dev server or one Playwright run or one emulator at a time. Stop every process you start.

Read `AGENTS.md`, `.agents/briefs/15-functional-qa.md`, `.agents/briefs/13-screen-gallery.md` and the `test-kriyan` skill. Brief 15 was started earlier and crashed when the machine ran out of memory; its partial fixes and specs (`apps/web/e2e/functional-qa.spec.ts`, `apps/web/playwright.qa.config.ts`, `.agents/scripts/15-*.{ts,mjs}`, `packages/backend/convex/__tests__/serviceIsolation.test.ts`) are merged. No report was written.

## Job 1: reviewer nits (do these first)

1. Week on a phone (below 700px): a day with nothing in it is a compact row, 56px high, with the day name and date on the left and nothing else. Days with items keep their card. The seven-tall-empty-cards stack goes away. Desktop stays as it is.
2. List, empty day: the "Nothing planned for today." line sits 20px under the add field, not 8px, and uses the same muted text style as the tray's empty lines.
3. Week on desktop: the card for today is marked by the day name in full ink and a 1px `--line-strong` border, not a bright 2px outline. The bright ring is reserved for keyboard focus.
4. Run the `unslop` pass over any copy you touch.

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
