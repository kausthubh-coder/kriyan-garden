import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { privatePath } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { backend, ref, prod } from './21-common.mjs';
import { adb, tap, type, waitText, xml, nodes, attr, pause } from './22-adb.mjs';
const owner=JSON.parse(await readFile(privatePath('21-native-user.json'),'utf8')),b=await backend(owner,prod);
await adb('shell','am','force-stop','app.kriyan.android');await adb('shell','am','start','-W','-n','app.kriyan.android/.MainActivity');
for(let i=0;i<20;i++){const state=await xml();if(state.includes('Send code')||state.includes('content-desc="Day"'))break;await pause(500);}
if((await xml()).includes('Send code')){await tap('Email');await type(owner.email);await adb('shell','input','keyevent','4');await tap('Send code');await waitText('Verification code');await tap('Verification code');await type('424242');await adb('shell','input','keyevent','4');await tap('Verify code');await pause(2000);}
if((await xml()).includes('Skip notifications'))await tap('Skip notifications');await waitText('Day');await tap('Day');await waitText('Settings');
const dimensions=(await adb('shell','wm','size')).match(/(\d+)x(\d+)/);assert(dimensions);const width=+dimensions[1],height=+dimensions[2];
function box(node){const r=attr(node,'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);return r&&{left:+r[1],top:+r[2],right:+r[3],bottom:+r[4]};}
const visible=node=>{const r=box(node);return r&&r.right>r.left&&r.bottom>r.top&&r.top>=0&&r.bottom<=height;};
async function point(label){for(let i=0;i<12;i++){const node=(await nodes()).find(node=>(attr(node,'content-desc')===label||attr(node,'content-desc').startsWith(label+','))&&visible(node));if(node){const r=box(node);return {x:(r.left+r.right)/2,y:(r.top+r.bottom)/2,bounds:r};}await adb('shell','input','swipe',String(Math.round(width*.94)),String(Math.round(height*.78)),String(Math.round(width*.94)),String(Math.round(height*.32)),'400');}throw new Error('Visible gesture control required: '+label);}
async function motionCapture(command,from,to,name,duration=5000){
 const source=await xml(),started=Date.now();let finished=false;
 const moving=adb('shell','input','touchscreen',command,String(Math.round(from.x)),String(Math.round(from.y)),String(Math.round(to.x)),String(Math.round(to.y)),String(duration)).then(()=>{finished=true;});
 await pause(Math.min(2000,Math.floor(duration/3)));assert(!finished,'Capture must occur during the continuous gesture.');
 const pixels=await adb('exec-out','screencap','-p'),captureMs=Date.now()-started;assert(!finished,'Gesture ended before capture returned.');
 await writeFile(`docs/design/gallery/${name}.png`,pixels);await writeFile(`.agents/logs/21/${name}.xml`,source);await moving;
 let manifest=JSON.parse(await readFile('docs/design/gallery/android-manifest.json','utf8'));manifest=manifest.filter(row=>row.image!==name+'.png');
 manifest.push({surface:'Android',group:name.includes('list')?'list':'day',state:name.replace(/^android-(list|day)-/,''),image:name+'.png',viewport:`${width} x ${height}`,base:'Local release-mode 1.0.1, production Convex'});
 await writeFile('docs/design/gallery/android-manifest.json',JSON.stringify(manifest,null,2));return {command,durationMs:duration,captureMs,xmlState:'Before gesture',from,to};
}
let receipts=JSON.parse(await readFile('.agents/logs/21/android.json','utf8'));
await writeFile('.agents/logs/22/android-before-continuous-gestures.json',JSON.stringify(receipts,null,2));
async function record(check,work){let row;try{row={check,status:'pass',detail:await work()};}catch(error){row={check,status:'fail',detail:error.message.slice(0,500)};process.exitCode=1;}receipts=receipts.filter(item=>item.check!==check);receipts.push(row);await writeFile('.agents/logs/21/android.json',JSON.stringify(receipts,null,2));console.log(check,row.status);}
if(process.argv[2]!=='--timeline')await record('Swipe completion, mid-swipe capture and read-back',async()=>{
 await b.refresh();const task=(await b.client.query(ref('tasks:list'),{})).find(task=>task.title==='QA21 swipe proof');assert(task);assert.equal(task.status,'active');await tap('List');if(task.date!==new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}))await tap('Previous day');const p=await point('Open '+task.title);
 const gesture=await motionCapture('swipe',p,{x:Math.min(width-2,p.x+width*.45),y:p.y},'android-list-mid-swipe');await pause(1200);await b.refresh();const saved=await b.client.query(ref('tasks:get'),{id:task._id});assert.equal(saved.status,'completed');return {id:task._id,status:saved.status,gesture};
});
await record('Timeline drag and resize with direct read-backs',async()=>{
 await b.refresh();const previous=await b.client.query(ref('profiles:get'),{});await b.client.mutation(ref('profiles:update'),{patch:{dayStartHour:9,dayEndHour:14}});
 try{
  const task=(await b.client.query(ref('tasks:list'),{})).find(task=>task.title==='QA21 drag proof');assert(task);await b.client.mutation(ref('tasks:update'),{id:task._id,patch:{time:'10:00',durationMinutes:30}});await pause(800);await tap('Day');await tap('Today');if(task.date!==new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}))await tap('Previous day');const p=await point('Open '+task.title);
  const drag=await motionCapture('draganddrop',p,{x:p.x,y:p.y+170},'android-day-drag-in-progress');await pause(1200);await b.refresh();const moved=await b.client.query(ref('tasks:get'),{id:task._id});assert.notEqual(moved.time,'10:00');
  const movedPoint=await point('Open '+task.title),grips=(await nodes()).filter(n=>attr(n,'content-desc')==='Resize task'&&visible(n)).map(n=>{const r=box(n);return {x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};}).sort((a,b)=>Math.abs(a.y-movedPoint.bounds.bottom)-Math.abs(b.y-movedPoint.bounds.bottom));assert(grips.length);const grip=grips[0],resize=await motionCapture('swipe',grip,{x:grip.x,y:grip.y+300},'android-day-resize-in-progress',1500);await pause(1200);await b.refresh();const resized=await b.client.query(ref('tasks:get'),{id:task._id});assert(resized.durationMinutes>30);return {id:task._id,time:moved.time,durationMinutes:resized.durationMinutes,drag,resize};
 }finally{await b.refresh();await b.client.mutation(ref('profiles:update'),{patch:{dayStartHour:previous.dayStartHour,dayEndHour:previous.dayEndHour}});}
});
await adb('shell','am','force-stop','app.kriyan.android');await adb('shell','am','start','-W','-n','app.kriyan.android/.MainActivity');await waitText('Settings');await tap('Settings');await tap('Sign out');await waitText('Send code');
