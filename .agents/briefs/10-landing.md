# Brief 10: rebuild the landing page from the reference

Run this after brief 09 has landed. Read `AGENTS.md`. Open `docs/design/reference/landing.html` in a browser at 1440 and 390 wide and read its HTML and CSS. It is the design to port. `docs/design/reference/audit/landing-*.png` show the current page and what is wrong with it: illegible shrunken screenshots, a blurry upscaled crop, placeholder sentences, inconsistent alignment, wrapped chips in the demo, and a navigation that wraps on phones.

## Rules for this page

- Port the reference's structure, sizes, spacing and copy exactly. The copy in the reference is final unless a fact is wrong (see "Facts" below).
- No screenshots of the web app anywhere on the page. Every product visual is built from the real components with sample data, at 1:1 scale:
  - The hero demo is the existing `/demo` embedded at 1180 by 640 (560 tall on phones). At this width the side rail shows and the filter chips stay on one row; fix the embedded layout so nothing wraps or is cut mid-row. On phones the embed shows the phone layout.
  - "When will I do it?" renders the real `Timeline` component with five sample items (a class, a task under the now line, a task with a goal, a marker without a length) inside the framed box. It is static: no drag, no clicks, `aria-hidden` with a text alternative in the heading and paragraph.
  - "Am I on pace?" renders the real goal card and two real deadline rows.
  - "What is left?" renders the real week load chart and three real list rows.
  Build these as small server-rendered fragments that reuse the app components with fixed sample data; extract presentational pieces from the app components where needed so they render without the planner context. Do not fork the markup.
- The only image on the page is the Android phone: use a real screenshot of the Android Day screen from the emulator once brief 11 has produced one (`apps/web/public/landing/android-day.webp`, 2x). Until that file exists, render the phone frame with the web phone layout of the demo inside it and no caption about it being pending.
- Quick-add strip: the input is live and uses `@kriyan/core`. The three "Try" chips fill the input. Tags appear as the visitor types; with the input empty, show the reference example as placeholder text and no tags.
- The AI section's tabs switch the snippet; content comes from `docs/site/mcp.md` so it cannot drift. "Copy" copies the snippet and changes its label to "Copied" for two seconds.
- Navigation on phones: wordmark, "Docs", and the "Open Kriyan" button on one row. GitHub and Android links live in the footer.
- No placeholder or status sentences anywhere ("being finalized", "planned", "pending", "not released yet"). If something is not available, the page does not mention it.

## Facts to check before writing copy

- CLI: check whether the `kriyan` package (or the scoped name the CLI brief chose) is published on npm. If it is, the terminal block uses `npx <name>`. If it is not, the block shows the commands as they will be run from a clone (`bun run kriyan add "..."`) and links to the CLI docs; do not say it is unreleased.
- Android: check whether a GitHub release with an APK exists. If yes, "Download the APK" links to `/download`. If no, the button reads "Get it on GitHub" and links to the repository's releases page.
- MCP endpoint is `https://app.kriyan.app/mcp`.

## Also

- `/docs` pages keep their layout; apply the same navigation and footer components as the landing page so they match.
- Open Graph image: regenerate so it matches the new hero (wordmark, headline, a simplified timeline fragment).
- Lighthouse on `/` at desktop and mobile: performance, accessibility, best practices and SEO all 90 or higher, accessibility 95 or higher. The embedded demo must not block first paint: load it after the hero text is painted and reserve its space so nothing shifts.

## Verify and report

```
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
```

Capture full-page screenshots of `/` at 1440 and 390 wide into `.agents/screenshots/10/`, plus a side-by-side page against the reference. List every difference that remains and why. Write the report to `docs/reports/10-landing.md`. Do not commit.
