// Only identities created by this QA run are eligible for cleanup.
import nextEnv from "@next/env";
import { createClerkClient } from "@clerk/backend";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../packages/backend/convex/_generated/api";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
nextEnv.loadEnvConfig(resolve("apps/web"));
const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey?.startsWith("sk_test_")) throw new Error("Development credentials required");
const sdk = createClerkClient({ secretKey });
const intervals = readdirSync(".agents/logs").filter(n=>n.startsWith("15-hardening") && n.endsWith(".log")).map(n=>statSync(resolve(".agents/logs",n)));
const started = Math.min(...intervals.map(i=>i.birthtimeMs));
const knownExtra = new Set<string>();
try { for (const line of readFileSync(".data/15/extra-user-ids.jsonl","utf8").trim().split("\n")) knownExtra.add((JSON.parse(line) as {id:string}).id); } catch { /* No extra fixtures yet. */ }
const remainingHardening = (await sdk.users.getUserList({ query:"kriyan-hardening-", limit:100 })).data.filter(u=>
  intervals.some(i=>u.createdAt >= i.birthtimeMs && u.createdAt <= i.mtimeMs) && u.emailAddresses.some(e=>e.emailAddress.startsWith("kriyan-hardening-") && e.emailAddress.endsWith("+clerk_test@example.com")));
const remainingExtra = (await sdk.users.getUserList({query:"kriyan-qa15-",limit:100})).data.filter(u=>knownExtra.has(u.id));
const removed = [];
for (const user of [...remainingHardening,...remainingExtra]) {
  const session = await sdk.sessions.createSession({ userId:user.id });
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "", { logger:false });
  client.setAuth((await sdk.sessions.getToken(session.id,"convex")).jwt);
  await client.mutation(api.profiles.resetAll,{});
  for (let i=0; i<60 && await client.query(api.profiles.get,{}); i++) await new Promise(r=>setTimeout(r,500));
  if (await client.query(api.profiles.get,{})) throw new Error("Cleanup did not finish");
  await sdk.users.deleteUser(user.id);
  removed.push(user.id);
}
const ids = new Set<string>(removed);
for (const name of readdirSync(".agents/logs").filter(n=>n.startsWith("15-"))) {
  for (const match of readFileSync(resolve(".agents/logs",name),"utf8").matchAll(/user_[A-Za-z0-9]+/g)) ids.add(match[0]);
}
try { for (const line of readFileSync(".data/15/extra-user-ids.jsonl","utf8").trim().split("\n")) ids.add((JSON.parse(line) as {id:string}).id); } catch { /* No extra fixtures yet. */ }
const prefixes = ["kriyan-qa15-","kriyan-hardening-"];
const remaining = await Promise.all(prefixes.map(async prefix=>({prefix,users:(await sdk.users.getUserList({query:prefix,limit:100})).data.filter(u=>prefix!=="kriyan-hardening-" || u.createdAt>=started).map(u=>u.id)})));
const tables = ["profiles","areas","projects","tasks","goals","milestones","events","habits","habitLogs","reminderJobs","pushTokens","serviceNonces","serviceInvocations"];
const counts = Object.fromEntries(tables.map(table=>{
  const raw = execFileSync("bunx",["convex","data",table,"--limit","10000","--format","json"],{cwd:resolve("packages/backend"),windowsHide:true,encoding:"utf8",stdio:"pipe",maxBuffer:30000000});
  const rows: unknown = raw.trim() ? JSON.parse(raw) : [];
  if (!Array.isArray(rows) || rows.length===10000) throw new Error("Incomplete table inspection");
  return [table,rows.filter((r:Record<string,unknown>)=>typeof r.ownerId==="string" && ids.has(r.ownerId)).length];
}));
const result={removedFromFailedTeardowns:removed,remaining,checkedOwnerIds:ids.size,counts};
writeFileSync(".data/15/final-cleanup.json",JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
process.exitCode=remaining.some(r=>r.users.length) || Object.values(counts).some(c=>c>0) ? 1 : 0;
