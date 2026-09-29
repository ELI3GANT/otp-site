const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createClientAccountBridge } = require('../server/client-account-bridge.js');

function fixture({ enabled = true, member = true } = {}) {
    const calls = [];
    const authRequests = [];
    const app = express();
    app.use(express.json());
    app.use('/api/client', createClientAccountBridge({
        enabled,
        upstreamBase: 'https://otp-os.example.test',
        authClient: () => ({ auth: {
            async getUser(token) {
                return token === 'a'.repeat(32)
                    ? { data: { user: { id: 'user-a', email_confirmed_at: '2026-09-29T12:00:00Z' } } }
                    : { data: null, error: new Error('invalid') };
            },
            async refreshSession() { return { error: new Error('expired') }; },
            async signInWithOtp(options) { authRequests.push(options); return { error: null }; }
        } }),
        async fetchUpstream(url, options) {
            calls.push({ url, authorization: options.headers.Authorization });
            if (!member) return { ok: false, status: 403 };
            if (url.endsWith('/me')) {
                return { ok: true, status: 200, async json() {
                    return { ok: true, profile: { id: 'user-a' }, organizations: [{ id: 'org-a' }] };
                } };
            }
            if (url.endsWith('/projects/JOB-B')) return { ok: false, status: 404 };
            if (url.endsWith('/projects/JOB-A')) {
                return { ok: true, status: 200, async json() {
                    return { ok: true, project: { id: 'JOB-A', title: 'Own project' } };
                } };
            }
            return { ok: true, status: 200, async json() {
                return { ok: true, projects: [{ id: 'JOB-A', title: 'Own project' }] };
            } };
        }
    }));
    app.get('/api/client/account/legacy', (_req, res) => res.json({ ok: true, legacy: true }));
    return { app, calls, authRequests };
}

async function withServer(app, fn) {
    const server = await new Promise((resolve) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    try { return await fn(`http://127.0.0.1:${server.address().port}`); }
    finally { await new Promise((resolve) => server.close(resolve)); }
}

test('client account bridge requires explicit enablement and keeps old account path reachable', async () => {
    const { app } = fixture({ enabled: false });
    await withServer(app, async (base) => {
        assert.equal((await fetch(`${base}/api/client/projects`)).status, 503);
        const legacy = await fetch(`${base}/api/client/account/legacy`);
        assert.equal(legacy.status, 200);
        assert.equal((await legacy.json()).legacy, true);
    });
});

test('exchange rejects cross-origin and invalid Auth tokens before setting cookies', async () => {
    const { app, calls } = fixture();
    await withServer(app, async (base) => {
        const body = JSON.stringify({ access_token: 'a'.repeat(32), refresh_token: 'r'.repeat(32) });
        const foreign = await fetch(`${base}/api/client/session/exchange`, {
            method: 'POST', headers: { Origin: 'https://elsewhere.example', 'Content-Type': 'application/json' }, body
        });
        assert.equal(foreign.status, 403);
        const invalid = await fetch(`${base}/api/client/session/exchange`, {
            method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: 'x'.repeat(32), refresh_token: 'r'.repeat(32) })
        });
        assert.equal(invalid.status, 401);
        assert.equal(invalid.headers.get('set-cookie'), null);
    });
    assert.equal(calls.length, 0);
});

test('verified member gets secure cookies and only their assigned project', async () => {
    const { app, calls } = fixture();
    await withServer(app, async (base) => {
        const exchanged = await fetch(`${base}/api/client/session/exchange`, {
            method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: 'a'.repeat(32), refresh_token: 'r'.repeat(32) })
        });
        assert.equal(exchanged.status, 200);
        assert.match(exchanged.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
        const cookie = `__Host-otp_client_access=${'a'.repeat(32)}; __Host-otp_client_refresh=${'r'.repeat(32)}`;
        const own = await fetch(`${base}/api/client/projects/JOB-A`, { headers: { Cookie: cookie } });
        assert.equal(own.status, 200);
        assert.equal((await own.json()).project.title, 'Own project');
        const other = await fetch(`${base}/api/client/projects/JOB-B`, { headers: { Cookie: cookie } });
        assert.equal(other.status, 404);
        assert.doesNotMatch(JSON.stringify(await other.json()), /JOB-B/);
    });
    assert.ok(calls.every((call) => call.authorization === `Bearer ${'a'.repeat(32)}`));
});

test('authenticated user without membership receives no browser session', async () => {
    const { app } = fixture({ member: false });
    await withServer(app, async (base) => {
        const response = await fetch(`${base}/api/client/session/exchange`, {
            method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: 'a'.repeat(32), refresh_token: 'r'.repeat(32) })
        });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get('set-cookie'), null);
    });
});

test('sign-in requests never create an arbitrary Auth user', async () => {
    const { app, authRequests } = fixture();
    await withServer(app, async (base) => {
        const response = await fetch(`${base}/api/client/session/request`, {
            method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'client@example.test' })
        });
        assert.equal(response.status, 200);
        assert.match((await response.json()).message, /If your client account is active/);
    });
    assert.equal(authRequests.length, 1);
    assert.equal(authRequests[0].options.shouldCreateUser, false);
});
