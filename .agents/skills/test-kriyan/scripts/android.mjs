import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { argumentsFor, main, print, rememberSecret } from './lib/output.mjs';
import { configuration, root, privatePath, UsageError } from './lib/config.mjs';
import { testEmail } from './lib/users.mjs';
const execute = promisify(execFile), pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function attribute(node, key) {
  return new RegExp(`${key}="([^"]*)"`).exec(node)?.[1]?.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>') ?? '';
}
function visibleText(nodes) {
  return [...new Set(nodes.filter(node => attribute(node, 'password') !== 'true' && !attribute(node, 'class').includes('EditText')).flatMap(node => [attribute(node, 'text'), attribute(node, 'content-desc')]).filter(Boolean))];
}
await main(async () => {
  const { values, positionals: [operation, email] } = argumentsFor({ password: { type: 'string' }, serial: { type: 'string' }, 'wait-minutes': { type: 'string', default: '30' } });
  const env = configuration(); testEmail(email); rememberSecret(values.password);
  if (operation !== 'signin') throw new UsageError('Use android.mjs signin <email> [--password <pw>]. The emulator must already be running.');
  const waitMinutes = Number(values['wait-minutes']);
  if (!Number.isFinite(waitMinutes) || waitMinutes < 0) throw new UsageError('--wait-minutes must be nonnegative.');
  let executable = 'adb';
  for (const sdk of [resolve(root, '.agents/android-sdk'), env.ANDROID_HOME, env.ANDROID_SDK_ROOT]) {
    if (!sdk) continue;
    const candidate = resolve(sdk, `platform-tools/adb${process.platform === 'win32' ? '.exe' : ''}`);
    try { await access(candidate); executable = candidate; break; } catch { /* Try the next configured SDK. */ }
  }
  const deadline = Date.now() + waitMinutes * 60_000;
  let serial;
  for (;;) {
    let list;
    try { list = await execute(executable, ['devices'], { windowsHide: true, timeout: 15_000 }); }
    catch { throw new UsageError('ADB is unavailable. Install platform-tools or set ANDROID_HOME to the existing SDK, then retry.'); }
    const devices = [...list.stdout.matchAll(/^(emulator-\d+)[ \t]+device[ \t]*\r?$/gm)].map(match => match[1]);
    if (!values.serial && devices.length > 1) throw new UsageError('Multiple emulators are running. Choose the existing device with --serial.');
    serial = values.serial ?? devices[0];
    if (serial && devices.includes(serial)) break;
    if (Date.now() >= deadline) throw new UsageError('No running emulator became available. Retry after the shared emulator owner starts it; this script never starts another.');
    print('Waiting for the shared emulator to become available; no emulator will be started.');
    await pause(15_000);
  }
  const lock = privatePath(`android-${serial}.lock.json`);
  let locked = false, lastNotice = 0;
  async function adb(...args) {
    try { return (await execute(executable, ['-s', serial, ...args], { windowsHide: true, timeout: 30_000, maxBuffer: 4_000_000 })).stdout; }
    catch { throw new UsageError('ADB failed. Check the existing emulator connection and retry.'); }
  }
  async function nodes() {
    await adb('shell', 'uiautomator', 'dump', '/sdcard/kriyan-test-skill.xml');
    return (await adb('exec-out', 'cat', '/sdcard/kriyan-test-skill.xml')).match(/<node\b[^>]*>/g) ?? [];
  }
  async function waitBusy(reason) {
    if (Date.now() >= deadline) throw new UsageError(`The shared emulator is still busy (${reason}). Retry after its owner finishes; no second emulator was started.`);
    if (Date.now() - lastNotice > 15_000) { print(`Waiting for shared emulator ${serial}: ${reason}.`); lastNotice = Date.now(); }
    await pause(5000);
  }
  async function helperBusy() {
    // Existing Android QA helpers hold a real user in memory until /cleanup.
    try { await fetch('http://127.0.0.1:4781/profile', { signal: AbortSignal.timeout(1500) }); return true; }
    catch { return false; }
  }
  try {
    for (;;) {
      if (await helperBusy()) { await waitBusy('another QA helper is running'); continue; }
      try { await writeFile(lock, JSON.stringify({ pid: process.pid }), { flag: 'wx', mode: 0o600 }); locked = true; break; }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const owner = JSON.parse(await readFile(lock, 'utf8'));
        try { process.kill(owner.pid, 0); } catch { await unlink(lock); continue; }
        await waitBusy('another test-kriyan script holds the device');
      }
    }
    const packages = await adb('shell', 'pm', 'list', 'packages', 'app.kriyan.android');
    if (!packages.includes('package:app.kriyan.android')) throw new UsageError('Kriyan APK is not installed. Use scripts/build-android-local.ps1 and install it on the existing emulator.');
    await adb('shell', 'monkey', '-p', 'app.kriyan.android', '-c', 'android.intent.category.LAUNCHER', '1');
    let screen;
    for (;;) {
      screen = await nodes();
      if (screen.some(node => attribute(node, 'text') === 'Email' || attribute(node, 'content-desc') === 'Email')) break;
      await waitBusy('the app has an existing session or is being used');
    }
    async function tap(label) {
      const rows = await nodes();
      const node = rows.find(node => attribute(node, 'content-desc') === label) ?? rows.find(node => attribute(node, 'text') === label);
      const bounds = node && /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
      if (!bounds) throw new UsageError(`Android control missing: ${label}.`);
      await adb('shell', 'input', 'tap', String(Math.round((Number(bounds[1]) + Number(bounds[3])) / 2)), String(Math.round((Number(bounds[2]) + Number(bounds[4])) / 2)));
    }
    async function input(value) {
      if (!/^[a-zA-Z0-9@+._-]+$/.test(value)) throw new UsageError('ADB input supports test emails and generated alphanumeric passwords.');
      await adb('shell', 'input', 'keycombination', '113', '29');
      await adb('shell', 'input', 'keyevent', '67');
      await adb('shell', 'input', 'text', `'${value}'`);
    }
    await tap('Email'); await input(email);
    const hasPassword = screen.some(node => attribute(node, 'text') === 'Password' || attribute(node, 'content-desc') === 'Password');
    if (hasPassword) {
      if (!values.password) throw new UsageError('This Android app uses password-first sign-in. Create the test user with --password and pass it here; 424242 handles any subsequent email verification.');
      await tap('Password'); await input(values.password);
    }
    await adb('shell', 'input', 'keyevent', '4'); await tap('Sign in');
    const signInDeadline = Date.now() + 90_000;
    let verified = false;
    while (Date.now() < signInDeadline) {
      await pause(1500); screen = await nodes();
      const texts = visibleText(screen);
      if (texts.some(text => /^What do you plan for\?|^Day$|^Today$/.test(text))) {
        await writeFile(privatePath('android-signin-proof.json'), JSON.stringify({ serial, email, signedIn: true, visibleText: texts }, null, 2));
        print({ serial, email, signedIn: true, visibleText: texts }); return;
      }
      if (!verified && texts.some(text => /Verification code/.test(text))) {
        await tap('Verification code'); await input('424242'); await adb('shell', 'input', 'keyevent', '4'); await tap('Verify code'); verified = true;
      }
      if (texts.some(text => /Sign-in failed|Verification failed/.test(text))) throw new UsageError('Android sign-in failed. Check the development user/password and app Clerk configuration.');
    }
    throw new UsageError('Android sign-in timed out before reaching the planner or onboarding.');
  } finally {
    if (locked) { await adb('shell', 'rm', '-f', '/sdcard/kriyan-test-skill.xml').catch(() => {}); await unlink(lock); }
  }
});
