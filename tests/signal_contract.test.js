/**
 * BLACKBOX SIGNAL CONTRACT TEST
 * Validates route wiring, SEO/OpenGraph metadata, UI architecture,
 * centralized configuration, anti-leak protection, and accessibility.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('🧪 BLACKBOX SIGNAL CONTRACT TEST...');

const html = read('signal.html');
const css = read('signal.css');
const js = read('signal.js');
const configSrc = read('signal-config.js');
const server = read('server.js');
const vercel = JSON.parse(read('vercel.json'));
const sitemap = read('sitemap.xml');
const index = read('index.html');
const config = require(path.join(root, 'signal-config.js'));

// 1. Server Routing & Aliases
assert.match(server, /'\/signal': 'signal\.html'/, 'server exposes clean /signal route');
assert.match(server, /app\.get\('\/signal\.html',\s*\(req,\s*res\)\s*=>\s*res\.redirect\(308,\s*'\/signal'\)\)/, 'server issues 308 redirect for /signal.html');
assert.match(server, /'\/(?:blackbox|blackbox-signal)'/, 'server provides blackbox alias routes');

// Vercel Routing
const vercelRedirect = vercel.routes.find((r) => r.src === '^/signal\\.html$');
assert.ok(vercelRedirect, 'vercel.json defines redirect for ^/signal\\.html$');
assert.strictEqual(vercelRedirect.status, 308, 'vercel redirect is 308 permanent');
assert.strictEqual(vercelRedirect.headers.Location, '/signal', 'vercel redirect points to /signal');

// Sitemap
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/signal</loc>'), 'sitemap includes /signal canonical');

// 2. SEO & OpenGraph Metadata
assert.ok(html.includes('<title>BLACKBOX SIGNAL — ONLYTRUEPERSPECTIVE</title>'), 'page title is set');
assert.ok(html.includes('rel="canonical" href="https://www.onlytrueperspective.tech/signal"'), 'canonical URL is set');
assert.ok(html.includes('property="og:title" content="BLACKBOX SIGNAL — ONLYTRUEPERSPECTIVE"'), 'og:title is set');
assert.ok(html.includes('property="og:description" content="An unreleased transmission from the OTP vault."'), 'og:description is set');
assert.ok(html.includes('property="og:url" content="https://www.onlytrueperspective.tech/signal"'), 'og:url is set');
assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), 'twitter:card is summary_large_image');
assert.ok(html.includes('name="twitter:title" content="BLACKBOX SIGNAL — ONLYTRUEPERSPECTIVE"'), 'twitter:title is set');

// 3. Centralized Configuration
assert.ok(config.signalNumber, 'config defines signalNumber');
assert.ok(config.signalName, 'config defines signalName');
assert.ok(config.audioSource, 'config defines audioSource');
assert.strictEqual(typeof config.teaserDurationSeconds, 'number', 'teaser duration cap is configured');
assert.ok(Array.isArray(config.currentReleases) && config.currentReleases.length >= 2, 'config declares current releases');
assert.ok(Array.isArray(config.timeline) && config.timeline.length >= 3, 'config declares timeline');

// Release items
const protocolRel = config.currentReleases.find((r) => r.id === 'protocol');
assert.ok(protocolRel, 'PROTOCOL is in current releases config');
assert.ok(protocolRel.url.includes('distrokid.com'), 'PROTOCOL uses official DistroKid URL');

const letsGetLitRel = config.currentReleases.find((r) => r.id === 'lets-get-lit');
assert.ok(letsGetLitRel, "LET'S GET LIT is in current releases config");
assert.ok(letsGetLitRel.url.includes('soundcloud.com'), "LET'S GET LIT points to configured SoundCloud location");

// Timeline items
const timelineNames = config.timeline.map((t) => t.name);
assert.ok(timelineNames.includes('PROTOCOL'), 'timeline has PROTOCOL');
assert.ok(timelineNames.includes('SIGNAL 001'), 'timeline has SIGNAL 001');
assert.ok(timelineNames.includes('[ REDACTED ]'), 'timeline has [ REDACTED ]');

// 4. Anti-Leak & Audio Protection
assert.ok(!html.includes('<audio controls'), 'page does not expose browser default audio controls');
assert.ok(!html.includes('download='), 'page does not present audio download links');

// 5. DOM & Accessibility
const dom = new JSDOM(html, {
  url: 'https://www.onlytrueperspective.tech/signal',
  runScripts: 'outside-only'
});
const doc = dom.window.document;

// Skip link
const skipLink = doc.querySelector('.signal-skip');
assert.ok(skipLink, 'skip link exists');
assert.strictEqual(skipLink.getAttribute('href'), '#signal-main', 'skip link targets main container');

// Play button
const playBtn = doc.querySelector('#signal-play-btn');
assert.ok(playBtn, 'play button exists');
assert.strictEqual(playBtn.getAttribute('type'), 'button', 'play button has explicit type=button');
assert.ok(playBtn.getAttribute('aria-label'), 'play button has aria-label');

// Progress slider
const progressBar = doc.querySelector('#signal-progress-bar');
assert.ok(progressBar, 'progress bar exists');
assert.strictEqual(progressBar.getAttribute('role'), 'slider', 'progress bar has role=slider');
assert.ok(progressBar.hasAttribute('aria-valuenow'), 'progress bar has aria-valuenow');

// Canvas
const canvasNode = doc.querySelector('#signal-canvas');
assert.ok(canvasNode, 'visualizer canvas element exists');
assert.strictEqual(canvasNode.getAttribute('aria-hidden'), 'true', 'visualizer canvas is aria-hidden');

// Timeline nodes
const timelineSteps = Array.from(doc.querySelectorAll('.timeline-step .step-name')).map((n) => n.textContent.trim());
assert.ok(timelineSteps.includes('PROTOCOL'), 'DOM renders PROTOCOL in timeline');
assert.ok(timelineSteps.includes('SIGNAL 001'), 'DOM renders SIGNAL 001 in timeline');
assert.ok(timelineSteps.includes('[ REDACTED ]'), 'DOM renders [ REDACTED ] in timeline');

// 6. CSS System & Motion Guards
assert.ok(css.includes('--signal-gold: #d5b56c;'), 'CSS uses OTP gold token');
assert.ok(css.includes('prefers-reduced-motion: reduce'), 'CSS supports prefers-reduced-motion');
assert.ok(css.includes('safe-area-inset-bottom'), 'CSS implements mobile safe area insets');

// 7. Homepage Subtle Integration
assert.ok(index.includes('href="/signal"'), 'index.html links to /signal');
assert.ok(index.includes('SIGNAL ACTIVE ●'), 'index.html features subtle SIGNAL ACTIVE ● badge');

console.log('   ✅ Blackbox Signal Contract passed all validations.');
console.log('🎉 BLACKBOX SIGNAL CONTRACT COMPLETE');
