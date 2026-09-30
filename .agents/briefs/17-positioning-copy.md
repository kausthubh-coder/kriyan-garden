# Brief 17: positioning and copy pass

Read `AGENTS.md`, in particular the first paragraph and the copy rules. The owner clarified the product: Kriyan makes organising and planning your life easy and lets the AI you already use plan with you. "School, Business and Life" were only the owner's own example areas. Areas belong to the person. Nothing in the product may assume those three.

## Find every place that assumes the three areas or misses the AI angle

Search the whole repository (`apps`, `packages`, `docs`, `README.md`, the Android app strings, the CLI help, MCP tool descriptions and server instructions, the Open Graph image, `sitemap` titles, the landing page, docs site, privacy and terms) for "School, Business and Life", "school, business and life", "three areas", and any sentence that presents those areas as what Kriyan is for. List each hit in the report with the replacement you made.

## Copy to use

- Landing hero subline: "Kriyan is an open-source planner that makes it easy to organise your life and get more done. Tasks with a time sit on the timeline. Tasks without one wait beside it. Length is optional."
- Landing, "What is left?": "See the week's load by area, spot the day that is too full, and move work to a lighter one. The list shows what is left in each of your areas."
- Landing, AI section heading stays "Plan with the AI you already use." Its paragraph gains one sentence at the end: "Ask it what to do first, to clear a day, or to plan the week."
- README first paragraph and the `<title>`/description meta: same idea, one or two sentences, no list of the three areas.
- Onboarding step 1 sentence: "Kriyan sorts everything into areas. These three are a starting point; rename them, remove them, or add your own."
- Settings, Areas section sentence: "The parts of your life you plan for. Every task, goal and class belongs to one."
- MCP server `instructions` and `get_overview` description: mention that areas are user-defined and that the assistant should use the person's area names, never assume defaults.
- Android onboarding step 1: same sentence as web.
- Anywhere else: prefer "your areas" over naming areas. Sample data may still use School, Business and Life.

## Also

- Sentence case, no em dashes, no exclamation marks, buttons are verb plus object, errors say what happened and what to do. Fix any copy you pass that breaks these.
- Regenerate the Open Graph image if its text changes.
- Update `docs/site/quick-add.md` examples so at least one uses an area name that is not one of the defaults.

## Verify

Typecheck, lint, tests, build, and the landing and docs Playwright checks. Update snapshot or copy assertions that changed. Write `docs/reports/17-positioning-copy.md` with the hit list. Do not commit.
