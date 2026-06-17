const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  adminSweepPasscodeEnv,
  adminSweepTokenEnv,
  envFlagEnabled,
  resolveAdminToken,
  runSweep,
} = require('../scripts/prod_sweep_v2_runner');

console.log('ADMIN SWEEP AUTH CONTRACT...');

const ORIGINAL_ENV = {
  OTP_SWEEP_ADMIN_PASSCODE: process.env.OTP_SWEEP_ADMIN_PASSCODE,
  OTP_SWEEP_ADMIN_TOKEN: process.env.OTP_SWEEP_ADMIN_TOKEN,
  OTP_ADMIN_TOKEN: process.env.OTP_ADMIN_TOKEN,
  OTP_ADMIN_PASSCODE: process.env.OTP_ADMIN_PASSCODE,
  ADMIN_PASSCODE: process.env.ADMIN_PASSCODE,
  OTP_SITE_ADMIN_PASSCODE: process.env.OTP_SITE_ADMIN_PASSCODE,
  JWT_SECRET: process.env.JWT_SECRET,
};
const originalFetch = global.fetch;

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearSweepAuthEnv() {
  for (const key of Object.keys(ORIGINAL_ENV)) delete process.env[key];
}

function response(body, status = 200, contentType = 'application/json') {
  return new Response(contentType.includes('json') ? JSON.stringify(body) : String(body), {
    status,
    headers: { 'content-type': contentType },
  });
}

function publicAndAdminFetch({ loginStatus = 200, token = 'header.payload.signature', expectedPasscode = 'unit-test-passcode' } = {}) {
  return async (url, init = {}) => {
    const pathname = new URL(String(url)).pathname;
    if (pathname === '/public-ok') {
      return response('<html>public marker</html>', 200, 'text/html');
    }
    if (pathname === '/api/auth/login') {
      const body = JSON.parse(String(init.body || '{}'));
      assert.equal(body.passcode, expectedPasscode);
      assert.ok(!String(init.body || '').includes('admin@example.com'), 'sweep login must not send email unless the route requires it');
      if (loginStatus !== 200) return response({ success: false, message: 'Access Denied' }, loginStatus);
      return response({ success: true, token });
    }
    if (pathname === '/api/admin/qa/sweep') {
      assert.equal(init.headers?.Authorization, `Bearer ${token}`);
      return response({ success: true, fixtures: {}, mutationPolicy: 'read_only' });
    }
    return response('not found', 404, 'text/plain');
  };
}

(async () => {
  try {
    clearSweepAuthEnv();

    const runnerSrc = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'prod_sweep_v2_runner.js'), 'utf8');
    assert.ok(!runnerSrc.includes("require('jsonwebtoken')"), 'production sweeps must not mint admin JWTs locally');
    assert.ok(!runnerSrc.includes('JWT_SECRET env is unavailable'), 'missing JWT_SECRET must not control admin sweep auth');

    assert.equal(envFlagEnabled('true'), true);
    assert.equal(envFlagEnabled('1'), true);
    assert.equal(envFlagEnabled('false'), false);

    process.env.OTP_ADMIN_PASSCODE = 'legacy-passcode';
    process.env.OTP_SWEEP_ADMIN_PASSCODE = 'unit-test-passcode';
    assert.deepEqual(adminSweepPasscodeEnv(), {
      value: 'unit-test-passcode',
      source: 'OTP_SWEEP_ADMIN_PASSCODE'
    });

    process.env.OTP_ADMIN_TOKEN = 'legacy.header.payload';
    process.env.OTP_SWEEP_ADMIN_TOKEN = 'sweep.header.payload';
    assert.deepEqual(adminSweepTokenEnv(), {
      value: 'sweep.header.payload',
      source: 'OTP_SWEEP_ADMIN_TOKEN'
    });

    clearSweepAuthEnv();
    global.fetch = publicAndAdminFetch();
    const missingCredsSweep = await runSweep({
      baseUrl: 'https://www.onlytrueperspective.tech',
      schema: 'unit-sweep',
      publicTargets: [{ name: 'public', path: '/public-ok', kind: 'html', markers: ['public marker'] }],
      adminTargets: [{ name: 'admin-qa-sweep', path: '/api/admin/qa/sweep', kind: 'json' }],
      browserSmoke: false,
    });
    assert.equal(missingCredsSweep.ok, true);
    assert.equal(missingCredsSweep.adminAuth.configured, false);
    assert.equal(missingCredsSweep.adminAuth.attempted, false);
    assert.deepEqual(missingCredsSweep.skipped, ['admin-qa-sweep']);
    assert.match(missingCredsSweep.warnings.join(' '), /OTP_SWEEP_ADMIN_PASSCODE|skipping admin-authenticated/i);

    clearSweepAuthEnv();
    process.env.OTP_SWEEP_ADMIN_PASSCODE = 'unit-test-passcode';
    global.fetch = publicAndAdminFetch({ loginStatus: 401 });
    const badPasscodeSweep = await runSweep({
      baseUrl: 'https://www.onlytrueperspective.tech',
      schema: 'unit-sweep',
      publicTargets: [{ name: 'public', path: '/public-ok', kind: 'html', markers: ['public marker'] }],
      adminTargets: [{ name: 'admin-qa-sweep', path: '/api/admin/qa/sweep', kind: 'json' }],
      browserSmoke: false,
    });
    assert.equal(badPasscodeSweep.ok, false);
    assert.equal(badPasscodeSweep.adminAuth.attempted, true);
    assert.match(badPasscodeSweep.errors.join(' '), /Admin sweep login failed \(401\)/);
    assert.ok(!JSON.stringify(badPasscodeSweep).includes('unit-test-passcode'), 'passcode must not appear in sweep output');

    clearSweepAuthEnv();
    process.env.OTP_SWEEP_ADMIN_TOKEN = 'not-a-jwt';
    global.fetch = publicAndAdminFetch();
    const badToken = await resolveAdminToken('https://www.onlytrueperspective.tech');
    assert.equal(badToken.token, '');
    assert.equal(badToken.attempted, true);
    assert.match(badToken.error, /not a usable admin JWT/);
    assert.ok(!badToken.error.includes('not-a-jwt'), 'invalid token value must not appear in error output');
    const badTokenSweep = await runSweep({
      baseUrl: 'https://www.onlytrueperspective.tech',
      schema: 'unit-sweep',
      publicTargets: [{ name: 'public', path: '/public-ok', kind: 'html', markers: ['public marker'] }],
      adminTargets: [{ name: 'admin-qa-sweep', path: '/api/admin/qa/sweep', kind: 'json' }],
      browserSmoke: false,
    });
    assert.equal(badTokenSweep.ok, false);
    assert.match(badTokenSweep.errors.join(' '), /not a usable admin JWT/);
    assert.ok(!JSON.stringify(badTokenSweep).includes('not-a-jwt'), 'invalid token value must not appear in sweep output');

    clearSweepAuthEnv();
    process.env.OTP_SWEEP_ADMIN_PASSCODE = 'unit-test-passcode';
    global.fetch = publicAndAdminFetch();
    const authedSweep = await runSweep({
      baseUrl: 'https://www.onlytrueperspective.tech',
      schema: 'unit-sweep',
      publicTargets: [{ name: 'public', path: '/public-ok', kind: 'html', markers: ['public marker'] }],
      adminTargets: [{
        name: 'admin-qa-sweep',
        path: '/api/admin/qa/sweep',
        kind: 'json',
        shape: (payload) => Boolean(payload && payload.success === true && payload.fixtures && payload.mutationPolicy)
      }],
      browserSmoke: false,
    });
    const serializedAuthed = JSON.stringify(authedSweep);
    assert.equal(authedSweep.ok, true);
    assert.equal(authedSweep.adminAuth.configured, true);
    assert.equal(authedSweep.adminAuth.source, 'OTP_SWEEP_ADMIN_PASSCODE');
    assert.equal(authedSweep.adminAuth.method, 'login');
    assert.equal(authedSweep.adminChecks.length, 1);
    assert.equal(authedSweep.adminChecks[0].ok, true);
    assert.ok(authedSweep.adminChecks[0].payloadSummary, 'admin checks may expose a bounded payload summary');
    assert.ok(!authedSweep.adminChecks[0].payload, 'admin checks must not print full protected payloads');
    assert.ok(!serializedAuthed.includes('unit-test-passcode'), 'passcode must not appear in authenticated sweep output');
    assert.ok(!serializedAuthed.includes('header.payload.signature'), 'JWT must not appear in authenticated sweep output');
    assert.ok(!serializedAuthed.toLowerCase().includes('cookie'), 'cookies must not appear in sweep output');
  } finally {
    global.fetch = originalFetch;
    restoreEnv();
  }

  console.log('   ADMIN SWEEP AUTH CONTRACT OK');
})().catch((error) => {
  global.fetch = originalFetch;
  restoreEnv();
  console.error(error);
  process.exit(1);
});
