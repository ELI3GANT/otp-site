/**
 * LORE SIGNAL contract: route, first-screen identity, audio privacy, responsive
 * behavior, accessible controls, and reduced-motion/background lifecycle.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('signal.html');
const css = read('signal.css');
const js = read('signal.js');
const server = read('server.js');
const vercel = JSON.parse(read('vercel.json'));
const sitemap = read('sitemap.xml');
const index = read('index.html');
const config = require(path.join(root, 'signal-config.js'));

console.log('🧪 LORE SIGNAL CONTRACT TEST...');

assert.match(server, /'\/signal': 'signal\.html'/, 'server serves /signal');
assert.match(server, /app\.get\('\/signal\.html',\s*\(req,\s*res\)\s*=>\s*res\.redirect\(308,\s*'\/signal'\)\)/, 'legacy route redirects to /signal');
assert.ok(vercel.routes.some((route) => route.src === '^/signal\\.html$' && route.status === 308 && route.headers.Location === '/signal'), 'Vercel preserves canonical route redirect');
assert.ok(sitemap.includes('<loc>https://www.onlytrueperspective.tech/signal</loc>'), 'sitemap contains canonical Signal URL');

assert.match(html, /<title>LORE \/\/ SIGNAL 001 — ELI3GANT<\/title>/, 'page metadata identifies LORE');
assert.match(html, /rel="canonical" href="https:\/\/www\.onlytrueperspective\.tech\/signal"/, 'canonical URL remains unchanged');
assert.match(html, /property="og:image" content="https:\/\/www\.onlytrueperspective\.tech\/assets\/otp-social-preview\.png"/, 'social preview image is configured');
assert.match(html, /name="twitter:card" content="summary_large_image"/, 'large social card is configured');
assert.match(html, /signal\.css\?v=20261111-lore-signal-v4/);
assert.match(html, /signal\.js\?v=20261111-lore-signal-v4/);

assert.strictEqual(config.teaserDurationSeconds, 24, 'production teaser remains 24 seconds');
assert.strictEqual(config.audioSources[0].src, '/assets/audio/blackbox-signal.m4a', 'Safari-first M4A is the primary source');
assert.strictEqual(config.audioSources[1].src, '/assets/audio/blackbox-signal.mp3', 'MP3 is the browser fallback');
assert.deepStrictEqual(config.audioSources.map((source) => source.type), ['audio/mp4', 'audio/mpeg'], 'public sources are M4A and MP3 only');
assert.ok(!config.audioSources.some((source) => source.src.includes('.wav')), 'uncompressed WAV is not publicly configured');
assert.ok(!fs.existsSync(path.join(root, 'assets/audio/blackbox-signal.wav')), 'public WAV is removed');
assert.ok(config.currentReleases.some((release) => release.id === 'protocol' && release.url.includes('distrokid.com')), 'PROTOCOL keeps its verified listening link');
assert.strictEqual(config.currentReleases.find((release) => release.id === 'lets-get-lit').url, 'https://soundcloud.com/eli3gant/lgl-lets-get-lit', 'LET’S GET LIT keeps its verified SoundCloud link');

const dom = new JSDOM(html, { url: 'https://www.onlytrueperspective.tech/signal' });
const doc = dom.window.document;
assert.strictEqual(doc.querySelector('.signal-skip').getAttribute('href'), '#signal-main', 'keyboard skip link targets main');
assert.strictEqual(doc.querySelector('#signal-title').textContent.trim(), 'LORE', 'hero uses the homepage LORE identity');
assert.strictEqual(doc.querySelector('#signal-title').getAttribute('data-text'), 'LORE', 'glitch layer duplicates LORE only');
assert.ok(doc.querySelector('.signal-identity-row').textContent.includes('ELI3GANT'), 'artist identity is visible in the hero');
assert.ok(doc.querySelector('.signal-identity-code').textContent.includes('L / 0 / R / 3'), 'hero carries the LORE code signature');
assert.ok(doc.querySelector('.signal-subline').textContent.includes('ROLLOUT'), 'rollout label is present');
assert.strictEqual(doc.querySelector('#signal-play-btn').getAttribute('type'), 'button', 'player control is a button');
assert.strictEqual(doc.querySelector('#signal-play-btn').getAttribute('aria-label'), 'Play LORE signal', 'play control is labeled accessibly');
assert.strictEqual(doc.querySelector('#signal-progress-bar').getAttribute('role'), 'slider', 'progress supports keyboard seeking');
assert.strictEqual(doc.querySelector('#signal-time-display').textContent.trim(), '0:00 / 0:24', 'initial duration display is accurate');
assert.strictEqual(doc.querySelector('#signal-audio').getAttribute('preload'), 'none', 'full media is not requested before interaction');
assert.strictEqual(doc.querySelector('#signal-audio').hasAttribute('src'), false, 'audio URL is assigned only after user interaction');
assert.strictEqual(doc.querySelector('#signal-audio').hasAttribute('playsinline'), true, 'iPhone audio remains inline');
assert.ok(!html.includes('<audio controls') && !html.includes('download='), 'audio is not exposed as a downloadable browser control');
assert.ok(!html.includes('LORE.m4a') && !html.includes('LORE.wav'), 'source master filename is not exposed in public HTML');

assert.ok(doc.querySelectorAll('.release-row').length === 2, 'released tracks use two compact editorial rows');
assert.ok(doc.body.textContent.includes('CURRENT TRANSMISSIONS'), 'current release section remains visible');
assert.ok(doc.body.textContent.includes('NOT EVERYTHING IS MEANT'), 'vault closing section is present');
assert.ok(doc.querySelector('.signal-timeline [aria-current="step"]'), 'active Signal step is announced');
assert.ok(doc.querySelector('.signal-atmosphere[aria-hidden="true"] .signal-codefield'), 'decorative encoded field is hidden from assistive technology');

assert.ok(css.includes('prefers-reduced-motion: reduce'), 'motion respects reduced-motion preference');
assert.ok(css.includes('100svh'), 'layout uses stable mobile viewport sizing');
assert.ok(css.includes('env(safe-area-inset'), 'mobile safe areas are considered');
assert.ok(css.includes('max-width: 700px') && css.includes('max-width: 370px'), 'small and standard mobile layouts are defined');
assert.ok(css.includes('focus-visible'), 'keyboard focus is visible');
assert.ok(css.includes('@keyframes codeDrift') && css.includes('@keyframes signalSweep'), 'signal field and scan pass move continuously');
assert.ok(css.includes('animation: codeDrift 10s ease-in-out infinite alternate'), 'code field drift stays visible across browsers');
assert.ok(css.includes('animation: signalSweep 7s linear infinite'), 'scan sweep stays visible across browsers');
assert.ok(css.includes('translate3d(0, -110px, 0)') && css.includes('translate3d(0, 110px, 0)'), 'code field travels far enough to read as motion');
assert.ok(css.includes('.signal-releases .section-heading { display: grid; grid-template-columns: minmax(0, 1fr)') && css.includes('.signal-releases .section-heading .section-intro { grid-column: 1;'), 'transmission heading and description use a single stacked column');
assert.ok(css.includes('animation-play-state: paused'), 'decorative motion pauses in hidden tabs');
assert.ok(js.includes('GLITCH_AUDIO_COOLDOWN_MS'), 'audio-reactive title glitches are rate limited');
assert.ok(js.includes('audio.preload = \'none\''), 'script defers audio loading');
assert.ok(js.includes('requestAnimationFrame') && js.includes('cancelAnimationFrame'), 'visualizer runs only while playback is active');
assert.ok(js.includes("document.addEventListener('visibilitychange'"), 'animation work suspends in hidden tabs');
assert.ok(js.includes('mediaSource.connect(audioContext.destination)'), 'Web Audio keeps a direct audible route');
assert.ok(js.includes('mediaSource.connect(analyser)'), 'visualizer can read actual playback audio');
assert.ok(js.includes('--signal-audio-pulse'), 'ambient field intensity responds to real playback amplitude');
assert.ok(js.includes("setButtonState('ended')"), 'completion offers replay without autoplay');
assert.ok(index.includes('href="/signal"') && index.includes('Enter Signal'), 'homepage still links into Signal');

console.log('   ✅ LORE Signal contract passed.');
