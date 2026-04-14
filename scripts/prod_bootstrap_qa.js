/* eslint-disable no-console */
/**
 * Bootstrap a single clean QA contact (inbox thread) + a single clean QA ops job in production.
 *
 * - Admin-only via JWT (OTP_ADMIN_TOKEN env var).
 * - Safe: does not send email, does not purge tables, only upserts a clearly-marked QA record.
 *
 * Usage:
 *   OTP_ADMIN_TOKEN="..." node scripts/prod_bootstrap_qa.js
 */

const ORIGIN = 'https://www.onlytrueperspective.tech';

function short(s, n = 240) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

function looksLikeJwt(s) {
  const t = String(s || '').trim();
  const parts = t.split('.');
  return parts.length === 3 && parts[0].length > 10 && parts[1].length > 10;
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
  const token = String(process.env.OTP_ADMIN_TOKEN || '').trim();
  if (!token) throw new Error('Missing OTP_ADMIN_TOKEN env var');
  if (!looksLikeJwt(token)) throw new Error('OTP_ADMIN_TOKEN does not look like a JWT');

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const isoDate = `${yyyy}-${mm}-${dd}`;

  // Canonical QA identity (obvious + non-real)
  const qaContact = {
    name: 'Live QA Test Client',
    email: 'qa@example.com',
    phone: '401-555-0101',
    service: 'Video Editing Services',
    budget: '$199',
    message: `OTP controlled production validation thread (${isoDate}). Do not send real email.`,
    // Ensure inbox UI shows "MODULATE RESPONSE" button for predictable reply-context bootstrapping.
    draft_reply: `Draft reply (QA): Thanks — this is a controlled validation thread (${isoDate}).`,
    ai_status: 'active', // ensures it shows up in inbox "active" filter
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
        ai_status: 'active',
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
    businessName: 'OTP QA',
    phone: qaContact.phone,
    email: qaContact.email,
    serviceType: 'Video Editing Services',
    packageType: 'The Signal',
    projectTitle: 'OTP Validation Reel Cut',
    projectDescription: `Controlled validation job (${isoDate}).`,
    deliverables: '1 reel cut, basic export.',
    addOns: '',
    startDate: isoDate,
    dueDate: dueIso,
    totalPrice: '199',
    depositAmount: '99',
    paymentMethod: 'Other',
    paymentStatus: 'Deposit Paid',
    jobStatus: 'Active Client',
    clientNotes: 'QA-only. No real delivery required.',
    internalNotes: 'INTERNAL: QA validation record. Do not send externally.',
    portfolioPermission: false,
    agreementSigned: false,
    invoiceSent: false,
    sourceType: 'manualIntake',
  };

  const upsert = await postJson('/api/admin/ops/jobs/upsert', token, {
    jobId: `QA-${isoDate}`,
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

