import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {adb} from './22-adb.mjs';
// This is the owned userdebug AVD's touchscreen, not a host input device.
// Read the kernel axis ranges before injecting a physical-style edge swipe.
export async function kernelBack(){
 const input=await adb('shell','getevent','-lp');
 const block=input.split(/add device \d+: /).find(x=>x.includes('name:     "virtio_input_multi_touch_1"'));
 assert(block);const device=block.split('\n')[0].trim();assert(/^\/dev\/input\/event\d+$/.test(device));
 const maxX=Number(block.match(/ABS_MT_POSITION_X[^\n]*max (\d+)/)?.[1]),maxY=Number(block.match(/ABS_MT_POSITION_Y[^\n]*max (\d+)/)?.[1]);assert(maxX>0&&maxY>0);
 const lines=[],send=(type,code,value)=>lines.push(`sendevent ${device} ${type} ${code} ${value}`);
 send(3,47,0);send(3,57,42);send(3,53,Math.round(maxX*.001));send(3,54,Math.round(maxY*.5));send(0,0,0);
 for(let i=1;i<=15;i++){lines.push('sleep 0.02');send(3,53,Math.round(maxX*(.001+i*.3/15)));send(0,0,0);}
 send(3,57,-1);send(0,0,0);
 const path='.agents/logs/22/kernel-back.sh';await writeFile(path,lines.join('\n')+'\n');await adb('push',path,'/data/local/tmp/qa22-kernel-back.sh');
 await adb('shell','su','0','sh','/data/local/tmp/qa22-kernel-back.sh');
 return {device,maxX,maxY,frames:15,durationMs:300,source:'Owned AVD kernel touchscreen'};
}
