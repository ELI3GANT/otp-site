/**
 * Ops packets contract (static).
 * Ensures packet endpoints + terminal wiring stay present.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('OPS PACKETS CONTRACT TESTS...');

const server = read('server.js');
const terminal = read('otp-terminal.html');
const adminCore = read('admin-core.js');

// Endpoints exist
assert.match(server, /\/api\/admin\/ops\/packets\/preview/);
assert.match(server, /\/api\/admin\/ops\/packets\/export-zip/);
assert.match(server, /\/api\/admin\/ops\/send\/prepare/);
assert.match(server, /\/api\/admin\/ops\/send\/execute/);
assert.match(server, /new JSZip\(/);

// Terminal UI exists
assert.ok(terminal.includes('PACKET BUILDER'));
assert.ok(terminal.includes('SEND (CONTROLLED)'));
assert.ok(terminal.includes('opsSendStatus'));
assert.ok(terminal.includes('opsSendTo'));
assert.ok(terminal.includes('opsSendSubject'));
assert.ok(terminal.includes('opsSendBody'));
assert.ok(terminal.includes('opsPacketStatus'));
assert.ok(terminal.includes('opsPacketDocNeed'));
assert.ok(terminal.includes('EXPORT PACKET ZIP'));

// Admin-core wiring exists
assert.ok(adminCore.includes('window.previewOpsPacket = async function'));
assert.ok(adminCore.includes('window.exportOpsPacketZip = async function'));
assert.ok(adminCore.includes('/api/admin/ops/packets/preview'));
assert.ok(adminCore.includes('/api/admin/ops/packets/export-zip'));
assert.ok(adminCore.includes('window.prepareOpsSend = async function'));
assert.ok(adminCore.includes('window.executeOpsSend = async function'));
assert.ok(adminCore.includes('/api/admin/ops/send/prepare'));
assert.ok(adminCore.includes('/api/admin/ops/send/execute'));

console.log('OPS PACKETS CONTRACT COMPLETE');

