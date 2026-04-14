/**
 * OTP Ops Job → Document generator (internal/admin-first)
 * Source of truth: saved ops_jobs record fields.
 * Pricing config: guidance only (never replaces saved totals).
 */
function normalizeWhitespace(s) {
  return String(s || '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function safeStr(v) {
  const s = String(v == null ? '' : v).trim();
  return s;
}

function dollarsFromCents(cents) {
  if (cents == null || !Number.isFinite(Number(cents))) return '';
  const n = Math.round(Number(cents));
  return `$${(n / 100).toFixed(2)}`;
}

function fmtDate(dateIso) {
  const s = safeStr(dateIso);
  if (!s) return '';
  // Keep stable and non-invented: use the stored string verbatim if it's not a valid date.
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function guidanceForPackage(pricing, packageType) {
  try {
    const p = pricing && pricing.packages ? pricing.packages : null;
    if (!p) return '';
    const norm = (x) => safeStr(x).toLowerCase();
    const want = norm(packageType);
    const candidates = [p.theSignal, p.theEngine, p.theSystem, p.custom].filter(Boolean);
    const hit = candidates.find((c) => norm(c.label) === want || norm(c.key) === want);
    if (!hit) return '';
    if (norm(hit.label) === 'custom') return 'Scope-based (custom).';
    return safeStr(hit.price_display);
  } catch (_) {
    return '';
  }
}

function guidanceForService(pricing, serviceType) {
  try {
    const services = pricing && pricing.services ? Object.values(pricing.services) : [];
    const want = safeStr(serviceType);
    const hit = services.find((s) => safeStr(s.label) === want);
    if (!hit) return '';
    return safeStr(hit.price_display);
  } catch (_) {
    return '';
  }
}

function buildPricingBlock(job) {
  const total = dollarsFromCents(job.totalPriceCents);
  const dep = dollarsFromCents(job.depositAmountCents);
  const rem = dollarsFromCents(job.remainingBalanceCents);
  const paymentStatus = safeStr(job.paymentStatus);
  const paymentMethod = safeStr(job.paymentMethod);
  return {
    total: total || null,
    deposit: dep || null,
    remaining: rem || null,
    payment_status: paymentStatus || null,
    payment_method: paymentMethod || null,
  };
}

function baseDoc(job, docType, pricing) {
  const nowIso = new Date().toISOString();
  const clientName = safeStr(job.clientName);
  const businessName = safeStr(job.businessName);
  const clientLabel = businessName ? `${clientName}${clientName ? ' • ' : ''}${businessName}` : clientName;
  const projectTitle = safeStr(job.projectTitle);
  const serviceType = safeStr(job.serviceType);
  const packageType = safeStr(job.packageType);
  const pkgGuidance = guidanceForPackage(pricing, packageType);
  const svcGuidance = guidanceForService(pricing, serviceType);
  return {
    schema: 'otp-ops-doc-v1',
    doc_type: docType,
    generated_at: nowIso,
    job: {
      jobId: safeStr(job.jobId) || null,
      clientName: clientName || null,
      businessName: businessName || null,
      phone: safeStr(job.phone) || null,
      email: safeStr(job.email) || null,
      serviceType: serviceType || null,
      packageType: packageType || null,
      projectTitle: projectTitle || null,
      startDate: safeStr(job.startDate) || null,
      dueDate: safeStr(job.dueDate) || null,
      paymentStatus: safeStr(job.paymentStatus) || null,
      paymentMethod: safeStr(job.paymentMethod) || null,
      jobStatus: safeStr(job.jobStatus) || null,
      portfolioPermission: job.portfolioPermission === true,
      agreementSigned: job.agreementSigned === true,
      invoiceSent: job.invoiceSent === true,
    },
    source_of_truth: 'ops_jobs',
    pricing_guidance: {
      package: pkgGuidance || null,
      service: svcGuidance || null,
      rule: 'Guidance only; saved totals remain the only final truth.',
    },
    display: {
      client_label: clientLabel || null,
      project_label: projectTitle || serviceType || packageType || null,
    },
    warnings: [],
    blocks: [],
    rendered_markdown: '',
  };
}

function pushBlock(doc, title, body) {
  const t = safeStr(title);
  const b = normalizeWhitespace(body);
  if (!t || !b) return;
  doc.blocks.push({ title: t, body: b });
}

function renderDocMarkdown(doc) {
  const h = [];
  h.push(`## ${doc.doc_type}`);
  h.push('');
  if (doc.display.client_label) h.push(`**Client**: ${doc.display.client_label}`);
  if (doc.job.jobId) h.push(`**Job ID**: ${doc.job.jobId}`);
  h.push(`**Generated**: ${doc.generated_at}`);
  if (doc.display.project_label) h.push(`**Project**: ${doc.display.project_label}`);
  h.push('');
  if (doc.warnings.length) {
    h.push('### Warnings');
    for (const w of doc.warnings) h.push(`- ${w}`);
    h.push('');
  }
  for (const blk of doc.blocks) {
    h.push(`### ${blk.title}`);
    h.push(blk.body);
    h.push('');
  }
  doc.rendered_markdown = normalizeWhitespace(h.join('\n'));
  return doc;
}

function ensure(doc, ok, warningIfMissing) {
  if (ok) return true;
  doc.warnings.push(warningIfMissing);
  return false;
}

function generateProposal(job, pricing) {
  const doc = baseDoc(job, 'Proposal', pricing);
  ensure(doc, safeStr(job.clientName) || safeStr(job.businessName), 'Missing client identity (clientName/businessName).');
  ensure(doc, safeStr(job.projectTitle) || safeStr(job.serviceType) || safeStr(job.packageType), 'Missing project label (projectTitle/serviceType/packageType).');

  pushBlock(doc, 'Project', normalizeWhitespace([
    safeStr(job.projectTitle) ? `**Title**: ${safeStr(job.projectTitle)}` : '',
    safeStr(job.serviceType) ? `**Service**: ${safeStr(job.serviceType)}` : '',
    safeStr(job.packageType) ? `**Package**: ${safeStr(job.packageType)}` : '',
    safeStr(job.projectDescription) ? `\n${safeStr(job.projectDescription)}` : '',
  ].filter(Boolean).join('\n')));

  const deliverables = safeStr(job.deliverables);
  if (!deliverables) doc.warnings.push('Deliverables not provided; proposal will not list line-items.');
  pushBlock(doc, 'Deliverables', deliverables || '(Not provided)');

  const addOns = safeStr(job.addOns);
  if (addOns) pushBlock(doc, 'Add-ons', addOns);

  const timing = [];
  if (safeStr(job.startDate)) timing.push(`**Start**: ${fmtDate(job.startDate)}`);
  if (safeStr(job.dueDate)) timing.push(`**Due**: ${fmtDate(job.dueDate)}`);
  if (timing.length) pushBlock(doc, 'Timing', timing.join('\n'));

  const pricingBlock = buildPricingBlock(job);
  if (!pricingBlock.total) doc.warnings.push('Total price is missing; proposal will be informational only.');
  const lines = [];
  if (pricingBlock.total) lines.push(`**Total**: ${pricingBlock.total}`);
  if (pricingBlock.deposit) lines.push(`**Deposit**: ${pricingBlock.deposit}`);
  if (pricingBlock.remaining) lines.push(`**Remaining**: ${pricingBlock.remaining}`);
  if (!lines.length) lines.push('(Pricing not entered in job record)');
  pushBlock(doc, 'Pricing summary', lines.join('\n'));

  const guidanceLines = [];
  if (doc.pricing_guidance.service) guidanceLines.push(`**Service guidance**: ${doc.pricing_guidance.service}`);
  if (doc.pricing_guidance.package) guidanceLines.push(`**Package guidance**: ${doc.pricing_guidance.package}`);
  if (guidanceLines.length) pushBlock(doc, 'Pricing guidance (non-binding)', guidanceLines.join('\n'));

  pushBlock(doc, 'Next steps', normalizeWhitespace([
    'To begin, OTP operations require agreement confirmation and an invoice with the required deposit (when applicable).',
    'Final scope, timeline, and launch details are confirmed once the saved job record is complete.',
  ].join('\n\n')));

  return renderDocMarkdown(doc);
}

function generateInvoice(job, pricing) {
  const doc = baseDoc(job, 'Invoice', pricing);
  ensure(doc, safeStr(job.clientName) || safeStr(job.businessName), 'Missing client identity (clientName/businessName).');
  ensure(doc, job.totalPriceCents != null, 'Missing totalPrice; invoice cannot be generated without a saved total.');

  pushBlock(doc, 'Invoice details', normalizeWhitespace([
    safeStr(job.projectTitle) ? `**Project**: ${safeStr(job.projectTitle)}` : '',
    safeStr(job.serviceType) ? `**Service**: ${safeStr(job.serviceType)}` : '',
    safeStr(job.packageType) ? `**Package**: ${safeStr(job.packageType)}` : '',
    safeStr(job.dueDate) ? `**Due**: ${fmtDate(job.dueDate)}` : '',
  ].filter(Boolean).join('\n')));

  const p = buildPricingBlock(job);
  const lines = [];
  if (p.total) lines.push(`**Total**: ${p.total}`);
  if (p.deposit) lines.push(`**Deposit**: ${p.deposit}`);
  if (p.remaining) lines.push(`**Remaining**: ${p.remaining}`);
  if (p.payment_status) lines.push(`**Payment status**: ${p.payment_status}`);
  if (p.payment_method) lines.push(`**Payment method**: ${p.payment_method}`);
  pushBlock(doc, 'Payment summary', lines.join('\n'));

  const scope = safeStr(job.deliverables) || safeStr(job.projectDescription);
  if (scope) pushBlock(doc, 'Scope reference', scope);
  if (!scope) doc.warnings.push('No deliverables/project description on record; invoice will not include scope details.');

  return renderDocMarkdown(doc);
}

function generateAgreement(job, pricing) {
  const doc = baseDoc(job, 'Agreement', pricing);
  ensure(doc, safeStr(job.clientName) || safeStr(job.businessName), 'Missing client identity (clientName/businessName).');
  ensure(doc, safeStr(job.serviceType) || safeStr(job.packageType), 'Missing service/package (serviceType/packageType).');

  pushBlock(doc, 'Parties', normalizeWhitespace([
    '**Provider**: OnlyTruePerspective LLC ("OTP")',
    doc.display.client_label ? `**Client**: ${doc.display.client_label}` : '',
  ].filter(Boolean).join('\n')));

  const scopeBits = [];
  if (safeStr(job.projectTitle)) scopeBits.push(`**Project**: ${safeStr(job.projectTitle)}`);
  if (safeStr(job.serviceType)) scopeBits.push(`**Service**: ${safeStr(job.serviceType)}`);
  if (safeStr(job.packageType)) scopeBits.push(`**Package**: ${safeStr(job.packageType)}`);
  if (safeStr(job.projectDescription)) scopeBits.push(`\n${safeStr(job.projectDescription)}`);
  pushBlock(doc, 'Scope', normalizeWhitespace(scopeBits.join('\n')));

  const deliverables = safeStr(job.deliverables);
  if (!deliverables) doc.warnings.push('Deliverables not provided; agreement will include a placeholder deliverables section.');
  pushBlock(doc, 'Deliverables', deliverables || '(Not provided)');

  const p = buildPricingBlock(job);
  if (!p.total) doc.warnings.push('Total price missing; agreement will not lock pricing terms.');
  pushBlock(doc, 'Payment terms', normalizeWhitespace([
    p.total ? `**Total**: ${p.total}` : '**Total**: (Not provided in job record)',
    p.deposit ? `**Deposit**: ${p.deposit} (due before kickoff unless otherwise agreed)` : '**Deposit**: (Not provided in job record)',
    p.remaining ? `**Remaining**: ${p.remaining} (due prior to final delivery unless otherwise agreed)` : '',
    'Work begins once the required onboarding items are confirmed (agreement + invoice/deposit, when applicable).',
  ].filter(Boolean).join('\n')));

  pushBlock(doc, 'Revisions & approvals', normalizeWhitespace([
    'OTP includes a reasonable revision cycle aligned to the recorded scope.',
    'Additional revisions, scope changes, or add-ons require written confirmation and may adjust timeline and pricing.',
  ].join('\n\n')));

  pushBlock(doc, 'Ownership & usage', normalizeWhitespace([
    'Upon full payment, the client receives usage rights for the final deliverables as agreed in the scope.',
    'Portfolio usage follows the saved job record permission flag.',
  ].join('\n\n')));

  pushBlock(doc, 'Jurisdiction', 'Rhode Island, USA.');

  return renderDocMarkdown(doc);
}

function generatePaidReceipt(job, pricing) {
  const doc = baseDoc(job, 'Paid Receipt', pricing);
  ensure(doc, safeStr(job.clientName) || safeStr(job.businessName), 'Missing client identity (clientName/businessName).');

  const status = safeStr(job.paymentStatus);
  const p = buildPricingBlock(job);
  const paidInFull = status.toLowerCase() === 'paid in full';
  const depositPaid = status.toLowerCase() === 'deposit paid';

  if (!paidInFull && !depositPaid) {
    doc.warnings.push('PaymentStatus is not marked as Paid in Full or Deposit Paid; receipt may not be appropriate.');
  }

  const amountPaid = paidInFull ? p.total : depositPaid ? p.deposit : null;
  if (!amountPaid) doc.warnings.push('No clear paid amount available (missing saved total and/or deposit).');

  pushBlock(doc, 'Receipt', normalizeWhitespace([
    amountPaid ? `**Amount received**: ${amountPaid}` : '**Amount received**: (Not available in job record)',
    p.payment_method ? `**Method**: ${p.payment_method}` : '',
    `**Receipt generated**: ${fmtDate(doc.generated_at)}`,
    p.payment_status ? `**Payment status**: ${p.payment_status}` : '',
  ].filter(Boolean).join('\n')));

  pushBlock(doc, 'Service reference', normalizeWhitespace([
    safeStr(job.projectTitle) ? `**Project**: ${safeStr(job.projectTitle)}` : '',
    safeStr(job.serviceType) ? `**Service**: ${safeStr(job.serviceType)}` : '',
    safeStr(job.packageType) ? `**Package**: ${safeStr(job.packageType)}` : '',
  ].filter(Boolean).join('\n')) || '(Not provided)');

  if (paidInFull) {
    pushBlock(doc, 'Status', 'Paid in full. Thank you.');
  } else if (depositPaid) {
    pushBlock(doc, 'Status', normalizeWhitespace([
      'Deposit received.',
      p.remaining ? `Remaining balance: ${p.remaining}` : 'Remaining balance: (Not available in job record)',
    ].join('\n')));
  }

  return renderDocMarkdown(doc);
}

function generateServiceSummary(job, pricing) {
  const doc = baseDoc(job, 'Service Summary', pricing);
  ensure(doc, safeStr(job.clientName) || safeStr(job.businessName), 'Missing client identity (clientName/businessName).');

  pushBlock(doc, 'Summary', normalizeWhitespace([
    safeStr(job.projectTitle) ? `**Project**: ${safeStr(job.projectTitle)}` : '',
    safeStr(job.serviceType) ? `**Service**: ${safeStr(job.serviceType)}` : '',
    safeStr(job.packageType) ? `**Package**: ${safeStr(job.packageType)}` : '',
    safeStr(job.jobStatus) ? `**Status**: ${safeStr(job.jobStatus)}` : '',
  ].filter(Boolean).join('\n')) || '(Not provided)');

  const scope = safeStr(job.deliverables) || safeStr(job.projectDescription);
  if (!scope) doc.warnings.push('No deliverables or project description on record; summary will be minimal.');
  pushBlock(doc, 'Scope snapshot', scope || '(Not provided)');

  const p = buildPricingBlock(job);
  const paymentBits = [];
  if (p.total) paymentBits.push(`**Total**: ${p.total}`);
  if (p.payment_status) paymentBits.push(`**Payment status**: ${p.payment_status}`);
  if (p.remaining) paymentBits.push(`**Remaining**: ${p.remaining}`);
  if (paymentBits.length) pushBlock(doc, 'Payment snapshot', paymentBits.join('\n'));

  return renderDocMarkdown(doc);
}

function generateOpsDocument({ docType, job, pricing }) {
  const type = safeStr(docType);
  const allowed = new Set(['Proposal', 'Invoice', 'Agreement', 'Paid Receipt', 'Service Summary']);
  if (!allowed.has(type)) {
    return {
      ok: false,
      status: 400,
      message: 'Invalid docType',
      doc: null,
    };
  }
  if (!job || typeof job !== 'object') {
    return { ok: false, status: 400, message: 'Missing job record', doc: null };
  }

  // Explicitly avoid internal-only content in any output.
  const safeJob = { ...job };
  delete safeJob.internalNotes;

  let doc = null;
  if (type === 'Proposal') doc = generateProposal(safeJob, pricing);
  if (type === 'Invoice') doc = generateInvoice(safeJob, pricing);
  if (type === 'Agreement') doc = generateAgreement(safeJob, pricing);
  if (type === 'Paid Receipt') doc = generatePaidReceipt(safeJob, pricing);
  if (type === 'Service Summary') doc = generateServiceSummary(safeJob, pricing);

  // Hard stop: do not leak internal notes even if present by accident.
  if (doc && typeof doc.rendered_markdown === 'string' && safeStr(job.internalNotes)) {
    const needle = safeStr(job.internalNotes);
    if (needle && doc.rendered_markdown.includes(needle)) {
      return { ok: false, status: 500, message: 'Internal notes leakage prevention triggered', doc: null };
    }
  }

  // If the doc has "blocking" warnings (invoice without total), keep ok=true but signal.
  return { ok: true, status: 200, message: 'ok', doc };
}

module.exports = {
  generateOpsDocument,
};

