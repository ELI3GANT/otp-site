const crypto = require('crypto');

const LEAD_ID = /^LEAD-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validLeadId(value) {
    return typeof value === 'string' && LEAD_ID.test(value);
}

function intakeDigest(envelope) {
    const stable = { ...envelope, lineage: { ...envelope.lineage, created_at: '' } };
    return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function publicIntakeRecord(envelope) {
    const leadId = envelope.lineage?.prospect_id;
    if (!validLeadId(leadId)) throw new Error('Invalid lead ID');
    return {
        lead_id: leadId,
        booking_id: envelope.booking_id,
        request_digest: intakeDigest(envelope),
        intake: envelope,
        sync_status: 'sync_pending'
    };
}

async function persistPublicIntake(client, envelope) {
    if (!client) throw new Error('Intake persistence unavailable');
    const record = publicIntakeRecord(envelope);
    const inserted = await client.from('otp_public_intakes').insert(record).select('lead_id,booking_id,request_digest,sync_status').single();
    if (!inserted.error && inserted.data) return { ...inserted.data, replay: false };
    if (inserted.error?.code !== '23505') throw inserted.error || new Error('Intake persistence unconfirmed');
    const existing = await client.from('otp_public_intakes')
        .select('lead_id,booking_id,request_digest,sync_status')
        .eq('lead_id', record.lead_id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) {
        const conflict = new Error('Booking ID already belongs to another lead');
        conflict.code = 'intake_idempotency_conflict';
        throw conflict;
    }
    if (existing.data.booking_id !== record.booking_id || existing.data.request_digest !== record.request_digest) {
        const conflict = new Error('Lead ID already belongs to another intake');
        conflict.code = 'intake_idempotency_conflict';
        throw conflict;
    }
    return { ...existing.data, replay: true };
}

async function markPublicIntakeSync(client, leadId, status) {
    const result = await client.from('otp_public_intakes').update({ sync_status: status, updated_at: new Date().toISOString() }).eq('lead_id', leadId);
    if (result.error) throw result.error;
}

async function retryPublicIntakes(client, forward) {
    const pending = await client.from('otp_public_intakes')
        .select('lead_id,intake')
        .in('sync_status', ['sync_pending', 'sync_failed'])
        .order('updated_at', { ascending: true }).limit(20);
    if (pending.error) throw pending.error;
    let synced = 0;
    let failed = 0;
    for (const row of pending.data || []) {
        try {
            await forward(row.intake);
            await markPublicIntakeSync(client, row.lead_id, 'synced');
            synced += 1;
        } catch (_) {
            await markPublicIntakeSync(client, row.lead_id, 'sync_failed');
            failed += 1;
        }
    }
    return { attempted: (pending.data || []).length, synced, failed };
}

module.exports = { validLeadId, intakeDigest, publicIntakeRecord, persistPublicIntake, markPublicIntakeSync, retryPublicIntakes };
