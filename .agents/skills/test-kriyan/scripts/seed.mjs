import { argumentsFor, main, print } from './lib/output.mjs';
import { UsageError } from './lib/config.mjs';
import { resolveUser } from './lib/users.mjs';
import { resetOwner } from './lib/service.mjs';
import { seedFixture } from './lib/fixtures.mjs';
await main(async () => {
  const { values, positionals: [identifier, operation, name] } = argumentsFor({ today: { type: 'string' } });
  const user = await resolveUser(identifier);
  if (operation === 'reset') { await resetOwner(user.id); print({ email: user.email, reset: true }); }
  else if (operation === 'sample' || operation === 'fixture') {
    const fixture = operation === 'sample' ? 'sample' : name;
    print({ email: user.email, fixture, counts: await seedFixture(user.id, fixture, { today: values.today }) });
  } else throw new UsageError('Use seed.mjs <email|id> sample, reset, or fixture <name>. Fixtures replace that test user\'s planner.');
});
