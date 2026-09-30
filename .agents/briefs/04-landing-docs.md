# Brief 04: landing page, demo mode, docs, and open-source files

Read `AGENTS.md`, `docs/PLAN.md` sections 10 and 12, and the app components in `apps/web/src/components/app/`. The landing page uses the same tokens, typeface and dark palette as the app. It must look like the same product.

## Hosts and routes

- `kriyan.app` and `www.kriyan.app` serve the landing page and docs. `app.kriyan.app` serves the app. Update `apps/web/src/lib/origins.ts` so the app origin is `https://app.kriyan.app` and the proxy redirects `/app/*`, `/sign-in`, `/sign-up`, `/mcp` and `/api/*` from the marketing host to the app host, and `/` on the app host to `/app`. In development everything is on `localhost:3000`.
- Routes: `/` (landing), `/demo` (demo mode, also embedded in the landing hero), `/docs/*`, `/privacy`, `/terms`, `/download` (redirects to the latest GitHub release), `/sitemap.xml`, `/robots.txt`, `/opengraph-image` (generated with `next/og`, dark, wordmark plus one line).

## Demo mode

`/demo` renders the real Day view components with an in-memory store instead of Convex, seeded with the prototype's sample data dated relative to today, and no sign-in. Everything works (quick add, drag, complete, panel) but nothing persists across reloads. Implement it by putting a small data-access interface in front of the Day view (the hooks the components call) with two implementations: Convex and in-memory. Do not fork the components. The demo shows a small unobtrusive bar at the top: "This is a demo with sample data. Nothing is saved." with "Open Kriyan" and "Sign up".

## Landing page (`/`)

Static, fast, no client JavaScript except the embedded demo, the quick-add strip and the setup-snippet tabs. Sections in order:

1. **Nav**: wordmark, links Docs, GitHub, Download, and a primary "Open Kriyan" button.
2. **Hero**: headline "Your day on one timeline." Subline: "Kriyan is an open-source planner for school, business and life. Tasks with a time sit on the timeline. Tasks without one wait beside it. Length is optional." Buttons: "Open Kriyan" (primary) and "Download for Android". Below the copy, the live demo (`/demo` content rendered inline, 1100px wide max, 620px tall, with a subtle frame) and a caption "Try it. Nothing you do here is saved."
3. **Quick add strip**: a single input with the heading "Type it the way you would say it." As the visitor types, chips show what was understood, using `@kriyan/core` in the browser. Three example buttons that fill the input: `gym tomorrow 7am`, `essay fri #econ 2h`, `call amma`.
4. **Three answers**: three rows, alternating image and text, each with a real screenshot (take them from the running app with sample data at 1440x900, crop to the relevant region, save as WebP in `apps/web/public/landing/`):
   - "When will I do it?" The Day view. Two sentences on the timeline, the tray and optional length.
   - "Am I on pace?" The Goals view and the deadlines rail. Two sentences on the pace marker and time needed against time free.
   - "What is left?" The List and Week views. Two sentences on areas and the week load.
5. **Works with your AI**: heading "Plan with whatever AI you already use." One paragraph on the MCP server. Tabs for Claude, Claude Code, ChatGPT, Cursor and VS Code with the exact setup snippet from `docs/mcp.md` for each, with a copy button. Below, the CLI: `npx kriyan add "essay fri 5pm #econ"` and `npx kriyan today` in one code block, and a link to the CLI docs.
6. **Android**: "Kriyan on your phone." One paragraph, a phone screenshot at 390x844 in a device frame, and the "Download the APK" button pointing at `/download`. One line under it: "Not on the Play Store. Download from GitHub and allow installs from this source."
7. **Open source**: "Read every line." MIT licence, GitHub link, self-hosting docs link, and the sentence "The hosted version is free. Your data is yours to export or delete at any time."
8. **Footer**: Docs, GitHub, Privacy, Terms, "Made by Kausthubh".

Copy rules: sentence case, no exclamation marks, no buzzwords (streamline, empower, supercharge, seamless), no em dashes. Headline sizes from the tokens; the hero headline may go to 64px on desktop and 40px on phones. Layout is a single 1180px column with generous vertical rhythm; no card grids. Motion: none on scroll. The demo and screenshots are the only visuals; no illustrations, no gradients.

## Docs (`/docs`)

Markdown files in `docs/site/` rendered by a `/docs/[...slug]` route with a left index on desktop and a top menu on phones. Pages:

- `index.md` Getting started (sign up, areas, quick add, the timeline, optional length, goals).
- `quick-add.md` The grammar, with a table of every token the parser understands, generated from tests so it cannot drift (write a script that extracts the table from `packages/core/src/quickAdd.test.ts` cases, or keep a single source file both use).
- `mcp.md` and `api.md` and `cli.md` (move the existing files from `docs/` into `docs/site/` and link them).
- `android.md` Installing the APK, updating, notifications and permissions.
- `self-hosting.md` Clerk, Convex, Vercel, environment variables, Expo build; honest about what takes a day.
- `privacy.md` and `terms.md`, plain language: what is stored (account email from Clerk, the planner data), where (Convex, region), who can see it (only you; the operator can access the database for maintenance), export and deletion (Settings), no analytics beyond Vercel's default, no ads, contact email `kausthubh2007@gmail.com`.

## Open-source files at the repo root

`CONTRIBUTING.md` (setup, briefs workflow, rules from AGENTS.md, how to run tests), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md` (report by email, no bounty), `.github/ISSUE_TEMPLATE/bug.md` and `feature.md`, `.github/PULL_REQUEST_TEMPLATE.md`. Update `README.md` to be the front page: what Kriyan is, a screenshot, the four surfaces, links to docs, a short self-hosting pointer, licence.

## Verify and report

```
bun run typecheck
bun run lint
bun run test
bun run build
```

Run Lighthouse (via Playwright or the Chrome DevTools protocol) on `/` and `/docs` at mobile and desktop settings and report performance, accessibility, best practices and SEO scores; all four must be 90 or higher on desktop and accessibility 95 or higher on both. Take full-page screenshots of `/` at 1440 and 390 wide and save them to `.agents/screenshots/04/`. List every file created and anything you could not do.
