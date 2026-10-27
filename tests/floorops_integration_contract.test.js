const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const homepage = read('index.html');
const landing = read('floorops.html');
const archiveHtml = read('archive.html');
const archiveJs = read('archive.js');
const library = require('../otp-projects.js');
const server = read('server.js');
const studio = read('studio.html');
const sitemap = read('sitemap.xml');
const robots = read('robots.txt');
const { routes } = JSON.parse(read('vercel.json'));
const upstream = 'https://otp-floorops.vercel.app';
const route = src => routes.find(r => r.src === src);
const index = src => routes.findIndex(r => r.src === src);

assert.ok(homepage.includes('href="/floorops"'), 'homepage links to FloorOps');
assert.ok(homepage.includes('home-systems-preview') && homepage.includes('OTP FloorOps'), 'homepage previews FloorOps');
assert.ok(landing.includes('https://www.onlytrueperspective.tech/floorops'), 'landing specifies canonical production URL');
assert.ok(landing.includes('/public-system.css?v='), 'landing loads common header and footer styling');
assert.ok(landing.includes('@media(max-width:600px)'), 'landing uses mobile responsive layouts');
assert.ok(landing.includes('grid-template-columns:minmax(0,1fr)'), 'mobile cards avoid horizontal scrolling');
assert.ok(landing.includes('class="fo-section fo-final"'), 'landing includes final walkthrough CTA');
assert.ok(landing.includes('href="/floorops/demo"'), 'landing links to branded showroom');
assert.ok(landing.includes('href="/floorops/request-demo"'), 'landing links to branded inquiry page');
assert.ok(!landing.includes('floorops.onlytrueperspective.com'), 'no obsolete public subdomain');
assert.ok(landing.includes('SoftwareApplication'), 'structured software data is present');
assert.ok(landing.includes('$699') && landing.includes('$1,499'), 'both current packages are displayed');
for (const label of ['Damaged Freight','Missing Freight','Quarantine Staging Holds','Broken Trailer Seals','Delivery Discrepancies']) {
  assert.ok(landing.includes(label), 'landing shows scenario: ' + label);
}
const floorops = library.getProjects().find(p => p.id === 'floorops');
assert.ok(floorops, 'project library includes FloorOps');
assert.equal(floorops.heroImage.src, '/images/warehouse/handheld-barcode-scanning.jpg', 'archive uses warehouse photograph');
assert.equal(floorops.demoUrl, '/floorops/demo', 'project links to branded demo');
assert.equal(floorops.bookingUrl, '/floorops/request-demo', 'project links to branded inquiry');

assert.ok(server.includes("app.get(['/floorops', '/floorops/']"), 'Express serves branded landing');
assert.ok(server.includes('proxyFloorOpsApp'), 'Express includes FloorOps proxy');
assert.ok(server.includes('readProxyRequestBody'), 'Express forwards bounded request bodies');
assert.ok(!server.includes('floorops.onlytrueperspective.com'), 'Express never falls back to obsolete domain');

assert.equal(route('^/floorops/?$')?.dest, '/floorops.html', 'landing served locally');
for (const [source, dest] of [
  ['^/floorops/demo/?$', upstream + '/demo'],
  ['^/floorops/pricing/?$', upstream + '/pricing'],
  ['^/floorops/request-demo/?$', upstream + '/request-demo'],
  ['^/floorops/contact/?$', upstream + '/contact'],
  ['^/floorops/api/(.*)$', upstream + '/api/$1'],
  ['^/_next/(.*)$', upstream + '/_next/$1'],
  ['^/images/warehouse/(.*)$', upstream + '/images/warehouse/$1'],
]) {
  assert.equal(route(source)?.dest, dest, 'public routing: ' + source);
}
for (const [source, dest] of [
  ['^/floorops/login/?$', upstream + '/login'],
  ['^/floorops/join/?$', upstream + '/join'],
  ['^/floorops/app/?$', upstream + '/app'],
  ['^/floorops/app/(.*)$', upstream + '/app/$1'],
]) {
  assert.equal(route(source)?.status, 307, 'warehouse app redirects to isolated origin: ' + source);
  assert.equal(route(source)?.headers?.Location, dest, 'warehouse app destination: ' + source);
  assert.ok(index(source) < index('^/floorops/(.*)$'), 'secure app route precedes catch-all: ' + source);
}
assert.ok(index('^/floorops/api/(.*)$') < index('^/floorops/(.*)$'), 'API route precedes catch-all');

for (const suffix of ['', '/demo', '/pricing', '/request-demo']) {
  assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/floorops' + suffix + '</loc>'), 'sitemap includes FloorOps ' + suffix);
}
assert.ok(!robots.includes('/sales/demo-script'), 'robots does not publicize private sales tools');
assert.ok(routes.every(r => !/demo-script|storyboard|founding-offer/i.test(r.src)), 'private sales tools are not explicitly exposed');
assert.ok(archiveHtml.includes('data-project-id="floorops"'), 'Archive includes FloorOps card');
assert.ok(archiveHtml.includes('/images/warehouse/handheld-barcode-scanning.jpg'), 'Archive static card uses warehouse image');
assert.ok(archiveJs.includes('archive-floorops-mark-title'), 'Archive JS preserves FloorOps branding');
assert.ok(studio.includes('href="/floorops"'), 'Studio navigation includes FloorOps');
console.log('FloorOps live integration contract passed.');
