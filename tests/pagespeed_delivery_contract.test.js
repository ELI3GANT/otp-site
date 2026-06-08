/**
 * PageSpeed delivery guards: poster-first hero, deferred starfield, cache-friendly assets.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('PAGESPEED DELIVERY CONTRACT...');

const index = read('index.html');
const siteInit = read('site-init.js');
const stars = read('stars-v2.js');
const server = read('server.js');
const bookings = read('bookings.html');
const prodFullSweep = read('scripts/prod_full_sweep.js');

assert.ok(!index.includes('preconnect" href="https://assets.calendly.com"'), 'homepage avoids non-critical calendly preconnect');
assert.ok((index.match(/rel="preconnect"/g) || []).length <= 2, 'homepage keeps at most two preconnect hints');
assert.ok(index.includes('src="assets/otp-hero-poster-frame.png"'), 'homepage hero uses the stable optimized poster mark');
assert.ok(index.includes('class="hero-symbol-picture"'), 'homepage hero uses one picture-backed mark');
assert.ok(index.includes('class="hero-symbol-mark"'), 'homepage hero renders one primary symbol image');
assert.ok(!index.includes('src="assets/otp-hero-centered.gif"'), 'homepage avoids the edge-on spinning GIF as the primary hero mark');
assert.ok(!index.includes('data-hero-animated-src='), 'homepage hero does not require JS-driven animated source swapping');
assert.ok(!/class="[^"]*hero-eye-poster/.test(index), 'homepage hero avoids a separate poster layer');
assert.ok(!/class="[^"]*hero-eye-animated/.test(index), 'homepage hero avoids a separate animated layer');
assert.ok(!index.includes('preload" href="assets/otp-hero-centered.gif"'), 'homepage does not preload full hero gif as LCP');
assert.ok(bookings.includes('/assets/otp-hero-poster-frame.png'), 'bookings uses the stable optimized OTP mark');
assert.ok(!bookings.includes('/assets/otp-hero-centered.gif'), 'bookings avoids the edge-on spinning GIF as the primary header mark');
assert.ok(!bookings.includes('<img src="/assets/otp.gif"'), 'bookings does not render the heavy legacy GIF as its header logo');
assert.ok(prodFullSweep.includes('booking-animated-logo') && prodFullSweep.includes('/assets/otp-hero-centered.gif'), 'production sweep tracks optimized booking logo');
assert.ok(prodFullSweep.includes('booking-static-logo') && prodFullSweep.includes('/assets/otp-hero-poster-frame.png'), 'production sweep tracks reduced-motion booking logo fallback');
assert.ok(siteInit.includes('scheduleAfterFirstPaint'), 'non-critical motion defers until after first paint');
assert.ok(stars.includes('requestIdleCallback(bootStarfield'), 'starfield waits for idle before animating');
assert.ok(server.includes('inAssets ? 604800'), 'versioned static assets get week-long cache');
assert.ok(!read('portal.html').includes('content="index, follow"') || read('portal.html').includes('noindex'), 'portal stays noindex');

console.log('   OK: PageSpeed delivery contract');
console.log('PAGESPEED DELIVERY CONTRACT COMPLETE');
