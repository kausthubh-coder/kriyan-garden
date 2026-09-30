<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kriyan project rules

Kriyan is an open-source (MIT) planner that makes organising and planning your life easy, and lets the AI you already use (ChatGPT, Claude, Cursor and others) plan with you. Areas are whatever the person chooses; School, Business and Life are only the suggested defaults, never the product's frame. It ships as a web app, an Android app, an MCP server and a CLI, all on one Convex backend with Clerk for identity.

## Read first

- `docs/PLAN.md` is the implementation plan. Follow its architecture, data model and auth design.
- `docs/design/proposals/prototype/` is the approved design as a working HTML prototype (`index.html`, `app.css`, `app.js`). It is the source of truth for layout, colour, type, spacing, copy and interaction. Port it; do not reinterpret it.
- `docs/design/reference/` holds newer reference designs for specific screens (`web.html`, `android.html`, `landing.html`, sharing `ref.css`). Where a reference covers a screen, it overrides the prototype. Open them in a browser before writing code. `docs/design/reference/audit/` holds screenshots of what the references replace.
- Task briefs live in `.agents/briefs/`. Do exactly what the brief asks and nothing outside its scope.

## Product rules

- Dark theme only. Do not build a light theme.
- No garden language anywhere: no "garden", "plant", "stone", "seed", "bed", "grow". Use plain words: task, area, project, course, goal, day, week.
- The length of a task is optional. Never require a duration, and never invent one.
- Android only for mobile. Do not add iOS-specific work.

## Design rules

- Colours, spacing, radii, type sizes and motion come from the tokens in `packages/core`. Do not hard-code values that a token covers.
- One typeface: Schibsted Grotesk, weights 400 to 700. No monospace for labels.
- Colour only ever means an area (each area has one of the eight named colours; the defaults are School blue, Business orange, Life green) or a status (hot red for late or over). Primary buttons are neutral ink.
- Copy never assumes the three default areas. Say "your areas" or name the person's own areas; sample data may use the defaults.
- Never: gradients, glow, glassmorphism, coloured side stripes on cards, nested cards, uppercase eyebrow labels, emoji as icons, bounce or elastic easing.
- Motion: press feedback 160ms, transitions 150 to 250ms, ease-out `cubic-bezier(0.23, 1, 0.32, 1)`. Animate only `transform` and `opacity`. No animation on keyboard-triggered actions. Respect `prefers-reduced-motion`.
- On touch devices (`pointer: coarse`, and always in the Android app) every target is at least 44px. On desktop with a fine pointer, controls are 32 to 36px tall. Text contrast is at least 4.5:1. Status is never shown by colour alone.
- Every control has hover, focus-visible, active and disabled states. Every view has loading, empty and error states.
- Dates shown to people read like "Thu 1 Oct" or "Today"; times read like "14:30". Never show a raw ISO date or the browser's native date format as a value.
- Area filters and area labels are a coloured dot plus a neutral text label. Never colour the text itself.
- Copy: sentence case, buttons are verb plus object ("Add task"), no em dashes, no middle-dot separators, errors say what happened and what to do.

## Engineering rules

- Package manager is Bun. Use Bun workspaces. Do not add npm, pnpm or yarn lockfiles.
- TypeScript strict. No `any`, no `@ts-ignore`, no non-null assertions on values that can really be null.
- Every Convex function checks identity first and reads or writes only rows owned by that identity. Queries use an index that starts with `ownerId`.
- Business logic lives once, in the shared operations layer in the backend or in `packages/core`. Web, mobile, MCP and CLI call it; they do not reimplement it.
- "Today" always comes from the local date or timezone of the user, never from the UTC date of the server.
- Never commit secrets. `.env*` files stay ignored except `.env.example`. Never print the contents of an env file.
- Do not commit, push, deploy or change cloud settings unless the brief says so. Leave changes in the working tree for review.
- Before you finish, run the verification commands in the brief and report their real output, including failures.
