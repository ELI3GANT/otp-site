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

/** Every /api route must use verifyToken OR appear here (exact METHOD + path). */
const UNAUTH_API_ALLOWLIST = new Set([
    'GET /api',
    'GET /api/health',
    'GET /api/status',
    'GET /api/webhook',
    'POST /api/webhook',
    'POST /api/auth/login',
    'POST /api/contact/submit',
    'POST /api/audit/submit',
    'POST /api/analytics/view'
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

// PII tables: migration must not CREATE POLICY on contacts/leads (DROP ... ON table is fine).
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
assert.ok(migration.includes('ALTER TABLE contacts ENABLE ROW LEVEL SECURITY'));
assert.ok(migration.includes('ALTER TABLE leads ENABLE ROW LEVEL SECURITY'));

// uploads bucket: public read is intentional for blog/CDN assets; ensure policy is scoped to that bucket.
assert.ok(
    /CREATE\s+POLICY\s+"Public Access"\s+ON\s+storage\.objects[\s\S]*bucket_id\s*=\s*'uploads'/is.test(
        migration
    ),
    'storage Public Access policy must scope SELECT to bucket_id = uploads'
);

console.log('   API surface + RLS contract OK');
console.log('API SURFACE SECURITY CONTRACT COMPLETE');
