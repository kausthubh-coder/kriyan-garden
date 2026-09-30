import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1520,height:1050}});
await page.goto(new URL('../docs/design/reference/onboarding-settings.html', import.meta.url).href);
await page.evaluate(() => document.fonts.ready);
await mkdir('.agents/screenshots/12', {recursive:true});
for (const [index, board] of (await page.locator('.board').all()).entries()) {
  await board.screenshot({path:`.agents/screenshots/12/reference-${index + 1}.png`});
}
await page.goto(new URL('../docs/design/reference/android.html', import.meta.url).href);
await page.evaluate(() => document.fonts.ready);
for (const [name, selector] of [['settings-index', '.phone:has(.ph h1:text-is("Settings"))'], ['areas', '.phone:has(.ph h1:text-is("Areas"))'], ['onboarding', '.phone:has(.ob h1)']]) {
  await page.locator(selector).screenshot({path:`.agents/screenshots/12/reference-android-${name}.png`});
}
console.log('Captured six onboarding/settings reference boards and three Android boards.');
await page.goto(new URL('../docs/design/reference/web.html', import.meta.url).href);
await page.evaluate(() => document.fonts.ready);
await page.locator('.board:has(.goals)').screenshot({path:'.agents/screenshots/12/reference-goals.png'});
await browser.close();
