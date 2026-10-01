import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { prepareClerk, signInPage } from '../skills/test-kriyan/scripts/lib/browser.mjs';
import { user, backend, cleanup, ref, prod, save } from './21-common.mjs';
const rows=[];const chrome=await launch({chromeFlags:['--headless','--no-first-run','--disable-dev-shm-usage']});
let owner;
async function audit(base,route,formFactor,signedIn=false) {
 const result=await lighthouse(base+route,{port:chrome.port,output:'html',logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo'],formFactor,disableStorageReset:signedIn,...(formFactor==='desktop'?{screenEmulation:{mobile:false,width:1440,height:900,deviceScaleFactor:1,disabled:false},throttling:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}:{})});
 if(!result)throw new Error('No Lighthouse result.');
 const label=`lighthouse-${base.startsWith('https')?'production':'local'}-${route==='/app'?'day':route==='/docs'?'docs':'landing'}-${formFactor}`;
 await writeFile(`.agents/logs/21/${label}.html`,result.report);
 await save(label,result.lhr);
 const scores=Object.fromEntries(Object.entries(result.lhr.categories).map(([key,value])=>[key,Math.round((value.score??0)*100)]));
 rows.push({base,route,formFactor,signedIn,scores,finalUrl:result.lhr.finalDisplayedUrl,warnings:result.lhr.runWarnings,metrics:{lcp:result.lhr.audits['largest-contentful-paint'].numericValue,tbt:result.lhr.audits['total-blocking-time'].numericValue,cls:result.lhr.audits['cumulative-layout-shift'].numericValue}});
 await save('lighthouse-summary',rows);console.log(label,JSON.stringify(scores));
}
try {
 for(const base of ['http://localhost:3500','https://kriyan.app'])for(const route of ['/','/docs'])for(const factor of ['desktop','mobile'])await audit(base,route,factor);
 owner=await user('lighthouse');await prepareClerk();
 for(const base of ['http://localhost:3500','https://app.kriyan.app']) {
  const b=await backend(owner,base.startsWith('https')?prod:undefined);await b.client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});await b.client.mutation(ref('profiles:seedSample'),{today:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date())});
  const browser=await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);const page=await browser.contexts()[0].newPage();await signInPage(page,owner.email,{base});
  for(const factor of ['desktop','mobile'])await audit(base,'/app',factor,true);
  await page.close();
 }
} finally{await chrome.kill();if(owner)await cleanup(owner);}
