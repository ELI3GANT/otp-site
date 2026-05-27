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

assert.ok(!index.includes('preconnect" href="https://assets.calendly.com"'), 'homepage avoids non-critical calendly preconnect');
assert.ok((index.match(/rel="preconnect"/g) || []).length <= 2, 'homepage keeps at most two preconnect hints');
assert.ok(!index.includes('data-hero-animated-src="assets/otp-hero-centered.gif"'), 'homepage hero gif is disabled for stability');
assert.ok(index.includes('hero-eye-poster'), 'hero poster layer keeps gif off critical LCP path');
assert.ok(!/class="[^"]*hero-eye-animated/.test(index), 'homepage does not render an animated hero layer');
assert.ok(!index.includes('preload" href="assets/otp-hero-centered.gif"'), 'homepage does not preload full hero gif as LCP');
assert.ok(siteInit.includes('scheduleAfterFirstPaint'), 'non-critical motion defers until after first paint');
assert.ok(stars.includes('requestIdleCallback(bootStarfield'), 'starfield waits for idle before animating');
assert.ok(server.includes('inAssets ? 604800'), 'versioned static assets get week-long cache');
assert.ok(!read('portal.html').includes('content="index, follow"') || read('portal.html').includes('noindex'), 'portal stays noindex');

console.log('   OK: PageSpeed delivery contract');
console.log('PAGESPEED DELIVERY CONTRACT COMPLETE');
