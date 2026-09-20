const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'knowledge/otp_business_seed.json')));
const config = require('../pricing-config');
const normalize = s => s.replace(/,/g, '').replace(/[–—]/g, '-').replace(/\s/g, '').replace(/TO/gi, '-');
for (const item of seed.pricing_source_of_truth.signature_packages) {
  const configured = Object.values(config.packages).find(p => p.label === item.name);
  assert.ok(configured, 'Pricing guidance retains ' + item.name);
  let display = normalize(configured.price_display.replace(/Starting at /i, ''));
  if (configured.mode === 'starting_at' && !display.endsWith('+')) display += '+';
  assert.equal(display, normalize(item.range), item.name + ' guidance matches business seed');
}
for (const file of ['index.html', 'studio.html']) {
  const doc = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8')).window.document;
  assert.doesNotMatch(doc.body.textContent, /\$[\d,.]+\s*deposit|deposit\s*(?:of\s*)?\$[\d,.]+/i, file + ' does not impose fixed public deposits');
  assert.equal(doc.querySelectorAll('a[href*="buy.stripe.com"], a[href*="checkout.stripe.com"]').length, 0, 'public discovery requires scoped intake before payment');
}
console.log('Signature pricing guidance and quote-first discovery passed.');
