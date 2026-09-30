# Brief 04: landing, public demo, docs and open-source files

Local implementation and required local verification: **PASS**. Production/client/release integration: **PARTIAL**, with the limits below explicitly visible in the public copy. Changes are uncommitted for supervisor review.

Worktree: `C:/Users/kaust/Documents/Codex/2026-09-29/ge/work/kriyan-landing`. Base and current HEAD: `09542a0f6e5ed79e0d6a212dbbcf9f8d9a74ca80`. Only this worktree was edited. The local production preview runs at <http://localhost:3004>. No commit, push, publication, deployment, cloud configuration change or shared account/backend mutation was performed. Environment files were neither printed nor included in the report.

## Implemented behavior

- Landing follows the brief's section order, hero copy, neutral controls, Schibsted Grotesk, dark shared tokens, 1180px column, alternating screenshot rows and 620px framed demo. The public page is server-rendered; client interaction is confined to the embedded demo, parser strip and snippet tabs. No scroll animation was added.
- `/demo` mounts the existing `AppShell`, Day, List, Week, Goals, timeline, tray, quick add and task panel. It uses a provider-selected data-access implementation and a per-mount memory store. The default implementation continues to use Convex and the existing optimistic updates and undo behavior. There is no second Day UI, mock identity, local storage or demo backend request.
- Demo sample tasks and events reproduce the approved prototype, relative to the visitor's local day. Sample goals use the real shared progress calculation. A sample 11:45 time marker makes the sample timeline useful at any visiting hour; its date still comes from the visitor, not server UTC. Changes reset on reload. Settings and onboarding are unavailable inside the memory demo.
- Shared pure day assembly and repeat-date arithmetic were extracted unchanged from the backend and reused by the demo. Real goal and task form actions use the injected transports. Backend identity checks and database operations were not changed.
- Marketing hosts retain public pages and redirect product/auth/automation paths to `https://app.kriyan.app`, preserving query strings. The app host root redirects to `/app`. Local and preview hosts are retained. Development links stay on the local origin; production links use the app origin. The existing legacy planner redirect remains functional.
- Only `/demo` permits same-origin framing. Other routes retain their frame denial. Metadata, canonical URLs, robots, sitemap, `next/og` social image, privacy, terms and the GitHub latest-release redirect are implemented.
- Nine Markdown docs render through a static optional catch-all route with a desktop index and phone menu. Unknown slugs return a clean 404. Public docs and demo do not initialize Clerk browser scripts.
- Quick-add grammar and examples share executable fixtures with core tests. `bun run docs:quick-add` regenerates the table, and the root test command rejects stale generated docs.
- Added contributing/security/code-of-conduct documentation, issue/PR templates and the README front page. Contributor Covenant 2.1 is retained with its attribution and the requested contact email. MIT licensing remains in place. Schibsted font files ship locally with their OFL license, avoiding a build-time Google Fonts request.

## Integration notes and limitations

1. **Brief 03c overlap:** `AppShell.tsx` only swaps planner/selected-task access for the injected hooks and adds demo routing/onboarding guards. `GoalsView.tsx` only swaps its mutation import/calls for `useGoalActions`. `GoalForm.tsx` does the same for goal creation. Preserve these hooks when integrating 03c's polishing. **No changes to `TaskPanel.tsx` or `App.module.css`.** The adapter preserves the original Convex transports by default. Regenerate the public captures after 03c lands so the assets reflect the reviewed final app.
2. **Optional task length:** `SideRail.tsx` previously invented a one-hour estimate when length was unset. It now says “Length not set” and shows free time without a fabricated shortage/spare figure. This small shared correction is necessary to satisfy the explicit product rule.
3. **Brief 05:** no `docs/mcp.md`, `docs/api.md` or `docs/cli.md` existed at this base. Nothing was deleted or overwritten. `docs/site/mcp.md` contains clearly labeled client setup drafts, while API/CLI pages explicitly await the finalized schemas, auth, scopes, commands and verification. The landing extracts the exact fenced snippets from the MCP page, so replacing that source updates the tabs. Keep the five `##` client headings and their first fenced snippets, or update the extractor when integrating. Neither npm availability nor a live client OAuth connection was claimed or tested.
4. **Brief 06:** no verified APK or native Android capture is available in this worktree. The phone image is a real **mobile web demo** capture and is labeled as such in copy, alt text and caption. Download buttons link the planned GitHub latest-release route, with explicit “not released yet” text. Final Expo configuration, signed APK availability, native capture and notification verification remain with 06.
5. **Production privacy:** the actual Convex region is not established by this checkout. The legal page explicitly requires its disclosure before launch rather than inventing a region. Export/deletion behavior and the distinction between planner deletion and Clerk identity deletion await 03c integration review.
6. **Checks deliberately not run:** authenticated account E2E, real OAuth connections, live API/CLI operations, Android builds/downloads/push and production host/DNS checks. They would require the other workers' deliverables or data/cloud scope outside this brief. Host routing was tested locally with real HTTP Host headers, not by changing DNS. Existing backend isolation tests ran locally through convex-test.

## Commands and real outputs

Commands below ran in the worktree root unless a workspace is specified. Bun version was `1.3.14 (0d9b296a)`, Next `16.3.3`, Playwright Chromium/Chrome for Testing `153.0.8010.12`, Lighthouse `13.5.0`. Port 3004 was used throughout web checks.

Initial `bun install` installed 473 packages in 103.05s. Added `react-markdown@10.1.0` and `remark-gfm@4.0.1` for server Markdown rendering, and Lighthouse plus its script dependencies as dev dependencies. Bun is the only lockfile/package manager. Final frozen installation output is saved in `.agents/logs/04/install-frozen.txt`.

```text
bun install --frozen-lockfile
bun install v1.3.14 (0d9b296a)
Checked 683 installs across 775 packages (no changes) [13.29s]
```

The capture scripts directly declare `chrome-launcher@1.2.2` and `sharp@0.35.4`; these match the versions already exercised by the final captures and Lighthouse run.

```text
bun run docs:quick-add
Generated docs/site/quick-add.md from tested grammar fixtures.

bun run typecheck
@kriyan/web typegen: Generating route types...
@kriyan/web typegen: ✓ Types generated successfully
@kriyan/web typegen: Exited with code 0
@kriyan/core typecheck: Exited with code 0
@kriyan/backend typecheck: Exited with code 0
@kriyan/web typecheck: Exited with code 0

bun run lint
@kriyan/web lint: Exited with code 0

bun run test
Quick-add docs match tested grammar fixtures.
@kriyan/core test: 80 pass, 0 fail, 100 expect() calls
@kriyan/backend test: Test Files 1 passed (1), Tests 16 passed (16)
@kriyan/web test: 3 pass, 0 fail, 51 expect() calls
All three workspace test commands exited with code 0.

bun run build
@kriyan/web build: ▲ Next.js 16.3.3 (Turbopack)
@kriyan/web build: ✓ Compiled successfully in 8.4s
@kriyan/web build: Finished TypeScript in 14.2s
@kriyan/web build: ✓ Generating static pages using 15 workers (26/26) in 1352ms
@kriyan/web build: Exited with code 0
```

The full outputs, including the route table and individual test names, are in `.agents/logs/04/typecheck-final.txt`, `lint-final.txt`, `test-final.txt` and `build-final.txt`. The abbreviated unit lines above combine adjacent real output lines; the actual total is **99 passing tests**. Build prerenders landing/demo/legal/metadata and all nine docs. Product/auth/MCP routes remain dynamic.

Web server commands used:

```sh
bun run --filter @kriyan/web dev --port 3004
# Production verification after build:
bun run --filter @kriyan/web start --port 3004
bun run --filter @kriyan/web test:public
bun run --filter @kriyan/web capture:public
bun run --filter @kriyan/web lighthouse:public
```

Final browser output:

```text
Running 8 tests using 1 worker
7 passed (13.8s)
1 skipped
@kriyan/web test:public: Exited with code 0
```

Covered on desktop and mobile: create a task with no length, panel length edit, complete/undo, List/Goals/Week navigation, reload reset, absence of Convex/Clerk requests or sockets, real embedded demo, parser examples, keyboard snippet tabs, clipboard feedback, docs navigation, route responses, 404, framing headers, release redirect and host redirects. Desktop also places a tray task on the timeline, moves it and resizes it. The **mobile pointer-drag test is explicitly skipped**, because the phone flow uses task details; mobile task details editing is exercised and passes. Chromium clipboard permissions were granted only to the local test context. The unrelated authenticated suite was not run. Full output: `.agents/logs/04/public-final.txt`.

Final capture output:

```text
Captured real Day, Goals, List, Week, deadlines and mobile web; landing/docs at 1440 and 390. No overflow or page errors.
@kriyan/web capture:public: Exited with code 0
```

`git diff --check` also passed with no output.

## Lighthouse

All four required desktop category scores are at least 90, and all accessibility scores are at least 95. **No warnings in the final run.** Scores apply to the local production build, not a deployed service or the separate Android app.

| Route | Mode | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | Desktop | 100 | 100 | 100 | 100 | 293ms | 756ms | 0ms | 0 |
| `/` | Mobile | 96 | 100 | 100 | 100 | 910ms | 2792ms | 17ms | 0 |
| `/docs` | Desktop | 100 | 100 | 100 | 100 | 249ms | 541ms | 0ms | 0 |
| `/docs` | Mobile | 98 | 100 | 100 | 100 | 914ms | 2390ms | 68ms | 0 |

Desktop: 1440x900, DPR 1, simulated RTT 40ms, throughput 10240Kbps, CPU factor 1. Mobile: Lighthouse defaults, 412x823, DPR 1.75, simulated RTT 150ms, throughput 1638.4Kbps, CPU factor 4. Mobile captures and browser journeys separately use the requested 390x844 viewport. The runner uses the installed Playwright Chromium executable and Chrome DevTools protocol. Raw metric precision, individual audits and configuration are in the JSON reports.

Final real output:

```text
{"route":"/","formFactor":"desktop","scores":{"performance":100,"accessibility":100,"best-practices":100,"seo":100},"warnings":[]}
{"route":"/","formFactor":"mobile","scores":{"performance":96,"accessibility":100,"best-practices":100,"seo":100},"warnings":[]}
{"route":"/docs","formFactor":"desktop","scores":{"performance":100,"accessibility":100,"best-practices":100,"seo":100},"warnings":[]}
{"route":"/docs","formFactor":"mobile","scores":{"performance":98,"accessibility":100,"best-practices":100,"seo":100},"warnings":[]}
Required Lighthouse thresholds: PASS
@kriyan/web lighthouse:public: Exited with code 0
```

The first run numerically passed (landing 99 desktop/94 mobile, docs 100/98), but landing had “The page loaded too slowly to finish within the time limit. Results may be incomplete.” That run was not treated as final. The iframe was changed to native lazy loading; the real demo still loads in the visible hero and is verified by Playwright. Final Lighthouse completed twice without warnings. Initial reports are preserved in `.agents/screenshots/04/lighthouse-initial/` and initial output in `.agents/logs/04/lighthouse.txt`.

## Captures and visual inspection

All screenshots were captured from the local running application with the actual shared components and memory data. No authenticated account data, generated illustration, reconstructed UI or Android screenshot was used.

- `.agents/screenshots/04/landing-1440.png` (1440x6409) and `landing-390.png` (390x6260): required full-page landing captures.
- `docs-1440.png` (1440x1553) and `docs-390.png` (390x2112): full-page docs captures.
- `demo-day-1440.png`, `demo-goals-1440.png`, `demo-list-1440.png`, `demo-week-1440.png`: raw 1440x900 source captures.
- `demo-mobile-web-390.png`: raw 390x844 mobile web capture.
- `opengraph-image.png`: actual generated 1200x630 social image response, saved with `Invoke-WebRequest -Uri http://localhost:3004/opengraph-image -OutFile .agents/screenshots/04/opengraph-image.png`.
- `capture-results.json`: source/viewport record and empty page-error list.
- `apps/web/public/landing/{day,goals,list,week,deadlines,mobile-web}.webp`: actual cropped/encoded site assets. The deadlines asset is cropped from the real Day rail. The mobile asset is explicitly web.

Visually inspected desktop and phone landing/docs, real Day/Goals/mobile captures, the screenshot rows including List/Week, and the generated social image. Confirmed dark palette/type, alternating desktop rows, stacked phone layout, readable copy, framed live demo, phone docs menu, visible availability labels, intact images and no horizontal page overflow. Added explicit focus-visible styling to the docs summary and tab panel. The capture script waits for fonts, scrolls lazy images into view and decodes them before full-page screenshots; it listens for errors on every capture page.

Screenshots and raw logs are ignored artifacts, intentionally left locally for the supervisor. The WebP site assets and font license files are normal reviewable source files.

## Failures found and resolved

- Initial typecheck found an adapter selected-task return mismatch (`null` versus the existing hook's `undefined`). The memory adapter now preserves the existing return contract. Subsequent full typechecks passed.
- Initial lint found plain public anchors under the Next client-link preference and an unescaped apostrophe. Public-only components document the deliberate server navigation with a narrowly scoped rule disable; the apostrophe was escaped. Final lint has no errors or warnings.
- Early browser harness failures clicked noninteractive timeline title text, raced panel closure, assumed an incorrect resize target and misclassified local JS filenames as external Clerk/Convex traffic. Tests now use the real group/resize targets, await closed dialogs and inspect request/socket hostnames. These checks passed in development and production.
- Production capture initially timed out waiting for lazy images while hydration reset an imperative eager flag. The capture script now scrolls each image into view and awaits decoding. Final capture completed without overflow/page errors.
- Unknown docs slugs initially exposed a Next `NoFallbackError` with `dynamicParams = false`. The explicit slug whitelist and `notFound()` now handle unknown slugs without that internal error, while known pages remain prerendered.
- The proxy refactor initially left the existing legacy redirect inside an identity wrapper no longer called for that public path. Review caught this before completion and restored the redirect before wrapper selection. Its added regression assertion initially failed with `TypeError: Invalid URL` because Next returned a relative local Location header. The assertion now resolves against the local base; the actual 307 and target pass on both viewports. That failure log is preserved in `.agents/logs/04/public-legacy-test-failure.txt`.
- Initial Lighthouse landing timeout warnings were resolved as described above. No failed required checks remain. The mobile pointer-drag skip and external integration limits remain explicit.

## Framework and provider references

Read `AGENTS.md`, the whole brief, `docs/PLAN.md` and all three approved prototype files before implementation. Bundled Next guides were consulted under `node_modules/next/dist/docs/01-app/`, including server/client boundaries, route handlers, proxy, font, async route params/static params, ImageResponse, Open Graph metadata, robots and sitemap conventions. Implementation uses `proxy.ts`, async optional catch-all params, `next/font/local`, static generation and `next/og` for this installed Next version.

Current official references checked: [Next proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [Next Open Graph image conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image), [Next image component](https://nextjs.org/docs/app/api-reference/components/image), and [Clerk middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware). The existing protected app gate remains `auth.protect()` inside Clerk middleware; public routes avoid the identity wrapper.

Setup draft syntax was checked against [Claude Code MCP](https://code.claude.com/docs/en/mcp), [VS Code MCP configuration](https://code.visualstudio.com/docs/agent-customization/mcp-servers) and [ChatGPT developer mode](https://developers.openai.com/api/docs/guides/developer-mode). These references verify client syntax, not this deployment's connectivity. All five client connections still require 05 verification. The code of conduct comes from the [official Contributor Covenant 2.1 source](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md).

## File manifest

The following lists every authored/generated reviewable file created or modified for this brief. Dependency installs, `.next` output and browser caches are excluded; screenshots/logs are listed separately above and below. No env file is included.


### Modified files

- README.md
- apps/web/next.config.ts
- apps/web/package.json
- apps/web/src/app/layout.tsx
- apps/web/src/app/page.tsx
- apps/web/src/app/tokens.css
- apps/web/src/components/app/AppShell.tsx
- apps/web/src/components/app/GoalForm.tsx
- apps/web/src/components/app/GoalsView.tsx
- apps/web/src/components/app/SideRail.tsx
- apps/web/src/components/app/usePlanner.ts
- apps/web/src/components/app/useTaskActions.ts
- apps/web/src/lib/origins.ts
- apps/web/src/proxy.ts
- bun.lock
- package.json
- packages/backend/convex/model/day.ts
- packages/backend/convex/model/tasks.ts
- packages/backend/package.json
- packages/core/src/quickAdd.test.ts
- packages/core/src/tokens.css
- packages/core/src/tokens.ts

### Created files

- .github/ISSUE_TEMPLATE/bug.md
- .github/ISSUE_TEMPLATE/feature.md
- .github/PULL_REQUEST_TEMPLATE.md
- CODE_OF_CONDUCT.md
- CONTRIBUTING.md
- SECURITY.md
- apps/web/e2e/public/public.spec.ts
- apps/web/playwright.public.config.ts
- apps/web/public/fonts/OFL.txt
- apps/web/public/fonts/SchibstedGrotesk-SemiBold.ttf
- apps/web/public/fonts/SchibstedGrotesk.woff2
- apps/web/public/landing/day.webp
- apps/web/public/landing/deadlines.webp
- apps/web/public/landing/goals.webp
- apps/web/public/landing/list.webp
- apps/web/public/landing/mobile-web.webp
- apps/web/public/landing/week.webp
- apps/web/scripts/capture-public.mjs
- apps/web/scripts/lighthouse-public.mjs
- apps/web/src/app/demo/page.tsx
- apps/web/src/app/docs/[[...slug]]/page.tsx
- apps/web/src/app/download/route.ts
- apps/web/src/app/opengraph-image.tsx
- apps/web/src/app/privacy/page.tsx
- apps/web/src/app/robots.ts
- apps/web/src/app/sitemap.ts
- apps/web/src/app/terms/page.tsx
- apps/web/src/components/app/dataAccess.tsx
- apps/web/src/components/demo/Demo.module.css
- apps/web/src/components/demo/Demo.tsx
- apps/web/src/components/demo/seed.ts
- apps/web/src/components/demo/store.test.ts
- apps/web/src/components/demo/store.ts
- apps/web/src/components/public/Chrome.tsx
- apps/web/src/components/public/DocPage.tsx
- apps/web/src/components/public/Public.module.css
- apps/web/src/components/public/QuickAddStrip.tsx
- apps/web/src/components/public/SetupTabs.tsx
- apps/web/src/lib/docs.ts
- apps/web/src/lib/origins.test.ts
- docs/reports/04-landing-docs.md
- docs/site/android.md
- docs/site/api.md
- docs/site/cli.md
- docs/site/index.md
- docs/site/mcp.md
- docs/site/privacy.md
- docs/site/quick-add.md
- docs/site/self-hosting.md
- docs/site/terms.md
- packages/backend/convex/model/assemble.ts
- packages/backend/convex/model/nextDate.ts
- packages/core/scripts/quick-add-docs.ts
- packages/core/src/quickAddCases.ts
- packages/core/src/quickAddGrammar.ts

### Local verification artifacts

- .agents/logs/04/build-final.txt
- .agents/logs/04/build.txt
- .agents/logs/04/captures-final.txt
- .agents/logs/04/captures.txt
- .agents/logs/04/install-frozen.txt
- .agents/logs/04/lighthouse-final.txt
- .agents/logs/04/lighthouse.txt
- .agents/logs/04/lint-final.txt
- .agents/logs/04/lint.txt
- .agents/logs/04/public-dev.txt
- .agents/logs/04/public-final.txt
- .agents/logs/04/public-legacy-test-failure.txt
- .agents/logs/04/public-production.txt
- .agents/logs/04/test-final.txt
- .agents/logs/04/test.txt
- .agents/logs/04/typecheck-final.txt
- .agents/logs/04/typecheck.txt
- .agents/screenshots/04/capture-results.json
- .agents/screenshots/04/demo-day-1440.png
- .agents/screenshots/04/demo-goals-1440.png
- .agents/screenshots/04/demo-list-1440.png
- .agents/screenshots/04/demo-mobile-web-390.png
- .agents/screenshots/04/demo-week-1440.png
- .agents/screenshots/04/docs-1440.png
- .agents/screenshots/04/docs-390.png
- .agents/screenshots/04/landing-1440.png
- .agents/screenshots/04/landing-390.png
- .agents/screenshots/04/lighthouse-initial/docs-desktop.html
- .agents/screenshots/04/lighthouse-initial/docs-desktop.json
- .agents/screenshots/04/lighthouse-initial/docs-mobile.html
- .agents/screenshots/04/lighthouse-initial/docs-mobile.json
- .agents/screenshots/04/lighthouse-initial/landing-desktop.html
- .agents/screenshots/04/lighthouse-initial/landing-desktop.json
- .agents/screenshots/04/lighthouse-initial/landing-mobile.html
- .agents/screenshots/04/lighthouse-initial/landing-mobile.json
- .agents/screenshots/04/lighthouse-initial/summary.json
- .agents/screenshots/04/lighthouse/docs-desktop.html
- .agents/screenshots/04/lighthouse/docs-desktop.json
- .agents/screenshots/04/lighthouse/docs-mobile.html
- .agents/screenshots/04/lighthouse/docs-mobile.json
- .agents/screenshots/04/lighthouse/landing-desktop.html
- .agents/screenshots/04/lighthouse/landing-desktop.json
- .agents/screenshots/04/lighthouse/landing-mobile.html
- .agents/screenshots/04/lighthouse/landing-mobile.json
- .agents/screenshots/04/lighthouse/summary.json
- .agents/screenshots/04/opengraph-image.png
