import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { argumentsFor, main, print, reveal, rememberSecret } from './lib/output.mjs';
import { UsageError } from './lib/config.mjs';
import { prepareClerk, launchBrowser, signInPage } from './lib/browser.mjs';
import { requireOauth, authConfiguration } from './lib/oauth.mjs';

await main(async () => {
  const { values, positionals: [email] } = argumentsFor({ base: { type: 'string' }, resource: { type: 'string' }, client: { type: 'string' }, reveal: { type: 'boolean' }, password: { type: 'string' } });
  if (!values.client) throw new UsageError('Pass --client <public OAuth client id>. Run doctor.mjs to check configuration.');
  await requireOauth(values.client);
  const config = await authConfiguration(values.base, values.resource, values.client);
  const state = randomBytes(32).toString('base64url'), verifier = rememberSecret(randomBytes(32).toString('base64url'));
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  let acceptCode, rejectCode;
  const codePromise = new Promise((resolve, reject) => { acceptCode = resolve; rejectCode = reject; });
  void codePromise.catch(() => {});
  let received = false;
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'text/plain');
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method !== 'GET' || url.pathname !== '/callback') { response.writeHead(404).end('Not found.'); return; }
    if (received || url.searchParams.get('state') !== state) { response.writeHead(400).end('Invalid login state.'); return; }
    if (url.searchParams.has('error')) { received = true; response.writeHead(400).end('Login denied.'); rejectCode(new UsageError('OAuth consent was denied.')); return; }
    const code = url.searchParams.get('code');
    if (!code) { response.writeHead(400).end('Missing code.'); return; }
    received = true; response.end('Signed in. Return to the terminal.'); acceptCode(rememberSecret(code));
  });
  let browser, timer;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new UsageError('Could not start the OAuth callback.');
    const redirect = `http://127.0.0.1:${address.port}/callback`;
    const authorize = new URL(config.authorizationEndpoint);
    authorize.search = new URLSearchParams({ response_type: 'code', client_id: values.client, resource: config.resource, redirect_uri: redirect, scope: config.scopes.join(' '), state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    timer = setTimeout(() => rejectCode(new UsageError('OAuth timed out. Check scopes, callback registration and consent.')), 120_000);
    await prepareClerk(); browser = await launchBrowser();
    const page = await browser.newPage();
    // Real sign-in before authorization uses this same browser's Clerk session.
    await signInPage(page, email, { base: values.base, ui: true, password: values.password });
    await page.goto(authorize.href);
    const approval = page.getByRole('button', { name: /^(allow|authorize|approve|continue)( access)?$/i });
    await approval.first().waitFor({ state: 'visible', timeout: 30_000 });
    await approval.first().click();
    const code = await codePromise;
    const response = await fetch(config.tokenEndpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: values.client, code, code_verifier: verifier, redirect_uri: redirect, resource: config.resource }) });
    const token = await response.json();
    if (!response.ok || typeof token.access_token !== 'string') throw new UsageError('OAuth code exchange failed. Verify scopes, resource and the public application callback.');
    rememberSecret(token.access_token); rememberSecret(token.refresh_token);
    if (values.reveal) reveal(token.access_token);
    else print({ email, resource: config.resource, accessToken: '[redacted]', hint: 'Pass --reveal for immediate use.' });
  } finally {
    clearTimeout(timer); await browser?.close(); server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
});
