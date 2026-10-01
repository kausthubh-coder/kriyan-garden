import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const root=process.cwd(),web=resolve('apps/web'),runner=resolve('.agents/scripts/21-command.mjs'),pw=resolve('node_modules/@playwright/test/cli.js');
async function step(name,command,args=[],cwd=root,env={}) {
 console.log(`Starting ${name}`);
 const exit=await new Promise((done,reject)=>{const child=spawn(process.execPath,[runner,name,command,...args],{cwd,env:{...process.env,...env},windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('close',done);});
 console.log(`Finished ${name}: ${exit}`);return exit;
}
await step('isolation-production-final',process.execPath,[resolve('.agents/scripts/21-services.mjs')],root,{QA_ONLY:'isolation in both',QA_SUFFIX:'-isolation'});
await step('public-production-metadata-final',process.execPath,[pw,'test','--config','playwright.public.config.ts','--grep','docs, legal'],web,{PUBLIC_BASE_URL:'https://kriyan.app'});
await step('history-production-final',process.execPath,[resolve('.agents/logs/21/live.mjs')],root,{E2E_BASE_URL:'https://app.kriyan.app',NEXT_PUBLIC_CONVEX_URL:'https://calm-salamander-183.convex.cloud',QA_OUTPUT:'.agents/logs/21/live-production-history',QA_LABEL:'Every planner'});
await step('convex-dev-sync-final','bunx',['convex','dev','--once'],resolve('packages/backend'));
for(const gate of ['typecheck','lint','test','build'])await step(`${gate}-complete`,'bun',['run',gate]);
const server=spawn(process.execPath,['--require',resolve('.agents/test-kriyan/clock.cjs'),resolve('node_modules/next/dist/bin/next'),'start','--port','3500'],{cwd:web,env:{...process.env,MCP_PUBLIC_ORIGIN:'http://localhost:3500'},windowsHide:true,stdio:'ignore'});
try {
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://localhost:3500')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 if(!ready)throw new Error('Local build did not start.');
 await step('services-local-final',process.execPath,[resolve('.agents/scripts/21-services.mjs')],root,{E2E_BASE_URL:'http://localhost:3500',QA_CLOCK:'1'});
 await step('cli-local-final',process.execPath,[resolve('.agents/scripts/21-cli-live.mjs')]);
 await step('functional-local-complete',process.execPath,[pw,'test','--config','playwright.qa.config.ts'],web,{E2E_BASE_URL:'http://localhost:3500'});
 await step('e2e-local-complete',process.execPath,[pw,'test'],web,{E2E_BASE_URL:'http://localhost:3500'});
 await step('public-local-complete',process.execPath,[pw,'test','--config','playwright.public.config.ts'],web,{PUBLIC_BASE_URL:'http://localhost:3500'});
 await step('public-links-complete',process.execPath,[resolve('.agents/scripts/21-public.mjs')]);
 await step('axe-local-complete',process.execPath,[resolve('.agents/logs/21/live.mjs')],root,{E2E_BASE_URL:'http://localhost:3500',QA_OUTPUT:'.agents/logs/21/live-local-axe',QA_LABEL:'Axe'});
 await step('history-local-complete',process.execPath,[resolve('.agents/logs/21/live.mjs')],root,{E2E_BASE_URL:'http://localhost:3500',QA_OUTPUT:'.agents/logs/21/live-local-history',QA_LABEL:'Every planner'});
 await step('gallery-web-complete',process.execPath,[resolve('.agents/scripts/21-gallery.mjs')],root,{E2E_BASE_URL:'http://localhost:3500'});
 await step('lighthouse-complete',process.execPath,[resolve('.agents/scripts/21-lighthouse.mjs')]);
} finally {server.kill();await new Promise(resolve=>server.once('close',resolve));}
