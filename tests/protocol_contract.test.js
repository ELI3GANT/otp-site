const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const html = read('protocol.html');
const css = read('protocol.css');
const js = read('protocol.js');
const server = read('server.js');
const index = read('index.html');
const packageJson = JSON.parse(read('package.json'));
const vercelProject = JSON.parse(read('.vercel/project.json'));

const DISTROKID_URL = 'https://distrokid.com/hyperfollow/eli711/protocol?ref=release';
const RELEASE_TARGET = '2026-06-26T00:00:00-04:00';
const releaseMs = Date.parse(RELEASE_TARGET);

function renderProtocolAt(nowMs) {
  const dom = new JSDOM(html, {
    url: 'https://www.onlytrueperspective.tech/protocol',
    runScripts: 'outside-only'
  });

  dom.window.Date.now = () => nowMs;
  dom.window.setInterval = () => 0;
  dom.window.eval(js);
  return dom;
}

function text(dom, selector) {
  const node = dom.window.document.querySelector(selector);
  assert.ok(node, `${selector} exists`);
  return node.textContent.trim().replace(/\s+/g, ' ');
}

function countNeedle(files, needle) {
  return files.reduce((total, file) => total + (file.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 0);
}

function walkSourceFiles(directory) {
  const ignoredDirectories = new Set(['.git', 'node_modules', 'output']);
  const acceptedExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs']);
  const files = [];

  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    if (ignoredDirectories.has(entry.name)) return;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
      return;
    }
    if (acceptedExtensions.has(path.extname(entry.name))) files.push(fullPath);
  });

  return files;
}

assert.match(server, /'\/protocol': 'protocol\.html'/, 'server exposes clean /protocol route');
assert.match(server, /app\.get\('\/',/, 'homepage route still exists');
assert.ok(index.includes('OnlyTruePerspective'), 'homepage still renders normal OTP content');
assert.ok(!index.includes('PROTOCOL is a dark, focused EP'), 'homepage was not replaced by protocol copy');

assert.ok(html.includes('<title>PROTOCOL — ELI3GANT</title>'), 'protocol title is set');
assert.ok(html.includes('rel="canonical" href="https://www.onlytrueperspective.tech/protocol"'), 'canonical protocol URL is set');
assert.ok(html.includes('property="og:title"'), 'Open Graph metadata is present');
assert.ok(html.includes('name="twitter:card"'), 'Twitter metadata is present');
assert.ok(html.includes(RELEASE_TARGET), 'official release target is configured');
assert.strictEqual(countNeedle([html, css, js], DISTROKID_URL), 1, 'DistroKid URL is centralized once');

[
  'PO!NT',
  'SIMULATION',
  'BEZEL',
  'NOINTRO',
  'BETTER WAYS',
  'PARAGON to NXIS.ZIP to PROTOCOL to BLACK_BOX'
].forEach((copy) => {
  assert.ok(html.includes(copy), `${copy} appears on the protocol page`);
});

assert.ok(html.includes('Available everywhere after release.'), 'pre-release availability copy is present');
assert.ok(!html.includes('PROTOCOL_OVERRIDE.EXE'), 'old override language is removed');
assert.ok(!html.includes('SYSTEM ONLINE'), 'old hacker-style status copy is removed');
assert.ok(!html.includes('SoundCloud'), 'old SoundCloud CTA is removed');
assert.ok(!html.includes('STREAMING LINKS COMING SOON'), 'old placeholder streaming copy is removed');
assert.ok(!html.includes('<audio'), 'protocol page does not render audio elements');
assert.ok(!html.includes('autoplay') && !js.includes('autoplay'), 'protocol page has no autoplay audio');
assert.ok(!html.includes('/api/'), 'protocol HTML does not reference APIs');
assert.ok(!html.includes('otp-os.vercel.app'), 'protocol page does not reference OTP OS');
assert.ok(!html.includes('stripe'), 'protocol page does not reference Stripe');
assert.ok(!html.includes('supabase'), 'protocol page does not reference Supabase');

assert.ok(css.includes('prefers-reduced-motion'), 'protocol CSS respects reduced motion');
assert.ok(css.includes('overflow-x: hidden'), 'protocol CSS protects against horizontal overflow');
assert.ok(css.includes('@media (max-width: 820px)'), 'protocol CSS has tablet and mobile layout rules');
assert.ok(css.includes('@media (max-width: 390px)'), 'protocol CSS has small phone layout rules');
assert.ok(css.includes('min-height: 48px'), 'primary links meet minimum tap target sizing');
assert.ok(css.includes('backdrop-filter'), 'protocol page uses premium glass styling');

assert.ok(!js.includes('fetch('), 'protocol page does not collect or submit data');
assert.ok(!js.includes('localStorage'), 'protocol page does not store visitor data');
assert.ok(js.includes('getProtocolReleaseState'), 'release proximity logic is implemented');

[
  {
    label: 'more than 72 hours before release',
    nowMs: releaseMs - (4 * 24 * 60 * 60 * 1000),
    state: 'sealed',
    status: 'Archive sealed',
    cta: 'Pre-save PROTOCOL'
  },
  {
    label: 'within 72 hours',
    nowMs: releaseMs - (48 * 60 * 60 * 1000),
    state: 'approaching',
    status: 'Signal approaching.',
    cta: 'Open HyperFollow'
  },
  {
    label: 'within 24 hours',
    nowMs: releaseMs - (12 * 60 * 60 * 1000),
    state: 'day',
    status: 'Archive unlock pending.',
    cta: 'Pre-save PROTOCOL'
  },
  {
    label: 'within 1 hour',
    nowMs: releaseMs - (30 * 60 * 1000),
    state: 'hour',
    status: 'Final signal window.',
    cta: 'Pre-save PROTOCOL'
  },
  {
    label: 'after release',
    nowMs: releaseMs + 1000,
    state: 'released',
    status: 'Stream PROTOCOL.',
    cta: 'Listen Everywhere'
  }
].forEach((scenario) => {
  const dom = renderProtocolAt(scenario.nowMs);
  assert.strictEqual(dom.window.document.body.dataset.protocolState, scenario.state, `${scenario.label} state is set`);
  assert.strictEqual(text(dom, '[data-protocol-status]'), scenario.status, `${scenario.label} status appears`);
  assert.strictEqual(text(dom, '[data-protocol-cta]'), scenario.cta, `${scenario.label} CTA appears`);
  dom.window.document.querySelectorAll('[data-protocol-link]').forEach((link) => {
    assert.strictEqual(link.href, DISTROKID_URL, `${scenario.label} CTA uses DistroKid URL`);
    assert.strictEqual(link.getAttribute('target'), '_blank', `${scenario.label} CTA opens a new tab`);
    assert.strictEqual(link.getAttribute('rel'), 'noopener noreferrer', `${scenario.label} CTA has safe rel`);
  });
  dom.window.close();
});

const forbiddenProtocolSitePath = path.join('/Users/eli/OTP', 'protocol-site');
walkSourceFiles(root).forEach((file) => {
  assert.ok(!fs.readFileSync(file, 'utf8').includes(forbiddenProtocolSitePath), `${path.relative(root, file)} does not reference abandoned protocol-site path`);
});

assert.strictEqual(vercelProject.projectName, 'otp-site', 'Vercel project remains otp-site');
assert.ok(!JSON.stringify(vercelProject).includes('protocol-site'), 'Vercel project does not reference protocol-site');
Object.values(packageJson.scripts || {}).forEach((script) => {
  assert.ok(!script.includes('vercel link'), 'package scripts do not relink Vercel projects');
});

console.log('PROTOCOL release contract passed.');
