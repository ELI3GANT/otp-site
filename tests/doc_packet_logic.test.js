/**
 * Doc packet client-side helpers (mirrors admin-core.js semantics for regressions).
 */
const assert = require('assert');

function pickLatestFailedDocPacketSend(events) {
    if (!Array.isArray(events)) return null;
    for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i];
        if (!e || e.type !== 'doc_packet_send') continue;
        if (e.success) return null;
        if (e.id) return e;
    }
    return null;
}

console.log('🧪 DOC PACKET LOGIC TESTS...');

assert.strictEqual(pickLatestFailedDocPacketSend(null), null);
assert.strictEqual(pickLatestFailedDocPacketSend([]), null);

const onlySuccess = [
    { id: 'a', type: 'doc_packet_send', success: true },
];
assert.strictEqual(pickLatestFailedDocPacketSend(onlySuccess), null);

const failedThenSuccess = [
    { id: 'f1', type: 'doc_packet_send', success: false },
    { id: 's1', type: 'doc_packet_send', success: true },
];
assert.strictEqual(pickLatestFailedDocPacketSend(failedThenSuccess), null, 'A later successful send clears retry');

const successThenFailed = [
    { id: 's1', type: 'doc_packet_send', success: true },
    { id: 'f2', type: 'doc_packet_send', success: false },
];
assert.strictEqual(pickLatestFailedDocPacketSend(successThenFailed)?.id, 'f2');

const deliveryNoise = [
    { id: 'x', type: 'doc_packet_delivery_update', success: true },
    { id: 'f3', type: 'doc_packet_send', success: false },
];
assert.strictEqual(pickLatestFailedDocPacketSend(deliveryNoise)?.id, 'f3');

const loneFailure = [{ id: 'only', type: 'doc_packet_send', success: false }];
assert.strictEqual(pickLatestFailedDocPacketSend(loneFailure)?.id, 'only');

console.log('   ✅ pickLatestFailedDocPacketSend');
console.log('🎉 DOC PACKET LOGIC OK');
