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
  !archiveHtml.includes('07 / 07 projects'),
  'Archive avoids public database counts'
);
const cardMatches = archiveHtml.match(/class="archive-case-study-card/g) || [];
assert.strictEqual(
  cardMatches.length,
  7,
  'archive.html contains exactly 7 pre-rendered static fallback project cards'
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
assert.ok(archiveHtml.includes('data-project-id="vault"'), 'archive.html static cards include VAULT');
assert.ok(archiveHtml.includes('Coming Soon'), 'archive.html labels VAULT as coming soon');

// 2. Real category URL normalization and history restoration.
const { JSDOM } = require('jsdom');
const dom = new JSDOM(archiveHtml, { url: 'https://www.onlytrueperspective.tech/archive?collection=Digital&search=weather&year=2026', runScripts: 'outside-only' });
dom.window.eval(read('otp-projects.js'));
dom.window.eval(archiveJs);
const document = dom.window.document;
assert.equal(dom.window.location.search, '?collection=Digital', 'removed filters cannot silently narrow projects');
assert.equal(document.querySelectorAll('[data-project-id]').length, 5);
const historyLength = dom.window.history.length;
document.querySelector('[data-archive-collection="Music / Campaigns"]').click();
assert.equal(dom.window.history.length, historyLength + 1, 'selection creates navigable history');
assert.equal(dom.window.location.search, '?collection=Music+%2F+Campaigns');
assert.equal(document.querySelectorAll('[data-project-id]').length, 2);
dom.window.history.replaceState({}, '', '/archive?collection=Video');
dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'));
assert.equal(document.querySelector('[data-archive-collection="Video"]').getAttribute('aria-pressed'), 'true');
assert.equal(document.querySelector('#motion').hidden, false);
assert.equal(document.querySelector('[data-archive-project-section]').hidden, true);
dom.window.close();

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
