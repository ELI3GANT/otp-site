#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEAM = 'only-true-perspective';
const REQUIREMENTS = {
  'otp-site': [
    'OTP_ENV',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'OTP_PUBLIC_SITE_ORIGIN',
    'OTP_SITE_DIRECT_STRIPE_SANDBOX',
    'STRIPE_SECRET_KEY',
    'OTP_OS_UPSTREAM_URL',
    'OTP_OS_VERCEL_BYPASS_SECRET'
  ],
  'otp-os': [
    'OTP_ENV',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'APP_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'OTP_PUBLIC_SITE_ORIGIN',
    'PUBLIC_CLIENT_BASE_URL'
  ]
};

export function hasBranchScopedVariable(output, name, branch) {
  const scope = `Preview (${branch})`;
  return String(output || '').split(/\r?\n/).some((line) => {
    const fields = line.trim().split(/\s{2,}/);
    return fields[0] === name && fields.includes(scope);
  });
}

export function missingBranchVariables(output, names, branch) {
  return names.filter((name) => !hasBranchScopedVariable(output, name, branch));
}

function getCliOutput(project, branch) {
  const result = spawnSync('npx', [
    '--yes', 'vercel', 'env', 'ls',
    '--environment=preview',
    `--git-branch=${branch}`,
    `--project=${project}`,
    `--scope=${TEAM}`
  ], { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`Could not inspect Vercel Preview scopes for ${project}; verify Vercel CLI authentication and access.`);
  }
  // Vercel may include readable Config values in this output. Keep it in memory and never print it.
  return result.stdout;
}

export function runPreflight(branch) {
  if (branch !== 'feature/nexus') {
    throw new Error('Only the permanent feature/nexus QA integration branch is authorized.');
  }
  const current = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
  if (current.status !== 0 || current.stdout.trim() !== branch) {
    throw new Error('The requested QA branch must match the current local Git branch.');
  }

  const missing = [];
  for (const [project, names] of Object.entries(REQUIREMENTS)) {
    const output = getCliOutput(project, branch);
    for (const name of missingBranchVariables(output, names, branch)) {
      missing.push(`${project}: ${name}`);
    }
  }

  if (missing.length) {
    console.error(`QA Preview preflight failed for ${branch}. Missing exact-branch Preview scopes:`);
    for (const item of missing) console.error(`- ${item}`);
    console.error('Add the variables from the verified feature/nexus QA configuration in Vercel. Keep them Preview-only and scoped to this exact Git branch; do not pull or print Secret values.');
    return false;
  }

  console.log(`QA Preview preflight passed for ${branch}. Required variable names exist only in exact-branch Preview scopes; values were not read or printed.`);
  console.log('The app runtime QA guards must still confirm the effective Supabase project and Stripe test mode before any mutation.');
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const branch = process.argv[2] || '';
  try {
    process.exitCode = runPreflight(branch) ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
