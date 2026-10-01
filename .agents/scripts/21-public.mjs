import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const bases = process.argv.slice(2).length ? process.argv.slice(2) : ['http://localhost:3500','https://kriyan.app'];
const rows = [];
const browser = await chromium.launch({channel:'chrome'});
try {
 const context = await browser.newContext(); const page = await context.newPage();
 for(const base of bases) {
  const routes=['/','/demo','/download','/docs','/docs/quick-add','/docs/mcp','/docs/api','/docs/cli','/docs/android','/docs/self-hosting','/privacy','/terms','/robots.txt','/sitemap.xml','/opengraph-image','/qa21-not-found'];
  const seen=new Set();
  for(const route of routes) {
   try {
    const response=await context.request.get(base+route,{maxRedirects:0});
    const headers=response.headers();
    const row={base,route,status:response.status(),security:{csp:!!headers['content-security-policy'],nosniff:headers['x-content-type-options'],frame:headers['x-frame-options'],referrer:headers['referrer-policy'],permissions:headers['permissions-policy']}};
    rows.push(row);
    if(!route.endsWith('.txt')&&!route.endsWith('.xml')&&!route.includes('opengraph')) {
     const errors=[]; const listener=error=>errors.push(error.message); page.on('pageerror',listener);
     await page.goto(base+route); await page.evaluate(()=>document.fonts.ready);
     row.title=await page.title(); row.description=await page.locator('meta[name="description"]').getAttribute('content').catch(()=>null);
     row.openGraph=await page.locator('meta[property="og:image"]').getAttribute('content').catch(()=>null);
     const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(a=>a.href));
     for(const link of links) {
      const url=new URL(link); if(!['http:','https:'].includes(url.protocol)||seen.has(link)) continue; seen.add(link);
      if(url.origin===base&&url.pathname===new URL(page.url()).pathname&&url.hash){rows.push({base,from:route,link,anchorResolved:await page.evaluate(id=>id==='top'||!!document.getElementById(id),decodeURIComponent(url.hash.slice(1)))});continue;}
      try {const resolved=await context.request.get(link,{headers:{accept:'text/html'},maxRedirects:5,timeout:20000});const row={base,from:route,link,status:resolved.status()};if(url.origin===base&&url.hash)row.anchorResolved=(await resolved.text()).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`);rows.push(row);}
      catch(error){rows.push({base,from:route,link,error:error.message.slice(0,180)});}
     }
     row.pageErrors=errors; page.off('pageerror',listener);
    }
   } catch(error) {rows.push({base,route,error:error.message.slice(0,220)});}
   await writeFile('.agents/logs/21/public.json',JSON.stringify(rows,null,2));
  }
 }
} finally {await browser.close();}
console.log(JSON.stringify({requests:rows.length,broken:rows.filter(r=>r.link&&r.status>=400),errors:rows.filter(r=>r.error)}));
