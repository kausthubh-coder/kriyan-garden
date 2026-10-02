import assert from 'node:assert/strict';
import { appendFile } from 'node:fs/promises';
import { listTestUsers } from '../skills/test-kriyan/scripts/lib/users.mjs';
import { privatePath } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { cleanup, save } from './21-common.mjs';
const before=await listTestUsers(), receipts=[];
await save('22-cleanup-inventory-before',before);
for(const owner of before.filter(owner=>!owner.fixture)) {
  // Keep every candidate in the later two-deployment audit, including users
  // from interrupted sessions that did not reach their registration step.
  await appendFile(privatePath('21-users.jsonl'),JSON.stringify({id:owner.id,email:owner.email})+'\n');
  await cleanup(owner);
  receipts.push({id:owner.id,email:owner.email,deleted:true,developmentReset:true,productionReset:true});
  await save('22-cleanup-users',receipts);console.log('Removed disposable test user:',owner.id);
}
const after=await listTestUsers();await save('22-cleanup-inventory-after',after);
assert.equal(after.length,2);assert(after.every(owner=>owner.fixture));
console.log(JSON.stringify({deleted:receipts.length,remaining:after.map(({id,email,fixture})=>({id,email,fixture}))}));
