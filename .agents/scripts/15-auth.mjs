// Development credential probes. Provider responses and credentials stay in memory.
import nextEnv from '@next/env';
import { createClerkClient } from '@clerk/backend';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
nextEnv.loadEnvConfig(resolve('apps/web'));
const key = process.env.CLERK_SECRET_KEY;
if (!key?.startsWith('sk_test_')) throw new Error('Development credentials required');
const sdk = createClerkClient({ secretKey: key });
const scopes = ['tasks:read','tasks:write','spaces:read','spaces:write','goals:read','goals:write'];
const receipts = [], keyIds = [];
let user;
async function bapi(path, method='GET', body) {
  const response = await fetch('https://api.clerk.com/v1'+path, { method, headers: { Authorization: 'Bearer '+key, 'content-type':'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  return { response, data };
}
try {
  const config = await (await fetch('http://localhost:3500/api/v1/auth-config?timezone=America%2FNew_York')).json();
  const apps = await bapi('/oauth_applications');
  receipts.push({ check:'Web credential instance OAuth applications', status:apps.response.status, count:apps.data.total_count, configuredClientExists:apps.data.data?.some(a=>a.client_id===config.clientId), apps:apps.data.data?.map(a=>({ name:a.name, public:a.public, scopes:a.scopes })) });
  const settings = await bapi('/instance/oauth_application_settings');
  receipts.push({ check:'Web credential instance settings', status:settings.response.status, defaultScopes:settings.data.default_scopes });
  const metadata = await (await fetch(new URL('/.well-known/oauth-authorization-server',config.authorizationEndpoint))).json();
  receipts.push({ check:'Web issuer scopes', scopes:metadata.scopes_supported });
  const proof = randomBytes(32).toString('base64url');
  const auth = new URL(config.authorizationEndpoint);
  auth.search = new URLSearchParams({ response_type:'code', client_id:config.clientId, resource:config.resource, redirect_uri:'http://127.0.0.1:3500/callback', scope:[...scopes,'offline_access'].join(' '), state:randomUUID(), code_challenge:createHash('sha256').update(proof).digest('base64url'), code_challenge_method:'S256' });
  const authorization = await fetch(auth,{ redirect:'manual' });
  const location = authorization.headers.get('location');
  const error = location ? new URL(location,auth).searchParams.get('error') : null;
  const content = await authorization.text();
  receipts.push({ check:'Real PKCE authorization entry', status:authorization.status, error, pageReportsInvalidScope:/invalid.scope|scope.+not.+(valid|allowed)/i.test(content), contentType:authorization.headers.get('content-type') });
  user = await sdk.users.createUser({ emailAddress:[`kriyan-qa15-auth-${randomUUID()}+clerk_test@example.com`],skipPasswordRequirement:true });
  const session = await sdk.sessions.createSession({ userId:user.id });
  const sessionToken = await sdk.sessions.getToken(session.id);
  for (const path of ['/api/v1/me','/mcp']) {
    const response = await fetch('http://localhost:3500'+path,{ method:path==='/mcp'?'POST':'GET', headers:{ Authorization:'Bearer '+sessionToken.jwt, 'content-type':'application/json', accept:'application/json, text/event-stream' }, ...(path==='/mcp'?{ body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'qa15',version:'1'}}}) }:{}) });
    receipts.push({ check:'Real session token refused '+path,status:response.status });
  }
  const issued = await bapi('/api_keys','POST',{ name:'Brief 15 disposable probe',subject:user.id,scopes,seconds_until_expiration:600 });
  if (typeof issued.data.id==='string') keyIds.push(issued.data.id);
  receipts.push({ check:'Disposable user API key provisioning',status:issued.response.status,codes:issued.data.errors?.map(e=>e.code), created:issued.response.ok });
} finally {
  for (const id of keyIds) { const removed = await bapi('/api_keys/'+id,'DELETE'); receipts.push({check:'Revoke disposable key',status:removed.response.status}); }
  if (user) { await sdk.users.deleteUser(user.id); receipts.push({check:'Delete auth probe user',id:user.id,deleted:true}); }
  await writeFile('.data/15/auth-probes.json',JSON.stringify(receipts,null,2));
  console.log(JSON.stringify(receipts));
}
