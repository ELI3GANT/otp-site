const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('HOMEPAGE VISUAL CONTRACT...');

const styles = read('styles.css');
const stars = read('stars-v2.js');
const siteInit = read('site-init.js');

assert.ok(styles.includes('Clean homepage visual restore'), 'homepage visual restore guard is documented');
assert.ok(styles.includes('html[data-stars="mounted"] .home-page .hero::before'), 'mounted star canvas disables fallback pseudo layer');
assert.ok(styles.includes('html:not([data-stars="mounted"]):not([data-stars="disabled"]) .home-page .hero::before'), 'fallback star layer only renders when canvas is not mounted');
assert.ok(!styles.includes('background-size: 150px 150px, 230px 230px, 310px 310px'), 'old tiled star fallback must not return');
assert.ok(!styles.includes('otp-static-star-drift'), 'old animated tiled fallback must not return');
assert.ok(styles.includes('opacity: 0.92 !important'), 'dark canvas stars remain visible');
assert.ok(styles.includes('opacity: 0.46 !important'), 'day/light canvas stars remain visible');
assert.ok(styles.includes('html.stars-performance-mode .bg-grain'), 'performance mode pauses grain overlays');
assert.ok(styles.includes('otp-static-performance-logo'), 'performance mode static logo style is present');
assert.ok(styles.includes('.spectral-v-sync .network-pkg h4'), 'mobile spectral variants cannot force package headings past the viewport');
assert.ok(styles.includes('overflow-wrap: anywhere !important'), 'mobile spectral headings wrap safely');

assert.ok(stars.includes("setAttribute('data-stars', 'mounted')"), 'starfield marks canvas-mounted state');
assert.ok(stars.includes("setAttribute('data-stars', 'fallback')"), 'starfield marks safe fallback when canvas init fails');
assert.ok(stars.includes('enablePerformanceMode'), 'adaptive starfield performance mode is preserved');
assert.ok(stars.includes('probeAbsoluteStart'), 'adaptive performance detector keeps checking beyond the first sample');
assert.ok(!siteInit.includes("data-stars', starsDisabled ? 'disabled' : 'enabled'"), 'remote visuals must not overwrite mounted canvas state with a generic enabled flag');
assert.ok(siteInit.includes("setAttribute('data-stars', 'mounted')"), 'runtime visuals preserve mounted state after config updates');

console.log('   OK: Homepage visual contract');
console.log('HOMEPAGE VISUAL CONTRACT COMPLETE');
