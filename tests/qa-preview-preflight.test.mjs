import assert from 'node:assert/strict';
import test from 'node:test';
import { hasBranchScopedVariable, missingBranchVariables } from '../scripts/qa-preview-preflight.mjs';

test('QA Preview preflight requires the exact Preview branch scope', () => {
  const listing = [
    'OTP_ENV                     Hidden   Secret   Preview (feature/nexus)   1d ago',
    'STRIPE_SECRET_KEY           Hidden   Secret   Preview (feature/other)   1d ago',
    'SUPABASE_URL                Hidden   Secret   Preview, Production       2d ago'
  ].join('\n');
  assert.equal(hasBranchScopedVariable(listing, 'OTP_ENV', 'feature/nexus'), true);
  assert.equal(hasBranchScopedVariable(listing, 'STRIPE_SECRET_KEY', 'feature/nexus'), false);
  assert.equal(hasBranchScopedVariable(listing, 'SUPABASE_URL', 'feature/nexus'), false);
  assert.deepEqual(missingBranchVariables(listing, ['OTP_ENV', 'STRIPE_SECRET_KEY'], 'feature/nexus'), ['STRIPE_SECRET_KEY']);
});
