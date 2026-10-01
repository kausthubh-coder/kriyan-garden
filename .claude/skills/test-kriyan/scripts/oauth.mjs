import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { argumentsFor, main, print, reveal, rememberSecret } from './lib/output.mjs';
import { UsageError, configuration, privatePath, protect } from './lib/config.mjs';
import { prepareClerk, launchBrowser, signInPage, approveOAuth } from './lib/browser.mjs';
import { requireOauth, authConfiguration } from './lib/oauth.mjs';
import { clerkClient } from './lib/users.mjs';

export async function oauthFlow(email, values) {
  const clientId = values.client ?? configuration().CLERK_CLI_CLIENT_ID;
  await requireOauth(clientId);
  const config = await authConfiguration(values.base, values.resource, clientId, values.refresh);
  let oauthClient = clientId;
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
  let browser, timer, page;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new UsageError('Could not start the OAuth callback.');
    const redirect = `http://127.0.0.1:${address.port}/callback`;
    if (values.register) {
      const metadataResponse = await fetch(`${new URL(config.authorizationEndpoint).origin}/.well-known/oauth-authorization-server`);
      const metadata = await metadataResponse.json();
      if (!metadataResponse.ok || !metadata.registration_endpoint) throw new UsageError('Clerk does not advertise dynamic client registration.');
      const registration = await fetch(metadata.registration_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: 'Kriyan brief 18 MCP test', redirect_uris: [redirect], token_endpoint_auth_method: 'none', grant_types: ['authorization_code'], response_types: ['code'], scope: config.scopes.join(' ') }) });
      const registered = await registration.json();
      if (!registration.ok || typeof registered.client_id !== 'string') throw new UsageError('Dynamic client registration failed.');
      oauthClient = registered.client_id;
      rememberSecret(registered.client_secret); rememberSecret(registered.registration_access_token);
    }
    rememberSecret(oauthClient);
    const authorize = new URL(config.authorizationEndpoint);
    authorize.search = new URLSearchParams({ response_type: 'code', client_id: oauthClient, resource: config.resource, redirect_uri: redirect, scope: config.scopes.join(' '), state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    timer = setTimeout(() => rejectCode(new UsageError('OAuth timed out. Check the callback registration and consent screen.')), 240_000);
    await prepareClerk(); browser = await launchBrowser();
    page = await browser.newPage();
    // Real sign-in before authorization uses this same browser's Clerk session.
    await signInPage(page, email, { base: values.base, ui: true, password: values.password });
    const diagnostics = [];
    page.on('response', async response => {
      if (response.request().method() !== 'POST' || !response.url().includes('/v1/')) return;
      try { const body = await response.json(); diagnostics.push({ action: new URL(response.url()).pathname.split('/').at(-1), status: response.status(), codes: body.errors?.map(item => item.code) ?? [] }); await writeFile(privatePath('oauth-provider-diagnostics.json'), JSON.stringify(diagnostics)); } catch {}
    });
    await page.goto(authorize.href);
    await approveOAuth(page, { email, password: values.password });
    const code = await codePromise;
    const response = await fetch(config.tokenEndpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: oauthClient, code, code_verifier: verifier, redirect_uri: redirect, resource: config.resource }) });
    const token = await response.json();
    if (!response.ok || typeof token.access_token !== 'string') throw new UsageError('OAuth code exchange failed. Verify scopes, resource and the public application callback.');
    rememberSecret(token.access_token); rememberSecret(token.refresh_token);
    const result = { email, resource: config.resource, clientId: oauthClient, scopes: config.scopes, accessToken: token.access_token,
      ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}), expiresIn: token.expires_in, registered: Boolean(values.register) };
    if (values.out) { const path = privatePath(values.out); await writeFile(path, JSON.stringify(result)); protect(path); }
    return result;
  } catch (error) {
    if (page) await writeFile(privatePath('oauth-browser-failure.txt'), await page.locator('body').innerText().catch(() => 'Page unavailable.'));
    if (values.register && oauthClient !== clientId) {
      const apps = await clerkClient().oauthApplications.list({ nameQuery: 'Kriyan brief 18 MCP test' });
      const registered = apps.data.find(app => app.clientId === oauthClient);
      if (registered) await clerkClient().oauthApplications.delete(registered.id);
    }
    throw error;
  } finally {
    clearTimeout(timer); await browser?.close(); server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(async () => {
  const { values, positionals: [email] } = argumentsFor({ base: { type: 'string' }, resource: { type: 'string' }, client: { type: 'string' }, reveal: { type: 'boolean' }, password: { type: 'string' }, refresh: { type: 'boolean' }, register: { type: 'boolean' }, out: { type: 'string' } });
  const result = await oauthFlow(email, values);
  if (values.reveal) reveal(result.accessToken);
  else print({ email, resource: result.resource, scopes: result.scopes, registered: result.registered, accessToken: '[redacted]', ...(values.out ? { path: privatePath(values.out) } : {}) });
});
