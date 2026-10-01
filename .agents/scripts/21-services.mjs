import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import './21-tls-browser.mjs';
import { promisify } from 'node:util';
import { oauthFlow } from '../skills/test-kriyan/scripts/oauth.mjs';
import { privatePath, root } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { clerkClient } from '../skills/test-kriyan/scripts/lib/users.mjs';
import { redact } from '../skills/test-kriyan/scripts/lib/output.mjs';
import { user, backend, cleanup, ref, prod, save } from './21-common.mjs';
const base=process.env.E2E_BASE_URL??'https://app.kriyan.app', production=!['localhost','127.0.0.1'].includes(new URL(base).hostname);
const execute=promisify(execFile), receipts=[];
async function record(check,work) {
 if(process.env.QA_ONLY&&!check.includes(process.env.QA_ONLY)&&!check.includes('PKCE')&&!(process.env.QA_ONLY==='read limiter'&&check.includes('endpoint validation')))return;
 try {receipts.push({check,status:'pass',detail:await work()});}
 catch(error){receipts.push({check,status:'fail',detail:redact(error.message).slice(0,650)});}
 await save(`services-${production?'production':'local'}${process.env.QA_SUFFIX??''}-results`,receipts); console.log(check,receipts.at(-1).status);
}
const a=await user('services'), b=await user('services-other');
const ba=await backend(a,production?prod:undefined), bb=await backend(b,production?prod:undefined);
let grant;
const cal={today:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date()),timezone:'America/New_York'};
async function mcp(name,args={},protocol='2026-07-28',file='21-mcp.json') {
 const options=['--base',base,'--token-file',file,'--protocol',protocol,...(name?['--call',name,JSON.stringify({...cal,...args})]:['--list'])];
 const {stdout}=await execute(process.execPath,['.agents/skills/test-kriyan/scripts/mcp.mjs',...options],{cwd:root,windowsHide:true,timeout:120000});
 const result=JSON.parse(stdout); if(result.isError) throw new Error(JSON.stringify(result)); return result.structuredContent??result;
}
let apiGrant;
async function request(path,method='GET',data,token=apiGrant.accessToken) {
 const response=await fetch(`${base}/api/v1${path}`,{method,headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},...(data?{body:JSON.stringify({...cal,...data})}:{})});
 return {status:response.status,body:await response.json(),challenge:response.headers.get('www-authenticate'),retryAfter:response.headers.get('retry-after')};
}
try {
 for(const target of [ba,bb]) {await target.client.mutation(ref('profiles:ensure'),{timezone:cal.timezone});await target.client.mutation(ref('profiles:completeOnboarding'),{});}
 const areas=await ba.client.query(ref('areas:list'),{}); const area=areas[0]._id;
 const foreign=await bb.client.mutation(ref('tasks:create'),{title:'QA21 foreign task',date:cal.today});
 const foreignArea=(await bb.client.query(ref('areas:list'),{}))[0]._id;
 const foreignGoal=await bb.client.mutation(ref('goals:create'),{title:'QA21 foreign goal',areaId:foreignArea,startDate:cal.today});
 await record('Production MCP DCR, real PKCE and consent',async()=>{grant=await oauthFlow(a.email,{base,password:a.password,resource:'mcp',register:true,out:'21-mcp.json'});return {registered:grant.registered,resource:grant.resource,scopes:grant.scopes};});
 await record('API resource PKCE and consent',async()=>{apiGrant=await oauthFlow(a.email,{base,password:a.password,resource:'api',refresh:true,out:'21-api.json'});return {resource:apiGrant.resource,scopes:apiGrant.scopes};});
 if(grant) {
  await record('Both MCP protocol revisions list 21 tools',async()=>{for(const version of ['2026-07-28','2025-11-25'])assert.equal((await mcp(null,{},version)).tools.length,21);return 21;});
  await record('Legacy MCP revision reads, writes and returns saved entities',async()=>{await mcp('get_day',{date:cal.today},'2025-11-25');const added=await mcp('quick_add',{text:'QA21 legacy protocol today #School'},'2025-11-25');await mcp('complete_task',{id:added.id},'2025-11-25');await ba.refresh();assert.equal((await ba.client.query(ref('tasks:get'),{id:added.id})).status,'completed');return {protocol:'2025-11-25',storedId:added.id,status:'completed'};});
  const cases=[['get_overview',{}],['get_day',{date:cal.today}],['get_week',{}],['list_tasks',{}],['list_spaces',{}],['list_goals',{}]];
  for(const [name,args]of cases)await record(`MCP ${name}`,()=>mcp(name,args));
  let project, goal, milestonesGoal,task,milestone;
  await record('MCP create_project and update_project read-back',async()=>{project=await mcp('create_project',{name:'QA21 course',area,kind:'course'});const updated=await mcp('update_project',{id:project.id,name:'QA21 renamed course'});assert.equal(updated.project.name,'QA21 renamed course');return updated;});
  await record('MCP create_goal, update_goal and set_goal_progress',async()=>{goal=await mcp('create_goal',{title:'QA21 number goal',area,metric:{kind:'number',unit:'pages',current:0,target:20}});await mcp('update_goal',{id:goal.id,note:'Read-back note'});await mcp('set_goal_progress',{id:goal.id,current:5});const saved=await mcp('get_goal',{id:goal.id});assert.equal(saved.goal.metric.current,5);return saved;});
  await record('MCP add_milestone and complete_milestone',async()=>{milestonesGoal=await mcp('create_goal',{title:'QA21 milestone goal',area,metric:{kind:'milestones'}});milestone=await mcp('add_milestone',{goalId:milestonesGoal.id,title:'First milestone'});const done=await mcp('complete_milestone',{id:milestone.id});assert.ok(done.milestone.doneAt);return done;});
  await record('MCP create_task, update_task and get_task with direct read-back',async()=>{task=await mcp('create_task',{title:'QA21 structured',area,date:cal.today,projectId:project?.id,goalId:goal?.id});await mcp('update_task',{id:task.id,notes:'QA21 saved notes',durationMinutes:25});const saved=await mcp('get_task',{id:task.id});await ba.refresh();const direct=await ba.client.query(ref('tasks:get'),{id:task.id});assert.equal(direct.notes,'QA21 saved notes');return saved;});
  await record('MCP move_task, complete_task and search',async()=>{await mcp('move_task',{id:task.id,date:cal.today,time:'14:30'});await mcp('complete_task',{id:task.id});const saved=await mcp('get_task',{id:task.id});assert.equal(saved.task.status,'completed');await mcp('search',{query:'QA21'});return saved;});
  await record('MCP quick_add optional length and stored completion',async()=>{const added=await mcp('quick_add',{text:'QA21 MCP grammar today #School'});assert.equal(added.task.durationMinutes,null);await ba.refresh();assert.equal((await ba.client.query(ref('tasks:get'),{id:added.id})).title,added.task.title);return added;});
  await record('MCP foreign id read and write refused',async()=>{for(const [name,args]of [['get_task',{id:foreign._id}],['update_task',{id:foreign._id,title:'Intrusion'}]])await assert.rejects(()=>mcp(name,args));await bb.refresh();assert.equal((await bb.client.query(ref('tasks:get'),{id:foreign._id})).title,foreign.title);return {unchanged:true};});
  await record('Claude Code real HTTP MCP client: get_day and quick_add',async()=>{
   const config=privatePath('21-claude-mcp.json');await writeFile(config,JSON.stringify({mcpServers:{kriyanqa:{type:'http',url:base+'/mcp',headers:{Authorization:`Bearer ${grant.accessToken}`}}}}));
   const prompt=`Use the kriyanqa MCP tools to call get_day for ${cal.today}, timezone ${cal.timezone}, then quick_add exactly "QA21 Claude client today #School" with that today and timezone. Perform no other writes. Report the stored readBack. This is a disposable QA account.`;
   const {stdout}=await execute('C:/Users/kaust/scoop/apps/nodejs-lts/current/bin/node_modules/@anthropic-ai/claude-code/bin/claude.exe',['-p',prompt,'--mcp-config',config,'--strict-mcp-config','--allowedTools','mcp__kriyanqa__get_day,mcp__kriyanqa__quick_add','--output-format','stream-json','--verbose','--max-turns','6','--no-session-persistence'],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:4000000});
   const safe=redact(stdout);await writeFile('.agents/logs/21/claude-client.jsonl',safe);
   const events=stdout.split('\n').filter(Boolean).map(line=>JSON.parse(line));const tools=events.flatMap(event=>event.message?.content??[]).filter(item=>item.type==='tool_use').map(item=>item.name);
   assert.ok(tools.some(name=>name.endsWith('__get_day')));assert.ok(tools.some(name=>name.endsWith('__quick_add')));
   await ba.refresh();const task=(await ba.client.query(ref('tasks:list'),{})).find(task=>task.title==='QA21 Claude client');assert.ok(task);assert.equal(task.durationMinutes,null);return {tools,storedId:task._id,optionalLength:null};
  });
  if(!production&&process.env.QA_CLOCK==='1')await record('Real OAuth token expiration at the local resource server',async()=>{
   const verified=await clerkClient().idPOAuthAccessToken.verify(grant.accessToken,{audience:grant.resource});assert.equal(typeof verified.expiration,'number');
   const clockFile=privatePath('clock-offset.txt');
   try{await writeFile(clockFile,String((verified.expiration+15)*1000-Date.now()));await assert.rejects(()=>mcp(null));}
   finally{await writeFile(clockFile,'0');}
   assert.equal((await mcp(null)).tools.length,21);return {expiration:verified.expiration,onlyLocalServerClockAdvanced:true,unchangedTokenAcceptedAfterRestore:true};
  });
 }
 if(apiGrant) {
  await record('API endpoint validation and no-token coverage',async()=>{
   await ba.refresh();const task=await ba.client.mutation(ref('tasks:create'),{title:'QA21 route validation'}),goal=await ba.client.mutation(ref('goals:create'),{title:'QA21 route validation goal',areaId:area,startDate:cal.today});
   const routes=[['/auth-config','GET'],['/me','GET'],['/overview','GET'],['/day','GET'],['/week','GET'],['/tasks','GET'],['/goals','GET'],['/spaces','GET'],['/tasks','POST'],['/tasks/quick-add','POST'],[`/tasks/${task._id}`,'PATCH'],[`/tasks/${task._id}/move`,'POST'],[`/tasks/${task._id}/complete`,'POST'],['/goals','POST'],[`/goals/${goal._id}`,'PATCH']];const statuses=[];
   for(const [path,method]of routes){const invalid=method==='GET'?await request(path+'?timezone=not-a-timezone'):await request(path,method,{timezone:'not-a-timezone'});assert.equal(invalid.status,400);const response=await fetch(base+'/api/v1'+path+'?timezone=America%2FNew_York',{method,headers:{'content-type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify({timezone:cal.timezone})})});assert.equal(response.status,path==='/auth-config'?200:401);statuses.push({path,method,invalidInput:400,noToken:response.status});}
   return statuses;
  });
  for(const path of ['/auth-config','/me','/overview','/day','/week','/tasks','/goals','/spaces'])await record(`API GET ${path}`,async()=>{const r=await request(path+`?timezone=America%2FNew_York`);assert.equal(r.status,200);return r.body;});
  await record('API task create, patch, move, complete and read-back',async()=>{const created=await request('/tasks','POST',{title:'QA21 API task',area,date:cal.today});assert.equal(created.status,201);const id=created.body.id;assert.equal((await request(`/tasks/${id}`,'PATCH',{notes:'API notes'})).status,200);assert.equal((await request(`/tasks/${id}/move`,'POST',{date:cal.today,time:'15:30'})).status,200);assert.equal((await request(`/tasks/${id}/complete`,'POST',{})).status,200);await ba.refresh();const saved=await ba.client.query(ref('tasks:get'),{id});assert.equal(saved.status,'completed');assert.equal(saved.notes,'API notes');return saved;});
  await record('API quick-add and goal create/update read-backs',async()=>{const task=await request('/tasks/quick-add','POST',{text:'QA21 API parsed today 4pm 30m'});assert.equal(task.status,201);const goal=await request('/goals','POST',{title:'QA21 API goal',area});assert.equal(goal.status,201);assert.equal((await request(`/goals/${goal.body.id}`,'PATCH',{note:'Saved through API'})).status,200);return {task:task.body,goal:goal.body};});
  await record('API validation and owner isolation',async()=>{assert.equal((await request('/tasks','POST',{title:'Bad',date:null,time:'14:00'})).status,400);for(const path of [`/tasks/${foreign._id}`,`/tasks/${foreign._id}/complete`])assert.equal((await request(path,path.endsWith('complete')?'POST':'PATCH',path.endsWith('complete')?{}:{title:'Forbidden'})).status,404);return {validation:400,foreign:404};});
  if(grant)await record('API and MCP refuse each other’s audience',async()=>{assert.equal((await request('/day?timezone=America%2FNew_York','GET',null,grant.accessToken)).status,401);await assert.rejects(()=>mcp(null,{},'2026-07-28','21-api.json'));return {api:401,mcp:401};});
  await record('API and MCP task/goal isolation in both directions',async()=>{
   const statuses=[(await request(`/goals/${foreignGoal._id}`,'PATCH',{note:'Forbidden'})).status];
   if(grant){await assert.rejects(()=>mcp('get_goal',{id:foreignGoal._id}));await assert.rejects(()=>mcp('update_goal',{id:foreignGoal._id,note:'Forbidden'}));}
   const otherApi=await oauthFlow(b.email,{base,password:b.password,resource:'api',out:'21-b-api.json'});
   const otherMcp=await oauthFlow(b.email,{base,password:b.password,resource:'mcp',out:'21-b-mcp.json'});
   await ba.refresh();const ownTask=await ba.client.mutation(ref('tasks:create'),{title:'QA21 owner A preserved',date:cal.today});const ownGoal=await ba.client.mutation(ref('goals:create'),{title:'QA21 owner A goal',areaId:area,startDate:cal.today});
   for(const [path,method,data]of [[`/tasks/${ownTask._id}`,'PATCH',{title:'Forbidden'}],[`/tasks/${ownTask._id}/move`,'POST',{date:cal.today,time:'15:00'}],[`/tasks/${ownTask._id}/complete`,'POST',{}],[`/goals/${ownGoal._id}`,'PATCH',{note:'Forbidden'}]])statuses.push((await request(path,method,data,otherApi.accessToken)).status);
   for(const [name,args]of [['get_task',{id:ownTask._id}],['update_task',{id:ownTask._id,title:'Forbidden'}],['get_goal',{id:ownGoal._id}],['update_goal',{id:ownGoal._id,note:'Forbidden'}]])await assert.rejects(()=>mcp(name,args,'2026-07-28','21-b-mcp.json'));
   await ba.refresh();await bb.refresh();assert.equal((await ba.client.query(ref('tasks:get'),{id:ownTask._id})).title,ownTask.title);assert.equal((await bb.client.query(ref('goals:get'),{id:foreignGoal._id})).title,foreignGoal.title);assert.equal((await ba.client.query(ref('goals:get'),{id:ownGoal._id})).title,ownGoal.title);assert.equal((await bb.client.query(ref('tasks:get'),{id:foreign._id})).title,foreign.title);const proof={apiStatuses:statuses,mcp:'refused',bothOwnersUnchanged:true,otherResource:otherMcp.resource};await save(`isolation-${production?'production':'local'}`,proof);assert.ok(statuses.every(status=>status===404),JSON.stringify(proof));return proof;
  });
  await record('Production shared API/MCP read limiter triggers and recovers',async()=>{
   const position=Date.now()%60000;await new Promise(resolve=>setTimeout(resolve,position>5000?62000-position:Math.max(0,2000-position)));
   // A parallel 65-action burst hits Convex's action concurrency ceiling first.
   // Pace the requests to measure the application limiter rather than capacity.
   const responses=[];for(let index=0;index<65;index++)responses.push(await request('/tasks?timezone=America%2FNew_York'));
   await save(`rate-limit-${production?'production':'local'}`,{requests:65,statusCounts:Object.fromEntries([...new Set(responses.map(r=>r.status))].map(status=>[status,responses.filter(r=>r.status===status).length])),errors:responses.filter(r=>r.status>=400).slice(0,2)});
   assert.ok(responses.some(response=>response.status===429));assert.ok(responses.some(response=>response.status===200));assert.ok(responses.filter(response=>response.status===429).every(response=>response.retryAfter==='60'));
   if(grant)await assert.rejects(()=>mcp('get_day',{date:cal.today}));
   // Honor the advertised delay rather than assuming the local and backend
   // clocks enter their fixed windows within the same 200ms.
   await new Promise(resolve=>setTimeout(resolve,60000));assert.equal((await request('/tasks?timezone=America%2FNew_York')).status,200);
   return {requests:responses.length,statusCounts:Object.fromEntries([200,429].map(status=>[status,responses.filter(response=>response.status===status).length])),retryAfter:'60',recovered:true,sharedWithMcp:!!grant};
  });
 }
 await record('No-token MCP protected-resource challenge',async()=>{const r=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json','MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/list'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});assert.equal(r.status,401);assert.match(r.headers.get('www-authenticate'),/resource_metadata/);return {status:r.status};});
 await record('OAuth discovery and API missing bearer challenge',async()=>{for(const path of ['/.well-known/oauth-protected-resource/mcp','/.well-known/oauth-protected-resource/api/v1']){const response=await fetch(base+path);assert.equal(response.status,200);const metadata=await response.json();assert.ok(metadata.resource);assert.ok(metadata.authorization_servers?.length);}const response=await fetch(base+'/api/v1/me?timezone=America%2FNew_York');assert.equal(response.status,401);return {discovery:200,missingBearer:401};});
 if(apiGrant&&!process.env.QA_ONLY)await writeFile(privatePath('21-cli-ready.json'),JSON.stringify({owner:a,other:b,base}));
} finally {
 if(grant?.registered) {const apps=await clerkClient().oauthApplications.list({limit:100});const app=apps.data.find(x=>x.clientId===grant.clientId);if(app)await clerkClient().oauthApplications.delete(app.id);}
 if(!apiGrant||process.env.QA_ONLY){await cleanup(a);await cleanup(b);}
}
console.log('Services finished. CLI users retained only when a grant was obtained.');
process.exitCode=receipts.some(r=>r.status==='fail')?1:0;
