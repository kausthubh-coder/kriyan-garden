import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { configuration, root, UsageError, baseUrl } from './config.mjs';

const execute = promisify(execFile);
export const scopes = ['openid', 'profile', 'email'];
export const oauthFix = 'Configure the development OAuth application through the Clerk CLI as described in docs/setup/05-development-oauth.md. No dashboard steps are needed.';
export async function clerkRead(endpoint) {
  configuration();
  try {
    const pending = execute('clerk', ['api', endpoint, '--instance', 'dev'], { cwd: resolve(root, 'apps/web'), timeout: 30_000, maxBuffer: 2_000_000, windowsHide: true });
    pending.child.stdin.end();
    const { stdout } = await pending;
    return JSON.parse(stdout);
  } catch { throw new UsageError('Clerk Backend API read failed. Verify the linked development instance and local development keys.'); }
}
export async function oauthStatus(clientId) {
  const settings = await clerkRead('/instance/oauth_application_settings');
  const listing = await clerkRead('/oauth_applications?limit=100');
  const apps = listing.data ?? [];
  const application = clientId ? apps.find(app => app.client_id === clientId && app.name === 'Kriyan CLI') : apps.find(app => app.name === 'Kriyan CLI');
  const required = [...scopes, 'offline_access'];
  const appMissing = application ? required.filter(scope => !String(application.scopes).split(' ').includes(scope)) : required;
  return { appMissing, application: application ? { clientId: application.client_id, name: application.name, public: application.public, pkce: application.pkce_required, consent: application.consent_screen_enabled, redirectUris: application.redirect_uris } : null,
    audience: settings.aud_claim_enabled, cimd: settings.client_id_metadata_documents_advertised, dcr: settings.dynamic_oauth_client_registration };
}
export async function requireOauth(clientId) {
  const status = await oauthStatus(clientId);
  if (!status.application || status.appMissing.length) throw new UsageError(`Kriyan CLI needs the standard OAuth scopes. ${oauthFix}`);
  if (!status.application.public || !status.application.pkce || !status.application.consent || !status.application.redirectUris.includes('http://127.0.0.1/callback') || !status.audience || !status.cimd || !status.dcr)
    throw new UsageError(`OAuth needs public PKCE, consent, loopback redirect, audience claims, CIMD and DCR. ${oauthFix}`);
  return status;
}
export async function authConfiguration(base, resourceKind, clientId, refresh = false) {
  const origin = baseUrl(base);
  if (!['api', 'mcp'].includes(resourceKind)) throw new UsageError('Pass --resource mcp or api.');
  const response = await fetch(`${origin}/api/v1/auth-config?timezone=America%2FNew_York`, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  if (!response.ok) throw new UsageError(`The app auth-config endpoint is not configured. ${oauthFix}`);
  const config = await response.json();
  const resource = new URL(config.resource);
  if (resource.origin !== origin || resource.pathname !== '/api/v1') throw new UsageError('The auth-config resource differs from --base. Use the configured public development origin.');
  for (const key of ['authorizationEndpoint', 'tokenEndpoint']) if (new URL(config[key]).protocol !== 'https:') throw new UsageError('Clerk OAuth endpoints must use HTTPS.');
  if (clientId && config.clientId !== clientId) throw new UsageError('The requested client differs from app auth-config. Configure CLERK_CLI_CLIENT_ID for Kriyan CLI.');
  return { ...config, resource: `${resource.origin}${resourceKind === 'mcp' ? '/mcp' : '/api/v1'}`, scopes: [...scopes, ...(refresh ? ['offline_access'] : [])] };
}
