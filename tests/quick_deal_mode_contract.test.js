/**
 * Quick Deal Mode contract checks (server + terminal wiring).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('QUICK DEAL MODE CONTRACT TESTS...');

const server = read('server.js');
const adminCore = read('admin-core.js');
const terminal = read('otp-terminal.html');

// Server must accept ops_jobs sourceType from payload and allow quickDeal.
assert.match(server, /sourceTypeRaw/);
assert.match(server, /\['manualIntake',\s*'quickDeal'\]/);
assert.match(server, /source_type:\s*sourceType/);

// Terminal UI must contain the Quick Deal section and key ids.
assert.ok(terminal.includes('06.6 // Quick Deal Mode'));
assert.ok(terminal.includes('id="qdClientName"'));
assert.ok(terminal.includes('id="qdServiceType"'));
assert.ok(terminal.includes('id="qdPackageType"'));
assert.ok(terminal.includes('id="qdTotalPrice"'));
assert.ok(terminal.includes('id="qdDealStatus"'));
assert.ok(terminal.includes('class="qdDocNeed"'));

// Admin core must expose primary entry points.
assert.ok(adminCore.includes('window.saveQuickDeal = async function'));
assert.ok(adminCore.includes('window.resetQuickDeal = function'));
assert.ok(adminCore.includes('window.generateQuickDealPriorityDocs = async function'));
assert.ok(adminCore.includes('window.generateQuickDealSelectedDocs = async function'));
assert.ok(adminCore.includes('sourceType: \'quickDeal\''));

console.log('QUICK DEAL MODE CONTRACT COMPLETE');

