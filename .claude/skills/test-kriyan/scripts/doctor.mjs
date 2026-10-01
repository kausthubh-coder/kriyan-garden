import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { argumentsFor, main, print } from './lib/output.mjs';
import { configuration, root, UsageError } from './lib/config.mjs';
import { oauthStatus, oauthFix } from './lib/oauth.mjs';
const execute = promisify(execFile);
await main(async () => {
  argumentsFor({ base: { type: 'string' } });
  const checks = [];
  async function check(name, work, fix) {
    try { const detail = await work(); checks.push({ check: name, status: 'PASS', detail }); }
    catch (error) { checks.push({ check: name, status: 'FAIL', detail: error instanceof UsageError ? error.message : fix, fix }); }
  }
  await check('Development keys', () => { configuration(); return 'pk_test_ and sk_test_ verified; values withheld.'; }, 'Configure development keys in apps/web/.env.local.');
  // Stop before provider calls when the development guard fails.
  if (checks[0].status === 'PASS') {
    await check('Convex deployment and no-diff', async () => {
      let output;
      try {
        const pending = execute(process.execPath, [resolve(root, '.agents/skills/test-kriyan/scripts/lib/convex-check.mjs')], { cwd: root, timeout: 120_000, windowsHide: true, maxBuffer: 8_000_000 });
        pending.child.stdin.end();
        const result = await pending;
        output = result.stdout + result.stderr;
      } catch { throw new UsageError('Convex dry-run failed or deployment does not match. Run the no-diff helper locally and inspect configuration without exposing its captured credentials.'); }
      let diff;
      try { diff = JSON.parse(output.trim()); }
      catch { throw new UsageError('Cannot read the Convex dry-run diff. Check the installed CLI compatibility.'); }
      if (!diff.matchedDev || diff.authChanges || diff.componentChanges || diff.definitionChanges)
        throw new UsageError('Development Convex differs from this repository. Have the deployment owner review and sync the backend before live tests.');
      return 'Matched development URL; dry-run only; no module, schema, auth or index changes.';
    }, 'Verify packages/backend/.env.local selects the development deployment used by apps/web. Review backend differences with its owner.');
    let status;
    await check('OAuth instance settings', async () => {
      status = await oauthStatus(configuration().CLERK_CLI_CLIENT_ID);
      if (!status.audience || !status.cimd || !status.dcr) throw new UsageError('Audience claims, CIMD and DCR must be on. See docs/setup/05-development-oauth.md.');
      return 'Audience claims, client metadata documents and dynamic registration enabled.';
    }, oauthFix);
    await check('Kriyan CLI OAuth application', async () => {
      const clientId = configuration().CLERK_CLI_CLIENT_ID;
      if (!clientId) throw new UsageError('Set CLERK_CLI_CLIENT_ID in apps/web/.env.local.');
      status ??= await oauthStatus(clientId);
      const app = status.application;
      if (!app || status.appMissing.length || !app.public || !app.pkce || !app.consent || !app.redirectUris.includes('http://127.0.0.1/callback'))
        throw new UsageError('Kriyan CLI must be public, require PKCE and consent, allow standard scopes and register the loopback callback.');
      return 'Kriyan CLI exists with public PKCE, consent, standard scopes and the loopback redirect. Client ID withheld.';
    }, oauthFix);
  }
  print('| Check | Result | Detail / fix |'); print('| --- | --- | --- |');
  for (const row of checks) print(`| ${row.check} | ${row.status} | ${row.detail}${row.fix ? ` Fix: ${row.fix}` : ''} |`);
  if (checks.some(row => row.status === 'FAIL')) process.exitCode = 1;
});
