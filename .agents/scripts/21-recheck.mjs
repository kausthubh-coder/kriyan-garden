import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const root=process.cwd();
async function step(name,command,args=[],cwd=root,extra={}){console.log('Starting '+name);const code=await new Promise((done,reject)=>{const p=spawn(process.execPath,[resolve('.agents/scripts/21-command.mjs'),name,command,...args],{cwd,windowsHide:true,stdio:'inherit',env:{...process.env,...extra}});p.on('error',reject);p.on('close',done)});console.log(`${name}: ${code}`);return code;}
await step('convex-title-sync','bunx',['convex','dev','--once'],resolve('packages/backend'));
for(const gate of ['typecheck','lint','test','build'])await step(`${gate}-final`,'bun',['run',gate]);
await step('local-rate-and-seeded-gallery',process.execPath,[resolve('.agents/scripts/21-local-services.mjs')],root,{QA_ONLY:'read limiter',QA_SUFFIX:'-rate',QA_GALLERY:'1'});
await step('services-production-rate',process.execPath,[resolve('.agents/scripts/21-services.mjs')],root,{QA_ONLY:'read limiter',QA_SUFFIX:'-rate'});
await step('cli-production-complete',process.execPath,[resolve('.agents/scripts/21-cli-live.mjs')],root,{QA_CLI_SEED_BASE:'https://app.kriyan.app'});
await step('cross-web-prepare',process.execPath,[resolve('.agents/scripts/21-cross.mjs'),'web-prepare']);
