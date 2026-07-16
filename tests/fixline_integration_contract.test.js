const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('FIXLINE INTEGRATION CONTRACT...');

const homepage = read('index.html');
const archive = read('archive.html');
const projectLibrary = read('otp-projects.js');
const server = read('server.js');
const sitemap = read('sitemap.xml');
const vercelConfig = JSON.parse(read('vercel.json'));
const fixlinePage = read('fixline.html');
const consultantAuditPage = read('consultant-audit.html');
const sharedStyles = read('styles.css');
const fixlineStyles = read('fixline-service.css');

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

assert.ok(fixlinePage.includes('rel="canonical" href="https://www.onlytrueperspective.tech/fixline"'), 'FIXLINE page owns the canonical URL');
assert.ok(fixlinePage.includes('href="/fixline/intake"'), 'FIXLINE page starts the real intake');
assert.ok(fixlinePage.includes('href="/services/consultant-audit"'), 'FIXLINE page connects to consultant audit');
assert.ok(consultantAuditPage.includes('rel="canonical" href="https://www.onlytrueperspective.tech/services/consultant-audit"'), 'consultant audit owns its canonical URL');
assert.ok(consultantAuditPage.includes('href="/fixline/intake"'), 'consultant audit starts with FIXLINE');
assert.ok(server.includes("'/services/consultant-audit'"), 'Express serves the consultant audit route');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/fixline</loc>'), 'sitemap contains FIXLINE');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/services/consultant-audit</loc>'), 'sitemap contains consultant audit');
assert.ok(fixlineStyles.includes('.fixline-service-page .nav-links a'), 'FIXLINE pages own a readable navigation color');
assert.ok(fixlineStyles.includes('.fixline-service-page .nav.scrolled'), 'FIXLINE keeps its dark navigation contrast after scrolling');
assert.ok(sharedStyles.includes('.archive-page.nav-open .nav-drawer a.active'), 'Archive mobile navigation preserves current-route emphasis');

const routes = vercelConfig.routes || [];
const fixedOrigin = 'https://otp-fixline.vercel.app';
const proxied = routes.filter((route) => typeof route.dest === 'string' && route.dest.startsWith(fixedOrigin));
assert.ok(proxied.length >= 8, 'Vercel proxies the complete allowlisted public FIXLINE surface');
assert.ok(proxied.every((route) => route.src.startsWith('^/fixline/')), 'every FIXLINE proxy is bounded below /fixline');
assert.ok(proxied.every((route) => !/admin/i.test(route.src) && !/admin/i.test(route.dest)), 'no FIXLINE admin route is proxied');
assert.ok(proxied.some((route) => route.src === '^/fixline/api/review/submit/?$'), 'submission proxy is exact');
assert.ok(proxied.some((route) => route.src === '^/fixline/_next/(.*)$'), 'Next assets are bounded to the FIXLINE prefix');

console.log('   OK: native OTP surfaces and bounded FIXLINE proxy contract');
console.log('FIXLINE INTEGRATION CONTRACT COMPLETE');
