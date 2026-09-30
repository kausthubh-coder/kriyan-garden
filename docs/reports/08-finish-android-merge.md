# Android merge completion

Completed brief 08 by resolving the existing merge of `codex/kriyan-android` into `v2`. No reset, merge abort, push, release, or production deployment was performed. The brief authorizes one merge commit with `git commit --no-edit`.

## Conflict resolutions

| File | Resolution |
| --- | --- |
| Root `package.json` | Kept HEAD's grammar-doc check, sequential workspace tests, and `docs:quick-add`. Added `&& tsc -p scripts` because `scripts/tsconfig.json` exists. Kept the workspace definitions and all existing overrides. Root workspace filters include Android's typecheck, lint, and tests. |
| Backend `package.json` | Kept rate-limiter `0.4.0` and added push notifications pinned to `0.3.1`, the exact version in the Android branch's lockfile. Kept HEAD's shared-operation exports. |
| `convex.config.ts` | Registered both rate limiting and push notifications, with `app.use(pushNotifications, { env: {} })`. Verified the installed package export maps resolve the existing import forms. |
| `schema.ts` | Kept all 13 tables, including both service tables and Android's `pushTokens` and `reminderJobs`. Compared the merged table names against both conflict stages; neither side lost a table. |
| `model/tasks.ts` | Kept `lookup`, indexed `filteredList`, and `completeWithNext` returning `{ task, nextOccurrence }`. Preserved scheduling on create, update and reopen, and cancellation on completion and removal. Repeating completion uses `create`, which schedules the next occurrence. `complete` is a thin wrapper over `completeWithNext`. Kept the shared `nextDate` import and removed Android's duplicate implementation. Formatted the entire file with Prettier and checked it. |
| `_generated/api.d.ts` | Regenerated from the merged source using `bunx convex codegen` in `packages/backend`, including both components and all source modules. Did not hand-merge it. |
| `docs/site/android.md` | Kept the longer Android guide. Added HEAD's installation, update, permission, web-demo labelling, and release-verification guidance. Updated the reminder instructions to match the stricter validation. |
| `bun.lock` | Regenerated with `bun install` from HEAD's lockfile and the merged manifests. The initial Android lockfile base retained incompatible older Clerk packages. HEAD's base preserves Clerk Next.js `7.9.8`, React SDK `6.17.3`, shared types `4.37.0`, and Convex `1.46.0`, while adding Android dependencies and the exact push-component pin. |

## Behavior choices and integration fixes

- Preserved HEAD's maximum of eight reminders, required task date, and required task time for `at_start` and `before`. Android's task editor now stops adding reminders at eight instead of 20.
- Removing a task's date while leaving reminders is rejected. The Android test now checks that rejection leaves pending jobs intact, then clears the date and reminders together and checks cancellation. It restores reminders before checking deletion, so deletion still exercises real pending jobs.
- Expanded the service completion regression to check cancellation of the original reminder, scheduling for the returned next occurrence, and no duplicate occurrence or job on repeated completion. Validation checks also cover `at_start` without a time and nine reminders.
- Regenerated Android's native theme from the merged core tokens. It had omitted HEAD's added area colours and type sizes. The existing generated-theme test now passes without weakening it.
- Both branches defined `/download`, as a route handler and a page. The production build rejected this combination. Kept HEAD's route handler and shared release URL constant, and removed Android's duplicate page. The release redirect behavior remains available.

## Verification

All five required commands exited with code 0. Logs are under `.agents/logs/08-*.txt`, ignored by Git. Final install used `BUN_INSTALL_CACHE_DIR` pointing to `.agents/cache/bun` inside this repository.

`bun install` ended with:

```text
Checked 1588 installs across 1550 packages (no changes) [1.89s]
```

`bun run typecheck` includes Next.js route generation, every workspace, and `tsc -p scripts`. Workspace completion lines:

```text
@kriyan/core typecheck: Exited with code 0
kriyan typecheck: Exited with code 0
@kriyan/backend typecheck: Exited with code 0
@kriyan/web typecheck: Exited with code 0
@kriyan/mobile typecheck: Exited with code 0
```

`bun run lint` ended with:

```text
kriyan lint: Exited with code 0
@kriyan/mobile lint: Exited with code 0
@kriyan/web lint: Exited with code 0
```

`bun run test` passed the quick-add documentation check and 223 tests: backend 42, core 80, Android 2, web Bun 13, web Vitest 45, and CLI 41. Its final workspace ended with:

```text
kriyan:test          |  41 pass
kriyan:test          |  0 fail
kriyan:test          |  142 expect() calls
kriyan:test          | Ran 41 tests across 2 files. [657.00ms]
kriyan:test          | Done in 749ms
```

`bun run build` built Next.js 16.3.3, compiled successfully in 6.6s, completed TypeScript in 42s, generated all 37 static pages, and included `/download`. Its final line:

```text
@kriyan/web build: Exited with code 0
```

Additional Android integration check, `bun run --filter @kriyan/mobile bundle`, exported the Android Hermes bundle with 2077 modules. Final lines:

```text
@kriyan/mobile bundle: Exported: dist
@kriyan/mobile bundle: Exited with code 0
```

`bunx convex codegen` exited 0 and ended with `Generating TypeScript bindings...` and `Running TypeScript...`. `git diff --check` and the task-model Prettier check passed.

Earlier failures were fixed before the merge commit: the native-theme test failed, web typecheck rejected incompatible Clerk UI types, and the first web build rejected the duplicate `/download` definitions. Two early install attempts overlapped and reported Windows `ENOTEMPTY`/`EBUSY` cache errors. Both were stopped; serial installation with a repository-local cache succeeded.

## Convex dev deployment

The dev deployment does **not** have the merged functions. `convex codegen` generates local types and analyzes source without changing the running deployment. Its progress message `Uploading functions to Convex...` is part of that analysis, not a completed deployment.

Read-only `bunx convex function-spec --file` inspected 147 deployed functions. The spec lacks `pushTokens.js:register`, `reminders.js:deliver`, `tasks.js:lookup`, `service.js:tasksCompleteWithNext`, and `service.js:tasksFilteredList`. The captured spec is `.agents/logs/08-dev-functions.json`. No `convex dev --once` or deploy command was run.

No APK was rebuilt or published in this brief. Android bundle export and controlled reminder tests passed; live push delivery and native Google sign-in were not exercised here.
