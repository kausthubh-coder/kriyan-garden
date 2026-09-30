# Brief 03a: web Day view

Implemented in the working tree. No commit, push, deployment, backend write-rule change or cloud setting change was made. The strict no-console-warnings gate has one environment exception: Clerk prints its development-key warning. All four verification commands pass.

## Implementation

The approved prototype was opened and exercised before the port. The shell uses CSS Modules and generated shared tokens, with the existing Schibsted Grotesk font. The Day view, tray, timeline, real week/deadline/goal rail, parser-driven quick add, command palette, native task dialog, help sheet and five-second Undo toasts use the signed-in user's Convex data.

Task details include plain-text notes saved on blur, all repeat modes, weekly weekday choices, all five reminder kinds, deadline and goal selectors, and projects filtered by area. Timeless tasks keep a null duration. Mouse placement, movement and bottom-edge resizing use optimistic mutations with Undo. Keyboard alternatives open the time field and length choices; touch does not enter the mouse drag path.

View, date, area and selected task restore from the URL. List, Week, Goals, onboarding and settings are styled Coming soon placeholders. There are no sample records hard-coded into the app.

Shared core helpers calculate active planned minutes, deadline capacity and overlap columns. Two focused core tests cover capacity across multiple dates, null lengths, completed tasks and over-capacity days, plus chained overlaps and slim markers. Backend source and write rules are unchanged.

The generated CSS lives in both core and the web app; `bun run tokens` in `packages/core` prints:

```text
$ bun run scripts/tokens.ts
Generated core and web tokens.css from tokens.ts
```

The generated files are left for review, following the user's explicit no-commit instruction. Next also generated `apps/web/AGENTS.md` and its `CLAUDE.md` companion.

## Final verification output

Commands ran from the repository root on 29 September 2026. All exited 0. Logs are under ignored `.agents/logs/`.

### bun run typecheck

```text
$ bun run --filter @kriyan/web typegen && bun run --filter '*' typecheck
@kriyan/web typegen: Generating route types...
@kriyan/web typegen: ✓ Types generated successfully
@kriyan/web typegen: Exited with code 0
@kriyan/core typecheck: Exited with code 0
@kriyan/backend typecheck: Exited with code 0
@kriyan/web typecheck: Exited with code 0
```

### bun run lint

```text
$ bun run --filter '*' lint
@kriyan/web lint: Exited with code 0
```

### bun run test

```text
$ bun run --filter '*' test
@kriyan/core test: bun test v1.3.14 (0d9b296a)
@kriyan/core test:
@kriyan/core test:  24 pass
@kriyan/core test:  0 fail
@kriyan/core test:  36 expect() calls
@kriyan/core test: Ran 24 tests across 2 files. [46.00ms]
@kriyan/core test: Exited with code 0
@kriyan/backend test:
@kriyan/backend test:  RUN  v5.0.2 C:/Users/kaust/OneDrive/Documents/ChatGPT/kriyan-v2/packages/backend
@kriyan/backend test:
@kriyan/backend test:
@kriyan/backend test:  Test Files  1 passed (1)
@kriyan/backend test:       Tests  14 passed (14)
@kriyan/backend test:    Start at  21:31:55
@kriyan/backend test:    Duration  2.73s (tests 74%, transform 12%, import 8%, environment 4%, worker 1%)
@kriyan/backend test:
@kriyan/backend test: Exited with code 0
```

### bun run build

```text
@kriyan/web build: ┌ ○ /
@kriyan/web build: ├ ○ /_not-found
@kriyan/web build: ├ ƒ /.well-known/oauth-authorization-server
@kriyan/web build: ├ ƒ /.well-known/oauth-protected-resource/mcp
@kriyan/web build: ├ ƒ /app
@kriyan/web build: ├ ƒ /mcp
@kriyan/web build: ├ ƒ /sign-in/[[...sign-in]]
@kriyan/web build: └ ƒ /sign-up/[[...sign-up]]
@kriyan/web build:
@kriyan/web build:
@kriyan/web build: ƒ Proxy (Middleware)
@kriyan/web build:
@kriyan/web build: ○  (Static)   prerendered as static content
@kriyan/web build: ƒ  (Dynamic)  server-rendered on demand
@kriyan/web build:
@kriyan/web build: Exited with code 0
```

`git diff --check` finishes with no output and exit 0. CRLF-only changes in unrelated existing lines were normalized away.

## Browser verification

Used the browser CLI against `bun run dev` at `http://localhost:3000/app`. Created a dedicated Clerk development test user with the linked Clerk CLI, signed in normally, and populated only that user's fixture data through existing authenticated Convex functions. Authentication material stayed in ignored logs and is absent from this report and review artifacts.

| Exercise | Observed result |
| --- | --- |
| Quick add | `Review today 6pm School 45m` created Review at 18:00 with a 45-minute length. Parser chips use the owner's projects and areas. Creation updated the timeline and week rail. Undo removed the created row. |
| Place from tray | Mouse drag scheduled Call Amma at 18:00. Its duration remained null and it rendered as a slim marker. |
| Move | Mouse movement snapped that task to 18:45. |
| Resize | Dragging the bottom edge changed its duration to 60 minutes, ending 19:45. Overlap with the 19:00 task produced separate columns. |
| Complete and Undo | The checkbox and summary updated immediately. Undo restored the active task in Convex. |
| Delete and Undo | Deleted Renew passport with no confirmation. Undo restored its fields through the existing create mutation. |
| Task details | Edited notes, deadline, time and length; checked saved rows. Project choices stay within the selected area. |
| Repeat | Exercised Daily, Monthly, Yearly and Every N; changed the interval to 3. Weekly Thursday stored weekday 4. Completing and undoing the weekly task removed its generated next occurrence and reopened the original. |
| Reminders | Saved all five structured kinds and removed a reminder. At start and Before start become disabled with explanatory copy when the task time is cleared. |
| Command palette | Ctrl K opened it. Title search for Amma, ArrowDown/ArrowUp and Enter opened the matching task. Escape closed it. |
| URL state | Reload restored School filtering and the selected invoice panel. Dates and view changes stayed in query parameters. |
| Keyboard | N, Ctrl K, 1–4, T, left/right date navigation, ?, Escape, and focused-task Enter/Space are wired. M focused the time field; L focused the length choices. Tab stayed inside a native dialog and Escape restored the task's focus. |
| Offline | Stopped the test browser's Convex WebSocket manager. Offline banner appeared; completing Call Amma showed the optimistic completed state while `hasInflightRequests` was true. Restarted the socket: connected true, pending false, and the completed row existed in Convex. Restored the fixture afterward. |
| Mobile layout | At 390 × 844, document overflow was false. The task sheet measured width 390, height 742.71875, top 101.28125 and bottom 844. Notes and reminder controls remained reachable by scrolling. |
| Loading shift | A cold reload initially measured CLS 0.12183006050623474. Fixed the initial connecting banner and gave skeletons an independent layout layer. Repeated reloads at 390 × 844 and 1440 × 900 measured CLS 0 and timeline height 896. |
| Empty state | The newly created user's empty Day view offered Add a task before fixtures were added. Placeholder views offer View day. |
| Console | Browser error log was empty. Console included normal HMR/React DevTools information and Clerk's development-key warning. |

Changes made during these exercises were restored to the prototype fixture values. The dedicated test user and fixture records remain available for review.

### Accessibility

Authenticated Lighthouse accessibility score: **100 desktop and 100 mobile**, with no audits scoring 0 in either final run.

```text
bunx --bun lighthouse http://localhost:3000/app --port=61692 --disable-storage-reset --only-categories=accessibility --form-factor=desktop --screenEmulation.mobile=false --screenEmulation.width=1440 --screenEmulation.height=900 --output=json --output-path=.agents/logs/03a-lighthouse-desktop.json --quiet

bunx --bun lighthouse http://localhost:3000/app --port=61692 --disable-storage-reset --only-categories=accessibility --screenEmulation.width=390 --screenEmulation.height=844 --output=json --output-path=.agents/logs/03a-lighthouse-mobile.json --quiet
```

Both commands exited 0. An earlier desktop run flagged week-load labels that omitted the exact visible text; fixed by including the letter and load value with matching whitespace. Native modal dialogs provide focus trapping and focus restoration. Keyboard-triggered actions disable motion; reduced-motion styles use fades. Checkbox and slim-marker hit areas preserve the prototype's small visual marks while expanding their targets.

## Screenshots and side-by-side comparison

[Open all comparisons](../screenshots/03a/comparison.html). The HTML includes the supplied screenshots and matching-viewport captures of the running prototype. PNG comparisons retain the original images without rescaling them.

| Screen | App at 1440 × 900 | App at 390 × 844 | Side-by-side PNGs |
| --- | --- | --- | --- |
| Day | [Desktop](../screenshots/03a/day-1440.png) | [Phone](../screenshots/03a/day-390.png) | [Desktop pair](../screenshots/03a/compare-day-1440.png), [phone pair](../screenshots/03a/compare-day-390.png) |
| Quick add | [Desktop](../screenshots/03a/quick-add-1440.png) | [Phone](../screenshots/03a/quick-add-390.png) | [Desktop pair](../screenshots/03a/compare-quick-add-1440.png), [phone pair](../screenshots/03a/compare-quick-add-390.png) |
| Task panel | [Desktop](../screenshots/03a/task-panel-1440.png) | [Phone](../screenshots/03a/task-panel-390.png) | [Desktop pair](../screenshots/03a/compare-task-panel-1440.png), [phone pair](../screenshots/03a/compare-task-panel-390.png) |

Additional evidence: [drag and resize](../screenshots/03a/drag-resize-1440.png), [notes/repeat/reminders desktop](../screenshots/03a/task-panel-options-1440.png), [extra fields phone](../screenshots/03a/task-panel-options-390.png).

### Visible differences from the supplied prototype screenshots

| Difference | Resolution |
| --- | --- |
| Neutral primary buttons initially lost their fill to the reset. | Fixed the reset specificity. The final Add task button uses neutral ink. |
| The native task dialog initially extended below the viewport. | Fixed height and scrolling; desktop is full height and phone is 88dvh. |
| Invoice title was clipped to one line in the supplied detail screenshot. | Fixed by wrapping the editable title. |
| The supplied phone panel clips the date picker, long explanation and length choices horizontally. | Fixed by wrapping controls; no horizontal document overflow remains. |
| The prototype hides the phone panel's close icon. | Retained a visible close control with a 44px target and focus ring. |
| The quick-add input and panel close control have visible outlines in the app. | Retained for keyboard focus visibility. The prototype removes some input outlines. |
| Filters, date navigation, panel choices, selects and Add task are taller than several 32–40px prototype controls. | Retained at 44px or more to follow AGENTS.md. This moves desktop tray rows down and phone timeline content down by about 12px. |
| The panel title and larger controls move subsequent fields lower. | Retained as the result of wrapping and accessible control sizes. |
| Desktop detail includes Deadline and Goal below Length, followed by Notes, Repeat and Reminders. Footer actions need scrolling. | Required additions in this brief. The source panel has fewer fields and a footer visible immediately. |
| Phone detail is a taller sheet and wraps 1h 30m/2h onto a second row. Its date picker is on a separate row. | Retained for the additional fields and no clipping. |
| The phone detail's background shows the header, while supplied m-detail starts at the filters. | Capture scroll state differs. The app has the same header/filter/tray/timeline order. |
| Provided m-day and m-qa include a 520 × 900 decorative phone frame; app captures are 390 × 844. | Retained raw viewport screenshots as requested. Matching raw prototype captures are included separately. |
| The mobile quick-add chip initially showed Wed 30 Sept instead of Tomorrow. | Fixed relative dates to Today, Tomorrow and Yesterday as in the prototype. |
| Day's clock line is at the current browser-local time instead of the supplied 16:48/16:49. Desktop timeline scroll position can differ accordingly. | Retained live time and prototype scrolling behavior. |
| Desktop Day uses the supplied completed Call Amma state; quick add, detail and phone use the original active state. | Matched the corresponding supplied capture states. The summary is therefore 6/1 versus 7/2 in different images. |
| Monday and Tuesday week totals are lower than the demo: Free and 4h 5m instead of 55m and 5h 20m. | Retained real week.get values, which count active task durations. The demo totals include completed tasks. |
| The deadlines rail shows actual task titles and dates instead of the prototype's three hard-coded budget examples. | Required real-data behavior. Values are computed from current active durations and daily capacity. |
| Deadline bars, spare-time values and the Goals section's vertical position differ. | Retained because real deadlines have different lengths, budgets and titles. Missing task lengths show an explicit 1h assumption. |
| The prototype uses green/orange goal values to imply pace; the app uses neutral metric text and the area's ring colour. GPA shows its stored unit. | Retained real metrics and the rule that colour only means an area or an explicit status. |
| The GPA ring reflects 3.74/3.8 rather than the demo's arbitrary 68%. Ring edges use SVG strokes instead of a conic gradient. | Retained real progress and the no-gradient rule. |
| The prototype's Reset demo data palette command is absent. | Retained omission; there is no demo state to reset for a real account. Other prototype commands are present. |
| Offline, skeleton and retry states are additional surfaces. | Required by this brief. Skeletons now appear after 150ms without moving the loaded timeline. |
| The Next development indicator initially covered the lower-left Add control. | Fixed with the local devIndicators setting; no overlay in final captures. |
| Undo initially could not be clicked while a native task dialog was open. | Fixed by rendering that toast inside the modal. |

No intentional changes were made to the prototype's dark palette, area colours, typeface, rail/column widths, hour height, card geometry or timeline layout.

## Limits and items not performed

- The no-console-warnings gate is **partial**. The inherited Clerk development SDK prints: “Clerk has been loaded with development keys.” Production credentials/cloud configuration were not changed and the warning was not suppressed.
- Browser checks used the available browser CLI. The Playwright MCP and a native desktop browser connector were unavailable. No Playwright test suite was added, as 03b owns end-to-end tests.
- Android/device testing, browser notifications and all other out-of-scope views were not implemented or tested.
- Error and retry UI is implemented, but a live backend failure was not deliberately induced. Reduced motion is implemented in CSS; no separate OS-level reduced-motion session was run.
- Lighthouse here measures accessibility, not performance. CLS was measured separately with buffered browser layout-shift entries on the tested reloads. These checks do not establish zero shift for every device, network or user dataset.

