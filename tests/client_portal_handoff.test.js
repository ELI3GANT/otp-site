const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { forwardClientPortalRead } = require('../server/client-portal-handoff');

test('Site preserves token-bound canonical reads and safe unavailable states', async () => {
  let mode = 'good';
  const calls = [];
  const app = express();
  app.get('/portal/:token', (req,res) => forwardClientPortalRead(req,res,{
    base:'https://os.example.test',
    fetchImpl: async (url, options) => {
      calls.push({url,options});
      if (mode === 'expired') return new Response('private stack', {status:410});
      if (mode === 'failed') throw new Error('service-role secret');
      if (mode === 'malformed') return Response.json({ok:true,secret:'private'});
      return Response.json({ok:true,client:{name:'QA Client'},project:{title:'Booked website'},documents:[]});
    }
  }));
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const good = await fetch(`${base}/portal/qa-invite-token`);
    assert.equal(good.status,200);
    assert.match(good.headers.get('cache-control'),/no-store/);
    assert.equal(calls[0].url,'https://os.example.test/api/v1/client/portal/qa-invite-token');
    assert.equal(calls[0].options.redirect,'error');
    assert.equal((await fetch(`${base}/portal/abc`)).status,404);
    assert.equal(calls.length,1);
    for (const [value,status] of [['expired',410],['failed',503],['malformed',503]]) {
      mode=value;
      const response=await fetch(`${base}/portal/qa-invite-token`);
      assert.equal(response.status,status);
      const text=await response.text();
      assert.equal(/private|secret|stack/.test(text),false);
    }
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
