# Brief 17: positioning and copy

Status: COMPLETE. Required copy, custom-area example, regenerated Open Graph image and all verification checks PASS.

Kriyan now describes organising and planning the person's life with the AI they already use. Areas belong to the person. The required landing hero, What is left paragraph, AI sentence and web/Android onboarding sentence are applied verbatim. The onboarding loading screen uses the same sentence. Settings already had the exact required Areas sentence, so no change was needed there.

README, CLI package description/help, docs introductions, Android sign-in, page/default/social metadata and MCP instructions/overview describe the same product. MCP tells assistants to use the person's area names and never assume defaults. The design reference copy was updated alongside the product copy to keep the source of truth consistent. The old proposal summary now calls its three areas examples. The plan's opening, suggested-area wording and existing platform/theme summary now match the Android-only, dark-only product rules.

The landing heading and AI heading are unchanged. Existing layout, tokens, sample data and interactions are retained. Buttons touched by this pass use clear objects: Get Android app, View source, Host Kriyan and Copy setup. Clipboard failure copy already says what happened and what to do. No em dashes or exclamation marks were introduced into product copy.

## Exact replacement list

The source line is the line at replacement time. Multi-line text is flattened in this table. Each hit changed by this pass is listed, including metadata and other copy that lacked the AI angle.

| Source | Before | After |
| --- | --- | --- |
| `apps/web/src/app/page.tsx:20` | Kriyan is an open-source planner for school, business and life. Tasks with a time sit on the timeline. Tasks without one wait beside it. Length is optional. | Kriyan is an open-source planner that makes it easy to organise your life and get more done. Tasks with a time sit on the timeline. Tasks without one wait beside it. Length is optional. |
| `apps/web/src/app/page.tsx:25` | The list view shows what remains in school, business and life. | The list shows what is left in each of your areas. |
| `apps/web/src/app/page.tsx:26` | It sees the same tasks and goals you do. | It sees the same tasks and goals you do. Ask it what to do first, to clear a day, or to plan the week. |
| `docs/design/reference/landing.html:118` | Kriyan is an open-source planner for school, business and life. Tasks with a time sit on the timeline. Tasks without one wait beside it. Length is optional. | Kriyan is an open-source planner that makes it easy to organise your life and get more done. Tasks with a time sit on the timeline. Tasks without one wait beside it. Length is optional. |
| `docs/design/reference/landing.html:171` | The list view shows what remains in school, business and life. | The list shows what is left in each of your areas. |
| `docs/design/reference/landing.html:194` | It sees the same tasks and goals you do. | It sees the same tasks and goals you do. Ask it what to do first, to clear a day, or to plan the week. |
| `apps/web/src/app/page.tsx:14` | Kriyan \| Your day on one timeline | Kriyan \| Organise your life with your AI |
| `apps/web/src/app/page.tsx:14` | An open-source planner for school, business and life. Tasks with a time sit on the timeline. Length is optional. | An open-source planner that makes organising and planning your life easy. Plan with the AI you already use. |
| `apps/web/src/app/layout.tsx:9` | title: { default: "Kriyan", | title: { default: "Kriyan \| Organise your life with your AI", |
| `apps/web/src/app/layout.tsx:10` | A planner for tasks and goals across School, Business and Life. | An open-source planner that makes organising and planning your life easy. Plan with the AI you already use. |
| `apps/web/src/app/layout.tsx:11` | title: "Kriyan", description: "Your day on one timeline." | title: "Kriyan \| Organise your life with your AI", description: "An open-source planner that makes organising and planning your life easy. Plan with the AI you already use." |
| `README.md:3` | Your day on one timeline. Kriyan is an open-source planner for school, business and life. Tasks with a time sit on the timeline. Tasks without one wait beside it. Length is optional. | Kriyan is an open-source planner that makes organising and planning your life easy. Plan with the AI you already use to get more done. |
| `README.md:13` | [Setup drafts](docs/site/mcp.md) await brief 05 integration and client verification. | [Connect the AI you already use](docs/site/mcp.md). Real local OAuth and backend proofs are recorded in [the auth report](docs/reports/18-auth.md). |
| `README.md:14` | A planned thin client over the same API. [CLI docs](docs/site/cli.md) await brief 05; npm publication is not claimed. | Browser sign-in, silent refresh and commands for your tasks and goals over the same API. [Read the CLI guide](docs/site/cli.md). npm publication is not claimed. |
| `README.md:41` | Android and CLI workspaces are supplied by parallel implementation briefs. | The Android and CLI workspaces live in \`apps/mobile\` and \`packages/cli\`. |
| `packages/cli/README.md:3` | Tasks and goals across School, Business and Life, from your terminal. | Organise tasks and goals in your areas from your terminal. Plan with the AI you already use through Kriyan's MCP server. |
| `packages/cli/package.json:4` | Plan tasks and goals in School, Business and Life from your terminal. | Organise tasks and goals in your areas from your terminal. Plan with the AI you already use through MCP. |
| `packages/cli/src/args.ts:55` | export const helpText = \`Kriyan CLI | export const helpText = \`Kriyan CLI Organise tasks and goals in your areas. Use kriyan mcp to plan with your AI. |
| `docs/site/index.md:3` | Kriyan is an open-source planner for school, business and life. Your day is a timeline with a tray beside it. Task length is optional. | Kriyan is an open-source planner that makes organising and planning your life easy. Plan with the AI you already use to get more done. Your day is a timeline with a tray beside it. Task length is optional. |
| `docs/site/index.md:11` | School, Business and Life are suggested starting points. Rename them, | The suggested areas are starting points. Rename or remove them, add your own, |
| `docs/site/cli.md:3` | The \`kriyan\` command is a thin client over the shared API. Run it from a clone with Bun: | Organise tasks and goals in your areas from your terminal. The \`kriyan\` command uses the shared API, so it sees the same planner as the app and the AI you already use. Run it from a clone with Bun: |
| `docs/mcp.md:3` | Kriyan gives assistants access to the signed-in user's tasks, goals, areas, projects and courses. | Kriyan gives assistants access to the signed-in user's tasks, goals, areas, projects and courses. Plan with the AI you already use in your own areas. Your assistant uses your area names and never assumes the suggested defaults. |
| `docs/site/mcp.md:3` | Kriyan's remote MCP endpoint is \`https://app.kriyan.app/mcp\`. | Kriyan's remote MCP endpoint is \`https://app.kriyan.app/mcp\`. Plan with the AI you already use in your own areas. Your assistant uses your area names and never assumes the suggested defaults. |
| `apps/web/src/components/app/Onboarding.tsx:47` | Kriyan sorts everything into areas. Start with these three, rename them, or add your own. | Kriyan sorts everything into areas. These three are a starting point; rename them, remove them, or add your own. |
| `docs/design/reference/onboarding-settings.html:81` | Kriyan sorts everything into areas. Start with these three, rename them, or add your own. | Kriyan sorts everything into areas. These three are a starting point; rename them, remove them, or add your own. |
| `apps/web/src/components/app/OnboardingFrameSkeleton.tsx:24` | Kriyan sorts everything into areas. Start with these three, rename them, or add your own. | Kriyan sorts everything into areas. These three are a starting point; rename them, remove them, or add your own. |
| `apps/mobile/src/Onboarding.tsx:28` | Kriyan sorts everything into areas. Start with these three and change them any time. | Kriyan sorts everything into areas. These three are a starting point; rename them, remove them, or add your own. |
| `docs/design/reference/android.html:230` | Kriyan sorts everything into areas. Start with these three and change them any time. | Kriyan sorts everything into areas. These three are a starting point; rename them, remove them, or add your own. |
| `apps/mobile/src/Auth.tsx:59` | Make room for School, Business and Life. | Organise your life with the AI you already use. |
| `apps/web/src/lib/operations/index.ts:94` | Start here: areas, projects, courses, active goals and today's summary. | Start here: user-defined areas, projects, courses, active goals and today's summary. Use the person's area names and never assume the defaults. |
| `apps/web/src/lib/operations/mcp.ts:34` | instructions: "Read the relevant | instructions: "Help the person organise and plan their life with the AI they already use. Areas are user-defined; use the person's area names and never assume the defaults. Read the relevant |
| `apps/web/src/app/opengraph-image.tsx:5` | Kriyan. Your day on one timeline. | Kriyan. Organise your life with your AI. |
| `apps/web/src/app/opengraph-image.tsx:12` | >Your day on one timeline.</div> | >Organise your life with your AI.</div> |
| `docs/PLAN.md:5` | The approved design is the interactive prototype in \`design-proposals/prototype/\`: a dark, time-first Day view, with List, Week and Goals views, optional task length, and three areas (School, Business, Life). | Kriyan is an open-source planner that makes organising and planning your life easy and lets the AI you already use plan with you. The approved design is the interactive prototype in \`design/proposals/prototype/\`: a dark, time-first Day view, with List, Week and Goals views, optional task length and user-defined areas. School, Business and Life are suggested starting points only. |
| `docs/PLAN.md:155` | 1. **Areas.** School, Business and Life are preselected. Rename, remove or add. | 1. **Areas.** Choose your areas. The suggested defaults are starting points; rename, remove or add your own. |
| `docs/PLAN.md:13` | \| Mobile app \| Expo app for iOS and Android \| App Store, Google Play \| | \| Android app \| Expo app for Android \| GitHub APK releases \| |
| `docs/PLAN.md:146` | \| Theme \| Dark at launch. Colours are tokens in \`packages/core\`, so a light theme is a token set, not a rewrite. \| | \| Theme \| Dark only. Colours are tokens in \`packages/core\`. \| |
| `docs/design/proposals/README.md:7` | All seven garden variations | All seven earlier variations |
| `docs/design/proposals/README.md:10` | None showed goals, progress, or the life / business / school structure. | None showed goals, progress or the structure of the person's areas. |
| `docs/design/proposals/README.md:14` | Three Areas (School, Business, Life), each with one colour. | User-defined areas, each with one colour. School, Business and Life are example areas only. |
| `apps/web/src/components/public/SetupTabs.tsx:15` | setMessage("Copied") | setMessage("Copied setup") |
| `apps/web/src/components/public/SetupTabs.tsx:15` | message === "Copied" ? "Copied" : "Copy" | message === "Copied setup" ? "Copied setup" : "Copy setup" |
| `apps/web/e2e/public/public.spec.ts:310` | name: "Copy", exact: true | name: "Copy setup", exact: true |
| `apps/web/e2e/public/public.spec.ts:311` | name:"Copied",exact:true | name:"Copied setup",exact:true |
| `apps/web/e2e/public/public.spec.ts:312` | name:"Copy",exact:true | name:"Copy setup",exact:true |
| `docs/design/reference/landing.html:206` | >Copy</button> | >Copy setup</button> |
| `apps/web/src/app/page.tsx:20` | >Get it on GitHub</a> | >Get Android app</a> |
| `apps/web/src/app/page.tsx:28` | >View on GitHub</a> | >View source</a> |
| `apps/web/src/app/page.tsx:28` | >Host it yourself</a> | >Host Kriyan</a> |
| `docs/design/reference/landing.html:224` | >View on GitHub</button> | >View source</button> |
| `docs/design/reference/landing.html:224` | >Host it yourself</button> | >Host Kriyan</button> |
| `packages/core/src/quickAdd.test.ts:14` | { id: "life", name: "Life" }, | { id: "life", name: "Life" }, { id: "music", name: "Music" }, |
| `packages/core/src/quickAddCases.ts:4` | { text: "call amma", | { text: "practice piano tomorrow #music", expected: { title: "Practice piano", areaId: "music", date: "2026-09-30" } }, { text: "call amma", |
| `packages/core/src/quickAddGrammar.ts:22` | { tokens: ["#econ", | { tokens: ["#music"], meaning: "An existing area you named yourself (Music in this example)", suffix: "", expected: { areaId: "music" } }, { tokens: ["#econ", |
| `packages/core/scripts/quick-add-docs.ts:5` | Dates use your local day, not the server's UTC date. | Dates use your local day, not the server's UTC date. Area names belong to you. Music is a custom area in these tested examples; use your own area names. |

The existing landing and public Playwright copy assertions now use Copy setup and Copied setup. The public checks also verify the exact required hero, load paragraph, added AI sentence, metadata and custom Music example.

## Search coverage and retained hits

Search covered apps, packages, docs and README, including Android strings, CLI help/package metadata, MCP descriptions/instructions, the Open Graph image, sitemap, landing, docs, privacy and terms. The main patterns were School/Business/Life in either order, three areas, three default areas, Start with these three, and planner sentences naming the defaults. Paragraphs and introductions were also inspected for the AI angle.

The remaining matches in live source are explained below. None presents the three defaults as the product's frame.

| Source | Remaining hit | Disposition |
| --- | --- | --- |
| packages/backend/convex/model/sample.ts | School, Business and Life array and sample-data prerequisite error | Explicit sample data, allowed by the brief. The error explains how to restore the sample names. |
| packages/backend/convex/__tests__/model.test.ts | ensure creates exactly three default areas once | Test of initial suggested defaults, not a limit on user-defined areas. |
| apps/web/scripts/capture-onboarding-settings.ts | Expected the three default areas | Screenshot fixture check of a newly created account. |
| apps/web/src/components/public/QuickAddStrip.tsx | Three named example areas | Isolated interactive example data. |
| apps/web/src/components/app/Onboarding.tsx | Comparison with the suggested names | Detects whether the account still matches the sample-data prerequisites; does not restrict editing or adding areas. |
| docs/PLAN.md | School, Business and Life are suggested starting points only | Explicitly identifies suggestions. |
| docs/design/proposals/README.md | School, Business and Life are example areas only | Explicitly identifies design sample data. |
| Parser fixtures, demo rows, screenshots and other sample labels | Individual default names | Sample data is allowed. A custom Music example was added to the shared tested fixtures. |
| Historical reports | Recorded fixture names and old transcripts | Historical evidence is preserved; this report records the new copy. |

Sitemap emits URLs only and has no title copy. Privacy and terms contain no three-area framing; their AI-client authorization copy is already general, so they were left unchanged. Web Settings already says: The parts of your life you plan for. Every task, goal and class belongs to one. Android Areas has no contradictory explanatory sentence. The prototype contains example area labels, with no product-framing sentence to replace.

## Custom-area quick add and social image

The shared grammar and executable parser fixtures now include Music and `practice piano tomorrow #music`. That input selects the custom music area, tomorrow and no invented duration. The public quick-add page is regenerated from those fixtures, so its custom-area example cannot drift from the tested parser. No production parser logic changed.

The Open Graph line and alt text now read Organise your life with your AI. Next's bundled metadata and image guides were read before changing these exports. The 1200 by 630 PNG is regenerated by the production build and fetched from the actual route for visual review. The approved landing, web, Android and onboarding/settings references were opened in a browser before editing.

## Verification

| Command | Native exit | Seconds |
| --- | --- | --- |
| `bun run typecheck` | 0 | 38 |
| `bun run lint` | 0 | 44 |
| `bun run test` | 0 | 45 |
| `bun run build` | 0 | 39 |
| `bun run --filter @kriyan/web test:public` | 0 | 35 |

Tests: 321 passed (6 skill, 100 backend, 109 core, 2 Android shared logic, 13 web Bun, 49 web Vitest and 42 CLI). Generated quick-add docs matched the tested grammar. Public Playwright: 9 passed, 1 intentional mobile skip for the desktop pointer-drag test. A single production server and Playwright worker were used and stopped.

The Open Graph PNG was fetched from the real production route and visually inspected: the new line fits on one line within the 1200 by 630 frame. Landing and docs were captured and checked at 1440 and 390 pixels with no overflow or page errors. All lazy demo frames were loaded before capture. Local artifacts live in `.agents/test-kriyan/job2-public-opengraph.png`, `job2-public-landing-1440.png`, `job2-public-landing-390.png`, `job2-public-docs-1440.png`, `job2-public-docs-390.png` and the corresponding quick-add captures. Android copy was verified in source and by typecheck/tests; no emulator was started.

The first scratch capture recorder failed after writing images because it called fetch response.status as a function. The recorder was fixed and the capture-only step rerun successfully; the already-passing public suite did not need repeating. No product gate failed in this job.

Actual output tails:

### bun run typecheck

```text
$ bun run --filter @kriyan/web typegen && bun run --filter '*' typecheck && tsc -p scripts
@kriyan/web typegen: Generating route types...
@kriyan/web typegen: ✓ Types generated successfully
@kriyan/web typegen: Exited with code 0
@kriyan/core typecheck: Exited with code 0
kriyan typecheck: Exited with code 0
@kriyan/backend typecheck: Exited with code 0
@kriyan/web typecheck: Exited with code 0
@kriyan/mobile typecheck: Exited with code 0
```

### bun run lint

```text
$ bun run --filter '*' lint
kriyan lint: Exited with code 0
@kriyan/mobile lint: Exited with code 0
@kriyan/web lint: Exited with code 0
```

### bun run test

```text
@kriyan/web:test     |  0 fail
@kriyan/web:test     |  122 expect() calls
@kriyan/web:test     | Ran 13 tests across 3 files. [92.00ms]
@kriyan/web:test     | $ vitest run --maxWorkers=1
@kriyan/web:test     | 
@kriyan/web:test     |  RUN  v5.0.2 C:/Users/kaust/OneDrive/Documents/ChatGPT/kriyan-v2/apps/web
@kriyan/web:test     | 
@kriyan/web:test     | 
@kriyan/web:test     |  Test Files  6 passed (6)
@kriyan/web:test     |       Tests  49 passed (49)
@kriyan/web:test     |    Start at  22:48:29
@kriyan/web:test     |    Duration  31.75s (import 61%, environment 28%, transform 8%, tests 3%)
@kriyan/web:test     | 
@kriyan/web:test     |     Isolate  6 workers spawned · ~1.55s startup each (spawn + environment, per file)
@kriyan/web:test     |              at least ~7.73s faster with isolate: false — reuses workers across files instead of one per file
@kriyan/web:test     | 
@kriyan/web:test     | Done in 32.45s
kriyan:test          | bun test v1.3.14 (0d9b296a)
kriyan:test          | 
kriyan:test          |  42 pass
kriyan:test          |  0 fail
kriyan:test          |  151 expect() calls
kriyan:test          | Ran 42 tests across 2 files. [679.00ms]
kriyan:test          | Done in 801ms
```

### bun run build

```text
@kriyan/web build: ├ ƒ /api/webhooks/clerk
@kriyan/web build: ├ ƒ /app
@kriyan/web build: ├ ƒ /app/settings
@kriyan/web build: ├ ƒ /app/settings/[section]
@kriyan/web build: ├ ƒ /app/welcome
@kriyan/web build: ├ ƒ /demo
@kriyan/web build: ├ ƒ /docs/[[...slug]]
@kriyan/web build: ├ ƒ /download
@kriyan/web build: ├ ƒ /mcp
@kriyan/web build: ├ ○ /opengraph-image
@kriyan/web build: ├ ƒ /privacy
@kriyan/web build: ├ ○ /robots.txt
@kriyan/web build: ├ ƒ /sign-in/[[...sign-in]]
@kriyan/web build: ├ ƒ /sign-up/[[...sign-up]]
@kriyan/web build: ├ ○ /sitemap.xml
@kriyan/web build: └ ƒ /terms
@kriyan/web build: 
@kriyan/web build: 
@kriyan/web build: ƒ Proxy (Middleware)
@kriyan/web build: 
@kriyan/web build: ○  (Static)   prerendered as static content
@kriyan/web build: ƒ  (Dynamic)  server-rendered on demand
@kriyan/web build: 
@kriyan/web build: Exited with code 0
```

### bun run --filter @kriyan/web test:public

```text
@kriyan/web test:public: 
@kriyan/web test:public: Running 10 tests using 1 worker
@kriyan/web test:public: 
@kriyan/web test:public: (node:51232) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
@kriyan/web test:public: (Use `node --trace-warnings ...` to show where the warning was created)
@kriyan/web test:public:   ok  1 [desktop] › e2e\public\public.spec.ts:4:7 › Demo goals › demo goal panels, milestones, creation and delete Undo use local transport and URL selection (6.7s)
@kriyan/web test:public:   ok  2 [desktop] › e2e\public\public.spec.ts:243:5 › demo creates, edits, completes and resets without backend traffic (1.9s)
@kriyan/web test:public:   ok  3 [desktop] › e2e\public\public.spec.ts:297:5 › landing parser, iframe, keyboard tabs and copy are usable (4.8s)
@kriyan/web test:public:   ok  4 [desktop] › e2e\public\public.spec.ts:320:5 › docs, legal, metadata and planned download route respond (795ms)
@kriyan/web test:public:   ok  5 [desktop] › e2e\public\public.spec.ts:349:5 › desktop drag schedules, moves and resizes the shared Day task (1.1s)
@kriyan/web test:public: (node:34076) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
@kriyan/web test:public: (Use `node --trace-warnings ...` to show where the warning was created)
@kriyan/web test:public:   ok  6 [mobile] › e2e\public\public.spec.ts:4:7 › Demo goals › demo goal panels, milestones, creation and delete Undo use local transport and URL selection (4.8s)
@kriyan/web test:public:   ok  7 [mobile] › e2e\public\public.spec.ts:243:5 › demo creates, edits, completes and resets without backend traffic (1.9s)
@kriyan/web test:public:   ok  8 [mobile] › e2e\public\public.spec.ts:297:5 › landing parser, iframe, keyboard tabs and copy are usable (4.8s)
@kriyan/web test:public:   ok  9 [mobile] › e2e\public\public.spec.ts:320:5 › docs, legal, metadata and planned download route respond (761ms)
@kriyan/web test:public:   -  10 [mobile] › e2e\public\public.spec.ts:349:5 › desktop drag schedules, moves and resizes the shared Day task
@kriyan/web test:public: 
@kriyan/web test:public:   1 skipped
@kriyan/web test:public:   9 passed (33.3s)
@kriyan/web test:public: Exited with code 0
```

