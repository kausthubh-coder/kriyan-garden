import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { adb, tap, waitText, xml, nodes, attr, pause } from './22-adb.mjs';
async function capture(group,state){const name=`android-${group}-${state}`,pixels=await adb('exec-out','screencap','-p');await writeFile(`docs/design/gallery/${name}.png`,pixels);await writeFile(`.agents/logs/21/${name}.xml`,await xml());let manifest=JSON.parse(await readFile('docs/design/gallery/android-manifest.json','utf8'));manifest=manifest.filter(row=>row.image!==name+'.png');manifest.push({surface:'Android',group,state,image:name+'.png',viewport:`${pixels.readUInt32BE(16)} x ${pixels.readUInt32BE(20)}`,base:'Local release-mode 1.0.1, production Convex'});await writeFile('docs/design/gallery/android-manifest.json',JSON.stringify(manifest,null,2));}
await adb('shell','am','start','-W','-n','app.kriyan.android/.MainActivity');await waitText('Day');await tap('Day');
const result=await adb('shell','am','start','-a','android.intent.action.SEND','-t','text/plain','--es','android.intent.extra.TEXT',"'Review the gallery tomorrow'",'-p','app.kriyan.android');
assert(!result.includes('Error:'));await waitText('Task');
const task=(await nodes()).find(node=>attr(node,'class').includes('EditText')&&attr(node,'content-desc')==='Task');assert(task);assert.equal(attr(task,'text'),'Review the gallery tomorrow');await capture('capture','shared-text');
await adb('shell','input','keyevent','4');if((await nodes()).some(node=>attr(node,'class').includes('EditText')&&attr(node,'content-desc')==='Task'))await adb('shell','input','keyevent','4');
await adb('shell','input','keyevent','3');await pause(1800);
const size=(await adb('shell','wm','size')).match(/(\d+)x(\d+)/);assert(size);const width=+size[1],height=+size[2];
await adb('shell','input','touchscreen','swipe',String(Math.round(width*.5)),String(Math.round(height*.79)),String(Math.round(width*.5)),String(Math.round(height*.25)),'500');await pause(1500);
let icon=(await nodes()).find(node=>attr(node,'text')==='Kriyan'||attr(node,'content-desc')==='Kriyan');assert(icon,'Kriyan icon must be visible in the actual launcher.');
const bounds=attr(icon,'bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);assert(bounds);const x=(+bounds[1]+ +bounds[3])/2,y=(+bounds[2]+ +bounds[4])/2;
await capture('launcher','app-icon');await adb('shell','input','touchscreen','swipe',String(x),String(y),String(x),String(y),'1200');await waitText('Add task');await capture('launcher','shortcut-menu');
await tap('Add task');await waitText('Task');assert((await nodes()).some(node=>attr(node,'class').includes('EditText')&&attr(node,'content-desc')==='Task'));await capture('capture','shortcut');
await adb('shell','input','keyevent','4');if((await nodes()).some(node=>attr(node,'class').includes('EditText')&&attr(node,'content-desc')==='Task'))await adb('shell','input','keyevent','4');
let receipts=JSON.parse(await readFile('.agents/logs/21/android.json','utf8'));receipts=receipts.filter(row=>row.check!=='Launcher shortcut and shared text capture');receipts.push({check:'Launcher shortcut and shared text capture',status:'pass',detail:{implicitSendIntent:true,sharedTextPreserved:true,actualLauncherIcon:true,actualDynamicShortcutMenu:true,shortcutOpenedQuickAdd:true,iconBounds:bounds[0]}});await writeFile('.agents/logs/21/android.json',JSON.stringify(receipts,null,2));
console.log('Implicit text share and actual launcher Add task shortcut passed.');
