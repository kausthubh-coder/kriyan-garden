import { spawn } from 'node:child_process';
import { readFile, copyFile } from 'node:fs/promises';
import { createHash, X509Certificate } from 'node:crypto';
import { resolve } from 'node:path';
const root=process.cwd(),cert=resolve('.agents/test-kriyan/localhost.crt');
const publicKey=new X509Certificate(await readFile(cert)).publicKey.export({type:'spki',format:'der'});
const environment={...process.env,NODE_EXTRA_CA_CERTS:cert,QA_TLS_SPKI:createHash('sha256').update(publicKey).digest('base64'),E2E_BASE_URL:'https://localhost:3543',QA_CLOCK:'1'};
let failed=false;
async function step(name,file){const exit=await new Promise((done,reject)=>{const child=spawn(process.execPath,[resolve('.agents/scripts/21-command.mjs'),name,process.execPath,resolve(file)],{cwd:root,env:environment,windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('close',done);});console.log(`${name}: ${exit}`);if(exit!==0)failed=true;return exit;}
const server=spawn(process.execPath,['--require',resolve('.agents/test-kriyan/clock.cjs'),resolve('node_modules/next/dist/bin/next'),'start','--port','3500'],{cwd:resolve('apps/web'),env:{...process.env,MCP_PUBLIC_ORIGIN:'https://localhost:3543'},windowsHide:true,stdio:'ignore'});
const proxy=spawn(process.execPath,[resolve('.agents/scripts/21-tls-proxy.mjs')],{cwd:root,windowsHide:true,stdio:'ignore'});
async function stop(child){if(child.exitCode!==null)return;const stopped=new Promise(done=>child.once('close',done));child.kill();await stopped;}
try {
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://localhost:3500/api/v1/auth-config?timezone=America%2FNew_York')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 if(!ready)throw new Error('The local HTTPS-configured build did not start.');
 await copyFile('.agents/logs/21/services-local-results.json','.agents/logs/21/services-local-misconfigured-results.json').catch(()=>{});
 if(process.env.QA_GALLERY_ONLY!=='1')await step('services-local-tls','.agents/scripts/21-services.mjs');
 if(!process.env.QA_ONLY&&process.env.QA_GALLERY_ONLY!=='1') {
 const grant=JSON.parse(await readFile('.agents/test-kriyan/21-cli-ready.json','utf8'));
 if(grant.base!=='https://localhost:3543')throw new Error('Local CLI has no verified local OAuth grant.');
 await step('cli-local-tls','.agents/scripts/21-cli-live.mjs');
 environment.E2E_BASE_URL='http://localhost:3500';
 await step('gallery-web-final','.agents/scripts/21-gallery.mjs');
 }
 if(process.env.QA_GALLERY==='1'){
  delete environment.QA_ONLY;delete environment.QA_SUFFIX;
  environment.E2E_BASE_URL='http://localhost:3500';
  await step('gallery-web-seeded','.agents/scripts/21-gallery.mjs');
 }
 if(process.env.QA_ZOOM==='1')await step('browser-zoom-final','.agents/scripts/21-zoom.mjs');
} finally {await stop(proxy);await stop(server);}
process.exitCode=failed?1:0;
