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
  for (let attempt = 0; attempt < (online ? 6 : 1); attempt++) {
  try {
    response = await run('shell', 'printf "GET /generate_204 HTTP/1.1\\r\\nHost: connectivitycheck.gstatic.com\\r\\nConnection: close\\r\\n\\r\\n" | toybox nc -4 -w 8 -W 8 -q 1 connectivitycheck.gstatic.com 80');
  } catch (error) { response = `Device HTTP request failed.\n${error.stderr ?? ''}\n${error.stdout ?? ''}`; }
  if (/^HTTP\/1\.[01] 204/m.test(response)) break;
  if (online) await pause(3000);
  }
  const reachable = /^HTTP\/1\.[01] 204/m.test(response);
  await writeFile(`${dir}/${phase}-network-${online ? 'on' : 'off'}.txt`, response);
  if (reachable !== online) throw new Error(`Device networking gate failed for ${online ? 'online' : 'airplane'} mode.`);
  console.log(`Real device HTTP request: ${online ? '204 received' : 'unreachable as expected'}.`);
}
async function mobileData(state) {
  try { await run('shell', 'svc', 'data', state); }
  catch (error) { if (!String(error.stderr).includes("Can't find service: phone")) throw error; }
}
async function launch(state) {
  await run('shell', 'pm', 'clear', 'app.kriyan.android');
  await run('logcat', '-c');
  const started = Date.now();
  // Capture while am start waits, so the native splash is included too.
  const launch = run('shell', 'am', 'start', '-W', '-n', 'app.kriyan.android/.MainActivity').then(result => ({ result }), error => ({ error }));
  const captures = [];
  for (const elapsed of [500, 1000, 3000, 5000, 7000, 10000]) {
    await pause(Math.max(0, started + elapsed - Date.now()));
    await writeFile(`${dir}/${phase}-${state}-${elapsed}ms.png`, await run('exec-out', 'screencap', '-p'));
    captures.push({ filename: `${phase}-${state}-${elapsed}ms.png`, afterLaunchMs: Date.now() - started });
  }
  const launched = await launch;
  if (launched.error) throw launched.error;
  const launchResult = launched.result;
  await writeFile(`${dir}/${phase}-${state}-timings.json`, JSON.stringify({ started: new Date(started).toISOString(), launchResult, captures }, null, 2));
  await run('shell', 'uiautomator', 'dump', '/sdcard/qa22-startup.xml');
  const xml = await run('exec-out', 'cat', '/sdcard/qa22-startup.xml');
  await writeFile(`${dir}/${phase}-${state}.xml`, xml);
  const logs = await run('logcat', '-d', '-v', 'threadtime', 'ReactNativeJS:V', 'AndroidRuntime:E', 'ActivityTaskManager:I', '*:S');
  await writeFile(`${dir}/${phase}-${state}.logcat.txt`, logs.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]'));
  function milestone(marker) {
    const row=logs.split('\n').find(row=>row.includes(marker));
    const time=row?.match(/\b(\d{2}):(\d{2}):(\d{2})\.(\d{3})\b/);
    return time ? { time:time[0],ms:(Number(time[1])*3600+Number(time[2])*60+Number(time[3]))*1000+Number(time[4]) } : null;
  }
  const first=milestone('Kriyan startup: first app frame');
  const native=milestone('Displayed app.kriyan.android');
  const target=milestone(state==='online'?'Kriyan startup: sign-in form frame':'Kriyan startup: sign-in retry frame');
  const timing={firstAppFrame:first?.time,nativeDisplayed:native?.time,targetFrame:target?.time,afterAppFrameMs:first&&target?Math.max(0,target.ms-first.ms):null,afterNativeDisplayedMs:native&&target?target.ms-native.ms:null};
  await writeFile(`${dir}/${phase}-${state}-milestones.json`,JSON.stringify(timing,null,2));
  if(phase==='fixed') {
    if(state==='online'&&!xml.includes('Send code'))throw new Error('Online startup did not show sign-in.');
    if(state==='offline'&&(!xml.includes('Try again')||!xml.includes('Kriyan could not reach the sign-in service. Check your connection and try again.')))throw new Error('Offline startup did not show the requested error and retry control.');
    if(timing.afterAppFrameMs===null||timing.afterAppFrameMs>(state==='online'?3000:5000))throw new Error(`Startup exceeded its first-app-frame deadline: ${JSON.stringify(timing)}`);
    console.log(`${state} screen frame: ${timing.afterAppFrameMs}ms after the first app frame, ${timing.afterNativeDisplayedMs}ms after native Displayed.`);
  }
  console.log(`${phase} ${state}: ${xml.includes('Send code') ? 'sign-in form' : xml.includes('Try again') ? 'retry screen' : 'no sign-in or retry control'}.`);
}
const readyDeadline = Date.now() + 300000;
for (;;) {
  try { if ((await run('shell', 'getprop', 'sys.boot_completed')).trim() === '1') break; } catch { /* Wait for ADB after cold boot. */ }
  if (Date.now() > readyDeadline) throw new Error('Android did not finish booting. No app test ran.');
  await pause(3000);
}
if (!(await run('shell', 'pm', 'path', 'app.kriyan.android')).includes('package:')) throw new Error('Install the existing APK before startup verification.');
try {
  await run('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable');
  await run('shell', 'svc', 'wifi', process.env.KRIYAN_QA_WIFI === '0' ? 'disable' : 'enable');
  await mobileData('enable');
  await network(true);
  await launch('online');
  await run('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable');
  await run('shell', 'svc', 'wifi', 'disable');
  await mobileData('disable');
  await network(false);
  await launch('offline');
} finally {
  await run('shell', 'am', 'force-stop', 'app.kriyan.android');
  await run('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable');
  await run('shell', 'svc', 'wifi', process.env.KRIYAN_QA_WIFI === '0' ? 'disable' : 'enable');
  await mobileData('enable');
}
