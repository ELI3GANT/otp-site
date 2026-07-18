/**
 * SEO indexing foundation: titles, descriptions, canonicals, robots, sitemap, schema.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const titleOf = (html) =>
  (html.match(/<title>([^<]+)<\/title>/i) || [])[1]
    ?.trim()
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
const metaDescription = (html) => (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1]?.trim();
const canonical = (html) => (html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1]?.trim();
const hasNoindex = (html) => /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);

console.log('SEO INDEXING CONTRACT...');

const pages = {
  'index.html': {
    title: 'OnlyTruePerspective | Rhode Island Creative Technology & Media Studio',
    canonical: 'https://www.onlytrueperspective.tech/',
    descriptionSnippet: 'helps artists, creators, and businesses',
    indexable: true
  },
  'bookings.html': {
    title: 'Start a Project | OnlyTruePerspective',
    canonical: 'https://www.onlytrueperspective.tech/bookings',
    descriptionSnippet: 'Book a project with OnlyTruePerspective',
    indexable: true
  },
  'archive.html': {
    title: 'Creative Archive | OnlyTruePerspective',
    canonical: 'https://www.onlytrueperspective.tech/archive',
    descriptionSnippet: 'Explore OnlyTruePerspective projects',
    indexable: true
  },
  'fixline.html': {
    title: 'OTP FIXLINE — A Clear Diagnosis for Your Business Presence',
    canonical: 'https://www.onlytrueperspective.tech/fixline',
    descriptionSnippet: 'Submit your public business presence',
    indexable: true
  },
  'consultant-audit.html': {
    title: 'Consultant Audit Service | OnlyTruePerspective',
    canonical: 'https://www.onlytrueperspective.tech/services/consultant-audit',
    descriptionSnippet: 'Start an OTP consultant audit',
    indexable: true
  },
  'insights.html': {
    title: 'Insights | OnlyTruePerspective',
    canonical: 'https://www.onlytrueperspective.tech/insights.html',
    descriptionSnippet: 'creative technology notes',
    indexable: true
  },
  'terms.html': {
    title: 'Terms | OnlyTruePerspective',
    canonical: 'https://www.onlytrueperspective.tech/terms.html',
    descriptionSnippet: 'Terms',
    indexable: true
  },
  'privacy.html': {
    title: 'Privacy Policy | OnlyTruePerspective',
    canonical: 'https://www.onlytrueperspective.tech/privacy.html',
    descriptionSnippet: 'Privacy',
    indexable: true
  },
  '404.html': {
    title: 'Page Not Found | OnlyTruePerspective',
    canonical: null,
    descriptionSnippet: 'not found',
    indexable: false
  }
};

const titles = new Set();
Object.entries(pages).forEach(([file, spec]) => {
  const html = read(file);
  const title = titleOf(html);
  const desc = metaDescription(html);
  assert.ok(title, `${file} must have <title>`);
  assert.strictEqual(title, spec.title, `${file} title`);
  assert.ok(desc && desc.length > 20, `${file} must have meta description`);
  assert.ok(desc.includes(spec.descriptionSnippet), `${file} description content`);
  if (spec.canonical) {
    assert.strictEqual(canonical(html), spec.canonical, `${file} canonical`);
    assert.ok(html.includes('property="og:url"'), `${file} og:url`);
    assert.ok(html.includes('property="og:title"'), `${file} og:title`);
    assert.ok(html.includes('property="og:description"'), `${file} og:description`);
    assert.ok(html.includes('property="og:type"'), `${file} og:type`);
    assert.ok(html.includes('name="twitter:card"'), `${file} twitter:card`);
  }
  if (spec.indexable) {
    assert.ok(!hasNoindex(html), `${file} must not use robots noindex`);
  }
  titles.add(title);
});
assert.strictEqual(titles.size, Object.keys(pages).length, 'main page titles must be unique');

const index = read('index.html');
assert.ok(index.includes('"@type": "ProfessionalService"'), 'homepage includes ProfessionalService schema');
assert.ok(index.includes('"serviceType"'), 'homepage schema lists service types');
assert.ok(index.includes('"areaServed"'), 'homepage schema includes areaServed');
assert.ok(index.includes('https://instagram.com/onlytrueperspective'), 'homepage schema sameAs includes Instagram');
assert.ok(!index.includes('"streetAddress"'), 'homepage schema must not expose private street address');

const robots = read('robots.txt');
assert.ok(/^User-agent: \*/m.test(robots), 'robots.txt allows crawlers');
assert.ok(/Allow: \//m.test(robots), 'robots.txt allows site root');
assert.ok(robots.includes('Sitemap: https://www.onlytrueperspective.tech/sitemap.xml'), 'robots.txt references sitemap');

const sitemap = read('sitemap.xml');
const requiredUrls = [
  'https://www.onlytrueperspective.tech/',
  'https://www.onlytrueperspective.tech/bookings',
  'https://www.onlytrueperspective.tech/songwars',
  'https://www.onlytrueperspective.tech/protocol',
  'https://www.onlytrueperspective.tech/archive',
  'https://www.onlytrueperspective.tech/fixline',
  'https://www.onlytrueperspective.tech/services/consultant-audit',
  'https://www.onlytrueperspective.tech/insights.html',
  'https://www.onlytrueperspective.tech/terms.html',
  'https://www.onlytrueperspective.tech/privacy.html'
];
requiredUrls.forEach((url) => {
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap includes ${url}`);
});
assert.ok(!sitemap.includes('https://onlytrueperspective.tech/'), 'sitemap must not use apex host without www');

const portal = read('portal.html');
assert.ok(hasNoindex(portal), 'client portal remains noindex');

console.log('   OK: SEO indexing contract');
console.log('SEO INDEXING CONTRACT COMPLETE');
