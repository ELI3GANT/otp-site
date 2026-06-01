#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Vercel ignored-build guard.
 *
 * Vercel semantics are inverted:
 * - exit 0 => ignore/cancel this deployment
 * - exit 1 => continue building
 *
 * OTP production deploys should come from the clean scoped release workflow or
 * a verified clean CLI release. Git-triggered production auto-deploys are
 * ignored by default so dirty or stale branches cannot silently become prod.
 */

const isProduction = String(process.env.VERCEL_ENV || '').toLowerCase() === 'production';
const isGitTriggered = Boolean(
  process.env.VERCEL_GIT_PROVIDER
  || process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.VERCEL_GIT_COMMIT_REF
);
const explicitOverride = process.env.OTP_ALLOW_VERCEL_GIT_PRODUCTION_DEPLOY === '1';

if (isProduction && isGitTriggered && !explicitOverride) {
  console.log('OTP release gate: ignoring Git-triggered production deploy. Use the clean scoped production-release workflow.');
  process.exit(0);
}

console.log('OTP release gate: deployment may continue.');
process.exit(1);
