import { randomBytes } from 'node:crypto';
import { createClerkClient } from '@clerk/backend';
import { configuration, UsageError } from './config.mjs';
import { providerError, rememberSecret } from './output.mjs';
import { resetOwner } from './service.mjs';

export const fixtures = new Set(['kriyan-03a+clerk_test@example.com', 'kriyan+clerk_test@example.com']);
export function clerkClient() { return createClerkClient({ secretKey: configuration().CLERK_SECRET_KEY }); }
export function testEmail(email) {
  if (!/^[a-z0-9._+-]+\+clerk_test@example\.com$/i.test(email ?? '')) throw new UsageError('Use a +clerk_test@example.com development test email.');
  return email;
}
export function validTag(tag) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag ?? '') || tag.length > 32) throw new UsageError('Pass a --tag of 1 to 32 lowercase letters, numbers or hyphens.');
  return tag;
}
export async function createTestUser({ tag, password = false }) {
  validTag(tag);
  const email = `kriyan-${tag}-${Date.now()}-${randomBytes(3).toString('hex')}+clerk_test@example.com`;
  const generated = password ? rememberSecret(`Kriyan9a${randomBytes(24).toString('hex')}`) : undefined;
  try {
    const user = await clerkClient().users.createUser({ emailAddress: [email], ...(generated ? { password: generated } : { skipPasswordRequirement: true }) });
    return { id: user.id, email, ...(generated ? { password: generated } : {}) };
  } catch (error) { throw providerError(error, 'Test-user creation'); }
}
export async function resolveUser(identifier) {
  if (!identifier) throw new UsageError('Supply a test user id or email.');
  try {
    const user = identifier.startsWith('user_') ? await clerkClient().users.getUser(identifier) :
      (await clerkClient().users.getUserList({ emailAddress: [testEmail(identifier)] })).data[0];
    if (!user) throw new UsageError('Test user not found. Create it with user.mjs first.');
    const email = user.emailAddresses.find(item => item.emailAddress.endsWith('+clerk_test@example.com'))?.emailAddress;
    testEmail(email);
    return { id: user.id, email, createdAt: user.createdAt };
  } catch (error) { if (error instanceof UsageError) throw error; throw providerError(error, 'Test-user lookup'); }
}
export async function listTestUsers() {
  const users = [];
  for (let offset = 0; ; offset += 100) {
    const page = await clerkClient().users.getUserList({ limit: 100, offset });
    for (const user of page.data) {
      const email = user.emailAddresses.find(item => item.emailAddress.endsWith('+clerk_test@example.com'))?.emailAddress;
      if (email) users.push({ id: user.id, email, createdAt: user.createdAt, fixture: fixtures.has(email) });
    }
    if (offset + page.data.length >= page.totalCount || !page.data.length) return users;
  }
}
export async function deleteTestUser(identifier) {
  const user = await resolveUser(identifier);
  if (fixtures.has(user.email)) throw new UsageError('The two long-lived fixtures are protected.');
  await resetOwner(user.id);
  // User API keys are not guaranteed to be cascade-deleted by Clerk.
  try {
    const keys = await clerkClient().apiKeys.list({ subject: user.id, limit: 100 });
    for (const key of keys.data) await clerkClient().apiKeys.delete(key.id);
  } catch (error) {
    if (!error?.errors?.some(item => /disabled|not_enabled|feature_not_available/.test(item.code)))
      throw providerError(error, 'Test API-key cleanup');
  }
  try { await clerkClient().users.deleteUser(user.id); }
  catch (error) { throw providerError(error, 'Test-user deletion'); }
  return { id: user.id, email: user.email, plannerDataRemoved: true, deleted: true };
}
export function ageMilliseconds(value) {
  const match = /^(\d+(?:\.\d+)?)(m|h|d)$/.exec(value ?? '');
  if (!match) throw new UsageError('Use --older-than with a nonnegative age such as 0m, 2h or 1d.');
  return Number(match[1]) * { m: 60000, h: 3600000, d: 86400000 }[match[2]];
}
export function pruneCandidates(users, olderThan, tag, now = Date.now()) {
  if (tag !== undefined) validTag(tag);
  return users.filter(user => !fixtures.has(user.email) &&
    /^kriyan-[a-z0-9-]+\+clerk_test@example\.com$/.test(user.email) &&
    (!tag || new RegExp(`^kriyan-${tag}-\\d+(?:-[a-f0-9]+)?\\+clerk_test@example\\.com$`).test(user.email)) && now - user.createdAt >= olderThan);
}
