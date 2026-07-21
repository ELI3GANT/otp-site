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
const releaseManifest = JSON.parse(read('release-manifest.json'));
const vercelProjectPath = path.join(root, '.vercel', 'project.json');
const vercelProject = fs.existsSync(vercelProjectPath)
  ? JSON.parse(fs.readFileSync(vercelProjectPath, 'utf8'))
  : null;

const DISTROKID_URL = 'https://distrokid.com/hyperfollow/eli711/protocol?ref=release';
const RELEASE_TARGET = '2026-06-26T00:00:00-04:00';
const EP_DESCRIPTION = 'PROTOCOL is a dark, focused EP built on control, pressure, and transformation. A cinematic entry into ELI3GANT’s next phase. Precise, intentional, and fully independent.';
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

function visibleProtocolLinks(dom) {
  return Array.from(dom.window.document.querySelectorAll('[data-protocol-link]')).filter((link) => !link.hidden);
}

function trackText(dom) {
  return text(dom, '[data-protocol-tracks]');
}

function trackNames(dom) {
  return Array.from(dom.window.document.querySelectorAll('[data-track-name]')).map((node) => node.textContent.trim().replace(/\s+/g, ' '));
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
assert.ok(html.includes(EP_DESCRIPTION), 'exact approved EP description is present');
assert.ok(html.includes(RELEASE_TARGET), 'official release target is configured');
assert.strictEqual(countNeedle([html, css, js], DISTROKID_URL), 1, 'DistroKid URL is centralized once');

[
  'TRACK 01 // NO INPUT',
  'TRACK 02 // LOCKED',
  'TRACK 03 // REDACTED',
  'TRACK 04 // FINAL WAYPOINT',
  'TRACK 05 // SIGNAL MASKED',
  'PARAGON to NXIS.ZIP to PROTOCOL to BLACK_BOX'
].forEach((copy) => {
  assert.ok(html.includes(copy), `${copy} appears on the protocol page`);
});

[
  'data-track-title="NO INTRO"',
  'data-track-title="PO!NT"',
  'data-track-title="BEZEL"',
  'data-track-title="BETTER_WAYS"',
  'data-track-title="SIMULATION"'
].forEach((copy) => assert.ok(html.includes(copy), `${copy} is stored for release-state reveal`));

const realTrackOrder = ['NO INTRO', 'PO!NT', 'BEZEL', 'BETTER_WAYS', 'SIMULATION'];
let lastTrackIndex = -1;
realTrackOrder.forEach((track) => {
  const index = html.indexOf(`data-track-title="${track}"`);
  assert.ok(index > lastTrackIndex, `${track} appears in correct source track order`);
  lastTrackIndex = index;
});
assert.ok(html.includes('Link unlocks closer to release.'), 'early release window message is present');
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
assert.ok(css.includes('--protocol-purple: #8b5cf6'), 'purple accent system is present');
assert.ok(css.includes('--protocol-violet: #a855f7'), 'electric violet accent is present');
assert.ok(css.includes('--protocol-magenta: #d946ef'), 'magenta edge accent is present');
assert.ok(!css.includes('--protocol-gold'), 'gold variables are not used as the protocol theme');
assert.ok(!css.includes('213, 181, 108'), 'old amber RGB accent is not used as the main theme');
assert.ok(css.includes('.protocol-noise'), 'background noise layer exists');
assert.ok(css.includes('.protocol-scan'), 'background scan layer exists');
assert.ok(css.includes('.protocol-glitch-field'), 'controlled background glitch layer exists');
assert.ok(css.includes('protocolGlitchField'), 'controlled glitch animation exists');
assert.ok(css.includes('.protocol-release-mark'), 'post-release marker styling is present');

assert.ok(!js.includes('fetch('), 'protocol page does not collect or submit data');
assert.ok(!js.includes('localStorage'), 'protocol page does not store visitor data');
assert.ok(js.includes('getProtocolReleaseState'), 'release proximity logic is implemented');
assert.ok(js.includes('data-protocol-secondary-cta'), 'secondary CTA changes with release state');
assert.ok(js.includes('updateTracks'), 'track reveal behavior is state-driven');
assert.ok(js.includes('updateTimeline'), 'timeline active state is state-driven');

[
  {
    label: 'more than 72 hours before release',
    nowMs: releaseMs - (4 * 24 * 60 * 60 * 1000),
    state: 'sealed',
    status: 'Archive sealed',
    cta: 'Pre-save PROTOCOL',
    secondaryCta: 'Open HyperFollow',
    availability: 'Link unlocks closer to release.',
    visibleCtas: [],
    trackMode: 'locked',
    tracks: ['TRACK 01 // NO INPUT', 'TRACK 02 // LOCKED', 'TRACK 03 // REDACTED', 'TRACK 04 // FINAL WAYPOINT', 'TRACK 05 // SIGNAL MASKED'],
    hiddenTracks: ['NO INTRO', 'PO!NT', 'BEZEL', 'BETTER_WAYS', 'SIMULATION'],
    protocolEraState: 'encrypted',
    countdownHidden: false,
    releaseMarkHidden: true
  },
  {
    label: 'within 72 hours',
    nowMs: releaseMs - (48 * 60 * 60 * 1000),
    state: 'approaching',
    status: 'Signal approaching.',
    cta: 'Pre-save PROTOCOL',
    secondaryCta: 'Open HyperFollow',
    availability: 'Signal approaching.',
    visibleCtas: ['Open HyperFollow'],
    trackMode: 'locked',
    tracks: ['TRACK 01 // NO INPUT', 'TRACK 02 // LOCKED', 'TRACK 03 // REDACTED', 'TRACK 04 // FINAL WAYPOINT', 'TRACK 05 // SIGNAL MASKED'],
    hiddenTracks: ['NO INTRO', 'PO!NT', 'BEZEL', 'BETTER_WAYS', 'SIMULATION'],
    protocolEraState: 'encrypted',
    countdownHidden: false,
    releaseMarkHidden: true
  },
  {
    label: 'within 24 hours',
    nowMs: releaseMs - (12 * 60 * 60 * 1000),
    state: 'day',
    status: 'Archive unlock pending.',
    cta: 'Pre-save PROTOCOL',
    secondaryCta: 'Open HyperFollow',
    availability: 'Archive unlock pending.',
    visibleCtas: ['Pre-save PROTOCOL'],
    trackMode: 'hints',
    tracks: ['N. I....', 'P!', 'B....', 'B....._W...', 'S.........'],
    hiddenTracks: ['NO INTRO', 'PO!NT', 'BEZEL', 'BETTER_WAYS', 'SIMULATION'],
    protocolEraState: 'encrypted',
    countdownHidden: false,
    releaseMarkHidden: true
  },
  {
    label: 'within 1 hour',
    nowMs: releaseMs - (30 * 60 * 1000),
    state: 'hour',
    status: 'Final signal window.',
    cta: 'Open HyperFollow',
    secondaryCta: 'Open HyperFollow',
    availability: 'Final signal window.',
    visibleCtas: ['Open HyperFollow'],
    trackMode: 'hints',
    tracks: ['N. I....', 'P!', 'B....', 'B....._W...', 'S.........'],
    hiddenTracks: ['NO INTRO', 'PO!NT', 'BEZEL', 'BETTER_WAYS', 'SIMULATION'],
    protocolEraState: 'encrypted',
    countdownHidden: false,
    releaseMarkHidden: true
  },
  {
    label: 'after release',
    nowMs: releaseMs + 1000,
    state: 'released',
    status: 'Stream PROTOCOL.',
    cta: 'Listen Everywhere',
    secondaryCta: 'Stream PROTOCOL',
    availability: 'Stream PROTOCOL.',
    visibleCtas: ['Listen Everywhere', 'Stream PROTOCOL'],
    trackMode: 'revealed',
    tracks: ['NO INTRO', 'PO!NT', 'BEZEL', 'BETTER_WAYS', 'SIMULATION'],
    hiddenTracks: [],
    protocolEraState: 'unlocked',
    countdownHidden: true,
    releaseMarkHidden: false
  }
].forEach((scenario) => {
  const dom = renderProtocolAt(scenario.nowMs);
  assert.strictEqual(dom.window.document.body.dataset.protocolState, scenario.state, `${scenario.label} state is set`);
  assert.strictEqual(dom.window.document.body.dataset.trackMode, scenario.trackMode, `${scenario.label} track mode is set`);
  assert.strictEqual(text(dom, '[data-protocol-status]'), scenario.status, `${scenario.label} status appears`);
  assert.strictEqual(text(dom, '[data-protocol-cta]'), scenario.cta, `${scenario.label} CTA appears`);
  assert.strictEqual(text(dom, '[data-protocol-secondary-cta]'), scenario.secondaryCta, `${scenario.label} secondary CTA appears`);
  assert.strictEqual(text(dom, '[data-protocol-availability]'), scenario.availability, `${scenario.label} availability copy appears`);
  assert.strictEqual(dom.window.document.querySelector('[data-protocol-countdown]').hidden, scenario.countdownHidden, `${scenario.label} countdown visibility is correct`);
  assert.strictEqual(dom.window.document.querySelector('[data-protocol-release-mark]').hidden, scenario.releaseMarkHidden, `${scenario.label} release marker visibility is correct`);
  assert.strictEqual(dom.window.document.querySelector('[data-era="protocol"]').dataset.eraState, scenario.protocolEraState, `${scenario.label} timeline protocol node state is correct`);
  assert.deepStrictEqual(visibleProtocolLinks(dom).map((link) => link.textContent.trim().replace(/\s+/g, ' ')), scenario.visibleCtas, `${scenario.label} visible CTAs are correct`);
  assert.strictEqual(dom.window.document.querySelector('[data-protocol-actions]').hidden, scenario.visibleCtas.length === 0, `${scenario.label} CTA row visibility is correct`);
  scenario.tracks.forEach((track) => assert.ok(trackText(dom).includes(track), `${scenario.label} shows ${track}`));
  scenario.hiddenTracks.forEach((track) => assert.ok(!trackText(dom).includes(track), `${scenario.label} hides ${track}`));
  if (scenario.state === 'released') {
    assert.strictEqual(text(dom, '[data-protocol-release-mark]'), 'Stream PROTOCOL.', 'post-release marker is not an expired countdown');
    assert.deepStrictEqual(trackNames(dom), realTrackOrder, 'post-release real track names reveal in correct order');
  }
  visibleProtocolLinks(dom).forEach((link) => {
    assert.strictEqual(link.href, DISTROKID_URL, `${scenario.label} CTA uses DistroKid URL`);
    assert.strictEqual(link.getAttribute('target'), '_blank', `${scenario.label} CTA opens a new tab`);
    assert.strictEqual(link.getAttribute('rel'), 'noopener noreferrer', `${scenario.label} CTA has safe rel`);
  });
  dom.window.document.querySelectorAll('[data-protocol-link][hidden]').forEach((link) => {
    assert.ok(!link.hasAttribute('href'), `${scenario.label} hidden CTA does not expose DistroKid href`);
  });
  dom.window.close();
});

const timelineOrder = ['PARAGON', 'NXIS.ZIP', 'PROTOCOL', 'BLACK_BOX'];
let lastIndex = -1;
timelineOrder.forEach((era) => {
  const index = html.indexOf(`<span>${era}</span>`);
  assert.ok(index > lastIndex, `${era} appears in correct timeline order`);
  lastIndex = index;
});
['Origin signal', 'Compressed identity', 'Current system', 'Next archive'].forEach((caption) => {
  assert.ok(html.includes(caption), `${caption} timeline caption is present`);
});

const forbiddenProtocolSitePath = path.join('/Users/eli/OTP', 'protocol-site');
walkSourceFiles(root).forEach((file) => {
  assert.ok(!fs.readFileSync(file, 'utf8').includes(forbiddenProtocolSitePath), `${path.relative(root, file)} does not reference abandoned protocol-site path`);
});

assert.strictEqual(releaseManifest.deploymentTarget.project, 'otp-site', 'release target remains otp-site');
if (vercelProject) {
  assert.strictEqual(vercelProject.projectName, 'otp-site', 'local Vercel link remains otp-site');
}
assert.ok(!JSON.stringify(vercelProject).includes('protocol-site'), 'Vercel project does not reference protocol-site');
Object.values(packageJson.scripts || {}).forEach((script) => {
  assert.ok(!script.includes('vercel link'), 'package scripts do not relink Vercel projects');
});

console.log('PROTOCOL release contract passed.');
