const jobMutationArtifact = require('../contracts/otp-job-admin-mutation-v1.json');
const { validateJsonSchema } = require('./json-schema-contract');

const JOB_ADMIN_MUTATION_CONTRACT_VERSION = jobMutationArtifact.contract;
const JOB_ADMIN_MUTATION_CONTRACT_DIGEST = jobMutationArtifact.digest;
const REQUEST_SCHEMA = jobMutationArtifact.definition.schemas.request;
const RESPONSE_SCHEMA = jobMutationArtifact.definition.schemas.response;

function exactUtcTimestamp(value) {
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function clean(value, max = 240) {
    return String(value || '').trim().slice(0, max);
}

function validateSemantics(envelope) {
    const errors = [];
    if (!exactUtcTimestamp(envelope.authority?.timestamp)) errors.push('authority timestamp is invalid');
    if (!exactUtcTimestamp(envelope.lineage?.created_at)) errors.push('lineage timestamp is invalid');
    if (envelope.authority?.capability !== 'ops_job.status.transition') errors.push('capability mismatch');
    if (envelope.authority?.authority_level !== 'level_2_guarded_mutation') errors.push('authority level mismatch');
    if (envelope.authority?.source !== 'otp-site' || envelope.authority?.target !== `ops_job:${envelope.job_id}`) errors.push('authority boundary mismatch');
    if (envelope.lineage?.originating_system !== 'otp-site' || envelope.lineage?.originating_record_id !== envelope.job_id) errors.push('lineage boundary mismatch');
    return errors;
}

function createJobAdminMutationEnvelope(input = {}, { createdAt = new Date().toISOString() } = {}) {
    const jobId = clean(input.jobId, 160);
    const idempotencyKey = clean(input.idempotencyKey, 240);
    const envelope = {
        schema_version: JOB_ADMIN_MUTATION_CONTRACT_VERSION,
        operation: 'transition_status',
        job_id: jobId,
        expected_current_status: clean(input.expectedCurrentStatus, 80),
        requested_next_status: clean(input.requestedNextStatus, 80),
        authority: {
            schema_version: 'otp-authority-v1',
            capability: 'ops_job.status.transition',
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
                source_type: 'admin_job_status_transition',
                source_reference: jobId,
                trust_level: 'authenticated_admin'
            }
        }
    };
    const errors = [...validateJsonSchema(envelope, REQUEST_SCHEMA), ...validateSemantics(envelope)];
    if (errors.length) {
        const error = new Error(`Invalid canonical job admin mutation: ${errors.join('; ')}`);
        error.errorCode = 'invalid_job_mutation_contract';
        error.statusCode = 400;
        throw error;
    }
    return envelope;
}

function validateOtpOsJobAdminMutationResponse(payload = {}, expectedJobId = '') {
    const errors = validateJsonSchema(payload, RESPONSE_SCHEMA);
    if (!exactUtcTimestamp(payload.timestamp)) errors.push('response timestamp is invalid');
    if (payload.writer !== 'otp_os') errors.push('writer mismatch');
    if (payload.target_job_id !== expectedJobId) errors.push('target job mismatch');
    if (payload.audit_reference !== payload.audit?.audit_id) errors.push('audit reference mismatch');
    return { valid: errors.length === 0, errors };
}

async function forwardJobAdminMutation(envelope, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Math.max(10, Math.min(15000, Number(options.timeoutMs || 8000)));
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await options.fetchImpl(new URL('/api/integrations/otp-site/jobs/status', options.baseUrl).href, {
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
            const error = new Error(payload?.message || `OTP OS job mutation failed (${response.status}).`);
            error.statusCode = response.ok ? 502 : response.status;
            error.errorCode = clean(payload?.errorCode || payload?.error_code || (payload ? 'otp_os_job_mutation_failed' : 'malformed_otp_os_response'), 120);
            throw error;
        }
        const validation = validateOtpOsJobAdminMutationResponse(payload, envelope.job_id);
        if (!validation.valid) {
            const error = new Error('OTP OS returned an invalid job mutation response.');
            error.statusCode = 502;
            error.errorCode = 'malformed_otp_os_response';
            throw error;
        }
        return payload;
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeout = new Error('OTP OS job mutation timed out.');
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

function adminSafeJobMutationResult(payload = {}) {
    return {
        success: true,
        writerEvidence: {
            writer: 'otp_os', contractVersion: JOB_ADMIN_MUTATION_CONTRACT_VERSION,
            targetJobId: clean(payload.target_job_id, 160), operation: clean(payload.operation, 80),
            auditReference: clean(payload.audit_reference, 160), replay: payload.replay === true,
            timestamp: clean(payload.timestamp, 40)
        },
        row: {
            jobId: clean(payload.target_job_id, 160),
            jobStatus: clean(payload.after_state?.job_status, 80),
            updatedAt: clean(payload.after_state?.updated_at, 40),
            updatedBy: clean(payload.after_state?.updated_by, 120)
        },
        audit: payload.audit
    };
}

module.exports = {
    JOB_ADMIN_MUTATION_CONTRACT_DIGEST,
    JOB_ADMIN_MUTATION_CONTRACT_VERSION,
    adminSafeJobMutationResult,
    createJobAdminMutationEnvelope,
    forwardJobAdminMutation,
    validateOtpOsJobAdminMutationResponse
};
