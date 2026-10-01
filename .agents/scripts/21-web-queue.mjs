import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const root=process.cwd(),web=resolve('apps/web'),runner=resolve('.agents/scripts/21-command.mjs'),pw=resolve('node_modules/@playwright/test/cli.js');
const prod='https://calm-salamander-183.convex.cloud';
const steps=[
 ['functional-local-final',web,[process.execPath,pw,'test','--config','playwright.qa.config.ts'],{E2E_BASE_URL:'http://localhost:3500'}],
 ['e2e-local-all',web,[process.execPath,pw,'test'],{E2E_BASE_URL:'http://localhost:3500'}],
 ['public-local-all',web,[process.execPath,pw,'test','--config','playwright.public.config.ts'],{PUBLIC_BASE_URL:'http://localhost:3500'}],
 ['functional-production',web,[process.execPath,pw,'test','--config','playwright.qa.config.ts','--grep','QA15'],{E2E_BASE_URL:'https://app.kriyan.app',NEXT_PUBLIC_CONVEX_URL:prod}],
 ['e2e-production-app',web,[process.execPath,pw,'test','--project','states','--project','onboarding-settings','--project','screenshots'],{E2E_BASE_URL:'https://app.kriyan.app',NEXT_PUBLIC_CONVEX_URL:prod}],
 ['public-production-all',web,[process.execPath,pw,'test','--config','playwright.public.config.ts'],{PUBLIC_BASE_URL:'https://kriyan.app'}],
 ['live-production',root,[process.execPath,resolve('.agents/logs/21/live.mjs')],{E2E_BASE_URL:'https://app.kriyan.app',NEXT_PUBLIC_CONVEX_URL:prod,QA_OUTPUT:'.agents/logs/21/live-production',QA_LABEL:''}],
 ['public-links',root,[process.execPath,resolve('.agents/scripts/21-public.mjs')],{}],
 ['cross-web-create',root,[process.execPath,resolve('.agents/scripts/21-cross.mjs'),'web-create'],{}],
 ['delete-smoke',root,[process.execPath,resolve('.agents/scripts/21-delete-smoke.mjs')],{}],
 ['gallery-web',root,[process.execPath,resolve('.agents/scripts/21-gallery.mjs')],{E2E_BASE_URL:'http://localhost:3500'}],
 ['lighthouse-all',root,[process.execPath,resolve('.agents/scripts/21-lighthouse.mjs')],{}],
];
const selected=process.argv.slice(2);
for(const [name,cwd,args,env]of steps) {
 if(selected.length&&!selected.includes(name))continue;
 console.log(`Starting ${name}`);
 const code=await new Promise((done,reject)=>{const child=spawn(process.execPath,[runner,name,...args],{cwd,env:{...process.env,...env},windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('close',done);});
 console.log(`Finished ${name}: ${code}`);
}
