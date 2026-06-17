/**
 * OTP Bookings contract (static).
 * Guards the public booking portal, package source of truth, and API response shape.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('OTP BOOKINGS CONTRACT...');

const server = read('server.js');
const html = read('bookings.html');
const js = read('bookings.js');
const css = read('bookings.css');
const pricing = read('pricing-config.js');

assert.match(server, /'\/bookings': 'bookings\.html'/);
assert.match(server, /'\/booking': 'bookings\.html'/);
assert.match(server, /'\/book': 'bookings\.html'/);
assert.match(server, /'\/book-otp': 'bookings\.html'/);

assert.match(server, /app\.get\('\/api\/bookings\/config'/);
assert.match(server, /app\.post\('\/api\/bookings\/submit'/);
assert.match(server, /publicBookingSubmitResponse/);
assert.match(server, /received: true/);
assert.match(server, /recommendation/);
assert.match(server, /nextStep/);
assert.match(server, /Booking received\. OTP Oracle recommendation is pending review/);
assert.match(server, /sourceType: 'otp_bookings'/);
assert.match(server, /bookingSubmitLimiter/);
assert.match(server, /bookingIdFromToken/);
assert.match(server, /createBookingContact[\s\S]*\.eq\('email', payload\.email\)[\s\S]*\.update\(contactRow\)/, 'booking contact creation must update an existing email match before inserting');
assert.match(server, /errorCode: 'validation_failed'/);
assert.match(server, /errorCode: 'spam_rejected'/);
assert.match(server, /BOOKING_PUBLIC_PROXY_PATHS/);

assert.ok(pricing.includes('Starting at $500'), 'The Signal price is sourced from pricing-config');
assert.ok(pricing.includes('$1,200 to $2,000'), 'The Engine range is sourced from pricing-config');
assert.ok(pricing.includes('Starting at $3,500+'), 'The System price is sourced from pricing-config');
assert.ok(pricing.includes('Custom Build'), 'Custom Build label is sourced from pricing-config');

assert.ok(html.includes('Creative systems for brands, artists, and businesses ready to look official.'), 'booking hero is upgraded');
assert.ok(html.includes('OTP Bookings'), 'booking hero label is visible');
assert.ok(html.includes('official-brand-mark'), 'header keeps the official OTP site mark');
assert.ok(html.includes('/assets/otp.gif'), 'header uses the original OTP site logo asset');
assert.ok(html.includes('otp-booking-sigil'), 'OTP Bookings sigil wrapper renders');
assert.ok(html.includes('booking-portal-sigil'), 'Bookings portal has its own sigil variant');
assert.ok(html.includes('otp-oracle-sigil'), 'OTP Oracle sigil variant renders');
assert.ok(html.includes('booking-glyph'), 'booking sigil uses a distinct portal glyph');
assert.ok(html.includes('oracle-glyph'), 'Oracle sigil uses a distinct eye/logic glyph');
assert.ok(html.includes('sigil-vector'), 'sigil includes inline SVG orbit lines');
assert.ok(!html.includes('class="otp-booking-sigil brand-sigil"'), 'header does not reuse the booking portal sigil');
assert.ok(!/<img[^>]+src="\/assets\/otp-logo-transparent\.png"/.test(html), 'portal sigils do not repeat the same OTP raster logo');
assert.ok(html.includes('Project Profile'), 'connected journey is visible without OTP OS product language');
assert.ok(!html.includes('OTP OS Profile'), 'public booking page must not expose OTP OS profile language');
assert.ok(html.includes('Oracle'), 'Oracle flow chip is visible');
assert.ok(html.includes('Documents'), 'Documents flow chip is visible');
assert.ok(html.includes('Payment'), 'Payment flow chip is visible');
assert.ok(html.includes('Client Portal'), 'Client Portal CTA/flow label is visible');
assert.ok(html.includes('https://www.reddit.com/r/OnlyTruePerspective'), 'Official Reddit link is present in booking footer');
assert.ok(!html.includes('business operating system'), 'booking footer must not market OTP OS as a public product');
assert.ok(html.includes('package-selection-summary'), 'selected package summary is present');
assert.ok(html.includes('booking-mini-summary'), 'desktop booking mini-summary is present');
assert.ok(html.includes('Submit Booking Request'), 'final CTA is explicit');
assert.ok(html.includes('Not Sure Yet'), 'Oracle recommendation path is visible');
assert.ok(html.includes('otp_company_website'), 'booking honeypot is present');
assert.ok(html.includes('private OTP Client Portal link where you can view project status, documents, payment steps, and approvals'), 'private client portal copy is present');
assert.ok(html.includes('Your request is in. OTP will review the scope and prepare the cleanest next step.'), 'success screen uses final OTP copy');
assert.ok(html.includes('OTP Oracle reviews your request and helps recommend the right package, documents, and next action.'), 'Oracle copy is grounded');
assert.ok(html.includes('rel="noopener noreferrer"'), 'external booking page links include safe rel attributes');

assert.ok(js.includes('/api/bookings/config'), 'frontend loads booking config');
assert.ok(js.includes('/api/bookings/submit'), 'frontend submits to booking API');
assert.ok(js.includes('Saving booking request for OTP review'), 'booking submit status avoids internal OTP OS wording');
assert.ok(js.includes('state.submitting'), 'duplicate submit prevention exists');
assert.ok(js.includes('state.submitted'), 'post-success duplicate submit prevention exists');
assert.ok(!js.includes("['Booking ID'"), 'booking success must not show internal booking IDs');
assert.ok(!js.includes("['OTP OS Job'"), 'booking success must not show internal OTP OS job IDs');
assert.ok(!js.includes('Saving booking request into OTP OS'), 'booking status must not expose OTP OS wording');
assert.ok(js.includes('safePortalHref'), 'booking success only opens same-origin client portal links');
assert.ok(js.includes("portalLink.href = portalHref || '/portal'"), 'booking success falls back to clean /portal entry');
assert.ok(/recommendation pending review/i.test(js), 'frontend handles partial success');
assert.ok(!js.includes('card.innerHTML'), 'package cards render with text nodes, not innerHTML');
assert.ok(!/innerHTML\s*=/.test(js), 'booking frontend does not assign unsafe HTML');
assert.ok(!/insertAdjacentHTML/.test(js), 'booking frontend does not inject adjacent HTML');
assert.ok(js.includes('makeBookingToken'), 'frontend sends a booking token for duplicate-friendly handling');
assert.ok(js.includes('otp_company_website'), 'frontend submits honeypot field');
assert.ok(js.includes("typeof value === 'object'"), 'frontend filters object string leaks');
assert.ok(js.includes('PACKAGE_THEMES'), 'dynamic package themes exist');
assert.ok(js.includes('applyActiveTheme'), 'selected package applies active theme');
assert.ok(js.includes('--active-accent'), 'active accent CSS variable is updated');
assert.ok(js.includes('The Signal is selected for focused creative work.'), 'Signal selection message exists');
assert.ok(js.includes('The Engine is selected for connected brand assets.'), 'Engine selection message exists');
assert.ok(js.includes('The System is selected for full creative/business structure.'), 'System selection message exists');
assert.ok(js.includes('Custom Build is selected for a scoped custom project.'), 'Custom selection message exists');
assert.ok(js.includes('OTP Oracle reviews your request and helps recommend the right package, documents, and next action.'), 'Oracle default message persists after JS init');
assert.ok(!js.includes('OTP_BOOKINGS_UPSTREAM'), 'client does not expose internal upstream config');
assert.ok(!js.includes('SUPABASE_SERVICE'), 'client does not expose service secrets');

assert.ok(css.includes('@media (max-width: 640px)'), 'mobile breakpoint exists');
assert.ok(css.includes('@media (max-width: 430px)'), 'small iPhone breakpoint exists');
assert.ok(css.includes('@media (max-width: 768px)'), 'tablet breakpoint exists');
assert.ok(css.includes('overflow-wrap: anywhere'), 'long values cannot overflow profile rows');
assert.ok(css.includes('--surface-soft'), 'booking color system exposes surface-soft variable');
assert.ok(css.includes('--border'), 'booking color system exposes border variable');
assert.ok(css.includes('--active-accent'), 'booking color system exposes active accent variable');
assert.ok(css.includes('--active-glow'), 'booking color system exposes active glow variable');
assert.ok(css.includes('official-brand-mark'), 'official header mark has a separate style');
assert.ok(css.includes('portal-sigil'), 'portal sigils share only the animation shell');
assert.ok(css.includes('booking-core'), 'Bookings sigil has distinct center geometry');
assert.ok(css.includes('oracle-core'), 'Oracle sigil has distinct center geometry');
assert.ok(css.includes('data-package-theme="the-signal"'), 'Signal card theme is styled');
assert.ok(css.includes('data-package-theme="the-engine"'), 'Engine card theme is styled');
assert.ok(css.includes('data-package-theme="the-system"'), 'System card theme is styled');
assert.ok(css.includes('data-package-theme="custom-build"'), 'Custom card theme is styled');
assert.ok(css.includes('otpStarDrift'), 'animated star field is present');
assert.ok(css.includes('otpOrbitalShift'), 'animated orbital glow is present');
assert.ok(css.includes('sigilBreath'), 'sigil glow animation is present');
assert.ok(css.includes('sigilOrbit'), 'sigil orbit animation is present');
assert.ok(css.includes('sigilScan'), 'sigil scan animation is present');
assert.ok(css.includes('oracleHalo'), 'Oracle halo animation is present');
assert.ok(css.includes('pointer-events: none'), 'sigil decoration cannot block clicks');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced motion is respected');
assert.ok(css.includes('env(safe-area-inset-bottom'), 'mobile safe-area padding exists');
assert.ok(css.includes('overflow-x: hidden'), 'page guards against horizontal overflow');

console.log('   OK: OTP Bookings contract');
console.log('OTP BOOKINGS CONTRACT COMPLETE');
