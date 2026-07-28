import { buildPaymentSummaryV2 } from './payment-workflow-v2.js';

export const CLIENT_PORTAL_V2_SCHEMA = 'otp-client-portal-v2';
export const CLIENT_PORTAL_V2_GUARDRAIL = 'Proof and delivery items remain private until reviewed by OTP. Public archive use requires approval.';

const DOCUMENT_TYPES = Object.freeze([
  'proposal',
  'agreement',
  'invoice',
  'receipt',
  'project-scope',
  'service-summary',
  'delivery-summary',
  'change-order',
  'payment-reminder'
]);

const TIMELINE_LABELS = Object.freeze([
  'Request received',
  'Scope reviewed',
  'Proposal / invoice ready',
  'Deposit / payment step',
  'Production / work in progress',
  'Review / revisions',
  'Delivery',
  'Completed'
]);

function text(value = '') {
  if (value === null || value === undefined || typeof value === 'object') return '';
  const cleaned = String(value).trim();
  return /^(undefined|null|nan|\[object object\])$/i.test(cleaned) ? '' : cleaned;
}

function cents(value) {
  if (value === '' || value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
}

function safeUrl(value = '') {
  const raw = text(value);
  if (!raw) return '';
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return /^\/api\/client\/portal\//.test(raw) ? raw : '';
  }
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (/^\/(?:api|admin|terminal)(?:\/|$)/i.test(parsed.pathname)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function currentPhase(status = '') {
  const value = text(status).toLowerCase();
  if (/complete|paid|archive/.test(value)) return 'Completed';
  if (/deliver/.test(value)) return 'Delivery';
  if (/review|revision|approval/.test(value)) return 'Review / revisions';
  if (/production|progress|scheduled/.test(value)) return 'Production / work in progress';
  if (/deposit|payment/.test(value)) return 'Deposit / payment step';
  if (/proposal|invoice|quote/.test(value)) return 'Proposal / invoice ready';
  if (/scope|approved/.test(value)) return 'Scope reviewed';
  return 'Request received';
}

function safeDocuments(documents = [], rootPayload = {}) {
  const sourceDocs = Array.isArray(documents) && documents.length
    ? documents
    : Array.isArray(rootPayload.docs) && rootPayload.docs.length
      ? rootPayload.docs
      : Array.isArray(rootPayload.job_documents) && rootPayload.job_documents.length
        ? rootPayload.job_documents
        : Array.isArray(rootPayload.documents) ? rootPayload.documents : [];

  const byType = new Map();
  for (const document of sourceDocs) {
    const type = text(document?.type || document?.docType || document?.doc_type).toLowerCase().replace(/_/g, '-');
    if (!DOCUMENT_TYPES.includes(type) || byType.has(type)) continue;
    const readyExplicit = document.ready === true;
    const rawDocUrl = document.viewUrl || document.view_url || document.url || document.link;
    const validDocUrl = safeUrl(rawDocUrl);
    const isReady = readyExplicit || (document.ready !== false && (
      String(document.status || document.doc_status || '').toLowerCase() === 'ready'
      || String(document.status || document.doc_status || '').toLowerCase() === 'available'
      || Boolean(validDocUrl)
    ) && (!rawDocUrl || Boolean(validDocUrl)));
    const viewUrl = isReady ? safeUrl(document.viewUrl || document.view_url || document.url || document.link) : '';
    const downloadUrl = isReady ? safeUrl(document.downloadUrl || document.download_url || document.downloadLink || document.download_link) : '';
    byType.set(type, Object.freeze({
      type,
      label: text(document.label || document.title) || type.split('-').map((part) => `${part[0]?.toUpperCase() || ''}${part.slice(1)}`).join(' '),
      ready: isReady,
      status: isReady ? 'Available' : 'Draft pending OTP review',
      message: isReady ? 'This document is available for client review.' : 'No document is available yet. OTP will add it after review.',
      actionLabel: isReady ? 'Ready for review' : 'Not available yet',
      updatedAt: text(document.updatedAt || document.updated_at || document.createdAt || document.created_at),
      viewUrl,
      downloadUrl
    }));
  }
  return DOCUMENT_TYPES.filter((type) => byType.has(type)).map((type) => byType.get(type));
}

function paymentView(payload = {}, identity = {}, options = {}, rootPayload = {}) {
  const p = (payload && typeof payload === 'object' && Object.keys(payload).length)
    ? payload
    : (rootPayload.payment && typeof rootPayload.payment === 'object')
      ? rootPayload.payment
      : (rootPayload.job && typeof rootPayload.job === 'object')
        ? rootPayload.job
        : rootPayload;

  const total = cents(p.totalAmountCents ?? p.total_amount_cents ?? p.quoted_price_cents ?? p.total_price_cents ?? p.totalCents ?? p.total_cents ?? p.quotedPriceCents ?? p.totalPriceCents);
  const deposit = cents(p.depositDueCents ?? p.deposit_amount_cents ?? p.deposit_cents ?? p.depositDue ?? p.depositCents);
  const paid = cents(p.amountPaidCents ?? p.amount_paid_cents ?? p.paid_cents ?? p.paidCents);
  const balance = cents(p.remainingBalanceCents ?? p.remaining_balance_cents ?? p.amountDueCents ?? p.amount_due_cents ?? p.balanceCents ?? p.balance_cents);
  const rawLink = text(p.paymentLink || p.payment_link || p.stripe_link || p.stripeLink);
  const paymentLink = safeUrl(rawLink);
  const unsafeLink = Boolean(rawLink && !paymentLink);
  const jobStatus = text(rootPayload.project?.status || rootPayload.job_status || rootPayload.status || p.job_status || p.status).toLowerCase();
  const isCompletedJob = /complete|paid|delivered|archive/.test(jobStatus);

  const summary = buildPaymentSummaryV2({
    clientName: identity.clientName,
    projectTitle: identity.projectTitle,
    jobType: identity.jobType,
    totalAmountCents: total ?? undefined,
    depositAmountCents: deposit ?? undefined,
    amountPaidCents: paid ?? (isCompletedJob && total ? total : undefined),
    remainingBalanceCents: balance ?? (isCompletedJob ? 0 : undefined),
    dueDate: text(p.dueDate || p.due_date),
    paymentStatus: text(p.status || p.paymentStatus || p.payment_status || (isCompletedJob ? 'Paid' : '')),
    paymentMethod: text(p.method || p.paymentMethod || p.payment_method),
    paymentLink,
    paymentLinkStatus: text(p.paymentLinkStatus || p.payment_link_status),
    receiptStatus: text(p.receiptStatus || p.receipt_status || (isCompletedJob ? 'Receipt ready' : '')),
    receiptGeneratedAt: text(p.receiptGeneratedAt || p.receipt_generated_at),
    receiptSentAt: text(p.receiptSentAt || p.receipt_sent_at),
    invoiceStatus: text(p.invoiceStatus || p.invoice_status)
  }, { now: options.now });

  const manualReviewRequired = (summary.manualReviewRequired && !isCompletedJob && total === null) || unsafeLink;
  const state = manualReviewRequired ? 'manual_review_required' : summary.state;
  return Object.freeze({
    state,
    stateLabel: manualReviewRequired ? 'Manual Review Required' : summary.stateLabel,
    totalCents: manualReviewRequired ? null : summary.totalCents,
    depositCents: manualReviewRequired ? null : summary.depositCents,
    amountPaidCents: manualReviewRequired ? null : summary.amountPaidCents,
    balanceCents: manualReviewRequired ? null : summary.balanceCents,
    dueDate: manualReviewRequired ? '' : summary.dueDate,
    depositPaid: summary.depositPaid,
    paidInFull: summary.paidInFull || isCompletedJob,
    overdue: summary.overdue,
    receiptReady: summary.receiptReady || isCompletedJob,
    receiptStatus: summary.receiptSent ? 'Receipt sent' : (summary.receiptReady || isCompletedJob) ? 'Receipt ready after OTP review' : 'Locked until payment is saved',
    reminderReady: summary.reminderReady,
    paymentLinkReady: !manualReviewRequired && summary.paymentLinkReady && Boolean(paymentLink),
    paymentLink: !manualReviewRequired && summary.paymentLinkReady ? paymentLink : '',
    message: manualReviewRequired
      ? 'Payment details are being reviewed by OTP. No payment action is required until OTP confirms the next step.'
      : (summary.paidInFull || isCompletedJob)
        ? 'Payment is recorded as paid in full. Receipt status is shown below.'
        : summary.overdue
          ? 'Payment is overdue. Please process payment using the link below.'
          : summary.depositPaid
            ? 'Deposit is recorded as paid. Remaining balance will be due according to schedule.'
            : summary.paymentLinkReady
              ? 'Payment link is ready. Use the button below to complete deposit/payment.'
              : 'Payment terms established. Payment action will be enabled when due.',
    nextAction: manualReviewRequired ? 'OTP must review payment details before client action.' : summary.nextAction,
    manualReviewRequired
  });
}

function timelineView(project = {}, documents = [], payment = {}, delivery = {}) {
  const phase = currentPhase(project.status);
  const phaseIndex = TIMELINE_LABELS.indexOf(phase);
  const proposalReady = documents.some((item) => item.ready && ['proposal', 'invoice', 'agreement'].includes(item.type));
  const paymentReady = payment.depositPaid || payment.paidInFull || payment.state === 'partial_paid';
  const deliveryReady = delivery.status === 'Delivered' || delivery.links.length > 0;
  return TIMELINE_LABELS.map((label, index) => {
    let status = index < phaseIndex ? 'Complete' : index === phaseIndex ? 'Current' : 'Upcoming';
    if (label === 'Proposal / invoice ready' && proposalReady) status = 'Complete';
    if (label === 'Deposit / payment step' && paymentReady) status = 'Complete';
    if (label === 'Delivery' && deliveryReady) status = phase === 'Completed' ? 'Complete' : 'Current';
    if (label === 'Completed' && phase === 'Completed') status = 'Complete';
    return Object.freeze({ label, status, date: '', description: status === 'Current' ? 'This is the current client-facing project phase.' : '' });
  });
}

function deliveryView(payload = {}, project = {}) {
  const raw = payload && typeof payload === 'object' ? payload : {};
  const links = (Array.isArray(raw.finalLinks) ? raw.finalLinks : [])
    .map((item = {}) => ({ label: text(item.label) || 'Final delivery', url: safeUrl(item.url) }))
    .filter((item) => item.url);
  const proof = raw.proof && typeof raw.proof === 'object' ? raw.proof : {};
  const proofUrl = proof.approved === true ? safeUrl(proof.publicUrl || proof.public_url) : '';
  const deliverables = (Array.isArray(project.deliverables) ? project.deliverables : []).map((item = {}) => ({
    name: text(item.name) || 'Deliverable',
    type: text(item.type),
    status: text(item.status) || 'Pending OTP review',
    dueDate: text(item.dueDate || item.due_date),
    clientNotes: text(item.clientNotes || item.client_notes),
    assetUrl: safeUrl(item.assetUrl || item.asset_url)
  }));
  return Object.freeze({
    status: text(raw.status) || (links.length ? 'Delivery available' : 'In progress'),
    nextStep: text(raw.nextStep || raw.next_step) || 'Delivery items are being reviewed by OTP.',
    links: Object.freeze(links),
    deliverables: Object.freeze(deliverables),
    proofStatus: proofUrl ? 'Approved proof available' : 'Approved proof will appear here when available.',
    proofUrl
  });
}

export function buildClientPortalViewV2(payload = {}, options = {}) {
  const client = payload.client && typeof payload.client === 'object' ? payload.client : {};
  const project = payload.project && typeof payload.project === 'object' ? payload.project : {};
  const clientNameResolved = text(client.name || client.clientName || client.client_name || client.brandBusiness || client.brand_business || client.contact_name || payload.client_name || payload.clientName || payload.contact_name || (payload.email ? payload.email.split('@')[0] : ''));
  const projectTitleResolved = text(project.title || project.projectTitle || project.project_title || project.service || project.service_type || project.name || payload.project_title || payload.projectTitle);
  const jobTypeResolved = text(project.projectType || project.project_type || project.jobType || project.job_type || project.service || project.service_type);

  const identity = Object.freeze({
    businessName: 'OnlyTruePerspective LLC',
    clientName: clientNameResolved || 'Valued Client',
    projectTitle: projectTitleResolved || 'OTP Project',
    jobType: jobTypeResolved || 'Custom Project'
  });
  const documents = Object.freeze(safeDocuments(payload.documents, payload));
  const payment = paymentView(payload.payment, identity, options, payload);
  const delivery = deliveryView(payload.delivery, project);
  const phase = currentPhase(project.status);
  const manualReviewRequired = payment.manualReviewRequired;
  const overview = Object.freeze({
    projectTitle: identity.projectTitle,
    jobType: identity.jobType,
    service: text(project.service) || identity.jobType || 'OTP Custom Service',
    status: text(project.status) || 'Pending Review',
    currentPhase: phase,
    summary: text(project.clientFacingSummary || project.client_facing_summary || project.description) || 'Project details are being reviewed by OTP.',
    nextClientAction: manualReviewRequired
      ? 'Payment or project details are being confirmed by OTP.'
      : text(payload.nextStep?.message || project.nextStep || project.next_step) || 'Review available documents.'
  });
  const missing = [
    !text(client.name) ? 'client name' : '',
    !text(project.title) ? 'project title' : '',
    payment.manualReviewRequired ? 'verified payment details' : '',
    documents.some((item) => item.ready) ? '' : 'client-ready documents',
    delivery.links.length || !/deliver|complete/i.test(project.status || '') ? '' : 'delivery links'
  ].filter(Boolean);

  const rawOtherProjects = Array.isArray(payload.otherProjects) ? payload.otherProjects : [];
  const otherProjects = Object.freeze(rawOtherProjects.map((item = {}) => Object.freeze({
    title: text(item.title) || 'Project',
    service: text(item.service) || '',
    status: text(item.status) || 'In Progress',
    isCurrent: item.isCurrent === true,
    createdAt: text(item.createdAt || item.created_at)
  })));

  return Object.freeze({
    schema: CLIENT_PORTAL_V2_SCHEMA,
    identity,
    overview,
    documents,
    payment,
    timeline: Object.freeze(timelineView(project, documents, payment, delivery)),
    delivery,
    otherProjects,
    contact: Object.freeze({
      email: text(payload.contact?.email) || 'contact@onlytrueperspective.tech',
      website: safeUrl(payload.contact?.website) || 'https://www.onlytrueperspective.tech/'
    }),
    readiness: Object.freeze({
      ready: missing.length === 0,
      label: missing.length ? 'Manual review required before client access' : 'Portal ready for client review',
      missing: Object.freeze(missing),
      nextAction: missing[0] ? `Review ${missing[0]} before sharing the portal.` : 'Share portal after manual review.'
    }),
    guardrail: CLIENT_PORTAL_V2_GUARDRAIL
  });
}
