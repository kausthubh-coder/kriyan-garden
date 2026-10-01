import { createServer } from 'node:https';
import { request } from 'node:http';
import { readFile } from 'node:fs/promises';
const directory=new URL('../test-kriyan/',import.meta.url);
const server=createServer({key:await readFile(new URL('localhost.key',directory)),cert:await readFile(new URL('localhost.crt',directory))},(incoming,outgoing)=>{
 const upstream=request({hostname:'127.0.0.1',port:3500,path:incoming.url,method:incoming.method,headers:{...incoming.headers,'x-forwarded-proto':'https','x-forwarded-host':'localhost:3543'}},response=>{outgoing.writeHead(response.statusCode??502,response.headers);response.pipe(outgoing);});
 upstream.on('error',()=>outgoing.writeHead(502).end('The local QA server is unavailable.'));
 incoming.pipe(upstream);
});
server.listen(3543,'127.0.0.1');
