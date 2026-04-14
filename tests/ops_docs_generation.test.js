/**
 * Ops docs generation — pure unit tests (no DB).
 */
const assert = require('assert');
const { generateOpsDocument } = require('../ops-docs.js');

console.log('OPS DOCS GENERATION TESTS...');

const pricing = {
  packages: {
    theSignal: { label: 'The Signal', price_display: 'Starting at $500' },
    theEngine: { label: 'The Engine', price_display: '$1,200 to $2,000' },
    theSystem: { label: 'The System', price_display: 'Starting at $3,500+' },
    custom: { label: 'Custom', price_display: 'Scope-based' },
  },
  services: {
    videoEditing: { label: 'Video Editing Services', price_display: '$150 to $800+', type: 'one_time_range' },
  }
};

const job = {
  jobId: 'JOB_TEST_001',
  clientName: 'Test Client',
  businessName: 'Test Brand',
  phone: '555-111-2222',
  email: 'test@example.com',
  serviceType: 'Video Editing Services',
  packageType: 'The Signal',
  projectTitle: 'April Edit',
  projectDescription: 'Short-form edit package.',
  deliverables: '3 reels, 1 long cut.',
  addOns: '',
  startDate: '2026-04-01',
  dueDate: '2026-04-10',
  totalPriceCents: 50000,
  depositAmountCents: 25000,
  remainingBalanceCents: 25000,
  paymentMethod: 'Zelle',
  paymentStatus: 'Deposit Paid',
  clientNotes: 'Client prefers bold captions.',
  internalNotes: 'PRIVATE: never show this.',
  portfolioPermission: false,
  agreementSigned: false,
  invoiceSent: true,
  jobStatus: 'Active Client',
};

for (const t of ['Proposal', 'Invoice', 'Agreement', 'Paid Receipt', 'Service Summary']) {
  const out = generateOpsDocument({ docType: t, job, pricing });
  assert.ok(out.ok, `ok for ${t}`);
  assert.ok(out.doc, `doc for ${t}`);
  assert.strictEqual(out.doc.doc_type, t);
  assert.ok(typeof out.doc.rendered_markdown === 'string' && out.doc.rendered_markdown.length > 40);
  assert.ok(!out.doc.rendered_markdown.includes(job.internalNotes), 'internal notes not leaked');
}

// Invoice should warn/fail gracefully without a total.
{
  const job2 = { ...job, totalPriceCents: null };
  const out = generateOpsDocument({ docType: 'Invoice', job: job2, pricing });
  assert.ok(out.ok, 'invoice still returns ok with warnings');
  assert.ok(Array.isArray(out.doc.warnings));
  assert.ok(out.doc.warnings.join(' ').toLowerCase().includes('missing totalprice'));
}

console.log('OPS DOCS GENERATION COMPLETE');

