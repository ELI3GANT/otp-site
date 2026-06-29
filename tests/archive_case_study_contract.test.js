const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const library = require('../otp-projects.js');

console.log('OTP ARCHIVE CASE-STUDY CONTRACT...');

const archive = read('archive.html');
const archiveClient = read('archive.js');
const archiveStyles = read('archive.css');
const notFound = read('404.html');
const sitemap = read('sitemap.xml');
const server = read('server.js');
const projects = library.getProjects();

assert.ok(Array.isArray(projects) && projects.length >= 3, 'archive exposes an initial multi-project collection');
assert.deepStrictEqual(
  library.getStatuses(),
  ['Live', 'Released', 'In Progress', 'Archived', 'Internal', 'Coming Soon'],
  'archive statuses remain standardized'
);

const requiredCategories = [
  'Architecture',
  'Music',
  'Events',
  'Branding',
  'Creative Direction',
  'AI',
  'Software',
  'Internal Systems',
  'Marketing',
  'Content Production',
  'Product Design',
  'Web Development',
  'Client Work',
  'Experimental'
];
requiredCategories.forEach((category) => {
  assert.ok(library.getCategories().includes(category), `standard category is available: ${category}`);
});

projects.forEach((project) => {
  [
    'id',
    'title',
    'shortDescription',
    'status',
    'launchDate',
    'projectUrl',
    'heroImage'
  ].forEach((field) => assert.ok(project[field], `${project.id} supplies ${field}`));
  ['categories', 'disciplines', 'services', 'technology', 'tags', 'collections'].forEach((field) => {
    assert.ok(Array.isArray(project[field]) && project[field].length > 0, `${project.id} supplies ${field}`);
  });
  assert.ok(project.heroImage.src && project.heroImage.alt, `${project.id} hero image is accessible`);
  assert.ok(library.getStatuses().includes(project.status), `${project.id} uses a supported status`);
});

const protocol = projects.find((project) => project.id === 'protocol');
const songWars = projects.find((project) => project.id === 'song-wars');
const hyh = projects.find((project) => project.id === 'hyh-architecture-design');

assert.ok(protocol && protocol.featured, 'PROTOCOL is a featured Archive case study');
assert.strictEqual(protocol.projectUrl, '/protocol', 'PROTOCOL links to its live project');
assert.ok(protocol.disciplines.includes('Music Rollout'), 'PROTOCOL exposes rollout discipline');
assert.ok(protocol.disciplines.includes('Brand Identity'), 'PROTOCOL exposes identity discipline');
assert.strictEqual(protocol.status, 'Released');

assert.ok(songWars && songWars.featured, 'Song Wars is a featured Archive case study');
assert.strictEqual(songWars.projectUrl, '/songwars', 'Song Wars links to its live project');
assert.ok(songWars.disciplines.includes('Live Event'), 'Song Wars exposes event discipline');
assert.ok(songWars.disciplines.includes('Community'), 'Song Wars exposes community discipline');
assert.strictEqual(songWars.status, 'Live');

assert.ok(hyh && hyh.beforeAfter, 'HYH keeps its existing before-and-after case-study media');
assert.strictEqual(hyh.heroFit, 'contain', 'HYH Archive card contains the project screenshot instead of cropping it');
assert.strictEqual(hyh.beforeAfter.before.width, 1600, 'HYH previous-state image declares its width');
assert.strictEqual(hyh.beforeAfter.before.height, 816, 'HYH previous-state image declares its height');
assert.strictEqual(hyh.beforeAfter.after.width, 1600, 'HYH rebuild image declares its width');
assert.strictEqual(hyh.beforeAfter.after.height, 869, 'HYH rebuild image declares its height');
assert.deepStrictEqual(
  library.getFeaturedProjects().map((project) => project.id),
  ['hyh-architecture-design'],
  'homepage featured work remains intentionally unchanged'
);

assert.ok(archive.includes('data-archive-projects'), 'archive mounts the dedicated project renderer');
assert.ok(archive.includes('data-archive-search'), 'archive exposes project search');
assert.ok(archive.includes('data-archive-category'), 'archive exposes category filtering');
assert.ok(archive.includes('data-archive-status'), 'archive exposes status filtering');
assert.ok(archive.includes('data-archive-year'), 'archive exposes year filtering');
assert.ok(archive.includes('data-archive-technology'), 'archive exposes technology filtering');
assert.ok(archive.includes('data-archive-timeline'), 'archive exposes the OTP timeline');
assert.ok(archive.includes('Featured Projects') && archive.includes('Internal Products'), 'archive exposes collection discovery');
assert.ok(archive.includes('data-video-feed="archive"'), 'existing visual vault remains available');
assert.ok(archive.includes('data-video-sync="curated"'), 'archive renders its curated video set without a launch-blocking sync');
assert.ok(archive.includes('archive.css?v=') && archive.includes('archive.js?v='), 'archive loads scoped production assets');
assert.ok(!/gsap|ScrollTrigger|supabase-js|kursor|dompurify|stars-v2/i.test(archive), 'archive avoids unrelated animation and application dependencies');
assert.ok(archive.includes('"@type": "CollectionPage"'), 'archive includes CollectionPage schema');
assert.ok(archive.includes('"@type": "ItemList"'), 'archive includes project ItemList schema');
assert.ok(archive.includes('https://www.onlytrueperspective.tech/protocol'), 'schema references PROTOCOL');
assert.ok(archive.includes('https://www.onlytrueperspective.tech/songwars'), 'schema references Song Wars');
assert.ok(archive.includes('https://www.onlytrueperspective.tech/archive'), 'archive metadata uses the clean public route');
assert.ok(!archive.includes('https://www.onlytrueperspective.tech/archive.html'), 'archive metadata does not publish the duplicate .html route');

assert.ok(archiveClient.includes('replaceChildren'), 'renderer updates project results without HTML injection');
assert.ok(archiveClient.includes('textContent'), 'renderer treats project copy as text');
assert.ok(archiveClient.includes("new URL("), 'renderer validates project links');
assert.ok(archiveClient.includes("aria-disabled"), 'future case-study action has an accessible unavailable state');
assert.ok(archiveClient.includes('archive-project-comparison'), 'archive renderer builds a real before-and-after comparison block');
assert.ok(archiveClient.includes('hasComparison') && archiveClient.includes(' has-comparison'), 'HYH comparison receives a dedicated contained card layout');
assert.ok(archiveStyles.includes('minmax(0, 1fr)'), 'archive grids prevent horizontal overflow');
assert.ok(archiveStyles.includes('object-fit: cover'), 'project card art preserves its aspect ratio');
assert.ok(archiveStyles.includes('.archive-page .bg-fixed::before'), 'archive renders a scoped CSS-only star/dot atmosphere');
assert.ok(archiveStyles.includes('.archive-project-comparison-image'), 'archive comparison screenshots are contained by a dedicated media class');
assert.ok(archiveStyles.includes('object-fit: contain'), 'archive comparison screenshots preserve their full aspect ratio');
assert.ok(/\[data-theme="light"\]\s+\.archive-page[\s\S]*?--archive-surface:\s*rgba\(9,\s*9,\s*12/.test(archiveStyles), 'archive keeps dark OTP case-study surfaces under global light theme');
assert.ok(
  /\.archive-case-study-card:not\(\.is-featured\)[\s\S]*?height:\s*clamp\(280px,\s*31vw,\s*430px\)/.test(archiveStyles),
  'standard Archive cards keep project screenshots bounded on desktop'
);
assert.ok(!archiveStyles.includes('height: 100%;\n  border-right'), 'standard Archive card media must not stretch across the content column');
assert.ok(archiveStyles.includes('prefers-reduced-motion'), 'archive respects reduced-motion preferences');

assert.match(server, /'\/archive': 'archive\.html'/, 'clean /archive route remains available');
assert.match(server, /'\/vault': 'archive\.html'/, 'legacy /vault alias remains available');
assert.match(server, /app\.get\('\/archive\.html',[^\n]+res\.redirect\(308, '\/archive'\)/, 'legacy archive.html route consolidates on the clean public URL');

assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/archive</loc>'), 'sitemap publishes the clean Archive route');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/protocol</loc>'), 'sitemap publishes PROTOCOL');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/songwars</loc>'), 'sitemap publishes Song Wars');
assert.ok(!sitemap.includes('https://www.onlytrueperspective.tech/archive.html'), 'sitemap avoids the duplicate Archive HTML URL');

['/styles.css', '/speed-insights-bundle.js'].forEach((asset) => {
  assert.ok(notFound.includes(asset), `404 uses a root-relative ${asset} asset on nested unknown routes`);
});
['theme-chrono.js', 'site-config.js', 'stars-v2.js', 'otp-attribution.js', 'site-init.js'].forEach((asset) => {
  assert.ok(!notFound.includes(asset), `404 remains standalone and does not load ${asset}`);
});
assert.ok(notFound.includes('/assets/otp-logo-transparent.png'), '404 renders the OTP logo from a root-relative asset');
assert.ok(notFound.includes('class="error-particles"'), '404 renders a CSS-only branded particle layer');
assert.ok(notFound.includes('href="/"'), '404 exposes a Return Home action');
assert.ok(notFound.includes('href="/archive"'), '404 exposes a View Archive action');
assert.ok(notFound.includes('href="/bookings"'), '404 exposes a Book OTP action');
assert.ok(notFound.includes('data-disable-service-worker="true"'), '404 avoids stale service-worker interception');

const dom = new JSDOM(archive, { url: 'https://www.onlytrueperspective.tech/archive', runScripts: 'outside-only' });
dom.window.eval(read('otp-projects.js'));
dom.window.eval(archiveClient);
const renderedDocument = dom.window.document;
assert.strictEqual(renderedDocument.querySelectorAll('.archive-case-study-card').length, projects.length, 'runtime renders every project');
assert.strictEqual(renderedDocument.querySelectorAll('.archive-project-action.is-unavailable[aria-disabled="true"]').length, projects.length, 'future case-study actions remain non-interactive');
assert.strictEqual(renderedDocument.querySelectorAll('.archive-project-action.is-unavailable[href]').length, 0, 'unavailable actions never receive a fallback URL');
const hyhCard = renderedDocument.querySelector('[data-project-id="hyh-architecture-design"]');
assert.ok(hyhCard && hyhCard.classList.contains('has-comparison'), 'HYH renders as a dedicated before-and-after card');
assert.strictEqual(hyhCard.querySelectorAll('.archive-project-comparison-panel').length, 2, 'HYH renders both before and after panels');
assert.ok(hyhCard.textContent.includes('Previous Website'), 'HYH before panel is explicitly labeled');
assert.ok(hyhCard.textContent.includes('OTP Rebuild'), 'HYH after panel is explicitly labeled');

console.log('   OK: OTP Archive case-study system');
console.log('OTP ARCHIVE CASE-STUDY CONTRACT COMPLETE');
