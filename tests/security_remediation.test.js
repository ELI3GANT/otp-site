/**
 * Focused regression coverage for the source-only security remediation pass.
 * Pure local fixtures: no live network, Supabase writes, or deployment activity.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jwt = require('jsonwebtoken');
const { BoundedTtlCache } = require('../server/bounded-ttl-cache.js');
const {
    SITE_COMMAND_SCHEMA,
    PUBLIC_SITE_CONTENT_KEYS,
    siteContentAccessScope,
    normalizeSiteCommand,
    applySiteCommandToState
} = require('../server/site-control.js');
const {
    PublicFetchError,
    validatePublicHttpUrl,
    resolvePublicHttpUrl,
    fetchPublicText,
    isBlockedIp,
    isBlockedHostname
} = require('../server/safe-public-fetch.js');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'security-remediation-test-secret';
const app = require('../server.js');
const hooks = app.__securityTestHooks;
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function fakeHeaders(values = {}) {
    const lower = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
    return { get: (name) => lower[String(name).toLowerCase()] ?? null };
}

function fakeTextResponse({ status = 200, headers = {}, body = '' } = {}) {
    return {
        status,
        ok: status >= 200 && status < 300,
        headers: fakeHeaders(headers),
        body: null,
        arrayBuffer: async () => Buffer.from(body, 'utf8')
    };
}

function asyncRequest(chunks, headers = {}) {
    return {
        method: 'POST',
        headers,
        async *[Symbol.asyncIterator]() {
            for (const chunk of chunks) yield Buffer.from(chunk);
        }
    };
}

async function assertPublicFetchRejects(url, expectedCode) {
    await assert.rejects(
        resolvePublicHttpUrl(url, {
            lookup: async () => [{ address: '93.184.216.34', family: 4 }]
        }),
        (error) => error instanceof PublicFetchError && error.code === expectedCode,
        `${url} must be rejected as ${expectedCode}`
    );
}

async function main() {
    console.log('SECURITY REMEDIATION REGRESSIONS...');

    // site_content: four intentional public keys, everything else private.
    assert.deepStrictEqual(PUBLIC_SITE_CONTENT_KEYS, [
        'hero-subtitle',
        'studio-text-1',
        'studio-text-2',
        'services-desc'
    ]);
    for (const key of PUBLIC_SITE_CONTENT_KEYS) assert.strictEqual(siteContentAccessScope(key), 'public');
    for (const key of ['knowledge::chunk::1', 'client::record::1', 'otp-version::abc', '', null]) {
        assert.strictEqual(siteContentAccessScope(key), 'private', `${String(key)} defaults private`);
    }
    const migration = read('supabase/migrations/20260811020000_site_content_access_boundary.sql');
    assert.match(migration, /alter column access_scope set default 'private'/i);
    assert.match(migration, /grant select on table public\.site_content to anon, authenticated/i);
    assert.match(migration, /access_scope = 'public'/i);
    assert.match(migration, /create policy "Service Role Site Content Access"/i);
    assert.ok(!/create policy[\s\S]{0,180}to anon[\s\S]{0,180}using\s*\(true\)/i.test(migration));
    const siteInit = read('site-init.js');
    const adminCore = read('admin-core.js');
    const terminal = read('otp-terminal.html');
    const serverSrc = read('server.js');
    assert.ok(siteInit.includes(".eq('access_scope', 'public')"));
    assert.ok(serverSrc.includes('delete row.access_scope'));
    assert.ok(serverSrc.includes('row.access_scope = siteContentAccessScope(k)'));

    // Public Realtime is not a privileged control plane. The fallback architecture
    // accepts only authenticated, persisted, versioned state changes.
    assert.ok(!siteInit.includes('otp-uplink'));
    assert.ok(!adminCore.includes("channel('otp-uplink')"));
    assert.ok(!terminal.includes('otp-uplink'));
    assert.deepStrictEqual(normalizeSiteCommand({ type: 'maintenance', value: 'on' }), {
        ok: false,
        reason: 'invalid_schema'
    }, 'unsigned/unversioned command is rejected');
    assert.strictEqual(normalizeSiteCommand({
        schema: SITE_COMMAND_SCHEMA,
        type: 'maintenance',
        value: 'on',
        signature: 'invalid'
    }).ok, false, 'unexpected signature envelopes are rejected');
    for (const type of ['refresh', 'reload', 'warp', 'redirect', 'alert', 'navigate', 'unknown']) {
        assert.strictEqual(normalizeSiteCommand({ schema: SITE_COMMAND_SCHEMA, type, value: 'https://example.com' }).ok, false);
    }
    assert.strictEqual(normalizeSiteCommand(null).reason, 'malformed_payload');
    assert.strictEqual(normalizeSiteCommand({ schema: SITE_COMMAND_SCHEMA, type: 'status', value: '<script>' }).ok, false);
    assert.strictEqual(normalizeSiteCommand({ schema: SITE_COMMAND_SCHEMA, type: 'status', value: 'OPERATIONAL' }).ok, true);
    assert.strictEqual(normalizeSiteCommand({ schema: SITE_COMMAND_SCHEMA, type: 'status', value: 'x'.repeat(121) }).ok, false);
    const authorized = normalizeSiteCommand({ schema: SITE_COMMAND_SCHEMA, type: 'maintenance', value: 'on' });
    assert.strictEqual(authorized.ok, true);
    assert.deepStrictEqual(applySiteCommandToState({ theme: 'dark' }, authorized.command), {
        theme: 'dark', maintenance: 'on'
    });
    assert.ok(serverSrc.includes("app.post('/api/admin/site-command', verifyToken"));
    assert.ok(serverSrc.includes('realtimeBroadcast: false'));

    async function verifyFixture(token) {
        return await new Promise((resolve) => {
            const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
            const response = {
                statusCode: 200,
                body: null,
                status(code) { this.statusCode = code; return this; },
                json(body) { this.body = body; resolve({ next: false, status: this.statusCode, body }); }
            };
            hooks.verifyToken(req, response, () => resolve({ next: true, status: 200, auth: req.auth }));
        });
    }
    assert.strictEqual((await verifyFixture('')).status, 401, 'missing token is rejected');
    assert.strictEqual((await verifyFixture('static-bypass-token')).status, 403, 'legacy static token is rejected');
    assert.strictEqual((await verifyFixture(jwt.sign({ role: 'viewer' }, process.env.JWT_SECRET))).status, 403, 'unscoped JWT is rejected');
    const adminAuth = await verifyFixture(jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' }));
    assert.strictEqual(adminAuth.next, true, 'admin-scoped JWT is accepted');

    const siteWrites = [];
    const siteControlClient = {
        from(table) {
            assert.strictEqual(table, 'posts');
            return {
                select() { return this; },
                eq() { return this; },
                async maybeSingle() {
                    return { data: { id: 'state-1', content: '{"theme":"dark"}' }, error: null };
                },
                update(row) {
                    siteWrites.push(row);
                    return { eq: async () => ({ error: null }) };
                },
                async insert(rows) {
                    siteWrites.push(...rows);
                    return { error: null };
                }
            };
        }
    };
    const persistedState = await hooks.persistAuthorizedSiteCommand(authorized.command, siteControlClient);
    assert.deepStrictEqual(persistedState, { theme: 'dark', maintenance: 'on' });
    assert.strictEqual(JSON.parse(siteWrites[0].content).maintenance, 'on');

    // FIXLINE SSRF: block private, reserved, metadata, numeric, DNS, and redirect bypasses.
    for (const address of [
        '127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254',
        '::1', 'fc00::1', 'fe80::1', 'fec0::1', '64:ff9b::7f00:1', '100::1',
        '2001::1', '2002:7f00:1::1', '::ffff:127.0.0.1'
    ]) {
        assert.strictEqual(isBlockedIp(address), true, `${address} is blocked`);
    }
    for (const hostname of ['localhost', 'api.localhost', 'metadata.google.internal', 'instance-data.ec2.internal']) {
        assert.strictEqual(isBlockedHostname(hostname), true, `${hostname} is blocked`);
    }
    for (const url of [
        'http://127.0.0.1/',
        'http://localhost/',
        'http://[::1]/',
        'http://10.2.3.4/',
        'http://169.254.169.254/latest/meta-data/',
        'http://2130706433/',
        'http://0x7f000001/'
    ]) {
        await assertPublicFetchRejects(url, 'destination_not_allowed');
    }
    assert.throws(() => validatePublicHttpUrl('file:///etc/passwd'), /Only HTTP and HTTPS/);
    assert.throws(() => validatePublicHttpUrl('https://user:pass@example.com'), /credentials/);
    assert.throws(() => validatePublicHttpUrl('https://example.com:8443'), /standard HTTP/);
    await assert.rejects(
        resolvePublicHttpUrl('https://public.example', {
            lookup: async () => [{ address: '10.0.0.5', family: 4 }]
        }),
        (error) => error.code === 'destination_not_allowed',
        'DNS resolution to a private address is rejected'
    );
    await assert.rejects(
        fetchPublicText('https://public.example', {
            lookup: async () => [{ address: '93.184.216.34', family: 4 }],
            fetchImpl: async () => ({
                status: 302,
                ok: false,
                headers: fakeHeaders({ location: 'http://127.0.0.1/admin' }),
                body: { destroy() {} }
            })
        }),
        (error) => error.code === 'destination_not_allowed',
        'redirects are revalidated before the next fetch'
    );
    const publicFetch = await fetchPublicText('https://public.example/path', {
        lookup: async () => [{ address: '93.184.216.34', family: 4 }],
        fetchImpl: async () => fakeTextResponse({
            headers: { 'content-type': 'text/html; charset=utf-8' },
            body: '<title>Public</title>'
        })
    });
    assert.strictEqual(publicFetch.text, '<title>Public</title>');
    assert.strictEqual(publicFetch.redirects, 0);

    // Stored AI draft is escaped at the actual innerHTML sink.
    const escapeDefinition = adminCore.match(/window\.escapeHtml = function\(text\) \{[\s\S]*?\n    \};/);
    assert.ok(escapeDefinition, 'browser escape utility is present');
    const browser = { window: {} };
    vm.runInNewContext(escapeDefinition[0], browser);
    for (const payload of [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<button onclick=alert(1)>x</button>',
        '<svg><script>alert(1)</script></svg>',
        '&lt;img src=x onerror=alert(1)&gt;'
    ]) {
        const escaped = browser.window.escapeHtml(payload);
        assert.ok(!/<(?:script|img|button|svg)/i.test(escaped), `${payload} cannot create an element`);
    }
    assert.strictEqual(browser.window.escapeHtml('**ordinary Markdown**'), '**ordinary Markdown**');
    assert.ok(adminCore.includes('const draftPreview = isDrafted'));
    assert.ok(adminCore.includes('window.escapeHtml(String(c.draft_reply).substring(0, 200))'));
    assert.ok(!adminCore.includes('${c.draft_reply.substring(0, 200)}'));

    // Proposal creation is authenticated, body-bounded, randomly identified, and cached with limits.
    assert.ok(serverSrc.includes("app.post('/api/quote/create', quoteCreationLimiter, verifyToken, express.json({ limit: '32kb' })"));
    assert.ok(serverSrc.includes('crypto.randomBytes(10)'));
    let now = 1000;
    const cache = new BoundedTtlCache({ maxEntries: 2, ttlMs: 50, now: () => now });
    cache.set('a', 1).set('b', 2).set('c', 3);
    assert.strictEqual(cache.size, 2);
    assert.strictEqual(cache.has('a'), false, 'oldest cache entry is evicted at the cap');
    assert.strictEqual(cache.get('c'), 3);
    now += 51;
    assert.strictEqual(cache.size, 0, 'cache entries expire by TTL');

    const listener = await new Promise((resolve, reject) => {
        const candidate = app.listen(0, '127.0.0.1', () => resolve(candidate));
        candidate.once('error', reject);
    });
    try {
        const address = listener.address();
        const quoteEndpoint = `http://127.0.0.1:${address.port}/api/quote/create`;
        const unauthorizedResponse = await fetch(quoteEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_name: 'Unauthorized' })
        });
        assert.strictEqual(unauthorizedResponse.status, 401, 'unauthenticated proposal creation is rejected');

        const testAdminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
        const authorizedResponse = await fetch(quoteEndpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${testAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ client_name: 'Authorized Fixture', deliverables: ['One'] })
        });
        assert.strictEqual(authorizedResponse.status, 200, 'admin-scoped proposal creation is accepted');
        const authorizedBody = await authorizedResponse.json();
        assert.match(authorizedBody.quote_id, /^PROP-[A-F0-9]{20}$/);

        const oversizedResponse = await fetch(quoteEndpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${testAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ client_name: 'x'.repeat(40 * 1024) })
        });
        assert.strictEqual(oversizedResponse.status, 413, 'oversized proposal creation is rejected');
        assert.strictEqual((await oversizedResponse.json()).errorCode, 'payload_too_large');
    } finally {
        await new Promise((resolve) => listener.close(resolve));
    }

    // Public proposal lookup and ops search do not accept raw PostgREST syntax.
    assert.strictEqual(hooks.normalizePublicQuoteId('PROP-ABC123'), 'PROP-ABC123');
    for (const value of ['x,y', 'x)', 'x.eq.secret', 'x%25', 'column:other']) {
        assert.strictEqual(hooks.normalizePublicQuoteId(value), '', `${value} is not a public proposal ID`);
    }
    const quoteCalls = [];
    const quoteClient = {
        from(table) {
            quoteCalls.push(['from', table]);
            return {
                select(fields) { quoteCalls.push(['select', fields]); return this; },
                eq(column, value) { quoteCalls.push(['eq', column, value]); return this; },
                async maybeSingle() { return { data: { job_id: 'PROP-ABC123' }, error: null }; }
            };
        }
    };
    await hooks.findOpsJobByQuoteId(quoteClient, 'PROP-ABC123');
    assert.deepStrictEqual(quoteCalls[2], ['eq', 'job_id', 'PROP-ABC123']);
    const normalFilter = hooks.buildOpsSearchFilter('Acme Studio');
    assert.strictEqual(normalFilter, 'job_id.ilike.%Acme Studio%,client_name.ilike.%Acme Studio%,project_title.ilike.%Acme Studio%');
    for (const value of ['x,y', 'x)', 'x.or(secret.eq.1)', 'x%', 'x;drop']) {
        assert.throws(() => hooks.buildOpsSearchFilter(value), /unsupported characters/);
    }
    assert.strictEqual(hooks.buildOpsSearchFilter('client_name'), 'job_id.ilike.%client\\_name%,client_name.ilike.%client\\_name%,project_title.ilike.%client\\_name%');

    // OTP OS proxy request bodies are bounded by declared and streamed size.
    const body = await hooks.readProxyRequestBody(asyncRequest(['ab', 'cd']), 4);
    assert.strictEqual(body.toString(), 'abcd');
    await assert.rejects(hooks.readProxyRequestBody(asyncRequest(['abc', 'def']), 5), (error) => error.statusCode === 413);
    await assert.rejects(
        hooks.readProxyRequestBody(asyncRequest([], { 'content-length': '100' }), 10),
        (error) => error.statusCode === 413
    );

    // Legacy auth bypass fails closed; rollback never interpolates a shell command.
    assert.ok(!serverSrc.includes("bearerToken === 'static-bypass-token'"));
    assert.ok(adminCore.includes("localStorage.removeItem('otp_admin_token')"));
    assert.ok(adminCore.includes('const isStaticBypassAllowed = () => false'));
    assert.ok(serverSrc.includes("execFile('git', args"));
    assert.ok(serverSrc.includes('GIT_OBJECT_ID_PATTERN'));
    assert.ok(!serverSrc.includes('git reset --hard ${version}'));

    console.log('SECURITY REMEDIATION REGRESSIONS COMPLETE');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
