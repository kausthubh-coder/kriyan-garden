import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const [label,grep,config='playwright.qa.config.ts']=process.argv.slice(2),web=resolve('apps/web');
const server=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'start','--port','3500'],{cwd:web,windowsHide:true,stdio:'ignore'});
try {
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://localhost:3500')).ok){ready=true;break;}}catch{}await new Promise(done=>setTimeout(done,500));}if(!ready)throw new Error('Local QA server failed to start.');
 const args=[resolve('.agents/scripts/21-command.mjs'),label,process.execPath,resolve('node_modules/@playwright/test/cli.js'),'test','--config',config,...(grep?['--grep',grep]:[])];
 process.exitCode=await new Promise((done,reject)=>{const child=spawn(process.execPath,args,{cwd:web,windowsHide:true,stdio:'inherit',env:{...process.env,E2E_BASE_URL:'http://localhost:3500'}});child.on('error',reject);child.on('close',done)});
} finally {if(server.exitCode===null){const stopped=new Promise(done=>server.once('close',done));server.kill();await stopped;}}
