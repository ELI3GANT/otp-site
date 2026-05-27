/* eslint-disable no-console */
const jwt = require('jsonwebtoken');
/**
 * Bootstrap one idempotent, safe E2E contact + one safe E2E ops job in production.
 *
 * - Admin-only via short-lived JWT from admin login, or OTP_ADMIN_TOKEN fallback.
 * - Requires E2E_TEST_MODE=true.
 * - Safe: does not send email, does not create Stripe charges, does not purge tables,
 *   only upserts clearly-marked e2e_test records.
 *
 * Usage:
 *   E2E_TEST_MODE=true OTP_ADMIN_PASSCODE="..." node scripts/prod_bootstrap_qa.js
 */

const ORIGIN = 'https://www.onlytrueperspective.tech';
const SAFE_FIXTURE = Object.freeze({
  clientName: 'OTP Test Client',
  email: 'test@onlytrueperspective.tech',
  portalToken: 'test-safe-portal-token',
  sourceType: 'e2e_test',
  status: 'test',
  jobId: 'E2E-TEST-SAFE',
});

function short(s, n = 240) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

function looksLikeJwt(s) {
  const t = String(s || '').trim();
  const parts = t.split('.');
  return parts.length === 3 && parts[0].length > 10 && parts[1].length > 10;
}

function isE2ETestMode() {
  return ['1', 'true'].includes(String(process.env.E2E_TEST_MODE || '').trim().toLowerCase());
}

function tokenSetupHelp() {
  return [
    'Canonical auth: OTP_ADMIN_PASSCODE or ADMIN_PASSCODE logs in through /api/auth/login and receives a short-lived JWT.',
    'CI/runtime fallback: JWT_SECRET may mint a short-lived admin JWT in subprocess memory only.',
    'Fallback auth: OTP_ADMIN_TOKEN may be a real, unexpired admin JWT (three dot-separated segments).',
    'Do not use a placeholder, static bypass token, or token signed with a different JWT_SECRET.'
  ].join(' ');
}

function adminPasscodeEnv() {
  return String(
    process.env.OTP_ADMIN_PASSCODE
    || process.env.ADMIN_PASSCODE
    || process.env.OTP_SITE_ADMIN_PASSCODE
    || ''
  ).trim();
}

async function loginForAdminToken() {
  const passcode = adminPasscodeEnv();
  if (!passcode) return { token: '', warning: 'Missing OTP_ADMIN_PASSCODE or ADMIN_PASSCODE. ' + tokenSetupHelp() };

  const res = await fetch(`${ORIGIN}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ passcode }),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (_) {}
  const token = String(json.token || json.data?.token || '').trim();
  if (res.ok && looksLikeJwt(token)) return { token, source: 'login' };
  return { token: '', warning: `/api/auth/login ${res.status}: ${short(json.message || text)}` };
}

async function resolveAdminToken() {
  const login = await loginForAdminToken();
  if (login.token) return login;

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (jwtSecret) {
    const token = jwt.sign(
      { role: 'admin', source: 'otp-prod-bootstrap-qa' },
      jwtSecret,
      { expiresIn: '10m' }
    );
    if (looksLikeJwt(token)) return { token, source: 'jwt_secret', warning: login.warning };
  }

  const token = String(process.env.OTP_ADMIN_TOKEN || '').trim();
  if (looksLikeJwt(token)) return { token, source: 'env', warning: login.warning };

  throw new Error(login.warning || tokenSetupHelp());
}

async function postJson(path, token, body) {
  const res = await fetch(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (_) {}
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${short(json.message || text)}`);
  }
  return json;
}

async function main() {
  if (!isE2ETestMode()) {
    throw new Error('E2E_TEST_MODE=true is required before writing the safe production QA fixture.');
  }
  const auth = await resolveAdminToken();
  const token = auth.token;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const isoDate = `${yyyy}-${mm}-${dd}`;

  // Official safe fixture identity. Do not replace with real-client data.
  const qaContact = {
    name: SAFE_FIXTURE.clientName,
    email: SAFE_FIXTURE.email,
    phone: '401-555-0199',
    service: 'E2E Test Flow',
    budget: 'Manual price required',
    message: `OTP controlled safe production validation fixture (${isoDate}). source=e2e_test status=test. Do not send real email. Do not create Stripe charges.`,
    draft_reply: `Draft reply (E2E safe fixture): This is a controlled validation thread (${isoDate}); no real email should be sent.`,
    ai_status: SAFE_FIXTURE.status,
  };

  // 1) Find existing QA contact(s)
  const existingContacts = await postJson('/api/admin/fetch-data', token, {
    table: 'contacts',
    select: '*',
    order: 'created_at',
    descending: true,
    filters: [{ column: 'email', op: 'eq', value: qaContact.email }],
    limit: 20,
  }).then((r) => (Array.isArray(r.data) ? r.data : []));

  let primaryContactId = existingContacts[0]?.id || null;

  // 2) Create a contact if none exists. If many exist, archive extras.
  if (!primaryContactId) {
    const created = await postJson('/api/admin/write-data', token, {
      table: 'contacts',
      payload: qaContact,
    });
    const row = Array.isArray(created.data) ? created.data[0] : null;
    primaryContactId = row?.id || null;
    console.log(JSON.stringify({ step: 'contact_created', id: primaryContactId, email: qaContact.email }, null, 2));
  } else {
    console.log(JSON.stringify({ step: 'contact_found', id: primaryContactId, email: qaContact.email, count: existingContacts.length }, null, 2));
  }

  // Ensure canonical fields are present on the primary contact (safe upsert-style update).
  if (primaryContactId) {
    await postJson('/api/admin/write-data', token, {
      table: 'contacts',
      id: String(primaryContactId),
      payload: {
        name: qaContact.name,
        phone: qaContact.phone,
        service: qaContact.service,
        budget: qaContact.budget,
        message: qaContact.message,
        draft_reply: qaContact.draft_reply,
        ai_status: SAFE_FIXTURE.status,
      },
    }).catch(() => {});
  }

  // Archive extras (safe cleanup: does not delete)
  const extras = existingContacts.slice(1).filter((c) => c && c.id);
  for (const ex of extras) {
    // eslint-disable-next-line no-await-in-loop
    await postJson('/api/admin/write-data', token, {
      table: 'contacts',
      id: String(ex.id),
      payload: { ai_status: 'archived' },
    }).catch(() => {});
  }
  if (extras.length) {
    console.log(JSON.stringify({ step: 'contacts_archived_extras', archived: extras.length }, null, 2));
  }

  // 3) Create/upsert a single QA ops job (source_of_truth)
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dueIso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;

  const qaJob = {
    clientName: qaContact.name,
    businessName: 'OTP E2E QA',
    phone: qaContact.phone,
    email: qaContact.email,
    serviceType: 'E2E Test Flow',
    packageType: 'Custom',
    projectTitle: 'OTP Safe E2E Fixture',
    projectDescription: `Controlled validation job (${isoDate}). source=e2e_test status=test. No real delivery, no real email, no Stripe charge.`,
    deliverables: 'Safe portal render, empty documents state, invoice/payment UI smoke only.',
    addOns: '',
    startDate: isoDate,
    dueDate: dueIso,
    totalPrice: '0',
    depositAmount: '0',
    paymentMethod: 'Other',
    paymentStatus: 'Unpaid',
    jobStatus: 'New Lead',
    clientNotes: 'E2E test fixture only. Manual price required before any real work.',
    internalNotes: [
      'INTERNAL: SAFE E2E TEST FIXTURE. Do not send externally.',
      'source=e2e_test',
      'status=test',
      `Client portal token: ${SAFE_FIXTURE.portalToken}`,
      `Client portal expires at: ${due.toISOString()}`,
      'No real Stripe charges. No real emails. Do not mutate real clients.'
    ].join('\n'),
    portfolioPermission: false,
    agreementSigned: false,
    invoiceSent: false,
    sourceType: SAFE_FIXTURE.sourceType,
  };

  const upsert = await postJson('/api/admin/ops/jobs/upsert', token, {
    jobId: SAFE_FIXTURE.jobId,
    job: qaJob,
  });

  console.log(
    JSON.stringify(
      {
        step: 'ops_job_upserted',
        jobId: upsert?.row?.jobId || null,
        client: upsert?.row?.clientName || null,
        email: upsert?.row?.email || null,
        total: upsert?.row?.totalPriceCents || null,
        deposit: upsert?.row?.depositAmountCents || null,
        remaining: upsert?.row?.remainingBalanceCents || null,
      },
      null,
      2,
    ),
  );

  console.log(JSON.stringify({ ok: true, contactId: primaryContactId, qaJobId: upsert?.row?.jobId || null }, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: short(e?.message || e) }, null, 2));
  process.exit(1);
});
