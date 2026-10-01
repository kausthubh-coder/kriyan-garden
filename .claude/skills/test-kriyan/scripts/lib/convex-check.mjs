// Child process: all Convex CLI output is captured by doctor, never forwarded.
// convex dev has no --dry-run. Use its selection logic with dry-run push.
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import { configuration, root, UsageError } from './config.mjs';
const env = configuration();
process.chdir(resolve(root, 'packages/backend'));
// The CLI's verbose logs can contain configuration. Retain them only in memory;
// emit a small count-only summary, including when this helper is run directly.
let captured = '';
const originalOut = process.stdout.write.bind(process.stdout);
const originalErr = process.stderr.write.bind(process.stderr);
function capture(chunk, encoding, callback) {
  captured += String(chunk);
  const done = typeof encoding === 'function' ? encoding : callback;
  if (done) done();
  return true;
}
process.stdout.write = capture;
process.stderr.write = capture;
// The published CLI is a bundle; its separate ESM internals depend on unpublished
// dependencies. Load that installed bundle in memory, replacing only its entry
// point with a guarded dry-run. Never edit node_modules or call the deploy command.
const require = createRequire(import.meta.url);
const filename = resolve(root, 'node_modules/convex/dist/cli.bundle.cjs');
const source = readFileSync(filename, 'utf8');
if (source.split('void main();').length !== 2) throw new UsageError('Installed Convex CLI changed. Review the no-diff adapter.');
const adapter = new Module(filename);
adapter.filename = filename;
adapter.paths = require.resolve.paths('convex');
adapter._compile(source.replace('void main();', `module.exports.check = async function(expectedUrl) {
  const ctx = await oneoffContext({});
  const selection = await getDeploymentSelection(ctx, {});
  const credentials = await loadSelectedDeploymentCredentials(ctx, selection);
  if (credentials.url !== expectedUrl || credentials.deploymentFields?.deploymentType !== 'dev')
    throw new Error('The selected deployment is not the expected development URL.');
  await runPush(ctx, { url: credentials.url, adminKey: credentials.adminKey,
    deploymentName: credentials.deploymentFields.deploymentName, deploymentType: 'dev',
    dryRun: true, codegen: false, typecheck: 'disable', typecheckComponents: false,
    verbose: true, debug: false, liveComponentSources: false, pushAllModules: false,
    largeIndexDeletionCheck: 'no verification', warnOnSlowSchemaValidation: false });
};`), filename);
try {
  await adapter.exports.check(env.NEXT_PUBLIC_CONVEX_URL);
  const start = captured.lastIndexOf('{\n  "authDiff"');
  if (start < 0) throw new Error('No structured diff.');
  const diff = JSON.parse(captured.slice(start, captured.lastIndexOf('}') + 1));
  originalOut(`${JSON.stringify({ matchedDev: true, authChanges: diff.authDiff.added.length + diff.authDiff.removed.length,
    componentChanges: Object.keys(diff.componentDiffs).length, definitionChanges: Object.keys(diff.definitionDiffs).length })}\n`);
} catch {
  originalOut('Convex development no-diff check failed. Verify the linked deployment and CLI compatibility.\n');
  process.exitCode = 1;
} finally { process.stdout.write = originalOut; process.stderr.write = originalErr; }
