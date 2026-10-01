import { mkdir, writeFile, readFile } from "node:fs/promises";
import { run } from "../../packages/cli/src/run";
import { parse } from "@kriyan/core";
import type { CredentialStore } from "../../packages/cli/src/credentials";
import type { Http } from "../../packages/cli/src/auth";
type Fixture = { areas:{key:string;name:string}[]; goals:{key:string;title:string;area:string;targetDate:string;metric:Record<string,unknown>}[]; tasks:{title:string;area:string;date:string|null;time:string|null;durationMinutes:number|null;done?:boolean;deadline?:string|null}[] };
const fixture=JSON.parse(await readFile(".agents/skills/test-kriyan/scripts/fixtures/sample.json","utf8")) as Fixture;
const areas=fixture.areas.map(area=>({id:area.key,name:area.name}));
const date=(value:string|null|undefined)=>value?.replace(/\$today([+-]\d+)?/,(_match,offset:string|undefined)=>{const day=new Date("2026-10-01T12:00:00Z");day.setUTCDate(day.getUTCDate()+Number(offset??0));return day.toISOString().slice(0,10);})??null;
const tasks=fixture.tasks.map((task,index)=>({...task,id:`fixturetask${String(index).padStart(8,"0")}`,areaId:task.area,date:date(task.date),deadline:date(task.deadline),status:task.done?"completed":"active"}));
const store:CredentialStore = {async read(){return {accessToken:"fixture",clientId:"fixture",resource:"https://app.example/api/v1"};},async write(){},async clear(){}};
const http:Http=async (address,init)=>{
 const url=new URL(address);const path=url.pathname;
 let value:unknown={};
 if(path.endsWith("/spaces")) value={areas};
 else if(path.endsWith("/goals")) value={goals:fixture.goals.map(goal=>({...goal,id:goal.key,areaId:goal.area,status:"active",targetDate:date(goal.targetDate)}))};
 else if(path.endsWith("/tasks/quick-add")) {
  const body=JSON.parse(String(init?.body)) as {text:string};
  const parsed=parse(body.text,{today:"2026-10-01",defaultDate:null,defaultAreaId:"school",areas:areas.map(a=>({...a,_id:a.id})),projects:[]});
  value={task:parsed,parsed,readBack:`Added task "${parsed.title}" in School; scheduled for ${parsed.date} at ${parsed.time??"any time"}.`};
 } else if(path.endsWith("/tasks")) value={tasks:url.searchParams.get("text")?tasks.filter(task=>task.title.toLowerCase().includes(String(url.searchParams.get("text")).toLowerCase())):tasks};
 else if(path.endsWith("/week")) value={days:Array.from({length:7},(_,offset)=>{const current=date(`$today${offset-3>=0?"+":""}${offset-3}`);const rows=tasks.filter(t=>t.date===current&&t.status==="active");const plannedMinutesByArea=Object.fromEntries(areas.map(area=>[area.id,rows.filter(t=>t.areaId===area.id).reduce((sum,t)=>sum+(t.durationMinutes??0),0)]));const plannedMinutes=rows.reduce((sum,t)=>sum+(t.durationMinutes??0),0);return {date:current,plannedMinutesByArea,plannedMinutes,freeMinutes:240-plannedMinutes};}),deadlines:tasks.filter(t=>t.deadline).map(t=>({...t,timeNeededMinutes:t.durationMinutes,timeFreeMinutes:210}))};
 else if(path.endsWith("/day")) {const rows=tasks.filter(t=>t.date==="2026-10-01"),planned=rows.filter(t=>t.status==="active").reduce((sum,t)=>sum+(t.durationMinutes??0),0);value={date:"2026-10-01",timed:rows.filter(t=>t.time),anytime:rows.filter(t=>!t.time),unscheduled:tasks.filter(t=>!t.date&&t.status==="active"),events:[],plannedMinutes:planned,freeMinutes:240-planned,summary:`${rows.filter(t=>t.status==="active").length} tasks left.`};}
 return new Response(JSON.stringify(value),{headers:{"content-type":"application/json"}});
};
const captures=[];
for(const args of [["--help"],["today"],["week"],["list"],["goals"],["add","Review slides tomorrow 2pm #School 45m"],["done","Read"],["whoami"]]) {
 const lines:string[]=[];const signedOut=args[0]==="whoami";
 const exit=await run(args,{http,store:signedOut?{async read(){return null;},async write(){},async clear(){}}:store,env:{KRIYAN_URL:"https://app.example"},timezone:"America/New_York",now:()=>new Date("2026-10-01T14:00:00Z"),stdout:line=>lines.push(line),stderr:line=>lines.push(line)});
 captures.push({surface:"CLI",group:"Terminal",state:signedOut?"Not signed in":args.join(" "),command:`kriyan ${args.join(" ")}`,exit,text:lines.join("\n"),evidence:"Real CLI run() with the test HTTP and credential dependencies. No live account."});
}
await mkdir("docs/design/gallery",{recursive:true});
await writeFile("docs/design/gallery/cli-manifest.json",JSON.stringify(captures,null,2));
console.log(`CLI captures: ${captures.length}`);
