const assert = require('node:assert/strict');
const http = require('node:http');
(async()=>{
 let calls=0,lastBytes=0,lastAuth='';
 const upstream=http.createServer(async(req,res)=>{let bytes=0;for await(const chunk of req)bytes+=chunk.length;calls++;lastBytes=bytes;lastAuth=req.headers['x-otp-password']||'';res.setHeader('Content-Type','application/json');res.statusCode=lastAuth==='synthetic-proxy-fixture'?200:401;res.end(JSON.stringify({ok:res.statusCode===200}));});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 Object.assign(process.env,{NODE_ENV:'test',VERCEL:'1',VERCEL_ENV:'preview',OTP_ENV:'sandbox',OTP_OS_UPSTREAM_URL:`http://127.0.0.1:${upstream.address().port}`,OTP_PUBLIC_SITE_ORIGIN:'https://qa.example.test'});
 const app=require('../server.js');const site=app.listen(0,'127.0.0.1');await new Promise(r=>site.once('listening',r));
 const origin=`http://127.0.0.1:${site.address().port}`;
 const send=(path,bytes,auth=true)=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'x-otp-password':'synthetic-proxy-fixture'}:{})},body:JSON.stringify({image:'x'.repeat(bytes)})});
 try{
 const bodySize=2700000;assert.equal((await send('/os/api/v1/black-card/render',bodySize)).status,200);assert.ok(lastBytes>bodySize);assert.equal(lastAuth,'synthetic-proxy-fixture');
 assert.equal((await send('/os/api/v1/black-card/render',bodySize,false)).status,401,'OS authorization remains authoritative');
 const before=calls;
 assert.equal((await send('/os/api/v1/anything',bodySize)).status,413);
 assert.equal((await send('/os/api/v1/black-card-not-really/render',bodySize)).status,413);
 assert.equal((await send('/os/api/v1/black-card/render',4300000)).status,413);
 assert.equal(calls,before,'Oversized requests are rejected before forwarding');
 assert.equal((await send('/os/api/v1/anything',100)).status,200);
 console.log('BLACK CARD proxy: 2 MB image transport, upstream auth, 4 MB cap and unchanged ordinary limits passed.');
 }finally{await new Promise(r=>site.close(r));await new Promise(r=>upstream.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
