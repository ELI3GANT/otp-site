const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const html = read('protocol.html');
const css = read('protocol.css');
const js = read('protocol.js');
const server = read('server.js');

assert.ok(html.includes('<title>PROTOCOL — ELI3GANT</title>'), 'protocol title is set');
assert.ok(html.includes('>PROTOCOL</h1>'), 'visible protocol name is just PROTOCOL');
assert.ok(!html.includes('PROTOCOL_OVERRIDE.EXE'), 'visible protocol name does not include override/exe language');
assert.ok(html.includes('A transmission from the next ELI3GANT era.'), 'protocol subtitle/meta copy is present');
assert.ok(html.includes('SYSTEM ONLINE // ACCESS PENDING'), 'protocol status copy is present');
assert.ok(html.includes('TRANSMISSION UNLOCKS //'), 'visible release language is present');
assert.ok(html.includes('06.26.26'), 'visible release date is present');
assert.ok(html.includes('datetime="2026-06-26T00:00:00-04:00"'), 'release date semantic timestamp is official');
assert.ok(html.includes('ENTER PROTOCOL'), 'single primary enter button is present');
assert.strictEqual((html.match(/class="protocol-enter"/g) || []).length, 1, 'only one primary protocol button is rendered initially');

['days', 'hours', 'minutes', 'seconds'].forEach((field) => {
  assert.ok(html.includes(`data-count="${field}"`), `countdown includes ${field}`);
});

[
  'FILE_001 — SIGNAL LIVE',
  'FILE_002 — LOCKED',
  'FILE_003 — LOCKED',
  'FILE_004 — HIDDEN',
  'FILE_005 — TRANSMISSION PENDING'
].forEach((label) => {
  assert.ok(html.includes(label), `${label} card is present`);
});
['NO INTRO', 'BEZEL', 'SIMULATION', 'BETTER WAYS'].forEach((track) => {
  assert.ok(!html.includes(track), `${track} is not publicly revealed`);
});

assert.ok(html.includes('SIGNAL UNLOCKED'), 'hidden signal panel exists');
assert.ok(html.includes('PO!NT is live. Full transmission pending.'), 'hidden signal copy subtly acknowledges PO!NT');
assert.ok(html.includes('/assets/audio/protocol-snippet.mp3'), 'future snippet path placeholder is present');
assert.ok(html.includes('Snippet file not installed yet.'), 'audio fallback message is present');
assert.ok(html.includes('FOLLOW ELI3GANT'), 'follow CTA is present');
assert.ok(html.includes('STREAMING LINKS COMING SOON'), 'streaming placeholder is present');
assert.ok(html.includes('SIGNAL LIVE ON SOUNDCLOUD'), 'single subtle SoundCloud link label is present');
assert.strictEqual((html.match(/on\.soundcloud\.com\/hcLDGpzhI3yBDaZx3q/g) || []).length, 1, 'confirmed PO!NT SoundCloud URL appears once');
assert.ok(html.includes('target="_blank"'), 'SoundCloud link opens in a new tab');
assert.ok(html.includes('rel="noopener noreferrer"'), 'SoundCloud link uses safe rel attributes');
assert.ok(html.includes('Built by OnlyTruePerspective'), 'footer credit is present');
assert.ok(html.includes('aria-disabled="true"'), 'placeholder streaming link is accessibility-disabled');
assert.ok(!html.includes('OVERRIDE ACTIVE'), 'visible active state avoids override naming');

assert.ok(js.includes("const PROTOCOL_RELEASE_TARGET = '2026-06-26T00:00:00-04:00'"), 'official release target is near top of JS');
assert.ok(js.includes('EASTER_EGG_TAPS_REQUIRED = 3'), 'triple-tap signal unlock is implemented');
assert.ok(js.includes('enterProtocol'), 'enter button reveal behavior is implemented');
assert.ok(js.includes('audio.addEventListener'), 'audio fallback handling is implemented without autoplay');
assert.ok(!js.includes('fetch('), 'protocol page does not collect or submit data');
assert.ok(!js.includes('localStorage'), 'protocol page does not store visitor data');

assert.ok(css.includes('prefers-reduced-motion'), 'protocol CSS respects reduced motion');
assert.ok(css.includes('overflow-x: hidden'), 'protocol CSS protects against horizontal overflow');
assert.ok(css.includes('@media (max-width: 760px)'), 'protocol CSS has mobile layout rules');
assert.ok(css.includes('@media (max-width: 390px)'), 'protocol CSS has small phone layout rules');
assert.ok(css.includes('backdrop-filter'), 'protocol page uses glass styling');
assert.ok(css.includes('protocolTitleGlitch'), 'protocol page has subtle glitch styling');
assert.ok(css.includes('protocolRareTitleGlitch'), 'protocol page has rare title glitch styling');
assert.ok(css.includes('protocolCountFlicker'), 'protocol page has countdown micro-flicker styling');
assert.ok(css.includes('protocolSweep'), 'protocol page has signal interference styling');
assert.ok(css.includes('protocolBorderShimmer'), 'protocol page has subtle border shimmer styling');

assert.match(server, /'\/protocol': 'protocol\.html'/, 'server exposes clean /protocol route');
assert.ok(!html.includes('/api/'), 'protocol HTML does not reference APIs');
assert.ok(!html.includes('otp-os.vercel.app'), 'protocol page does not reference OTP OS');
assert.ok(!html.includes('stripe'), 'protocol page does not reference Stripe');
assert.ok(!html.includes('supabase'), 'protocol page does not reference Supabase');

console.log('PROTOCOL countdown contract passed.');
