const assert = require('node:assert/strict');
const test = require('node:test');
const { buildOtpSiteQaReadiness } = require('../server/qa-readiness');

const backend = {
  ok: true,
  environment: 'sandbox',
  supabaseProjectRef: 'tybgpykqaqaeoghdvpet',
  stripeMode: 'test',
  databaseReadOnlyCheck: 'passed'
};

test('Site Preview readiness requires sandbox isolation and the verified QA backend', () => {
  const result = buildOtpSiteQaReadiness({
    isPreview: true,
    isolationActive: true,
    stripeKey: 'sk_test_synthetic',
    upstreamOrigin: 'https://otp-os-git-feature-first-blood-ii-only-true-perspective.vercel.app',
    backendPayload: backend
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.backend.supabaseProjectRef, 'tybgpykqaqaeoghdvpet');
  assert.equal(JSON.stringify(result.body).includes('sk_test_'), false);
  assert.equal(JSON.stringify(result.body).includes('whsec_'), false);
});

test('Site Preview readiness rejects Production targets, live Stripe, and non-Preview access', () => {
  const base = {
    isPreview: true,
    isolationActive: true,
    stripeKey: 'sk_test_synthetic',
    upstreamOrigin: 'https://otp-os-git-feature-first-blood-ii-only-true-perspective.vercel.app',
    backendPayload: backend
  };
  assert.equal(buildOtpSiteQaReadiness({ ...base, upstreamOrigin: 'https://otp-os.vercel.app' }).statusCode, 503);
  assert.equal(buildOtpSiteQaReadiness({ ...base, stripeKey: 'sk_live_forbidden' }).statusCode, 503);
  assert.equal(buildOtpSiteQaReadiness({ ...base, isPreview: false }).statusCode, 404);
  assert.equal(buildOtpSiteQaReadiness({ ...base, backendPayload: { ...backend, supabaseProjectRef: 'ckumhowhucbbmpdeqkrl' } }).statusCode, 503);
});
