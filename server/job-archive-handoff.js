const jobArchiveArtifact = require('../contracts/otp-job-archive-v1.json');
const { validateJsonSchema } = require('./json-schema-contract');

const JOB_ARCHIVE_CONTRACT_VERSION = jobArchiveArtifact.contract;
const JOB_ARCHIVE_CONTRACT_DIGEST = jobArchiveArtifact.digest;
const REQUEST_SCHEMA = jobArchiveArtifact.definition.schemas.request;
const RESPONSE_SCHEMA = jobArchiveArtifact.definition.schemas.response;

function exactUtcTimestamp(value) {
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function clean(value, max = 240) {
    return String(value || '').trim().slice(0, max);
}

function createJobArchiveEnvelope(input = {}, { createdAt = new Date().toISOString() } = {}) {
    const operation = clean(input.operation, 20);
    const jobId = clean(input.jobId, 160);
    const idempotencyKey = clean(input.idempotencyKey, 240);
    const envelope = {
        schema_version: JOB_ARCHIVE_CONTRACT_VERSION,
        operation,
        job_id: jobId,
        expected_archive_state: clean(input.expectedArchiveState, 20),
        requested_archive_state: clean(input.requestedArchiveState, 20),
        authority: {
            schema_version: 'otp-authority-v1',
            capability: operation === 'archive' ? 'ops_job.archive' : 'ops_job.restore',
            authority_level: 'level_2_guarded_mutation',
            actor: clean(input.actor, 120),
            reason: clean(input.reason, 1000),
            source: 'otp-site',
            target: `ops_job:${jobId}`,
            timestamp: createdAt,
            idempotency_key: idempotencyKey,
            approval_requirement: 'operator_confirmation',
            reversible: true,
            audit_required: true
        },
        lineage: {
            schema_version: 'otp-lineage-v1',
            workflow_id: idempotencyKey,
            project_id: jobId,
            originating_system: 'otp-site',
            originating_record_id: jobId,
            created_at: createdAt,
            provenance: {
                source_type: 'admin_job_archive',
                source_reference: jobId,
                trust_level: 'authenticated_admin'
            }
        }
    };
    const states = operation === 'archive' ? ['active', 'archived'] : ['archived', 'active'];
    const errors = validateJsonSchema(envelope, REQUEST_SCHEMA);
    if (envelope.expected_archive_state !== states[0] || envelope.requested_archive_state !== states[1]) errors.push('archive lifecycle transition mismatch');
    if (!exactUtcTimestamp(createdAt)) errors.push('archive timestamp is invalid');
    if (errors.length) {
        const error = new Error(`Invalid canonical job archive mutation: ${errors.join('; ')}`);
        error.errorCode = 'invalid_job_archive_contract';
        error.statusCode = 400;
        throw error;
    }
    return envelope;
}

function validateOtpOsJobArchiveResponse(payload = {}, expectedJobId = '', expectedOperation = '') {
    const errors = validateJsonSchema(payload, RESPONSE_SCHEMA);
    if (!exactUtcTimestamp(payload.timestamp)) errors.push('response timestamp is invalid');
    if (payload.writer !== 'otp_os') errors.push('writer mismatch');
    if (payload.target_job_id !== expectedJobId) errors.push('target job mismatch');
    if (payload.operation !== expectedOperation) errors.push('operation mismatch');
    if (payload.audit_reference !== payload.audit?.audit_id) errors.push('audit reference mismatch');
    return { valid: errors.length === 0, errors };
}

async function forwardJobArchiveMutation(envelope, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Math.max(10, Math.min(15000, Number(options.timeoutMs || 8000)));
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await options.fetchImpl(new URL('/api/integrations/otp-site/jobs/archive', options.baseUrl).href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', Accept: 'application/json',
                Authorization: `Bearer ${options.token}`,
                'Idempotency-Key': envelope.authority.idempotency_key
            },
            body: JSON.stringify(envelope),
            redirect: 'manual',
            signal: controller.signal
        });
        const text = await response.text();
        let payload;
        try { payload = JSON.parse(text || '{}'); }
        catch (_) { payload = null; }
        if (!response.ok || !payload || payload.ok !== true) {
            const error = new Error(payload?.message || `OTP OS job archive failed (${response.status}).`);
            error.statusCode = response.ok ? 502 : response.status;
            error.errorCode = clean(payload?.errorCode || payload?.error_code || (payload ? 'otp_os_job_archive_failed' : 'malformed_otp_os_response'), 120);
            throw error;
        }
        const validation = validateOtpOsJobArchiveResponse(payload, envelope.job_id, envelope.operation);
        if (!validation.valid) {
            const error = new Error('OTP OS returned an invalid job archive response.');
            error.statusCode = 502;
            error.errorCode = 'malformed_otp_os_response';
            throw error;
        }
        return payload;
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeout = new Error('OTP OS job archive timed out.');
            timeout.statusCode = 504;
            timeout.errorCode = 'otp_os_timeout';
            throw timeout;
        }
        if (!error.statusCode) {
            error.statusCode = 503;
            error.errorCode = 'otp_os_unavailable';
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function adminSafeJobArchiveResult(payload = {}) {
    return {
        success: true,
        writerEvidence: {
            writer: 'otp_os', contractVersion: JOB_ARCHIVE_CONTRACT_VERSION,
            targetJobId: clean(payload.target_job_id, 160), operation: clean(payload.operation, 20),
            auditReference: clean(payload.audit_reference, 160), replay: payload.replay === true,
            timestamp: clean(payload.timestamp, 40)
        },
        row: {
            jobId: clean(payload.target_job_id, 160),
            jobStatus: clean(payload.after_state?.job_status, 80),
            archiveState: clean(payload.after_state?.archive_state, 20),
            archivedAt: clean(payload.after_state?.archived_at, 40),
            archivedFromStatus: clean(payload.after_state?.archived_from_status, 80),
            updatedAt: clean(payload.after_state?.updated_at, 40),
            updatedBy: clean(payload.after_state?.updated_by, 120)
        },
        audit: payload.audit
    };
}

module.exports = {
    JOB_ARCHIVE_CONTRACT_DIGEST,
    JOB_ARCHIVE_CONTRACT_VERSION,
    adminSafeJobArchiveResult,
    createJobArchiveEnvelope,
    forwardJobArchiveMutation,
    validateOtpOsJobArchiveResponse
};
