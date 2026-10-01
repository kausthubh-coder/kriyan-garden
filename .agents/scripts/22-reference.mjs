import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const name of ['android', 'states']) {
    await page.goto(pathToFileURL(resolve(`docs/design/reference/${name}.html`)).href);
    await page.screenshot({ path: `.agents/logs/22/reference-${name}.png` });
    console.log(`Opened ${name} reference: ${await page.title()}`);
  }
} finally { await browser.close(); }
