import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const directory='C:/Users/kaust/AppData/Local/Temp/bunx-2321380864-eas-cli@24.8.0/node_modules/eas-cli/build';
const Session=require(directory+'/user/SessionManager.js').default;
const {createGraphqlClient}=require(directory+'/commandUtils/context/contextUtils/createGraphqlClient.js');
const {BuildQuery}=require(directory+'/graphql/queries/BuildQuery.js');
const session=new Session(undefined);
const client=createGraphqlClient({accessToken:session.getAccessToken(),sessionSecret:session.getSessionSecret()});
const build=await BuildQuery.byIdAsync(client,'190704dd-1737-46a9-9bc0-739b628c6293',{useCache:false});
const safe={id:build.id,status:build.status,priority:build.priority,version:build.appVersion,versionCode:build.appBuildVersion,initialQueuePosition:build.initialQueuePosition,queuePosition:build.queuePosition,estimatedWaitTimeLeftSeconds:build.estimatedWaitTimeLeftSeconds,createdAt:build.createdAt,updatedAt:build.updatedAt,completedAt:build.completedAt,metrics:build.metrics,artifactAvailable:!!build.artifacts?.buildUrl};
if(process.argv.includes('--phases')&&build.logFiles?.length){
 const phases=[];for(const uri of build.logFiles.slice(-2)){if(typeof uri!=='string'||new URL(uri).protocol!=='https:')continue;try{const response=await fetch(uri,{signal:AbortSignal.timeout(15000)});for(const line of(await response.text()).split('\n'))try{const row=JSON.parse(line);if(typeof row.phase==='string'&&/^[A-Z][A-Z0-9_-]{2,60}$/.test(row.phase))phases.push(row.phase);}catch{}}catch{}}
 safe.phases=[...new Set(phases)];
}
await writeFile('.agents/logs/21/eas-queue-latest.json',JSON.stringify(safe,null,2));
await writeFile('.agents/test-kriyan/eas-build-latest.json',JSON.stringify(build,null,2));
console.log(JSON.stringify(safe));
