import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {prepareClerk,signInPage} from '../skills/test-kriyan/scripts/lib/browser.mjs';
import {user,backend,cleanup,ref,save} from './21-common.mjs';
const base=process.env.E2E_BASE_URL??'http://localhost:3500',folder=resolve('.agents/test-kriyan/zoom-extension');await mkdir(folder,{recursive:true});
await writeFile(folder+'/manifest.json',JSON.stringify({manifest_version:3,name:'Kriyan disposable zoom QA',version:'1.0.0',permissions:['tabs'],background:{service_worker:'worker.js'}}));await writeFile(folder+'/worker.js','chrome.runtime.onInstalled.addListener(() => {});');
const owner=await user('zoom'),b=await backend(owner),manifest=JSON.parse(await readFile('docs/design/gallery/web-manifest.json','utf8')).filter(row=>!row.image?.startsWith('web-accessibility-browser-zoom-')),results=[];
let context;
try {
 await b.client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});await b.client.mutation(ref('profiles:seedSample'),{today:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date())});await prepareClerk();
 context=await chromium.launchPersistentContext(resolve('.agents/test-kriyan/zoom-profile'),{channel:'chromium',headless:true,viewport:null,timezoneId:'America/New_York',args:[`--disable-extensions-except=${folder}`,`--load-extension=${folder}`,'--window-size=1440,987']});
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');const page=await context.newPage();await signInPage(page,owner.email,{base});
 const cdp=await context.newCDPSession(page),win=await cdp.send('Browser.getWindowForTarget');
 for(const [width,height]of [[1440,900],[390,844]]){
  await worker.evaluate(async()=>{for(const tab of await chrome.tabs.query({}))if(tab.url?.startsWith('http://localhost:3500/'))await chrome.tabs.setZoom(tab.id,1);});
  await cdp.send('Browser.setWindowBounds',{windowId:win.windowId,bounds:{width,height:height+87}});let size=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));const bounds=(await cdp.send('Browser.getWindowBounds',{windowId:win.windowId})).bounds;await cdp.send('Browser.setWindowBounds',{windowId:win.windowId,bounds:{width:bounds.width+width-size.width,height:bounds.height+height-size.height}});
  await page.goto(base+'/app');await expect(page.locator('[data-loading="false"]')).toBeVisible();
  const zoom=await worker.evaluate(async base=>{const tabs=await chrome.tabs.query({url:base+'/*'});const tab=tabs.find(t=>t.url.includes('/app'));if(!tab?.id)throw new Error('No planner tab found.');await chrome.tabs.setZoom(tab.id,2);return chrome.tabs.getZoom(tab.id);},base);assert.equal(zoom,2);await page.waitForTimeout(500);
  size=await page.evaluate(()=>({width:innerWidth,height:innerHeight,devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,zoom:getComputedStyle(document.documentElement).zoom}));assert.equal(size.zoom,'1');
  const name=`web-accessibility-browser-zoom-200-percent-${width}.png`;
  // Capture the physical window through CDP. Playwright's inferred viewport
  // can clip a null-viewport page after the browser's actual zoom changes.
  const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const pixels=Buffer.from(shot.data,'base64');await writeFile('docs/design/gallery/'+name,pixels);const captured={width:pixels.readUInt32BE(16),height:pixels.readUInt32BE(20)};assert.equal(captured.height,height);assert.equal(captured.width,width===1440?1440:504);
  const add=page.getByRole('button',{name:'Add task',exact:true}).first();await add.scrollIntoViewIfNeeded();await add.click();await expect(page.getByRole('dialog',{name:'Add a task'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Add a task'})).not.toBeVisible();
  manifest.push({surface:'Web',group:'accessibility',state:'Browser zoom 200 percent',route:'/app',base,viewport:`${width} x ${height} requested; ${captured.width} x ${captured.height} captured; actual Chrome zoom 2`,image:name});results.push({requestedViewport:{width,height},captured,zoom,layout:size,quickAddOperable:true});
 }
 await save('browser-zoom',results);
 // Remove the earlier CSS-only zoom artifacts from the review index.
 await writeFile('docs/design/gallery/web-manifest.json',JSON.stringify(manifest.filter(row=>!row.image?.includes('web-accessibility-zoom-200-percent-')),null,2));
}finally{await context?.close();await cleanup(owner);}
