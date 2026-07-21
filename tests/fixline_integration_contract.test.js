const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('FIXLINE INTEGRATION CONTRACT...');

const homepage = read('index.html');
const archive = read('archive.html');
const projectLibrary = read('otp-projects.js');
const server = read('server.js');
const sitemap = read('sitemap.xml');
const vercelConfig = JSON.parse(read('vercel.json'));
const fixlineAnalytics = read('fixline-analytics.js');
const consultantAuditPage = read('consultant-audit.html');
const sharedStyles = read('styles.css');

for (const html of [homepage, archive]) {
  assert.ok(html.includes('href="/fixline"'), 'public navigation links to FIXLINE');
}

assert.ok(homepage.includes('data-fixline-event="homepage_to_fixline"'), 'homepage FIXLINE CTA has bounded attribution');
assert.ok(homepage.includes('href="/services/consultant-audit"'), 'homepage exposes consultant audit service');
assert.ok(!homepage.includes('Analyze My Intent'), 'homepage does not ship a simulated audit flow');
assert.ok(!homepage.includes('AI Content Injected Here'), 'homepage does not ship a fake strategy-result state');
assert.ok(projectLibrary.includes("id: 'otp-fixline'"), 'Archive library includes the FIXLINE product');
assert.ok(projectLibrary.includes("projectUrl: '/fixline'"), 'Archive FIXLINE entry returns to the canonical route');
assert.ok(projectLibrary.includes("bookingUrl: '/fixline/intake"), 'Archive FIXLINE conversion starts the real intake');

assert.ok(consultantAuditPage.includes('rel="canonical" href="https://www.onlytrueperspective.tech/services/consultant-audit"'), 'consultant audit owns its canonical URL');
assert.ok(consultantAuditPage.includes('href="/fixline/intake"'), 'consultant audit starts with FIXLINE');
assert.ok(server.includes("'/services/consultant-audit'"), 'Express serves the consultant audit route');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/fixline</loc>'), 'sitemap contains FIXLINE');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/services/consultant-audit</loc>'), 'sitemap contains consultant audit');
assert.ok(sharedStyles.includes('.archive-page.nav-open .nav-drawer a.active'), 'Archive mobile navigation preserves current-route emphasis');

const routes = vercelConfig.routes || [];
const fixedOrigin = 'https://otp-fixline.vercel.app';
const proxied = routes.filter((route) => typeof route.dest === 'string' && route.dest.startsWith(fixedOrigin));
assert.ok(proxied.length >= 10, 'Vercel proxies the complete allowlisted public FIXLINE surface');
assert.ok(proxied.every((route) => route.src.startsWith('^/fixline/')), 'every FIXLINE proxy is bounded below /fixline');
assert.ok(proxied.every((route) => !/admin/i.test(route.src) && !/admin/i.test(route.dest)), 'no FIXLINE admin route is proxied');
assert.deepStrictEqual(proxied.find((route) => route.src === '^/fixline/?$'), { src: '^/fixline/?$', dest: `${fixedOrigin}/fixline` }, 'public FIXLINE root serves the new application');
assert.deepStrictEqual(proxied.find((route) => route.src === '^/fixline/intake/?$'), { src: '^/fixline/intake/?$', dest: `${fixedOrigin}/fixline/intake` }, 'public FIXLINE intake serves the four-step application');
assert.ok(proxied.some((route) => route.src === '^/fixline/api/review/submit/?$'), 'submission proxy is exact');
assert.ok(proxied.some((route) => route.src === '^/fixline/_next/(.*)$'), 'Next assets are bounded to the FIXLINE prefix');

const analyticsDom = new JSDOM(
  '<a id="fixline-link" href="#fixline" data-fixline-event="homepage_to_fixline">FIXLINE</a>',
  { runScripts: 'outside-only', url: 'https://www.onlytrueperspective.tech/' }
);
const beaconCalls = [];
Object.defineProperty(analyticsDom.window.navigator, 'sendBeacon', {
  configurable: true,
  value(url, body) {
    beaconCalls.push({ url, body });
    return false;
  }
});
analyticsDom.window.eval(fixlineAnalytics);
analyticsDom.window.document.dispatchEvent(new analyticsDom.window.Event('DOMContentLoaded'));
const navigationEvent = new analyticsDom.window.MouseEvent('click', { bubbles: true, cancelable: true });
analyticsDom.window.document.getElementById('fixline-link').dispatchEvent(navigationEvent);
assert.strictEqual(beaconCalls.length, 1, 'one normal FIXLINE navigation emits one analytics event');
assert.strictEqual(navigationEvent.defaultPrevented, false, 'analytics failure never blocks FIXLINE navigation');

console.log('   OK: native OTP surfaces and bounded FIXLINE proxy contract');
console.log('FIXLINE INTEGRATION CONTRACT COMPLETE');
