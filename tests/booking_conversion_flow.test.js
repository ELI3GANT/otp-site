const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'bookings.html'), 'utf8')
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/gi, '');
const bookingScript = fs.readFileSync(path.join(root, 'bookings.js'), 'utf8');

function response(body, { ok = true, status = 200 } = {}) {
    return { ok, status, json: async () => body };
}

async function waitFor(predicate, label, timeoutMs = 1000) {
    const started = Date.now();
    while (!predicate()) {
        if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${label}`);
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

function createBookingPage({ submitResponse, submitWait } = {}) {
    const requests = [];
    const analytics = [];
    const dom = new JSDOM(html, {
        url: 'https://www.onlytrueperspective.tech/start-project?utm_source=conversion-test&utm_campaign=flow-check',
        runScripts: 'outside-only',
        pretendToBeVisual: true
    });
    const { window } = dom;
    window.matchMedia = (query) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} });
    window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
    window.OTPAnalytics = { trackEvent: (name, data) => analytics.push({ name, data }) };
    window.fetch = async (url, options = {}) => {
        if (url === '/api/bookings/config') return response({ ok: false });
        const request = { url, options, body: JSON.parse(options.body || '{}') };
        requests.push(request);
        if (submitWait) await submitWait();
        return submitResponse ? submitResponse(request) : response({
            ok: true,
            nextStep: 'OTP will review the project.',
            writerEvidence: { writer: 'otp_os', status: 'persisted' }
        });
    };
    window.eval(bookingScript);
    return { dom, window, requests, analytics };
}

function setValue(window, selector, value, type = 'input') {
    const field = window.document.querySelector(selector);
    assert.ok(field, `Expected form field ${selector}`);
    field.value = value;
    field.dispatchEvent(new window.Event(type, { bubbles: true }));
    return field;
}

function submit(window, selector) {
    const form = window.document.querySelector(selector);
    assert.ok(form, `Expected form ${selector}`);
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

async function run() {
    console.log('OTP BOOKING CONVERSION FLOW...');

    const page = createBookingPage();
    await waitFor(() => page.window.document.querySelector('#quick-service').options.length > 1, 'booking options');
    const { window } = page;

    submit(window, '#quick-inquiry-form');
    assert.equal(page.requests.length, 0, 'empty Quick Inquiry does not submit');
    assert.match(window.document.querySelector('#quick-error').textContent, /service.*project description.*name.*email or phone/i);
    assert.ok(page.analytics.some((event) => event.name === 'booking_validation_error' && event.data.intake_path === 'quick_inquiry'));

    setValue(window, '#booking-name', 'Existing detailed client', 'input');
    setValue(window, '#booking-description', 'An existing detailed description that must remain intact.', 'input');
    setValue(window, '#quick-service', 'Website / Digital System', 'change');
    assert.equal(window.document.querySelector('#booking-name').value, 'Existing detailed client', 'changing Quick Inquiry service does not erase a detailed name');
    assert.equal(window.document.querySelector('#booking-description').value, 'An existing detailed description that must remain intact.', 'changing Quick Inquiry service does not erase a detailed description');
    setValue(window, '#quick-name', 'Morgan Example');
    setValue(window, '#quick-email', 'invalid-email');
    setValue(window, '#quick-phone', '+1 (212) 555-0199');
    setValue(window, '#quick-description', 'A new website with a simpler booking flow.', 'input');
    const consent = window.document.querySelector('#quick-consent');
    consent.checked = true;
    consent.dispatchEvent(new window.Event('change', { bubbles: true }));

    assert.equal(window.document.querySelector('#booking-name').value, 'Morgan Example', 'quick details can prefill the detailed path');
    assert.equal(window.document.querySelector('#booking-description').value, 'A new website with a simpler booking flow.', 'new non-empty quick details can update the detailed path');

    submit(window, '#quick-inquiry-form');
    assert.equal(page.requests.length, 0, 'an invalid supplied email cannot reach the API even with a phone number present');
    assert.match(window.document.querySelector('#quick-error').textContent, /valid email/i);
    assert.equal(window.document.activeElement.id, 'quick-email', 'invalid email validation focuses the email field');
    setValue(window, '#quick-email', 'morgan@example.test');

    submit(window, '#quick-inquiry-form');
    await waitFor(() => page.requests.length === 1, 'Quick Inquiry submission');
    await waitFor(() => window.document.querySelector('#success-title').textContent === 'Your inquiry reached OTP.', 'Quick Inquiry confirmation');
    const quick = page.requests[0].body;
    assert.equal(quick.source_tracking.intake_path, 'quick_inquiry');
    assert.equal(quick.source_tracking.utm_source, 'conversion-test');
    assert.equal(quick.source_tracking.utm_campaign, 'flow-check');
    assert.equal(quick.service_type, 'Website / Digital System');
    assert.equal(quick.package_interest, 'Not Sure Yet', 'Quick Inquiry does not force a package');
    assert.equal(quick.name, 'Morgan Example');
    assert.equal(quick.email, 'morgan@example.test');
    assert.equal(quick.phone, '+1 (212) 555-0199');
    assert.equal(quick.project_description, 'A new website with a simpler booking flow.');
    assert.equal(quick.contact_consent, true);
    assert.equal(window.document.querySelector('#success-title').textContent, 'Your inquiry reached OTP.');
    assert.equal(window.document.querySelector('#booking-success').classList.contains('hidden'), false);

    submit(window, '#quick-inquiry-form');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(page.requests.length, 1, 'a persisted inquiry cannot be submitted a second time');
    assert.ok(page.analytics.some((event) => event.name === 'booking_submission_persisted' && event.data.writer === 'otp_os'));
    assert.ok(page.analytics.some((event) => event.name === 'quick_inquiry_started'), 'choosing a service begins the Quick Inquiry funnel');
    assert.ok(!JSON.stringify(page.analytics).includes('morgan@example.test'), 'analytics do not include contact data');
    page.dom.window.close();

    const failed = createBookingPage({
        submitResponse: async () => response({ ok: false, message: 'Synthetic OTP OS outage.' }, { ok: false, status: 503 })
    });
    await waitFor(() => failed.window.document.querySelector('#quick-service').options.length > 1, 'failure test options');
    setValue(failed.window, '#quick-service', 'Video / Content', 'change');
    setValue(failed.window, '#quick-name', 'Taylor Example');
    setValue(failed.window, '#quick-email', 'taylor@example.test');
    setValue(failed.window, '#quick-description', 'A short campaign edit for a product launch.', 'input');
    failed.window.document.querySelector('#quick-consent').checked = true;
    submit(failed.window, '#quick-inquiry-form');
    await waitFor(() => failed.window.document.querySelector('#quick-error').textContent.includes('Synthetic OTP OS outage.'), 'visible failure state');
    assert.equal(failed.window.document.querySelector('#submit-quick-inquiry').disabled, false, 'failed submission can be retried');
    assert.ok(failed.analytics.some((event) => event.name === 'booking_submission_failed'));
    failed.dom.window.close();

    const unverified = createBookingPage({ submitResponse: async () => response({ ok: true }) });
    await waitFor(() => unverified.window.document.querySelector('#quick-service').options.length > 1, 'writer-evidence test options');
    setValue(unverified.window, '#quick-service', 'Website / Digital System', 'change');
    setValue(unverified.window, '#quick-name', 'Riley Example');
    setValue(unverified.window, '#quick-email', 'riley@example.test');
    setValue(unverified.window, '#quick-description', 'A landing page for a new local service.', 'input');
    unverified.window.document.querySelector('#quick-consent').checked = true;
    submit(unverified.window, '#quick-inquiry-form');
    await waitFor(() => unverified.window.document.querySelector('#quick-error').textContent.includes('could not verify'), 'missing writer evidence error');
    assert.equal(unverified.window.document.querySelector('#booking-success').classList.contains('hidden'), true, 'an unverified HTTP success does not show a persisted confirmation');
    assert.ok(unverified.analytics.some((event) => event.name === 'booking_submission_failed' && event.data.error_code === 'writer_evidence_missing'));
    unverified.dom.window.close();

    let releaseSubmit;
    const pending = createBookingPage({ submitWait: () => new Promise((resolve) => { releaseSubmit = resolve; }) });
    await waitFor(() => pending.window.document.querySelector('#quick-service').options.length > 1, 'pending test options');
    setValue(pending.window, '#quick-service', 'Brand Launch', 'change');
    setValue(pending.window, '#quick-name', 'Jamie Example');
    setValue(pending.window, '#quick-email', 'jamie@example.test');
    setValue(pending.window, '#quick-description', 'A new visual identity for a small studio.', 'input');
    pending.window.document.querySelector('#quick-consent').checked = true;
    const openDetailed = pending.window.document.querySelector('[data-open-detailed]');
    openDetailed.click();
    assert.equal(pending.window.document.querySelector('#detailed-brief').hidden, false, 'Detailed Brief opens on demand');
    assert.equal(pending.window.document.querySelector('#booking-name').value, 'Jamie Example');
    assert.equal(pending.window.document.querySelector('#booking-service').value, 'Brand Launch');
    assert.equal(pending.window.document.querySelector('[data-open-detailed]').getAttribute('aria-expanded'), 'true');

    submit(pending.window, '#quick-inquiry-form');
    submit(pending.window, '#quick-inquiry-form');
    await waitFor(() => pending.requests.length === 1, 'in-flight Quick Inquiry');
    assert.equal(pending.window.document.querySelector('#submit-quick-inquiry').disabled, true);
    releaseSubmit();
    await waitFor(() => pending.window.document.querySelector('#success-title').textContent === 'Your inquiry reached OTP.', 'in-flight success');
    assert.equal(pending.requests.length, 1, 'concurrent submit attempts share one idempotent request');
    pending.dom.window.close();

    const detailed = createBookingPage();
    await waitFor(() => detailed.window.document.querySelector('#quick-service').options.length > 1, 'Detailed Brief options');
    detailed.window.document.querySelector('[data-open-detailed]').click();
    detailed.window.document.querySelector('#next-step').click();
    assert.equal(detailed.window.document.querySelector('#step-label').textContent, 'Pick Package / Step 1 of 4', 'Detailed Brief blocks progression when required details are missing');
    assert.ok(detailed.analytics.some((event) => event.name === 'booking_validation_error' && event.data.intake_path === 'detailed_brief'));
    setValue(detailed.window, '#booking-name', 'Casey Example');
    setValue(detailed.window, '#booking-email', 'casey@example.test');
    detailed.window.document.querySelector('#next-step').click();
    setValue(detailed.window, '#booking-service', 'Website / Digital System', 'change');
    setValue(detailed.window, '#booking-package', 'The Engine', 'change');
    setValue(detailed.window, '#booking-description', 'A website and client booking journey for a local business.', 'input');
    detailed.window.document.querySelector('#next-step').click();
    detailed.window.document.querySelector('#next-step').click();
    const detailedConsent = detailed.window.document.querySelector('#booking-consent');
    detailedConsent.checked = true;
    detailedConsent.dispatchEvent(new detailed.window.Event('change', { bubbles: true }));
    submit(detailed.window, '#booking-form');
    await waitFor(() => detailed.requests.length === 1, 'Detailed Brief submission');
    await waitFor(() => detailed.window.document.querySelector('#success-title').textContent === 'Your full brief reached OTP.', 'Detailed Brief confirmation');
    const fullBrief = detailed.requests[0].body;
    assert.equal(fullBrief.source_tracking.intake_path, 'detailed_brief');
    assert.equal(fullBrief.service_type, 'Website / Digital System');
    assert.equal(fullBrief.package_interest, 'The Engine');
    assert.equal(fullBrief.desired_deliverables, '');
    assert.equal(fullBrief.contact_consent, true);
    assert.equal(detailed.window.document.querySelector('#success-title').textContent, 'Your full brief reached OTP.');
    detailed.dom.window.close();

    const mapping = createBookingPage();
    await waitFor(() => mapping.window.document.querySelector('#quick-service').options.length > 1, 'mapping options');
    setValue(mapping.window, '#booking-service', 'Website Cleanup', 'change');
    assert.equal(mapping.window.document.querySelector('#quick-service').value, 'Website / Digital System', 'detailed Fast Lane service maps to the matching Quick Inquiry category');
    setValue(mapping.window, '#booking-service', 'Event Promo', 'change');
    assert.equal(mapping.window.document.querySelector('#quick-service').value, 'Video / Content', 'event promo maps to the content category');
    mapping.dom.window.close();

    console.log('OTP BOOKING CONVERSION FLOW OK');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
