const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('RELEASE GUARDRAILS CONTRACT...');

const script = read('scripts/verify_release_scope.js');
const docs = read('docs/OTP_CLEAN_RELEASE_GUARDRAILS.md');
const manifestGuide = read('docs/OTP_RELEASE_MANIFEST_GUIDE.md');

assert.ok(script.includes('OTP_PRIMARY_CHECKOUT'), 'release guard checks the primary checkout path');
assert.ok(script.includes('OTP_ALLOW_PRIMARY_DIRTY_DEPLOY'), 'dirty primary deploy override is explicit');
assert.ok(script.includes('fs.realpathSync.native'), 'release guard resolves symlinked primary checkout paths');
assert.ok(script.includes('cwdReal === primaryCheckoutReal'), 'release guard blocks dirty deploys through symlinked checkouts');
assert.ok(script.includes('includedFiles'), 'release guard validates includedFiles manifest');
assert.ok(script.includes('excludedDirtyFiles'), 'release guard validates excludedDirtyFiles manifest section');
assert.ok(/test-report\\+?\.xml|test-report\\\\\.xml/.test(script), 'release guard blocks generated test report artifacts');
assert.ok(/\\.har|\.har/.test(script), 'release guard blocks HAR artifacts');
assert.ok(/\\.env|\.env/.test(script), 'release guard blocks env files');

assert.ok(/Clean scoped release/i.test(docs), 'guardrail docs define clean scoped release');
assert.ok(/Never deploy from `?\/Users\/eli\/OTP\/otp-site`?/i.test(docs), 'guardrail docs block dirty primary deploys');
assert.ok(/Release manifest/i.test(docs), 'guardrail docs require release manifests');
assert.ok(docs.includes('authenticated sweep'), 'guardrail docs require authenticated sweep evidence');
assert.ok(docs.includes('git -C /Users/eli/OTP/otp-os status --short'), 'guardrail docs require OTP OS dirty-state audit');
assert.ok(docs.includes('otp-os` is now a git repo'), 'guardrail docs document OTP OS git status');
assert.ok(docs.includes('generated-artifact'), 'guardrail docs categorize generated artifacts');
assert.ok(docs.includes('otp-attribution.js'), 'guardrail docs protect attribution source tracking');
assert.ok(docs.includes('captured_at'), 'guardrail docs require source tracking timestamps');
assert.ok(docs.includes('Manifest Freshness'), 'guardrail docs block stale manifest exclusions');
assert.ok(manifestGuide.includes('Minimum Manifest Template'), 'manifest guide provides release manifest structure');
assert.ok(manifestGuide.includes('selected_fast_offer'), 'manifest guide protects Fast Lane payload evidence');
assert.ok(manifestGuide.includes('canonical authenticated sweep passes'), 'manifest guide requires auth sweep evidence');

console.log('   OK: Release guardrails contract');
console.log('RELEASE GUARDRAILS CONTRACT COMPLETE');
