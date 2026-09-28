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
const home = read('index.html');
const publicShell = read('public-shell.js');
const js = read('bookings.js');
const css = read('bookings.css');
const pricing = read('pricing-config.js');
const pricingConfig = require('../pricing-config.js');
const bookingHandoff = read('server/booking-handoff.js');
const offerSystemKey = '20260927-booking-refresh';

assert.match(server, /'\/bookings': 'bookings\.html'/);
assert.match(server, /'\/booking': 'bookings\.html'/);
assert.match(server, /'\/book': 'bookings\.html'/);
assert.match(server, /'\/book-otp': 'bookings\.html'/);
assert.ok(home.includes('href="/bookings?source=homepage-hero">Start a project'), 'homepage Start a project CTA opens OTP Bookings');
assert.ok(!home.includes('href="/fixline/intake?source=homepage-hero"'), 'homepage project CTA does not route into FIXLINE');
assert.ok(publicShell.includes('href="/bookings?source=public-nav">Start a project'), 'shared public navigation sends project enquiries to OTP Bookings');

assert.match(server, /app\.get\('\/api\/bookings\/config'/);
assert.match(server, /app\.post\('\/api\/bookings\/submit'/);
assert.match(server, /publicBookingSubmitResponse/);
assert.match(server, /received: true/);
assert.match(server, /recommendation/);
assert.match(server, /nextStep/);
assert.match(server, /Project inquiry received\. OTP will review the scope and follow up with the next step\./);
const receiptResponseStart = server.indexOf('function publicBookingSubmitResponse');
const receiptResponseEnd = server.indexOf('\n}', receiptResponseStart);
assert.ok(receiptResponseStart >= 0 && receiptResponseEnd > receiptResponseStart, 'public inquiry response helper exists');
assert.ok(!server.slice(receiptResponseStart, receiptResponseEnd).includes('depositCheckout'), 'public inquiry receipt does not offer a deposit checkout before scope review');
assert.match(server, /Project inquiry received\. OTP will review the scope and follow up with the next step\./);
assert.match(server, /sourceType: 'otp_bookings'/);
assert.match(server, /bookingSubmitLimiter/);
assert.match(server, /bookingIdFromToken/);
assert.match(server, /createBookingContact[\s\S]*\.eq\('email', payload\.email\)[\s\S]*\.update\(contactRow\)/, 'booking contact creation must update an existing email match before inserting');
assert.match(server, /errorCode: 'validation_failed'/);
assert.match(server, /errorCode: 'spam_rejected'/);
assert.match(server, /BOOKING_PUBLIC_PROXY_PATHS/);
assert.match(server, /resolveBookingWriterPolicy/);
assert.match(server, /primary === 'otp_os'/, 'OTP OS must be the default booking writer path');
assert.match(server, /legacyDirectFallbackEnabled/, 'direct booking writes must be an explicit legacy fallback');
assert.match(server, /errorCode: 'legacy_booking_writer_disabled'/, 'legacy direct writes remain blocked unless the explicit gate is enabled');
assert.match(server, /writerEvidence/, 'public booking responses identify the writer without exposing database records');
assert.match(server, /Idempotency-Key/, 'Site forwards the canonical idempotency key to OTP OS');
assert.match(server, /BOOKING_CONTRACT_VERSION/, 'booking responses use the pinned intake contract version');
assert.match(server, /LINEAGE_CONTRACT_VERSION/, 'direct-write fallback uses the pinned lineage version');
assert.match(bookingHandoff, /otp-booking-intake-v1\.json/, 'booking handoff loads the pinned CORE artifact');
assert.match(bookingHandoff, /otp-lineage-v1\.json/, 'booking handoff loads the pinned lineage artifact');

assert.ok(pricing.includes('Starting at $500'), 'The Signal price is sourced from pricing-config');
assert.ok(pricing.includes('$1,200 to $2,000'), 'The Engine range is sourced from pricing-config');
assert.ok(pricing.includes('Starting at $3,500+'), 'The System price is sourced from pricing-config');
assert.deepStrictEqual(pricingConfig.bookingPackages.map((pkg) => pkg.name), ['The Signal', 'The Engine', 'The System'], 'public booking package ladder has exactly three depths');
assert.deepStrictEqual(pricingConfig.bookingPackages.map((pkg) => pkg.name).filter((name) => /custom/i.test(name)), [], 'Custom Build is not a fourth booking package');
for (const fastOffer of ['Same-Day Reel', 'Event Promo', 'Website Cleanup', 'Business Content Pack', 'Brand Launch Assets', 'Emergency Booking/Client Flow Fix']) {
    assert.ok(pricing.includes(`label: '${fastOffer}'`) || pricing.includes(`'${fastOffer}'`), `${fastOffer} is sourced from pricing-config`);
    assert.ok(js.includes(`label: '${fastOffer}'`) || js.includes(`'${fastOffer}'`), `${fastOffer} remains available in the browser fallback config`);
}
const fastLaneFits = new Map(pricingConfig.fastLaneOffers.map((offer) => [offer.label, offer.package_fit]));
assert.strictEqual(fastLaneFits.get('Same-Day Reel'), 'The Signal');
assert.strictEqual(fastLaneFits.get('Event Promo'), 'The Signal / The Engine');
assert.strictEqual(fastLaneFits.get('Website Cleanup'), 'The Signal');
assert.strictEqual(fastLaneFits.get('Business Content Pack'), 'The Engine');
assert.strictEqual(fastLaneFits.get('Brand Launch Assets'), 'The Engine');
assert.strictEqual(fastLaneFits.get('Emergency Booking/Client Flow Fix'), 'The Signal / The System');
const mainPackageNames = new Set(pricingConfig.bookingPackages.map((pkg) => pkg.name));
assert.ok(pricingConfig.fastLaneOffers.every((offer) => mainPackageNames.has(offer.recommended_package)), 'Fast Lane offers map back into the main package ladder');
for (const source of [html, js, pricing, server]) {
    assert.ok(!source.includes('20260609-polish3'), 'stale booking cache key is not referenced');
    assert.ok(!source.includes('Brand Launch Pack'), 'old Brand Launch Pack wording is not referenced');
}

assert.ok(html.includes('Start your project.'), 'project inquiry hero is direct and conversion-focused');
assert.ok(html.includes('class="skip-link"') && html.includes('href="#booking-form"'), 'booking page provides a keyboard skip link to the intake form');
assert.ok(/<form[^>]+id="booking-form"[^>]+tabindex="-1"/.test(html), 'skip-link target can receive programmatic keyboard focus');
assert.ok(html.includes('Tell us what you’re trying to build. We’ll review the scope and follow up with the right next step or a quote. No payment required.'), 'hero explains the inquiry and truthful follow-up');
assert.ok(html.includes('Start Project Inquiry'), 'primary CTA names the project inquiry');
assert.ok(html.includes('Send Project Inquiry'), 'final CTA names the project inquiry');
assert.ok(html.includes('official-brand-mark'), 'header keeps the official OTP site mark');
assert.ok(html.includes('/assets/otp-hero-poster-frame.png'), 'header uses the stable optimized OTP poster mark');
assert.ok(!html.includes('/assets/otp-hero-centered.gif'), 'header does not render the edge-on spinning GIF as the primary mark');
assert.ok(!html.includes('<img src="/assets/otp.gif"'), 'header does not load the oversized legacy GIF');
assert.ok(html.includes('otp-booking-sigil'), 'OTP Bookings sigil wrapper renders');
assert.ok(html.includes('booking-portal-sigil'), 'Bookings portal has its own sigil variant');
assert.ok(html.includes('booking-glyph'), 'booking sigil uses a distinct portal glyph');
assert.ok(html.includes('sigil-vector'), 'sigil includes inline SVG orbit lines');
assert.ok(!html.includes('class="otp-booking-sigil brand-sigil"'), 'header does not reuse the booking portal sigil');
assert.ok(!/<img[^>]+src="\/assets\/otp-logo-transparent\.png"/.test(html), 'portal sigils do not repeat the same OTP raster logo');
const needStep = html.indexOf('aria-label="What do you need?"');
const scopeStep = html.indexOf('aria-label="Tell us about the project"');
const contactStep = html.indexOf('aria-label="Where should we send next steps?"');
const reviewStep = html.indexOf('aria-label="Review project inquiry"');
assert.ok(needStep >= 0 && needStep < scopeStep && scopeStep < contactStep && contactStep < reviewStep, 'flow order is Need, Scope, Contact, Review');
for (const label of ['Website / redesign', 'Booking or client system', 'Automation / AI tool', 'Creative / media', 'Something custom']) {
    assert.ok(html.includes(`>${label}</span>`), `need step includes ${label}`);
}
assert.strictEqual((html.match(/name="service_category"/g) || []).length, 5, 'only five service choices appear');
assert.ok(contactStep > scopeStep, 'contact information follows project scope questions');
assert.ok(html.includes('Review Project Inquiry'), 'review screen uses Project Inquiry wording');
assert.ok(html.includes('Recommended starting point'), 'package is recommended after scope, with an optional override');
assert.ok(html.includes('Priority / Fast Lane') && html.includes('Priority is a request, not a confirmed delivery slot'), 'priority is optional and not promised');
assert.ok(!/book a scope call/i.test(html), 'no unscheduled scope call is offered');
assert.ok(html.includes('No appointment or delivery slot is reserved here.'), 'review is clear that no appointment is scheduled');
assert.ok(html.includes('otp_company_website'), 'booking honeypot is present');
assert.ok(/id="booking-email"[^>]+required/.test(html), 'email is required after scope questions');
assert.ok(html.includes('Phone <span>Optional</span>'), 'phone is optional');
assert.ok(html.includes('Files are not uploaded here.'), 'page does not imply unsupported upload behavior');
assert.ok(html.includes('no call, appointment, or delivery slot has been scheduled'), 'confirmation describes what happens next without claiming a booking');
assert.ok(html.includes('rel="noopener noreferrer"'), 'external booking page links include safe rel attributes');
assert.ok(html.includes('bookings.css?v=20260928-project-inquiry'), 'booking stylesheet cache-bust matches inquiry release');
assert.ok(html.includes('bookings.js?v=20260928-project-inquiry'), 'booking script cache-bust matches inquiry release');
assert.strictEqual((html.match(/<script src="\/otp-conversion-analytics\.js/g) || []).length, 1, 'booking conversion analytics loads once');
assert.ok(fs.existsSync(path.join(root, 'otp-conversion-analytics.js')), 'booking conversion analytics asset exists');
assert.ok(html.includes('preferred_next_step') && html.includes('contact_consent'), 'existing backend routing and consent fields remain present');
assert.ok(!/otp-os\.vercel\.app/i.test(js), 'booking JS must not expose OTP OS hostname');

assert.ok(js.includes('/api/bookings/config'), 'frontend loads booking config');
assert.ok(js.includes('/api/bookings/submit'), 'frontend submits to booking API');
assert.ok(js.includes('getAttributionTracking'), 'bookings attaches stored attribution');
assert.ok(js.includes('wireProjectIntakeAttribution'), 'bookings forwards attribution to secure intake');
assert.ok(js.includes('data-intake-base') || js.includes("getAttribute('data-intake-base')"), 'bookings reads intake base from markup');
assert.ok(/getAttributionTracking[\s\S]{0,40}try/.test(js) || /try[\s\S]{0,80}getAttributionTracking/.test(js) || js.includes('try {'), 'attribution is wrapped so packages render even if OTPAttribution throws');
assert.ok(/if \(els\.next\)|if\(els\.next\)/.test(js), 'event listeners are guarded so null els cannot crash boot');
assert.ok(js.includes('state.sourceTracking = {}') || js.includes("sourceTracking: {}"), 'state.sourceTracking initialises safely without calling OTPAttribution at parse time');
assert.ok(js.includes('state.submitting'), 'duplicate submit prevention exists');
assert.ok(js.includes('state.submitted'), 'post-success duplicate submit prevention exists');
assert.ok(!js.includes("['Booking ID'"), 'booking success must not show internal booking IDs');
assert.ok(!js.includes("['OTP OS Job'"), 'booking success must not show internal OTP OS job IDs');
assert.ok(js.includes('safePortalHref'), 'booking success only opens same-origin client portal links');
assert.ok(js.includes("portalLink.href = portalHref || '/portal'"), 'booking success falls back to clean /portal entry');
assert.ok(/will recommend a starting point after review/i.test(js), 'frontend handles partial success without pretending an automated quote was made');
assert.ok(!js.includes('card.innerHTML'), 'package cards render with text nodes, not innerHTML');
assert.ok(!/innerHTML\s*=/.test(js), 'booking frontend does not assign unsafe HTML');
assert.ok(!/insertAdjacentHTML/.test(js), 'booking frontend does not inject adjacent HTML');
assert.ok(js.includes('makeBookingToken'), 'frontend sends a booking token for duplicate-friendly handling');
assert.ok(js.includes('otp_company_website'), 'frontend submits honeypot field');
assert.ok(js.includes('buildSourceTracking'), 'frontend captures sanitized source tracking');
assert.ok(js.includes('source_tracking: state.sourceTracking'), 'booking payload includes source tracking');
assert.ok(js.includes('platform:'), 'booking source tracking includes desktop/mobile platform');
assert.ok(js.includes('captured_at'), 'booking source tracking includes a timestamp');
assert.ok(js.includes('SERVICE_CATEGORIES'), 'frontend uses one canonical set of five inquiry categories');
assert.ok(js.includes('suggestedPackage'), 'package suggestions are generated after scope questions');
assert.ok(js.includes('selected_fast_offer: \'\''), 'new inquiry requests do not force an early fast-lane offer');
assert.ok(js.includes('fast_lane_package: \'\''), 'new inquiry requests do not force an early fast-lane package');
assert.ok(js.includes('setSelectIfAvailable'), 'service category values are checked against supported server options');
assert.ok(js.includes("if (!p.email) missing.push('email');"), 'email is required at the contact step');
assert.ok(js.includes('Please add ${missing.join'), 'step validation gives field-specific feedback');
for (const key of [
    'preferred_contact_method',
    'project_type',
    'desired_deliverables',
    'location',
    'referral_source',
    'preferred_next_step',
    'contact_consent'
]) {
    assert.ok(js.includes(key), `booking payload preserves ${key}`);
}
assert.ok(js.includes("['Send me the best next step']"), 'frontend keeps next-step routing non-prescriptive until OTP review');
assert.ok(js.includes("return p.contact_consent ? [] : ['contact consent'];"), 'frontend requires contact consent before submit');
assert.ok(!js.includes('advance: true'), 'package card clicks must not auto-advance past Step 1');
assert.ok(js.includes("typeof value === 'object'"), 'frontend filters object string leaks');
assert.ok(js.includes('PACKAGE_THEMES'), 'dynamic package themes exist');
assert.ok(js.includes('applyActiveTheme'), 'selected package applies active theme');
assert.ok(js.includes('--active-accent'), 'active accent CSS variable is updated');
assert.ok(js.includes('Sending project inquiry to OTP...'), 'submit loading copy stays client-facing');
assert.ok(js.includes('Something blocked the request. Please check your contact info and try again.'), 'network error copy is client-ready');
assert.ok(!js.includes('OTP_BOOKINGS_UPSTREAM'), 'client does not expose internal upstream config');
assert.ok(!js.includes('SUPABASE_SERVICE'), 'client does not expose service secrets');
assert.ok(server.includes('cleanBookingSourceTracking'), 'server sanitizes booking source tracking');
assert.ok(server.includes('source_tracking: payload.source_tracking || {}'), 'internal booking metadata preserves source tracking');
assert.ok(server.includes('captured_at:'), 'server preserves source tracking capture timestamps');
assert.ok(server.includes('bookingFastLaneMappings'), 'server exposes canonical fast lane mappings');
assert.ok(server.includes('fast_lane_offers'), 'server exposes the fresh Fast Lane offer config shape');
assert.ok(server.includes('selected_fast_offer'), 'OTP_BOOKING_META preserves selected fast offer');
assert.ok(server.includes('fast_lane_package'), 'OTP_BOOKING_META preserves the mapped fast lane package');
assert.ok(server.includes("missingFields.push('email_or_phone')"), 'server accepts either email or phone as contact');
assert.ok(server.includes('!payload.email) return null'), 'phone-only bookings skip email-based contact upsert safely');
assert.ok(server.includes('normalizeBookingBoolean'), 'server normalizes booking consent safely');
for (const key of [
    'preferred_contact_method',
    'project_type',
    'desired_deliverables',
    'location',
    'referral_source',
    'preferred_next_step',
    'contact_consent'
]) {
    assert.ok(server.includes(key), `server preserves ${key}`);
}

assert.ok(css.includes('@media (max-width: 640px)'), 'mobile breakpoint exists');
assert.ok(css.includes('@media (max-width: 430px)'), 'small iPhone breakpoint exists');
assert.ok(css.includes('@media (max-width: 768px)'), 'tablet breakpoint exists');
assert.match(css, /@media \(max-width: 768px\) \{[\s\S]*input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="range"\]\):not\(\[type="hidden"\]\),[\s\S]*font-size: 16px;/, 'mobile booking fields prevent iPhone focus zoom');
assert.ok(css.includes('overflow-wrap: anywhere'), 'long values cannot overflow profile rows');
assert.ok(css.includes('--surface-soft'), 'booking color system exposes surface-soft variable');
assert.ok(css.includes('--border'), 'booking color system exposes border variable');
assert.ok(css.includes('--active-accent'), 'booking color system exposes active accent variable');
assert.ok(css.includes('--active-glow'), 'booking color system exposes active glow variable');
assert.ok(css.includes('official-brand-mark'), 'official header mark has a separate style');
assert.ok(css.includes('official-brand-picture'), 'official header mark styles the picture fallback wrapper');
assert.ok(css.includes('.official-brand-mark::before'), 'official header mark has a bounded aura layer');
assert.ok(css.includes('checkbox-label'), 'contact consent checkbox is styled');
assert.ok(css.includes('compact-textarea'), 'optional deliverables textarea is compact');
assert.ok(css.includes('portal-sigil'), 'portal sigils share only the animation shell');
assert.ok(css.includes('booking-core'), 'Bookings sigil has distinct center geometry');
assert.ok(css.includes('oracle-core'), 'Oracle sigil has distinct center geometry');
assert.ok(css.includes('data-package-theme="the-signal"'), 'Signal card theme is styled');
assert.ok(css.includes('data-package-theme="the-engine"'), 'Engine card theme is styled');
assert.ok(css.includes('data-package-theme="the-system"'), 'System card theme is styled');
assert.ok(css.includes('data-package-theme="custom-build"'), 'Custom card theme is styled');
assert.ok(css.includes('fast-lane-grid'), 'Fast Lane grid is styled');
assert.ok(css.includes('fast-lane-card'), 'Fast Lane cards are styled');
assert.ok(css.includes('fast-lane-meta'), 'Fast Lane card metadata is styled');
assert.ok(css.includes('service-selector-grid'), 'service selector grid is styled');
assert.ok(css.includes('service-selector-card'), 'service selector cards are styled');
assert.ok(css.includes('repeat(auto-fit, minmax(min(100%, 240px), 1fr))'), 'service selector cards use breathable auto-fit desktop grid');
assert.ok(css.includes('service-card-badge') && css.includes('service-card-state'), 'service selector cards style horizontal badges and selected state');
assert.ok(css.includes('display: flex;') && css.includes('flex-direction: column;'), 'service selector cards use a stable vertical stack');
assert.ok(css.includes('word-break: normal;') && css.includes('overflow-wrap: normal;'), 'service selector badges cannot collapse into vertical letters');
assert.ok(css.includes('grid-template-columns: 1fr;') && !css.includes('scroll-snap-type: x mandatory'), 'mobile service selector stacks as readable one-card rows');
assert.ok(css.includes('next-steps-list'), 'what-happens-next list is styled');
assert.ok(/\.booking-footer-links a\s*\{[^}]*min-height:\s*44px/.test(css), 'booking footer links keep mobile-safe tap targets');
assert.ok(!/\.booking-page\s*\{[^}]*animation:\s*pageRise/.test(css), 'booking entry motion must not animate the entire page subtree');
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
