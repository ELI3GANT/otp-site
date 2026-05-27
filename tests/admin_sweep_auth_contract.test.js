const assert = require('assert');

const {
  resolveAdminToken,
  mintAdminTokenFromJwtSecret,
  envFlagEnabled,
} = require('../scripts/prod_sweep_v2_runner');

console.log('ADMIN SWEEP AUTH CONTRACT...');

const ORIGINAL_ENV = {
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

(async () => {
  try {
    delete process.env.ADMIN_PASSCODE;
    delete process.env.OTP_SITE_ADMIN_PASSCODE;
    process.env.OTP_ADMIN_PASSCODE = 'unit-test-passcode';

    let loginCalls = 0;
    global.fetch = async (url, init) => {
      loginCalls += 1;
      assert.ok(String(url).endsWith('/api/auth/login'));
      const body = JSON.parse(String(init.body || '{}'));
      assert.equal(body.passcode, 'unit-test-passcode');
      return jsonResponse({ success: true, token: 'header.payload.signature' });
    };

    const loginAuth = await resolveAdminToken('https://www.onlytrueperspective.tech', 'stale.token.value');
    assert.equal(loginAuth.source, 'login');
    assert.equal(loginAuth.token, 'header.payload.signature');
    assert.equal(loginCalls, 1);
    assert.equal(envFlagEnabled('true'), true);
    assert.equal(envFlagEnabled('1'), true);
    assert.equal(envFlagEnabled('false'), false);

    delete process.env.OTP_ADMIN_PASSCODE;
    process.env.JWT_SECRET = 'unit-test-jwt-secret-with-enough-entropy';
    global.fetch = async () => {
      throw new Error('login should not run when JWT_SECRET fallback is available');
    };

    const mintedAuth = await resolveAdminToken('https://www.onlytrueperspective.tech', 'stale.env.token');
    assert.equal(mintedAuth.source, 'jwt_secret');
    assert.ok(mintedAuth.token.split('.').length === 3);

    const directMint = mintAdminTokenFromJwtSecret();
    assert.equal(directMint.source, 'jwt_secret');
    assert.ok(directMint.token.split('.').length === 3);

    delete process.env.JWT_SECRET;
    const envAuth = await resolveAdminToken('https://www.onlytrueperspective.tech', 'env.header.payload');
    assert.equal(envAuth.source, 'env');
    assert.equal(envAuth.token, 'env.header.payload');

    delete process.env.OTP_ADMIN_TOKEN;
    const skipped = await resolveAdminToken('https://www.onlytrueperspective.tech', '');
    assert.equal(skipped.token, '');
    assert.match(skipped.warning, /JWT_SECRET|OTP_ADMIN_TOKEN|admin passcode/i);
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
