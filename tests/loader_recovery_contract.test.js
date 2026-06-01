/**
 * Loader + light-mode recovery guards.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('LOADER RECOVERY CONTRACT...');

const index = read('index.html');
const siteInit = read('site-init.js');
const themeChrono = read('theme-chrono.js');
const styles = read('styles.css');

assert.ok(index.includes('id="page-loader"'), 'homepage exposes page loader');
assert.ok(index.includes('OTP.dismissPageLoader'), 'homepage inline loader fail-safe is defined before deferred scripts');
assert.ok(index.includes("addEventListener('DOMContentLoaded', dismissPageLoader"), 'inline loader dismisses on DOMContentLoaded');
assert.ok(index.includes('setTimeout(dismissPageLoader, 1600)'), 'inline loader has hard timeout fallback');
assert.ok(siteInit.includes('OTP.dismissPageLoader'), 'site-init delegates to inline loader dismiss');
assert.ok(siteInit.includes('Loading timeout reached'), 'site-init keeps timeout bypass log');
assert.ok(siteInit.includes('Theme init failed'), 'site-init catches theme init failures');
assert.ok(siteInit.includes("typeof registration.addEventListener !== 'function'"), 'service worker registration tolerates blocked/undefined registrations');
assert.ok(/try[\s\S]{0,220}OTPAttribution[\s\S]{0,220}catch/.test(siteInit), 'attribution capture cannot block boot');
assert.ok(/try[\s\S]{0,260}activateHeroAnimatedLogo[\s\S]{0,220}catch/.test(siteInit), 'hero reveal cannot block boot');
assert.ok(themeChrono.includes("resetParams.get('reset_theme') === '1'"), 'theme reset query clears stored theme');
assert.ok(themeChrono.includes('function storageGet'), 'theme paint reads localStorage safely');
assert.ok(themeChrono.includes('normalizeTheme'), 'invalid stored theme values are ignored');
assert.ok(styles.includes('#page-loader.is-dismissed'), 'dismissed loader is removed from layout');
assert.ok(styles.includes('[data-theme="light"]'), 'light theme tokens remain available');

console.log('   OK: Loader recovery contract');
console.log('LOADER RECOVERY CONTRACT COMPLETE');
