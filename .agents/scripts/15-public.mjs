import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = process.cwd();
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(root, '.agents/playwright-browsers');
const base = 'http://localhost:3500';
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const receipts = [];
const seen = new Set();
const routes = ['/', '/demo', '/docs', '/docs/quick-add', '/docs/mcp', '/docs/api', '/docs/cli', '/docs/android', '/docs/self-hosting', '/privacy', '/terms', '/download', '/robots.txt', '/sitemap.xml', '/opengraph-image', '/app', '/sign-in', '/sign-up', '/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-protected-resource/api/v1', '/.well-known/oauth-authorization-server'];
try {
  for (const route of routes) {
    const response = await context.request.get(base + route, { maxRedirects: 0 });
    const headers = response.headers();
    const receipt = { route, status: response.status(), location: headers.location, security: { csp: !!headers['content-security-policy'], nosniff: headers['x-content-type-options'], frame: headers['x-frame-options'], referrer: headers['referrer-policy'], permissions: headers['permissions-policy'] } };
    if (route.includes('.well-known')) receipt.metadata = await response.json();
    receipts.push(receipt);
    if (route.startsWith('/docs') || route === '/' || route === '/privacy' || route === '/terms') {
      await page.goto(base + route);
      const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')));
      for (const link of links) {
        if (!link || !link.startsWith('/') || link.startsWith('//') || seen.has(link)) continue;
        seen.add(link);
        const result = await context.request.get(base + link, { maxRedirects: 0 });
        receipts.push({ internalLink: link, from: route, status: result.status() });
      }
    }
  }
  const endpoints = [ ['GET','me'],['GET','overview'],['GET','day'],['GET','week'],['GET','tasks'],['POST','tasks/quick-add'],['POST','tasks'],['PATCH','tasks/invalid'],['POST','tasks/invalid/complete'],['POST','tasks/invalid/move'],['GET','goals'],['POST','goals'],['PATCH','goals/invalid'],['GET','spaces'] ];
  for (const [method, path] of endpoints) {
    const response = await context.request.fetch(`${base}/api/v1/${path}`, { method, ...(method !== 'GET' ? { data: {} } : {}) });
    receipts.push({ api: path, method, status: response.status(), body: await response.json(), challenge: response.headers()['www-authenticate'] });
  }
  const response = await context.request.get(base + '/api/v1/auth-config?timezone=Pacific%2FAuckland');
  receipts.push({ authConfig: true, status: response.status(), body: await response.json() });
  for (const version of ['2025-11-25', '2026-07-28']) {
    for (const method of [version === '2025-11-25' ? 'initialize' : 'server/discover','tools/list','tools/call']) {
      const response = await context.request.post(base + '/mcp', { headers: { 'MCP-Protocol-Version': version, 'Mcp-Method': method, 'Mcp-Name': 'get_day', accept: 'application/json, text/event-stream' }, data: { jsonrpc: '2.0', id: 1, method, params: { name: 'get_day', arguments: {} } } });
      receipts.push({ mcp: version, method, status: response.status(), challenge: response.headers()['www-authenticate'] });
    }
  }
} finally {
  await browser.close();
  await mkdir(resolve(root, '.data/15'), { recursive: true });
  await writeFile(resolve(root, '.data/15/public-http.json'), JSON.stringify(receipts, null, 2));
  console.log(JSON.stringify({ checked: receipts.length, brokenInternalLinks: receipts.filter(r => r.internalLink && r.status >= 400), protectedApi: receipts.filter(r => r.api).map(r => ({method:r.method,path:r.api,status:r.status})), authConfig: receipts.find(r => r.authConfig), mcp: receipts.filter(r => r.mcp) }));
}
