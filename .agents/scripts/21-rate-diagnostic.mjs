import { ConvexHttpClient } from 'convex/browser';
import { ConvexError } from 'convex/values';
import { configuration } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { envelope } from '../skills/test-kriyan/scripts/lib/service.mjs';
import { user, cleanup, ref, save } from './21-common.mjs';
const owner=await user('rate-diagnostic'),env=configuration(),client=new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL,{logger:false});
try{const rows=[];for(let index=0;index<65;index++)rows.push(...await Promise.allSettled([client.action(ref('service:areasList'),envelope(owner.id,'areas.list',{},env.SERVICE_SECRET||env.MCP_SERVICE_SECRET))]));const error=rows.find(row=>row.status==='rejected')?.reason;const proof={success:rows.filter(row=>row.status==='fulfilled').length,rejected:rows.filter(row=>row.status==='rejected').length,name:error?.name,constructor:error?.constructor?.name,isConvex:error instanceof ConvexError,hasData:!!error&&'data' in error,data:error?.data,messageContainsRate:/RATE_LIMITED|Too many calls/.test(error?.message??''),concurrent:/concurrent/i.test(error?.message??''),limit:/limit/i.test(error?.message??''),messageSize:error?.message?.length,firstLine:error?.message?.split('\n')[0]};await save('rate-diagnostic',proof);console.log(JSON.stringify(proof));}finally{await cleanup(owner);}
