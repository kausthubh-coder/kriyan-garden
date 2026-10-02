import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { privatePath } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { user, backend, ref, prod, save } from './21-common.mjs';
import { adb, tap, type, waitText, xml, nodes, attr, pause } from './22-adb.mjs';
const owner=process.argv[2]==='--resume'?(await readFile(privatePath('21-users.jsonl'),'utf8')).trim().split('\n').map(JSON.parse).filter(o=>o.email.includes('22-first-card')).at(-1):await user('22-first-card',false), b=await backend(owner,prod);
await b.client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});
await b.client.mutation(ref('profiles:completeOnboarding'),{});
if(process.argv[2]!=='--resume'){await waitText('Send code');await tap('Email');await type(owner.email);
await tap('Send code');await waitText('Verification code');await tap('Verification code');await type('424242');
await tap('Verify code');await pause(2000);if((await xml()).includes('Skip notifications'))await tap('Skip notifications');
await waitText('Settings');}await tap('Day');
const size=(await adb('shell','wm','size')).match(/(\d+)x(\d+)/);assert(size);
const width=Number(size[1]),height=Number(size[2]);
function bounds(node){const box=attr(node,'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);return box&&{left:+box[1],top:+box[2],right:+box[3],bottom:+box[4]};}
const shown=node=>{const box=bounds(node);return box&&box.right>box.left&&box.bottom>box.top&&box.top>=0&&box.bottom<=height;};
let title;
for(let i=0;i<12;i++){
 title=(await nodes()).find(node=>attr(node,'text')==='Your day starts here.'&&shown(node));if(title)break;
 await adb('shell','input','swipe',String(Math.round(width*.94)),String(Math.round(height*.78)),String(Math.round(width*.94)),String(Math.round(height*.32)),'400');await pause(300);
}
assert(title,'The first-task prompt must be visible on the empty timeline.');
const labels=['lunch with Priya 1pm','gym tomorrow 7am','essay fri 5pm 2h'];
const snapshot=await nodes(),density=Number((await adb('shell','wm','density')).match(/\d+(?=\s*$)/)[0]);
const chips=labels.map(label=>{const control=snapshot.find(node=>attr(node,'content-desc')===label&&shown(node));assert(control,'Visible example chip: '+label);const box=bounds(control);assert(box.bottom-box.top>=Math.floor(44*density/160));return {label,bounds:box,heightDp:(box.bottom-box.top)*160/density,targetHeightDp:44,onePhysicalPixelRounding:true};});
await b.refresh();assert.equal((await b.client.query(ref('tasks:list'),{})).length,0);
await writeFile('docs/design/gallery/android-day-first-task-hint.png',await adb('exec-out','screencap','-p'));
await writeFile('.agents/logs/21/android-day-first-task-hint.xml',await xml());
await save('android-first-card',{passed:true,userId:owner.id,tasks:0,title:'Your day starts here.',titleBounds:bounds(title),chips,scrolledToCurrentTime:true});
await adb('shell','am','force-stop','app.kriyan.android');await adb('shell','am','start','-W','-n','app.kriyan.android/.MainActivity');await waitText('Settings');await tap('Settings');await tap('Sign out');await waitText('Send code');
console.log('Empty Day first-task card and three visible touch-sized example chips passed.');
