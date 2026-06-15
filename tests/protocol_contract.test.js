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
assert.ok(html.includes('ENTER PROTOCOL'), 'single primary enter button is present');
assert.strictEqual((html.match(/class="protocol-enter"/g) || []).length, 1, 'only one primary protocol button is rendered initially');

['days', 'hours', 'minutes', 'seconds'].forEach((field) => {
  assert.ok(html.includes(`data-count="${field}"`), `countdown includes ${field}`);
});

[
  'FILE_001 — NO INTRO',
  'FILE_002 — PO!NT',
  'FILE_003 — BEZEL',
  'FILE_004 — SIMULATION',
  'FILE_005 — BETTER WAYS'
].forEach((label) => {
  assert.ok(html.includes(label), `${label} card is present`);
});

assert.ok(html.includes('SIGNAL UNLOCKED'), 'hidden signal panel exists');
assert.ok(html.includes('Preview channel prepared.'), 'hidden signal copy exists');
assert.ok(html.includes('/assets/audio/protocol-snippet.mp3'), 'future snippet path placeholder is present');
assert.ok(html.includes('Snippet file not installed yet.'), 'audio fallback message is present');
assert.ok(html.includes('FOLLOW ELI3GANT'), 'follow CTA is present');
assert.ok(html.includes('STREAMING LINKS COMING SOON'), 'streaming placeholder is present');
assert.ok(html.includes('Built by OnlyTruePerspective'), 'footer credit is present');
assert.ok(html.includes('aria-disabled="true"'), 'placeholder streaming link is accessibility-disabled');
assert.ok(!html.includes('OVERRIDE ACTIVE'), 'visible active state avoids override naming');

assert.ok(js.includes('// TODO: update PROTOCOL release target date'), 'release target TODO is obvious');
assert.ok(js.includes("const PROTOCOL_RELEASE_TARGET = '2026-07-03T00:00:00-04:00'"), 'placeholder release target is near top of JS');
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

assert.match(server, /'\/protocol': 'protocol\.html'/, 'server exposes clean /protocol route');
assert.ok(!html.includes('/api/'), 'protocol HTML does not reference APIs');
assert.ok(!html.includes('otp-os.vercel.app'), 'protocol page does not reference OTP OS');
assert.ok(!html.includes('stripe'), 'protocol page does not reference Stripe');
assert.ok(!html.includes('supabase'), 'protocol page does not reference Supabase');

console.log('PROTOCOL countdown contract passed.');
