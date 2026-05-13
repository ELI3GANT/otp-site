/**
 * Client journey contract — website + in-person style intake (public API shapes).
 *
 * Simulates:
 * 1) Website contact form → POST /api/contact/submit (creates inbox row; may trigger emails if server configured)
 * 2) Website Perspective Audit → POST /api/audit/submit (creates lead row + advice)
 *
 * Runs when a reachable API base is available:
 * - Default: http://127.0.0.1:$PORT if /api/health responds (start `npm start` locally)
 * - Or set CLIENT_JOURNEY_API_BASE=https://your-host (remote requires CLIENT_JOURNEY_ALLOW_REMOTE=1 to avoid accidental prod email spam)
 *
 * If no base is available, exits 0 (skipped) so CI stays green without a running server.
 */

const assert = require('assert');

const PORT = parseInt(process.env.PORT || '3000', 10);
const LOCAL_DEFAULT = `http://127.0.0.1:${PORT}`;
const TIMEOUT_MS = 12000;

function resolveBase() {
    const raw = String(process.env.CLIENT_JOURNEY_API_BASE || '').trim().replace(/\/$/, '');
    if (raw) {
        const isLocal = /localhost|127\.0\.0\.1/i.test(raw);
        if (isLocal) return raw;
        if (process.env.CLIENT_JOURNEY_ALLOW_REMOTE === '1') return raw;
        console.warn(
            'CLIENT_JOURNEY_API_BASE is non-local; set CLIENT_JOURNEY_ALLOW_REMOTE=1 to run (contact submit sends real emails). Skipping.'
        );
        return null;
    }
    return LOCAL_DEFAULT;
}

async function fetchHealth(base) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    try {
        const res = await fetch(`${base}/api/health`, { signal: ctrl.signal });
        return res.ok;
    } catch (_) {
        return false;
    } finally {
        clearTimeout(t);
    }
}

async function postJson(base, path, body) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${base}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body),
            signal: ctrl.signal
        });
        const text = await res.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch (_) {
            json = null;
        }
        return { res, json, text };
    } finally {
        clearTimeout(t);
    }
}

async function main() {
    const base = resolveBase();
    if (!base) {
        console.log('Client journey: no API base configured. Skipped.');
        process.exit(0);
    }
    const healthy = await fetchHealth(base);
    if (!healthy) {
        console.log(
            `Client journey: no API at ${base} (health check failed). Start the server or set CLIENT_JOURNEY_API_BASE. Skipped.`
        );
        process.exit(0);
    }

    console.log(`Client journey contract -> ${base}`);

    // --- Validation: contact missing email ---
    const badContact = await postJson(base, '/api/contact/submit', { name: 'X', email: '' });
    assert.strictEqual(badContact.res.status, 400, 'contact submit should 400 without email');
    assert.strictEqual(badContact.json && badContact.json.success, false, 'contact should fail closed');

    // --- Honeypot: fail honestly without persisting lead workflow ---
    const bot = await postJson(base, '/api/contact/submit', {
        name: 'Bot',
        email: 'bot@example.com',
        _gotcha: 'filled',
        project_details: 'spam'
    });
    assert.strictEqual(bot.res.status, 400, 'honeypot should return 400');
    assert.strictEqual(bot.json && bot.json.success, false, 'honeypot should fail closed');
    assert.strictEqual(bot.json && bot.json.errorCode, 'spam_rejected', 'honeypot should use stable errorCode');

    // --- Website contact (real shape: project_type maps to service) ---
    const stamp = Date.now();
    const contact = await postJson(base, '/api/contact/submit', {
        name: `Journey Test ${stamp}`,
        email: `journey.client.${stamp}@example.com`,
        project_type: 'Video Editing Services',
        project_details: 'Website flow: need a launch recap and social cutdowns. Budget flexible; timeline 3 weeks.',
        budget: '$3k-$5k',
        timeline: '3 weeks'
    });
    if (contact.res.status === 503 && contact.json && contact.json.errorCode === 'contact_unavailable') {
        console.log('Client journey: contact persistence unavailable in this environment. Remaining DB-backed checks skipped.');
        return;
    }
    assert.strictEqual(contact.res.status, 200, `contact submit HTTP ${contact.res.status}: ${contact.text.slice(0, 200)}`);
    assert.strictEqual(contact.json && contact.json.success, true, 'contact should succeed');

    // --- Perspective audit → leads (website questionnaire) ---
    const audit = await postJson(base, '/api/audit/submit', {
        email: `audit.journey.${stamp}@example.com`,
        answers: {
            q1: 'Grow audience',
            q2: 'Time',
            q3: 'Instagram',
            q4: 'Cinematic',
            q5_goal: 'Ship a weekly content system without burning out'
        }
    });
    assert.strictEqual(audit.res.status, 200, `audit submit HTTP ${audit.res.status}`);
    assert.strictEqual(audit.json && audit.json.success, true, 'audit should succeed');
    assert.ok(
        audit.json && typeof audit.json.advice === 'string' && audit.json.advice.length > 20,
        'audit should return advice text'
    );

    console.log('Client journey contract passed (public intake + audit shapes).');
}

main().catch((e) => {
    console.error('Client journey contract failed:', e.message);
    process.exit(1);
});
