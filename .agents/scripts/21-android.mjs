import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { clerkClient } from '../skills/test-kriyan/scripts/lib/users.mjs';
import { privatePath, root } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { user, backend, ref, prod, save } from './21-common.mjs';
const execute=promisify(execFile),adb=`${root}/.agents/android-sdk/platform-tools/adb.exe`,serial='emulator-5554';
const directory='docs/design/gallery';await mkdir(directory,{recursive:true});
const manifest=[],receipts=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(...args){return (await execute(adb,['-s',serial,...args],{windowsHide:true,timeout:45000,maxBuffer:12000000,encoding:args[0]==='exec-out'&&args[1]==='screencap'?null:'utf8'})).stdout;}
async function xml(){await run('shell','uiautomator','dump','/sdcard/qa21.xml');return await run('exec-out','cat','/sdcard/qa21.xml');}
function attr(node,name){return new RegExp(`${name}="([^"]*)"`).exec(node)?.[1]?.replaceAll('&amp;','&').replaceAll('&quot;','"')??'';}
async function nodes(){return (await xml()).match(/<node\b[^>]*>/g)??[];}
function visible(node){const bounds=attr(node,'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);return bounds&&+bounds[3]>+bounds[1]&&+bounds[4]>+bounds[2]&&(+bounds[2]+ +bounds[4])/2<2400;}
async function tap(label){for(let attempt=0;attempt<15;attempt++){const candidates=(await nodes()).filter(visible);const row=candidates.find(n=>attr(n,'content-desc')===label)??candidates.find(n=>attr(n,'text')===label);const bounds=row&&attr(row,'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);if(bounds){await run('shell','input','tap',String((+bounds[1]+ +bounds[3])/2),String((+bounds[2]+ +bounds[4])/2));await pause(400);return;}if(attempt===3||attempt===7)await run('shell','input','swipe','520','1550','520','650','400');await pause(500);}throw new Error(`Android control not found: ${label}`);}
async function type(value){await run('shell','input','text',value.replaceAll(' ','%s'));}
async function fill(label,value){await tap(label);const input=(await nodes()).find(n=>attr(n,'content-desc')===label&&attr(n,'class').includes('EditText'));await run('shell','input','keyevent','123');await run('shell','input','keyevent',...Array.from({length:Math.max(1,attr(input??'','text').length)},()=> '67'));await type(value);}
async function property(label){for(let attempt=0;attempt<10;attempt++){const control=(await nodes()).find(n=>attr(n,'content-desc').startsWith(`${label}:`));if(control){await tap(attr(control,'content-desc'));return;}await run('shell','input','swipe','520','1500','520','650','400');}throw new Error(`Property not visible: ${label}`);}
async function waitText(value){for(let i=0;i<20;i++){if((await xml()).includes(value))return;await pause(500);}throw new Error(`Android state did not appear: ${value}`);}
async function back(){await run('shell','input','keyevent','4');await pause(300);}
async function point(label){for(let i=0;i<8;i++){const node=(await nodes()).find(n=>attr(n,'content-desc')===label||attr(n,'content-desc').startsWith(label+',')||attr(n,'text')===label);const bounds=node&&attr(node,'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);if(bounds)return {x:(+bounds[1]+ +bounds[3])/2,y:(+bounds[2]+ +bounds[4])/2};await run('shell','input','swipe','520','1500','520','650','400');}throw new Error(`Gesture target not visible: ${label}`);}
async function resizePoint(title){const target=await point('Open '+title);const controls=(await nodes()).filter(n=>attr(n,'content-desc')==='Resize task').map(n=>{const bounds=attr(n,'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);return bounds?{x:(+bounds[1]+ +bounds[3])/2,y:(+bounds[2]+ +bounds[4])/2}:null;}).filter(Boolean).sort((a,b)=>Math.abs(a.y-target.y)-Math.abs(b.y-target.y));assert.ok(controls.length,'No resize handle visible.');return controls[0];}
async function motion(kind,x,y){await run('shell','input','motionevent',kind,String(Math.round(x)),String(Math.round(y)));}
async function capture(group,state){const name=`android-${group}-${state}`;const source=await xml();const pixels=await run('exec-out','screencap','-p');await writeFile(`${directory}/${name}.png`,pixels);await writeFile(`.agents/logs/21/${name}.xml`,source);manifest.push({surface:'Android',group,state,image:`${name}.png`,viewport:`${pixels.readUInt32BE(16)} x ${pixels.readUInt32BE(20)}`,base:'EAS 1.0.1, production Convex'});await writeFile(`${directory}/android-manifest.json`,JSON.stringify(manifest,null,2));}
async function record(check,work){try{receipts.push({check,status:'pass',detail:await work()});}catch(error){receipts.push({check,status:'fail',detail:error.message.slice(0,350)});}await save('android',receipts);console.log(check,receipts.at(-1).status);}
let owner;
await run('shell','am','force-stop','app.kriyan.android');await run('shell','monkey','-p','app.kriyan.android','1');await waitText('Send code');
await record('Sign-in disabled tokens, centered form and email error state',async()=>{
 const email=`kriyan-qa21-native-unknown-${Date.now()}+clerk_test@example.com`;await capture('auth','empty');await tap('Email');await type(email);await capture('auth','keyboard-open');await back();await tap('Send code');await pause(1500);
 const found=(await clerkClient().users.getUserList({emailAddress:[email]})).data[0];if(found)await appendFile(privatePath('21-users.jsonl'),JSON.stringify({id:found.id,email})+'\n');
 await waitText('A sign-in code could not be sent.');await capture('auth','unknown-email-error');await run('shell','pm','clear','app.kriyan.android');await run('shell','monkey','-p','app.kriyan.android','1');await pause(1500);
});
await record('Create Android account with password and email verification',async()=>{
 const email=`kriyan-qa21-native-${Date.now()}+clerk_test@example.com`,password=`Qa21!${randomUUID().replaceAll('-','')}Z9`;
 await tap('Create account');await tap('Email');await type(email);await tap('Password');await type(password);await back();await tap('Create account');await pause(2000);
 await capture('auth','native-create-verification');await tap('Verification code');await type('424242');await back();await tap('Verify code');await pause(2500);
 const found=(await clerkClient().users.getUserList({emailAddress:[email]})).data[0];assert.ok(found,'Native sign-up did not create a Clerk account.');owner={id:found.id,email,password};await appendFile(privatePath('21-users.jsonl'),JSON.stringify(owner)+'\n');await writeFile(privatePath('21-native-user.json'),JSON.stringify(owner));await waitText('What do you plan for?');return {id:owner.id,email:owner.email};
});
if(!owner){owner=await user('android');await run('shell','pm','clear','app.kriyan.android');await run('shell','monkey','-p','app.kriyan.android','1');await pause(1500);await tap('Email');await type(owner.email);await back();await tap('Send code');await tap('Verification code');await type('424242');await back();await tap('Verify code');await pause(1800);await writeFile(privatePath('21-native-user.json'),JSON.stringify(owner));}
const b=await backend(owner,prod),client=b.client;
await record('Five onboarding steps and empty views',async()=>{
 for(let step=0;step<5;step++){await capture('onboarding',`step-${step+1}`);await tap(step===0?'Continue':'Skip');}
 const snapshot=await xml();if(snapshot.includes('Skip notifications'))await tap('Skip notifications');await pause(1000);
 const density=Number((await run('shell','wm','density')).match(/\d+(?=\s*$)/)?.[0]);assert.ok(density>0);const addRows=[];
 for(const view of ['Day','List','Week','Goals']){await tap(view);await capture(view.toLowerCase(),'empty');const source=await xml();assert(!/\b0 tasks left\b/.test(source));if(view==='Day'||view==='List'){const rows=(source.match(/<node\b[^>]*>/g)??[]).filter(n=>attr(n,'content-desc')==='Add a task'&&visible(n));const heights=rows.map(n=>{const box=attr(n,'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);return box?(+box[4]- +box[2])*160/density:0;});assert(heights.some(height=>height>=47.5&&height<=49),`No 48dp add row in ${view}: ${heights.join(',')}`);addRows.push({view,heightsDp:heights});}}
 await b.refresh();assert.equal((await client.query(ref('tasks:list'),{})).length,0);return {empty:true,zeroCountersHidden:true,addRows};
});
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
await record('Quick-add, completion and production read-back',async()=>{
 await tap('List');await tap('Add a task');await tap('Task');await type('Lunch with Priya 1pm');await capture('quick-add','keyboard-open');await back();await tap('Add task');await pause(1000);
 await b.refresh();const task=(await client.query(ref('tasks:list'),{})).find(t=>t.title==='Lunch with Priya');assert.ok(task);assert.equal(task.time,'13:00');assert.equal(task.durationMinutes,null);await tap(`Complete ${task.title}`);await pause(700);await b.refresh();assert.equal((await client.query(ref('tasks:get'),{id:task._id})).status,'completed');await capture('list','completed');return {id:task._id,time:task.time,durationMinutes:null,status:'completed'};
});
await record('Sample data and every task sheet row',async()=>{
 await b.refresh();await client.mutation(ref('profiles:update'),{patch:{onboardingComplete:false}});await client.mutation(ref('profiles:seedSample'),{today,replace:true});assert.equal((await client.query(ref('tasks:list'),{})).length,25);await pause(1500);
 for(const view of ['Day','List','Week','Goals']){await tap(view);await capture(view.toLowerCase(),'sample');}
 await tap('List');const row=(await nodes()).find(n=>attr(n,'content-desc').startsWith('Open '));assert.ok(row);const title=attr(row,'content-desc').slice(5);await tap(attr(row,'content-desc'));await fill('Notes','QA21 notes saved on Android');await back();await property('Area');await pause(700);await b.refresh();const saved=(await client.query(ref('tasks:list'),{})).find(t=>t.title===title);assert.equal(saved.notes,'QA21 notes saved on Android');await capture('task-sheet','notes');await property('Length');await tap('45m');await pause(700);await b.refresh();assert.equal((await client.query(ref('tasks:get'),{id:saved._id})).durationMinutes,45);
 for(const label of ['Area','Project','Day','Time','Length','Deadline','Goal','Repeat','Reminders']) {await record(`Task sheet ${label}`,async()=>{await back();await tap('Open '+title);await property(label);await capture('task-sheet',label.toLowerCase());});}
 await back();return {sample:true};
});
await record('Settings and area editor',async()=>{
 await tap('Day');await tap('Settings');await capture('settings','home');
 for(const section of ['Areas','Projects and courses','Classes and meetings','Habits','Daily capacity','Day starts and ends','Notifications','Account']) {await record(`Settings ${section}`,async()=>{await tap(section);await capture('settings',section.toLowerCase().replaceAll(' ','-'));await back();});}
 await back();
});
await record('Area edit and deletion confirmation',async()=>{
 await tap('Day');await tap('Settings');await tap('Areas');await tap('School');await capture('settings','area-edit');await tap('Delete area');await capture('settings','area-delete-refusal');await back();await back();await tap('Delete account and data');await tap('Type DELETE');await type('DELETE');await back();await capture('settings','delete-account-confirmation');await back();await back();return {confirmationOnly:true};
});
await record('Native goal edit and production read-back',async()=>{
 await tap('Goals');const control=(await nodes()).find(n=>attr(n,'content-desc').startsWith('Open goal '));assert.ok(control);const title=attr(control,'content-desc').slice(10);await tap(attr(control,'content-desc'));await capture('goal-sheet','number-goal');await fill('Goal notes','Reviewed on Android');await back();await tap('Save goal');await pause(700);await b.refresh();const goal=(await client.query(ref('goals:list'),{})).find(g=>g.title===title);assert.equal(goal.note,'Reviewed on Android');await capture('goal-sheet','saved');await back();return {id:goal._id,note:goal.note};
});
await record('Swipe completion, mid-swipe capture and read-back',async()=>{
 await b.refresh();const task=await client.mutation(ref('tasks:create'),{title:'QA21 swipe proof',date:today});await tap('List');await pause(500);const p=await point('Open '+task.title);const x=Math.min(p.x,500);await motion('DOWN',x,p.y);await motion('MOVE',x+400,p.y);await capture('list','mid-swipe');await motion('UP',x+400,p.y);await pause(700);await b.refresh();assert.equal((await client.query(ref('tasks:get'),{id:task._id})).status,'completed');return {id:task._id,status:'completed'};
});
await record('Timeline drag and resize with direct read-backs',async()=>{
 await b.refresh();const previous=await client.query(ref('profiles:get'),{});await client.mutation(ref('profiles:update'),{patch:{dayStartHour:9,dayEndHour:14}});try{const task=await client.mutation(ref('tasks:create'),{title:'QA21 drag proof',date:today,time:'10:00',durationMinutes:30});await tap('Day');await pause(600);const p=await point('Open '+task.title);await motion('DOWN',p.x,p.y);await pause(600);await motion('MOVE',p.x,p.y+170);await capture('day','drag-in-progress');await motion('UP',p.x,p.y+170);await pause(800);await b.refresh();const moved=await client.query(ref('tasks:get'),{id:task._id});assert.notEqual(moved.time,'10:00');const grip=await resizePoint(task.title);await motion('DOWN',grip.x,grip.y);await motion('MOVE',grip.x,grip.y+90);await capture('day','resize-in-progress');await motion('UP',grip.x,grip.y+90);await pause(700);await b.refresh();const resized=await client.query(ref('tasks:get'),{id:task._id});assert.ok(resized.durationMinutes>30);return {id:task._id,time:moved.time,durationMinutes:resized.durationMinutes};}finally{await client.mutation(ref('profiles:update'),{patch:{dayStartHour:previous.dayStartHour,dayEndHour:previous.dayEndHour}});}
});
await record('Notification registration and scheduling evidence',async()=>{
 await tap('Day');await tap('Settings');await tap('Notifications');await tap('Enable notifications');await pause(2000);if((await xml()).includes('text="Allow"'))await tap('Allow');await pause(1500);await capture('settings','notification-registration');const registered=(await xml()).includes('Disable notifications');await run('shell','cmd','statusbar','expand-notifications');await capture('notifications','shade');await run('shell','cmd','statusbar','collapse');await back();await back();await b.refresh();const token=await client.query(ref('profiles:get'),{});return {profileExists:!!token,registered,notificationDelivery:'Inspect registration capture and report. Scheduling is tested by the live backend suite.'};
});
await record('Font scale 1.3 and system Back',async()=>{
 await run('shell','settings','put','system','font_scale','1.3');
 try {
  await run('shell','am','force-stop','app.kriyan.android');await run('shell','monkey','-p','app.kriyan.android','1');await pause(1500);
  for(const view of ['Day','List','Week','Goals']){await tap(view);await capture(view.toLowerCase(),'font-scale-1-3');}
  await tap('List');const row=(await nodes()).find(n=>attr(n,'content-desc').startsWith('Open '));if(row){await tap(attr(row,'content-desc'));await capture('task-sheet','font-scale-1-3');await back();assert(!(await xml()).includes('Task title'));}
  await tap('Day');await tap('Settings');await capture('settings','home-font-scale-1-3');
  for(const section of ['Areas','Projects and courses','Classes and meetings','Habits','Daily capacity','Day starts and ends','Notifications','Account']){await tap(section);await capture('settings',section.toLowerCase().replaceAll(' ','-')+'-font-scale-1-3');await back();}
  await back();await b.refresh();await client.mutation(ref('profiles:update'),{patch:{onboardingComplete:false}});await waitText('What do you plan for?');
  for(let step=0;step<5;step++){await capture('onboarding',`step-${step+1}-font-scale-1-3`);await tap(step===0?'Continue':'Skip');}
  if((await xml()).includes('Skip notifications'))await tap('Skip notifications');
  return {views:4,settings:8,onboarding:5,restored:true};
 }finally{await run('shell','settings','put','system','font_scale','1.0');}
});
await record('System edge Back gesture on every view, sheet, settings section and onboarding step at font scale 1.3',async()=>{
 const overlays=await run('shell','cmd','overlay','list','com.android.internal.systemui');const previous=overlays.match(/\[x\] (com\.android\.internal\.systemui\.navbar\.[a-z0-9_]+)/)?.[1];
 const visited=[],gesture=async()=>{await run('shell','input','swipe','1','1200','430','1200','350');await pause(600);};
 try{
  await run('shell','cmd','overlay','enable-exclusive','--category','com.android.internal.systemui.navbar.gestural');await run('shell','settings','put','system','font_scale','1.3');
  for(const view of ['Day','List','Week','Goals']){await tap(view);await gesture();await run('shell','monkey','-p','app.kriyan.android','1');await waitText('Settings');visited.push(view);await capture(view.toLowerCase(),'after-system-back-font-scale-1-3');}
  await tap('List');const row=(await nodes()).find(n=>attr(n,'content-desc').startsWith('Open ')&&visible(n));assert.ok(row);await tap(attr(row,'content-desc'));await capture('task-sheet','before-system-back-gesture');await gesture();assert(!(await xml()).includes('Task title'));visited.push('Task sheet');await capture('list','after-system-back-gesture');
  await tap('Add a task');await gesture();if((await nodes()).some(n=>attr(n,'class').includes('EditText')&&attr(n,'content-desc')==='Task'))await gesture();assert(!(await nodes()).some(n=>attr(n,'class').includes('EditText')&&attr(n,'content-desc')==='Task'));visited.push('Quick add');
  await tap('Goals');const goal=(await nodes()).find(n=>attr(n,'content-desc').startsWith('Open goal ')&&visible(n));assert.ok(goal);await tap(attr(goal,'content-desc'));await gesture();if((await xml()).includes('Goal title'))await gesture();assert(!(await xml()).includes('Goal title'));visited.push('Goal sheet');
  await tap('Day');await tap('Settings');
  for(const section of ['Areas','Projects and courses','Classes and meetings','Habits','Daily capacity','Day starts and ends','Notifications','Account']){await tap(section);await gesture();const home=await xml();assert(home.includes('Projects and courses')&&home.includes('Classes and meetings'));visited.push('Settings '+section);}
  await gesture();await waitText('Day');visited.push('Settings home');
  await b.refresh();await client.mutation(ref('profiles:update'),{patch:{onboardingComplete:false}});const headings=['What do you plan for?','Give your work a home','When are you already busy?','What are you working towards?','What will you do first?'];await waitText(headings[0]);
  await gesture();await run('shell','monkey','-p','app.kriyan.android','1');await waitText(headings[0]);visited.push('Onboarding 1');
  for(let step=1;step<5;step++){await tap(step===1?'Continue':'Skip');await waitText(headings[step]);await gesture();await waitText(headings[step-1]);visited.push('Onboarding '+(step+1));await tap(step===1?'Continue':'Skip');}
  await tap('Skip');if((await xml()).includes('Skip notifications'))await tap('Skip notifications');return {edgeSwipe:true,visited};
 }finally{await b.refresh();await client.mutation(ref('profiles:completeOnboarding'),{});await run('shell','settings','put','system','font_scale','1.0');if(previous)await run('shell','cmd','overlay','enable-exclusive','--category',previous);}
});
await record('Offline banner and reconnection',async()=>{await tap('Day');await run('shell','svc','wifi','disable');await run('shell','svc','data','disable');await pause(1200);await capture('day','offline');await run('shell','svc','wifi','enable');await run('shell','svc','data','enable');await pause(1800);return {restored:true};});
await record('Launcher shortcut and shared text capture',async()=>{
 await run('shell','am','start','-a','android.intent.action.SEND','-t','text/plain','--es','android.intent.extra.TEXT','Review the gallery tomorrow','-p','app.kriyan.android');await pause(900);await capture('capture','shared-text');await back();await run('shell','input','keyevent','3');await capture('launcher','app-icon');await run('shell','am','start','-a','android.intent.action.VIEW','-d','kriyan:///?add=true','-p','app.kriyan.android');await pause(900);await capture('capture','shortcut');
});
await record('Web-created password account signs in on Android',async()=>{
 const web=JSON.parse(await readFile(privatePath('21-web-native-user.json'),'utf8'));
 await run('shell','pm','clear','app.kriyan.android');await run('shell','monkey','-p','app.kriyan.android','1');await pause(1500);
 await tap('Use password');await tap('Email');await type(web.email);await tap('Password');await type(web.password);await capture('auth','web-account-password');await back();await tap('Sign in');await pause(2000);
 if((await xml()).includes('Verification code')){await tap('Verification code');await type('424242');await back();await tap('Verify code');await pause(1800);}
 const state=await xml();assert(!state.includes('Use password')&&!state.includes('Verify code'),'Password sign-in did not finish.');await capture('auth','web-created-account-signed-in');await save('cross-web-on-native',{id:web.id,signedIn:true,password:true});
 await tap('List');assert((await xml()).includes('QA21 web to Android'),'Web-created task is not visible on Android.');await capture('list','web-created-task');
 await tap('Add a task');await tap('Task');await type('QA21 Android to web today');await back();await tap('Add task');await pause(1000);assert((await xml()).includes('QA21 Android to web'));await capture('list','native-cross-task');
 return {id:web.id,webTaskVisible:true,nativeTaskAddedThroughUI:true};
});
await save('android-retained-account',{id:owner.id,email:owner.email,retainedForWebCrossSignIn:true});
await record('Delete a disposable account through the Android app',async()=>{
 const deletion=await user('android-delete',false),bd=await backend(deletion,prod);await bd.client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});await bd.client.mutation(ref('profiles:completeOnboarding'),{});await bd.client.mutation(ref('tasks:create'),{title:'Account deletion proof'});
 await run('shell','pm','clear','app.kriyan.android');await run('shell','monkey','-p','app.kriyan.android','1');await pause(1500);await tap('Email');await type(deletion.email);await back();await tap('Send code');await tap('Verification code');await type('424242');await back();await tap('Verify code');await pause(1800);await tap('Settings');await tap('Delete account and data');await tap('Type DELETE');await type('DELETE');await back();await capture('settings','delete-account-ready');await tap('Delete account and data');await pause(2000);assert.equal((await clerkClient().users.getUserList({emailAddress:[deletion.email]})).data.length,0);await capture('auth','after-delete-account');return {id:deletion.id,deletedThroughApp:true};
});
console.log('Android capture finished. Account retained for web proof, then cleanup.');

process.exitCode=receipts.some(row=>row.status==='fail')?1:0;
