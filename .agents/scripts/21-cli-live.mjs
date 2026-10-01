import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import './21-tls-browser.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Entry } from '@napi-rs/keyring';
import { prepareClerk, launchBrowser, signInPage, approveOAuth } from '../skills/test-kriyan/scripts/lib/browser.mjs';
import { user, backend, ref, prod, cleanup, save } from './21-common.mjs';

import { root, privatePath } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { redact, rememberSecret } from '../skills/test-kriyan/scripts/lib/output.mjs';
const { owner, other, base } = process.env.QA_CLI_SEED_BASE
  ? {owner:await user('cli-final'),other:await user('cli-final-other'),base:process.env.QA_CLI_SEED_BASE}
  : JSON.parse(await readFile(privatePath('21-cli-ready.json'), 'utf8'));
rememberSecret(owner.password);
const production=!['localhost','127.0.0.1'].includes(new URL(base).hostname);
const live = await backend(owner, production ? prod : undefined);
if(process.env.QA_CLI_SEED_BASE){await live.client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});await live.client.mutation(ref('profiles:seedSample'),{today:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date())});}
const call = async (_ownerId, operation, payload) => { await live.refresh(); return live.client.query(ref(operation.replace('.', ':')), payload); };
const cli = join(root, 'packages/cli/dist/kriyan.js'), transcript = [];
const file = join(homedir(), '.config/kriyan/credentials.json');
const entry = new Entry('kriyan', base, { linux: { store: 'secret-service' } });
const records = async () => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; } };
const saved = async () => {
  const items = await records();
  if (items[base]) return { store: 'file', tokens: items[base] };
  const value = entry.getPassword();
  return value ? { store: 'keychain', tokens: JSON.parse(value) } : null;
};
const prior = await saved();
if (prior) await writeFile(privatePath('cli-prior-credentials.json'), JSON.stringify(prior));
const quotePs = value => `'${value.replaceAll("'", "''")}'`;
const quoteSh = value => `'${value.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`;
function command(shell, args) {
  const binary = shell === 'PowerShell' ? 'powershell.exe' : 'C:/Program Files/Git/bin/bash.exe';
  const words = [process.execPath, cli, ...args].map(shell === 'PowerShell' ? quotePs : quoteSh).join(' ');
  const shellArgs = shell === 'PowerShell' ? ['-NoProfile', '-Command', `& ${words}; exit $LASTEXITCODE`] : ['--noprofile', '--norc', '-c', words];
  const child = spawn(binary, shellArgs, { cwd: root, windowsHide: true, env: { ...process.env, KRIYAN_URL: base, BROWSER: 'none' } });
  let stdout = '', stderr = '';
  child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
  const done = new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve({ code, stdout, stderr })); });
  return { child, done, stderr: () => stderr };
}
async function run(shell, args) {
  const result = await command(shell, [...args, '--json']).done;
  assert.equal(result.code, 0, redact(result.stdout || result.stderr));
  const json = JSON.parse(result.stdout);
  transcript.push({ shell, command: `kriyan ${args.join(' ')} --json`, exit: result.code, output: json });
  await writeFile(privatePath('21-cli-transcript.json'), JSON.stringify(transcript, null, 2));
  console.log(`${shell}: kriyan ${args[0]} PASS`);
  return json;
}
let browser, active, page, complete = false;
try {
  await prepareClerk(); browser = await launchBrowser();
  for (const shell of ['PowerShell', 'Git Bash']) {
    const context = await browser.newContext({ timezoneId: 'America/New_York' });
    page = await context.newPage();
    await signInPage(page, owner.email, { base });
    active = command(shell, ['login', '--json']);
    let authorize;
    for (let attempts = 0; attempts < 300; attempts++) {
      authorize = active.stderr().match(/Open this URL to sign in: (https:\/\/\S+)/)?.[1];
      if (authorize) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(authorize, 'CLI did not provide its loopback authorization URL.');
    const url = new URL(authorize);
    rememberSecret(url.searchParams.get('client_id')); rememberSecret(url.searchParams.get('state'));
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.deepEqual(url.searchParams.get('scope').split(' '), ['openid', 'profile', 'email', 'offline_access']);
    assert.equal(url.searchParams.get('resource'), `${base}/api/v1`);
    await page.goto(authorize);
    await approveOAuth(page, owner);
    const login = await active.done; active = undefined;
    assert.equal(login.code, 0, redact(login.stdout));
    transcript.push({ shell, command: 'kriyan login --json', exit: login.code, output: JSON.parse(login.stdout), pkce: 'S256', resource: `${base}/api/v1`, scopes: url.searchParams.get('scope').split(' '), realConsent: true });
    console.log(`${shell}: kriyan login PKCE and consent PASS`);
    const me = await run(shell, ['whoami']); assert.equal(me.userId, owner.id);
    const today = await run(shell, ['today']); assert.ok(today.date);
    await run(shell, ['day', today.date]);
    await run(shell, ['week']);
    await run(shell, ['goals']);
    for (const filter of [[], ['--area','School'], ['--due','today'], ['--due','week'], ['--due','overdue'], ['--all']]) await run(shell, ['list', ...filter]);
    await live.refresh(); const projects=await live.client.query(ref('projects:list'),{}); assert.ok(projects.length);
    const filteredTask=await live.client.mutation(ref('tasks:create'),{title:`QA21 project filter ${shell}`,date:today.date,areaId:projects[0].areaId,projectId:projects[0]._id});
    const filtered=await run(shell,['list','--project',projects[0].name]);assert.ok(filtered.tasks.some(task=>task.id===filteredTask._id));assert.ok(filtered.tasks.every(task=>task.projectId===projects[0]._id));
    const task = await run(shell, ['add', `QA21 ${shell} CLI proof today #School`]);
    assert.equal(task.ok, true); assert.equal(task.task.durationMinutes, null);
    assert.equal((await call(owner.id, 'tasks.get', { id: task.id })).title, task.task.title);
    await run(shell, ['move', task.id, 'tomorrow', '3pm']);
    assert.equal((await call(owner.id, 'tasks.get', { id: task.id })).time, '15:00');
    await run(shell, ['done', task.id]);
    assert.equal((await call(owner.id, 'tasks.get', { id: task.id })).status, 'completed');
    await live.refresh();
    const ambiguousTitle=`QA21 ambiguous ${shell}`;
    const duplicates=await Promise.all([0,1].map(()=>live.client.mutation(ref('tasks:create'),{title:ambiguousTitle,date:today.date})));
    const ambiguous=await command(shell,['done',ambiguousTitle,'--json']).done;
    assert.equal(ambiguous.code,2);assert.equal(JSON.parse(ambiguous.stdout).error.code,'ambiguous');
    for(const duplicate of duplicates)assert.equal((await call(owner.id,'tasks.get',{id:duplicate._id})).status,'active');
    transcript.push({shell,command:`kriyan done "${ambiguousTitle}" --json`,exit:2,output:JSON.parse(ambiguous.stdout),unchanged:true});
    let credential = await saved(); assert.ok(credential?.tokens.refreshToken);
    credential.tokens.accessToken='qa21-invalid-access-token';
    if(credential.store==='keychain')entry.setPassword(JSON.stringify(credential.tokens));
    else {const items=await records();items[base]=credential.tokens;await writeFile(file,JSON.stringify(items));}
    assert.equal((await run(shell,['whoami'])).userId,owner.id);
    credential=await saved();assert.notEqual(credential.tokens.accessToken,'qa21-invalid-access-token');
    transcript.push({shell,check:'API 401 triggers refresh from the actual credential store',storage:credential.store,recovered:true,openedBrowser:false});
    const oldAccess = credential.tokens.accessToken; delete credential.tokens.accessToken;
    if (credential.store === 'keychain') entry.setPassword(JSON.stringify(credential.tokens));
    else { const items = await records(); items[base] = credential.tokens; await writeFile(file, JSON.stringify(items)); }
    assert.equal((await saved()).tokens.accessToken, undefined);
    const recovered = await run(shell, ['whoami']); assert.equal(recovered.userId, owner.id);
    const renewed = await saved(); assert.ok(renewed.tokens.accessToken); assert.notEqual(renewed.tokens.accessToken, oldAccess);
    transcript.push({ shell, check: 'Refresh with accessToken removed from actual credential store', storage: credential.store, recovered: true, accessTokenChanged: true, refreshTokenPresent: Boolean(renewed.tokens.refreshToken), openedBrowser: false });
    console.log(`${shell}: refresh recovers deleted access token PASS`);
    await run(shell, ['logout']); assert.equal(await saved(), null);
    await context.close();
  }
  await writeFile(privatePath('21-cli-transcript.json'), JSON.stringify(transcript, null, 2));
  complete = true; console.log('Both shell proofs and credential cleanup complete.');
} catch (error) { if (page) await writeFile(privatePath('cli-browser-failure.txt'), await page.locator('body').innerText().catch(() => 'Page unavailable.')); console.error(redact(error.message)); process.exitCode = 1; }
finally {
  if (active) { active.child.kill(); await active.done; }
  await browser?.close();
  // Restore only this origin if it already had credentials before the proof.
  if (prior?.store === 'keychain') entry.setPassword(JSON.stringify(prior.tokens));
  else if (prior?.store === 'file') { const items = await records(); items[base] = prior.tokens; await writeFile(file, JSON.stringify(items)); }
  else { try { if (entry.getPassword()) entry.deletePassword(); } catch {} const items = await records(); if (items[base]) { delete items[base]; await writeFile(file, JSON.stringify(items)); } }
  await save(`cli-live-${production?'production':'local'}`, transcript); for (const user of [owner, other]) await cleanup(user); console.log('Deleted both auth proof users on both deployments.');
}

