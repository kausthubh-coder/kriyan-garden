import {readFile,writeFile} from 'node:fs/promises';
let report=await readFile('docs/reports/21-final-qa.md','utf8');
for(const [before,after] of [
 ['`typecheck-final.log`, `typecheck-final.json`','`completion-typecheck.log`, `completion-typecheck.json`'],
 ['`lint-final.log`, `lint-final.json`','`completion-lint.log`, `completion-lint.json`'],
 ['`test-final.log`, `test-final.json`','`completion-test-after.log`, `completion-test-after.json`'],
 ['`build-final.log`, `build-final.json`','`completion-build.log`, `completion-build.json`'],
 ['9 passed, 1 intentional mobile pointer-drag skip. | `public-local-complete.log`','11 passed, 1 intentional mobile pointer-drag skip. | `public-docs-complete.log`'],
 ['9 passed, including reviewer geometry and passwordless email-code sign-in. | `functional-local-complete.log`','10 passed, including the 699/700px Week breakpoint, email-code sign-in and planning hover/press contrast. | `functional-local-final.log`'],
 ['`cli-production-final.log`','`cli-production-complete.log`'],
 ['reads and filters, optional-length add','reads with area/project/due/all filters, optional-length add'],
 ['The rebuilt public keyboard/axe suite and recapture will record the final result.','The rebuilt public suite passes 11 checks with one intentional mobile pointer-drag skip. Keyboard scrolling and axe pass, and both pages were recaptured.'],
 ['Its original recovery check ran too close to the backend minute boundary; the final probe honors the full advertised delay.','Its original recovery check ran too close to the backend minute boundary. The final probe returns 60 successes and five 429 responses, refuses a shared MCP read, and succeeds after the full advertised delay.'],
 ])report=report.replaceAll(before,after);
const addition=`
Planning property labels lose contrast on hover because the settings opacity dims muted text. The new "Planning property labels keep contrast on hover and press" check fails before the fix and passes afterward. Property controls now keep full opacity and use the existing surface token for press feedback. All four properties pass the final gallery axe checks. This should be fixed in production by the reviewer deploying the web commit.

The hardening suite finds a 36px-wide account menu button and a 32px-high link at the phone viewport, below the 44px requirement. Scoped account styles enforce both dimensions on narrow or coarse-pointer surfaces. Account/security tests fail before the fix; all four local hardening checks pass afterward. Production reproduces both target failures. Its reset and invalid signed-cleanup refusal pass. The latter test expects production's sanitized error and independently verifies that the task was preserved. Reviewer deployment is required for the target fix.

Clerk's new-device verification field may have autocomplete one-time-code without inputmode numeric. The UI helper now recognizes both. Two timeout receipts are superseded by successful local MCP/API PKCE, consent, all 15 REST method/route validation probes, and rate recovery. The Claude skill copy was synchronized; the skill-copy test and full test command pass.

Visual review found Goals captures taken before its skeleton disappeared. Readiness now waits for the view and selected dialog. All affected empty/sample/late Goals and every goal property were replaced, including the phone rows missed by the earlier timing error. Empty Day has a scrolled capture of its prompt. The current web gallery has 287 captures with zero violations across 272 axe state checks. Actual Chrome zoom factor 2 replaces the CSS-only zoom shots; computed CSS zoom is 1 and the add-task dialog works in both.

Hardening receipts: hardening-local-before.log has two failed and two passed; hardening-local-after.log has four passed. Production's original run has three failed and one passed: two real target failures and a harness assertion expecting an internal error message. hardening-production-sanitized.log passes the corrected refusal/preservation check. The final local rate receipt is services-local-rate-final-results.json: all four checks pass.
`;
if(!report.includes('Planning property labels lose contrast'))report=report.replace('## Harness corrections',addition+'\n## Harness corrections');
await writeFile('docs/reports/21-final-qa.md',report);
let gallery=await readFile('docs/reports/13-gallery.md','utf8');gallery=gallery.replace('243 captures','287 captures');await writeFile('docs/reports/13-gallery.md',gallery);
let matrix=await readFile('docs/reports/15-functional-qa.md','utf8');
matrix=matrix.replace('| 22 | Running | Lighthouse desktop/mobile landing and docs, plus signed-in Day on both environments. Raw HTML and LHR receipts will be summarized in report 21. |','| 22 | Measured | Twelve Lighthouse runs: landing, docs and signed-in Day, desktop/mobile, local/production. Results and limits are in report 21. |');
matrix=matrix.replace('Pass production; local repeat running','Pass on both environments');matrix=matrix.replace('Production fail; local fix running','Production fail; local fix passes');matrix=matrix.replace('Local trigger/recovery proof is pending.','Local probe has 60 successes, five 429 responses, shared MCP refusal and recovery after Retry-After 60.');matrix=matrix.replace('Project filter local probe added.','Area, project, due and all filters pass in both shells on both environments.');matrix=matrix.replace('full backend 109 pass','full backend 110 pass');
await writeFile('docs/reports/15-functional-qa.md',matrix);
