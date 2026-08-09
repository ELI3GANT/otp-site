const assert = require('assert');
const http = require('http');

console.log('OTP BOOKING OS ROUTE INTEGRATION...');

function listen(server) {
    return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
    return new Promise((resolve) => server.close(resolve));
}

async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
}

(async () => {
    let mode = 'success';
    let observedRequest = null;
    const upstream = http.createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        observedRequest = { body, idempotencyKey: req.headers['idempotency-key'] || '' };

        if (mode === 'unavailable') {
            req.socket.destroy();
            return;
        }
        if (mode === 'timeout') await new Promise((resolve) => setTimeout(resolve, 750));
        if (res.destroyed) return;
        res.setHeader('Content-Type', 'application/json');
        if (mode === 'failure') {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, message: 'isolated upstream failure' }));
            return;
        }
        if (mode === 'conflict') {
            res.statusCode = 409;
            res.end(JSON.stringify({ ok: false, errorCode: 'idempotency_conflict', message: 'request key conflict' }));
            return;
        }
        if (mode === 'malformed') {
            res.end(JSON.stringify({ ok: true }));
            return;
        }
        const timestamp = new Date().toISOString();
        res.end(JSON.stringify({
            ok: true,
            schema_version: 'otp-booking-intake-v1',
            booking_id: body.booking_id,
            lineage: body.lineage,
            next_action: 'Review the isolated booking.',
            writer_evidence: {
                writer: 'otp_os',
                contract_version: 'otp-booking-intake-v1',
                booking_id: body.booking_id,
                operational_record_ids: { contact_id: 'private-contact', job_id: 'private-job' },
                status: 'persisted',
                timestamp
            }
        }));
    });
    await listen(upstream);

    process.env.OTP_BOOKINGS_WRITER_MODE = 'otp_os';
    process.env.OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED = '0';
    process.env.OTP_BOOKINGS_UPSTREAM_URL = `http://127.0.0.1:${upstream.address().port}`;
    process.env.OTP_BOOKINGS_UPSTREAM_TIMEOUT_MS = '250';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    const app = require('../server.js');
    const site = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => site.once('listening', resolve));

    const publicPayload = {
        booking_token: 'WEB-site-route-test-0001',
        name: 'Avery Test',
        email: 'avery@example.test',
        phone: '',
        service_type: 'Website / Digital System',
        package_interest: 'The System',
        project_description: 'Prove Site uses OTP OS as its only normal writer.',
        contact_consent: true,
        source_tracking: { cta_source: 'integration_test' }
    };

    try {
        const success = await postJson(`http://127.0.0.1:${site.address().port}/api/bookings/submit`, publicPayload);
        assert.equal(success.status, 200);
        assert.equal(success.body.writerEvidence.writer, 'otp_os');
        assert.equal(success.body.writerEvidence.status, 'persisted');
        assert.ok(!JSON.stringify(success.body).includes('private-contact'));
        assert.ok(!JSON.stringify(success.body).includes('private-job'));
        assert.equal(observedRequest.body.idempotency_key, observedRequest.body.booking_id);
        assert.equal(observedRequest.idempotencyKey, observedRequest.body.booking_id);
        assert.equal(observedRequest.body.lineage.capture_id, observedRequest.body.booking_id);

        mode = 'malformed';
        const malformed = await postJson(`http://127.0.0.1:${site.address().port}/api/bookings/submit`, { ...publicPayload, booking_token: 'WEB-site-route-test-0002' });
        assert.equal(malformed.status, 503);
        assert.equal(malformed.body.errorCode, 'otp_os_unavailable');

        mode = 'failure';
        const failure = await postJson(`http://127.0.0.1:${site.address().port}/api/bookings/submit`, { ...publicPayload, booking_token: 'WEB-site-route-test-0003' });
        assert.equal(failure.status, 503);
        assert.equal(failure.body.errorCode, 'otp_os_unavailable');

        mode = 'unavailable';
        const unavailable = await postJson(`http://127.0.0.1:${site.address().port}/api/bookings/submit`, { ...publicPayload, booking_token: 'WEB-site-route-test-0006' });
        assert.equal(unavailable.status, 503);
        assert.equal(unavailable.body.errorCode, 'otp_os_unavailable');

        mode = 'conflict';
        const conflict = await postJson(`http://127.0.0.1:${site.address().port}/api/bookings/submit`, { ...publicPayload, booking_token: 'WEB-site-route-test-0005' });
        assert.equal(conflict.status, 409);
        assert.equal(conflict.body.errorCode, 'booking_idempotency_conflict');

        mode = 'timeout';
        const timeout = await postJson(`http://127.0.0.1:${site.address().port}/api/bookings/submit`, { ...publicPayload, booking_token: 'WEB-site-route-test-0004' });
        assert.equal(timeout.status, 503);
        assert.equal(timeout.body.errorCode, 'otp_os_unavailable');
    } finally {
        await close(site);
        await close(upstream);
    }

    console.log('OTP BOOKING OS ROUTE INTEGRATION OK');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
