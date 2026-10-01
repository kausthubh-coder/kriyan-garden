import { readFileSync, mkdirSync, chmodSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { parseEnv } from 'node:util';

// Find the checkout from cwd so Playwright's CommonJS TS loader can use this
// Node ESM library too (its transform does not preserve import.meta).
function repositoryRoot() {
  let directory = process.cwd();
  for (;;) {
    if (existsSync(resolve(directory, '.agents/skills/test-kriyan/SKILL.md'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Run the skill from inside the Kriyan repository.');
    directory = parent;
  }
}
export const root = repositoryRoot();
export const stateDirectory = resolve(root, '.agents/test-kriyan');
export class UsageError extends Error {}
export function developmentGuard(env) {
  if (!env.CLERK_SECRET_KEY?.startsWith('sk_test_') || !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'))
    throw new UsageError('Development pk_test_ and sk_test_ keys are required in apps/web/.env.local.');
}
export function configuration() {
  let file;
  try { file = parseEnv(readFileSync(resolve(root, 'apps/web/.env.local'), 'utf8')); }
  catch { throw new UsageError('Cannot read apps/web/.env.local. Configure the development instance first.'); }
  // Do not permit an inherited production key to be hidden by a test-key file.
  for (const name of ['CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_PUBLISHABLE_KEY']) {
    if (process.env[name] && !process.env[name].startsWith(name === 'CLERK_SECRET_KEY' ? 'sk_test_' : 'pk_test_'))
      throw new UsageError('An inherited Clerk key is not a development key. Remove it before testing.');
  }
  const env = { ...file, ...process.env };
  developmentGuard(env);
  process.env.CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
  process.env.CLERK_PUBLISHABLE_KEY = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!env.NEXT_PUBLIC_CONVEX_URL) throw new UsageError('Set NEXT_PUBLIC_CONVEX_URL in apps/web/.env.local.');
  return env;
}
export function privatePath(name) {
  const path = resolve(stateDirectory, name);
  const fromState = relative(stateDirectory, path);
  if (!fromState || fromState.startsWith('..') || isAbsolute(fromState))
    throw new UsageError('Output files must be inside .agents/test-kriyan/.');
  mkdirSync(dirname(path), { recursive: true });
  return path;
}
export function protect(path) { chmodSync(path, 0o600); }
export function baseUrl(value) {
  if (!value) throw new UsageError('Pass --base http://localhost:<port>; no port is assumed.');
  let url;
  try { url = new URL(value); } catch { throw new UsageError('Invalid --base URL.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      !(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    throw new UsageError('Use an HTTPS origin or a loopback HTTP origin for --base.');
  return url.origin;
}
