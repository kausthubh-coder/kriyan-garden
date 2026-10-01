# Brief 15 functional QA

1 October 2026. This is the item-by-item evidence record for Brief 21. Work is still running. Final limits, defects, cleanup and measured results are in [21-final-qa.md](21-final-qa.md).

Brief 18 supersedes the older dashboard scopes and user API-key setup. No Clerk instance settings were changed. Local checks use a production build and the development Convex deployment. Production checks use kriyan.app, app.kriyan.app and calm-salamander-183. Real disposable Clerk development-instance users are used throughout.

## Item results

| Item | Result | Evidence and limit |
|---|---|---|
| 1 | Pass | Local and production functional suites. Real sign-up with prepared email code, sign-in and sign-out. Anonymous HTML /app enters Clerk handshake. |
| 2 | Pass | Typed setup, reload resume, sample path and custom areas in functional-qa and onboarding-settings. Local full suite passes. |
| 3 | Pass | 15-live grammar compares 54 tokens and 20 saved rows with the documentation at both widths, local and production. |
| 4 | Pass locally; production error mapping fails | Functional suites cover all task properties, clearing and optional length. Production invalid time without date returns 500 instead of 400. Local ConvexError fix awaits reviewer deployment. |
| 5 | Pass | Timeline E2E covers tray placement, movement, resize, overlap and day bounds. 15-live checks the now line at the profile minute. |
| 6 | Pass | Task lifecycle suite verifies complete/reopen/delete Undo and expiry after reload with saved-state checks. |
| 7 | Pass | 15-live reads exactly one next occurrence for daily, chosen weekdays, month-end and leap-day repeats, including concurrent completion. |
| 8 | Pass | 15-live stores all five reminder kinds, rejects timed reminders without time and more than eight, then verifies jobs and cancellation. |
| 9 | Pass | 15-live and goal E2E cover number, tasks and milestones, four pace states, linked-task deletion and Undo. |
| 10 | Pass locally; production refusal copy fails | All configuration and settings tests pass locally. Production in-use area deletion is correctly refused but reports generic Server Error. ConvexError and UI adapter fix awaits deployment. |
| 11 | Pass | Filters, URL reload and browser back/forward pass locally and production. Final history receipts supersede the original navigation race. |
| 12 | Pass | Functional suites cover palette and keyboard shortcuts. Full planner suite verifies modal focus return. |
| 13 | Pass | Both widths make three offline additions and reconnect; direct reads find exactly one of each. |
| 14 | Pass | Two browser windows receive changes without reload in 15-live, local and production. |
| 15 | Pass | Two real identities attempt foreign task/goal URLs and direct backend operations. Production API/MCP additionally preserve both owners in both directions. |
| 16 | Pass | Auckland and Honolulu profile dates, deadlines and DST dates are verified in 15-live at both widths. |
| 17 | Pass | Reset checks all 13 tables and preserves B. Leftover production smoke account is deleted through app Security. Final global cleanup is recorded in report 21. |
| 18 | Pass locally; production Day accessibility fails | Local axe passes 11 routes at both widths. Production phone Day loading has serious scrollable-region-focusable. Named focusable region fixes it locally. Dialog-specific gallery axe and focus evidence are listed in report 21. |
| 19 | Pass | Public suite covers demo add/drag/complete/reset, quick-add strip, setup tabs/copy and download. Mobile pointer-only demo drag is intentionally skipped. |
| 20 | Pass | 109 route/link checks across local and production have no unexpected errors. Docs and actual CLI commands are checked together. |
| 21 | Pass | Public metadata, Open Graph image, robots, sitemap, CSP and security header probes pass. Anonymous HTML app navigation is separately verified. |
| 22 | Measured | Twelve Lighthouse runs: landing, docs and signed-in Day, desktop/mobile, local/production. Results and limits are in report 21. |
| 23 | Pass on both environments | Real DCR/PKCE/consent, tools/list, all 21 tools and saved read-backs pass on both supported protocol revisions. Local production build uses HTTPS loopback resources. |
| 24 | Superseded by Brief 18 | The approved standard-scope identity design does not use custom read/write scopes. Auth and resource audiences are enforced. No Clerk dashboard settings were changed. |
| 25 | Pass | API token is refused by MCP and MCP token by API, both 401. |
| 26 | Production fail; local fix passes | 65-read burst exposes sanitized structured Convex errors returning 500 instead of 429. Adapter preserves RATE_LIMITED data and Retry-After. Local probe has 60 successes, five 429 responses, shared MCP refusal and recovery after Retry-After 60. |
| 27 | Pass | Real Claude Code HTTP MCP client calls get_day and quick_add; resulting task read directly. Transcript preserved as claude-client-production.jsonl. |
| 28 | OAuth happy paths pass; production error mapping fails | Every REST endpoint uses a real API OAuth resource. Invalid time gives 500 instead of 400; foreign IDs give 500 instead of 404, while ownership remains intact. API-key and missing custom-scope tests were superseded by Brief 18. |
| 29 | Pass production; local repeat running | PowerShell and Git Bash perform real browser PKCE, keychain storage, reads, add/move/done, ambiguous exit 2, forced-401 refresh, removed-token refresh, JSON and logout. Area, project, due and all filters pass in both shells on both environments. KRIYAN_API_KEY mode superseded by Brief 18. |
| 30 | Pass | Local npm pack tarball runs with npx and bunx, help exit 0. No npm publication. |
| 31 | Pending EAS artifact | Fresh signed 1.0.1 install and actual headless emulator QA are pending the external EAS queue. |
| 32 | Pending Android | Cross-account sign-in and saved web/native task state are pending native QA. Concurrent browser/emulator execution is constrained by Brief 21 memory rule. |
| 33 | Scheduling pass; push delivery pending configuration check | Five reminder kinds produce jobs at expected times and moves/completion cancel them. Native registration will determine whether delivery is configured. |
| 34 | Pending Android | Font scale 1.3 and native Back tests run after the signed APK is available. |
| 35 | Pass | Added public operation inventory/isolation coverage and signed service isolation coverage. Targeted 61 tests and full backend 110 pass. Each function is covered by the operation inventory. |
| 36 | Pass | convex dev --once reports functions ready. Development synchronization only; no production deployment. |
| 37 | Baseline CI pass; final commits unpublished | GitHub run 36881752376 passed for HEAD b374835c8b40daa308c0ace5c93e6ba7be1e0002. No push is authorized, so GitHub CI cannot run the three final local commits. |
| 38 | Fail audit; critical fixed | Next 16.3.3 critical advisory patched to 16.3.6. Three moderate transitive Expo/Clerk findings remain, each explained in report 21. |

## Defects and owner actions

Production needs the reviewer to deploy the local web and backend fixes before the Week geometry, area-refusal copy, phone loading accessibility, API validation status, foreign-ID status and rate-limit checks can pass there. Exact reproductions, severities and regression tests are in report 21. No production deployment or push was performed. EAS build, Android release, Lighthouse, gallery and cleanup receipts will be filled when completed.
