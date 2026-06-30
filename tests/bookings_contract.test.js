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
const pricingConfig = require('../pricing-config.js');
const offerSystemKey = '20260610-offer-system-v1';

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
assert.match(server, /OTP received your request\. We’ll review the scope and reply with the cleanest next step\./);
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

assert.ok(html.includes('Start a Project with OTP.'), 'booking hero is direct and conversion-focused');
assert.ok(html.includes('OTP will route the work into The Signal, The Engine, or The System'), 'booking hero sets current package ladder expectations');
assert.ok(html.includes('official-brand-mark'), 'header keeps the official OTP site mark');
assert.ok(html.includes('/assets/otp-hero-poster-frame.png'), 'header uses the stable optimized OTP poster mark');
assert.ok(!html.includes('/assets/otp-hero-centered.gif'), 'header does not render the edge-on spinning GIF as the primary mark');
assert.ok(!html.includes('<img src="/assets/otp.gif"'), 'header does not load the oversized legacy GIF');
assert.ok(html.includes('otp-booking-sigil'), 'OTP Bookings sigil wrapper renders');
assert.ok(html.includes('booking-portal-sigil'), 'Bookings portal has its own sigil variant');
assert.ok(html.includes('otp-oracle-sigil'), 'OTP Oracle sigil variant renders');
assert.ok(html.includes('booking-glyph'), 'booking sigil uses a distinct portal glyph');
assert.ok(html.includes('oracle-glyph'), 'Oracle sigil uses a distinct eye/logic glyph');
assert.ok(html.includes('sigil-vector'), 'sigil includes inline SVG orbit lines');
assert.ok(!html.includes('class="otp-booking-sigil brand-sigil"'), 'header does not reuse the booking portal sigil');
assert.ok(!/<img[^>]+src="\/assets\/otp-logo-transparent\.png"/.test(html), 'portal sigils do not repeat the same OTP raster logo');
assert.ok(html.includes('Tell us the project'), 'client-facing booking flow starts with project details');
assert.ok(html.includes('OTP reviews'), 'client-facing booking flow explains review step');
assert.ok(html.includes('Best next step'), 'client-facing booking flow explains recommendation step');
assert.ok(html.includes('Proposal or portal'), 'client-facing booking flow explains portal/proposal step');
assert.ok(html.includes('Build starts'), 'client-facing booking flow explains delivery step');
assert.ok(html.includes('id="service-selector"'), 'service selector is visible before intake');
assert.ok(html.includes('Video / Content'), 'service selector includes video/content lane');
assert.ok(html.includes('Website / Digital System'), 'service selector includes website/digital lane');
assert.ok(html.includes('Brand Launch'), 'service selector includes brand launch lane');
assert.ok(html.includes('Fast Lane'), 'service selector includes fast lane lane');
assert.ok(html.includes('Custom Build'), 'service selector includes custom build lane');
assert.ok(html.includes('data-quick-service="Website / Digital System"'), 'website selector uses the public Website / Digital System value');
assert.ok(html.includes('data-quick-package="The System"'), 'custom selector routes into The System');
assert.ok(html.includes('service-card-badge') && html.includes('service-card-title') && html.includes('service-card-copy'), 'service selector cards use readable horizontal card structure');
assert.ok(!html.includes('<em>Best for'), 'service selector cards do not use weak italic descriptions');
assert.ok(html.indexOf('class="booking-shell"') < html.indexOf('id="packages"'), 'booking intake appears before deep package grids');
assert.ok(html.includes('package-selection-summary'), 'selected package summary is present');
assert.ok(html.includes('id="fast-lanes"'), 'Fast Lane section is visible on the bookings page');
assert.ok(html.includes('id="fast-lane-grid"'), 'Fast Lane card grid is present');
assert.ok(html.includes('Urgent work can still start cleanly.'), 'Fast Lane section remains visible after intake');
assert.ok(html.includes('Same-day reels, event promos, website cleanup, business packs, brand launch assets, and urgent client-flow fixes'), 'Fast Lane section explains the visible offer lanes');
assert.ok(html.includes('booking-mini-summary'), 'desktop booking mini-summary is present');
assert.ok(html.includes('Submit Booking Request'), 'final CTA is explicit');
assert.ok(html.includes('Not Sure Yet'), 'Oracle recommendation path is visible');
assert.ok(html.includes('otp_company_website'), 'booking honeypot is present');
assert.ok(html.includes('Email <span>Email or phone required</span>'), 'booking intake allows email or phone contact');
assert.ok(html.includes('Phone <span>Email or phone required</span>'), 'booking phone field is a valid contact route');
assert.ok(!/id="booking-email"[^>]+required/.test(html), 'email is not the only required contact field');
assert.ok(html.includes('private Client Portal link for documents, payment steps, and approvals'), 'private client portal copy is present');
assert.ok(html.includes('OTP received your request. We’ll review the scope and reply with the cleanest next step.'), 'success screen uses final OTP copy');
assert.ok(html.includes('OTP Oracle reviews your request and helps recommend the right package, documents, and next action.'), 'Oracle copy is grounded');
assert.ok(html.includes('rel="noopener noreferrer"'), 'external booking page links include safe rel attributes');
assert.ok(html.includes(`bookings.css?v=${offerSystemKey}`), 'booking stylesheet cache-bust matches offer system release');
assert.ok(html.includes(`bookings.js?v=${offerSystemKey}`), 'booking script cache-bust matches offer system release');
assert.ok(html.includes('project-intake-panel'), 'secure project intake bridge is visible');
assert.ok(html.includes('Need to send files or references?'), 'project intake section title is present');
assert.ok(html.includes('https://otp-os.vercel.app/bookings'), 'project intake CTA links to secure OTP OS intake');
assert.ok(html.includes('Open Secure Project Intake'), 'project intake button copy is explicit');
assert.ok(html.includes('This page starts the conversation'), 'bookings explains public intake role');
assert.ok(html.includes('next-steps-list'), 'what-happens-next list is visible near the intake form');
for (const field of [
    'preferred_contact_method',
    'project_type',
    'desired_deliverables',
    'location',
    'referral_source',
    'preferred_next_step',
    'contact_consent'
]) {
    assert.ok(html.includes(field), `${field} intake field is present in markup`);
}
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
assert.ok(/recommendation pending review/i.test(js), 'frontend handles partial success');
assert.ok(!js.includes('card.innerHTML'), 'package cards render with text nodes, not innerHTML');
assert.ok(!/innerHTML\s*=/.test(js), 'booking frontend does not assign unsafe HTML');
assert.ok(!/insertAdjacentHTML/.test(js), 'booking frontend does not inject adjacent HTML');
assert.ok(js.includes('makeBookingToken'), 'frontend sends a booking token for duplicate-friendly handling');
assert.ok(js.includes('otp_company_website'), 'frontend submits honeypot field');
assert.ok(js.includes('buildSourceTracking'), 'frontend captures sanitized source tracking');
assert.ok(js.includes('source_tracking: state.sourceTracking'), 'booking payload includes source tracking');
assert.ok(js.includes('platform:'), 'booking source tracking includes desktop/mobile platform');
assert.ok(js.includes('captured_at'), 'booking source tracking includes a timestamp');
assert.ok(js.includes('fastLanePackageFor'), 'booking frontend resolves fast lane package mapping');
assert.ok(js.includes('applyFastLaneServiceSelection'), 'fast lane service selections sync the package without skipping Step 1');
assert.ok(js.includes('preserveService'), 'manual package changes clear mismatched Fast Lane service state');
assert.ok(js.includes("els.service.value = ''"), 'mismatched fast lane service is cleared before payload build');
assert.ok(js.includes('fastLaneOffers'), 'booking frontend consumes Fast Lane offer objects');
assert.ok(js.includes('FAST_LANE_DETAILS'), 'booking frontend has visible Fast Lane card metadata');
assert.ok(js.includes('renderFastLanes'), 'booking frontend renders Fast Lane cards');
assert.ok(js.includes('selectFastLane'), 'Fast Lane cards can select service/package state');
assert.ok(js.includes('wireQuickSelectors'), 'service selector cards are wired to the existing intake state');
assert.ok(js.includes('selectQuickService'), 'service selector cards update service/package without changing payload shape');
assert.ok(js.includes('setSelectIfAvailable'), 'service selector cards only set supported select values');
assert.ok(js.includes('selected_fast_offer'), 'booking payload preserves the selected fast offer');
assert.ok(js.includes('fast_lane_package'), 'booking payload preserves the mapped fast lane package');
assert.ok(js.includes("missing.push('email or phone')"), 'frontend accepts either email or phone as contact');
assert.ok(js.includes('hasEmail && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(p.email)'), 'frontend only validates email format when email is provided');
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
assert.ok(js.includes('preferredContactMethods'), 'frontend exposes preferred contact options');
assert.ok(js.includes('projectTypes'), 'frontend exposes project type options');
assert.ok(js.includes('referralSources'), 'frontend exposes referral/source options');
assert.ok(js.includes('preferredNextSteps'), 'frontend exposes preferred next step options');
assert.ok(js.includes("return p.contact_consent ? [] : ['contact consent'];"), 'frontend requires contact consent before submit');
assert.ok(!js.includes('advance: true'), 'package card clicks must not auto-advance past Step 1');
assert.ok(js.includes("typeof value === 'object'"), 'frontend filters object string leaks');
assert.ok(js.includes('PACKAGE_THEMES'), 'dynamic package themes exist');
assert.ok(js.includes('applyActiveTheme'), 'selected package applies active theme');
assert.ok(js.includes('--active-accent'), 'active accent CSS variable is updated');
assert.ok(js.includes('The Signal is selected for focused creative work.'), 'Signal selection message exists');
assert.ok(js.includes('The Engine is selected for connected brand assets.'), 'Engine selection message exists');
assert.ok(js.includes('The System is selected for full creative/business structure.'), 'System selection message exists');
assert.ok(js.includes('Custom Build routes into The System or manual OTP scoping.'), 'Custom selection routes into System/manual scope');
assert.ok(js.includes('OTP Oracle reviews your request and helps recommend the right package, documents, and next action.'), 'Oracle default message persists after JS init');
assert.ok(js.includes('Sending booking request to OTP...'), 'submit loading copy stays client-facing');
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
