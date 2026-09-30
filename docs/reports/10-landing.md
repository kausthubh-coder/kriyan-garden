# Brief 10: landing page

Completed 30 September 2026, after brief 09b. Changes remain uncommitted.

## Implementation

Opened `docs/design/reference/web.html` and `landing.html` in Chromium at 1440 and 390 before implementation, and read the HTML, shared CSS, plan and bundled Next.js server/client and ImageResponse guides.

The landing page follows the reference’s section order, typography, spacing and copy. The hero is the existing `/demo`, 1180 by 640 on desktop and 350 by 560 inside the 390px phone viewport. Its side rail remains visible on desktop, and the four filter chips stay on one row. The iframe is inserted after two animation frames and a short deferred load, only when its reserved frame is visible. The first-paint ordering is checked in a browser test with a real clock.

All feature visuals render on the server from shared app markup and fixed sample data. `Timeline`/`TimelineBlock` and `TaskRow` support presentation without handlers; `GoalSummary`, `WeekLoadChart` and `DeadlineRow` were extracted and are also used by the actual planner. Static visuals have no buttons, drag handles or tab stops and are `aria-hidden`; the adjacent heading and paragraph explain their meaning. No web screenshots appear on the page.

Quick add loads `@kriyan/core` on the first input, reads the visitor’s local day, and displays formatted area, date, time and length tags. It starts empty, with the reference example as a placeholder. The three example chips populate it. All five AI tabs read their snippets from `docs/site/mcp.md`; keyboard navigation, clipboard contents, the two-second “Copied” state and reset are verified. The phone navigation has wordmark, Docs and Open Kriyan on one row; GitHub and Android remain in the footer. Docs retain their article/index layout with the shared navigation and footer.

The Open Graph image now contains the wordmark, new headline and a simplified timeline, using the local Schibsted Grotesk font and shared social-image tokens. Reference sizes were added to core tokens and the generated web/core CSS and native token output.

## Availability checks

- [npm registry](https://registry.npmjs.org/kriyan): HTTP **404**. `packages/cli/package.json` names the package `kriyan`. The terminal example therefore uses `bun run kriyan ...`, backed by the added root script. `bun run kriyan --help` exited 0 and printed the CLI usage and commands. The CLI docs explain running from a clone.
- [GitHub releases API](https://api.github.com/repos/kausthubh-coder/kriyan-garden/releases): **zero releases**, so no APK asset exists. Android buttons say “Get it on GitHub” and link to the repository’s `/releases` page.
- The MCP endpoint in every applicable snippet is `https://app.kriyan.app/mcp`.
- `apps/web/public/landing/android-day.webp` does not exist. The phone frame renders the web phone demo, as requested, with no pending caption. A future build will use that Android image when brief 11 supplies it. These captures are web evidence, not emulator evidence.

The web browsing tool could not fetch the registry/API pages; the facts above were verified directly with `Invoke-RestMethod`. No publishing or cloud setting changes were made.

## Verification

| Command | Actual result |
| --- | --- |
| `bun run typecheck` | Exit 0. Core, CLI, backend, mobile, web and scripts passed. |
| `bun run lint` | Exit 0. CLI, mobile and web passed. |
| `bun run test` | Exit 0. Core 92, backend 42, mobile 2, web 13 Bun plus 45 Vitest, CLI 42 passed. |
| `bun run build` | Exit 0. Optimized web build and all static routes generated. |
| `E2E_BASE_URL=http://localhost:3001 bun run e2e` | Exit 0. **24 passed (2.4m)** against the production build, including all 09b checks, new landing checks, authenticated planner/settings/goal CRUD, captures and cleanup. |
| `PUBLIC_BASE_URL=http://localhost:3001 bun run --filter @kriyan/web test:public --output=../../.agents/screenshots/10/public-results` | Exit 0. **9 passed (42.0s), 1 skipped**. The skip is the desktop pointer-drag case on mobile; touch task editing/completion is covered by the other cases. |
| `git diff --check` | Exit 0, no whitespace errors. |

The landing checks verify server-rendered sample content, no screenshot assets, no focusable static visuals, local-date parsing, all docs-sourced snippets, clipboard contents, phone navigation geometry, desktop rail and single-row filters, exact frame dimensions, no horizontal overflow and no uncaught browser errors. A separate real-clock check verifies that iframe navigation starts after first contentful paint.

Earlier failures and their fixes are preserved in `.agents/10-*.log`: initial fragment wrappers inherited the full app grid/viewport height, now overridden; a hidden phone link lost a CSS specificity comparison, now fixed; clipboard checks needed Windows newline normalization; Playwright’s fixed clock did not expose native performance entries, so paint timing moved to its own real-clock test. A development capture encountered `ERR_NETWORK_IO_SUSPENDED` during overlapping dev/build work; final captures use the production server. The first Lighthouse run scored mobile performance 86 and hit a Windows `EPERM` during launcher temp cleanup. Deferring the unused quick-add parser improved performance; the final audit uses a Playwright-managed profile inside the repository and exits cleanly.

## Lighthouse

Command: `PUBLIC_BASE_URL=http://localhost:3001 PLAYWRIGHT_BROWSERS_PATH=<repository>/.agents/playwright-browsers node .agents/screenshots/10/scripts/lighthouse-10.mjs`. Lighthouse **13.5.0**, production build, desktop 1440 by 900 and default simulated mobile throttling. Exit 0, all required thresholds passed.

| Mode | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | 100 | 100 | 100 | 100 | 412ms | 532ms | 0ms | 0 |
| Mobile | 95 | 100 | 100 | 100 | 917ms | 1967ms | 235ms | 0 |

[Raw summary](../../.agents/screenshots/10/lighthouse/summary.json), [desktop HTML](../../.agents/screenshots/10/lighthouse/desktop.html), [mobile HTML](../../.agents/screenshots/10/lighthouse/mobile.html). These are local production measurements, not a deployed-site audit.

## Captures and comparison

[Side-by-side comparison](../../.agents/screenshots/10/compare.html), [1440 full page](../../.agents/screenshots/10/landing-1440.png), [390 full page](../../.agents/screenshots/10/landing-390.png), [typed example at 1440](../../.agents/screenshots/10/quick-add-1440.png), [typed example at 390](../../.agents/screenshots/10/quick-add-390.png), [Docs at 1440](../../.agents/screenshots/10/docs-1440.png), [Docs at 390](../../.agents/screenshots/10/docs-390.png), [Open Graph image](../../.agents/screenshots/10/opengraph-image.png).

Final capture script: `PUBLIC_BASE_URL=http://localhost:3001 node .agents/screenshots/10/scripts/capture-landing.mjs`. Exit 0. Both page widths and all four iframe layouts (1180, 350 and two 300px phone frames) have zero horizontal overflow and no page errors. [Capture measurements](../../.agents/screenshots/10/capture-results.json). Comparison validation found **four images, zero broken images**; the Open Graph route returned **200 image/png**.

Remaining visible differences and reasons:

1. Desktop content is 1180px wide. The reference CSS puts its 64px padding inside an 1180px wrapper, leaving 1116px of content. The explicit 1180px embed requirement takes precedence; the column is widened 64px so sections stay aligned with it. Phone padding matches the reference.
2. The hero and phone replace the reference’s explanatory placeholders with the real scrolling demo. Dates, counts, completed tasks, timeline starting hour and rail calculations come from its fixtures. Its long-title ellipsis and scrollable panes remain the app’s actual presentation.
3. Quick add initially has placeholder text and no tags, as explicitly required. The typed captures show the reference example parsed. Coarse-pointer chips and navigation use the required 44px targets, larger than some illustrated controls.
4. The static timeline has five items, adding “Project check-in” at 13:00. The reference illustration has four despite the brief asking for five. Class descriptions, date strings and long-title truncation come from the real timeline component.
5. The shared goal formatter says “Behind pace” and “Sat 21 Nov” instead of the illustration’s “1 week behind” and “21 Nov”. The value 42%, expected marker 48% and two of five milestones match. The app’s neutral area label includes its dot.
6. Week bars use the real chart’s capacity scale with 19h total and Friday 50m over; heights differ slightly from the illustrative drawing. List metadata and completion styling stay shared with the app.
7. MCP code exactly matches the docs, so lines, wrapping and block height differ from the illustration. Tabs wrap on phones to retain all five clients and touch targets. Copy has its real success/error states.
8. Terminal and Android copy/links reflect the availability checks: Bun clone commands plus CLI docs, and “Get it on GitHub” releases links.
9. The phone is the allowed web demo fallback until the Android capture exists. The footer includes the required Android link, absent from the reference footer.
10. The hero uses the neutral inset border and omits the reference’s large decorative outer shadow to follow the project’s no-glow treatment.

There are no remaining failed required gates. No commit, push or deployment was performed.
