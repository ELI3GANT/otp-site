#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 RUNNING: EVEHALO Experience & Architecture Contract Test...');

const rootDir = path.join(__dirname, '..');

// 1. Verify Core Hub Files
const requiredFiles = [
  'evehalo/index.html',
  'evehalo/support.html',
  'evehalo/privacy.html',
  'evehalo/evehalo.css',
  'evehalo/evehalo.js'
];

for (const file of requiredFiles) {
  const fullPath = path.join(rootDir, file);
  assert.ok(fs.existsSync(fullPath), `Required file missing: ${file}`);
  assert.ok(fs.statSync(fullPath).size > 100, `File is empty or truncated: ${file}`);
  console.log(`  ✓ Hub file verified: ${file}`);
}

// 2. Verify Authentic Assets (WebP & PNG)
const requiredAssets = [
  'app-icon',
  'hero-launch',
  'today-command',
  'horizon-month',
  'horizon-year',
  'evo-voice',
  'evo-intelligence',
  'evo-memory-vault',
  'focus-dynamic-island',
  'studio-atmospheres',
  'apple-reminders-manager',
  'iphone-duo-expanded',
  'plus-atmospheres'
];

for (const asset of requiredAssets) {
  const pngPath = path.join(rootDir, 'assets/evehalo', `${asset}.png`);
  const webpPath = path.join(rootDir, 'assets/evehalo', `${asset}.webp`);

  assert.ok(fs.existsSync(pngPath), `Missing PNG asset: ${asset}.png`);
  assert.ok(fs.existsSync(webpPath), `Missing WebP asset: ${asset}.webp`);
  console.log(`  ✓ Asset verified: ${asset} (PNG + WebP)`);
}

// 3. Verify Privacy & Unpublished-Status Guards
const robotsTxt = fs.readFileSync(path.join(rootDir, 'robots.txt'), 'utf8');
assert.ok(robotsTxt.includes('Disallow: /evehalo'), 'robots.txt must Disallow /evehalo');
console.log('  ✓ robots.txt correctly disallows /evehalo crawlers');

const sitemapXml = fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8');
assert.ok(!sitemapXml.includes('/evehalo'), 'sitemap.xml must NOT expose /evehalo before launch');
console.log('  ✓ sitemap.xml strictly omits /evehalo');

// 4. Verify Content & Pricing in index.html
const indexHtml = fs.readFileSync(path.join(rootDir, 'evehalo/index.html'), 'utf8');

// Themes check
const expectedThemes = [
  'Nocturne', 'Daybreak', 'Stillwater', 'Minimal',
  'Aurora', 'Crimson', 'Serenity', 'Nebula',
  'Solar Flare', 'Rosewood', 'Arctic Glass', 'Electric Garden'
];
for (const theme of expectedThemes) {
  assert.ok(indexHtml.includes(theme), `Missing theme preset: ${theme}`);
}
console.log('  ✓ All 12 verified atmospheric presets present');

// Pricing check
assert.ok(indexHtml.includes('0') && indexHtml.includes('Free'), 'Missing Free tier');
assert.ok(indexHtml.includes('4.99') && indexHtml.includes('month'), 'Missing $4.99 monthly tier');
assert.ok(indexHtml.includes('39.99') && indexHtml.includes('year'), 'Missing $39.99 yearly tier');
assert.ok(indexHtml.includes('79.99') && indexHtml.includes('once'), 'Missing $79.99 lifetime tier');
console.log('  ✓ Founder-selected pricing verified ($0, $4.99/mo, $39.99/yr, $79.99 lifetime)');

// iPhone Duo showcase & label check
assert.ok(indexHtml.includes('iPhone Duo'), 'Missing iPhone Duo showcase');
assert.ok(indexHtml.includes('Simulator Capture'), 'Missing truthful Simulator Capture labeling');
console.log('  ✓ iPhone Duo regular-width adaptive showcase & simulator label verified');

// Accessibility check
assert.ok(indexHtml.includes('cosmic-skip-link'), 'Missing accessibility skip link');
assert.ok(indexHtml.includes('role="tablist"'), 'Missing ARIA tablist');
console.log('  ✓ Accessibility semantic elements verified');

// 5. Verify CSS reduced motion
const cssContent = fs.readFileSync(path.join(rootDir, 'evehalo/evehalo.css'), 'utf8');
assert.ok(cssContent.includes('prefers-reduced-motion: reduce'), 'CSS must respect prefers-reduced-motion');
console.log('  ✓ prefers-reduced-motion accessibility verified in CSS');

console.log('🎉 EVEHALO Experience Contract Verification Complete: 100% PASS.');
process.exit(0);
