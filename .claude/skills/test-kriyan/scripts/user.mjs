import { createTestUser, deleteTestUser, listTestUsers, ageMilliseconds, pruneCandidates } from './lib/users.mjs';
import { UsageError } from './lib/config.mjs';
import { argumentsFor, main, print, reveal } from './lib/output.mjs';
await main(async () => {
  const { values, positionals: [operation, identifier] } = argumentsFor({ tag: { type: 'string' }, password: { type: 'boolean' }, 'older-than': { type: 'string' } });
  if (operation === 'create') {
    const user = await createTestUser({ tag: values.tag, password: values.password });
    print({ id: user.id, email: user.email });
    if (user.password) reveal(`Password (once): ${user.password}`);
  } else if (operation === 'delete') print(await deleteTestUser(identifier));
  else if (operation === 'list') {
    const users = await listTestUsers();
    print(users.map(({ createdAt, ...user }) => ({ ...user, age: `${Math.floor((Date.now() - createdAt) / 60000)}m` })));
    print(`Test users: ${users.length}; fixtures: ${users.filter(user => user.fixture).length}.`);
  } else if (operation === 'prune') {
    const users = pruneCandidates(await listTestUsers(), ageMilliseconds(values['older-than']), values.tag);
    for (const user of users) print(await deleteTestUser(user.id));
    print(`Pruned ${users.length} test users.`);
  } else throw new UsageError('Use user.mjs create --tag <purpose> [--password], list, delete <id|email>, or prune --older-than 2h [--tag <purpose>].');
});
