const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

function listen(server) {
    return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
    return new Promise((resolve) => server.close(resolve));
}

function osSuccess(body, replay = false) {
    const timestamp = '2026-08-07T19:00:00.000Z';
    const beforeState = body.operation === 'archive'
        ? { archive_state: 'active', archived_at: '', archived_from_status: '', job_status: 'In Progress', updated_at: timestamp, updated_by: 'otp-os:operator' }
        : { archive_state: 'archived', archived_at: timestamp, archived_from_status: 'In Progress', job_status: 'Archived', updated_at: timestamp, updated_by: 'otp-site:admin' };
    const afterState = body.operation === 'archive'
        ? { archive_state: 'archived', archived_at: timestamp, archived_from_status: 'In Progress', job_status: 'Archived', updated_at: timestamp, updated_by: body.authority.actor }
        : { archive_state: 'active', archived_at: '', archived_from_status: '', job_status: 'In Progress', updated_at: timestamp, updated_by: body.authority.actor };
    const audit = {
        schema_version: 'otp-mutation-audit-v1', audit_id: `AUDIT-JOB-${body.operation.toUpperCase()}-0001`,
        capability: body.authority.capability, authority_level: 'level_2_guarded_mutation',
        actor: body.authority.actor, reason: body.authority.reason, source: 'otp-site',
        target: `ops_job:${body.job_id}`, timestamp, idempotency_key: body.authority.idempotency_key,
        before_state: beforeState, after_state: afterState, reversible: true, result: 'applied'
    };
    return {
        schema_version: 'otp-job-archive-v1', ok: true, writer: 'otp_os', operation: body.operation,
        target_job_id: body.job_id, before_state: beforeState, after_state: afterState,
        audit_reference: audit.audit_id, audit, replay, timestamp
    };
}

async function submit(baseUrl, token, operation, body, key = body.idempotencyKey) {
    const response = await fetch(`${baseUrl}/api/admin/ops/jobs/${operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(key ? { 'Idempotency-Key': key } : {}) },
        body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
}

(async () => {
    let mode = 'success';
    let observed;
    const committed = new Map();
    const upstream = http.createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const key = String(req.headers['idempotency-key'] || '');
        observed = { body, key, authorization: req.headers.authorization };
        if (mode === 'unavailable') return req.socket.destroy();
        if (mode === 'timeout') await new Promise((resolve) => setTimeout(resolve, 750));
        if (res.destroyed) return;
        if (mode === 'malformed') return res.end(JSON.stringify({ ok: true, writer: 'otp_os' }));
        if (mode === 'error') {
            res.statusCode = 500;
            return res.end(JSON.stringify({ ok: false, errorCode: 'persistence_failed', message: 'Persistence failed.' }));
        }
        if (mode === 'scope') {
            res.statusCode = 403;
            return res.end(JSON.stringify({ ok: false, errorCode: 'unauthorized_scope', message: 'Scope denied.' }));
        }
        if (mode === 'unknown') {
            res.statusCode = 404;
            return res.end(JSON.stringify({ ok: false, errorCode: 'unknown_job', message: 'Job not found.' }));
        }
        if (mode === 'conflict') {
            res.statusCode = 409;
            return res.end(JSON.stringify({ ok: false, errorCode: 'stale_expected_state', message: 'Archive state changed.' }));
        }
        const existing = committed.get(key);
        const saved = existing || osSuccess(body, false);
        committed.set(key, saved);
        if (mode === 'loss_after_commit') return req.socket.destroy();
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ ...saved, replay: Boolean(existing) }));
    });
    await listen(upstream);

    process.env.JWT_SECRET = 'isolated-job-archive-route-secret';
    process.env.OTP_OS_JOB_ARCHIVE_TOKEN = 'isolated-archive-scope-token';
    process.env.OTP_OS_JOB_ARCHIVE_UPSTREAM_URL = `http://127.0.0.1:${upstream.address().port}`;
    process.env.OTP_OS_JOB_ARCHIVE_TIMEOUT_MS = '250';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    const app = require('../server.js');
    const site = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => site.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${site.address().port}`;
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
    const archive = {
        jobId: 'JOB-ARCHIVE-0001', operation: 'archive', expectedArchiveState: 'active', requestedArchiveState: 'archived',
        reason: 'The operator confirmed that this job should be archived.', confirmed: true, idempotencyKey: 'JOB-SITE-ARCHIVE-0001'
    };

    try {
        const success = await submit(baseUrl, token, 'archive', archive);
        assert.equal(success.status, 200);
        assert.equal(success.body.writerEvidence.writer, 'otp_os');
        assert.equal(success.body.row.archiveState, 'archived');
        assert.equal(success.body.row.archivedFromStatus, 'In Progress');
        assert.equal(success.body.audit.authority_level, 'level_2_guarded_mutation');
        assert.equal(observed.key, archive.idempotencyKey);
        assert.equal(observed.authorization, 'Bearer isolated-archive-scope-token');
        assert.equal(observed.body.authority.actor, 'otp-site:admin');
        assert.equal(observed.body.authority.reason, archive.reason);
        assert.equal(observed.body.lineage.project_id, archive.jobId);

        const restore = {
            ...archive, operation: 'restore', expectedArchiveState: 'archived', requestedArchiveState: 'active',
            reason: 'The operator confirmed that this job should be restored.', idempotencyKey: 'JOB-SITE-RESTORE-0001'
        };
        const restored = await submit(baseUrl, token, 'restore', restore);
        assert.equal(restored.status, 200);
        assert.equal(restored.body.row.archiveState, 'active');
        assert.equal(restored.body.row.jobStatus, 'In Progress');

        assert.equal((await submit(baseUrl, '', 'archive', archive)).status, 401);
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, confirmed: false })).body.errorCode, 'missing_confirmation');
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, reason: '' })).body.errorCode, 'missing_reason');
        assert.equal((await submit(baseUrl, token, 'archive', archive, '')).body.errorCode, 'missing_idempotency_key');
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, requestedArchiveState: 'active', idempotencyKey: 'JOB-SITE-INVALID' })).body.errorCode, 'invalid_job_archive_contract');

        mode = 'scope';
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, idempotencyKey: 'JOB-SITE-SCOPE' })).body.errorCode, 'unauthorized_scope');
        mode = 'unknown';
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, idempotencyKey: 'JOB-SITE-UNKNOWN' })).body.errorCode, 'unknown_job');
        mode = 'conflict';
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, idempotencyKey: 'JOB-SITE-STALE' })).status, 409);
        mode = 'error';
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, idempotencyKey: 'JOB-SITE-ERROR' })).body.errorCode, 'persistence_failed');
        mode = 'malformed';
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, idempotencyKey: 'JOB-SITE-MALFORMED' })).body.errorCode, 'malformed_otp_os_response');
        mode = 'unavailable';
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, idempotencyKey: 'JOB-SITE-OFFLINE' })).body.errorCode, 'otp_os_unavailable');
        mode = 'timeout';
        assert.equal((await submit(baseUrl, token, 'archive', { ...archive, idempotencyKey: 'JOB-SITE-TIMEOUT' })).body.errorCode, 'otp_os_timeout');

        mode = 'loss_after_commit';
        const retryMutation = { ...archive, idempotencyKey: 'JOB-SITE-RESPONSE-LOSS' };
        assert.equal((await submit(baseUrl, token, 'archive', retryMutation)).body.errorCode, 'otp_os_unavailable');
        mode = 'success';
        const replay = await submit(baseUrl, token, 'archive', retryMutation);
        assert.equal(replay.status, 200);
        assert.equal(replay.body.writerEvidence.replay, true);
    } finally {
        await close(site);
        await close(upstream);
    }

    console.log('OTP JOB ARCHIVE OS ROUTE INTEGRATION OK');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
