import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { prepareClerk, signInPage } from '../skills/test-kriyan/scripts/lib/browser.mjs';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { user, backend, cleanup, ref, save } from './21-common.mjs';
const base=process.env.E2E_BASE_URL??'http://localhost:3500';
const directory='docs/design/gallery';
await mkdir(directory,{recursive:true});
const filter=process.env.QA_GALLERY_FILTER?new RegExp(process.env.QA_GALLERY_FILTER):null;
const manifest=filter?JSON.parse(await readFile(`${directory}/web-manifest.json`,'utf8')):[],failures=filter?JSON.parse(await readFile('.agents/logs/21/gallery-web-failures.json','utf8')).filter(row=>!filter.test(row.label)):[];
const accessibility=filter?JSON.parse(await readFile('.agents/logs/21/gallery-axe.json','utf8')):[];
const axeSource=await readFile('node_modules/axe-core/axe.min.js','utf8');
const browser=await chromium.launch({channel:'chrome'});
let owner;
async function capture(page,group,state) {
 await page.evaluate(()=>document.fonts.ready);
 const width=page.viewportSize().width;
 const name=`web-${group}-${state}-${width}`.toLowerCase().replace(/[^a-z0-9-]/g,'-');
 await page.screenshot({path:`${directory}/${name}.png`,animations:'disabled'});
 if(!['keyboard-focus','accessibility'].includes(group)) {
  await page.evaluate(axeSource);
  const violations=await page.evaluate(async()=> (await window.axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})));
  const prior=accessibility.findIndex(row=>row.name===name);if(prior>=0)accessibility.splice(prior,1);accessibility.push({name,violations});await save('gallery-axe',accessibility);
 }
 const previous=manifest.findIndex(row=>row.image===`${name}.png`);if(previous>=0)manifest.splice(previous,1);
 manifest.push({surface:'Web',group,state,route:new URL(page.url()).pathname+new URL(page.url()).search,base:new URL(page.url()).origin,viewport:`${width} × ${page.viewportSize().height}`,image:`${name}.png`});
 await writeFile(`${directory}/web-manifest.json`,JSON.stringify(manifest,null,2));
}
async function attempt(label,work) {if(filter&&!filter.test(label))return;try {await work();}catch(error){failures.push({label,error:error.message.slice(0,450)});await save('gallery-web-failures',failures);console.log('Capture failed:',label);}}
async function ready(page,route='/app') {await page.goto(base+route);await expect(page.getByRole('navigation',{name:'Main',exact:true})).toBeVisible();await expect(page.getByText(/Loading your|Loading setup/).first()).not.toBeVisible({timeout:30000});if(!route.includes('view=')||route.includes('view=day'))await expect(page.locator('[data-loading="false"]')).toBeVisible();else await expect(page.getByRole('status',{name:/^Loading (list|week|goals)$/})).not.toBeVisible({timeout:30000});if(route.includes('goal='))await expect(page.getByRole('dialog',{name:'Goal details'})).toBeVisible();if(route.includes('task='))await expect(page.getByRole('dialog',{name:'Task details'})).toBeVisible();await page.waitForTimeout(250);}
try {
 await prepareClerk();
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},timezoneId:'America/New_York'});const page=await context.newPage();
  for(const route of ['/','/demo','/download','/docs','/docs/quick-add','/docs/mcp','/docs/api','/docs/cli','/docs/android','/docs/self-hosting','/docs/privacy','/docs/terms','/privacy','/terms','/sign-in','/sign-up','/qa21-not-found'])await attempt(`${route} ${width}`,async()=>{
   await page.goto(base+route); await page.waitForTimeout(route.includes('sign-')?2000:200);await capture(page,'public',route==='/'?'landing':route.slice(1).replaceAll('/','-'));
   if(route==='/') {const height=await page.evaluate(()=>document.documentElement.scrollHeight);for(let y=page.viewportSize().height;y<height;y+=page.viewportSize().height){await page.evaluate(y=>window.scrollTo(0,y),y);await capture(page,'public',`landing-slice-${y}`);}}
  });
  await attempt(`app-host 404 ${width}`,async()=>{await page.goto('https://app.kriyan.app/qa21-not-found');await capture(page,'public','app-host-404');});
  if(width===1440)await attempt('Open Graph image',async()=>{const response=await context.request.get(base+'/opengraph-image');if(!response.ok())throw new Error(`Open Graph image returned ${response.status()}`);await writeFile(`${directory}/web-opengraph-image.png`,await response.body());manifest.push({surface:'Web',group:'public',state:'Open Graph image',route:'/opengraph-image',base,viewport:'Native image size',image:'web-opengraph-image.png'});await writeFile(`${directory}/web-manifest.json`,JSON.stringify(manifest,null,2));});
  await context.close();
 }
 owner=await user('gallery');const b=await backend(owner);const client=b.client;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
 await client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});
 for(const width of [1440,390]) {
  await b.refresh();await client.mutation(ref('profiles:resetAll'),{});
  await expect.poll(()=>client.query(ref('profiles:get'),{}),{timeout:30000}).toBeNull();
  await client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},timezoneId:'America/New_York'});const page=await context.newPage();
  page.setDefaultTimeout(7000);
  await attempt(`wrong password ${width}`,async()=>{await setupClerkTestingToken({page});await page.goto(base+'/sign-in');await page.getByRole('textbox',{name:'Email address',exact:true}).fill(owner.email);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('textbox',{name:'Password',exact:true}).fill('WrongQa21Password!');await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByText(/Password is incorrect|Incorrect password/i).last()).toBeVisible();await capture(page,'public','sign-in-wrong-password');});
  await signInPage(page,owner.email,{base});
  for(let step=1;step<=5;step++) await attempt(`onboarding ${step} ${width}`,async()=>{
   await b.refresh();await client.mutation(ref('profiles:saveOnboarding'),{step});await page.reload();await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.waitForTimeout(300);
   await capture(page,'onboarding',`step-${step}-empty`);
   const fields=page.locator('input:visible:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="date"]):not([type="time"]):not([type="number"])');
   if(await fields.count()) {await fields.first().fill(step===1?'Research':'Gallery example');await capture(page,'onboarding',`step-${step}-entered`);await fields.first().press('Tab');}
  });
  await attempt('replace sample confirmation',async()=>{await page.getByRole('button',{name:'Use sample data',exact:true}).click();await expect(page.getByRole('alertdialog',{name:'Replace with sample data'})).toBeVisible();await capture(page,'onboarding','replace-confirmation');await page.getByRole('button',{name:'Keep mine',exact:true}).click();});
  await b.refresh();await client.mutation(ref('profiles:completeOnboarding'),{});
  for(const view of ['day','list','week','goals'])await attempt(`empty ${view} ${width}`,async()=>{await ready(page,`/app?view=${view}`);await capture(page,view,'empty');if(view==='day'){const prompt=page.locator('[data-first-run="true"]');await expect(prompt).toBeVisible();await prompt.scrollIntoViewIfNeeded();await capture(page,view,'empty-first-task-prompt');}});
  await attempt('one-time hint',async()=>{await b.refresh();await client.mutation(ref('tasks:create'),{title:'Review the first outline',date:today});await ready(page);await expect(page.getByRole('button',{name:'Got it',exact:true})).toBeVisible();await capture(page,'day','one-time-hint');});
  await b.refresh();await client.mutation(ref('profiles:update'),{patch:{onboardingComplete:false}});await client.mutation(ref('profiles:seedSample'),{today,replace:true});
  const seeded=await client.query(ref('tasks:list'),{});if(seeded.length!==25)throw new Error(`Gallery sample fixture expected 25 tasks, got ${seeded.length}`);
  const sampleAreas=await client.query(ref('areas:list'),{});
  await client.mutation(ref('habits:create'),{title:'Review the next day',areaId:sampleAreas[0]._id,weeklyTarget:5});
  for(const view of ['day','list','week','goals'])await attempt(`sample ${view} ${width}`,async()=>{await ready(page,`/app?view=${view}`);await capture(page,view,'sample');});
  await attempt('past Day',async()=>{await ready(page,'/app?date=2026-09-28');await capture(page,'day','past');});
  await b.refresh();const tasks=await client.query(ref('tasks:list'),{});const areas=await client.query(ref('areas:list'),{});
  await client.mutation(ref('goals:create'),{title:'Prepare the presentation',areaId:areas[0]._id,startDate:today,metric:{kind:'tasks'}});
  const milestoneGoal=await client.mutation(ref('goals:create'),{title:'Plan the next project',areaId:areas[0]._id,startDate:today,metric:{kind:'milestones'}});
  await client.mutation(ref('goals:createMilestone'),{goalId:milestoneGoal._id,title:'Write the outline'});
  await client.mutation(ref('goals:createMilestone'),{goalId:milestoneGoal._id,title:'Review with Priya'});
  const goals=await client.query(ref('goals:list'),{});
  const task=tasks.find(t=>t.status==='active');
  if(task) {
   await client.mutation(ref('tasks:update'),{id:task._id,patch:{date:today,time:'10:00',notes:'Bring the outline and ask Priya about the next review.',repeat:{unit:'week',every:1,weekdays:[1,3]},reminders:[{type:'at_start'},{type:'before',minutes:10},{type:'morning_of'}]}});
   await client.mutation(ref('tasks:create'),{title:'Review the outline together',areaId:areas[0]._id,date:today,time:'10:00',durationMinutes:45});
   await attempt('overlapping day',async()=>{await ready(page);await capture(page,'day','overlapping-tasks');});
   for(const property of ['area','project','day','time','length','deadline','goal','repeat','reminders'])await attempt(`task ${property} ${width}`,async()=>{
    await ready(page,`/app?task=${task._id}`);const dialog=page.getByRole('dialog',{name:'Task details'});await expect(dialog).toBeVisible();await dialog.locator(`[data-property="${property}"]`).click();await expect(dialog.locator(`[data-property="${property}"]`)).toHaveAttribute('aria-expanded','true');await capture(page,'task-panel',property);
   });
   await attempt('task notes repeat reminders',async()=>{await ready(page,`/app?task=${task._id}`);await capture(page,'task-panel','notes-repeat-reminders');});
   await b.refresh();await client.mutation(ref('tasks:complete'),{id:task._id});
   await attempt('completed task',async()=>{await ready(page,`/app?task=${task._id}`);await capture(page,'task-panel','completed');});
  }
  for(const goal of goals)await attempt(`goal measure ${goal.metric.kind}`,async()=>{await ready(page,`/app?view=goals&goal=${goal._id}`);const key=`${goal.metric.kind}-${goal.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;await capture(page,'goal-panel',`measure-${key}`);for(const property of await page.getByRole('dialog').locator('[data-property]').all()){const name=await property.getAttribute('data-property');await property.click();await capture(page,'goal-panel',`${key}-${name}`);}});
  await attempt('late goal',async()=>{await b.refresh();await client.mutation(ref('goals:create'),{title:'Finish the draft',areaId:areas[0]._id,startDate:'2026-09-01',targetDate:'2026-09-29',metric:{kind:'number',unit:'pages',current:2,target:10}});await ready(page,'/app?view=goals');await capture(page,'goals','late');});
  await attempt('add goal dialog',async()=>{await ready(page,'/app?view=goals');await page.getByRole('button',{name:'Add goal',exact:true}).first().click();await capture(page,'goal-dialog','empty');const dialog=page.getByRole('dialog',{name:'Add goal'});await dialog.getByRole('button',{name:'Add goal',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();await capture(page,'goal-dialog','validation-error');await dialog.locator('input').first().fill('Read the next chapter');await capture(page,'goal-dialog','entered');});
  for(const state of ['empty','typed','backend-error'])await attempt(`quick add ${state}`,async()=>{await ready(page);await page.getByRole('button',{name:'Add task',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Add a task'});if(state!=='empty')await dialog.getByRole('textbox').fill(state==='typed'?'Review slides tomorrow 2pm #School 45m':'a'.repeat(240));if(state==='backend-error'){await dialog.getByRole('button',{name:'Add task',exact:true}).click();await expect(page.getByRole('alert').first()).toContainText('A task title must be 180 characters or fewer');}await capture(page,'quick-add',state);if(state==='backend-error')await capture(page,'toast','error');});
  for(const [name,query]of [['empty',''],['results','Read'],['no-results','zzzzunlikely']])await attempt(`palette ${name}`,async()=>{await ready(page);await page.keyboard.press('Control+k');const dialog=page.getByRole('dialog',{name:'Search and commands'});await expect(dialog).toBeVisible();if(query)await dialog.getByRole('combobox',{name:'Search'}).fill(query);await page.waitForTimeout(250);await capture(page,'command-palette',name);});
  await attempt('shortcuts',async()=>{await ready(page);await page.keyboard.press('?');await expect(page.getByRole('dialog')).toBeVisible();await capture(page,'shortcuts','open');});
  await attempt(`task toasts ${width}`,async()=>{
   await b.refresh();let receipt=await client.mutation(ref('tasks:create'),{title:'Review the gallery notes',date:today});
   await ready(page,'/app?view=list');await page.getByRole('checkbox',{name:'Mark as done: Review the gallery notes',exact:true}).click();await capture(page,'toast','completed');
   await page.getByRole('checkbox',{name:'Mark as not done: Review the gallery notes',exact:true}).click();await capture(page,'toast','reopened');
   await ready(page,`/app?view=list&task=${receipt._id}`);let dialog=page.getByRole('dialog',{name:'Task details'});
   await dialog.locator('[data-property="length"]').click();await dialog.getByRole('group',{name:'Length editor'}).getByRole('button',{name:'45m',exact:true}).click();await capture(page,'toast','length-set');
   await dialog.locator('[data-property="day"]').click();await dialog.getByRole('group',{name:'Day editor'}).getByRole('button',{name:'Tomorrow',exact:true}).click();await capture(page,'toast','moved');
   await dialog.getByRole('button',{name:'Delete task',exact:true}).click();await capture(page,'toast','deleted');
   await ready(page);await page.getByRole('button',{name:'Add task',exact:true}).first().click();dialog=page.getByRole('dialog',{name:'Add a task'});await dialog.getByRole('textbox').fill('Review the captured screens today');await dialog.getByRole('button',{name:'Add task',exact:true}).click();await expect(dialog).not.toBeVisible();await capture(page,'toast','added');
  });
  for(const section of ['areas','projects','classes','habits','planning','account','reset'])await attempt(`settings ${section}`,async()=>{
   await page.goto(base+`/app/settings/${section}`);await expect(page.locator('main').getByRole('heading',{level:2}).first()).toBeVisible();await expect(page.getByRole('status',{name:'Loading settings'})).not.toBeVisible();await page.waitForTimeout(500);await capture(page,'settings',section);
   const rows=page.locator('[data-property]');for(let i=0;i<await rows.count();i++){await rows.nth(i).click();await capture(page,'settings',`${section}-${await rows.nth(i).getAttribute('data-property')}`);}
   if(['areas','projects','classes','habits'].includes(section)){const expandable=page.locator('main button[aria-expanded="false"]').first();await expect(expandable).toBeVisible();await expandable.click();await capture(page,'settings',`${section}-row-open`);}
   if(section==='reset'){await page.getByRole('textbox').fill('RESET');await capture(page,'settings','reset-confirmation');}
   if(section==='areas'){const remove=page.getByRole('button',{name:'Delete area',exact:true}).first();await remove.click();await expect(page.locator('main').getByRole('alert')).toContainText('Area is in use');await capture(page,'settings','area-delete-refusal');}
   if(section==='account'){if(!await page.getByRole('button',{name:'Security',exact:true}).count())await page.getByRole('button',{name:'Account',exact:true}).click();await page.getByRole('button',{name:'Security',exact:true}).click();await page.getByRole('button',{name:'Delete account',exact:true}).click();await page.getByPlaceholder('Delete account',{exact:true}).fill('Delete account');await capture(page,'settings','delete-account-confirmation');}
  });
  await attempt('offline',async()=>{await ready(page);await context.setOffline(true);await page.waitForTimeout(1200);await capture(page,'day','offline');await context.setOffline(false);});
  await attempt('keyboard focus',async()=>{await ready(page);const seen=new Set();for(let i=0;i<140;i++){await page.keyboard.press('Tab');const kind=await page.evaluate(()=>{const node=document.activeElement;if(!node)return null;if(node.matches('[aria-label="Add task"]')||node.className.toString().includes('trayAdd'))return 'add-button';if(node.closest('[data-timeline]'))return 'timeline-block';if(node.matches('[data-drag="place"]'))return 'tray-card';if(node.closest('[aria-label="Filter by area"]'))return 'area-chip';if(node.closest('nav'))return 'rail-button';return null;});if(kind&&!seen.has(kind)){seen.add(kind);await capture(page,'keyboard-focus',kind);}if(seen.size===5)break;}if(seen.size<5)throw new Error(`Focus captures missing: ${['rail-button','area-chip','tray-card','timeline-block','add-button'].filter(name=>!seen.has(name)).join(', ')}`);});
  await attempt('200 percent zoom',async()=>{await ready(page);await page.evaluate(()=>{document.documentElement.style.zoom='2';});await capture(page,'accessibility','zoom-200-percent');await page.evaluate(()=>{document.documentElement.style.zoom='';});});
  await attempt('reduced motion',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await ready(page);await capture(page,'accessibility','reduced-motion');});
  await context.close();
  const blocked=await browser.newContext({viewport:{width,height:width===1440?900:844}});const blockedPage=await blocked.newPage();await signInPage(blockedPage,owner.email,{base});
  await attempt('loading and connection error',async()=>{await blockedPage.routeWebSocket(/convex\.cloud/,route=>route.close());await blockedPage.goto(base+'/app');await capture(blockedPage,'day','loading-blocked-connection');await blockedPage.waitForTimeout(18000);await capture(blockedPage,'day','connection-error');});
  await blocked.close();
 }
} finally {await browser.close();if(owner)await cleanup(owner);await save('gallery-web-failures',failures);}
console.log(JSON.stringify({captures:manifest.length,failures:failures.length}));

process.exitCode=failures.length?1:0;
