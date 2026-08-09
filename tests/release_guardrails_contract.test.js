const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('RELEASE GUARDRAILS CONTRACT...');

const script = read('scripts/verify_release_scope.js');
const masterRunner = read('tests/master_runner.js');
const ignoreBuildScript = read('scripts/vercel_ignore_build_step.js');
const packageJson = JSON.parse(read('package.json'));
const vercelConfig = JSON.parse(read('vercel.json'));
const ciWorkflow = read('.github/workflows/ci.yml');
const productionWorkflow = read('.github/workflows/production-release.yml');
const terminalSweep = read('scripts/prod_terminal_sweep.js');
const fullSweep = read('scripts/prod_full_sweep.js');
const homepage = read('index.html');
const clientCss = read('client.css');
const schemaMigration = read('supabase/migrations/DEPLOY_V1.3.sql');
const docs = read('docs/OTP_CLEAN_RELEASE_GUARDRAILS.md');
const manifestGuide = read('docs/OTP_RELEASE_MANIFEST_GUIDE.md');

assert.ok(script.includes('OTP_PRIMARY_CHECKOUT'), 'release guard checks the primary checkout path');
assert.ok(!script.includes("'/Users/eli/OTP/otp-site'"), 'release guard does not hardcode the Mac checkout path');
assert.ok(script.includes('OTP_ALLOW_PRIMARY_DIRTY_DEPLOY'), 'dirty primary deploy override is explicit');
assert.ok(script.includes('fs.realpathSync.native'), 'release guard resolves symlinked primary checkout paths');
assert.ok(script.includes('cwdReal === primaryCheckoutReal'), 'release guard blocks dirty deploys through symlinked checkouts');
assert.ok(script.includes('includedFiles'), 'release guard validates includedFiles manifest');
assert.ok(script.includes('excludedDirtyFiles'), 'release guard validates excludedDirtyFiles manifest section');
assert.ok(script.includes('missingIncludedFiles'), 'release guard rejects missing manifest files');
assert.ok(script.includes('--deploy'), 'release guard exposes production deploy mode');
assert.ok(script.includes('requirePassedReleaseEvidence'), 'release guard requires passed evidence in deploy mode');
assert.ok(script.includes('requireProductionTarget'), 'release guard requires canonical production target in deploy mode');
assert.ok(/test-report\\+?\.xml|test-report\\\\\.xml/.test(script), 'release guard blocks generated test report artifacts');
assert.ok(/\\.har|\.har/.test(script), 'release guard blocks HAR artifacts');
assert.ok(/\\.env|\.env/.test(script), 'release guard blocks env files');

assert.strictEqual(packageJson.scripts['release:scope'], 'node scripts/verify_release_scope.js --manifest=release-manifest.json', 'release scope script is the default manifest check');
assert.strictEqual(packageJson.scripts['release:gate'], 'node scripts/verify_release_scope.js --manifest=release-manifest.json --deploy', 'release gate script uses deploy mode');
assert.strictEqual(packageJson.scripts['vercel:ignore-build'], 'node scripts/vercel_ignore_build_step.js', 'Vercel ignored-build script is addressable from npm');
assert.ok(!Object.values(packageJson.scripts).some((command) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(command)), 'npm scripts avoid Unix-only inline environment assignments');
assert.ok(masterRunner.includes('execFileSync'), 'master runner launches tests without a shell command string');
assert.strictEqual(vercelConfig.ignoreCommand, 'node scripts/vercel_ignore_build_step.js', 'Vercel production builds use ignored-build guard');
assert.ok(ignoreBuildScript.includes('exit 0 => ignore/cancel this deployment'), 'Vercel ignore script documents inverted exit semantics');
assert.ok(ignoreBuildScript.includes('VERCEL_GIT_PROVIDER') && ignoreBuildScript.includes('VERCEL_ENV'), 'Vercel ignore script detects Git-triggered production deploys');
assert.ok(ignoreBuildScript.includes('OTP_ALLOW_VERCEL_GIT_PRODUCTION_DEPLOY'), 'Vercel ignore script keeps an explicit emergency override');

for (const sweep of [terminalSweep, fullSweep]) {
  assert.ok(sweep.includes('OnlyTruePerspective | Rhode Island Creative Technology'), 'production sweep pins the canonical homepage title');
  assert.ok(sweep.includes('portal-shell') && sweep.includes('portal-root'), 'production sweep pins the current private portal CSS shell');
  assert.ok(!sweep.includes("'Insights'") && !sweep.includes('client-shell') && !sweep.includes('documents-list'), 'production sweep contains no retired source markers');
}
assert.ok(homepage.includes('OnlyTruePerspective | Rhode Island Creative Technology'), 'canonical homepage title exists in source');
assert.ok(clientCss.includes('.portal-shell') && clientCss.includes('.portal-root'), 'canonical private portal CSS markers exist in source');
assert.ok(schemaMigration.includes('OTP SYSTEM MIGRATION V1.3.0'), 'schema endpoint migration marker exists in source');
assert.ok(terminalSweep.includes('OTP SYSTEM MIGRATION V1.3.0') && !terminalSweep.includes('SECURE_HARDENING_PRO'), 'terminal sweep validates the migration actually served by the endpoint');

assert.ok(ciWorkflow.includes('npm run release:scope'), 'CI runs release scope guard on PRs and main pushes');
assert.ok(ciWorkflow.includes('npm run security:scan'), 'CI runs secret/security scan');
assert.ok(ciWorkflow.includes('npm run build:speed-insights'), 'CI keeps speed insights bundle checked');
assert.ok(!ciWorkflow.includes('npm run prod:terminal-sweep'), 'source-only CI does not compare an undeployed commit to live production');
assert.ok(!ciWorkflow.includes('LIVE_API_URL: https://www.onlytrueperspective.tech'), 'source-only CI has no live production target');
assert.ok(productionWorkflow.includes('confirm_clean_release') && productionWorkflow.includes('CLEAN_RELEASE'), 'production workflow requires explicit clean-release confirmation');
assert.ok(productionWorkflow.includes('npm run release:gate'), 'production workflow blocks deploy behind release gate');
assert.ok(productionWorkflow.includes('Require authenticated sweep credentials'), 'production workflow requires authenticated sweep credentials');
assert.ok(productionWorkflow.includes('npm run prod:full-sweep'), 'production workflow runs public and authenticated production sweeps');
assert.ok(productionWorkflow.includes('build --prod') && productionWorkflow.includes('deploy --prebuilt --prod'), 'production workflow deploys prebuilt output after gates pass');

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
assert.ok(docs.includes('CI-Enforced Production Path'), 'guardrail docs define the CI production release path');
assert.ok(docs.includes('vercel_ignore_build_step.js'), 'guardrail docs document Vercel auto-deploy blocking');
assert.ok(manifestGuide.includes('Minimum Manifest Template'), 'manifest guide provides release manifest structure');
assert.ok(manifestGuide.includes('selected_fast_offer'), 'manifest guide protects Fast Lane payload evidence');
assert.ok(manifestGuide.includes('canonical authenticated sweep passes'), 'manifest guide requires auth sweep evidence');
assert.ok(manifestGuide.includes('npm run release:gate'), 'manifest guide requires the production release gate');

console.log('   OK: Release guardrails contract');
console.log('RELEASE GUARDRAILS CONTRACT COMPLETE');
