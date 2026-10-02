import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { oauthFlow } from '../skills/test-kriyan/scripts/oauth.mjs';
import { prepareClerk } from '../skills/test-kriyan/scripts/lib/browser.mjs';
import { user, backend, ref, prod, save } from './21-common.mjs';
const base='https://app.kriyan.app', receipts=[];
async function record(check, work) {
  try { receipts.push({check,status:'pass',detail:await work()}); }
  catch(error) { receipts.push({check,status:'fail',detail:error.message.slice(0,700)}); }
  await save('22-production',receipts); console.log(check,receipts.at(-1).status);
}
const owner=await user('22-production'), other=await user('22-foreign',false);
const own=await backend(owner,prod), foreign=await backend(other,prod);
for(const b of [own,foreign]) {
  await b.client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});
  await b.client.mutation(ref('profiles:completeOnboarding'),{});
}
const task=await foreign.client.mutation(ref('tasks:create'),{title:'QA22 foreign task'});
const grant=await oauthFlow(owner.email,{base,password:owner.password,resource:'api',out:'22-api.json'});
async function request(path,method='GET',body) {
  const response=await fetch(base+'/api/v1'+path,{method,headers:{Authorization:`Bearer ${grant.accessToken}`,'content-type':'application/json'},...(body?{body:JSON.stringify({timezone:'America/New_York',...body})}:{})});
  return {status:response.status,retryAfter:response.headers.get('retry-after'),body:await response.json()};
}
await record('Production API validation and isolation',async()=>{
  const noDate=await request('/tasks','POST',{title:'QA22 invalid time',time:'14:00',date:null});assert.equal(noDate.status,400);
  const cross=await request('/tasks/'+task._id,'PATCH',{title:'Forbidden'});assert.equal(cross.status,404);
  const long=await request('/tasks','POST',{title:'x'.repeat(181)});assert.equal(long.status,400);
  await foreign.refresh();assert.equal((await foreign.client.query(ref('tasks:get'),{id:task._id})).title,task.title);
  await own.refresh();assert.equal((await own.client.query(ref('tasks:list'),{})).length,0);
  return {timeWithoutDate:noDate.status,foreignId:cross.status,title181:long.status,foreignPreserved:true,noInvalidRows:true};
});
await record('Production paced API read limit and Retry-After',async()=>{
  const position=Date.now()%60000;
  if(position>5000)await new Promise(resolve=>setTimeout(resolve,62000-position));
  const responses=[];for(let i=0;i<65;i++)responses.push(await request('/tasks?timezone=America%2FNew_York'));
  const counts=Object.fromEntries([...new Set(responses.map(r=>r.status))].map(status=>[status,responses.filter(r=>r.status===status).length]));
  assert(responses.some(r=>r.status===429),JSON.stringify(counts));
  assert(responses.some(r=>r.status===200));assert(responses.filter(r=>r.status===429).every(r=>r.retryAfter==='60'));
  return {requests:65,statusCounts:counts,retryAfter:'60',sequential:true};
});
await prepareClerk();const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/New_York'});
  const passwordless=await user('22-email-code',false), b=await backend(passwordless,prod);
  await b.client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});
  await b.client.mutation(ref('profiles:completeOnboarding'),{});
  await record('Production branding and passwordless email-code sign-in',async()=>{
    await setupClerkTestingToken({page});await page.goto(base+'/sign-in');
    await expect(page.getByRole('heading',{name:'Sign in to Kriyan',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Use email code',exact:true}).click();
    const block=page.getByRole('region',{name:'Sign in with an email code'});
    await block.getByLabel('Email',{exact:true}).fill(passwordless.email);
    await block.getByRole('button',{name:'Send code',exact:true}).click();
    await block.getByLabel('Verification code',{exact:true}).fill('424242');
    await block.getByRole('button',{name:'Verify code',exact:true}).click();
    await expect(page).toHaveURL(/\/app/,{timeout:60000});await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
    return {branding:'Sign in to Kriyan',passwordless:true,method:'Custom email-code block'};
  });
  await record('Production phone Week empty-day geometry',async()=>{
    await page.goto(base+'/app?view=week');
    const days=page.locator('section').filter({has:page.getByRole('button',{name:/^Open (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/})});
    await expect(days).toHaveCount(7);const heights=[];
    for(const day of await days.all()) {const height=(await day.boundingBox()).height;assert.equal(height,56);heights.push(height);}
    await page.screenshot({path:'.agents/logs/22/production-phone-week.png'});
    return {viewport:390,heights};
  });
  await record('Production phone Account touch targets',async()=>{
    await page.goto(base+'/app/settings');
    await page.getByRole('navigation',{name:'Settings sections'}).getByRole('link',{name:'Account',exact:true}).click();
    await expect(page.locator('.cl-badge').filter({hasText:'Primary'}).first()).toBeVisible();
    const controls=await page.locator('.cl-userProfile-root').evaluate(root=>[...root.querySelectorAll('button,a,input')].filter(item=>item.getBoundingClientRect().width>0&&getComputedStyle(item).visibility!=='hidden').map(item=>{const r=item.getBoundingClientRect();return {tag:item.tagName,label:item.getAttribute('aria-label')??item.textContent?.trim().slice(0,80),width:r.width,height:r.height};}));
    assert(controls.length>0);for(const control of controls){assert(control.width>=44,JSON.stringify(control));assert(control.height>=44,JSON.stringify(control));}
    await page.screenshot({path:'.agents/logs/22/production-phone-account.png'});return {viewport:390,controls};
  });
  await record('Production accessibility on Day and documentation tables',async()=>{
    const results=[];
    for(const url of [base+'/app?view=day','https://kriyan.app/docs/quick-add','https://kriyan.app/docs/self-hosting']) {
      await page.goto(url);if(url.includes('/app'))await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();else await expect(page.locator('h1')).toBeVisible();
      const result=await new AxeBuilder({page}).analyze();results.push({url,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});
    }
    await writeFile('.agents/logs/22/production-axe.json',JSON.stringify(results,null,2));
    assert(results.every(r=>r.violations.length===0),JSON.stringify(results));return results;
  });
  await record('Production linked-area refusal copy and preservation',async()=>{
    await b.refresh();const area=(await b.client.query(ref('areas:list'),{}))[0];
    const linked=await b.client.mutation(ref('tasks:create'),{title:'QA22 linked-area refusal',areaId:area._id});
    await page.goto(base+'/app/settings');
    await page.getByRole('navigation',{name:'Settings sections'}).getByRole('link',{name:'Areas',exact:true}).click();
    await page.getByRole('button',{name:'Edit '+area.name,exact:true}).click();
    await page.getByRole('button',{name:'Delete area',exact:true}).click();
    await expect(page.getByText('Area is in use. Move or remove its records first.',{exact:true})).toBeVisible();
    await b.refresh();assert((await b.client.query(ref('areas:list'),{})).some(row=>row._id===area._id));
    assert.equal((await b.client.query(ref('tasks:get'),{id:linked._id})).title,linked.title);
    await page.screenshot({path:'.agents/logs/22/production-area-refusal.png'});
    return {usefulRefusal:true,areaPreserved:true,taskPreserved:true};
  });
} finally {await browser.close();}
process.exitCode=receipts.some(r=>r.status==='fail')?1:0;
