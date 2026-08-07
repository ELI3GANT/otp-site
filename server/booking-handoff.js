const crypto = require('crypto');
const bookingArtifact = require('../contracts/otp-booking-intake-v1.json');
const lineageArtifact = require('../contracts/otp-lineage-v1.json');
const { validateJsonSchema } = require('./json-schema-contract');

const BOOKING_CONTRACT_VERSION = bookingArtifact.contract;
const BOOKING_CONTRACT_DIGEST = bookingArtifact.digest;
const LINEAGE_CONTRACT_VERSION = lineageArtifact.contract;
const LINEAGE_CONTRACT_DIGEST = lineageArtifact.digest;
const BOOKING_SCHEMA = bookingArtifact.definition.schema;

function exactUtcTimestamp(value) {
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validateBookingSemantics(envelope) {
    const errors = [];
    if (!String(envelope.email || '').trim() && !String(envelope.phone || '').trim()) errors.push('email or phone is required');
    if (envelope.contact_consent !== true) errors.push('contact_consent must be true');
    if (!exactUtcTimestamp(envelope.lineage?.created_at)) errors.push('lineage created_at must be an ISO-8601 UTC timestamp');
    if (envelope.lineage?.capture_id !== envelope.booking_id || envelope.lineage?.source_id !== envelope.booking_id) errors.push('lineage booking identifiers must match booking_id');
    return errors;
}

function cleanText(value, max = 240) {
    return String(value || '').trim().slice(0, max);
}

function bookingIdFromToken(token) {
    const clean = cleanText(token, 120);
    if (clean) {
        const hash = crypto.createHash('sha256').update(clean).digest('hex').slice(0, 12).toUpperCase();
        return `BOOK-${hash}`;
    }
    return `BOOK-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}

function createBookingIntakeEnvelope(payload = {}, { createdAt = new Date().toISOString() } = {}) {
    const bookingId = bookingIdFromToken(payload.booking_token);
    const envelope = {
        schema_version: BOOKING_CONTRACT_VERSION,
        booking_id: bookingId,
        idempotency_key: bookingId,
        ...payload,
        lineage: {
            schema_version: LINEAGE_CONTRACT_VERSION,
            capture_id: bookingId,
            source_id: bookingId,
            originating_system: 'otp-site',
            originating_record_id: bookingId,
            created_at: createdAt,
            provenance: {
                source_type: 'public_booking',
                source_reference: bookingId,
                trust_level: 'user_submitted'
            }
        }
    };
    const errors = [...validateJsonSchema(envelope, BOOKING_SCHEMA), ...validateBookingSemantics(envelope)];
    if (errors.length) throw new Error(`Invalid canonical booking envelope: ${errors.join('; ')}`);
    return envelope;
}

function validateOtpOsBookingResponse(payload = {}, expectedBookingId = '', { throwOnError = false } = {}) {
    const errors = [];
    const evidence = payload && typeof payload.writer_evidence === 'object' ? payload.writer_evidence : {};
    const lineage = payload && typeof payload.lineage === 'object' ? payload.lineage : {};
    if (payload.ok !== true) errors.push('ok must be true');
    if (payload.schema_version !== BOOKING_CONTRACT_VERSION) errors.push('contract version mismatch');
    if (payload.booking_id !== expectedBookingId) errors.push('booking identifier mismatch');
    if (lineage.schema_version !== LINEAGE_CONTRACT_VERSION || lineage.capture_id !== expectedBookingId) {
        errors.push('lineage mismatch');
    }
    if (evidence.writer !== 'otp_os') errors.push('writer must be otp_os');
    if (evidence.contract_version !== BOOKING_CONTRACT_VERSION) errors.push('writer contract mismatch');
    if (evidence.booking_id !== expectedBookingId) errors.push('writer booking identifier mismatch');
    if (!['persisted', 'duplicate_replay'].includes(evidence.status)) errors.push('writer status is invalid');
    if (!Number.isFinite(Date.parse(String(evidence.timestamp || '')))) errors.push('writer timestamp is invalid');
    const result = { valid: errors.length === 0, errors };
    if (!result.valid && throwOnError) throw new Error(`Invalid OTP OS booking response: ${errors.join('; ')}`);
    return result;
}

function publicWriterEvidenceFromOtpOs(payload = {}) {
    const evidence = payload.writer_evidence || {};
    return {
        writer: 'otp_os',
        contract_version: BOOKING_CONTRACT_VERSION,
        booking_reference: cleanText(payload.booking_id, 160),
        status: cleanText(evidence.status, 40),
        timestamp: cleanText(evidence.timestamp, 40)
    };
}

function legacySiteWriterEvidence(bookingId, timestamp = new Date().toISOString()) {
    return {
        writer: 'legacy_site_direct',
        contract_version: BOOKING_CONTRACT_VERSION,
        booking_reference: cleanText(bookingId, 160),
        status: 'persisted',
        timestamp
    };
}

module.exports = {
    BOOKING_CONTRACT_VERSION,
    BOOKING_CONTRACT_DIGEST,
    LINEAGE_CONTRACT_VERSION,
    LINEAGE_CONTRACT_DIGEST,
    bookingIdFromToken,
    createBookingIntakeEnvelope,
    legacySiteWriterEvidence,
    publicWriterEvidenceFromOtpOs,
    validateOtpOsBookingResponse
};
