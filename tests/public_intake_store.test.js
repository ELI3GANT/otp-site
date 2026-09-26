const assert = require('node:assert/strict');
const test = require('node:test');
const { createBookingIntakeEnvelope } = require('../server/booking-handoff.js');
const { persistPublicIntake, publicIntakeRecord, retryPublicIntakes } = require('../server/public-intake-store.js');

function envelope(leadId, bookingToken = leadId) {
    return createBookingIntakeEnvelope({
        lead_id: leadId,
        booking_token: bookingToken,
        name: 'Avery Test',
        email: 'avery@example.test',
        phone: '',
        service_type: 'Website / Digital System',
        package_interest: 'The System',
        project_description: 'A genuine request for a project.',
        contact_consent: true,
        source_tracking: { fixline_handoff: { leadId, ticketId: leadId.slice(5), primaryGoal: 'conversion' } }
    });
}

function client() {
    const rows = new Map();
    let failInsert = false;
    return {
        rows,
        failNextInsert() { failInsert = true; },
        from(name) {
            assert.equal(name, 'otp_public_intakes');
            return {
                insert(record) {
                    return { select() { return { async single() {
                        if (failInsert) { failInsert = false; return { data: null, error: { code: 'PERSIST_FAILED' } }; }
                        if (rows.has(record.lead_id)) return { data: null, error: { code: '23505' } };
                        rows.set(record.lead_id, record);
                        return { data: record, error: null };
                    } }; } };
                },
                select() {
                    return { eq(_, leadId) { return { async maybeSingle() { return { data: rows.get(leadId) || null, error: null }; } }; } };
                }
            };
        }
    };
}

const LEAD_A = 'LEAD-550e8400-e29b-41d4-a716-446655440001';
const LEAD_B = 'LEAD-550e8400-e29b-41d4-a716-446655440002';

test('Site stores one lead with FIXLINE and booking lineage before acknowledging', async () => {
    const store = client();
    const request = envelope(LEAD_A);
    const first = await persistPublicIntake(store, request);
    assert.equal(first.replay, false);
    assert.equal(store.rows.size, 1);
    assert.equal(store.rows.get(LEAD_A).intake.lineage.prospect_id, LEAD_A);
    assert.equal(store.rows.get(LEAD_A).intake.source_tracking.fixline_handoff.ticketId, LEAD_A.slice(5));
    assert.equal(store.rows.get(LEAD_A).booking_id, request.booking_id);
});

test('double click, HTTP retry, and refresh reuse the same durable lead', async () => {
    const store = client();
    await persistPublicIntake(store, envelope(LEAD_A));
    const replay = await persistPublicIntake(store, envelope(LEAD_A));
    assert.equal(replay.replay, true);
    assert.equal(store.rows.size, 1);
});

test('a changed request under one lead ID conflicts and a new intake gets a new row', async () => {
    const store = client();
    await persistPublicIntake(store, envelope(LEAD_A));
    await assert.rejects(persistPublicIntake(store, envelope(LEAD_A, 'different-booking')), { code: 'intake_idempotency_conflict' });
    const next = await persistPublicIntake(store, envelope(LEAD_B));
    assert.equal(next.replay, false);
    assert.equal(store.rows.size, 2);
});

test('durable persistence failure cannot produce a received row', async () => {
    const store = client();
    store.failNextInsert();
    await assert.rejects(persistPublicIntake(store, envelope(LEAD_A)));
    assert.equal(store.rows.size, 0);
});

test('the shared record carries sync state without changing booking identity', () => {
    const record = publicIntakeRecord(envelope(LEAD_A));
    assert.equal(record.sync_status, 'sync_pending');
    assert.equal(record.intake.idempotency_key, record.booking_id);
});

test('downstream outage stays retryable and later sync uses the same lead and booking', async () => {
    const original = publicIntakeRecord(envelope(LEAD_A));
    const rows = [original];
    const store = {
        from(name) {
            assert.equal(name, 'otp_public_intakes');
            return {
                select() { return { in() { return { order() { return { async limit() { return { data: rows.filter((row) => row.sync_status !== 'synced'), error: null }; } }; } }; } }; },
                update(change) { return { async eq(_, leadId) {
                    const row = rows.find((item) => item.lead_id === leadId);
                    row.sync_status = change.sync_status;
                    return { error: null };
                } }; }
            };
        }
    };
    const failed = await retryPublicIntakes(store, async () => { throw new Error('OS down'); });
    assert.deepEqual(failed, { attempted: 1, synced: 0, failed: 1 });
    assert.equal(rows[0].sync_status, 'sync_failed');
    const sent = [];
    const recovered = await retryPublicIntakes(store, async (intake) => sent.push(intake));
    assert.deepEqual(recovered, { attempted: 1, synced: 1, failed: 0 });
    assert.equal(rows[0].sync_status, 'synced');
    assert.equal(sent[0].lineage.prospect_id, LEAD_A);
    assert.equal(sent[0].booking_id, original.booking_id);
    assert.deepEqual(await retryPublicIntakes(store, async () => { throw new Error('unexpected call'); }), { attempted: 0, synced: 0, failed: 0 });
});
