export const BUSINESS_WEBSITE = 'https://www.onlytrueperspective.tech';
export const PORTAL_FALLBACK_MESSAGE = "We couldn't load this client portal yet. Please check the link or contact OTP.";

function cleanPortalValue(value = '') {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(cleanPortalValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return cleanPortalValue(value.label || value.name || value.title || value.value || value.text || '');
  }

  const text = String(value).trim();
  return /^(undefined|null|nan|\[object object\])$/i.test(text) ? '' : text;
}

export function cleanPortalToken(value = '') {
  const token = cleanPortalValue(value);
  if (!/^[A-Za-z0-9][A-Za-z0-9._~-]{5,512}$/.test(token)) return '';
  if (!token.includes('.') && /(admin|terminal|api|schema|supabase|service|jwt|bearer)/i.test(token)) return '';
  return token;
}

function formatMoneyCents(cents = 0) {
  const amount = Number(cents);
  if (!Number.isFinite(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 100);
}

export function formatPortalDate(value = '') {
  const raw = cleanPortalValue(value);
  if (!raw) return '';

  const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s]+at\s+|[T\s]+)?(\d{1,2}:\d{2})?/i);
  const candidate = match ? `${match[1]}T${match[2] || '12:00'}:00` : raw;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return raw;

  const dateText = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);

  if (!match?.[2]) return dateText;

  const timeText = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);

  return `${dateText} at ${timeText}`;
}

function isBlockedPortalPath(pathname = '') {
  const path = String(pathname || '').toLowerCase();
  if (/^\/api\/client\/portal\//.test(path)) return false;
  if (/^\/api(?:\/|$)/.test(path)) return true;
  if (/^\/(?:admin|terminal)(?:\/|$)/.test(path)) return true;
  return false;
}

export function safePortalUrl(url = '', { allowMailto = false } = {}) {
  const raw = cleanPortalValue(url);
  if (!raw) return '';

  if (raw.startsWith('/') && !raw.startsWith('//')) {
    if (isBlockedPortalPath(raw)) return '';
    return raw;
  }

  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '';

  try {
    const parsed = new URL(raw, 'https://example.com');
    if (allowMailto && parsed.protocol === 'mailto:') return parsed.toString();
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (isBlockedPortalPath(parsed.pathname)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function portalReferenceLabel(url = '') {
  const safeUrl = safePortalUrl(url);
  if (!safeUrl) return 'Open Reference';

  try {
    const hostname = new URL(safeUrl).hostname.toLowerCase();
    if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'Watch Reference Video';
  } catch {
    return 'Open Reference';
  }

  return 'Open Reference';
}

function normalizePortalDocument(document = {}) {
  const ready = Boolean(document.ready);
  return {
    type: cleanPortalValue(document.type) || 'document',
    label: cleanPortalValue(document.label) || 'Document',
    ready,
    status: cleanPortalValue(document.status) || (ready ? 'Available' : 'In preparation'),
    message: cleanPortalValue(document.message) || (ready ? 'Ready to view.' : 'Awaiting OTP approval.'),
    viewUrl: ready ? safePortalUrl(document.viewUrl || document.view_url) : '',
    downloadUrl: ready ? safePortalUrl(document.downloadUrl || document.download_url) : ''
  };
}

function normalizePortalProject(project = {}) {
  const deliverables = Array.isArray(project.deliverables)
    ? project.deliverables.map((deliverable = {}) => ({
      name: cleanPortalValue(deliverable.name) || 'Deliverable',
      type: cleanPortalValue(deliverable.type) || 'Other',
      status: cleanPortalValue(deliverable.status) || 'Not Started',
      dueDate: cleanPortalValue(deliverable.dueDate || deliverable.due_date) || '',
      clientNotes: cleanPortalValue(deliverable.clientNotes || deliverable.client_notes) || '',
      assetUrl: safePortalUrl(deliverable.assetUrl || deliverable.asset_url) || '',
      revisionCount: Number(deliverable.revisionCount ?? deliverable.revision_count ?? 0) || 0
    }))
    : [];
  const nextMilestone = project.nextMilestone || project.next_milestone || {};

  return {
    title: cleanPortalValue(project.title) || 'Project details pending',
    projectId: cleanPortalValue(project.projectId || project.project_id) || '',
    projectType: cleanPortalValue(project.projectType || project.project_type) || 'Project type unknown',
    service: cleanPortalValue(project.service) || cleanPortalValue(project.service_type) || 'Project details pending',
    selectedPackage: cleanPortalValue(project.selectedPackage || project.selected_package) || '',
    recommendedPackage: cleanPortalValue(project.recommendedPackage || project.recommended_package) || '',
    description: cleanPortalValue(project.description) || '',
    clientFacingSummary: cleanPortalValue(project.clientFacingSummary || project.client_facing_summary) || '',
    timeline: cleanPortalValue(project.timeline) || '',
    budgetRange: cleanPortalValue(project.budgetRange || project.budget_range) || '',
    quoteRange: cleanPortalValue(project.quoteRange || project.quote_range) || '',
    status: cleanPortalValue(project.status) || 'Pending Review',
    statusBadges: Array.isArray(project.statusBadges)
      ? project.statusBadges.map(cleanPortalValue).filter(Boolean)
      : [],
    deliverables,
    nextMilestone: {
      label: cleanPortalValue(nextMilestone.label) || '',
      status: cleanPortalValue(nextMilestone.status) || '',
      dueDate: cleanPortalValue(nextMilestone.dueDate || nextMilestone.due_date) || ''
    },
    dueDate: cleanPortalValue(project.dueDate || project.due_date) || '',
    portalVisible: project.portalVisible !== false && project.portal_visible !== false,
    nextStep: cleanPortalValue(project.nextStep || project.next_step) || 'OTP is reviewing your project.',
    referenceLink: safePortalUrl(project.referenceLink || project.reference_link) || '',
    openUrl: safePortalUrl(project.openUrl || project.open_url) || ''
  };
}

function normalizePortalRetainer(retainer = {}) {
  const nextMilestone = retainer.next_milestone || retainer.nextMilestone || {};
  return {
    visible: retainer.visible === true,
    status: cleanPortalValue(retainer.status) || '',
    servicesIncluded: Array.isArray(retainer.services_included)
      ? retainer.services_included.map(cleanPortalValue).filter(Boolean)
      : [],
    monthlyDeliverables: Array.isArray(retainer.monthly_deliverables)
      ? retainer.monthly_deliverables.map((item = {}) => ({
        name: cleanPortalValue(item.name) || 'Monthly deliverable',
        status: cleanPortalValue(item.status) || 'Not Started',
        dueDate: cleanPortalValue(item.due_date || item.dueDate) || '',
        clientNotes: cleanPortalValue(item.client_notes || item.clientNotes) || '',
        assetUrl: safePortalUrl(item.asset_url || item.assetUrl) || ''
      }))
      : [],
    nextMilestone: {
      label: cleanPortalValue(nextMilestone.label) || '',
      status: cleanPortalValue(nextMilestone.status) || '',
      dueDate: cleanPortalValue(nextMilestone.due_date || nextMilestone.dueDate) || ''
    },
    nextInvoiceDate: cleanPortalValue(retainer.next_invoice_date || retainer.nextInvoiceDate) || ''
  };
}

function normalizePortalPayment(payment = {}) {
  const amountDueCents = Number(payment.amountDueCents ?? payment.amount_due_cents ?? 0) || 0;
  const depositDueCents = Number(payment.depositDueCents ?? payment.deposit_cents ?? 0) || 0;
  const amountPaidCents = Number(payment.amountPaidCents ?? payment.amount_paid_cents ?? 0) || 0;
  const paymentLink = safePortalUrl(payment.paymentLink || payment.payment_link || payment.stripe_link) || '';
  const paymentLinkStatus = cleanPortalValue(payment.paymentLinkStatus || payment.payment_link_status) || (paymentLink ? 'Active' : 'Payment step not ready yet');

  return {
    status: cleanPortalValue(payment.status) || 'Payment step not ready yet',
    amountDueCents,
    amountDue: cleanPortalValue(payment.amountDue) || formatMoneyCents(amountDueCents),
    depositDueCents,
    depositDue: cleanPortalValue(payment.depositDue) || formatMoneyCents(depositDueCents),
    amountPaidCents,
    amountPaid: cleanPortalValue(payment.amountPaid) || formatMoneyCents(amountPaidCents),
    paidAt: cleanPortalValue(payment.paidAt || payment.paid_at) || '',
    method: cleanPortalValue(payment.method) || cleanPortalValue(payment.paymentMethod) || '',
    paymentLinkStatus,
    paymentLink,
    manualPaymentNote: cleanPortalValue(payment.manualPaymentNote || payment.manual_payment_note) || ''
  };
}

function normalizePortalEntry(entry = {}) {
  return {
    ...entry,
    title: cleanPortalValue(entry.title) || '',
    projectType: cleanPortalValue(entry.projectType || entry.project_type) || 'Project type unknown',
    service: cleanPortalValue(entry.service) || '',
    package: cleanPortalValue(entry.package) || '',
    status: cleanPortalValue(entry.status) || '',
    paymentStatus: cleanPortalValue(entry.paymentStatus || entry.payment_status) || '',
    nextStep: cleanPortalValue(entry.nextStep) || '',
    openUrl: safePortalUrl(entry.openUrl || entry.open_url) || ''
  };
}

function normalizePortalApproval(approval = {}) {
  return {
    ...approval,
    type: cleanPortalValue(approval.type) || '',
    label: cleanPortalValue(approval.label) || 'Approval',
    approved: Boolean(approval.approved),
    approvedAt: cleanPortalValue(approval.approvedAt || approval.approved_at) || '',
    approvedBy: cleanPortalValue(approval.approvedBy || approval.approved_by) || ''
  };
}

export function normalizePortalPayload(data = {}) {
  const portal = data.portal && typeof data.portal === 'object' ? data.portal : {};
  const client = data.client && typeof data.client === 'object' ? data.client : {};
  const project = data.project && typeof data.project === 'object' ? data.project : {};
  const retainer = data.retainer && typeof data.retainer === 'object' ? data.retainer : {};
  const payment = data.payment && typeof data.payment === 'object' ? data.payment : {};
  const nextStep = data.nextStep && typeof data.nextStep === 'object' ? data.nextStep : {};
  const followUp = data.followUp && typeof data.followUp === 'object' ? data.followUp : {};
  const contact = data.contact && typeof data.contact === 'object' ? data.contact : {};
  const references = data.references && typeof data.references === 'object' ? data.references : {};
  const account = data.account && typeof data.account === 'object' ? data.account : {};

  return {
    ok: data.ok !== false,
    portal: {
      status: cleanPortalValue(portal.status) || 'active',
      url: safePortalUrl(portal.url) || '',
      entryUrl: safePortalUrl(portal.entryUrl || portal.entry_url) || '',
      expiresAt: cleanPortalValue(portal.expiresAt || portal.expires_at) || '',
      lastUpdated: cleanPortalValue(portal.lastUpdated || portal.last_updated) || ''
    },
    account: {
      access: cleanPortalValue(account.access) || 'invite_token',
      linked: Boolean(account.linked),
      email: cleanPortalValue(account.email) || '',
      auth: account.auth && typeof account.auth === 'object'
        ? {
            enabled: Boolean(account.auth.enabled),
            provider: cleanPortalValue(account.auth.provider) || '',
            mode: cleanPortalValue(account.auth.mode) || '',
            message: cleanPortalValue(account.auth.message) || ''
          }
        : {}
    },
    client: {
      name: cleanPortalValue(client.name) || 'Client details pending',
      brandBusiness: cleanPortalValue(client.brandBusiness || client.brand_business) || '',
      email: cleanPortalValue(client.email) || '',
      phone: cleanPortalValue(client.phone) || ''
    },
    project: normalizePortalProject(project),
    retainer: normalizePortalRetainer(retainer),
    documents: Array.isArray(data.documents) ? data.documents.map(normalizePortalDocument) : [],
    payment: normalizePortalPayment(payment),
    nextStep: {
      label: cleanPortalValue(nextStep.label) || cleanPortalValue(project.status) || 'Pending Review',
      message: cleanPortalValue(nextStep.message) || 'OTP is reviewing your project.'
    },
    followUp: {
      message: cleanPortalValue(followUp.message) || ''
    },
    contact: {
      email: cleanPortalValue(contact.email) || '',
      website: safePortalUrl(contact.website) || BUSINESS_WEBSITE
    },
    approvals: Array.isArray(data.approvals) ? data.approvals.map(normalizePortalApproval) : [],
    references: {
      supported: Boolean(references.supported ?? true),
      uploadSupported: Boolean(references.uploadSupported || references.upload_supported),
      message: cleanPortalValue(references.message) || 'Add safe public reference links or notes for OTP.',
      existingReferenceLink: safePortalUrl(references.existingReferenceLink || references.existing_reference_link) || '',
      submissions: Array.isArray(references.submissions)
        ? references.submissions.map((submission = {}) => ({
            submittedAt: cleanPortalValue(submission.submittedAt || submission.submitted_at) || '',
            link: safePortalUrl(submission.link) || '',
            notes: cleanPortalValue(submission.notes) || ''
          }))
        : []
    },
    projects: Array.isArray(data.projects) ? data.projects.map(normalizePortalEntry) : []
  };
}

export { cleanPortalValue, formatMoneyCents };
