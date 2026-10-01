import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repoRoot, '.agents/skills/test-kriyan');
const target = resolve(repoRoot, '.claude/skills/test-kriyan');
export async function skillFiles(directory) {
  const files = new Map();
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = resolve(path, entry.name);
      if (entry.isDirectory()) await visit(file);
      else files.set(relative(directory, file).split(sep).join('/'), await readFile(file));
    }
  }
  await visit(directory); return files;
}
export async function checkSkillCopies() {
  const [original, copied] = await Promise.all([skillFiles(source), skillFiles(target)]);
  const mismatches = [...new Set([...original.keys(), ...copied.keys()])].filter(path => !original.get(path)?.equals(copied.get(path)));
  if (mismatches.length) throw new Error(`Skill copies differ: ${mismatches.join(', ')}. Run bun run skills:sync.`);
  return original.size;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) console.log(`Skill copies match: ${await checkSkillCopies()} files.`);
  else {
    // Explicit, fixed repository target. Remove stale files before replacing the copy.
    if (!target.startsWith(`${repoRoot}${sep}`) || target === source) throw new Error('Unsafe skill-copy target.');
    await mkdir(dirname(target), { recursive: true });
    await rm(target, { recursive: true, force: true });
    await cp(source, target, { recursive: true });
    console.log(`Synced test-kriyan: ${await checkSkillCopies()} files.`);
  }
}
