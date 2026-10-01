import { writeFile } from 'node:fs/promises';
import { argumentsFor, main, print, reveal } from './lib/output.mjs';
import { withUserPage, convexToken } from './lib/browser.mjs';
import { privatePath, protect } from './lib/config.mjs';
await main(async () => {
  const { values, positionals: [email] } = argumentsFor({ base: { type: 'string' }, reveal: { type: 'boolean' }, out: { type: 'string' } });
  const token = await withUserPage(email, values, convexToken);
  if (values.out) {
    const path = privatePath(values.out);
    await writeFile(path, token, { mode: 0o600 }); protect(path);
    print({ email, template: 'convex', token: '[redacted]', path });
  } else if (values.reveal) reveal(token);
  else print({ email, template: 'convex', token: '[redacted]', hint: 'Use --out <file> for direct queries or --reveal for immediate use.' });
});
