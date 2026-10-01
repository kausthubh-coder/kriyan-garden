import {spawn} from 'node:child_process';import {resolve} from 'node:path';
async function step(name,command,args=[],cwd=process.cwd(),env={}){console.log('Starting '+name);const exit=await new Promise((done,reject)=>{const p=spawn(process.execPath,[resolve('.agents/scripts/21-command.mjs'),name,command,...args],{cwd,windowsHide:true,stdio:'inherit',env:{...process.env,...env}});p.on('error',reject);p.on('close',done)});console.log(name+': '+exit);if(exit!==0)process.exitCode=1;}
for(const gate of ['typecheck','lint','build'])await step('web-planning-'+gate,'bun',['run',gate],resolve('apps/web'));
await step('functional-planning-final',process.execPath,[resolve('.agents/scripts/21-local-qa.mjs'),'functional-local-final']);
await step('local-rate-planning-final',process.execPath,[resolve('.agents/scripts/21-local-services.mjs')],process.cwd(),{QA_ONLY:'read limiter',QA_SUFFIX:'-rate-final',QA_GALLERY:'1',QA_GALLERY_FILTER:'^settings planning$'});
