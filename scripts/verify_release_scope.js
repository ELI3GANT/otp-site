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

const args = process.argv.slice(2);
const manifestArg = args.find((arg) => arg.startsWith('--manifest='));
const manifestPath = manifestArg ? manifestArg.split('=').slice(1).join('=') : process.env.OTP_RELEASE_MANIFEST;
const primaryCheckout = path.resolve(process.env.OTP_PRIMARY_CHECKOUT || '/Users/eli/OTP/otp-site');
const cwd = path.resolve(process.cwd());
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

if (cwd === primaryCheckout && lines.length && !allowPrimaryDirtyDeploy) {
  fail('Refusing to deploy from the primary dirty checkout. Create a clean scoped release/worktree first.', dirtyPaths);
}

if (manifest) {
  const unexpected = dirtyPaths.filter((file) => !manifest.included.has(file));
  if (unexpected.length) fail('Release scope has dirty files outside the manifest.', unexpected);
  const requiredSections = ['includedFiles', 'excludedDirtyFiles', 'testsRun', 'browserQa', 'authenticatedSweep', 'deploymentTarget'];
  const missingSections = requiredSections.filter((key) => !(key in manifest.manifest));
  if (missingSections.length) fail('Release manifest is missing required sections.', missingSections);
}

console.log(JSON.stringify({
  ok: true,
  cwd,
  primaryCheckout,
  dirtyCount: dirtyPaths.length,
  manifest: manifest ? short(manifest.abs) : null
}, null, 2));
