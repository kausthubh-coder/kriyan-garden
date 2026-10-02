import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { adb, pause, xml, tap } from './22-adb.mjs';
const deadline=Date.now()+300000;
for(;;) {
  try {if((await adb('shell','getprop','sys.boot_completed')).trim()==='1')break;}catch{}
  if(Date.now()>deadline)throw new Error('Guest did not boot. Inspect the watchdog before retrying.');
  await pause(3000);
}
console.log('Headless guest booted; waiting for system services to settle.');await pause(20000);
async function settle() {
  if((await xml()).includes('text="Wait"')) {await tap('Wait');await pause(15000);}
}
await settle();
await adb('shell','cmd','connectivity','airplane-mode','disable');
await adb('shell','svc','wifi','enable');await adb('shell','svc','data','enable');
let connected=false;
for(let attempt=0;attempt<6;attempt++) {
  try {
    const response=await adb('shell','printf "GET /generate_204 HTTP/1.1\\r\\nHost: connectivitycheck.gstatic.com\\r\\nConnection: close\\r\\n\\r\\n" | toybox nc -4 -w 8 -W 8 -q 1 connectivitycheck.gstatic.com 80');
    await writeFile('.agents/logs/22/local-install-network.txt',response);
    if(/HTTP\/1\.[01] 204/.test(response)){connected=true;break;}
  }catch{}
  await pause(3000);
}
assert(connected,'Device HTTP 204 must pass before app verification.');console.log('Real device HTTP 204 passed.');
const execute=promisify(execFile);
const {stdout}=await execute('.agents/android-sdk/platform-tools/adb.exe',['-s','emulator-5554','install','--no-streaming','-r','.agents/builds/kriyan-local-x86_64.apk'],{windowsHide:true,timeout:180000});
await writeFile('.agents/logs/22/local-install.txt',stdout);assert(stdout.includes('Success'));
await pause(15000);await settle();console.log('New local APK installed and guest settled.');
