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
  ].forEach((field) => assert.ok(Object.prototype.hasOwnProperty.call(project, field), `${project.id} supplies ${field}`));
  assert.ok(project.launchDate === null || /^\d{4}-\d{2}-\d{2}$/.test(project.launchDate), `${project.id} has a real launch date or none`);
  assert.ok(typeof project.projectUrl === 'string', `${project.id} project destination is explicit`);
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

assert.ok(songWars && !songWars.featured, 'Song Wars remains archived without active featured placement');
assert.strictEqual(songWars.projectUrl, '', 'Song Wars no longer promotes its concluded event route');
assert.strictEqual(songWars.bookingUrl, '/bookings?source=archive-songwars&service=event-community-rollout', 'Song Wars routes conversion CTA to event rollout intake');
assert.ok(songWars.disciplines.includes('Live Event'), 'Song Wars exposes event discipline');
assert.ok(songWars.disciplines.includes('Community'), 'Song Wars exposes community discipline');
assert.strictEqual(songWars.status, 'Archived');
assert.strictEqual(songWars.bookingCtaLabel, 'Discuss an event project');

const vault = projects.find((project) => project.id === 'vault');
assert.ok(vault, 'VAULT appears in the Archive catalog');
assert.strictEqual(vault.status, 'Coming Soon');
assert.strictEqual(vault.launchDate, null, 'VAULT does not imply an unannounced launch date');
assert.strictEqual(vault.projectUrl, '', 'VAULT does not link to an unavailable product');
assert.strictEqual(vault.caseStudyUrl, '/projects/vault');
assert.ok(archive.includes('VAULT (Coming Soon)'), 'no-script Archive mentions VAULT as coming soon');
assert.ok(projects.find((project) => project.id === 'otp-os').projectUrl === '/os/', 'OTP OS links to its protected live surface');

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
for (const category of ['All', 'Video', 'Digital', 'Music / Campaigns']) assert.ok(archive.includes(`data-archive-collection="${category}"`));
for (const control of ['search', 'category', 'status', 'year', 'technology', 'result-count']) assert.ok(!archive.includes(`data-archive-${control}`), 'advanced public control removed: ' + control);
assert.ok(archive.includes('data-archive-timeline'), 'curated history is retained');
assert.ok(archive.includes('data-video-feed="archive"'), 'existing visual vault remains available');
assert.ok(archive.includes('data-video-sync="curated"'), 'archive renders its curated video set without a launch-blocking sync');
assert.ok(archive.includes('archive.css?v=') && archive.includes('archive.js?v='), 'archive loads scoped production assets');
assert.ok(!/gsap|ScrollTrigger|supabase-js|kursor|dompurify|stars-v2/i.test(archive), 'archive avoids unrelated animation and application dependencies');
assert.ok(archive.includes('"@type": "CollectionPage"'), 'archive includes CollectionPage schema');
assert.ok(archive.includes('"@type": "ItemList"'), 'archive includes project ItemList schema');
assert.ok(archive.includes('https://www.onlytrueperspective.tech/protocol'), 'schema references PROTOCOL');
assert.ok(archive.includes('https://www.onlytrueperspective.tech/projects/songwars'), 'schema references the Song Wars retrospective');
assert.ok(archive.includes('https://www.onlytrueperspective.tech/projects/vault'), 'schema references the VAULT preview');
assert.ok(archive.includes('https://www.onlytrueperspective.tech/archive'), 'archive metadata uses the clean public route');
assert.ok(!archive.includes('https://www.onlytrueperspective.tech/archive.html'), 'archive metadata does not publish the duplicate .html route');

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
assert.ok(!renderedDocument.querySelector('[data-archive-timeline]').textContent.includes('Invalid Date'), 'undated VAULT timeline entry stays readable');
assert.ok(renderedDocument.querySelector('[data-archive-timeline]').textContent.includes('Coming soon'), 'VAULT timeline entry has an honest date state');
const ids = () => [...renderedDocument.querySelectorAll('[data-project-id]')].map(card => card.dataset.projectId);
const choose = value => renderedDocument.querySelector(`[data-archive-collection="${value}"]`).click();
choose('Digital');
assert.deepStrictEqual(ids(), ['hyh-architecture-design', 'weatheros', 'otp-fixline', 'otp-os', 'vault']);
assert.equal(renderedDocument.querySelector('#motion').hidden, true);
assert.equal(dom.window.location.search, '?collection=Digital');
choose('Music / Campaigns');
assert.deepStrictEqual(ids(), ['protocol', 'song-wars']);
choose('Video');
assert.deepStrictEqual(ids(), []);
assert.equal(renderedDocument.querySelector('#motion').hidden, false);
assert.equal(renderedDocument.querySelector('[data-archive-project-section]').hidden, true);
assert.equal(renderedDocument.querySelector('[data-archive-empty]').hidden, true);
dom.window.history.replaceState({}, '', '/archive?collection=Internal+Products&search=weather&year=2026');
dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'));
assert.equal(ids().length, 5, 'legacy links never retain hidden advanced filters');
choose('All');
assert.equal(ids().length, 7);
assert.equal(dom.window.location.search, '');
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
assert.equal(projects.length, 7, 'all seven project stories are covered');
const otpOsStory = new JSDOM(renderProjectPage(projects.find((project) => project.id === 'otp-os'), projects)).window.document;
assert.ok([...otpOsStory.querySelectorAll('main a')].some((link) => link.getAttribute('href') === '/os/'), 'OTP OS story offers its protected live surface');
for (const project of projects) {
  const page = new JSDOM(renderProjectPage(project, projects)).window.document;
  assert.equal(page.querySelectorAll('h1').length, 1);
  assert.ok([...page.querySelectorAll('a')].some(a => a.getAttribute('href') === '/fixline/intake?source=project-' + project.slug), project.id + ' preserves attributed conversion');
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
console.log('Archive filtering, safe rendering and seven project detail contracts passed.');
