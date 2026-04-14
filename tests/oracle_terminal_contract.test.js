/**
 * Static + lightweight logic checks for OTP Terminal / OTP Oracle integration.
 * No browser, no live API — catches wiring regressions in CI.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('🧪 ORACLE + TERMINAL CONTRACT TESTS...');

const adminCore = read('admin-core.js');
const terminal = read('otp-terminal.html');
const server = read('server.js');

// --- Server: Oracle entry + lead text pipeline (must stay aligned with doc packet) ---
assert.match(server, /app\.post\(['"]\/api\/admin\/knowledge\/recommend['"]/);
assert.match(server, /function buildLeadText\(/);
assert.match(server, /appendOracleStoredContext\(/);
assert.match(server, /function buildDocFields\(/);
assert.match(server, /app\.post\(['"]\/api\/admin\/knowledge\/recommendations['"]/, 'batch recommendations route');

// --- Admin UI: single canonical Oracle runner + backward alias ---
assert.ok(adminCore.includes('window.runOracleForReplyContext = async function'));
assert.ok(
    adminCore.includes('window.runBrainForReplyContext = window.runOracleForReplyContext'),
    'legacy runBrain alias must point at Oracle'
);
assert.ok(
    adminCore.includes('${apiBase}/api/admin/knowledge/recommend'),
    'admin-core should use template URL for knowledge recommend'
);
assert.ok(adminCore.includes('window.replyOracleCache'), 'reply Oracle cache');
assert.ok(adminCore.includes('formatOracleContextBlockHtml'), 'ORACLE_CONTEXT_DATA formatter');
assert.ok(adminCore.includes('buildOraclePanelHtml'), 'Oracle panel HTML builder');

// GEN AI REPLY must still pull recommend (packet alignment)
const genBlock = adminCore.indexOf('window.generateReplyForLead');
assert.ok(genBlock > 0, 'generateReplyForLead exists');
assert.ok(
    adminCore.slice(genBlock, genBlock + 8000).includes('/api/admin/knowledge/recommend'),
    'generateReplyForLead should call knowledge recommend for opsRec'
);

// --- OTP Terminal: buttons wired to globals defined in admin-core ---
assert.ok(terminal.includes('onclick="runOracleForReplyContext()"'), 'reply oracle button onclick');
assert.ok(terminal.includes('onclick="openDocPacket()"'), 'doc packet from reply modal');
assert.ok(terminal.includes('id="replyOracleBtn"'), 'replyOracleBtn id');
assert.ok(terminal.includes('id="replyAnalysis"'), 'analysis mount');
assert.ok(terminal.includes('admin-core.js?v='), 'admin-core cache-busted');

assert.ok(adminCore.includes('window.sanitizeHttpUrl'), 'admin-core must expose http(s) media URL sanitizer');
assert.ok(
    /app\.get\(['"]\/api\/schema-migration['"],\s*verifyToken/.test(server),
    'schema-migration SQL export must require JWT (not public)'
);
assert.ok(
    /app\.get\(['"]\/api\/deploy-sql['"],\s*verifyToken/.test(server),
    'deploy-sql alias must require JWT (not public)'
);
assert.ok(
    adminCore.includes("headers['Authorization']") && adminCore.includes('schema-migration'),
    'viewSqlSchema must send bearer token when fetching hub SQL'
);

// --- Mirror: tactical-only ORACLE_CONTEXT formatting (keep in sync with formatOracleContextBlockHtml) ---
function formatOracleContextBlockHtmlTest(raw) {
    if (raw == null || raw === '') return '';
    let obj = raw;
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (t.startsWith('{')) {
            try { obj = JSON.parse(t); } catch (_) { obj = { tactical_advice: t }; }
        } else {
            obj = { tactical_advice: t };
        }
    }
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return 'json';
    const keys = Object.keys(obj).filter((k) => obj[k] != null && String(obj[k]).trim() !== '');
    if (keys.length === 1 && keys[0] === 'tactical_advice') return 'tactical-only';
    return 'json';
}

assert.strictEqual(formatOracleContextBlockHtmlTest({ tactical_advice: 'Hello scope' }), 'tactical-only');
assert.strictEqual(formatOracleContextBlockHtmlTest('plain advice'), 'tactical-only');
assert.strictEqual(formatOracleContextBlockHtmlTest({ tactical_advice: 'a', extra: 'b' }), 'json');

console.log('   ✅ Oracle + Terminal contract OK');
console.log('🎉 ORACLE TERMINAL CONTRACT COMPLETE');
