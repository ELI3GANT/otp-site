const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const script = path.join(root, 'scripts/record_release_ci_evidence.js');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'otp-release-auth-'));

try {
  const manifestPath = path.join(temp, 'manifest.json');
  const reportPath = path.join(temp, 'sweep.json');
  const manifest = {
    testsRun: [{ command: 'npm test', status: 'pending' }],
    authenticatedSweep: { status: 'pending' }
  };
  const adminChecks = ['admin-qa-sweep', 'admin-knowledge-meta', 'admin-knowledge-files', 'admin-docs-templates-status', 'schema-migration']
    .map((name) => ({ name, url: `https://www.onlytrueperspective.tech/api/${name}`, status: 200, ok: true }));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  fs.writeFileSync(reportPath, JSON.stringify({
    schema: 'otp-prod-full-sweep-v2',
    ok: true,
    adminAuth: { configured: true, attempted: true, source: 'OTP_ADMIN_TOKEN', method: 'token' },
    adminChecks
  }));

  const env = { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_RUN_ID: '12345', GITHUB_SERVER_URL: 'https://github.com', GITHUB_REPOSITORY: 'ELI3GANT/otp-site' };
  const passed = spawnSync(process.execPath, [script, `--manifest=${manifestPath}`, `--report=${reportPath}`], { encoding: 'utf8', env });
  assert.equal(passed.status, 0, passed.stderr);
  const recorded = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(recorded.authenticatedSweep.status, 'passed');
  assert.equal(recorded.authenticatedSweep.adminCheckCount, 5);
  assert.match(recorded.authenticatedSweep.evidence, /actions\/runs\/12345$/);
  assert.equal(recorded.testsRun[0].status, 'passed in protected production workflow 12345');

  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  fs.writeFileSync(reportPath, JSON.stringify({
    schema: 'otp-prod-full-sweep-v2',
    ok: true,
    adminAuth: { configured: false, attempted: false },
    adminChecks: []
  }));
  const skipped = spawnSync(process.execPath, [script, `--manifest=${manifestPath}`, `--report=${reportPath}`], { encoding: 'utf8', env });
  assert.notEqual(skipped.status, 0, 'a skipped authenticated sweep cannot produce release evidence');
  assert.equal(JSON.parse(fs.readFileSync(manifestPath, 'utf8')).authenticatedSweep.status, 'pending');
  console.log('Protected release evidence requires a successful authenticated admin sweep.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
