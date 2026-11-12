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
  assert.deepEqual(nav.map(a => a.getAttribute('href')), ['/', '/archive', '/studio#digital', '/studio', '/portal'], file + ' client-first primary destinations');
  assert.ok(!nav.some(a => a.getAttribute('href') === '/floorops'), file + ' keeps FloorOps out of the primary client navigation');
  assert.equal(nav.find(a => a.getAttribute('href') === '/portal').textContent, 'Client Portal');
  assert.deepEqual([...document.querySelectorAll('.public-menu nav a')].slice(0, nav.length).map(a => a.getAttribute('href')), nav.map(a => a.getAttribute('href')), file + ' mobile navigation parity');
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
assert.ok(previews.length >= 3 && previews.length <= 4, 'Home shows three to four curated previews');
assert.equal(home.querySelectorAll('[data-archive-projects], [data-video-feed]').length, 0, 'full portfolio is owned by Archive');
assert.ok(home.querySelector('main a[href="/archive"]'));
assert.ok(home.querySelector('main a[href="/studio"]'));
assert.ok(home.querySelector('main a[href="/signal"]'));
assert.ok(home.querySelector('main a[href^="/start-project?source="]'));
for (const image of home.querySelectorAll('img')) {
  assert.ok(image.hasAttribute('alt'));
  assert.ok(Number(image.width) > 0 && Number(image.height) > 0, 'images reserve intrinsic space');
  assert.ok(fs.existsSync(path.join(__dirname, '..', image.getAttribute('src'))), 'image exists');
}
const css = read('public-system.css');
assert.match(css, /prefers-reduced-motion:\s*reduce/, 'shared design respects motion preferences');
assert.match(css, /animation-duration:\s*\.0*1ms|animation:\s*none|animation-duration:\s*0\.0*1ms/, 'reduced motion limits animation');
assert.match(css, /public-light-drift 46s/, 'shared background drift moves slowly');
assert.match(css, /public-light-drift 58s/, 'second background layer uses a separate slow cycle');
assert.match(css, /0%, 100% \{ transform: translate3d\(-1\.5%,-1%,0\)/, 'shared background drift loops from the same position');
const releaseSweep = read('scripts/prod_full_sweep.js');
assert.ok(releaseSweep.includes('href="/studio#digital"') && releaseSweep.includes('budget-fit-preview') && releaseSweep.includes('budget-guide-intro'), 'production sweep verifies the client navigation and visual budget guidance');
assert.ok(releaseSweep.includes('archive-project-newest') && releaseSweep.includes('public-light-drift 46s'), 'production sweep verifies the latest project and subtle background');
const studio = new JSDOM(read('studio.html')).window.document;
for (const id of ['digital', 'creative', 'launch', 'engagements', 'process', 'questions']) assert.ok(studio.getElementById(id), 'Studio owns ' + id);
assert.ok(studio.querySelectorAll('#process li').length >= 3, 'Studio explains engagement steps');
console.log('Homepage, Studio and shared navigation runtime contracts passed.');

// Exercise the real campaign script's lifecycle without a clock-dependent browser test.
{
  const dom = new JSDOM(read('index.html'), { url: 'https://www.onlytrueperspective.tech/', runScripts: 'outside-only' });
  const win = dom.window;
  const section = win.document.querySelector('.home-lore');
  assert.ok(section);
  const timers = new Map();
  let timerId = 0;
  let intersection;
  let preferenceChanged;
  const preference = { matches: false, addEventListener: (_, callback) => { preferenceChanged = callback; } };
  win.matchMedia = () => preference;
  win.IntersectionObserver = class { constructor(callback) { intersection = callback; } observe() {} };
  win.setTimeout = callback => { timers.set(++timerId, callback); return timerId; };
  win.clearTimeout = id => timers.delete(id);
  Object.defineProperty(win.document, 'hidden', { value: false, configurable: true });
  win.eval(read('home-lore.js'));
  const advance = () => { const [id, callback] = timers.entries().next().value; timers.delete(id); callback(); };
  const title = section.querySelector('.lore-title');
  const toggle = section.querySelector('.lore-motion-toggle');
  assert.equal(title.getAttribute('aria-label'), 'LORE');
  assert.equal(section.classList.contains('is-running'), false);
  intersection([{ isIntersecting: true }]);
  assert.equal(section.classList.contains('is-running'), true);
  advance();
  assert.equal(section.classList.contains('is-interference'), true);
  assert.notEqual(title.textContent, 'LORE');
  toggle.click();
  assert.equal(section.classList.contains('is-running'), false);
  assert.equal(title.textContent, 'LORE');
  assert.equal(timers.size, 0, 'pause clears both pending work and the burst');
  toggle.click();
  advance(); advance(); advance();
  assert.equal(title.textContent, 'LORE', 'decrypt restores the exact final word');
  intersection([{ isIntersecting: false }]);
  assert.equal(timers.size, 0, 'offscreen work stops');
  intersection([{ isIntersecting: true }]);
  Object.defineProperty(win.document, 'hidden', { value: true, configurable: true });
  win.document.dispatchEvent(new win.Event('visibilitychange'));
  assert.equal(section.classList.contains('is-running'), false);
  assert.equal(timers.size, 0);
  Object.defineProperty(win.document, 'hidden', { value: false, configurable: true });
  win.document.dispatchEvent(new win.Event('visibilitychange'));
  preference.matches = true; preferenceChanged();
  assert.equal(toggle.hidden, true);
  assert.equal(section.classList.contains('is-running'), false);
  assert.equal(title.textContent, 'LORE');
  assert.equal(timers.size, 0);
  assert.ok(section.querySelector('.lore-link').getAttribute('href') === '/signal');
  dom.window.close();
}
console.log('LORE motion pause, viewport, hidden-tab and reduced-motion contracts passed.');

// The website showcase keeps native comparison controls and a useful no-script view.
{
  const dom = new JSDOM(read('website-design.html'), { url: 'https://www.onlytrueperspective.tech/website-design', runScripts: 'outside-only' });
  const doc = dom.window.document;
  const comparison = doc.querySelector('[data-web-compare]');
  const range = comparison.querySelector('input[type="range"]');
  assert.equal(comparison.querySelectorAll('figure img').length, 2);
  assert.ok(doc.querySelector('a[href*="service=Website"]'));
  dom.window.eval(read('website-design.js'));
  assert.equal(comparison.querySelector('.web-compare-controls').hidden, false);
  assert.equal(comparison.style.getPropertyValue('--compare'), '50%');
  for (const value of ['0', '75', '100']) {
    range.value = value;
    range.dispatchEvent(new dom.window.Event('input'));
    assert.equal(comparison.style.getPropertyValue('--compare'), value + '%');
    assert.equal(range.getAttribute('aria-valuetext'), value + '% of the OTP redesign revealed');
  }
  dom.window.close();
}
console.log('Website service showcase and accessible comparison controls passed.');
