# Brief 09: web polish

Status: COMPLETE. Changes are left in the working tree. No commit, push, deployment or cloud configuration change was made.

## Reference and implementation

Read the root and web `AGENTS.md`, `docs/PLAN.md`, brief 09, the reference HTML/CSS and the installed Next.js 16.3.3 guides for client components and CSS. Opened the reference in Chromium and inspected its rendered boards and the existing audit captures before implementing the port.

- Added shared compact/primary/touch control tokens. Generated CSS uses `--ctl: 32px` and `--ctl-lg: 36px`, both 44px for coarse pointers. Regenerated core/web CSS and the generated mobile theme; mobile's existing native control height remains 44px. The CSS sweep finds literal `44px` only in generated tokens, including the type/spacing tokens and the coarse-pointer rule.
- Day, List, Week, Goals and Settings use the shared header. Date navigation is joined; search remains in the rail and on Ctrl K. List's header/body share the 760px column and the Day side rail appears above 1240px. Phone date/summary and the single-line demo banner follow the reference. Rail tooltips are limited to hover-capable fine pointers.
- Timeline blocks cover the now line, while the time label remains above them in the gutter. The phone timeline uses the reference's 62px hour height, including drag geometry.
- Rebuilt task details with project/area dot, checkbox/title, growing notes, shared property rows, inline editors and the added-date/delete footer. Titles save on blur/Enter; notes save on blur. Length remains optional. Date fields are disclosed by Pick a day; displayed values use core formatters. Repeat/reminder editors retain validation and supported operations.
- `PropertyList` supplies one expanded labelled editor, `aria-expanded`, arrow navigation, Enter toggling and Escape closing the editor before the panel. M/L open and focus Time/Length. Focus restoration and keyboard motion behavior are preserved.
- Goals have a quiet header Add goal action, a single clickable goal header, small units, a single expected-pace sentence, compact milestones and linked-task metadata without the goal name. Goal details reuse the property list. Consecutive goal saves are queued and number edits merge with the latest saved metric, so moving between fields does not lose an edit.
- Week uses one task style, outlined classes/meetings, plain struck-through completed tasks, planned totals with an explicit over label and empty space for empty days. Phone days form a vertical list.
- Quick add and palette inputs have no focus outline. The shortcuts list uses arrow glyphs and a title-row close button. Other controls retain focus rings. All required dialogs were checked at both requested sizes.
- Clerk appearance aligns its footer sentence and link. Measured text/link bounding rectangles have identical y positions and 16px heights for sign-in/sign-up at both sizes.
- Removed duplicate web date helpers. Creation-date formatting was added to `packages/core/src/format.ts`; other displayed dates and panel values use the existing core formatters.

## Verification

Required commands ran from the repository root. The local logging wrapper (`node .agents/screenshots/09/check.mjs <command>`) invokes the exact `bun run <command>` and records its real output and exit code.

| Command | Final result |
| --- | --- |
| `bun run typecheck` | Exit 0. Next route type generation, all workspace typechecks and scripts typecheck passed. |
| `bun run lint` | Exit 0. Root, mobile and web ESLint passed. |
| `bun run test` | Exit 0. 235 tests passed: backend 42, core 92, mobile 2, web Bun 13, web Vitest 45, root 41. Quick-add documentation matches the tested grammar. |
| `bun run build` | Exit 0. Next.js 16.3.3 compiled successfully and generated 37/37 static pages. |
| `bun run e2e` | Exit 0. 19 passed in 3.5 minutes; no failed, skipped or unrun tests. Includes dedicated-user setup/cleanup, seven authenticated planner tests, four configuration tests, four polish tests and two authenticated capture tests. |
| `git diff --check` | Exit 0; no whitespace errors. |

Raw required-command outputs: [typecheck](../../.agents/screenshots/09/typecheck.log), [lint](../../.agents/screenshots/09/lint.log), [tests](../../.agents/screenshots/09/test.log), [build](../../.agents/screenshots/09/build.log), [E2E](../../.agents/screenshots/09/e2e.log).

Additional verification:

- `PUBLIC_BASE_URL=http://localhost:3000 PLAYWRIGHT_BROWSERS_PATH=<repository>/.agents/playwright-browsers bun run --filter @kriyan/web test:public --grep 'Demo goals|demo creates'`: exit 0, four passed in 55.5 seconds. Desktop and phone goal/task CRUD, milestone edits, completion, Undo, URL selection and demo reset passed. Demo tests observed no Clerk/Convex requests or sockets; the goal flows also observed no uncaught browser errors.
- `bun run --filter @kriyan/web start --port 3001`, then `E2E_BASE_URL=http://localhost:3001 bun run e2e --project=polish`: exit 0, four passed in 20.2 seconds. Refreshed all 18 captures against the production build. Both sizes passed dialog geometry, control sizes, property edits, repeat/reminders, date disclosure, keyboard navigation and focus restoration, with no uncaught browser errors.
- `node .agents/screenshots/09/auth-capture.mjs`: exit 0, four auth captures and measured matching footer text/link positions. Evidence: [auth alignment](../../.agents/screenshots/09/auth-alignment.json).
- `node .agents/screenshots/09/build-compare.mjs` and `node .agents/screenshots/09/verify-compare.mjs`: exit 0, comparison loaded in Chromium; 19 sections, 46 images, zero broken images. Evidence: [comparison verification](../../.agents/screenshots/09/compare-verification.json).

Earlier verification failures were resolved: old panel selectors/assertions expected always-visible fields and Save/Details buttons; the linked-goal fixture needed the task in the same area as its goal; a first property click could be lost during an unchanged title save; ESLint rejected the initial status callback/ref analysis; TypeScript rejected an unnecessary window cast in the new browser-error helper. Tests now use the property rows and a typed page-error collector. There are no remaining failed required gates.

## Captures and visible differences

[Open the side-by-side comparison](../../.agents/screenshots/09/compare.html). It includes all 18 required `/demo` captures, directly rendered reference boards and four auth captures. Screenshots are at 1440×900 and 390×844, with the clock fixed to Wed 30 Sep 2026, 11:45 America/New_York. Phone contexts use a coarse pointer.

| State | Desktop | Phone | Reference |
| --- | --- | --- | --- |
| Day | [1440](../../.agents/screenshots/09/day-1440.png) | [390](../../.agents/screenshots/09/day-390.png) | Sections 1, 2, 7 |
| Day, Length expanded | [1440](../../.agents/screenshots/09/task-panel-length-1440.png) | [390](../../.agents/screenshots/09/task-panel-length-390.png) | Sections 3, 7 |
| List | [1440](../../.agents/screenshots/09/list-1440.png) | [390](../../.agents/screenshots/09/list-390.png) | Section 1 and approved prototype |
| Week | [1440](../../.agents/screenshots/09/week-1440.png) | [390](../../.agents/screenshots/09/week-390.png) | Section 5 |
| Goals | [1440](../../.agents/screenshots/09/goals-1440.png) | [390](../../.agents/screenshots/09/goals-390.png) | Section 4 |
| Goal panel | [1440](../../.agents/screenshots/09/goal-panel-1440.png) | [390](../../.agents/screenshots/09/goal-panel-390.png) | Section 3 pattern and goal instructions |
| Quick add with text | [1440](../../.agents/screenshots/09/quick-add-1440.png) | [390](../../.agents/screenshots/09/quick-add-390.png) | Section 6 |
| Palette | [1440](../../.agents/screenshots/09/palette-1440.png) | [390](../../.agents/screenshots/09/palette-390.png) | Section 6 field instructions |
| Shortcuts | [1440](../../.agents/screenshots/09/shortcuts-1440.png) | [390](../../.agents/screenshots/09/shortcuts-390.png) | Section 6 |

Remaining visible differences are listed beside each capture in the comparison:

- Reference boards show isolated fragments and decorative device frames. Captures show the full shared app, demo banner, rail/tabs and the backdrop behind dialogs.
- Phone controls are at least 44px under AGENTS.md, including controls drawn smaller in the illustration. Phone property rows are 50px and sheets scroll to retain all rows/editors/footer. Keyboard-opened dialogs retain a visible focus ring; the static reference has no focus state.
- Existing demo fixtures have additional tasks/classes, completed tasks, Sunday work and different side-rail counts. Their timeline starts at the configured 07:00 planning hour; the phone illustration starts at 10:00. Week height reflects those additional items.
- The demo launch goal is a number goal without milestones; the reference illustrates five milestones. GPA's shared progress calculation is 3.74/3.8, rather than the reference's illustrative 68%. Pace markers, target dates, linked tasks and status words use real fixture data and shared calculations.
- The illustrated task includes reminders; the captured fixture has none. Its Reminders row correctly says None. The panel is embedded in the real viewport rather than the reference board.
- List, goal panel and command palette have no complete separate reference illustration. Their shared header/property/input patterns follow the matching sections and explicit brief requirements; retained task rows, milestone forms and commands come from the approved prototype and existing operations.
- Quick add uses the existing parser's normalized title and demo project label. Its phone sheet hides optional helper copy to keep the primary action accessible. The phone shortcut key column is narrower so descriptions fit.

Screenshots and raw logs live in the repository's ignored `.agents/screenshots/09/` artifact directory. They remain available locally for review. No required check was skipped; unrelated full public-site, Android-device and cloud-deployment checks were outside this brief.
