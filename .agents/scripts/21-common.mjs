import { appendFile, mkdir, writeFile, readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { createTestUser, deleteTestUser, clerkClient } from '../skills/test-kriyan/scripts/lib/users.mjs';
import { configuration, root } from '../skills/test-kriyan/scripts/lib/config.mjs';
export const prod = 'https://calm-salamander-183.convex.cloud';
export const ref = name => makeFunctionReference(name);
export const env = configuration();
export const logdir = '.agents/logs/21';
export async function user(tag, password=true) {
 const created = await createTestUser({tag:`qa21-${tag}`,password});
 await mkdir('.agents/test-kriyan',{recursive:true});
 await appendFile('.agents/test-kriyan/21-users.jsonl',JSON.stringify(created)+'\n');
 return created;
}
export async function backend(owner, url=env.NEXT_PUBLIC_CONVEX_URL) {
 const sdk = clerkClient(); const session = await sdk.sessions.createSession({userId:owner.id});
 const client = new ConvexHttpClient(url,{logger:false});
 const refresh = async () => client.setAuth((await sdk.sessions.getToken(session.id,'convex')).jwt);
 await refresh();
 return {client,refresh};
}
export async function cleanup(owner) {
 const identity=await clerkClient().users.getUser(owner.id);
 if(identity.emailAddresses.some(row=>['kriyan-03a+clerk_test@example.com','kriyan+clerk_test@example.com'].includes(row.emailAddress))||!identity.emailAddresses.some(row=>row.emailAddress.endsWith('+clerk_test@example.com')))throw new Error('Cleanup accepts disposable test users only.');
 const development=parseEnv(await readFile(`${root}/apps/web/.env.local`,'utf8')).NEXT_PUBLIC_CONVEX_URL;
 for(const url of new Set([development,prod])) {
  const b=await backend(owner,url);
  await b.client.mutation(ref('profiles:resetAll'),{});
  for(let attempt=0;attempt<80;attempt++) {
   await b.refresh();
   if(await b.client.query(ref('profiles:get'),{}) === null) break;
   await new Promise(resolve=>setTimeout(resolve,1500));
  }
  if(await b.client.query(ref('profiles:get'),{}) !== null) throw new Error('Planner cleanup still pending.');
 }
 await clerkClient().users.deleteUser(owner.id);
}
export async function save(name, value) {
 await mkdir(logdir,{recursive:true});
 await writeFile(`${logdir}/${name}.json`,JSON.stringify(value,(key,item)=>['clientId','client_id','accessToken','refreshToken','access_token','refresh_token'].includes(key)?'[redacted]':item,2));
}
