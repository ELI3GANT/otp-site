#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function short(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}

function readManifest(filePath) {
  if (!filePath) return null;
  const abs = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(abs, 'utf8');
  const manifest = JSON.parse(raw);
  const included = new Set((manifest.includedFiles || []).map((file) => String(file).replace(/\\/g, '/')));
  return { abs, manifest, included };
}

function gitStatus() {
  try {
    return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).split(/\r?\n/).filter(Boolean);
  } catch (error) {
    throw new Error(`git status failed: ${error.message}`);
  }
}

function statusPath(line) {
  const raw = line.slice(3).trim();
  const renamed = raw.includes(' -> ') ? raw.split(' -> ').pop() : raw;
  return renamed.replace(/^"|"$/g, '').replace(/\\/g, '/');
}

function fail(message, details = []) {
  console.error(JSON.stringify({ ok: false, message, details }, null, 2));
  process.exit(1);
}

function asStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function requirePassedReleaseEvidence(manifest) {
  const release = manifest.manifest;
  const failures = [];
  const tests = Array.isArray(release.testsRun) ? release.testsRun : [];
  const requiredCommandFragments = [
    'npm test',
    'npm run security:scan',
    'npm run build:speed-insights',
    'npm run master_test:ci',
    'npm run prod:full-sweep',
    'git diff --check',
    'node --check'
  ];

  for (const fragment of requiredCommandFragments) {
    const match = tests.find((entry) => String(entry.command || '').includes(fragment));
    if (!match) {
      failures.push(`testsRun missing ${fragment}`);
    } else if (!asStatus(match.status).startsWith('passed')) {
      failures.push(`testsRun ${fragment} is not passed`);
    }
  }

  if (asStatus(release.browserQa && release.browserQa.status) !== 'passed') {
    failures.push('browserQa.status must be passed');
  }

  if (asStatus(release.authenticatedSweep && release.authenticatedSweep.status) !== 'passed') {
    failures.push('authenticatedSweep.status must be passed');
  }

  return failures;
}

function requireProductionTarget(manifest) {
  const target = manifest.manifest.deploymentTarget || {};
  const aliases = Array.isArray(target.aliases) ? target.aliases : [];
  const failures = [];

  if (!target.project) failures.push('deploymentTarget.project is required');
  if (!aliases.includes('https://www.onlytrueperspective.tech')) {
    failures.push('deploymentTarget.aliases must include https://www.onlytrueperspective.tech');
  }
  if (!aliases.includes('https://onlytrueperspective.tech')) {
    failures.push('deploymentTarget.aliases must include https://onlytrueperspective.tech');
  }

  return failures;
}

function realPathOrResolved(inputPath) {
  const resolved = path.resolve(inputPath);
  try {
    return fs.realpathSync.native(resolved);
  } catch (_) {
    return resolved;
  }
}

const args = process.argv.slice(2);
const manifestArg = args.find((arg) => arg.startsWith('--manifest='));
const manifestPath = manifestArg ? manifestArg.split('=').slice(1).join('=') : process.env.OTP_RELEASE_MANIFEST;
const deployGate = args.includes('--deploy') || args.includes('--production');
const requireClean = deployGate || args.includes('--require-clean');
const requireEvidence = deployGate || args.includes('--require-passed-evidence');
const requireTarget = deployGate || args.includes('--require-production-target');
const primaryCheckout = path.resolve(process.env.OTP_PRIMARY_CHECKOUT || '/Users/eli/OTP/otp-site');
const cwd = path.resolve(process.cwd());
const primaryCheckoutReal = realPathOrResolved(primaryCheckout);
const cwdReal = realPathOrResolved(cwd);
const allowPrimaryDirtyDeploy = process.env.OTP_ALLOW_PRIMARY_DIRTY_DEPLOY === '1';
const manifest = readManifest(manifestPath || '');
const lines = gitStatus();
const dirtyPaths = lines.map(statusPath);
const artifactPatterns = [
  /^\.env(?:\.|$)/,
  /(^|\/)\.env(?:\.|$)/,
  /\.har$/i,
  /(^|\/)output\/playwright\//,
  /(^|\/)test-report\.xml$/,
  /(^|\/)node_modules\//
];

const artifacts = dirtyPaths.filter((file) => artifactPatterns.some((re) => re.test(file)));
if (artifacts.length) fail('Release scope contains generated, local, or sensitive artifacts.', artifacts);

if ((cwd === primaryCheckout || cwdReal === primaryCheckoutReal) && lines.length && !allowPrimaryDirtyDeploy) {
  fail('Refusing to deploy from the primary dirty checkout. Create a clean scoped release/worktree first.', dirtyPaths);
}

if (requireClean && dirtyPaths.length) {
  fail('Production release gate requires a clean scoped release checkout.', dirtyPaths);
}

if (manifest) {
  const missingIncludedFiles = Array.from(manifest.included).filter((file) => !fs.existsSync(path.join(process.cwd(), file)));
  if (missingIncludedFiles.length) fail('Release manifest references files that do not exist.', missingIncludedFiles);
  const unexpected = dirtyPaths.filter((file) => !manifest.included.has(file));
  if (unexpected.length) fail('Release scope has dirty files outside the manifest.', unexpected);
  const requiredSections = ['includedFiles', 'excludedDirtyFiles', 'testsRun', 'browserQa', 'authenticatedSweep', 'deploymentTarget'];
  const missingSections = requiredSections.filter((key) => !(key in manifest.manifest));
  if (missingSections.length) fail('Release manifest is missing required sections.', missingSections);
  if (requireEvidence) {
    const evidenceFailures = requirePassedReleaseEvidence(manifest);
    if (evidenceFailures.length) fail('Release manifest does not contain passed production evidence.', evidenceFailures);
  }
  if (requireTarget) {
    const targetFailures = requireProductionTarget(manifest);
    if (targetFailures.length) fail('Release manifest deployment target is incomplete.', targetFailures);
  }
} else if (deployGate) {
  fail('Production release gate requires a release manifest. Pass --manifest=release-manifest.json.');
}

console.log(JSON.stringify({
  ok: true,
  deployGate,
  requireClean,
  cwd,
  cwdReal,
  primaryCheckout,
  primaryCheckoutReal,
  dirtyCount: dirtyPaths.length,
  manifest: manifest ? short(manifest.abs) : null
}, null, 2));
