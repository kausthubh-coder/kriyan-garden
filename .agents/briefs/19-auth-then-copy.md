# Brief 19: one session, three jobs, in this order

You are the only Codex session running. The machine has little free memory: run one dev server, one Playwright worker and one build at a time, stop every process you start, and do not start the Android emulator in this brief.

Read `AGENTS.md` first. Branches `v2-skill` (the `test-kriyan` skill scripts) and `v2-qa` (partial QA fixes) were just merged into `v2`.

## Job 0: repair the merge

1. `bun run test` fails in `apps/web/src/components/app/Onboarding.test.tsx`: "Continue accepts a corrected goal after an earlier queued save fails". That test came from `v2-qa`; the onboarding save logic it covers was also changed by brief 14. Read both changes (`git log -p -3 -- apps/web/src/components/app/useInlineSave.tsx apps/web/src/components/app/Onboarding.tsx apps/web/src/components/app/OnboardingGoal.tsx`), keep the behaviour the test describes (a corrected value saved after an earlier queued save failed must let Continue advance), and make the whole suite pass.
2. Deploy the merged functions to the development deployment: `bunx convex dev --once` in `packages/backend`.
3. In the add goal dialog (`GoalDialog.tsx`), the "Add goal" button's right edge sits 8px outside the dialog's content edge (the dividers end at the padding box, the button passes it). Align the footer to the same padding as the rest of the dialog.
4. Run the full web e2e suite once and fix anything the merges broke.

Commit job 0 on `v2` when it is green (this brief authorises commits on `v2`, one per job, with plain conventional messages). Do not push.

## Job 1: brief 18

Do everything in `.agents/briefs/18-auth-without-dashboard.md`. The skill scripts now exist in `.agents/skills/test-kriyan/scripts/`; use them and fix them where brief 18 changes the rules:

- `doctor.mjs` must stop checking for the six custom scopes and for user API keys. It checks instead: development keys, Convex deployment matches, dynamic client registration on, client metadata documents on, the audience claim on, and that the "Kriyan CLI" OAuth application exists with PKCE and the loopback redirect.
- `oauth.mjs` requests only `openid profile email` (plus `offline_access` when `--refresh` is passed).
- `apikey.mjs` is deleted, with its row in `SKILL.md`.
- `SKILL.md`: rewrite the MCP, API and CLI procedures for the new model and replace the "What still needs a person" section with "Nothing needs the Clerk dashboard", stating what is configured and how it was done. Then run `bun run skills:sync`.

Commit job 1 when the proofs in brief 18 pass and its report is written.

## Job 2: brief 17

Do everything in `.agents/briefs/17-positioning-copy.md`. Commit when green.

## Finish

Run `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` and the web e2e suites one final time and put the real output tails in `docs/reports/19-summary.md`, with one line per job saying what changed and anything that still fails. Delete every Clerk test user you created (`user.mjs list` must show only the two fixtures at the end).
