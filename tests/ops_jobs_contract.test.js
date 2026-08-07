/**
 * OTP Ops Jobs contract (static).
 * Ensures the internal job sheet foundation stays wired and consistent.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('🧪 OPS JOBS CONTRACT...');

const server = read('server.js');
const terminal = read('otp-terminal.html');
const adminCore = read('admin-core.js');

// Server endpoints exist
assert.match(server, /\/api\/admin\/ops\/jobs\/list/);
assert.match(server, /\/api\/admin\/ops\/jobs\/get/);
assert.match(server, /\/api\/admin\/ops\/jobs\/upsert/);
assert.match(server, /\/api\/admin\/ops\/jobs\/from-oracle/);
assert.match(server, /buildOpsJobPayloadFromLeadAndOracle/);
assert.match(server, /\/api\/admin\/ops\/jobs\/update-status/);
assert.match(server, /\/api\/admin\/ops\/jobs\/archive/);
assert.match(server, /\/api\/admin\/ops\/jobs\/restore/);
assert.match(server, /\/api\/admin\/ops\/jobs\/delete/);
const statusRoute = server.slice(
    server.indexOf("app.post('/api/admin/ops/jobs/update-status'"),
    server.indexOf("app.post('/api/admin/ops/jobs/archive'")
);
assert.match(statusRoute, /createJobAdminMutationEnvelope/);
assert.match(statusRoute, /forwardJobAdminMutation/);
assert.doesNotMatch(statusRoute, /supabaseAdmin|\.from\(['"]ops_jobs['"]\)|\.update\(/, 'default status route cannot directly mutate ops_jobs');
const archiveRoute = server.slice(
    server.indexOf('async function handleJobArchiveLifecycle'),
    server.indexOf("app.post('/api/admin/ops/jobs/delete'")
);
assert.match(server, /createJobArchiveEnvelope/);
assert.match(server, /forwardJobArchiveMutation/);
assert.doesNotMatch(archiveRoute, /supabaseAdmin|\.from\(['"]ops_jobs['"]\)|\.update\(/, 'archive and restore routes cannot directly mutate ops_jobs');

// Core business rule enforcement hints (static)
assert.match(server, /Deposit Amount cannot exceed Total Price/);
assert.match(server, /Remaining balance cannot be negative/);
assert.match(server, /Due Date cannot be before Start Date/);
assert.match(server, /sourceTypeRaw/, 'supports sourceType input');
assert.match(server, /source_type:\s*sourceType/, 'persists source_type from normalized sourceType');
assert.match(server, /:\s*'manualIntake'/, 'default sourceType remains manualIntake');
assert.match(server, /oracleLead/, 'ops job sourceType allows oracleLead');
assert.match(server, /otp_bookings/, 'ops job sourceType allows public OTP Bookings');

// Terminal wiring exists
assert.ok(terminal.includes('OTP Quick Intake / Job Sheet'), 'Terminal section exists');
assert.ok(terminal.includes('opsJobsManager'), 'opsJobsManager mount');

// Admin-core wiring exists
assert.ok(adminCore.includes('fetchOpsJobs'), 'fetchOpsJobs exists');
assert.ok(adminCore.includes('saveOpsJob'), 'saveOpsJob exists');
assert.ok(adminCore.includes('/api/admin/ops/jobs/upsert'), 'upsert endpoint called');
assert.ok(adminCore.includes('/api/admin/ops/jobs/from-oracle'), 'Oracle → job bootstrap endpoint used');
assert.ok(adminCore.includes('renderOpsProfileSnapshot'), 'connected client/job profile snapshot exists');
assert.ok(adminCore.includes('This document needs a price before it can be generated'), 'invoice generation blocks missing price');
assert.ok(adminCore.includes("sourceType: currentJob.sourceType || 'manualIntake'"), 'saving an existing booking/oracle job preserves sourceType');
assert.ok(adminCore.includes("'Idempotency-Key': idempotencyKey"), 'status transition includes an idempotency key');
assert.ok(adminCore.includes('expectedCurrentStatus, reason, idempotencyKey'), 'status transition includes expected state and operator reason');
assert.ok(adminCore.includes('window.restoreOpsJob'), 'archived jobs expose a restore action');
assert.ok(adminCore.includes('expectedArchiveState, requestedArchiveState, reason, confirmed: true, idempotencyKey'), 'archive lifecycle includes expected state, confirmation, reason, and idempotency');
assert.ok(adminCore.includes("['New Lead', 'In Progress', 'Ready for Review'].includes(r.jobStatus)"), 'status action remains reachable for the shared non-payment New Lead state');

console.log('   ✅ Ops jobs contract OK');
console.log('🎉 OPS JOBS CONTRACT COMPLETE');
