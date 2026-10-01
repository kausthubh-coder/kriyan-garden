import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { root } from '../skills/test-kriyan/scripts/lib/config.mjs';
const execute = promisify(execFile);
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function adb(...args) {
  return (await execute(`${root}/.agents/android-sdk/platform-tools/adb.exe`, ['-s', 'emulator-5554', ...args], {
    windowsHide: true, timeout: 45000, maxBuffer: 16000000,
    encoding: args[0] === 'exec-out' && args[1] === 'screencap' ? null : 'utf8',
  })).stdout;
}
export async function xml() {
  await adb('shell', 'uiautomator', 'dump', '/sdcard/qa22.xml');
  return adb('exec-out', 'cat', '/sdcard/qa22.xml');
}
export function attr(node, name) {
  return new RegExp(`${name}="([^"]*)"`).exec(node)?.[1]?.replaceAll('&amp;', '&').replaceAll('&quot;', '"') ?? '';
}
export async function nodes() { return (await xml()).match(/<node\b[^>]*>/g) ?? []; }
export async function tap(label) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const rows = await nodes();
    const node = rows.find(n => attr(n, 'content-desc') === label) ?? rows.find(n => attr(n, 'text') === label);
    const bounds = node && attr(node, 'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (bounds && +bounds[3] > +bounds[1] && +bounds[4] > +bounds[2]) {
      await adb('shell', 'input', 'tap', String((+bounds[1] + +bounds[3]) / 2), String((+bounds[2] + +bounds[4]) / 2));
      await pause(300); return;
    }
    await pause(500);
  }
  throw new Error(`Android control not found: ${label}`);
}
export async function type(value) { await adb('shell', 'input', 'text', value.replaceAll(' ', '%s')); }
export async function waitText(value) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if ((await xml()).includes(value)) return;
    await pause(500);
  }
  throw new Error(`Android state did not appear: ${value}`);
}
export async function capture(name) {
  await writeFile(`.agents/logs/22/${name}.xml`, await xml());
  await writeFile(`.agents/logs/22/${name}.png`, await adb('exec-out', 'screencap', '-p'));
}
