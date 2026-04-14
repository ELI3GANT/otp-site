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
assert.match(server, /\/api\/admin\/ops\/jobs\/update-status/);
assert.match(server, /\/api\/admin\/ops\/jobs\/archive/);
assert.match(server, /\/api\/admin\/ops\/jobs\/delete/);

// Core business rule enforcement hints (static)
assert.match(server, /Deposit Amount cannot exceed Total Price/);
assert.match(server, /Remaining balance cannot be negative/);
assert.match(server, /Due Date cannot be before Start Date/);
assert.match(server, /sourceTypeRaw/, 'supports sourceType input');
assert.match(server, /source_type:\s*sourceType/, 'persists source_type from normalized sourceType');
assert.match(server, /:\s*'manualIntake'/, 'default sourceType remains manualIntake');

// Terminal wiring exists
assert.ok(terminal.includes('OTP Quick Intake / Job Sheet'), 'Terminal section exists');
assert.ok(terminal.includes('opsJobsManager'), 'opsJobsManager mount');

// Admin-core wiring exists
assert.ok(adminCore.includes('fetchOpsJobs'), 'fetchOpsJobs exists');
assert.ok(adminCore.includes('saveOpsJob'), 'saveOpsJob exists');
assert.ok(adminCore.includes('/api/admin/ops/jobs/upsert'), 'upsert endpoint called');

console.log('   ✅ Ops jobs contract OK');
console.log('🎉 OPS JOBS CONTRACT COMPLETE');

