# Kriyan design proposals, round 2

Three directions for the home screen, built as static HTML mockups. Open `index.html`, or run `./shoot.sh a-today b-daytrack c-momentum` to regenerate the screenshots in `shots/`.

## Why round 1 was rejected

- All seven garden variations shared one skin: beige background, serif type, white cards with a coloured side stripe. Only the card arrangement changed.
- That skin matches a pattern Anthropic's frontend-design skill names as generic AI output (cream background, serif display, terracotta accent). Impeccable calls the side-stripe card "the most recognizable tell".
- The spatial layouts showed about 8 tasks per screen and could not be scanned.
- None showed goals, progress, or the life / business / school structure.

## What all three proposals share

- Three Areas (School, Business, Life), each with one colour. Projects and courses sit inside an area.
- One merged Today, filterable by area.
- Goals are optional and shallow: Area, Goal, Project or Habit, Task. Progress is shown against where you should be today.
- Deadlines show time needed against time free, so you see "3h to spare" or "3h short".
- Habits use a weekly target ("5 of 7"), not a streak that resets.
- One quick-add grammar ("econ outline fri 5pm #econ 45m") for web, mobile, CLI and MCP.
- Command palette on Ctrl K and single-key shortcuts on web; bottom tabs, a centre add button and bottom sheets on mobile.

## The three directions

| | A, Today | B, Day Track | C, Momentum |
|---|---|---|---|
| Home screen answers | What is on my list? | When will I do it? | Am I moving toward my goals? |
| Main view | List grouped by area | Day timeline with blocks | Three colour fields with goal and tasks |
| Look | Light, quiet, precise | Dark, solid colour blocks | Bold colour, very large type |
| Typeface | Hanken Grotesk | Schibsted Grotesk | Bricolage Grotesque and Hanken Grotesk |
| Density | High | Medium | Low |
| Closest reference | Things 3 | Structured, Sunsama | None direct |
| Main risk | Least distinctive | Needs durations on every task | Fewest tasks per screen; colour can tire |

Layout and look can be mixed. For example, A's list with C's colour and type.

## Rules followed (from the research)

- Body text 15 to 16px, nothing functional below 11.5px, one type family for product UI (two in C, clearly distinct).
- Text contrast 4.5:1 or better, colour never the only signal (status always has words).
- One accent per view. In A and B the accent is neutral ink, so colour only ever means an area.
- 4px spacing scale, tight inside groups and generous between them.
- No nested cards, no side-stripe cards, no gradients, no glow, no uppercase eyebrow labels.
- Touch targets 44px or larger on mobile.
- Motion (for the build): 100 to 160ms press feedback, 150 to 250ms transitions, ease-out, none on keyboard actions.

## Sources

Impeccable (pbakaus/impeccable), UI Skills (ibelick/ui-skills), Anthropic frontend-design skill, Vercel Web Interface Guidelines, Emil Kowalski's blog and skills repo, Rauno Freiberg's interface guidelines, Apple HIG, Material 3 motion tokens, WCAG 2.2. Product research covered Things 3, Linear, Todoist, TickTick, Sunsama, Structured, Tiimo, Strides, Griply, Shovel and MyStudyLife.

Not reachable: Refactoring UI (blocked), animations.dev (paid), and the one academic study on spatial versus list layouts.
