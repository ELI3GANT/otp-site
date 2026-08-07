const assert = require('assert');

const {
    bookingIdFromToken,
    createBookingIntakeEnvelope,
    publicWriterEvidenceFromOtpOs,
    validateOtpOsBookingResponse
} = require('../server/booking-handoff.js');

console.log('OTP BOOKING OS HANDOFF...');

const createdAt = '2026-08-07T14:30:00.000Z';
const payload = {
    booking_token: 'WEB-contract-test-0001',
    name: 'Avery Test',
    email: 'avery@example.test',
    phone: '',
    service_type: 'Website / Digital System',
    package_interest: 'The System',
    project_description: 'Prove the OS-first booking handoff.',
    contact_consent: true,
    source_tracking: { cta_source: 'contract_test', captured_at: createdAt },
    upload_ids: []
};
const bookingId = bookingIdFromToken(payload.booking_token);
const envelope = createBookingIntakeEnvelope(payload, { createdAt });

assert.equal(envelope.schema_version, 'otp-booking-intake-v1');
assert.equal(envelope.booking_id, bookingId);
assert.equal(envelope.idempotency_key, bookingId);
assert.equal(envelope.lineage.capture_id, bookingId);
assert.equal(envelope.lineage.created_at, createdAt);

const upstreamResponse = {
    ok: true,
    schema_version: 'otp-booking-intake-v1',
    booking_id: bookingId,
    lineage: envelope.lineage,
    writer_evidence: {
        writer: 'otp_os',
        contract_version: 'otp-booking-intake-v1',
        booking_id: bookingId,
        operational_record_ids: { contact_id: 'contact-private', job_id: 'job-private' },
        status: 'persisted',
        timestamp: createdAt
    }
};

assert.deepStrictEqual(validateOtpOsBookingResponse(upstreamResponse, bookingId), { valid: true, errors: [] });
assert.throws(() => validateOtpOsBookingResponse({}, bookingId, { throwOnError: true }), /invalid OTP OS booking response/i);
assert.throws(() => validateOtpOsBookingResponse({ ...upstreamResponse, booking_id: 'BOOK-WRONG' }, bookingId, { throwOnError: true }), /invalid OTP OS booking response/i);

assert.deepStrictEqual(publicWriterEvidenceFromOtpOs(upstreamResponse), {
    writer: 'otp_os',
    contract_version: 'otp-booking-intake-v1',
    booking_reference: bookingId,
    status: 'persisted',
    timestamp: createdAt
});
assert.ok(!JSON.stringify(publicWriterEvidenceFromOtpOs(upstreamResponse)).includes('contact-private'));
assert.ok(!JSON.stringify(publicWriterEvidenceFromOtpOs(upstreamResponse)).includes('job-private'));

console.log('OTP BOOKING OS HANDOFF OK');
