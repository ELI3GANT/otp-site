export const PAYMENT_STATES_V2 = Object.freeze([
  'not_started',
  'quote_ready',
  'invoice_ready',
  'payment_link_ready',
  'deposit_requested',
  'deposit_paid',
  'partial_paid',
  'paid_in_full',
  'balance_due',
  'overdue',
  'receipt_ready',
  'receipt_sent',
  'refunded',
  'cancelled',
  'manual_review_required'
]);

export const PAYMENT_GUARDRAIL_V2 = 'Manual review required before sending, charging, marking paid, or publishing.';

const STATE_LABELS = Object.freeze({
  not_started: 'Not Started',
  quote_ready: 'Quote Ready',
  invoice_ready: 'Invoice Ready',
  payment_link_ready: 'Payment Link Ready',
  deposit_requested: 'Deposit Requested',
  deposit_paid: 'Deposit Paid',
  partial_paid: 'Partial Paid',
  paid_in_full: 'Paid In Full',
  balance_due: 'Balance Due',
  overdue: 'Overdue',
  receipt_ready: 'Receipt Ready',
  receipt_sent: 'Receipt Sent',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  manual_review_required: 'Manual Review Required'
});

function textValue(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
}

function centsValue(record, ...keys) {
  for (const key of keys) {
    const raw = record?.[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const value = Number(raw);
    return { present: true, invalid: !Number.isFinite(value) || value < 0, value: Number.isFinite(value) ? Math.round(value) : 0 };
  }
  return { present: false, invalid: false, value: 0 };
}

function normalizedDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? Date.parse(`${raw}T12:00:00Z`) : Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function dayDistance(dueDate, nowValue) {
  if (!dueDate) return null;
  const now = normalizedDate(nowValue) || new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return Math.ceil((due - start) / 86400000);
}

function paymentLinkState(record, override, nowValue) {
  const supplied = String(override || '').trim();
  if (supplied) return supplied;
  const url = textValue(record, 'payment_url', 'paymentUrl', 'payment_link_url', 'paymentLink');
  if (!url) return 'No link';
  try {
    if (new URL(url).protocol !== 'https:') return 'Broken';
  } catch {
    return 'Broken';
  }
  const status = textValue(record, 'payment_link_status', 'paymentLinkStatus');
  if (/expired|broken|failed|revoked/i.test(status)) return status || 'Broken';
  const expires = normalizedDate(textValue(record, 'payment_url_expires_at', 'paymentLinkExpiresAt'));
  const now = normalizedDate(nowValue) || new Date();
  if (expires && expires.getTime() < now.getTime()) return 'Expired';
  return status || 'Active';
}

function stateFor(summary) {
  if (summary.manualReviewRequired) return 'manual_review_required';
  if (summary.cancelled) return 'cancelled';
  if (summary.refunded) return 'refunded';
  if (summary.receiptSent) return 'receipt_sent';
  if (summary.receiptReadyExplicit && summary.receiptReady) return 'receipt_ready';
  if (summary.paidInFull) return 'paid_in_full';
  if (summary.overdue) return 'overdue';
  if (summary.depositPaid) return 'deposit_paid';
  if (summary.partialPaid) return 'partial_paid';
  if (summary.depositRequested) return 'deposit_requested';
  if (summary.paymentLinkReady) return 'payment_link_ready';
  if (summary.invoiceReady) return 'invoice_ready';
  if (summary.balanceDue && summary.dueDate) return 'balance_due';
  if (summary.quoteReady) return 'quote_ready';
  return 'not_started';
}

function nextPaymentAction(summary) {
  if (summary.manualReviewRequired) return 'Review missing or contradictory payment data before taking action.';
  if (summary.cancelled || summary.refunded) return 'Confirm the closed payment record and keep client communication manual.';
  if (summary.receiptReady) return 'Generate a receipt draft, review it, then send it manually.';
  if (summary.overdue) return 'Review the overdue balance and approve a payment reminder manually.';
  if (summary.depositPaid) return 'Confirm deposit evidence before work continues.';
  if (summary.partialPaid || summary.balanceDue) return 'Review the remaining balance and approve the next follow-up.';
  if (summary.paymentLinkReady) return 'Attach the reviewed payment link before manually sending the invoice.';
  if (summary.invoiceReady) return 'Send the invoice only after manual review.';
  if (summary.quoteReady) return 'Review the quote and prepare the required client documents.';
  return 'Complete payment context and prepare an invoice for manual review.';
}

export function buildPaymentSummaryV2(record = {}, options = {}) {
  const clientName = textValue(record, 'client_name', 'clientName');
  const projectTitle = textValue(record, 'project_title', 'projectTitle', 'job_summary', 'jobSummary');
  const total = centsValue(record, 'total_price_cents', 'totalPriceCents', 'total_amount_cents', 'totalAmountCents');
  const deposit = centsValue(record, 'deposit_amount_cents', 'depositAmountCents');
  const paidInput = centsValue(record, 'amount_paid_cents', 'amountPaidCents');
  const balanceInput = centsValue(record, 'remaining_balance_cents', 'remainingBalanceCents', 'balance_due_cents', 'balanceDueCents');
  const status = textValue(record, 'payment_status', 'paymentStatus');
  const jobStatus = textValue(record, 'job_status', 'jobStatus');
  const paidStatus = /paid in full|^paid$/i.test(status);
  const depositStatus = /deposit paid/i.test(status);
  const partialStatus = /partial paid/i.test(status);
  let amountPaidCents = paidInput.present ? paidInput.value : paidStatus && total.present ? total.value : depositStatus && deposit.present ? deposit.value : 0;
  let balanceCents = balanceInput.present ? balanceInput.value : total.present ? Math.max(0, total.value - amountPaidCents) : 0;
  if (!paidInput.present && balanceInput.present && total.present && balanceCents <= total.value) amountPaidCents = total.value - balanceCents;

  const dueDateText = textValue(record, 'payment_due_at', 'paymentDueAt', 'payment_due_date', 'paymentDueDate', 'invoice_due_at', 'invoiceDueAt', 'invoice_due_date', 'invoiceDueDate', 'due_date', 'dueDate');
  const dueDate = normalizedDate(dueDateText);
  const daysUntilDue = dayDistance(dueDate, options.now);
  const invoiceState = String(options.invoiceState || textValue(record, 'invoice_status', 'invoiceStatus')).trim();
  const invoiceReady = Boolean(textValue(record, 'invoice_generated_at', 'invoiceGeneratedAt', 'invoice_number', 'invoiceNumber')) || /ready|sent|paid/i.test(invoiceState);
  const quoteReady = Boolean(textValue(record, 'proposal_generated_at', 'proposalGeneratedAt')) || /quote ready/i.test(jobStatus);
  const linkStatus = paymentLinkState(record, options.paymentLinkStatus, options.now);
  const paymentLinkReady = /active|ready/i.test(linkStatus);
  const receiptRecordedAt = options.receiptGeneratedAt || textValue(record, 'receipt_generated_at', 'receiptGeneratedAt');
  const receiptSentAt = textValue(record, 'receipt_sent_at', 'receiptSentAt');
  const receiptStatus = textValue(record, 'receipt_status', 'receiptStatus');
  const receiptReadyExplicit = /\bready\b/i.test(receiptStatus) && !/\bnot\s+ready\b/i.test(receiptStatus);
  const warnings = [];
  const missingFields = [];
  if (!clientName) missingFields.push('client');
  if (!projectTitle) missingFields.push('project');
  if (!total.present || total.value <= 0) missingFields.push('total_amount');
  if (total.invalid) warnings.push('Total amount is invalid.');
  if (deposit.invalid) warnings.push('Deposit amount is invalid.');
  if (paidInput.invalid) warnings.push('Amount paid is invalid.');
  if (balanceInput.invalid) warnings.push('Remaining balance is invalid.');
  if (total.present && deposit.value > total.value) warnings.push('Deposit exceeds total amount.');
  if (total.present && amountPaidCents > total.value) warnings.push('Amount paid exceeds total amount.');
  if (total.present && balanceCents > total.value) warnings.push('Remaining balance exceeds total amount.');
  if (paidStatus && balanceCents > 0) warnings.push('Paid status conflicts with the stored balance.');
  const paymentAccountingComplete = total.present
    && paidInput.present
    && amountPaidCents > 0
    && balanceInput.present
    && amountPaidCents + balanceCents === total.value;
  if ((paidStatus || depositStatus || amountPaidCents > 0) && !paymentAccountingComplete) {
    warnings.push('Recorded payment requires matching paid amount and remaining balance.');
  }
  if (amountPaidCents > 0 && !paidStatus && !depositStatus && !partialStatus) warnings.push('Recorded payment requires a compatible payment status.');
  if (receiptReadyExplicit && !paymentAccountingComplete) warnings.push('Receipt status requires recorded payment evidence.');

  const paidInFull = paymentAccountingComplete && total.value > 0 && paidStatus && balanceCents === 0;
  const depositPaid = paymentAccountingComplete && !paidInFull && depositStatus && deposit.value > 0 && amountPaidCents === deposit.value;
  const partialPaid = paymentAccountingComplete && !paidInFull && (depositStatus || partialStatus) && amountPaidCents > 0 && balanceCents > 0 && !depositPaid;
  const balanceDue = !paidInFull && balanceCents > 0;
  const overdue = balanceDue && daysUntilDue !== null && daysUntilDue < 0;
  const receiptSent = Boolean(receiptSentAt);
  const paymentMethod = textValue(record, 'payment_method', 'paymentMethod');
  const normalizedPaymentMethod = paymentMethod.toLowerCase();
  const paymentMethodRecorded = ['stripe', 'cash app', 'zelle', 'apple cash', 'apple pay', 'cash', 'card', 'other'].includes(normalizedPaymentMethod)
    || record.payment_link_status === 'Paid'
    || record.paymentLinkStatus === 'Paid';
  const receiptAccountingComplete = paymentAccountingComplete && paymentMethodRecorded;
  const receiptReady = receiptAccountingComplete && (receiptReadyExplicit || amountPaidCents > 0) && !receiptSent && !receiptRecordedAt;
  const reminderReady = balanceDue && (overdue || (daysUntilDue !== null && daysUntilDue <= 7) || /awaiting payment|invoice sent/i.test(jobStatus));
  const manualReviewRequired = Boolean(missingFields.length || warnings.length || (!dueDate && dueDateText));
  const summary = {
    clientName,
    projectTitle,
    jobType: textValue(record, 'job_type', 'jobType', 'service_type', 'serviceType'),
    documentId: textValue(record, 'invoice_number', 'invoiceNumber', 'document_id', 'documentId') || 'Not assigned',
    totalCents: total.value,
    depositCents: deposit.value,
    amountPaidCents,
    balanceCents,
    dueDate: dueDateText,
    daysUntilDue,
    paymentStatus: status || 'Not started',
    paymentMethod: textValue(record, 'payment_method', 'paymentMethod') || 'Not recorded',
    paymentLinkStatus: linkStatus,
    invoiceReady,
    quoteReady,
    paymentLinkReady,
    depositRequested: /deposit requested/i.test(status),
    depositPaid,
    partialPaid,
    paidInFull,
    balanceDue,
    overdue,
    receiptReady,
    receiptReadyExplicit,
    receiptSent,
    receiptRecordedAt,
    reminderReady,
    refunded: /refund/i.test(status),
    cancelled: /cancel/i.test(status),
    manualReviewRequired,
    missingFields: Object.freeze(missingFields),
    warnings: Object.freeze(warnings)
  };
  summary.state = stateFor(summary);
  summary.stateLabel = STATE_LABELS[summary.state];
  summary.workflowStates = Object.freeze([
    summary.state,
    summary.receiptReady ? 'receipt_ready' : '',
    summary.receiptSent ? 'receipt_sent' : '',
    summary.balanceDue ? 'balance_due' : '',
    summary.overdue ? 'overdue' : '',
    summary.paymentLinkReady ? 'payment_link_ready' : '',
    summary.invoiceReady ? 'invoice_ready' : '',
    summary.manualReviewRequired ? 'manual_review_required' : ''
  ].filter((value, index, values) => value && values.indexOf(value) === index));
  summary.nextAction = nextPaymentAction(summary);
  summary.guardrail = PAYMENT_GUARDRAIL_V2;
  summary.clientVisibility = Object.freeze({
    totalCents: summary.totalCents,
    depositPaid: summary.depositPaid,
    amountPaidCents: summary.amountPaidCents,
    balanceCents: summary.balanceCents,
    dueDate: summary.dueDate,
    paymentLinkReady: summary.paymentLinkReady,
    receiptState: summary.receiptSent ? 'sent' : summary.receiptReady ? 'ready_for_manual_review' : 'not_ready'
  });
  return Object.freeze(summary);
}

export function buildPaymentsOverviewV2(records = []) {
  return Object.freeze({
    openBalanceCents: records.reduce((sum, record) => sum + Math.max(0, record.balanceCents), 0),
    depositPaidCount: records.filter((record) => record.depositPaid).length,
    depositPaidCents: records.reduce((sum, record) => sum + (record.depositPaid ? Math.min(record.amountPaidCents, record.depositCents || record.amountPaidCents) : 0), 0),
    paidInFullCount: records.filter((record) => record.paidInFull).length,
    paidInFullCents: records.reduce((sum, record) => sum + (record.paidInFull ? record.totalCents : 0), 0),
    overdueAttentionCount: records.filter((record) => record.overdue || record.manualReviewRequired).length,
    receiptReadyCount: records.filter((record) => record.receiptReady).length,
    paymentLinkReadyCount: records.filter((record) => record.paymentLinkReady).length
  });
}

export function paymentMatchesFilterV2(record, filter = 'All') {
  const normalized = String(filter || 'All').toLowerCase();
  if (normalized === 'all') return true;
  if (normalized === 'needs invoice') return !record.invoiceReady && !record.manualReviewRequired;
  if (normalized === 'payment link ready') return record.paymentLinkReady;
  if (normalized === 'deposit paid') return record.depositPaid;
  if (normalized === 'partial paid') return record.partialPaid;
  if (normalized === 'balance due') return record.balanceDue;
  if (normalized === 'overdue') return record.overdue;
  if (normalized === 'paid in full') return record.paidInFull;
  if (normalized === 'receipt ready') return record.receiptReady;
  if (normalized === 'manual review') return record.manualReviewRequired;
  return record.workflowStates.includes(normalized.replace(/[\s-]+/g, '_'));
}
