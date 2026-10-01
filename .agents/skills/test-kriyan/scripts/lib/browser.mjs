import { chromium, expect } from '@playwright/test';
import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright';
import { configuration, baseUrl, privatePath, protect, UsageError } from './config.mjs';
import { testEmail } from './users.mjs';
import { rememberSecret, redact } from './output.mjs';
import { writeFile } from 'node:fs/promises';

export async function prepareClerk() { configuration(); process.env.DOTENV_CONFIG_QUIET = 'true'; await clerkSetup(); }
export function launchBrowser() { return chromium.launch({ channel: 'chrome' }); }
export async function signInPage(page, email, { base, ui = false, password, destination = '/app' } = {}) {
  testEmail(email);
  const origin = baseUrl(base);
  rememberSecret(password);
  await setupClerkTestingToken({ page });
  const signIn = new URL('/sign-in', origin);
  // A direct visit otherwise uses Clerk's fallback redirect to the public page,
  // which deliberately does not load Clerk. Exercise the app's return URL.
  signIn.searchParams.set('redirect_url', `${origin}/app`);
  await page.goto(signIn.href, { timeout: 120_000 });
  if (!ui) await clerk.signIn({ page, emailAddress: email });
  else {
    async function enterCode() {
      await expect(page.getByText(/Resend\s*\(\d+\)/).first()).toBeVisible({ timeout: 30_000 });
      const otp = page.locator('input[autocomplete="one-time-code"], input[name="code"], input[data-input-otp], input[name="otp"]');
      if (await otp.count()) await otp.first().fill('424242');
      else {
        const digits = page.locator('input[inputmode="numeric"]');
        await expect(digits.first()).toBeVisible({ timeout: 30_000 });
        if (await digits.count() === 1) await digits.first().fill('424242');
        else for (let index = 0; index < 6; index++) await digits.nth(index).fill('424242'[index]);
      }
      // Clerk auto-submits a complete OTP; do not verify it a second time.
    }
    await page.getByLabel(/email address/i).fill(email);
    await page.getByRole('button', { name: /^continue$/i }).click();
    if (password) {
      await page.getByLabel(/^password$/i).fill(password);
      const prepared = page.waitForResponse(response => response.request().method() === 'POST' && /\/sign_ins\/.*\/prepare_(client_trust|second_factor|first_factor)/.test(new URL(response.url()).pathname), { timeout: 30_000 });
      void prepared.catch(() => {});
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect.poll(async () => new URL(page.url()).pathname.startsWith('/app') || await page.locator('input[inputmode="numeric"]').first().isVisible(), { timeout: 30_000 }).toBe(true);
      if (await page.locator('input[inputmode="numeric"]').first().isVisible()) {
        if (!(await prepared).ok()) throw new UsageError('Clerk could not prepare the new-device email verification.');
        await enterCode();
      }
    } else {
      const alternative = page.getByText('Use another method', { exact: true });
      // Wait for the strategy screen, rather than testing the initial form before it transitions.
      await expect.poll(async () => await alternative.isVisible() || await page.locator('input[inputmode="numeric"]').first().isVisible(), { timeout: 30_000 }).toBe(true);
      if (await alternative.isVisible()) {
        await alternative.click();
        const codeOption = page.getByText(/email.*code|code.*email/i);
        const prepared = page.waitForResponse(response => response.request().method() === 'POST' && /\/sign_ins\/.*\/(prepare_first_factor|send_email_code)/.test(new URL(response.url()).pathname), { timeout: 30_000 });
        void prepared.catch(() => {});
        await codeOption.first().click();
        const sent = await prepared;
        if (!sent.ok()) throw new UsageError('Clerk could not send the test email code. Check email-code sign-in settings.');
      }
      await enterCode();
    }
    await page.waitForURL(url => url.origin === origin && url.pathname.startsWith('/app'), { timeout: 60_000 });
  }
  await page.goto(`${origin}${destination}`, { timeout: 120_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.Clerk?.session)), { timeout: 30_000 }).toBe(true);
}
export async function withUserPage(email, options, work) {
  await prepareClerk();
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ timezoneId: 'America/New_York' });
    const page = await context.newPage();
    try { await signInPage(page, email, options); }
    catch (error) {
      const proof = { email, pathname: new URL(page.url()).pathname, visibleText: await page.locator('body').innerText().catch(() => ''), reason: String(error).split('\n')[0] };
      await writeFile(privatePath('web-signin-failure.json'), redact(JSON.stringify(proof, null, 2)));
      throw new UsageError(`Web sign-in failed: ${redact(proof.reason)}. Inspect .agents/test-kriyan/web-signin-failure.json.`);
    }
    return await work(page);
  } finally { await browser.close(); }
}
export async function saveSession(email, options) {
  return withUserPage(email, options, async page => {
    const path = privatePath(options.out ?? `${email.split('@')[0]}.json`);
    await page.context().storageState({ path });
    protect(path);
    return { email, mode: options.ui ? 'ui' : 'helper', signedIn: true, path };
  });
}
export async function convexToken(page) {
  const token = await page.evaluate(async () => window.Clerk?.session?.getToken({ template: 'convex' }));
  if (!token) throw new UsageError('Clerk returned no Convex JWT. Configure the convex JWT template.');
  return rememberSecret(token);
}
