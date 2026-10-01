import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { configuration, root, UsageError, baseUrl } from './config.mjs';

const execute = promisify(execFile);
export const scopes = ['tasks:read', 'tasks:write', 'spaces:read', 'spaces:write', 'goals:read', 'goals:write'];
export const oauthFix = 'In Clerk Dashboard > OAuth applications > Scopes, create and advertise tasks:read, tasks:write, spaces:read, spaces:write, goals:read, goals:write; assign them to the public PKCE application. Set CLERK_CLI_CLIENT_ID in apps/web/.env.local. See docs/setup/05-development-oauth.md.';
export async function clerkRead(endpoint) {
  configuration();
  try {
    const pending = execute('clerk', ['api', endpoint, '--instance', 'dev'], { cwd: resolve(root, 'apps/web'), timeout: 30_000, maxBuffer: 2_000_000, windowsHide: true });
    pending.child.stdin.end(); // Clerk checks piped stdin for a request body, even on GET.
    const { stdout } = await pending;
    return JSON.parse(stdout);
  } catch { throw new UsageError('Clerk CLI read failed. Run clerk doctor --json in apps/web and verify the linked development instance.'); }
}
export async function oauthStatus(clientId) {
  const settings = await clerkRead('/instance/oauth_application_settings');
  const listing = await clerkRead('/oauth_applications?limit=100');
  const missing = scopes.filter(scope => !settings.default_scopes?.includes(scope));
  const apps = listing.data ?? [];
  const application = clientId ? apps.find(app => app.client_id === clientId) : apps.find(app => app.name === 'Kriyan CLI');
  const appMissing = application ? scopes.filter(scope => !String(application.scopes).split(' ').includes(scope)) : scopes;
  return { missing, appMissing, application: application ? { clientId: application.client_id, public: application.public, pkce: application.pkce_required, consent: application.consent_screen_enabled, redirectUris: application.redirect_uris } : null,
    audience: settings.aud_claim_enabled, cimd: settings.client_id_metadata_documents_advertised, dcr: settings.dynamic_oauth_client_registration };
}
export async function requireOauth(clientId) {
  const status = await oauthStatus(clientId);
  if (status.missing.length || status.appMissing.length) throw new UsageError(`Planner OAuth scopes are missing${status.application ? ' or unassigned' : '; the OAuth application is missing'}. ${oauthFix}`);
  if (!status.application) throw new UsageError(`OAuth application is missing. ${oauthFix}`);
  if (!status.application.public || !status.application.pkce || !status.application.consent || !status.audience)
    throw new UsageError(`OAuth needs a public application with PKCE, consent and audience claims enabled. ${oauthFix}`);
  return status;
}
export async function authConfiguration(base, resourceKind, clientId) {
  const origin = baseUrl(base);
  if (!['api', 'mcp'].includes(resourceKind)) throw new UsageError('Pass --resource mcp or api.');
  const response = await fetch(`${origin}/api/v1/auth-config?timezone=America%2FNew_York`, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  if (!response.ok) throw new UsageError(`The app auth-config endpoint is not configured. ${oauthFix}`);
  const config = await response.json();
  const resource = new URL(config.resource);
  if (resource.origin !== origin || resource.pathname !== '/api/v1') throw new UsageError('The auth-config resource differs from --base. Use the configured public development origin.');
  for (const key of ['authorizationEndpoint', 'tokenEndpoint']) if (new URL(config[key]).protocol !== 'https:') throw new UsageError('Clerk OAuth endpoints must use HTTPS.');
  if (clientId && config.clientId !== clientId) throw new UsageError('The requested client differs from app auth-config. Configure CLERK_CLI_CLIENT_ID for that public application.');
  return { ...config, resource: `${resource.origin}${resourceKind === 'mcp' ? '/mcp' : '/api/v1'}`, scopes: [...scopes, 'offline_access'] };
}
