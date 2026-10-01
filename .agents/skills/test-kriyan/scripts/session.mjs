import { argumentsFor, main, print } from './lib/output.mjs';
import { saveSession } from './lib/browser.mjs';
await main(async () => {
  const { values, positionals: [email] } = argumentsFor({ base: { type: 'string' }, ui: { type: 'boolean' }, password: { type: 'string' }, out: { type: 'string' } });
  print(await saveSession(email, values));
});
