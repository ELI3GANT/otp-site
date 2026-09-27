const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

async function run() {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'bookings.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'bookings.js'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://www.onlytrueperspective.tech/bookings?offer=site-audit&source=homepage-hero', runScripts: 'outside-only' });
  const { window } = dom;
  const { document } = window;
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  const submissions = [];
  window.fetch = async (url, options) => {
    if (url === '/api/bookings/config') return { ok: true, json: async () => ({ ok: true }) };
    submissions.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ ok: true, received: true }) };
  };
  window.eval(js);
  await new Promise(resolve => setTimeout(resolve, 0));
  const audit = document.querySelector('#audit-form');
  assert.equal(document.querySelector('.skip-link').getAttribute('href'), '#audit-form');
  assert.equal(document.querySelector('.hero-actions .primary-action').getAttribute('href'), '#audit-form');
  audit.dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
  assert.equal(submissions.length, 0, 'missing fields cannot create a lead');
  const set = (name, value) => { audit.elements.namedItem(name).value = value; };
  set('social_link', 'https://example.com/services');
  set('name', 'Test Prospect');
  set('email', 'prospect@example.com');
  set('issue', 'Booking button is hidden on mobile');
  audit.elements.namedItem('contact_consent').checked = true;
  audit.dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(submissions.length, 1, 'valid audit uses the existing booking API once');
  const lead = submissions[0];
  assert.equal(lead.service_type, 'Website / Digital System');
  assert.equal(lead.package_interest, 'Not Sure Yet', 'free review does not preselect paid work');
  assert.equal(lead.social_link, 'https://example.com/services');
  assert.match(lead.project_description, /Free site audit request.*Booking button is hidden on mobile/);
  assert.equal(lead.source_tracking.cta_source, 'homepage-hero');
  assert.equal(document.querySelector('#success-title').textContent, 'Your website review request is in.');
  assert.equal(document.querySelector('#audit-form').classList.contains('hidden'), true);
  dom.window.close();
}
run().then(() => console.log('Site audit booking flow passed.')).catch(error => { console.error(error); process.exitCode = 1; });
