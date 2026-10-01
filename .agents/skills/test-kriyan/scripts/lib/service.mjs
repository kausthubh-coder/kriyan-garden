import { createHmac, randomUUID } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { configuration, UsageError } from './config.mjs';

// Matches apps/web/src/lib/service-client.ts and convex/canonical.ts.
export function canonicalJson(value) {
  return JSON.stringify(value, (_key, item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
  });
}
export function envelope(ownerId, operation, payload, secret) {
  const timestamp = Date.now(), nonce = randomUUID();
  const signature = createHmac('sha256', secret).update(canonicalJson([timestamp, nonce, ownerId, operation, payload])).digest('hex');
  return { ...payload, ownerId, timestamp, nonce, signature };
}
export async function serviceCall(reference, ownerId, operation, payload = {}) {
  const env = configuration(), secret = env.SERVICE_SECRET || env.MCP_SERVICE_SECRET;
  if (!secret) throw new UsageError('Set SERVICE_SECRET in apps/web/.env.local to match the development Convex service secret.');
  const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL, { logger: false });
  try { return await client.action(reference, envelope(ownerId, operation, payload, secret)); }
  catch (error) {
    const text = String(error);
    const reason = text.includes('Could not find public function') ? 'The development deployment is missing this service function.' :
      text.includes('Invalid service signature') ? 'SERVICE_SECRET does not match the development Convex deployment.' :
      text.includes('RATE_LIMITED') || text.includes('Too many calls') ? 'Service rate limit reached. Wait a minute and retry.' :
      'The signed service call failed. Check its payload and development deployment.';
    throw new UsageError(`${operation}: ${reason}`);
  }
}
export function call(ownerId, operation, payload = {}) {
  const [group, method] = operation.split('.');
  return serviceCall(makeFunctionReference(`service:${group}${method[0].toUpperCase()}${method.slice(1)}`), ownerId, operation, payload);
}
export async function resetOwner(ownerId) {
  await call(ownerId, 'profiles.resetAll');
  // resetAll may schedule batches. Wait before removing identity or reseeding.
  const until = Date.now() + 120_000;
  while (Date.now() < until) {
    const context = await call(ownerId, 'planner.context');
    if (!context.profile && context.areas.length === 0 && context.projects.length === 0) {
      // These tables are removed before areas/profiles by resetBatch.
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new UsageError('Planner cleanup is still pending. Retry user.mjs delete before removing the Clerk identity.');
}
