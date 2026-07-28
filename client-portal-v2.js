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

function safeDocuments(documents = []) {
  const byType = new Map();
  for (const document of Array.isArray(documents) ? documents : []) {
    const type = text(document?.type).toLowerCase().replace(/_/g, '-');
    if (!DOCUMENT_TYPES.includes(type) || byType.has(type)) continue;
    const ready = document.ready === true;
    const viewUrl = ready ? safeUrl(document.viewUrl || document.view_url) : '';
    const downloadUrl = ready ? safeUrl(document.downloadUrl || document.download_url) : '';
    byType.set(type, Object.freeze({
      type,
      label: text(document.label) || type.split('-').map((part) => `${part[0]?.toUpperCase() || ''}${part.slice(1)}`).join(' '),
      ready,
      status: ready ? 'Available' : 'Draft pending OTP review',
      message: ready ? 'This document is available for client review.' : 'No document is available yet. OTP will add it after review.',
      actionLabel: ready ? 'Ready for review' : 'Not available yet',
      updatedAt: text(document.updatedAt || document.updated_at),
      viewUrl,
      downloadUrl
    }));
  }
  return DOCUMENT_TYPES.filter((type) => byType.has(type)).map((type) => byType.get(type));
}

function paymentView(payload = {}, identity = {}, options = {}) {
  const raw = payload && typeof payload === 'object' ? payload : {};
  const total = cents(raw.totalAmountCents ?? raw.total_amount_cents);
  const deposit = cents(raw.depositDueCents ?? raw.deposit_amount_cents ?? raw.deposit_cents);
  const paid = cents(raw.amountPaidCents ?? raw.amount_paid_cents);
  const balance = cents(raw.remainingBalanceCents ?? raw.remaining_balance_cents ?? raw.amountDueCents ?? raw.amount_due_cents);
  const rawLink = text(raw.paymentLink || raw.payment_link || raw.stripe_link);
  const paymentLink = safeUrl(rawLink);
  const unsafeLink = Boolean(rawLink && !paymentLink);
  const summary = buildPaymentSummaryV2({
    clientName: identity.clientName,
    projectTitle: identity.projectTitle,
    jobType: identity.jobType,
    totalAmountCents: total ?? undefined,
    depositAmountCents: deposit ?? undefined,
    amountPaidCents: paid ?? undefined,
    remainingBalanceCents: balance ?? undefined,
    dueDate: text(raw.dueDate || raw.due_date),
    paymentStatus: text(raw.status || raw.paymentStatus || raw.payment_status),
    paymentMethod: text(raw.method || raw.paymentMethod || raw.payment_method),
    paymentLink,
    paymentLinkStatus: text(raw.paymentLinkStatus || raw.payment_link_status),
    receiptStatus: text(raw.receiptStatus || raw.receipt_status),
    receiptGeneratedAt: text(raw.receiptGeneratedAt || raw.receipt_generated_at),
    receiptSentAt: text(raw.receiptSentAt || raw.receipt_sent_at),
    invoiceStatus: text(raw.invoiceStatus || raw.invoice_status)
  }, { now: options.now });
  const manualReviewRequired = summary.manualReviewRequired || unsafeLink;
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
    paidInFull: summary.paidInFull,
    overdue: summary.overdue,
    receiptReady: summary.receiptReady,
    receiptStatus: summary.receiptSent ? 'Receipt sent' : summary.receiptReady ? 'Receipt ready after OTP review' : 'Locked until payment is saved',
    reminderReady: summary.reminderReady,
    paymentLinkReady: !manualReviewRequired && summary.paymentLinkReady && Boolean(paymentLink),
    paymentLink: !manualReviewRequired && summary.paymentLinkReady ? paymentLink : '',
    message: manualReviewRequired
      ? 'Payment details are being reviewed by OTP. No payment action is required until OTP confirms the next step.'
      : summary.paidInFull
        ? 'Payment is recorded as paid in full. Receipt status is shown below.'
        : summary.depositPaid
          ? 'Deposit received. The remaining balance will be confirmed before final delivery.'
          : summary.balanceDue
            ? 'A balance is recorded. Use only the reviewed payment link shown here.'
            : 'No payment action is required until OTP confirms the next step.',
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
  const identity = Object.freeze({
    businessName: 'OnlyTruePerspective LLC',
    clientName: text(client.name) || 'Client details pending',
    projectTitle: text(project.title) || 'Project details pending',
    jobType: text(project.projectType || project.project_type) || 'Project type pending'
  });
  const documents = Object.freeze(safeDocuments(payload.documents));
  const payment = paymentView(payload.payment, identity, options);
  const delivery = deliveryView(payload.delivery, project);
  const phase = currentPhase(project.status);
  const manualReviewRequired = payment.manualReviewRequired || !text(client.name) || !text(project.title);
  const overview = Object.freeze({
    projectTitle: identity.projectTitle,
    jobType: identity.jobType,
    service: text(project.service) || 'Service details pending OTP review',
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
