# Web browser checks

Run from the repository root with Bun. Put the development Clerk keys and Convex URL listed in `apps/web/.env.example` in `apps/web/.env.local`. The Clerk instance must have its `convex` JWT template configured for that backend.

Install the browser inside this repository:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.agents/playwright-browsers"
bunx playwright install chromium
bun run e2e
```

The setup project uses `@clerk/testing` to obtain a testing token, creates a disposable development user, signs in through Clerk's test helper, and saves an ignored authentication state. The suite completes onboarding before checking the planner. Teardown tests the typed RESET guard, clears that user's planner, and deletes the disposable user.

`E2E_CLERK_USER_EMAIL` can select an existing dedicated test user with an empty planner instead. This user is retained after the run. These tests create and edit planner records, so use a test account.

`E2E_SCREENSHOT_USER_EMAIL` optionally selects a dedicated prototype fixture account for the twelve captures in `.agents/screenshots/03/`. Without it, screenshots use the disposable planner. Captures temporarily supply missing goal dates on an older fixture and restore those fields afterward. Authentication files, browser downloads, traces and screenshots are ignored by Git.

The new `profiles.seedSample` operation is covered by local backend tests. Exercising its onboarding button against a hosted backend requires that operation to have been deployed separately.

Brief 03c captures all five welcome steps at 1440x900 and 390x844 during the onboarding test. Settings captures include the initial Areas section and each of its seven sections at both sizes. These files are saved in `.agents/screenshots/03c/`.

The configuration tests cover goal-panel URL state, editing, read-only cards, and Escape, initial focus and return focus for every app dialog and panel at both sizes. The deletion test first probes `goals:deleteForUndo` with an invalid ID, which cannot change data. It reports a skip if that function is missing from the hosted backend. Deploying backend functions is outside brief 03c; deletion, restore and owner isolation are also covered by local Convex tests.

Clerk references: [Playwright setup](https://clerk.com/docs/guides/development/testing/playwright/overview) and [test helpers](https://clerk.com/docs/guides/development/testing/playwright/test-helpers).
