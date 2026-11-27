const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('OTP LAUNCH STOREFRONT CONTRACT...');

const launchHtml = read('launch.html');
const bookingsJs = read('bookings.js');
const proposalHtml = read('proposal.html');
const serverJs = read('server.js');
const vercelJson = JSON.parse(read('vercel.json'));
const catalog = require('../launch-catalog.js');

// 1. Catalog completeness and pricing approval invariant
assert.equal(catalog.SERVICES.length, 9, 'All 9 core OTP LAUNCH catalog offerings are present');
const starter = catalog.findService('starter-website');
assert.equal(starter.fixedPriceCents, 19900);
assert.equal(starter.checkoutEligible, true);
assert.equal(starter.ownerApprovalRequired, false);

for (const svc of catalog.SERVICES) {
  if (svc.id === 'starter-website') continue;
  assert.equal(svc.ownerApprovalRequired, true, `${svc.id} pricing requires owner approval`);
  assert.equal(svc.checkoutEligible, false, `${svc.id} cannot bypass owner approval`);
}

// 2. Storefront /launch renders catalog, accessible custom service selector & configurator cleanly in JSDOM
const dom = new JSDOM(launchHtml, { url: 'https://www.onlytrueperspective.tech/launch', runScripts: 'outside-only' });
const mediaManifest = require('../launch-media-manifest.js');
dom.window.OTP_LAUNCH_CATALOG = catalog;
dom.window.OTP_LAUNCH_MEDIA = mediaManifest;
dom.window.eval(read('launch-context.js'));
dom.window.eval(read('launch-proof-components.js'));
dom.window.eval(read('launch.js'));

const cards = dom.window.document.querySelectorAll('.launch-service-card');
assert.equal(cards.length, 9, 'Storefront renders all 9 service cards');
assert.ok(dom.window.document.getElementById('lc-summary-price').textContent.includes('$199'));
assert.equal(dom.window.document.getElementById('lc-checkout-btn').disabled, false, 'Pure $199 starter enables checkout button');

// Independent card accordion test: expanding one card leaves all 8 others collapsed with accurate aria-expanded
const t1 = dom.window.document.getElementById('lc-card-toggle-starter-website');
const t2 = dom.window.document.getElementById('lc-card-toggle-artist-epk');
assert.equal(t1.getAttribute('aria-expanded'), 'false');
assert.equal(t2.getAttribute('aria-expanded'), 'false');
t1.click();
assert.equal(t1.getAttribute('aria-expanded'), 'true', 'Clicked service card expands');
assert.equal(t2.getAttribute('aria-expanded'), 'false', 'Sibling card stays collapsed independently');
assert.equal(dom.window.document.querySelectorAll('.launch-card-details.is-expanded').length, 1);

// Accessible custom service combobox selector checks
const combo = dom.window.document.getElementById('lc-service-trigger');
assert.ok(combo && combo.getAttribute('role') === 'combobox', 'Accessible custom combobox replaces native select visually');
const opts = dom.window.document.querySelectorAll('#lc-service-listbox [role="option"]');
assert.equal(opts.length, 9, 'Custom service selector renders all 9 service options');
for (const opt of opts) {
  assert.ok(!/owner approved/i.test(opt.textContent || ''), 'Selector options avoid repetitive Owner approved text');
}
// Keyboard ArrowDown + Enter selects second option (artist-epk) and disables fixed $199 checkout
combo.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
combo.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
combo.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
assert.equal(dom.window.document.getElementById('lc-service').value, 'artist-epk', 'Keyboard navigation switches active service');
assert.equal(dom.window.document.getElementById('lc-checkout-btn').disabled, true, 'Switching via keyboard disables fixed checkout');

// Bidirectional context persists contact, objectives, features, and idempotent booking_token
dom.window.document.getElementById('lc-name').value = 'Maya Lin';
dom.window.document.getElementById('lc-email').value = 'maya@studio.example';
dom.window.document.getElementById('launch-configurator-form').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
const savedCtx = dom.window.OTP_LAUNCH_CONTEXT.load();
assert.equal(savedCtx.service_id, 'artist-epk');
assert.equal(savedCtx.name, 'Maya Lin');
assert.equal(savedCtx.email, 'maya@studio.example');
assert.ok(savedCtx.booking_token && savedCtx.booking_token.startsWith('LAUNCH-'), 'Session maintains unified idempotent token');
const firstCheckoutAttempt = dom.window.OTP_LAUNCH_CONTEXT.getOrCreateCheckoutAttemptId(savedCtx.booking_token);
assert.equal(firstCheckoutAttempt, savedCtx.booking_token, 'First checkout retains the legacy idempotency key for in-flight sessions');
assert.equal(dom.window.OTP_LAUNCH_CONTEXT.getOrCreateCheckoutAttemptId(), firstCheckoutAttempt, 'Checkout attempt stays stable across reloads until the customer retries');

// Programmatic change to custom-web-app continues to sync cleanly
dom.window.document.getElementById('lc-service').value = 'custom-web-app';
dom.window.document.getElementById('lc-service').dispatchEvent(new dom.window.Event('change'));
assert.equal(dom.window.document.getElementById('lc-checkout-btn').disabled, true, 'Custom web app requires owner approval before checkout');
assert.ok(combo.textContent.includes('Custom Web Applications'), 'Combobox trigger stays synchronized on programmatic select change');
// Authoritative order review opens cleanly before Stripe redirect & checkout status route exists
assert.ok(serverJs.includes("app.get('/api/launch/checkout/status'"), 'server.js exposes authoritative checkout status proxy');
dom.window.document.getElementById('lc-service').value = 'starter-website';
dom.window.document.getElementById('lc-service').dispatchEvent(new dom.window.Event('change'));
dom.window.document.getElementById('lc-email').value = 'buyer@studio.example';
dom.window.document.getElementById('lc-checkout-btn').click();
const reviewDialog = dom.window.document.getElementById('lc-order-review-modal');
assert.ok(reviewDialog, 'Order review modal opens before checkout');
assert.ok(reviewDialog.textContent.includes('$199') && reviewDialog.textContent.includes('$0'), 'Order review displays due today and remaining balance');
assert.ok(reviewDialog.textContent.includes('Apple Pay'), 'Order review mentions supported digital wallets');
dom.window.close();

// Expired checkout recovery rotates only the payment attempt idempotency token.
const retryDom = new JSDOM(launchHtml, { url: 'https://www.onlytrueperspective.tech/launch?checkout=expired', runScripts: 'outside-only' });
retryDom.window.HTMLElement.prototype.scrollIntoView = function () {};
retryDom.window.OTP_LAUNCH_CATALOG = catalog;
retryDom.window.OTP_LAUNCH_MEDIA = mediaManifest;
retryDom.window.eval(read('launch-context.js'));
retryDom.window.eval(read('launch-proof-components.js'));
retryDom.window.eval(read('launch.js'));
const initialAttempt = retryDom.window.OTP_LAUNCH_CONTEXT.load().checkout_attempt_id;
const retryButton = [...retryDom.window.document.querySelectorAll('button')].find((button) => button.textContent.includes('Review & Retry Checkout'));
assert.ok(retryButton, 'Expired checkout offers a retry action');
retryButton.click();
const retryAttempt = retryDom.window.OTP_LAUNCH_CONTEXT.load().checkout_attempt_id;
assert.notEqual(retryAttempt, initialAttempt, 'Retry creates a fresh checkout idempotency key');
assert.equal(retryDom.window.OTP_LAUNCH_CONTEXT.load().booking_token, initialAttempt, 'Retry preserves the original booking identity');
retryDom.window.close();

// 3. Private proposal page enforces noindex + no-referrer
assert.ok(proposalHtml.includes('noindex, nofollow'), 'proposal.html stays private from search indexing');
assert.ok(proposalHtml.includes('no-referrer'), 'proposal.html strips referrers');

// 4. Server & Vercel wiring
assert.ok(serverJs.includes("app.get(['/launch', '/launch/']"), 'server.js serves /launch');
assert.ok(serverJs.includes("app.get('/api/launch/catalog'"), 'server.js exposes /api/launch/catalog');
assert.ok(serverJs.includes("app.post('/api/launch/submit'"), 'server.js exposes /api/launch/submit');
assert.ok(serverJs.includes("app.post('/api/launch/checkout'"), 'server.js exposes /api/launch/checkout');
assert.ok(vercelJson.routes.some((r) => r.src === '^/launch/?$'), 'vercel.json routes /launch');
assert.ok(vercelJson.git && vercelJson.git.deploymentEnabled === false, 'automatic Git deployment remains disabled');

console.log('   OK: OTP LAUNCH storefront contract');

// 5. V1.2 Unified Conversion Context & Start a Project <-> Launch Bridges
const launchContext = require('../launch-context.js');
const bookingsHtml = read('bookings.html');
const indexHtml = read('index.html');
assert.equal(launchContext.mapBookingServiceToLaunch('Website Cleanup'), 'redesign-repair');
assert.equal(launchContext.mapBookingServiceToLaunch('Music / Artist Rollout'), 'artist-epk');
assert.equal(launchContext.mapBookingServiceToLaunch('Business System'), 'custom-web-app');
assert.ok(launchHtml.includes('id="lc-consult-btn"'), 'Launch exposes direct consultation booking CTA');
assert.ok(launchHtml.includes('Need help planning your project?'), 'Launch shows complementary planning consultation prompt');
assert.ok(launchHtml.includes('Request a planning call'), 'Launch consultation CTA describes the inquiry before a time is confirmed');
assert.ok(launchHtml.includes('Request a consultation and receive confirmation.'), 'Launch consultation pathway does not promise live availability');
assert.ok(!launchHtml.includes('Live founder availability &amp; timezone sync'), 'Launch does not claim a live appointment scheduler that is not present');
assert.ok(launchHtml.includes('mode=consultation'), 'Launch consultation handoff carries its consultation mode to the intake route');
assert.ok(bookingsJs.includes("modeParam !== 'consultation'"), 'planning calls do not auto-select a separately priced quote package');
assert.ok(bookingsJs.includes("'Request a planning call'"), 'planning call mode has explicit CTA and form labels');
assert.ok(launchHtml.includes('launch-context.js'), 'Launch loads shared session context bridge');
assert.ok(bookingsHtml.includes('id="booking-launch-bridge"'), 'Start a Project / Bookings hosts Launch bridge');
assert.ok(bookingsHtml.includes('launch-context.js'), 'Bookings loads shared Launch context bridge');
assert.ok(indexHtml.includes('/launch?source=homepage-hero'), 'Homepage integrates Launch discovery CTA');
assert.ok(!indexHtml.includes('Configure on Launch ($199+)'), 'Homepage replaces old $199+ copy with customer-facing Launch CTA');
assert.ok(indexHtml.includes('Build my project — from $199'), 'Homepage exposes plain-language Build my project CTA');
assert.ok(indexHtml.includes('Help me plan'), 'Homepage exposes complementary Help me plan CTA');
console.log('   OK: OTP LAUNCH V1.2–V2 unified conversion bridges');

// 6. V1.3/V2 Visual Media Manifest, Conceptual Service Visuals vs Authentic Portfolio Proof
const seenPreviewImages = new Set(catalog.SERVICES.map((s) => s.previewImage));
assert.equal(seenPreviewImages.size, catalog.SERVICES.length, 'Each of the 9 services uses a distinct preview thumbnail');
assert.ok(Array.isArray(mediaManifest.SERVICE_VISUALS) && mediaManifest.SERVICE_VISUALS.length === 9, 'Manifest registers 9 original conceptual service visuals');
const authPosters = new Set(mediaManifest.AUTHENTIC_ASSETS.map((a) => a.poster).filter(Boolean));
for (const svcVisual of mediaManifest.SERVICE_VISUALS) {
  assert.equal(svcVisual.visualRole, 'conceptual_service_illustration', `${svcVisual.serviceId} keeps conceptual role separate`);
  assert.ok(svcVisual.poster.startsWith('/assets/services/'), `Service visual uses /assets/services/: ${svcVisual.poster}`);
  assert.ok(!authPosters.has(svcVisual.poster), `Conceptual visual stays distinct from authentic proof: ${svcVisual.poster}`);
  assert.ok(fs.existsSync(path.join(root, svcVisual.poster.replace(/^\//, ''))), `Service visual exists on disk: ${svcVisual.poster}`);
}
for (const svc of catalog.SERVICES) {
  assert.equal(svc.visualRole, 'conceptual_service_illustration', `${svc.id} declares conceptual service role`);
  assert.ok(svc.previewImage.startsWith('/assets/services/'), `${svc.id} card preview uses original /assets/services/ asset`);
  assert.ok(fs.existsSync(path.join(root, svc.previewImage.replace(/^\//, ''))), `Card image exists: ${svc.previewImage}`);
}
assert.ok(mediaManifest.AUTHENTIC_ASSETS.length >= 9, 'Manifest tracks authentic portfolio captures and recordings');
assert.ok(mediaManifest.FLOW_SEQUENCES.length >= 4, 'Manifest declares Google Flow cinematic sequence slots');
for (const asset of mediaManifest.AUTHENTIC_ASSETS) {
  if (asset.poster) assert.ok(fs.existsSync(path.join(root, asset.poster.replace(/^\//, ''))), `Asset poster exists: ${asset.poster}`);
  if (asset.mp4) assert.ok(fs.existsSync(path.join(root, asset.mp4.replace(/^\//, ''))), `Asset loop exists: ${asset.mp4}`);
}
for (const pair of mediaManifest.BEFORE_AFTER_PAIRS) {
  assert.ok(fs.existsSync(path.join(root, pair.beforeImage.replace(/^\//, ''))), `Before image exists: ${pair.beforeImage}`);
  assert.ok(fs.existsSync(path.join(root, pair.afterImage.replace(/^\//, ''))), `After image exists: ${pair.afterImage}`);
}
assert.ok(bookingsHtml.includes('id="booking-visual-proof"'), 'Start a Project hosts live visual proof preview stage');

const proofDom = new JSDOM(read('launch.html'), { url: 'https://www.onlytrueperspective.tech/launch', runScripts: 'outside-only' });
proofDom.window.matchMedia = () => ({ matches: true, addEventListener: () => {} });
proofDom.window.OTP_LAUNCH_MEDIA = mediaManifest;
proofDom.window.OTP_LAUNCH_CATALOG = catalog;
proofDom.window.eval(read('launch-proof-components.js'));
proofDom.window.eval(read('launch.js'));
assert.ok(proofDom.window.document.querySelector('#launch-hero-device-stage .otp-macbook'), 'Launch renders MacBook device presentation');
assert.ok(proofDom.window.document.querySelector('#launch-hero-device-stage .otp-iphone'), 'Launch renders iPhone device presentation');
assert.ok(proofDom.window.document.querySelector('#launch-compare-stage input[type="range"]'), 'Launch renders Before/After interactive comparison');
proofDom.window.close();
console.log('   OK: OTP LAUNCH V1.3 visual proof, distinct card imagery & device framing');
