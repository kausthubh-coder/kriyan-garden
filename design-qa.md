# Kriyan design QA

## Comparison target

- Source visual truth: `C:\Users\kaust\AppData\Local\Temp\codex-clipboard-586c4455-22f6-4245-839c-ca220aa0f40e.png` for the Garden composition, plus the supplied landing and writing-page frames in `design-references/` for onboarding typography and tone.
- Browser-rendered implementation: `C:\Users\kaust\OneDrive\Documents\ChatGPT\kriyan\screenshots\garden-single-add-1884.png`, `screenshots\dynamic-garden-mobile.png`, and `screenshots\onboarding.png`.
- Latest annotation source: browser comments 1 through 5 on `http://localhost:3000/garden`, targeting the header `spaces` action and the duplicate todo creation links.
- Combined comparison: `C:\Users\kaust\OneDrive\Documents\ChatGPT\kriyan\screenshots\qa-comparison.png`.
- Viewport: 1884 × 1030 CSS pixels for the annotation cleanup and 390 × 844 CSS pixels for the responsive check.
- Pixel normalization: source and desktop implementation are both 1600 × 900 at one device pixel per CSS pixel. The combined image stacks them without resampling. The phone capture is 390 × 844 at one device pixel per CSS pixel.
- State: user-created School, Deep work, and Health spaces; one saved School todo; empty-today path; first-run onboarding after local data reset.

## Full-view comparison evidence

The source and final desktop capture were opened together in `screenshots\qa-comparison.png`. The implementation keeps the source's warm paper, serif region headings, small color markers, sparse paper stones, quiet shadow, central path, restrained metadata, and generous empty space. Dynamic content changes the number and names of regions, so density differs by design. The visual grammar does not.

Onboarding has no one-to-one source frame. It deliberately borrows the supplied landing composition and writing-page typography: one centered reading column, low-contrast italic guidance, almost no chrome, and a single underlined action. Suggested spaces and the input are new functional controls.

## Focused region comparison evidence

- Fonts and typography: Spectral remains the display, task, and writing face. Atkinson stays on navigation and metadata. The final capture matches the source hierarchy and optical weight. Onboarding uses the same large serif scale as the supplied landing.
- Spacing and layout rhythm: desktop headings, stones, path, and lower regions align to the source's wide margins. The dynamic grid accepts one to eight user spaces without fixed Kitchen/House positions. At 390 pixels, sections stack and the main action remains visible.
- Colors and visual tokens: paper, ink, muted text, green, terracotta, ochre, and stone tokens match the existing reference palette. The stronger charcoal add-todo button is an intentional affordance change requested by the user.
- Image quality and asset fidelity: the path is cropped from the supplied source into `public\garden-path-line.png`. It stays sharp at desktop and no longer leaks tiny mockup text on mobile. No decorative asset is recreated with CSS or a handwritten SVG.
- Copy and content: Kitchen and The house are only available in the clearly labeled sample garden. First run asks the user to create School, Coding, or any other spaces. Core controls say "add todo" instead of hiding creation behind "plant."
- Focused controls: onboarding suggestions, first-space input, main add-todo button, per-space add actions, inline space renaming, add-space form, delete behavior, and start-over control were inspected at readable scale.

## Interaction and persistence checks

- Completed onboarding with School and Coding.
- Added "Finish math problem set" to School, opened its page, returned to Garden, and confirmed the stone rendered.
- Renamed Coding to Deep work, added Health, and reloaded the page. All names and the todo persisted in SQLite.
- Confirmed Garden, Distance, Calendar, reminders, task editing, and sample workspace still use the same stored region records.
- Checked the 390 × 844 Garden layout after the path-asset fix. Navigation and add todo remain reachable and no section collides.
- Ran ESLint, the production Next.js build, and the production server without an error overlay.

## Comparison history

### Iteration 1

- P1: task creation was hidden behind the word "plant." Fixed with a persistent, high-contrast `add todo` action.
- P1: regions were fixed to Kitchen, The house, Letters, Studio, and Rest. Replaced fixed layout classes with SQLite-backed user regions, onboarding, and create, rename, delete, and unsorted behavior.
- P1: no onboarding existed. Added first-run space selection, custom naming, optional sample garden, and a restart-onboarding action.

### Iteration 2

- P2: the full mockup image used to source the path exposed tiny mock text on a narrow screen. Cropped the supplied path into `public\garden-path-line.png`, updated the background asset, rebuilt, and recaptured the 390 × 844 view.
- P2: fixed plot coordinates could not support arbitrary user spaces. Replaced them with two dynamic grids around the today path and verified three user-created sections after reload.

### Iteration 3, annotation cleanup

- P2: Garden exposed several competing creation points in the header, region heading hover states, empty-region copy, and the today path. Removed every duplicate and retained the single top `add todo` button.
- P2: the `spaces` header action added noise beside the primary action. Removed it without changing Garden spacing, navigation, reminders, task data, or onboarding.
- Post-fix evidence: `screenshots\garden-single-add-1884.png` at 1883 × 1030 pixels. Browser text inspection found exactly one `add todo`, no `spaces`, and no `add something for today`. The remaining button opens the task composer.

### Final pass

- Reopened the annotated Garden at the same desktop scale after the cleanup.
- Verified the single remaining add action, unchanged typography, spacing, colors, path asset, empty-state copy, and task composer interaction.
- No actionable P0, P1, or P2 findings remain.

## Iteration 4, advanced todo composer annotations

### Comparison target

- Source visual truth: `C:\Users\kaust\AppData\Local\Temp\codex-clipboard-677069e0-4710-4e07-9656-27a7a203c112.png`, plus browser comments 1 through 6 on the todo composer (advanced repeat, unambiguous reminders, color-coded place, explained Distance timing, real submit button, and Notion-style note blocks).
- Browser-rendered implementation: `C:\Users\kaust\OneDrive\Documents\ChatGPT\kriyan\screenshots\composer-advanced-full.jpg` and `screenshots\composer-advanced-mobile-top.jpg`.
- Combined visual comparison: `C:\Users\kaust\OneDrive\Documents\ChatGPT\kriyan\screenshots\composer-source-implementation.jpg`.
- Desktop viewport: 1884 × 1030 CSS pixels; full-page implementation capture: 1868 × 1370 pixels at device scale 1. Source: 1440 × 900 pixels. Both sides were normalized into 900 × 600 frames in the 1800 × 600 combined comparison.
- Phone viewport: 390 × 844 CSS pixels; visible implementation capture: 375 × 811 pixels at device scale 1 after browser chrome.
- State: new School todo titled “Plan the school week,” weekly on Monday and Tuesday, one 08:30 reminder, and an entered note.

### Full-view and focused comparison evidence

- Fonts and typography: the expanded form keeps the source's large Spectral task title, quiet serif labels, Atkinson metadata, and low optical weight. The new controls preserve hierarchy instead of introducing a dashboard treatment.
- Spacing and layout rhythm: the desktop form expands the source's single metadata line into four calm sections with the same left reading edge, generous rules, and empty paper. At phone width the fields stack in one column; repeat weekdays and the primary action remain reachable without horizontal overflow.
- Colors and visual tokens: warm paper, dark ink, muted stone text, hairline rules, and the region green match the source. Place has a visible dot driven by the selected region color.
- Image quality and asset fidelity: this screen has no raster or decorative image dependency. Native date/time affordances and Phosphor line icons remain crisp at both checked sizes.
- Copy and content: “when” is explicitly explained as where the todo appears in Distance. Reminder copy distinguishes occurrence times from one exact date and time. The blank-page placeholder is replaced by a visible writing surface and block toolbar.
- Focused interaction states: weekly interval, weekday selection, never/date/count ending rules, occurrence reminder, one-time reminder, multiple reminder rows, removable reminders, text/heading/list/table/child-page blocks, disabled/enabled submit, and successful persisted creation were inspected in the browser.

### Findings and fixes

- P1: repeat only offered a small preset list. Replaced it with interval, unit, weekday, and ending-rule controls, plus a readable summary.
- P1: reminder inputs were unlabeled and looked duplicated. Replaced them with explicit reminder rows: each-occurrence time or one-time date and time. Added multiple reminders and remove controls.
- P1: the note area was only a blank-page sentence. Added an immediately writable block surface with text, heading, bullets, numbered list, table, and child-page actions.
- P2: place and Distance timing were cryptic. Added the selected place color dot and explanatory Distance help text.
- P2: the submit action looked like quiet prose. Replaced it with a high-contrast, enabled/disabled form button and verified server-side persistence.
- Post-fix evidence: `screenshots\composer-advanced-full.jpg`, `screenshots\composer-advanced-mobile-top.jpg`, and the browser-rendered task page showing two saved reminders. A database read confirmed `["each occurrence at 08:30","once on 2026-09-01T18:00"]`; the QA record was then removed.

### Final composer pass

- ESLint and the production Next.js build pass.
- The production server runs at `http://localhost:3000` without an error overlay.
- Core composer interactions and SQLite persistence pass. No QA task remains in the local database.
- No actionable P0, P1, or P2 findings remain for the annotated composer.

## Iteration 5, spaces and composer simplification

### Comparison target

- Source visual truth: `C:\Users\kaust\AppData\Local\Temp\codex-clipboard-677069e0-4710-4e07-9656-27a7a203c112.png`, browser comments 1 through 4 on the composer, and the linked Design System Checklist design-language guidance for consistent terminology, hierarchy, and action-oriented microcopy.
- Browser-rendered implementation: `C:\Users\kaust\OneDrive\Documents\ChatGPT\kriyan\screenshots\composer-final-full.jpg`, `screenshots\notes-slash-final.jpg`, and `screenshots\spaces-manager.jpg`.
- Combined comparison: `C:\Users\kaust\OneDrive\Documents\ChatGPT\kriyan\screenshots\composer-final-comparison.jpg`.
- Desktop viewport: 1884 × 1030 CSS pixels at device scale 1. Composer full-page capture: 1868 × 1340 pixels. Slash-menu capture: 1869 × 1022 pixels. Space-manager capture: 1883 × 1030 pixels.
- Source: 1440 × 900 pixels. Source and implementation were normalized into 900 × 600 frames for the 1800 × 600 side-by-side comparison.
- Responsive check: 390 × 844 CSS pixels at device scale 1, with a visible 375 × 811 browser content area.
- State: School selected; due August 30; weekly Monday and Tuesday repeat; notes entered; enabled create-todo action. Space manager shown with the user's School, Coding, and kriyan spaces.

### Full-view and focused evidence

- Fonts and typography: Spectral remains the display and writing face, with Atkinson for controls. The new cards keep the original optical weight, italic labels, and sparse hierarchy. No new generic dashboard typography was introduced.
- Spacing and layout rhythm: the unwanted full-width divider is gone. Repeat and reminders now sit in two aligned, compact panels. Notes return to a plain writing area. The dark submit button anchors the reading column at the end of the form.
- Colors and tokens: panels use the existing paper, line, ink, muted, and green tokens. Shadows stay below the task-stone elevation. Place and space colors remain data-driven.
- Image quality and assets: this state uses no decorative raster assets. Phosphor icons remain the only icon source; no replacement SVG or text-symbol asset was introduced.
- Copy and content: “when” and “distance” inputs are removed. Due date now assigns the Distance bucket. Notes show only “notes,” with `Type '/' for blocks` as input guidance. The primary action says “create todo.”
- Focused interactions: the slash menu opens on `/`, offers paragraph, heading, bulleted list, numbered list, table, and nested page, and applies the chosen block. The create button transitions from disabled to enabled. The `new space` action opens a manager that adds, renames, and removes spaces.

### Findings and fixes

- P1: onboarding was the only reachable path for adding spaces. Added one quiet `new space` action at the end of Garden and reconnected the existing persisted space manager. A temporary Research QA space appeared immediately in Garden and was removed after verification.
- P1: Distance placement was a separate task field. Removed it from creation and editing. Due dates now map to `now` within seven days, `this season` within ninety days, and `someday` when later or absent.
- P1: notes exposed a permanent formatting toolbar. Replaced it with a slash-command menu and retained keyboard escape behavior, semantic menu roles, and the same saved HTML format.
- P2: the schedule section used a large divider and visually raw controls. Removed the divider and grouped repeat and reminders into two compact paper panels with consistent spacing and control affordances.
- P2: the final action read like quiet inline copy. Changed it to a 190-pixel rectangular `create todo` button with hover, press, disabled, and reduced-motion behavior.
- Post-fix evidence: `screenshots\composer-final-full.jpg`, `screenshots\notes-slash-final.jpg`, `screenshots\spaces-manager.jpg`, and `screenshots\composer-final-comparison.jpg`.

### Verification

- Browser checks passed for adding a space, immediate dynamic rendering, opening the composer, weekly weekday selection, slash-menu insertion, due-date persistence, and task creation.
- SQLite verified that August 30 saved as `due_date = 2026-08-30` and `horizon = now`. The QA task and QA space were then deleted.
- ESLint and the production Next.js build pass. The production server runs at `http://localhost:3000` without an error overlay.
- No actionable P0, P1, or P2 findings remain for this annotation pass.

## Follow-up polish

- P3: section colors could become user-editable later. The current prototype assigns them in a calm repeating palette.
- P3: deleting a populated space currently moves its todos to Unsorted. A later product pass could offer a destination picker in the confirmation.

final result: passed
