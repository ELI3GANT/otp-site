const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'knowledge/otp_business_seed.json')));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const normalize = s => s.replace(/,/g, '').replace(/[–—]/g, '-').replace(/\s/g, '').replace(/TO/gi, '-');
for (const item of seed.pricing_source_of_truth.signature_packages) {
  const start = html.indexOf('>' + item.name + '</h4>');
  assert.ok(start >= 0, 'Missing package: ' + item.name);
  const section = html.slice(start, html.indexOf('</h4>', start + item.name.length + 8) > 0 ? html.indexOf('</h4>', start + item.name.length + 8) : undefined);
  const match = section.match(/class="price-label"[^>]*>([^<]+)</);
  assert.ok(match, 'Missing public price: ' + item.name);
  let publicPrice = normalize(match[1].replace(/STARTING AT /i, ''));
  if (/STARTING AT/i.test(match[1]) && !publicPrice.endsWith('+')) publicPrice += '+';
  assert.equal(normalize(item.range), publicPrice, item.name + ' guidance differs from homepage');
}
console.log('Signature pricing matches homepage; no customer records modified.');
