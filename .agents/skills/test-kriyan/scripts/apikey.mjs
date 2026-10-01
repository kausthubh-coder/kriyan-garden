import { argumentsFor, main, print, reveal, rememberSecret, providerError } from './lib/output.mjs';
import { UsageError } from './lib/config.mjs';
import { clerkClient, resolveUser } from './lib/users.mjs';
import { pathToFileURL } from 'node:url';
export const apiKeyFix = 'In Clerk Dashboard > API keys, choose Enable API keys, select Enable User API keys, then Enable. See docs/setup/05-development-oauth.md.';
export async function createApiKey(ownerId, scopes) {
  try {
    return await clerkClient().apiKeys.create({ subject: ownerId, name: 'Kriyan disposable development check', scopes, secondsUntilExpiration: 600 });
  } catch (error) {
    if (error?.errors?.some(item => /disabled|not_enabled|feature_not_available/.test(item.code)) || /not enabled|disabled/i.test(String(error))) throw new UsageError(`User API keys are not enabled. ${apiKeyFix}`);
    throw providerError(error, 'API-key creation');
  }
}
// doctor imports the helper without running the command.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(async () => {
  const { values, positionals: [identifier] } = argumentsFor({ scopes: { type: 'string' }, reveal: { type: 'boolean' } });
  const user = await resolveUser(identifier);
  const scopes = (values.scopes ?? 'tasks:read,spaces:read,goals:read').split(',');
  const key = await createApiKey(user.id, scopes);
  print({ id: key.id, email: user.email, scopes: key.scopes });
  if (values.reveal) reveal(rememberSecret(key.secret ?? (await clerkClient().apiKeys.getSecret(key.id)).secret));
});
