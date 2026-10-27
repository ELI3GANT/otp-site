const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('FLOOROPS LIVE OTP.TECH INTEGRATION CONTRACT...');

const homepage = read('index.html');
const flooropsLanding = read('floorops.html');
const projectLibrary = read('otp-projects.js');
const server = read('server.js');
const sitemap = read('sitemap.xml');
const vercelConfig = JSON.parse(read('vercel.json'));
const robots = read('robots.txt');

// 1. Homepage Navigation and Card
assert.ok(homepage.includes('href="/floorops"'), 'homepage navigation links to FloorOps');
const navMatches = homepage.match(/href="\/floorops"/g) || [];
assert.ok(navMatches.length >= 3, 'FloorOps is linked in desktop nav, mobile nav, and footer');
assert.ok(homepage.includes('home-systems-preview') && homepage.includes('OTP FloorOps'), 'FloorOps preview card exists on homepage');
assert.ok(homepage.includes('Warehouse exception management: 45-second dock reporting'), 'FloorOps preview card displays core value proposition');

// 2. Dedicated Landing Page (floorops.html)
assert.ok(flooropsLanding.includes('https://www.onlytrueperspective.tech/floorops'), 'landing page specifies canonical production URL');
assert.ok(flooropsLanding.includes('/public-system.css?v='), 'FloorOps loads shared public header/footer styling');
assert.ok(flooropsLanding.includes('@media(max-width:600px)'), 'FloorOps has responsive mobile layout');
assert.ok(flooropsLanding.includes('grid-template-columns:minmax(0,1fr)'), 'Mobile cards avoid horizontal overflow');
assert.ok(flooropsLanding.includes('class="fo-final"'), 'Bottom CTA has responsive heading');
assert.ok(flooropsLanding.includes('href="/floorops/demo"'), 'Demo CTA stays on OTP primary domain');
assert.ok(flooropsLanding.includes('href="/floorops/request-demo"'), 'Walkthrough CTA stays on OTP primary domain');
assert.ok(!flooropsLanding.includes('floorops.onlytrueperspective.com'), 'Legacy subdomain links were removed');
assert.ok(flooropsLanding.includes('SoftwareApplication'), 'landing page contains Schema.org SoftwareApplication structured data');
assert.ok(flooropsLanding.includes('$699'), 'landing page shows Core package official pricing ($699/mo)');
assert.ok(flooropsLanding.includes('$1,499'), 'landing page shows Premium Custom package official pricing ($1,499/mo)');
assert.ok(!flooropsLanding.includes('$500 pilot') && !flooropsLanding.includes('$500 Pilot'), 'retired $500 pilot pricing is strictly eliminated');
assert.ok(flooropsLanding.includes('Damaged Freight'), 'landing page features Scenario 1 (Damaged)');
assert.ok(flooropsLanding.includes('Missing Freight'), 'landing page features Scenario 2 (Missing)');
assert.ok(flooropsLanding.includes('Quarantine Staging Holds'), 'landing page features Scenario 3 (Quarantined)');
assert.ok(flooropsLanding.includes('Broken Trailer Seals'), 'landing page features Scenario 4 (Broken Seal)');
assert.ok(flooropsLanding.includes('Delivery Discrepancies'), 'landing page features Scenario 5 (Delivery Discrepancy)');

// 3. Project Library (otp-projects.js)
assert.ok(projectLibrary.includes("id: 'floorops'"), 'Project library includes floorops catalog entry');
assert.ok(projectLibrary.includes("projectUrl: '/floorops'"), 'Project library routes to canonical /floorops');
assert.ok(projectLibrary.includes("demoUrl: '/floorops/demo'"), 'Project library links to interactive demo at /floorops/demo');
assert.ok(projectLibrary.includes("bookingUrl: '/floorops/request-demo'"), 'Project library links to lead capture at /floorops/request-demo');

// 4. Server Proxy (server.js)
assert.ok(server.includes("app.get(['/floorops', '/floorops/']"), 'server.js registers /floorops HTML route');
assert.ok(server.includes('proxyFloorOpsApp'), 'server.js defines proxyFloorOpsApp handler');
assert.ok(server.includes("127.0.0.1:3200"), 'proxy routes to local FloorOps instance port 3200');
assert.ok(server.includes("readProxyRequestBody"), 'proxy safely forwards streaming request bodies');
assert.ok(server.includes("FLOOROPS_UPSTREAM_ORIGIN"), 'proxy allows configurable upstream origin with safe default');

// 5. Vercel Configuration (vercel.json)
const routes = vercelConfig.routes || [];
const flooropsHtmlRoute = routes.find(r => r.src === '^/floorops/?$' && r.dest === '/floorops.html');
assert.ok(flooropsHtmlRoute, 'vercel.json maps ^/floorops/?$ to /floorops.html');
const demoRoute = routes.find(r => r.src === '^/floorops/demo/?$');
assert.ok(demoRoute && demoRoute.dest && demoRoute.dest.includes('/demo'), 'vercel.json proxies demo route');
const pricingRoute = routes.find(r => r.src === '^/floorops/pricing/?$');
assert.ok(pricingRoute && pricingRoute.dest && pricingRoute.dest.includes('/pricing'), 'vercel.json proxies pricing route');
const requestDemoRoute = routes.find(r => r.src === '^/floorops/request-demo/?$');
assert.ok(requestDemoRoute && requestDemoRoute.dest && requestDemoRoute.dest.includes('/request-demo'), 'vercel.json proxies request-demo route');

// 6. Sitemap.xml Inclusion
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/floorops</loc>'), 'sitemap includes /floorops');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/floorops/demo</loc>'), 'sitemap includes /floorops/demo');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/floorops/pricing</loc>'), 'sitemap includes /floorops/pricing');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/floorops/request-demo</loc>'), 'sitemap includes /floorops/request-demo');

// 7. Founder Confidentiality & Security
assert.ok(!robots.includes('/sales/demo-script'), 'robots.txt does not leak internal sales routes');
assert.ok(routes.every(r => !/demo-script|storyboard|founding-offer/i.test(r.src)), 'no internal sales scripts are exposed in vercel routes');

// 8. Archive & Studio Portfolio Integration
const archiveHtml = read('archive.html');
const archiveJs = read('archive.js');
const studioHtml = read('studio.html');
assert.ok(archiveHtml.includes('href="/floorops"'), 'archive.html navigation includes FloorOps');
assert.ok(archiveHtml.includes('data-project-id="floorops"'), 'archive.html includes FloorOps project card');
assert.ok(archiveJs.includes("'floorops'"), 'archive.js project order includes floorops');
assert.ok(studioHtml.includes('href="/floorops"'), 'studio.html navigation includes FloorOps');

console.log('✅ All 8 FloorOps live OTP.tech integration contract checks PASSED!');
