import { parseArgs } from 'node:util';
import { UsageError } from './config.mjs';

const secrets = new Set();
export function rememberSecret(value) { if (value) secrets.add(value); return value; }
export function redact(value) {
  let text = String(value);
  for (const secret of [...secrets, ...Object.entries(process.env).filter(([key]) => /SECRET|TOKEN|PASSWORD|API_KEY/.test(key)).map(([, val]) => val)])
    if (secret?.length > 5) text = text.replaceAll(secret, '[redacted]');
  return text.replace(/\b(?:sk_(?:test|live)_|pk_(?:test|live)_)[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]');
}
export function print(value) { console.log(redact(typeof value === 'string' ? value : JSON.stringify(value, null, 2))); }
export function reveal(value) { process.stdout.write(`${value}\n`); }
export function argumentsFor(options) {
  try { return parseArgs({ options, allowPositionals: true, strict: true }); }
  catch { throw new UsageError('Unknown option or missing option value. Read .agents/skills/test-kriyan/SKILL.md.'); }
}
export function providerError(error, operation) {
  const code = error?.errors?.[0]?.code;
  return new UsageError(`${operation} failed${code && /^[a-z0-9_]+$/i.test(code) ? ` (${code})` : ''}. Check the development configuration and retry.`);
}
export async function main(work) {
  try { await work(); }
  catch (error) {
    print(error instanceof UsageError ? error.message : 'Test operation failed. Check the development configuration and retry.');
    process.exitCode = 1;
  }
}
