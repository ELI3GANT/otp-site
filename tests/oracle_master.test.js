/**
 * OTP Oracle stack — consolidated static checks (server + terminal + admin-core).
 * Runs with: npm run test:oracle
 * Included in: npm test (master_runner)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('OTP ORACLE MASTER (STACK) TESTS...');

const server = read('server.js');
const adminCore = read('admin-core.js');
const terminal = read('otp-terminal.html');

// --- Server: recommend + batch + doc packet pipeline ---
assert.match(server, /app\.post\(['"]\/api\/admin\/knowledge\/recommend['"]/);
assert.match(server, /app\.post\(['"]\/api\/admin\/knowledge\/recommendations['"]/);
assert.match(server, /app\.post\(['"]\/api\/admin\/docs\/packet['"]/);
assert.match(server, /function buildBrainResponse\(/);
assert.match(server, /function buildDocFields\(/);
assert.match(server, /mission_brief:/, 'buildDocFields exposes mission_brief for HTML/docx');
assert.match(server, /documents_reason:/, 'buildDocFields exposes documents_reason');
assert.match(server, /function pushLeadLine\(/);
assert.match(server, /Client &amp; mission details/, 'renderHtmlDoc shows client/mission section');
assert.match(server, /function renderHtmlDoc\(/);
assert.match(server, /function appendOracleStoredContext\(/);
assert.match(server, /inferPackageAndRange\(/);
assert.match(server, /computeRequiredDocuments\(/);
assert.match(server, /Simple Edit/, 'Oracle supports Simple Edit service');
assert.match(server, /service_type:/, 'Oracle recommendation includes service_type');
assert.match(server, /kb_structured::/, 'Structured knowledge prefix present');
assert.match(server, /\/api\/admin\/knowledge\/structured\/list/, 'Structured knowledge list endpoint');
assert.match(server, /\/api\/admin\/knowledge\/structured\/upsert/, 'Structured knowledge upsert endpoint');
assert.match(server, /\/api\/admin\/knowledge\/structured\/archive/, 'Structured knowledge archive endpoint');
assert.match(server, /runOracleRecommendation\(/, 'Shared recommendation helper');
assert.match(server, /\/api\/admin\/docs\/signature\/request/, 'Signature request endpoint scaffolding');
assert.match(server, /\/api\/admin\/docs\/signature\/capture/, 'Signature capture endpoint scaffolding');

// --- Admin-core: Terminal Oracle entry points + cache ---
assert.ok(adminCore.includes('window.runOracleForReplyContext = async function'));
assert.ok(adminCore.includes('window.requestLeadBrain = async function'));
assert.ok(adminCore.includes('window.replyOracleCache'));
assert.ok(adminCore.includes('window.leadOracleCache'));
assert.ok(adminCore.includes('/api/admin/knowledge/recommend'));
assert.ok(adminCore.includes('/api/admin/knowledge/recommendations'));
assert.ok(adminCore.includes('/api/admin/docs/packet'));
assert.ok(adminCore.includes('fetchStructuredKnowledge'), 'structured knowledge UI fetch');
assert.ok(adminCore.includes('buildOraclePanelHtml'));
assert.ok(adminCore.includes('formatOracleContextBlockHtml'));

const genIdx = adminCore.indexOf('window.generateReplyForLead');
assert.ok(genIdx > 0);
assert.ok(
    adminCore.slice(genIdx, genIdx + 9000).includes('/api/admin/knowledge/recommend'),
    'GEN AI reply path still calls knowledge recommend'
);

// --- OTP Terminal HTML wiring ---
assert.ok(terminal.includes('onclick="runOracleForReplyContext()"'));
assert.ok(terminal.includes('id="replyOracleBtn"'));
assert.ok(terminal.includes('06.5 // OTP Oracle · Knowledge Index'));
assert.ok(terminal.includes('fetchKnowledgeFiles'));
assert.ok(terminal.includes('Structured Oracle Knowledge (Priority)'));

console.log('   OK: OTP Oracle master stack');
console.log('OTP ORACLE MASTER COMPLETE');
