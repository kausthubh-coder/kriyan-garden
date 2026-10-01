import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { checkSkillCopies } from '../../../../../scripts/sync-skills.mjs';
import { developmentGuard, privatePath } from './config.mjs';
import { canonicalJson, envelope } from './service.mjs';
import { ageMilliseconds, pruneCandidates } from './users.mjs';
import { loadFixture, nextDstDate } from './fixtures.mjs';
import { redact, rememberSecret } from './output.mjs';

test('Claude and agent skill copies are byte-identical', async () => { assert.ok(await checkSkillCopies() > 20); });
test('development guard rejects mixed and production keys', () => {
  for (const keys of [{ CLERK_SECRET_KEY: 'sk_live_bad', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_ok' }, { CLERK_SECRET_KEY: 'sk_test_ok', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_bad' }, {}]) assert.throws(() => developmentGuard(keys));
  assert.doesNotThrow(() => developmentGuard({ CLERK_SECRET_KEY: 'sk_test_ok', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_ok' }));
  assert.throws(() => privatePath('../outside.json'));
});
test('signature binds owner, operation and nested payload with canonical key order', () => {
  const value = envelope('owner-a', 'tasks.create', { patch: { z: 1, a: 2 } }, 'unit-test-secret');
  assert.equal(value.signature, createHmac('sha256', 'unit-test-secret').update(canonicalJson([value.timestamp, value.nonce, 'owner-a', 'tasks.create', { patch: { a: 2, z: 1 } }])).digest('hex'));
  assert.notEqual(value.signature, createHmac('sha256', 'unit-test-secret').update(canonicalJson([value.timestamp, value.nonce, 'owner-b', 'tasks.create', { patch: { a: 2, z: 1 } }])).digest('hex'));
});
test('prune protects fixtures, other tags and young accounts', () => {
  const users = ['kriyan+clerk_test@example.com', 'kriyan-03a+clerk_test@example.com', 'kriyan-proof-123+clerk_test@example.com', 'kriyan-proof-other-123+clerk_test@example.com', 'kriyan-other-123+clerk_test@example.com', 'other+clerk_test@example.com'].map(email => ({ email, createdAt: 0 }));
  users.push({ email: 'kriyan-proof-young+clerk_test@example.com', createdAt: 9000 });
  assert.deepEqual(pruneCandidates(users, 5000, 'proof', 10000).map(user => user.email), ['kriyan-proof-123+clerk_test@example.com']);
  assert.equal(ageMilliseconds('2h'), 7200000); assert.throws(() => ageMilliseconds('-1m'));
});
test('fixtures resolve calendar dates and the next New York DST transitions', async () => {
  assert.equal(nextDstDate('2026-09-30'), '2026-11-01'); assert.equal(nextDstDate('2026-11-02'), '2027-03-14');
  const sample = await loadFixture('sample', '2026-09-30');
  assert.equal(sample.tasks.length, 25); assert.equal(sample.tasks[2].deadline, '2026-10-02');
  assert.equal(sample.tasks[4].durationMinutes, null);
  const titles = await loadFixture('long-titles', '2026-09-30');
  assert.equal(titles.areas[0].name.length, 48); assert.equal(titles.tasks[0].title.length, 180);
  const overlaps = await loadFixture('overlapping-day', '2026-09-30');
  assert.equal(overlaps.tasks.length, 4);
  const late = await loadFixture('late-goal', '2026-09-30'); assert.ok(late.goals[0].targetDate < '2026-09-30');
  const dst = await loadFixture('dst-week', '2026-09-30'); assert.equal(dst.tasks[1].date, '2026-11-01');
});
test('normal output hides known opaque credentials and JWTs', () => {
  rememberSecret('opaque-unit-secret');
  assert.equal(redact('opaque-unit-secret'), '[redacted]');
  assert.equal(redact('eyJabc.def.ghi'), '[redacted]');
});
