# Brief 13: capture a gallery of every screen and state

Run this after briefs 10, 11 and 12 have been merged. It changes no product code. Its only output is a gallery the reviewer can audit in one pass, so nothing ships unseen.

## Output

`.agents/screenshots/gallery/index.html`: one page, sections in the order below, each screenshot with a caption naming the route, the state and the viewport. Images are saved next to it as PNG. Web captures at 1440x900 and 390x844 with Playwright. Android captures from the emulator at its native resolution.

## Web: public

1. `/` full page (sliced into viewport-height images).
2. `/demo`.
3. `/docs`, `/docs/quick-add`, `/docs/mcp`, `/docs/cli`, `/docs/android`, `/docs/self-hosting`.
4. `/privacy`, `/terms`.
5. `/sign-in`, `/sign-up`, including the state after a wrong password.
6. A route that does not exist (the 404 page), on both the marketing host and the app host.
7. The Open Graph image.

## Web: signed in (disposable Clerk test user)

For a brand-new account with no data, and again for an account with the sample data:

8. Onboarding, all five steps, empty and with data entered; the "Replace what you have entered" confirmation.
9. Day: empty account (empty state), sample account, a day in the past, a day with overlapping tasks, the one-time hint, the offline banner, the loading skeleton (throttle the network to capture it), and the error state (block the Convex origin to capture it).
10. List, Week, Goals: empty and sample, plus Goals with each measure kind and a goal that is late.
11. Task panel with each row open in turn (nine captures), a task with notes, repeat and three reminders set, and a completed task.
12. Goal panel with each row open, and the milestones editor with items.
13. "Add goal" dialog, empty and filled, including a validation error.
14. Quick add: empty, typed, and an error from the backend (title too long).
15. Command palette: empty query, a query with results, a query with no results.
16. Shortcuts sheet.
17. Every toast: completed, deleted, moved, length set, added, and an error toast.
18. Settings: every section, closed and with one row open; the area deletion refusal; Reset everything with the field filled.
19. Keyboard focus rings: tab through the Day view and capture focus on a rail button, a chip, a tray card, a timeline block, and the add button.

## Android (emulator, disposable test user)

20. Sign-in, including an error.
21. Onboarding, all five steps.
22. Day: empty, sample, with the task sheet open on each row, drag in progress, and offline.
23. List, Week, Goals: empty and sample; swipe actions mid-swipe.
24. Quick add sheet with the keyboard open; the launcher shortcut; a shared-text capture.
25. Settings home and every section screen; the area edit sheet; delete-account confirmation.
26. A reminder notification in the shade.
27. Font scale 1.3 on Day, List and the task sheet.

## CLI

28. Terminal captures (as text in `<pre>` blocks, not images) of `kriyan --help`, `today`, `week`, `list`, `goals`, `add` with a parsed task, `done` with an ambiguous match, and the not-signed-in error. Use the fake HTTP layer from the CLI tests with the sample data so no sign-in is needed.

## Rules

- Do not fix anything you notice; add a short "Noticed while capturing" list at the end of the page with the screen and the issue.
- Clean up the test users and their data afterwards.
- Report the path to the gallery and the count of captures in `docs/reports/13-gallery.md`. Do not commit.
