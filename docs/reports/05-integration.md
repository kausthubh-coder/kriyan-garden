# Services integration into v2

Integrated reviewed `codex/kriyan-services` at `7e4eed46e23cfe2f5fa42374c9358857b167cfcc` into the open no-commit merge over v2 HEAD `6b9ac0a94a4b0ff872e85c7a8f6ce4648efeb6fb`. Source changes were confined to `C:/Users/kaust/OneDrive/Documents/ChatGPT/kriyan-v2`. HEAD and MERGE_HEAD remain unchanged. No commit, push, deployment, publishing or cloud settings change was made.

## Final changes

- Resolved `packages/backend/convex/model/tasks.ts` with the shared pure `nextDate` import, services owner-indexed filtering and strict reminder validation. `completeWithNext` returns the completed task and actual next occurrence; a duplicate completion returns no next occurrence. Existing `complete` still returns only the task. Duration remains optional.
- Kept the pure `assemble` and `nextDate` modules and their demo imports. The 03c goal panel, selection, deletion snapshots, atomic restore and protection of changed or foreign tasks remain intact. Service `setProgress` adds to that model without replacing Undo. Landing pages, public demo access and the existing proxy are unchanged from HEAD.
- Kept the reviewed REST and MCP operations, metadata and authentication. Clerk's pinned direct backend SDK verifies the actual OAuth bearer and exact audience. Canonical resources remain the public origin plus exactly `/api/v1` or `/mcp`. Scoped user API keys use their separate Clerk path, and organization keys are rejected.
- Kept CLI resource binding on authorization, exchange and refresh, stored resource/client metadata, and OS keychain behavior. Kept server-generated invocation IDs, one budget for compound calls, separate read/write limits and global `serviceNonces` replay guards that survive account reset.
- Resolved `apps/web/package.json` with both sets of scripts and dependencies. `test:bun` explicitly runs the three existing web Bun files; `test:services` runs the two services/SDK Vitest files. Web `test` runs both in sequence. The services Vitest configuration still selects `src/lib/operations/**/*.test.ts`. Public Playwright, capture and Lighthouse scripts are retained.
- Root `test` keeps the quick-add documentation check and uses `bun run --sequential --filter '*' test`. Backend and web services Vitest scripts use `--maxWorkers=1`. No suite was converted or removed.
- Regenerated `bun.lock` with Bun 1.3.14 from combined branch records, then installed with `--frozen-lockfile --ignore-scripts`. Retained the landing dependencies, including `sharp@0.35.4`, and reviewed pins: `@clerk/backend@3.21.0`, `@clerk/mcp-tools@0.6.0`, MCP server/core `2.2.0`, MCP SDK `1.31.0`, `mcp-handler@2.2.0`, rate limiter `0.4.0`, keyring `2.1.0`, `tsdown@0.23.0` and Vitest `5.0.2`. Clerk MCP tools' nested SDK `1.30.0` also matches the reviewed services lockfile. No upgrade beyond the reviewed merge dependencies was added.

No Android source or reminder scheduling was added. Those changes remain for the later Android merge. No agents or nested CLI workers were started. The existing server on port 3008 was not stopped or reconfigured.

## Test collection and actual counts

Root `bun run test` exited 0. It printed `Quick-add docs match tested grammar fixtures.` and passed **182 tests across all 13 unit test files**, with zero failures. Bun file counts come from its actual per-test output; Vitest declarations, including the two MCP protocol cases, match its reported package totals.

| Runner | File | Passed tests |
| --- | --- | ---: |
| Bun | `packages/core/src/goals.test.ts` | 3 |
| Bun | `packages/core/src/planning.test.ts` | 2 |
| Bun | `packages/core/src/quickAdd.test.ts` | 75 |
| Vitest | `packages/backend/convex/__tests__/isolation.test.ts` | 3 |
| Vitest | `packages/backend/convex/__tests__/model.test.ts` | 18 |
| Vitest | `packages/backend/convex/__tests__/service.test.ts` | 7 |
| Bun | `apps/web/src/lib/origins.test.ts` | 1 |
| Bun | `apps/web/src/components/app/goalSelection.test.ts` | 1 |
| Bun | `apps/web/src/components/demo/store.test.ts` | 11 |
| Vitest | `apps/web/src/lib/operations/operations.test.ts` | 19 |
| Vitest | `apps/web/src/lib/operations/oauth.test.ts` | 1 |
| Bun | `packages/cli/src/cli.test.ts` | 36 |
| Bun | `packages/cli/src/credentials.test.ts` | 5 |
| Total | 13 files | 182 |

Actual runner summaries were backend `Test Files 3 passed (3)`, `Tests 28 passed (28)`; core `80 pass`, `0 fail`, `100 expect() calls`; web Bun `13 pass`, `0 fail`, `122 expect() calls`; web Vitest `Test Files 2 passed (2)`, `Tests 20 passed (20)`; CLI `41 pass`, `0 fail`, `142 expect() calls`. Backend took `5.84s`, core `90ms`, web Bun `94ms`, web Vitest `3.40s`, CLI `687ms`.

Coverage includes goal Undo and rollback, shared recurrence arithmetic and idempotent completion, optional length, local dates, owner isolation, replay and rate limits, real installed Clerk SDK audience enforcement with fake BAPI transport, both MCP protocol revisions, API-key scopes, CLI resource-bound refresh and fake-keychain/file storage. These are offline tests, not live provider evidence.

## Commands and real results

All commands below exited 0. Commands ran from the checkout root except those explicitly marked CLI, which ran in `packages/cli`.

| Command | Actual result |
| --- | --- |
| `bun install --lockfile-only --ignore-scripts` | `Saved bun.lock (836 packages)` |
| `bun install --frozen-lockfile --ignore-scripts` | Initial install: `35 packages installed [11.54s]`; final confirmation: `Checked 713 installs across 836 packages (no changes) [1.69s]` |
| `bun run --filter @kriyan/web typegen` | `Generating route types...`, `Types generated successfully`, exit 0 |
| `bun run --filter @kriyan/core typecheck` | `@kriyan/core typecheck: Exited with code 0` |
| `bun run --filter @kriyan/backend typecheck` | `@kriyan/backend typecheck: Exited with code 0` |
| `bun run --filter @kriyan/web typecheck` | `@kriyan/web typecheck: Exited with code 0` |
| CLI: `bun run typecheck` | `$ tsc --noEmit`; exit 0 |
| `bun run --filter @kriyan/web lint` | `@kriyan/web lint: Exited with code 0` |
| CLI: `bun run lint` | `$ eslint src tsdown.config.ts`; exit 0 |
| `bun run test` | Documentation check and all 182 tests passed as listed above |
| CLI: `bun run build` | tsdown `0.23.0`, Rolldown `1.2.11`; one ESM file, `38.02 kB`, gzip `11.53 kB`; `Build complete in 100ms` |
| CLI: `node dist/kriyan.js --help` | Printed usage, all commands and configuration help; exit 0 |
| CLI: `bun pm pack --ignore-scripts --destination ../../.data/05-integration` | `kriyan-0.1.0.tgz`; 3 files: package.json, README.md, dist/kriyan.js; packed `14.88KB`, unpacked `46.16KB` |
| `bunx --package C:/Users/kaust/OneDrive/Documents/ChatGPT/kriyan-v2/.data/05-integration/kriyan-0.1.0.tgz kriyan --help` | Local tarball printed Kriyan CLI usage; exit 0 |
| `npx --yes --cache .data/05-integration/npm-cache --package=C:/Users/kaust/OneDrive/Documents/ChatGPT/kriyan-v2/.data/05-integration/kriyan-0.1.0.tgz kriyan --help` | Same local tarball printed Kriyan CLI usage; exit 0 |
| `git diff --check` and `git diff --cached --check` | No output; exit 0 |

The bundle is exactly 38,023 bytes and the tarball 14,877 bytes. Bun performed repository installation and packaging. Npx was only a consumer check of the local tarball with its cache inside ignored `.data/`; it did not publish or add a tracked npm lockfile.

Raw verification logs, dependency-pin checks, file inventory, tarball and temporary scripts are under ignored `.data/05-integration/`. No env contents, real bearer values or signed service envelopes were printed or copied into this report.

## Failures, skips and review state

No verification command failed and no collected test was skipped. Core and backend have no lint script; their configured TypeScript and test gates passed. Root-wide typecheck/lint aliases were not repeated after equivalent scoped checks.

Production web build, Lighthouse, Playwright/browser QA, Android/native verification, Convex deployment/codegen requiring cloud access, and live OAuth/API-key checks were skipped under the integration constraints. The CLI bundle is the only build run. Live authentication still requires the supervisor configuration and deployed backend described in [05-development-oauth.md](../setup/05-development-oauth.md); no new live pass is claimed.

Only the three conflict paths were explicitly staged to mark them resolved. Automatically staged incoming merge files remain as supplied by Git. Root `package.json`, the backend test-runner adjustment and this report remain outside those conflict-resolution staging changes for root review. Scratch files and logs remain ignored and unstaged. The merge stays open, with no unmerged entries and no commit.
