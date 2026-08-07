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
    const timestamp = '2026-08-07T17:00:00.000Z';
    const beforeState = { job_status: body.expected_current_status, updated_at: timestamp, updated_by: 'otp-os:operator' };
    const afterState = { job_status: body.requested_next_status, updated_at: timestamp, updated_by: body.authority.actor };
    const audit = {
        schema_version: 'otp-mutation-audit-v1', audit_id: 'AUDIT-JOB-INTEGRATION-0001',
        capability: 'ops_job.status.transition', authority_level: 'level_2_guarded_mutation',
        actor: body.authority.actor, reason: body.authority.reason, source: 'otp-site',
        target: `ops_job:${body.job_id}`, timestamp, idempotency_key: body.authority.idempotency_key,
        before_state: beforeState, after_state: afterState, reversible: true, result: 'applied'
    };
    return {
        schema_version: 'otp-job-admin-mutation-v1', ok: true, writer: 'otp_os', operation: 'transition_status',
        target_job_id: body.job_id, before_state: beforeState, after_state: afterState,
        audit_reference: audit.audit_id, audit, replay, timestamp
    };
}

async function submit(baseUrl, token, body, key = body.idempotencyKey) {
    const response = await fetch(`${baseUrl}/api/admin/ops/jobs/update-status`, {
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
        if (mode === 'timeout') await new Promise((resolve) => setTimeout(resolve, 100));
        if (res.destroyed) return;
        if (mode === 'malformed') return res.end(JSON.stringify({ ok: true, writer: 'otp_os' }));
        if (mode === 'unknown') {
            res.statusCode = 404;
            return res.end(JSON.stringify({ ok: false, errorCode: 'unknown_job', message: 'Job not found.' }));
        }
        if (mode === 'conflict') {
            res.statusCode = 409;
            return res.end(JSON.stringify({ ok: false, errorCode: 'idempotency_conflict', message: 'Key conflict.' }));
        }
        const existing = committed.get(key);
        const saved = existing || osSuccess(body, false);
        committed.set(key, saved);
        if (mode === 'loss_after_commit') return req.socket.destroy();
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ ...saved, replay: Boolean(existing) }));
    });
    await listen(upstream);

    process.env.JWT_SECRET = 'isolated-job-admin-route-secret';
    process.env.OTP_OS_JOB_MUTATION_TOKEN = 'isolated-os-scope-token';
    process.env.OTP_OS_JOB_MUTATION_UPSTREAM_URL = `http://127.0.0.1:${upstream.address().port}`;
    process.env.OTP_OS_JOB_MUTATION_TIMEOUT_MS = '40';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    const app = require('../server.js');
    const site = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => site.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${site.address().port}`;
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
    const mutation = {
        jobId: 'JOB-STATUS-0001', jobStatus: 'Completed', expectedCurrentStatus: 'New Lead',
        reason: 'The operator confirmed that delivery work is complete.', idempotencyKey: 'JOB-SITE-ROUTE-0001'
    };

    try {
        const success = await submit(baseUrl, token, mutation);
        assert.equal(success.status, 200);
        assert.equal(success.body.writerEvidence.writer, 'otp_os');
        assert.equal(success.body.row.jobStatus, 'Completed');
        assert.equal(success.body.audit.authority_level, 'level_2_guarded_mutation');
        assert.equal(observed.key, mutation.idempotencyKey);
        assert.equal(observed.authorization, 'Bearer isolated-os-scope-token');
        assert.equal(observed.body.authority.actor, 'otp-site:admin');
        assert.equal(observed.body.authority.reason, mutation.reason);
        assert.equal(observed.body.lineage.project_id, mutation.jobId);

        assert.equal((await submit(baseUrl, '', mutation)).status, 401);
        assert.equal((await submit(baseUrl, token, { ...mutation, reason: '' })).body.errorCode, 'missing_reason');
        assert.equal((await submit(baseUrl, token, mutation, '')).body.errorCode, 'missing_idempotency_key');
        assert.equal((await submit(baseUrl, token, { ...mutation, jobStatus: 'Paid', idempotencyKey: 'JOB-SITE-INVALID' })).body.errorCode, 'invalid_job_mutation_contract');

        mode = 'unknown';
        assert.equal((await submit(baseUrl, token, { ...mutation, idempotencyKey: 'JOB-SITE-UNKNOWN' })).body.errorCode, 'unknown_job');
        mode = 'conflict';
        assert.equal((await submit(baseUrl, token, { ...mutation, idempotencyKey: 'JOB-SITE-CONFLICT' })).status, 409);
        mode = 'malformed';
        assert.equal((await submit(baseUrl, token, { ...mutation, idempotencyKey: 'JOB-SITE-MALFORMED' })).body.errorCode, 'malformed_otp_os_response');
        mode = 'unavailable';
        assert.equal((await submit(baseUrl, token, { ...mutation, idempotencyKey: 'JOB-SITE-OFFLINE' })).body.errorCode, 'otp_os_unavailable');
        mode = 'timeout';
        assert.equal((await submit(baseUrl, token, { ...mutation, idempotencyKey: 'JOB-SITE-TIMEOUT' })).body.errorCode, 'otp_os_timeout');

        mode = 'loss_after_commit';
        const retryMutation = { ...mutation, idempotencyKey: 'JOB-SITE-RESPONSE-LOSS' };
        assert.equal((await submit(baseUrl, token, retryMutation)).body.errorCode, 'otp_os_unavailable');
        mode = 'success';
        const replay = await submit(baseUrl, token, retryMutation);
        assert.equal(replay.status, 200);
        assert.equal(replay.body.writerEvidence.replay, true);
        assert.equal(committed.size >= 2, true);
    } finally {
        await close(site);
        await close(upstream);
    }

    console.log('OTP JOB ADMIN OS ROUTE INTEGRATION OK');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
