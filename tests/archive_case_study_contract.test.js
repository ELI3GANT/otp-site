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
  ['Live', 'Released', 'In Progress', 'Archived', 'Internal', 'Private Beta', 'Coming Soon'],
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
  'Experimental',
  'Business Diagnostic'
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
    'bookingUrl',
    'bookingCtaLabel',
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
assert.strictEqual(protocol.bookingUrl, '/bookings?source=archive-protocol&service=artist-campaign', 'PROTOCOL routes conversion CTA to artist campaign intake');
assert.ok(protocol.disciplines.includes('Music Rollout'), 'PROTOCOL exposes rollout discipline');
assert.ok(protocol.disciplines.includes('Brand Identity'), 'PROTOCOL exposes identity discipline');
assert.strictEqual(protocol.status, 'Released');

assert.ok(songWars && songWars.featured, 'Song Wars is a featured Archive case study');
assert.strictEqual(songWars.projectUrl, '/songwars', 'Song Wars links to its live project');
assert.strictEqual(songWars.bookingUrl, '/bookings?source=archive-songwars&service=event-community-rollout', 'Song Wars routes conversion CTA to event rollout intake');
assert.ok(songWars.disciplines.includes('Live Event'), 'Song Wars exposes event discipline');
assert.ok(songWars.disciplines.includes('Community'), 'Song Wars exposes community discipline');
assert.strictEqual(songWars.status, 'Released');

assert.ok(hyh && hyh.beforeAfter, 'HYH keeps its existing before-and-after case-study media');
assert.strictEqual(hyh.bookingUrl, '/bookings?source=archive-hyh&service=website-business-fix', 'HYH routes conversion CTA to website/business fix intake');
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
assert.ok(archive.includes('/bookings?source=archive'), 'Archive closing CTA uses the general booking flow');
assert.ok(archive.includes('/bookings?source=public-nav'), 'Archive generic navigation uses the general booking flow');
assert.ok(archive.includes('/fixline/intake?source=archive-fixline'), 'Archive keeps FIXLINE-specific intake isolated');

assert.ok(archiveClient.includes('replaceChildren'), 'renderer updates project results without HTML injection');
assert.ok(archiveClient.includes('textContent'), 'renderer treats project copy as text');
assert.ok(archiveClient.includes("new URL("), 'renderer validates project links');
assert.ok(archiveClient.includes("aria-disabled"), 'future case-study action has an accessible unavailable state');
assert.ok(read('public-system.css').includes('prefers-reduced-motion'), 'shared Archive design respects reduced motion');

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
assert.strictEqual(renderedDocument.querySelectorAll('.archive-project-action-primary').length, projects.length, 'runtime renders one primary action per project');
assert.strictEqual(renderedDocument.querySelectorAll('.archive-project-action-conversion').length, projects.length, 'runtime renders one booking conversion action per project');
const ids = () => [...renderedDocument.querySelectorAll('[data-project-id]')].map(card => card.dataset.projectId);
const set = (key, value) => {
  const control = renderedDocument.querySelector(`[data-archive-${key}]`);
  control.value = value;
  control.dispatchEvent(new dom.window.Event(key === 'search' ? 'input' : 'change', { bubbles: true }));
};
const reset = () => renderedDocument.querySelector('[data-archive-reset]').click();
set('search', 'HYH');
assert.deepStrictEqual(ids(), [hyh.id], 'search narrows results');
set('status', hyh.status);
set('category', hyh.categories[0]);
set('technology', hyh.technology[0]);
set('year', String(hyh.year));
assert.deepStrictEqual(ids(), [hyh.id], 'all filters combine with search');
set('search', 'unmatched-project-123');
assert.deepStrictEqual(ids(), []);
assert.strictEqual(renderedDocument.querySelector('[data-archive-empty]').hidden, false, 'empty search explains zero results');
assert.match(renderedDocument.querySelector('[data-archive-result-count]').textContent, /^00/);
reset();
assert.strictEqual(ids().length, projects.length, 'reset restores whole catalog');
assert.strictEqual(renderedDocument.querySelector('[data-archive-empty]').hidden, true);
for (const key of ['search', 'category', 'technology', 'year', 'status']) assert.equal(renderedDocument.querySelector(`[data-archive-${key}]`).value, '', 'reset clears ' + key);
for (const button of renderedDocument.querySelectorAll('[data-archive-collection]')) {
  button.click();
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  const collection = button.dataset.archiveCollection;
  const expected = projects.filter(project => collection === 'Everything' || (collection === 'Creative' ? project.collections.some(c => ['Music', 'Events'].includes(c)) : project.collections.includes(collection)));
  assert.deepStrictEqual(ids().sort(), expected.map(project => project.id).sort(), collection + ' shows correct projects');
}
reset();
for (const project of projects) {
  const card = renderedDocument.querySelector(`[data-project-id="${project.id}"]`);
  assert.equal(card.querySelector('.archive-project-action-primary').getAttribute('href'), new URL(project.caseStudyUrl, dom.window.location.origin).href);
  assert.equal(card.querySelector('.archive-project-action-conversion').getAttribute('href'), new URL(project.bookingUrl, dom.window.location.origin).href);
}
const image = renderedDocument.querySelector('.archive-project-media img');
image.dispatchEvent(new dom.window.Event('error'));
assert.equal(image.hidden, true);
assert.ok(renderedDocument.querySelector('.archive-image-unavailable'), 'broken image has truthful unavailable state');
dom.window.close();
const { renderProjectPage } = require('../project-stories');
assert.equal(projects.length, 6, 'all six project stories are covered');
for (const project of projects) {
  const page = new JSDOM(renderProjectPage(project, projects)).window.document;
  assert.equal(page.querySelectorAll('h1').length, 1);
  const conversionHref = page.querySelector('.project-contact .project-action').getAttribute('href');
  if (project.id === 'otp-fixline') {
    assert.equal(conversionHref, project.bookingUrl, project.id + ' preserves FIXLINE conversion isolation');
  } else {
    assert.equal(conversionHref, project.bookingUrl, project.id + ' routes conversion to its attributed general booking path');
  }
  assert.equal(page.querySelectorAll('.project-story-grid > div').length, 5, project.id + ' exposes problem, solution, deliverables, result, and capabilities');
  assert.ok(page.querySelector('.project-contact h2').textContent.trim(), project.id + ' gives a contextual next step');
  assert.ok(page.querySelector('script[type="application/ld+json"]'), project.id + ' exposes CreativeWork schema');
  assert.ok(page.querySelector('.project-status-note').textContent.trim(), project.id + ' gives evidence context');
  assert.doesNotMatch(page.body.textContent, /\b\d+(?:\.\d+)?\s*(?:%|x growth|million users|conversions)/i, 'no fabricated performance metrics');
  for (const img of page.querySelectorAll('main img')) {
    assert.ok(img.alt);
    assert.ok(img.width && img.height);
    assert.ok(fs.existsSync(path.join(root, img.getAttribute('src'))), project.id + ' local evidence asset exists');
  }
  if (project.id === hyh.id) {
    assert.equal(page.querySelectorAll('.project-comparison figure').length, 2);
    for (const state of ['before', 'after']) {
      assert.ok(page.querySelector('.project-comparison').textContent.includes(hyh.beforeAfter[state].label));
      assert.ok([...page.querySelectorAll('.project-comparison img')].some(img => img.getAttribute('src').endsWith(hyh.beforeAfter[state].src)), 'comparison uses original evidence');
    }
  }
}
const hostile = new JSDOM(archive, { url: 'https://www.onlytrueperspective.tech/archive', runScripts: 'outside-only' });
const unsafeProjects = projects.map(p => ({ ...p, title: '<img src=x onerror=alert(1)>', caseStudyUrl: 'javascript:alert(1)', bookingUrl: 'data:text/html,bad', heroImage: { ...p.heroImage, src: 'javascript:alert(1)' } }));
hostile.window.OTP_PROJECT_LIBRARY = { ...library, getProjects: () => unsafeProjects };
hostile.window.eval(archiveClient);
assert.equal(hostile.window.document.querySelectorAll('[href^="javascript:"], [href^="data:"], [src^="javascript:"], [onerror]').length, 0, 'unsafe project URLs and markup cannot execute');
assert.equal(hostile.window.document.querySelectorAll('.archive-project-action-primary[aria-disabled="true"]').length, projects.length);
hostile.window.close();
console.log('Archive filtering, safe rendering and six project detail contracts passed.');
