# Brief 09b: leftovers from the web polish review

Small fixes found when reviewing brief 09's screenshots against `docs/design/reference/web.html`. Do these first, then carry on to brief 10 in the same session.

## Goal panel

1. The milestones editor is still the old stacked form: a 22px "Milestones" heading, a "New milestone" label and boxed input, a native `mm/dd/yyyy` date field, and a full-width "Add milestone" button. Replace it:
   - Section heading "Milestones" at 14px weight 600 with the count on the right ("2 of 5 done"), styled like the side-rail section headings.
   - Each milestone is a row: check circle (toggles done), title (inline editable on click), optional date on the right in the app format ("Fri 9 Oct"), and a remove button that appears on hover or focus (always visible on touch).
   - The last row is an inline "Add a milestone" text input with no box: type and press Enter to add. A date is set afterwards by clicking the row's date, which reveals the same day editor chips as the task panel's Deadline row. No native date field is visible until "Pick a day" is chosen.
   - Empty state: the single line "No milestones yet." above the add row.
2. The goal's note sits under the title exactly like a task's notes (auto-growing borderless textarea, placeholder "Add notes"). Remove the stray note text currently rendered near the footer.
3. The goal title has a permanent fill, as if always being edited. It must look like the task title: plain until focused, soft fill on focus.

## Week on phones

4. The header wraps: "Week" plus the date range pushes the date navigation to a second row. Match the Day header: title and navigation on one row, and the range moves into the summary line under it ("28 September to 4 October. 19h planned.").
5. Each day card has an empty gap between its header and its first item. Remove it so the first item sits 8px under the header, as on desktop.

## CLI (found while verifying)

6. `packages/cli/src/credentials.ts` runs `whoami.exe` and `icacls.exe` by bare name. Under Git Bash the MSYS `whoami` is found first and the command fails, which breaks the credential file fallback (three tests fail when the suite runs from Git Bash). Resolve both from `%SystemRoot%\System32` by absolute path, fall back to the bare name only if `SystemRoot` is unset, and add a test that the resolved path is absolute on Windows. Run the CLI tests from both PowerShell and Git Bash (`"C:\Program Files\Git\bin\bash.exe" -lc "cd packages/cli && bun test"`) and report both results.

## Verify

Typecheck, lint, tests, build and e2e as in brief 09. Re-capture `goal-panel-1440.png`, `goal-panel-390.png` and `week-390.png` into `.agents/screenshots/09b/`. Add a short section to `docs/reports/09-web-polish.md` titled "09b leftovers". Do not commit.
