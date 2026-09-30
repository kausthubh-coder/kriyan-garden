# Brief 08: finish the in-progress merge of `codex/kriyan-android` into `v2`

The repository is mid-merge (`git status` shows `UU` and `AA` files). Finish it. Do not abort the merge and do not reset.

## Conflicts and how to resolve each

1. `package.json` (root): keep HEAD's `test` and `docs:quick-add` scripts, and take the Android side's addition to `typecheck` (`&& tsc -p scripts`) only if `scripts/tsconfig.json` exists after the merge. Keep both sides' other additions (workspaces, overrides).
2. `packages/backend/package.json`: keep both dependencies. Pin `@convex-dev/expo-push-notifications` to the exact version currently resolved in the Android branch's lockfile, not `latest`.
3. `packages/backend/convex/convex.config.ts`: use both components:
   ```ts
   const app = defineApp();
   app.use(rateLimiter);
   app.use(pushNotifications, { env: {} });
   export default app;
   ```
   Keep whichever import path form for each package actually resolves; check `node_modules`.
4. `packages/backend/convex/schema.ts`: keep HEAD's `serviceNonces` and `serviceInvocations` tables and every table the Android side added (`pushTokens`, `reminderJobs`, anything else). Nothing is dropped.
5. `packages/backend/convex/model/tasks.ts`: this is a true both-sides change. The result must contain all of:
   - HEAD's `lookup`, `filteredList`, `completeWithNext` (returning `{ task, nextOccurrence }`) and the reminder validation lines (max 8 reminders, reminders need a date, `at_start` and `before` need a time).
   - The Android side's reminder scheduling: every place the Android side calls into `reminders` (`reminders.cancel`, `reminders.schedule` or whatever its names are) on create, update, complete, reopen and remove must still happen, including for the next occurrence created by a repeating task.
   - One `nextDate` function, not two.
   - If `complete` and `completeWithNext` both exist, `complete` must be a thin wrapper over `completeWithNext` so the rules cannot drift.
   Formatting: keep the Android side's Prettier formatting for the whole file.
6. `packages/backend/convex/_generated/api.d.ts`: do not hand-merge. After the source files are resolved, regenerate with `bunx convex codegen` from `packages/backend` (or `bunx convex dev --once` if codegen needs the deployment; `.env.local` there selects the dev deployment, and pushing to the dev deployment is allowed for this brief).
7. `docs/site/android.md`: keep the Android side's longer document. Fold in anything from HEAD's 17-line version that the longer one lacks. Follow the copy rules in `AGENTS.md`.
8. `bun.lock`: do not hand-merge. Take either side, then run `bun install` so it is regenerated for the merged manifests.

## After resolving

- `git add` the resolved files and complete the merge with `git commit --no-edit` (this brief authorises that one commit). Do not push.
- Run and report the real final lines of:
  ```
  bun install
  bun run typecheck
  bun run lint
  bun run test
  bun run build
  ```
  If the mobile workspace has its own typecheck, lint or tests, they must run as part of these and pass.
- Fix anything the merge broke. If a test on either side was testing behaviour the other side changed, keep the stricter behaviour and say so.
- Report: each conflict and how it was resolved, any behaviour you had to choose between, and whether the Convex dev deployment now has the merged functions.
