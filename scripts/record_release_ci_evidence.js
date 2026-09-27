#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

if (process.env.GITHUB_ACTIONS !== 'true') fail('CI evidence can only be recorded by the protected GitHub workflow.');
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const reportArg = process.argv.find((arg) => arg.startsWith('--report='));
const browserArg = process.argv.find((arg) => arg.startsWith('--browser-report='));
if (!manifestArg || !reportArg || !browserArg) fail('--manifest, --report, and --browser-report are required.');

const manifestPath = path.resolve(manifestArg.slice('--manifest='.length));
const reportPath = path.resolve(reportArg.slice('--report='.length));
const browserPath = path.resolve(browserArg.slice('--browser-report='.length));
let manifest;
let report;
let browserReport;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  browserReport = JSON.parse(fs.readFileSync(browserPath, 'utf8'));
} catch {
  fail('Release manifest, production sweep, or browser QA report could not be read as JSON.');
}

if (browserReport.ok !== true
  || ![390, 1440].every((width) => browserReport.viewports?.includes(width))
  || !['/', '/bookings?offer=site-audit', '/bookings'].every((route) => browserReport.routes?.includes(route))
  || browserReport.checks?.length < 6) {
  fail('Release browser QA did not pass.');
}

const adminChecks = Array.isArray(report.adminChecks) ? report.adminChecks : [];
const failedChecks = adminChecks.filter((check) => !check.ok);
if (report.schema !== 'otp-prod-full-sweep-v2'
  || report.ok !== true
  || report.adminAuth?.configured !== true
  || report.adminAuth?.attempted !== true
  || adminChecks.length < 5
  || failedChecks.length) {
  fail('Authenticated production sweep did not pass.', {
    adminAuth: {
      configured: report.adminAuth?.configured === true,
      attempted: report.adminAuth?.attempted === true,
      source: report.adminAuth?.source || '',
      method: report.adminAuth?.method || ''
    },
    failedChecks: failedChecks.map(({ name, url, status }) => ({ name, url, status }))
  });
}

const runId = String(process.env.GITHUB_RUN_ID || 'unknown');
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`
  : '';
manifest.testsRun = (manifest.testsRun || []).map((entry) => ({
  ...entry,
  status: `passed in protected production workflow ${runId}`
}));
manifest.authenticatedSweep = {
  status: 'passed',
  checkedAt: new Date().toISOString(),
  source: report.adminAuth.source,
  method: report.adminAuth.method,
  adminCheckCount: adminChecks.length,
  evidence: runUrl
};
manifest.browserQa = {
  status: 'passed',
  viewports: browserReport.viewports,
  routes: browserReport.routes,
  checks: browserReport.checks,
  evidence: runUrl
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  authenticatedSweep: 'passed',
  source: report.adminAuth.source,
  method: report.adminAuth.method,
  adminCheckCount: adminChecks.length,
  evidence: runUrl
}, null, 2));
