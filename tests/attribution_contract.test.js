/**
 * Lead attribution capture + booking payload contract.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('ATTRIBUTION CONTRACT...');

const attribution = read('otp-attribution.js');
const bookingsJs = read('bookings.js');
const bookingsHtml = read('bookings.html');
const indexHtml = read('index.html');
const siteInit = read('site-init.js');
const server = read('server.js');

assert.ok(attribution.includes('otp_attribution_first'), 'stores first-touch attribution');
assert.ok(attribution.includes('otp_attribution_last'), 'stores last-touch attribution');
assert.ok(attribution.includes('getSourceTrackingPayload'), 'exposes submit payload helper');
assert.ok(attribution.includes('buildUrlWithAttribution'), 'exposes cross-domain URL helper');
assert.ok(attribution.includes('utm_campaign'), 'tracks campaign param');
assert.ok(attribution.includes('MAX_VALUE = 160'), 'bounds attribution values');
assert.ok(!attribution.includes('new Set(['), 'allowed attribution keys stay array-compatible for .some/.forEach runtime checks');

assert.ok(indexHtml.includes('otp-attribution.js?v=16.9.1'), 'homepage loads attribution helper');
assert.ok(siteInit.includes('OTPAttribution.captureOnLoad'), 'site-init captures attribution on load');
assert.ok(bookingsHtml.includes('otp-attribution.js?v=16.9.1'), 'bookings page loads attribution helper');
assert.ok(bookingsJs.includes('getAttributionTracking'), 'bookings uses stored attribution');
assert.ok(bookingsJs.includes('source_tracking:'), 'bookings payload includes source_tracking');
assert.ok(bookingsJs.includes('wireProjectIntakeAttribution'), 'bookings wires secure intake link');
assert.ok(bookingsJs.includes('buildUrlWithAttribution'), 'bookings appends attribution to OTP OS intake');

assert.ok(server.includes('sanitizeBookingAttributionValue'), 'server sanitizes attribution scalars');
assert.ok(server.includes('source_metadata'), 'server persists source_metadata in booking meta');
assert.ok(server.includes('attribution_first'), 'server accepts first-touch attribution');

const storage = new Map();
const context = {
  URL,
  Date,
  console,
  matchMedia: () => ({ matches: false }),
  location: {
    href: 'https://www.onlytrueperspective.tech/bookings?utm_source=instagram&utm_campaign=spring&cta_source=homepage',
    origin: 'https://www.onlytrueperspective.tech',
    pathname: '/bookings',
    search: '?utm_source=instagram&utm_campaign=spring&cta_source=homepage'
  },
  document: { referrer: 'https://instagram.com/' },
  localStorage: {
    getItem: (key) => storage.get(`local:${key}`) || null,
    setItem: (key, value) => storage.set(`local:${key}`, value)
  },
  sessionStorage: {
    getItem: (key) => storage.get(`session:${key}`) || null,
    setItem: (key, value) => storage.set(`session:${key}`, value)
  }
};
context.window = context;
context.globalThis = context;
vm.runInNewContext(attribution, context);
assert.doesNotThrow(() => context.OTPAttribution.captureOnLoad(), 'attribution capture does not throw on UTM URLs');
const tracking = context.OTPAttribution.getSourceTrackingPayload();
assert.equal(tracking.utm_source, 'instagram', 'source tracking preserves UTM source');
assert.equal(tracking.utm_campaign, 'spring', 'source tracking preserves UTM campaign');
assert.equal(tracking.cta_source, 'instagram', 'source tracking prefers captured UTM source');

console.log('   OK: Attribution contract');
console.log('ATTRIBUTION CONTRACT COMPLETE');
