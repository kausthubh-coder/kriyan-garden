import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const execute = promisify(execFile);
const adb = resolve('.agents/android-sdk/platform-tools/adb.exe');
const phase = process.argv[2] ?? 'original';
if (!['original', 'fixed'].includes(phase)) throw new Error('Choose original or fixed startup verification.');
const dir = '.agents/logs/22';
await mkdir(dir, { recursive: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
async function run(...args) {
  const binary = args[0] === 'exec-out' && args[1] === 'screencap';
  return (await execute(adb, ['-s', 'emulator-5554', ...args], { windowsHide: true, timeout: 30000, maxBuffer: 16000000, encoding: binary ? null : 'utf8' })).stdout;
}
async function network(online) {
  let response;
  try {
    response = await run('shell', 'printf "GET /generate_204 HTTP/1.1\\r\\nHost: connectivitycheck.gstatic.com\\r\\nConnection: close\\r\\n\\r\\n" | toybox nc -w 8 connectivitycheck.gstatic.com 80');
  } catch { response = 'Device HTTP request failed.'; }
  const reachable = /^HTTP\/1\.[01] 204/m.test(response);
  await writeFile(`${dir}/${phase}-network-${online ? 'on' : 'off'}.txt`, response);
  if (reachable !== online) throw new Error(`Device networking gate failed for ${online ? 'online' : 'airplane'} mode.`);
  console.log(`Real device HTTP request: ${online ? '204 received' : 'unreachable as expected'}.`);
}
async function launch(state) {
  await run('shell', 'pm', 'clear', 'app.kriyan.android');
  await run('logcat', '-c');
  const started = Date.now();
  await run('shell', 'am', 'start', '-W', '-n', 'app.kriyan.android/.MainActivity');
  for (const elapsed of [1000, 3000, 5000, 10000]) {
    await pause(Math.max(0, started + elapsed - Date.now()));
    await writeFile(`${dir}/${phase}-${state}-${elapsed}ms.png`, await run('exec-out', 'screencap', '-p'));
  }
  await run('shell', 'uiautomator', 'dump', '/sdcard/qa22-startup.xml');
  const xml = await run('exec-out', 'cat', '/sdcard/qa22-startup.xml');
  await writeFile(`${dir}/${phase}-${state}.xml`, xml);
  const logs = await run('logcat', '-d', '-v', 'threadtime', 'ReactNativeJS:V', 'AndroidRuntime:E', 'ActivityTaskManager:I', '*:S');
  await writeFile(`${dir}/${phase}-${state}.logcat.txt`, logs.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]'));
  console.log(`${phase} ${state}: ${xml.includes('Send code') ? 'sign-in form' : xml.includes('Try again') ? 'retry screen' : 'no sign-in or retry control'}.`);
}
try {
  await run('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable');
  await run('shell', 'svc', 'wifi', 'enable');
  await run('shell', 'svc', 'data', 'enable');
  await network(true);
  await launch('online');
  await run('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable');
  await run('shell', 'svc', 'wifi', 'disable');
  await run('shell', 'svc', 'data', 'disable');
  await network(false);
  await launch('offline');
} finally {
  await run('shell', 'am', 'force-stop', 'app.kriyan.android');
  await run('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable');
  await run('shell', 'svc', 'wifi', 'enable');
  await run('shell', 'svc', 'data', 'enable');
}
