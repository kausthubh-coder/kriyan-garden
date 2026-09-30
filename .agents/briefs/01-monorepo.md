# Brief 01: restructure into a Bun monorepo

Read `AGENTS.md` and `docs/PLAN.md` sections 2 and 4 first.

## Goal

Move the existing app into a monorepo with no change in behaviour. After this brief the web app builds and runs exactly as before, from `apps/web`.

## Target layout

```
package.json            workspaces: ["apps/*", "packages/*"], private, packageManager bun
bunfig.toml             [install] linker = "hoisted"
apps/web/               the Next.js app (src/, public/, next.config.ts, eslint.config.mjs, tsconfig.json, package.json)
packages/backend/       package name @kriyan/backend; contains convex/
packages/core/          package name @kriyan/core; new, see below
docs/                   already exists
.github/workflows/ci.yml
```

## Steps

1. Use `git mv` so history follows the files.
2. `apps/web/package.json` is named `@kriyan/web` and keeps the current dependencies and scripts. Add `"typecheck": "tsc --noEmit"`.
3. `packages/backend/package.json` is named `@kriyan/backend`, depends on `convex`, and has scripts `dev` (`convex dev`), `deploy` (`convex deploy`), `typecheck` (`tsc --noEmit -p convex`). Apps import `@kriyan/backend/convex/_generated/api` and `@kriyan/backend/convex/_generated/dataModel`.
4. Update every import in `apps/web` that reaches into `convex/` to use `@kriyan/backend/...`.
5. Pin `react` and `react-dom` to exactly `19.2.3` in the root `package.json` `overrides` and in `apps/web`. A later brief adds Expo SDK 57, which requires this version.
6. Root scripts: `dev` (web), `build` (web), `lint`, `typecheck` (all workspaces), `test` (all workspaces). Use `bun run --filter`.
7. Create `packages/core` as plain TypeScript with no React and no DOM. For now it contains only:
   - `src/quickAdd.ts`: a typed port of the `parse` function in `docs/design/proposals/prototype/app.js`. It must be pure. It takes the text plus a context object `{ today: string (YYYY-MM-DD), defaultDate: string | null, defaultAreaId: string, areas: {id, name}[], projects: {id, name, areaId}[] }` and returns `{ title, areaId, projectId, date, time, durationMinutes }`. It must not read the clock or any global.
   - `src/dates.ts`: the date helpers the parser needs (`addDays`, `toIsoDate`, weekday lookup), all working on `YYYY-MM-DD` strings in local calendar terms.
   - `src/index.ts` exporting both.
   - `src/quickAdd.test.ts` using `bun test`. Cover at least these inputs, with `today` fixed to `2026-09-29` (a Tuesday):

     | Input | Expected |
     |---|---|
     | `gym tomorrow 7am` | title "Gym", date 2026-09-30, time 07:00, duration null |
     | `call amma` | title "Call amma", date = defaultDate, time null, duration null |
     | `essay fri #econ 2h` | title "Essay", project Econ 101 and its area, date 2026-10-02, duration 120 |
     | `read for 20 minutes at 9` | title "Read for 20 minutes", time 09:00, duration null |
     | `standup 9:30 15m #biz` | title "Standup", area Business, time 09:30, duration 15 |
     | `revise 1h30m tonight` | title "Revise", date 2026-09-29, duration 90 |
     | `buy milk later` | title "Buy milk", date null |
     | `lunch at 1` | time 13:00 |
     | `report tue` | date 2026-10-06 (the next Tuesday, not today) |
     | empty or whitespace only | title "" |

8. Delete from the working tree: `design-qa.md`, `design-references/`, `screenshots/`. They are in git history.
9. Add `.github/workflows/ci.yml` that runs on pull requests and pushes to `main` and `v2`: checkout, setup Bun 1.3.14, `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`. Check whether the build needs `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or `MCP_SERVICE_SECRET` to succeed. If it does, supply obviously fake placeholder values in the workflow. Never put a real secret in the workflow.
10. Move `.env.example` to `apps/web/.env.example`. The local `.env.local` at the repo root must be moved to `apps/web/.env.local` (it is ignored by git; move it, do not print it).
11. Update `README.md` for the new layout and commands. Remove garden wording from the README.
12. Regenerate `bun.lock` with `bun install`.

## Out of scope

Do not change the UI, the Convex schema, the MCP tools, or any behaviour. Do not add Expo, the CLI, or Turborepo.

## Verify and report

Run from the repo root and paste the real final lines of output for each:

```
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

Then list every file you created or deleted, and anything you were unsure about.
