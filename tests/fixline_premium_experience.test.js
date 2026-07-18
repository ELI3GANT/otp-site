const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pageHtml = read('fixline.html');
const intakeHtml = read('fixline-intake.html');
const intakeCss = read('fixline-intake.css');
const serviceCss = read('fixline-service.css');
const intakeJs = read('fixline-intake.js');
const server = read('server.js');
const vercel = JSON.parse(read('vercel.json'));

console.log('FIXLINE PREMIUM EXPERIENCE...');

assert.ok(pageHtml.includes('Find the weak point costing your business trust.'), 'hero uses the approved positioning');
assert.ok(pageHtml.includes('View a Sample Diagnosis'), 'hero links to a sample diagnosis');
assert.ok(pageHtml.includes('id="sample-diagnosis"'), 'sample diagnosis owns a stable target');
assert.ok(pageHtml.includes('data-case-study="ready"'), 'sample component is case-study ready');
assert.ok(pageHtml.includes('data-client-permission="sample-only"'), 'sample cannot be mistaken for an approved customer result');
assert.strictEqual((pageHtml.match(/<details>/g) || []).length, 8, 'FAQ exposes eight native accessible disclosures');
assert.ok(pageHtml.includes('submission does not authorize OTP to publish'), 'trust section preserves the no-modification boundary');
assert.ok(pageHtml.includes('protected read-only integration'), 'OTP OS connection is accurately bounded');
assert.ok(!pageHtml.includes('Restricted Beta'), 'public FIXLINE page no longer uses restrictive beta terminology');
assert.ok(pageHtml.includes('OTP FIXLINE // PRIVATE BETA'), 'public FIXLINE page uses consistent private beta terminology');
assert.ok((pageHtml.match(/Start My FIXLINE Review/g) || []).length >= 4, 'primary CTA copy is consistent');
assert.ok(pageHtml.includes('href="/fixline/intake"'), 'primary CTA uses the canonical intake route');
const fixlineTypeSources = `${serviceCss}\n${intakeCss}`;
assert.ok(serviceCss.includes('Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'), 'FIXLINE uses the exact OTP Bookings typography stack');
assert.ok(!/(Georgia|Times New Roman|SFMono-Regular|Consolas|Liberation Mono|\bcursive\b)/i.test(fixlineTypeSources), 'FIXLINE CSS contains no serif, script, or decorative interface font families');
assert.ok(!/font-style:\s*(italic|oblique)/i.test(fixlineTypeSources), 'FIXLINE CSS contains no decorative italic styles');
assert.ok(!/fonts\.googleapis\.com|Space\+Grotesk/.test(`${pageHtml}\n${intakeHtml}`), 'FIXLINE does not request the retired decorative font source');
assert.ok(serviceCss.includes('font-size: clamp(2.2rem, 4.55vw, 4.05rem)') && serviceCss.includes('letter-spacing: 0'), 'FIXLINE headings reuse the Bookings scale and spacing treatment');
assert.ok(pageHtml.includes('See the diagnosis clearly.'), 'public product copy removes awkward score language');
assert.strictEqual((pageHtml.match(/A concise consultant diagnosis built around priority/g) || []).length, 1, 'deliverable copy is not duplicated');
assert.ok(serviceCss.includes('prefers-reduced-motion: reduce'), 'public page disables nonessential motion');
assert.ok(intakeCss.includes('prefers-reduced-motion: reduce'), 'intake disables nonessential motion');
assert.ok(intakeCss.includes('position: fixed'), 'mobile intake controls support sticky progression');
assert.ok(intakeCss.includes('.fixline-intake-page [hidden]'), 'hidden intake states cannot be repainted by component display rules');
assert.ok(intakeHtml.includes('Step 1 of 7'), 'intake exposes seven focused steps');
assert.ok(intakeHtml.includes('role="progressbar"'), 'intake exposes accessible progress semantics');
assert.ok(intakeHtml.includes('OTP FIXLINE // PRIVATE BETA'), 'intake uses private beta terminology');
assert.ok(server.includes("['/fixline/intake', '/fixline/intake/']"), 'Express serves the native intake route');
assert.deepStrictEqual(vercel.routes.find((route) => route.src === '^/fixline/intake/?$'), { src: '^/fixline/intake/?$', dest: '/server.js' }, 'Vercel routes intake to otp-site');
assert.ok(vercel.routes.some((route) => route.src === '^/fixline/api/review/submit/?$' && route.dest === 'https://otp-fixline.vercel.app/fixline/api/review/submit'), 'submission API remains on the proven FIXLINE backend contract');

function createDom(fetchImplementation) {
  const dom = new JSDOM(intakeHtml, {
    runScripts: 'outside-only',
    url: 'https://www.onlytrueperspective.tech/fixline/intake'
  });
  dom.window.requestAnimationFrame = (callback) => callback();
  dom.window.fetch = fetchImplementation || (() => Promise.reject(new Error('fetch not expected')));
  dom.window.OTPFixlineAnalytics = { track() {} };
  dom.window.eval(intakeJs);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}

function submit(dom) {
  const form = dom.window.document.getElementById('intake-form');
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function change(dom, selector, value, eventName = 'input') {
  const input = dom.window.document.querySelector(selector);
  assert.ok(input, `expected input ${selector}`);
  if (input.type === 'checkbox' || input.type === 'radio') input.checked = Boolean(value);
  else input.value = value;
  input.dispatchEvent(new dom.window.Event(eventName, { bubbles: true }));
}

function completeToReview(dom) {
  change(dom, 'input[value="website"]', true, 'change');
  assert.ok(dom.window.document.querySelector('fieldset legend').textContent.includes('Web'), 'surface choices are grouped by system');
  submit(dom);
  assert.strictEqual(dom.window.document.getElementById('step-count').textContent, 'Step 2 of 7');
  change(dom, '#review-link-0', 'https://example.com/fixline-review');
  submit(dom);
  assert.strictEqual(dom.window.document.getElementById('step-count').textContent, 'Step 3 of 7');
  dom.window.document.getElementById('back-button').click();
  assert.strictEqual(dom.window.document.getElementById('review-link-0').value, 'https://example.com/fixline-review', 'back navigation preserves entered links');
  submit(dom);
  change(dom, '#primary-goal', 'identify-strongest-fix');
  change(dom, '#description', 'Please identify the strongest credibility and conversion fix for this public website.');
  submit(dom);
  change(dom, 'input[value="flexible"]', true);
  submit(dom);
  change(dom, 'input[value="not-sure"]', true);
  submit(dom);
  change(dom, '#contact-name', 'Browser QA');
  change(dom, '#business-name', 'FIXLINE QA Studio');
  change(dom, '#email', 'browser-qa@example.test');
  change(dom, '#consent', true);
  submit(dom);
  assert.strictEqual(dom.window.document.getElementById('step-count').textContent, 'Step 7 of 7');
}

{
  const dom = createDom();
  submit(dom);
  const error = dom.window.document.getElementById('form-error');
  assert.strictEqual(error.hidden, false, 'empty surface step exposes validation');
  const firstCategory = dom.window.document.querySelector('input[name="categories"]');
  assert.strictEqual(firstCategory.getAttribute('aria-describedby'), 'form-error', 'validation is linked to the affected control');
  change(dom, 'input[value="website"]', true, 'change');
  assert.strictEqual(dom.window.OTPFixlineIntake.getState().categories[0], 'website', 'selected state updates the exact backend enum');
  completeToReview(dom);
  assert.strictEqual(new Set(dom.window.OTPFixlineIntake.getState().categories).size, dom.window.OTPFixlineIntake.getState().categories.length, 'surface state cannot accumulate duplicate enums');
  const reviewText = dom.window.document.querySelector('.fixline-review-list').textContent;
  assert.ok(reviewText.includes('Website'), 'review summary renders submitted surfaces');
  assert.ok(reviewText.includes('https://example.com/fixline-review'), 'review summary renders public links');
  assert.ok(reviewText.includes('Browser QA'), 'review summary renders contact details');
}

{
  let fetchCalls = 0;
  let resolveFetch;
  const pendingFetch = new Promise((resolve) => { resolveFetch = resolve; });
  const dom = createDom(() => {
    fetchCalls += 1;
    return pendingFetch;
  });
  completeToReview(dom);
  submit(dom);
  submit(dom);
  assert.strictEqual(fetchCalls, 1, 'duplicate final submission is blocked while the first request is pending');
  assert.strictEqual(dom.window.document.getElementById('continue-button').disabled, true, 'submit control is disabled while loading');
  resolveFetch({ ok: false, json: async () => ({ ok: false, message: 'Synthetic stop' }) });
}

{
  const dom = createDom();
  dom.window.OTPFixlineIntake.renderSuccess({
    ok: true,
    ticketNumber: 'FIX-260718-DEMO',
    statusUrl: 'https://www.onlytrueperspective.tech/fixline/status/safe-public-token',
    businessName: 'Synthetic Studio',
    categories: ['Website', 'Booking page'],
    emailStatus: 'sent',
    expectedReviewWindow: 'Usually within 2–4 business days',
    ticketId: 'internal-ticket-id',
    secureStatusTokenHash: 'internal-secret-hash',
    adminRoute: '/admin/tickets/internal-ticket-id'
  });
  const success = dom.window.document.querySelector('.fixline-success-card');
  assert.ok(success.textContent.includes('SUBMISSION COMPLETE'), 'successful submission renders the premium confirmation state');
  assert.ok(success.textContent.includes('We received your FIXLINE request.'), 'confirmation copy is direct and clear');
  assert.strictEqual(success.getAttribute('tabindex'), '-1', 'confirmation can receive focus after submission');
  assert.ok(success.textContent.includes('FIX-260718-DEMO'), 'confirmation exposes the public-safe reference');
  assert.ok(success.textContent.includes('Review process'), 'lifecycle is labeled as process guidance');
  assert.ok(success.textContent.includes('It is not a live status tracker.'), 'confirmation does not overstate lifecycle status');
  assert.ok(!success.textContent.includes('internal-ticket-id'), 'confirmation does not expose internal ticket IDs');
  assert.ok(!success.textContent.includes('internal-secret-hash'), 'confirmation does not expose secure hashes');
  assert.ok(!success.innerHTML.includes('/admin/tickets'), 'confirmation does not expose admin routes');
}

console.log('   OK: premium page, native intake, interaction, and public-safe success contracts');
console.log('FIXLINE PREMIUM EXPERIENCE COMPLETE');
