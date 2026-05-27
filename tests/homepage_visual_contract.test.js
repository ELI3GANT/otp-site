const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('HOMEPAGE VISUAL CONTRACT...');

const styles = read('styles.css');
const index = read('index.html');
const stars = read('stars-v2.js');
const siteInit = read('site-init.js');

assert.ok(index.includes('ENGINEERED_SIGNALS'), 'Visual Success section uses operational signal language');
assert.ok(index.includes('Visual Success <span class="visual-success-accent">Systems</span>'), 'Visual Success section uses the restored Systems heading');
assert.ok(index.includes('Quote-First Project Intake'), 'Visual Success section includes quote-first intake card');
assert.ok(index.includes('Fast-Lane Asset Path'), 'Visual Success section includes fast-lane card');
assert.ok(index.includes('Private Delivery Workspace'), 'Visual Success section includes portal delivery card');
assert.ok(!index.includes('ENGINEERED_STATISTICS'), 'reverted statistics eyebrow must not return');
assert.ok(!index.includes('Viewer Engagement Growth'), 'unverified engagement-growth claim must not return');
assert.ok(!index.includes('Visions Delivered Globally'), 'unverified delivered-globally claim must not return');
const studioSection = (index.match(/<section id="about"[\s\S]*?<\/section>/) || [''])[0];
assert.ok(studioSection.includes('founded by ELI3GANT.'), 'identity card leads with ELI3GANT only');
assert.ok(!studioSection.includes('Elijah Huertas'), 'visible identity card must not show legal first and last name');

assert.ok(styles.includes('Clean homepage visual restore'), 'homepage visual restore guard is documented');
assert.ok(styles.includes('html[data-stars="mounted"] .home-page .hero::before'), 'mounted star canvas disables fallback pseudo layer');
assert.ok(styles.includes('html:not([data-stars="mounted"]):not([data-stars="disabled"]) .home-page .hero::before'), 'fallback star layer only renders when canvas is not mounted');
assert.ok(styles.includes('Visual Success Systems restore'), 'restored Visual Success card styling is documented');
assert.ok(!styles.includes('animation: holoFlow'), 'identity card light-mode treatment must not run perpetual shimmer animation');
assert.ok(!styles.includes('mix-blend-mode: color-burn'), 'identity card light-mode treatment avoids expensive color-burn blending');
assert.ok(!styles.includes('background-size: 150px 150px, 230px 230px, 310px 310px'), 'old tiled star fallback must not return');
assert.ok(!styles.includes('otp-static-star-drift'), 'old animated tiled fallback must not return');
assert.ok(styles.includes('opacity: 0.92 !important'), 'dark canvas stars remain visible');
assert.ok(styles.includes('opacity: 0.46 !important'), 'day/light canvas stars remain visible');
assert.ok(styles.includes('html.stars-performance-mode .bg-grain'), 'performance mode pauses grain overlays');
assert.ok(styles.includes('html.stars-performance-mode .home-page .glass-manifesto'), 'performance mode lightens identity card compositor work');
assert.ok(styles.includes('backdrop-filter: none !important'), 'performance mode removes expensive identity card backdrop blur');
assert.ok(styles.includes('glass-manifesto .sticker-base'), 'performance mode lightens identity card inner glass emblem');
assert.ok(styles.includes('html.stars-performance-mode .home-page .hero .hero-eye-3d'), 'performance mode lightens hero logo compositor work');
assert.ok(styles.includes('html.stars-performance-mode .home-page .hero .hero-logo-wrap::before'), 'performance mode removes expensive animated hero aura blur');
assert.ok(styles.includes('otp-static-performance-logo'), 'performance mode static logo style is present');
assert.ok(styles.includes('Mobile hero title fit: keep ONLY TRUE / PERSPECTIVE complete on narrow screens.'), 'mobile hero title fit guard is documented');
assert.ok(styles.includes('font-size: clamp(2.05rem, 9.6vw, 3.05rem) !important;'), 'mobile PERSPECTIVE title uses viewport-safe clamp sizing');
assert.ok(styles.includes('max-width: min(100%, calc(100vw - 36px)) !important;'), 'mobile hero title stays inside viewport side padding');
assert.ok(styles.includes('Premium day-mode services polish: richer depth without changing dark mode.'), 'day-mode services polish guard is documented');
assert.ok(styles.includes('[data-theme="light"] .home-page #services.section-alt'), 'light-mode services section gets its own premium surface');
assert.ok(styles.includes('[data-theme="light"] .home-page #services .service-item'), 'light-mode service cards get scoped contrast treatment');
assert.ok(styles.includes('[data-theme="light"] .home-page #cursor-canvas.stars-mounted'), 'light-mode star canvas remains visible');
assert.ok(styles.includes('.spectral-v-sync .network-pkg h4'), 'mobile spectral variants cannot force package headings past the viewport');
assert.ok(styles.includes('overflow-wrap: anywhere !important'), 'mobile spectral headings wrap safely');

assert.ok(stars.includes("setAttribute('data-stars', 'mounted')"), 'starfield marks canvas-mounted state');
assert.ok(stars.includes("setAttribute('data-stars', 'fallback')"), 'starfield marks safe fallback when canvas init fails');
assert.ok(stars.includes('enablePerformanceMode'), 'adaptive starfield performance mode is preserved');
assert.ok(stars.includes('probeAbsoluteStart'), 'adaptive performance detector keeps checking beyond the first sample');
assert.ok(stars.includes("setAttribute('data-otp-performance-mode', 'stars')"), 'starfield activates CSS performance mode selectors');
assert.ok(stars.includes('performanceMode && !mouse.attractor ? 66 : 33'), 'starfield throttles non-interactive redraws in performance mode');
assert.ok(stars.includes('ctx.shadowBlur = performanceMode ? 0'), 'starfield disables expensive glow shadows in performance mode');
assert.ok(!siteInit.includes("data-stars', starsDisabled ? 'disabled' : 'enabled'"), 'remote visuals must not overwrite mounted canvas state with a generic enabled flag');
assert.ok(siteInit.includes("setAttribute('data-stars', 'mounted')"), 'runtime visuals preserve mounted state after config updates');
assert.ok(siteInit.includes('identityPerformanceMode'), 'identity card physics respect adaptive performance mode');
assert.ok(siteInit.includes("classList.contains('stars-performance-mode')"), 'identity card performance guard follows starfield performance mode');

console.log('   OK: Homepage visual contract');
console.log('HOMEPAGE VISUAL CONTRACT COMPLETE');
