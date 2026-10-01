import { appendFile, readFile, readdir } from 'node:fs/promises';
import { listTestUsers } from '../skills/test-kriyan/scripts/lib/users.mjs';
import { privatePath } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { cleanup, save } from './21-common.mjs';
const registered=new Set();
for(const line of (await readFile(privatePath('21-users.jsonl'),'utf8')).split('\n').filter(Boolean))registered.add(JSON.parse(line).id);
for(const path of ['.data/15/extra-user-ids.jsonl','apps/web/.data/15/extra-user-ids.jsonl'])try{for(const line of(await readFile(path,'utf8')).split('\n').filter(Boolean))registered.add(JSON.parse(line).id);}catch{}
for(const folder of await readdir('.agents/logs/21'))if(folder.startsWith('live-'))try{for(const owner of JSON.parse(await readFile(`.agents/logs/21/${folder}/users.json`,'utf8')))registered.add(owner.id);}catch{}
const recovered=['user_3K6INbOeynyLlkNiWPTnjNzSTlg','user_3K6IMghWFqFM5Vd28S13ypBOLaW','user_3K6ILz5wK2Uhzo1sQ5FHrkZnkmz','user_3K6CrcBDcP6K5GN7naydKTkQCyl'];
for(const id of recovered)registered.add(id);
const final=process.argv.includes('--final'),receipts=[];
for(const owner of await listTestUsers()) {
 if(!registered.has(owner.id)||!final&&!recovered.includes(owner.id))continue;
 await appendFile(privatePath('21-users.jsonl'),JSON.stringify({id:owner.id,email:owner.email})+'\n');
 await cleanup(owner);receipts.push({id:owner.id,email:owner.email,deleted:true});
}
await save(final?'cleanup-final-users':'cleanup-recovered-users',receipts);
console.log(JSON.stringify({deleted:receipts.length,remaining:(await listTestUsers()).map(({id,email,fixture})=>({id,email,fixture}))}));
