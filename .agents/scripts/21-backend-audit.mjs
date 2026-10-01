import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { save } from './21-common.mjs';
const execute=promisify(execFile);
const tables=['profiles','areas','projects','tasks','goals','milestones','events','habits','habitLogs','reminderJobs','pushTokens','serviceNonces','serviceInvocations'];
const owners=new Set();
try {for(const line of (await readFile('.agents/test-kriyan/21-users.jsonl','utf8')).split('\n').filter(Boolean))owners.add(JSON.parse(line).id);}catch{}
try {for(const line of (await readFile('.data/15/extra-user-ids.jsonl','utf8')).split('\n').filter(Boolean))owners.add(JSON.parse(line).id);}catch{}
try {for(const line of (await readFile('apps/web/.data/15/extra-user-ids.jsonl','utf8')).split('\n').filter(Boolean))owners.add(JSON.parse(line).id);}catch{}
for(const folder of await readdir('.agents/logs/21'))if(folder.startsWith('live-'))try{for(const u of JSON.parse(await readFile(`.agents/logs/21/${folder}/users.json`,'utf8')))owners.add(u.id);}catch{}
try{const deletion=JSON.parse(await readFile('.agents/logs/21/delete-smoke.json','utf8'));if(deletion.id)owners.add(deletion.id);}catch{}
const counts=[];
for(const production of [false,true])for(const table of tables) {
 try {
  const {stdout}=await execute('bunx',['convex','data',table,'--limit','10000','--format','json',...(production?['--prod']:[])],{cwd:'packages/backend',windowsHide:true,timeout:60000,maxBuffer:30000000});
  const rows=stdout.trim()?JSON.parse(stdout):[];if(rows.length>=10000)throw new Error('Read limit reached.');
  counts.push({deployment:production?'production':'development',table,remaining:rows.filter(row=>owners.has(row.ownerId)).length,checkedOwners:owners.size});
 }catch(error){counts.push({deployment:production?'production':'development',table,error:error.message.slice(0,130)});}
 await save('backend-cleanup',counts);
}
console.log(JSON.stringify({owners:owners.size,nonzero:counts.filter(c=>c.remaining>0),errors:counts.filter(c=>c.error)}));
process.exitCode=counts.some(c=>c.remaining>0||c.error)?1:0;
