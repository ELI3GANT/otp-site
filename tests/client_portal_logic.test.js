/**
 * Client portal logic — token, payload safety, and receipt gating.
 * Pure local test: no live Supabase calls.
 */
const assert = require('assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'client-portal-test-secret';
process.env.CLIENT_PORTAL_TOKEN_TTL_DAYS = '180';
process.env.OTP_PUBLIC_SITE_ORIGIN = 'https://onlytrueperspective.tech';

const app = require('../server.js');
const hooks = app.__clientPortalTestHooks;

console.log('CLIENT PORTAL LOGIC TESTS...');

assert.ok(hooks, 'client portal test hooks are exported');
assert.strictEqual(typeof hooks.createClientPortalToken, 'function');
assert.strictEqual(typeof hooks.readClientPortalToken, 'function');
assert.strictEqual(typeof hooks.loadClientPortalRecord, 'function');
assert.strictEqual(typeof hooks.buildClientPortalData, 'function');

const jobRow = {
  job_id: 'JOB-PORTAL-SECRET-001',
  created_at: '2026-05-17T12:00:00.000Z',
  updated_at: '2026-05-17T12:10:00.000Z',
  source_type: 'otp_bookings',
  client_name: 'Alex Rivera',
  business_name: 'Rivera Studio',
  phone: '555-222-1212',
  email: 'alex@example.com',
  service_type: 'Website / Landing Page',
  package_type: 'The System',
  project_title: 'Rivera Studio Launch',
  project_description: 'Premium mobile-first booking website.',
  deliverables: 'Booking page\nClient portal\nPayment flow',
  add_ons: '',
  start_date: '2026-05-20',
  due_date: '2026-06-01',
  allow_date_override: false,
  total_price_cents: 350000,
  deposit_amount_cents: 175000,
  remaining_balance_cents: 175000,
  payment_method: null,
  payment_status: 'Unpaid',
  client_notes: 'Client wants clean status updates.',
  internal_notes: 'PRIVATE: Stripe secret and admin-only notes must never appear.',
  portfolio_permission: false,
  agreement_signed: false,
  invoice_sent: false,
  job_status: 'Quote Sent',
  created_by: 'admin',
  updated_by: 'admin'
};

const token = hooks.createClientPortalToken({
  jobId: jobRow.job_id,
  email: jobRow.email,
  updatedAt: jobRow.updated_at
});
assert.ok(/^otp1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token), 'encrypted token shape is valid');
assert.ok(!token.includes(jobRow.job_id), 'token does not expose raw job ID');
assert.ok(!token.includes(jobRow.email), 'token does not expose email');

function fakePortalClient(result, calls = []) {
  const chain = {
    select(columns) { calls.push(['select', columns]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    async maybeSingle() { calls.push(['maybeSingle']); return result; }
  };
  return {
    from(table) { calls.push(['from', table]); return chain; }
  };
}

async function main() {
  const parsed = hooks.readClientPortalToken(token);
  assert.deepStrictEqual(parsed, { ok: true, jobId: jobRow.job_id }, 'valid portal token resolves to job id server-side');
  assert.strictEqual(hooks.readClientPortalToken('bad-token').ok, false, 'invalid token is rejected safely');

  const calls = [];
  const loaded = await hooks.loadClientPortalRecord(token, {
    client: fakePortalClient({ data: jobRow, error: null }, calls),
    storedLookup: async () => { throw new Error('stored lookup must not run for a valid encrypted token'); }
  });
  assert.deepStrictEqual(loaded.parsed, { ok: true, jobId: jobRow.job_id });
  assert.strictEqual(loaded.data, jobRow, 'valid portal data is returned deterministically');
  assert.deepStrictEqual(calls.slice(0, 3), [
    ['from', 'ops_jobs'],
    ['select', '*'],
    ['eq', 'job_id', jobRow.job_id]
  ], 'portal lookup uses a structured equality query');

  const missing = await hooks.loadClientPortalRecord(token, {
    client: fakePortalClient({ data: null, error: null })
  });
  assert.strictEqual(missing.data, null, 'missing portal record is handled without a crash');

  const malformed = await hooks.loadClientPortalRecord('bad-token', {
    client: fakePortalClient({ data: jobRow, error: null }),
    storedLookup: async () => null
  });
  assert.strictEqual(malformed.parsed.ok, false);
  assert.strictEqual(malformed.data, null, 'malformed token produces a controlled not-found result');

  await assert.rejects(
    hooks.loadClientPortalRecord(token, {
      client: fakePortalClient({ data: null, error: new Error('isolated Supabase fixture error') })
    }),
    /isolated Supabase fixture error/,
    'Supabase failures are surfaced to the route-level generic error handler'
  );

  const realNow = Date.now;
  try {
    Date.now = () => realNow() + (181 * 24 * 60 * 60 * 1000);
    const expired = await hooks.loadClientPortalRecord(token, {
      client: fakePortalClient({ data: jobRow, error: null }),
      storedLookup: async () => { throw new Error('expired tokens must not fall back to stored lookup'); }
    });
    assert.strictEqual(expired.parsed.reason, 'expired');
    assert.strictEqual(expired.data, null, 'expired token fails closed');
  } finally {
    Date.now = realNow;
  }

  const unpaid = hooks.buildClientPortalData(jobRow);
  assert.strictEqual(unpaid.ok, true);
  assert.strictEqual(unpaid.profile.clientName, 'Alex Rivera');
  assert.strictEqual(unpaid.project.title, 'Rivera Studio Launch');
  assert.strictEqual(unpaid.payment.status, 'Unpaid');
  assert.strictEqual(unpaid.payment.receiptAvailable, false, 'unpaid job cannot show receipt');
  assert.ok(unpaid.payment.cta.href.startsWith('mailto:bookings@onlytrueperspective.tech'), 'payment CTA stays on OTP domain/mailbox');
  assert.ok(unpaid.documents.some((doc) => doc.type === 'Paid Receipt' && doc.status === 'locked'), 'unpaid receipt is locked');

  const minimal = hooks.buildClientPortalData({
    job_id: 'JOB-MINIMAL',
    client_name: 'Minimal Client',
    payment_status: 'Unpaid'
  });
  assert.strictEqual(minimal.ok, true, 'missing optional fields do not crash portal rendering');

  const paid = hooks.buildClientPortalData({
    ...jobRow,
    payment_status: 'Paid in Full',
    payment_method: 'Zelle',
    remaining_balance_cents: 0,
    invoice_sent: true
  });
  assert.strictEqual(paid.payment.receiptAvailable, true, 'paid job can show receipt');
  const paidReceipt = paid.documents.find((doc) => doc.type === 'Paid Receipt');
  assert.ok(paidReceipt && paidReceipt.status === 'ready', 'paid receipt is ready');
  assert.ok(/Paid Receipt/.test(paidReceipt.preview), 'paid receipt preview is present');

  const serialized = JSON.stringify(paid);
  assert.ok(!serialized.includes(jobRow.job_id), 'portal payload does not expose raw job id');
  assert.ok(!serialized.includes(jobRow.internal_notes), 'portal payload does not expose internal notes');
  assert.ok(!serialized.includes('created_by'), 'portal payload does not expose created_by');
  assert.ok(!serialized.includes('updated_by'), 'portal payload does not expose updated_by');
  assert.ok(!/service[_-]?role|bearer|jwt|supabase/i.test(serialized), 'portal payload does not expose secrets/internal implementation terms');

  console.log('CLIENT PORTAL LOGIC COMPLETE');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
