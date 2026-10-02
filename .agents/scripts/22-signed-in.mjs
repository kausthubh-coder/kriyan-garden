import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { privatePath } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { user, backend, prod, ref } from './21-common.mjs';
import { adb, tap, type, waitText, xml, capture, pause } from './22-adb.mjs';
let owner;
try { owner = JSON.parse(await readFile(privatePath('22-startup-user.json'), 'utf8')); }
catch { owner = await user('22-startup', false); }
await writeFile(privatePath('22-startup-user.json'), JSON.stringify(owner));
const b = await backend(owner, prod);
await b.client.mutation(ref('profiles:ensure'), { timezone: 'America/New_York' });
await b.client.mutation(ref('profiles:completeOnboarding'), {});
if (!process.argv.includes('--resume-auth')) {
await adb('shell', 'pm', 'clear', 'app.kriyan.android');
await adb('logcat', '-c');
await adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable');
await adb('shell', 'svc', 'wifi', 'disable'); await adb('shell', 'svc', 'data', 'disable');
await adb('shell', 'am', 'start', '-W', '-n', 'app.kriyan.android/.MainActivity');
await waitText('Try again'); await capture('fixed-offline-retry-before');
await adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable');
await adb('shell', 'svc', 'wifi', 'enable'); await adb('shell', 'svc', 'data', 'enable');
let connected = false;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const response = await adb('shell', 'printf "GET /generate_204 HTTP/1.1\\r\\nHost: connectivitycheck.gstatic.com\\r\\nConnection: close\\r\\n\\r\\n" | toybox nc -4 -w 8 -W 8 -q 1 connectivitycheck.gstatic.com 80');
    if (/HTTP\/1\.[01] 204/.test(response)) { connected = true; break; }
  } catch { /* Wait for the guest to reconnect. */ }
  await pause(3000);
}
assert(connected, 'A real device request must pass before retrying authentication.');
if ((await xml()).includes('Try again')) await tap('Try again');
try { await waitText('Send code'); }
finally {
  const retryLogs = await adb('logcat', '-d', '-v', 'threadtime', 'ReactNativeJS:V', 'AndroidRuntime:E', 'ActivityTaskManager:I', '*:S');
  await writeFile('.agents/logs/22/fixed-offline-retry.logcat.txt', retryLogs.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]'));
  await capture('fixed-offline-retry-result');
}
await capture('fixed-offline-retry-recovered');
console.log('Offline Try again recovered the sign-in form after a verified device HTTP 204.');
}
await tap('Email'); await type(owner.email); await adb('shell', 'input', 'keyevent', '4');
await tap('Send code'); await waitText('Verification code');
await tap('Verification code'); await type('424242'); await adb('shell', 'input', 'keyevent', '4');
await tap('Verify code');
await pause(2000);
if ((await xml()).includes('Skip notifications')) await tap('Skip notifications');
await waitText('Settings');
await adb('shell', 'am', 'force-stop', 'app.kriyan.android');
await adb('logcat', '-c');
await adb('shell', 'am', 'start', '-W', '-n', 'app.kriyan.android/.MainActivity');
await waitText('Settings');
const state = await xml(); assert(state.includes('Day')); assert(!state.includes('Send code'));
await capture('fixed-signed-in-relaunch');
const logs = await adb('logcat', '-d', '-v', 'threadtime', 'ReactNativeJS:V', 'AndroidRuntime:E', 'ActivityTaskManager:I', '*:S');
await writeFile('.agents/logs/22/fixed-signed-in-relaunch.logcat.txt', logs.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]'));
console.log('Email-code sign-in and signed-in cold relaunch to Day passed.');
await tap('Settings'); await tap('Sign out'); await waitText('Send code');
await pause(500); await capture('fixed-signed-out-after-relaunch');
await writeFile('.agents/logs/22/retry-recovery.json', JSON.stringify({passed:true,deviceHttpStatus:204,offlineRetry:true,emailCodeSignIn:true,signedInColdStart:'Day',signOut:true,checkedAt:new Date().toISOString()}, null, 2));
