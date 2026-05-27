/**
 * CI guardrails: intentional public /api surface + PII table RLS expectations.
 * Static reads only — no live HTTP.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('API SURFACE + RLS CONTRACT...');

const serverSrc = read('server.js');
const migration = read('supabase/migrations/SECURE_HARDENING_PRO.sql');
const prodBootstrapQa = read('scripts/prod_bootstrap_qa.js');

/** Every /api route must use verifyToken OR appear here (exact METHOD + path). */
const UNAUTH_API_ALLOWLIST = new Set([
    'GET /api',
    'GET /api/health',
    'GET /api/status',
    'GET /api/webhook',
    'POST /api/webhook',
    'POST /api/auth/login',
    'GET /api/bookings/config',
    'POST /api/bookings/submit',
    'GET /api/client-portal/:token',
    'GET /api/youtube/videos',
    'POST /api/contact/submit',
    'POST /api/audit/submit',
    'POST /api/analytics/view',
    'POST /api/create-checkout-session'
]);

const routeLineRe = /app\.(get|post|put|delete|patch)\(\s*['"`](\/api[^'"`]+)['"`]/;

for (const line of serverSrc.split('\n')) {
    const m = line.match(routeLineRe);
    if (!m) continue;
    const method = m[1].toUpperCase();
    const routePath = m[2];
    const key = `${method} ${routePath}`;
    if (line.includes('verifyToken')) continue;
    assert.ok(
        UNAUTH_API_ALLOWLIST.has(key),
        `Unauthenticated /api route — add verifyToken or extend UNAUTH_API_ALLOWLIST with justification:\n  ${key}\n  ${line.trim()}`
    );
}

// app.route('/api/...').post(...) — not matched by app.post('...') above
const lines = serverSrc.split('\n');
for (let i = 0; i < lines.length; i++) {
    const rm = lines[i].match(/app\.route\(\s*['"`](\/api[^'"`]+)['"`]\)\s*$/);
    if (!rm) continue;
    const routePath = rm[1];
    let method = null;
    let j = i + 1;
    for (; j < Math.min(i + 12, lines.length); j++) {
        const cm = lines[j].match(/^\s*\.(get|post|put|delete|patch)\s*\(/);
        if (cm) {
            method = cm[1].toUpperCase();
            break;
        }
    }
    if (!method) {
        assert.fail(`app.route(${routePath}) has no chained .get/.post within 12 lines`);
    }
    const segment = lines.slice(i, j + 1).join('\n');
    const key = `${method} ${routePath}`;
    if (segment.includes('verifyToken')) continue;
    assert.ok(
        UNAUTH_API_ALLOWLIST.has(key),
        `Unauthenticated app.route — add verifyToken or extend UNAUTH_API_ALLOWLIST:\n  ${key}`
    );
}

// /api/admin/* must never ship without JWT (even if also in allowlist by mistake).
const adminRouteRe = /app\.(get|post|put|delete|patch)\(\s*['"`](\/api\/admin[^'"`]+)['"`]/;
for (const line of serverSrc.split('\n')) {
    const m = line.match(adminRouteRe);
    if (!m) continue;
    assert.ok(
        line.includes('verifyToken'),
        `/api/admin route must use verifyToken:\n  ${line.trim()}`
    );
}

// /api/ai/* must be authenticated (AI spend + data).
const aiRouteRe = /app\.(get|post|put|delete|patch)\(\s*['"`](\/api\/ai[^'"`]+)['"`]/;
for (const line of serverSrc.split('\n')) {
    const m = line.match(aiRouteRe);
    if (!m) continue;
    assert.ok(
        line.includes('verifyToken'),
        `/api/ai route must use verifyToken:\n  ${line.trim()}`
    );
}

// PII/internal tables: migration must not CREATE POLICY on contacts/leads/ops_jobs (DROP ... ON table is fine).
function hasCreatePolicyOnTable(sql, table) {
    const re = new RegExp(`^\\s*CREATE\\s+POLICY\\b.*\\bON\\s+${table}\\b`, 'im');
    return sql.split('\n').some((line) => re.test(line));
}
assert.ok(
    !hasCreatePolicyOnTable(migration, 'contacts'),
    'SECURE_HARDENING_PRO.sql must not CREATE POLICY on contacts (PII — service role only)'
);
assert.ok(
    !hasCreatePolicyOnTable(migration, 'leads'),
    'SECURE_HARDENING_PRO.sql must not CREATE POLICY on leads (PII — service role only)'
);
assert.ok(
    !hasCreatePolicyOnTable(migration, 'ops_jobs'),
    'SECURE_HARDENING_PRO.sql must not CREATE POLICY on ops_jobs (internal OTP OS data — service role only)'
);
assert.ok(migration.includes('ALTER TABLE contacts ENABLE ROW LEVEL SECURITY'));
assert.ok(migration.includes('ALTER TABLE leads ENABLE ROW LEVEL SECURITY'));
assert.ok(migration.includes('ALTER TABLE ops_jobs ENABLE ROW LEVEL SECURITY'));
assert.ok(migration.includes('ALTER TABLE ops_jobs FORCE ROW LEVEL SECURITY'));
assert.ok(migration.includes('REVOKE ALL ON TABLE ops_jobs FROM anon, authenticated'));

// Public analytics: errors must not echo raw exception text to clients.
assert.ok(
    serverSrc.includes("res.status(500).json({ success: false, message: 'Analytics update failed' })"),
    'POST /api/analytics/view must use a generic 500 body (no e.message leak)'
);
assert.ok(
    serverSrc.includes('Checkout could not be started'),
    'POST /api/create-checkout-session must not return raw Stripe exception text to clients'
);
assert.ok(
    serverSrc.includes('function resolveCheckoutOrigin'),
    'POST /api/create-checkout-session must resolve redirects through a dedicated checkout origin allowlist'
);
assert.ok(
    serverSrc.includes('success_url: `${checkoutOrigin}/payment_success.html?session_id={CHECKOUT_SESSION_ID}`'),
    'POST /api/create-checkout-session must use the resolved checkout origin for success redirects'
);
assert.ok(
    serverSrc.includes('cancel_url: `${checkoutOrigin}/index.html#packages`'),
    'POST /api/create-checkout-session must use the resolved checkout origin for cancel redirects'
);
assert.ok(
    !serverSrc.includes("const origin = req.headers.origin || `${protocol}://${host}`"),
    'POST /api/create-checkout-session must not build Stripe redirects directly from request Origin/Host headers'
);
assert.ok(
    serverSrc.includes('const cleanCustomerEmail = customerEmail ? safeEmail(customerEmail) : null'),
    'POST /api/create-checkout-session must validate customerEmail before passing it to Stripe'
);

assert.ok(
    !serverSrc.includes("origin.endsWith('.vercel.app')"),
    'CORS must not trust every *.vercel.app origin'
);
assert.ok(
    serverSrc.includes('allowedOriginSet.has(origin)'),
    'CORS should use an exact allowed-origin set'
);
assert.ok(
    !serverSrc.includes('headers: req.headers'),
    'Diagnostic routes must not echo request headers'
);
assert.ok(
    serverSrc.includes("process.env.NODE_ENV !== 'production' && process.env.OTP_ENABLE_PUBLIC_DIAG === '1'"),
    'Diagnostic route must be disabled in production by default'
);
assert.ok(
    !serverSrc.includes('error: err.message'),
    'Global error handler must not expose raw exception messages'
);
assert.ok(
    serverSrc.includes('Webhook signature verification failed'),
    'Stripe webhook signature failures should use generic public text'
);
assert.ok(
    serverSrc.includes('BOOKING_PUBLIC_PROXY_PATHS'),
    'OTP bookings proxy must use a public path allowlist'
);

assert.ok(
    serverSrc.includes('transactional_email'),
    'GET /api/health should expose transactional_email (Resend) for deploy verification'
);
assert.ok(
    serverSrc.includes("from('ops_jobs').select('job_id'"),
    'GET /api/health should check ops_jobs with the real job_id key'
);
assert.ok(
    serverSrc.includes("app.get('/api/admin/qa/sweep', verifyToken"),
    'Authenticated production QA sweep route must stay admin-only'
);
assert.ok(
    serverSrc.includes('OTP Test Client') && serverSrc.includes('test@onlytrueperspective.tech') && serverSrc.includes('E2E_TEST_MODE'),
    'Authenticated QA route should expose safe fixture names and E2E_TEST_MODE state only'
);
assert.ok(prodBootstrapQa.includes("E2E_TEST_MODE=true"), 'prod QA bootstrap must require explicit E2E_TEST_MODE=true');
assert.ok(prodBootstrapQa.includes('OTP_ADMIN_PASSCODE') && prodBootstrapQa.includes('/api/auth/login'), 'prod QA bootstrap should prefer passcode login for short-lived admin JWTs');
assert.ok(prodBootstrapQa.includes('JWT_SECRET may mint a short-lived admin JWT'), 'prod QA bootstrap should document JWT_SECRET short-lived JWT fallback');
assert.ok(prodBootstrapQa.includes('Fallback auth: OTP_ADMIN_TOKEN'), 'prod QA bootstrap should keep OTP_ADMIN_TOKEN only as a fallback JWT path');
assert.ok(prodBootstrapQa.includes("clientName: 'OTP Test Client'"), 'prod QA bootstrap must use official safe client name');
assert.ok(prodBootstrapQa.includes("email: 'test@onlytrueperspective.tech'"), 'prod QA bootstrap must use official safe email');
assert.ok(prodBootstrapQa.includes("portalToken: 'test-safe-portal-token'"), 'prod QA bootstrap must use official safe portal token');
assert.ok(prodBootstrapQa.includes("sourceType: 'e2e_test'") && prodBootstrapQa.includes("status: 'test'"), 'prod QA bootstrap must mark source/status as e2e_test/test');
assert.ok(prodBootstrapQa.includes("jobId: 'E2E-TEST-SAFE'"), 'prod QA bootstrap must upsert one idempotent safe fixture job');
assert.ok(prodBootstrapQa.includes("paymentStatus: 'Unpaid'"), 'prod QA bootstrap must not imply a real payment');
assert.ok(!prodBootstrapQa.includes('qa@example.com') && !prodBootstrapQa.includes('Live QA Test Client'), 'prod QA bootstrap must not use outdated inconsistent QA fixture values');
assert.ok(!prodBootstrapQa.includes('/api/create-checkout-session') && !prodBootstrapQa.includes('/api/payments/create-link'), 'prod QA bootstrap must not create Stripe charges or payment links');

// uploads bucket: public read is intentional for blog/CDN assets; ensure policy is scoped to that bucket.
assert.ok(
    /CREATE\s+POLICY\s+"Public Access"\s+ON\s+storage\.objects[\s\S]*bucket_id\s*=\s*'uploads'/is.test(
        migration
    ),
    'storage Public Access policy must scope SELECT to bucket_id = uploads'
);

console.log('   API surface + RLS contract OK');
console.log('API SURFACE SECURITY CONTRACT COMPLETE');
