/**
 * OTP Archive URL Sync, Static Fallback, and System Hardening Contract.
 * Validates history navigation, initial pre-rendered cards, URL query synchronization,
 * route aliases, honest quote state, and booking accessibility.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('OTP ARCHIVE URL SYNC & SYSTEM HARDENING CONTRACT...');

const archiveHtml = read('archive.html');
const archiveJs = read('archive.js');
const serverJs = read('server.js');
const vercelJson = read('vercel.json');
const quoteJs = read('quote.js');
const bookingsHtml = read('bookings.html');
const bookingsJs = read('bookings.js');

// 1. Static Fallback Cards & Pre-rendered markup
assert.ok(
  archiveHtml.includes('06 / 06 projects'),
  'archive.html pre-renders initial project count "06 / 06 projects"'
);
const cardMatches = archiveHtml.match(/class="archive-case-study-card/g) || [];
assert.strictEqual(
  cardMatches.length,
  6,
  'archive.html contains exactly 6 pre-rendered static fallback project cards'
);
assert.ok(
  archiveHtml.includes('data-project-id="weatheros"'),
  'archive.html static cards include WeatherOS'
);
assert.ok(
  archiveHtml.includes('data-project-id="otp-fixline"'),
  'archive.html static cards include FIXLINE'
);
assert.ok(
  archiveHtml.includes('data-project-id="song-wars"'),
  'archive.html static cards include Song Wars'
);

// 2. Archive URL Sync & History Semantics
assert.ok(
  archiveJs.includes('parseUrlParams'),
  'archive.js includes URL search parameter parser'
);
assert.ok(
  archiveJs.includes('buildCanonicalQueryString'),
  'archive.js builds canonical query string with deterministic key order'
);
assert.ok(
  archiveJs.includes('syncUrl'),
  'archive.js synchronizes state with browser history'
);
assert.ok(
  archiveJs.includes('history.pushState'),
  'archive.js uses pushState for deliberate filter changes'
);
assert.ok(
  archiveJs.includes('history.replaceState'),
  'archive.js uses replaceState for search typing / url normalization'
);
assert.ok(
  archiveJs.includes("addEventListener('popstate'"),
  'archive.js listens for popstate events to support browser back/forward navigation'
);
assert.ok(
  archiveJs.includes('searchDebounceTimer'),
  'archive.js debounces search input before synchronizing URL'
);

// 3. Routing and Aliases in server.js & vercel.json
assert.ok(
  serverJs.includes("'/website-design': 'website-design.html'"),
  'server.js includes static alias for /website-design'
);
assert.ok(
  serverJs.includes("'/weatheros-support.html'"),
  'server.js includes 308 redirect for /weatheros-support.html'
);
assert.ok(
  serverJs.includes("'/weatheros-privacy.html'"),
  'server.js includes 308 redirect for /weatheros-privacy.html'
);
assert.ok(
  vercelJson.includes('weatheros-support'),
  'vercel.json includes redirect for /weatheros-support'
);
assert.ok(
  vercelJson.includes('weatheros-privacy'),
  'vercel.json includes redirect for /weatheros-privacy'
);
assert.ok(
  vercelJson.includes('/website-design'),
  'vercel.json routes /website-design to /website-design.html'
);

// 4. Honest Quote & Checkout State
assert.ok(
  !quoteJs.includes('Deposit Confirmed!'),
  'quote.js does not display fake "Deposit Confirmed!" message when checkout is unavailable'
);
assert.ok(
  quoteJs.includes('Stripe Checkout Unavailable') || quoteJs.includes('Review in Client Portal'),
  'quote.js directs clients to Client Portal when Stripe checkout URL is absent'
);

// 5. Booking Form Accessibility
assert.ok(
  bookingsHtml.includes('for="booking-name"'),
  'bookings.html associates label with booking-name'
);
assert.ok(
  bookingsHtml.includes('for="booking-email"'),
  'bookings.html associates label with booking-email'
);
assert.ok(
  bookingsHtml.includes('for="booking-phone"'),
  'bookings.html associates label with booking-phone'
);
assert.ok(
  bookingsHtml.includes('for="booking-consent"'),
  'bookings.html associates label with booking-consent'
);
assert.ok(
  bookingsJs.includes('focusFirstInvalid'),
  'bookings.js moves focus to the first invalid field upon validation failure'
);
assert.ok(
  bookingsJs.includes("event.key === 'Enter'"),
  'bookings.js handles Enter key on form inputs without premature submission'
);

console.log('   OK: Archive URL Sync, Static Fallback & Hardening verified');
console.log('OTP ARCHIVE URL SYNC CONTRACT COMPLETE\n');
