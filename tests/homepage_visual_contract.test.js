const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
for (const [file, active] of [['index.html', 'Home'], ['archive.html', 'Archive'], ['studio.html', 'Studio']]) {
  const dom = new JSDOM(read(file), { url: 'https://www.onlytrueperspective.tech' + (active === 'Home' ? '/' : '/' + active.toLowerCase()), runScripts: 'outside-only' });
  const { document } = dom.window;
  let resize;
  dom.window.matchMedia = () => ({ addEventListener: (_, fn) => { resize = fn; } });
  dom.window.eval(read('public-shell.js'));
  const nav = [...document.querySelectorAll('.public-desktop-nav a')];
  const expectedDestinations = active === 'Home'
    ? ['/', '/archive', '/vault', '/signal', '/studio']
    : ['/', '/archive', '/signal', '/studio'];
  assert.deepEqual(nav.map(a => a.getAttribute('href')), expectedDestinations, file + ' primary destinations');
  assert.deepEqual([...document.querySelectorAll('.public-menu nav a')].slice(0, expectedDestinations.length).map(a => a.getAttribute('href')), nav.map(a => a.getAttribute('href')), file + ' mobile navigation parity');
  assert.equal(nav.find(a => a.getAttribute('aria-current') === 'page').textContent, active);
  const menu = document.querySelector('details.public-menu');
  assert.ok(menu.querySelector('summary'), 'menu remains native and keyboard accessible without JS');
  menu.open = true;
  menu.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(menu.open, false);
  assert.equal(document.activeElement, menu.querySelector('summary'), 'Escape restores menu focus');
  menu.open = true;
  menu.querySelector('a').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menu.open, false, 'navigation closes menu');
  menu.open = true; resize({ matches: true });
  assert.equal(menu.open, false, 'desktop transition closes mobile menu');
  assert.equal(document.querySelectorAll('h1').length, 1);
  assert.ok(document.querySelector('#main-content'));
  assert.equal(document.querySelector('#page-loader'), null);
  dom.window.close();
}
const home = new JSDOM(read('index.html')).window.document;
assert.equal(home.querySelectorAll('main form').length, 0, 'Home introduces the brand; intake lives on booking');
const previews = home.querySelectorAll('main a[href^="/projects/"]');
assert.ok(previews.length >= 3 && previews.length <= 4, 'Home shows three to four curated project previews');
assert.equal(home.querySelectorAll('[data-archive-projects], [data-video-feed]').length, 0, 'full portfolio is owned by Archive');
assert.ok(home.querySelector('main a[href="/archive"]'));
assert.ok(home.querySelector('main a[href="/studio"]'));
assert.ok(home.querySelector('main a[href="/signal"]'));
const auditCta = home.querySelector('.home-hero-actions a[data-analytics-event="cta_site_audit_click"]');
assert.ok(auditCta && /Get a Free Site Audit/i.test(auditCta.textContent), 'homepage has one clear primary audit CTA');
const auditUrl = new URL(auditCta.getAttribute('href'), 'https://www.onlytrueperspective.tech');
assert.equal(auditUrl.pathname, '/bookings', 'homepage audit CTA uses the booking flow');
assert.equal(auditUrl.searchParams.get('offer'), 'site-audit', 'homepage audit CTA opens audit mode');
assert.equal(auditUrl.searchParams.get('service'), 'Website / Digital System', 'homepage audit CTA preselects website service');
const signalCta = home.querySelector('#signal-offer a[data-analytics-event="cta_start_project_click"]');
assert.ok(signalCta?.getAttribute('href').includes('package=The%20Signal'), 'Signal CTA preselects the Signal booking offer');
assert.ok(home.querySelector('.home-hero-actions a[href="/archive"]'), 'homepage secondary CTA routes to the work archive');
assert.equal(home.querySelector('main a[href^="/fixline/intake?source="]'), null, 'homepage primary flow does not route through FIXLINE');
for (const image of home.querySelectorAll('img')) {
  assert.ok(image.hasAttribute('alt'));
  assert.ok(Number(image.width) > 0 && Number(image.height) > 0, 'images reserve intrinsic space');
  assert.ok(fs.existsSync(path.join(__dirname, '..', image.getAttribute('src'))), 'image exists');
}
const css = read('public-system.css');
assert.match(css, /prefers-reduced-motion:\s*reduce/, 'shared design respects motion preferences');
assert.match(css, /animation-duration:\s*\.0*1ms|animation:\s*none|animation-duration:\s*0\.0*1ms/, 'reduced motion limits animation');
const studio = new JSDOM(read('studio.html')).window.document;
for (const id of ['digital', 'creative', 'launch', 'engagements', 'process', 'questions']) assert.ok(studio.getElementById(id), 'Studio owns ' + id);
assert.ok(studio.querySelectorAll('#process li').length >= 3, 'Studio explains engagement steps');
console.log('Homepage, Studio and shared navigation runtime contracts passed.');
