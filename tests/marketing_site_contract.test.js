/**
 * Marketing homepage + insight page wiring (theme, scripts, URL consistency).
 * Static file checks only — no browser.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('🧪 MARKETING SITE + THEME CONTRACT...');

const index = read('index.html');
const insight = read('insight.html');
const insightsList = read('insights.html');
const archive = read('archive.html');
const terms = read('terms.html');
const privacy = read('privacy.html');
const notFound = read('404.html');
const terminal = read('otp-terminal.html');
const themeChrono = read('theme-chrono.js');
const siteInit = read('site-init.js');

assert.ok(index.includes('theme-chrono.js'), 'index loads theme-chrono (first paint)');
assert.ok(index.includes('styles.css?v='), 'index loads styles.css');
assert.ok(index.includes('gsap.min.js'), 'index loads GSAP');
assert.ok(index.includes('ScrollTrigger.min.js'), 'index loads ScrollTrigger');
assert.ok(index.includes('site-init.js?v='), 'index loads site-init');
const indexSiteInitV = (index.match(/site-init\.js\?v=([^"'>\s]+)/) || [])[1];
const insightSiteInitV = (insight.match(/site-init\.js\?v=([^"'>\s]+)/) || [])[1];
assert.ok(indexSiteInitV && insightSiteInitV, 'index and insight declare site-init cache-bust');
const assertSiteInitMatchesIndex = (html, label) => {
    const v = (html.match(/site-init\.js\?v=([^"'>\s]+)/) || [])[1];
    assert.strictEqual(
        v,
        indexSiteInitV,
        `${label} site-init.js?v must match index.html (avoid stale public helpers)`
    );
};
assertSiteInitMatchesIndex(insight, 'insight.html');
assertSiteInitMatchesIndex(insightsList, 'insights.html');
assertSiteInitMatchesIndex(archive, 'archive.html');
assertSiteInitMatchesIndex(terms, 'terms.html');
assertSiteInitMatchesIndex(privacy, 'privacy.html');
assertSiteInitMatchesIndex(notFound, '404.html');
assert.ok(index.includes('data-editable='), 'CMS-editable regions present');
assert.match(index, /href="archive\.html"/, 'desktop nav includes Archive (parity with mobile drawer)');
assert.ok(
    index.includes('https://www.onlytrueperspective.tech/') && index.includes('rel="canonical"'),
    'index homepage canonical/og use www (matches site-config hub)'
);
assert.ok(!index.includes('https://onlytrueperspective.tech/'), 'index avoids apex-only https homepage URLs in head/schema');

// insight.html: avoid apex vs www split (was breaking social consistency with JS-set og:url)
assert.ok(!insight.includes('https://onlytrueperspective.tech/insight.html'), 'insight canonical should not use apex-only host');
assert.ok(insight.includes('https://www.onlytrueperspective.tech/insight.html'), 'insight canonical uses www');
assert.ok(insight.includes('"url": "https://www.onlytrueperspective.tech"'), 'insight JSON-LD org url matches www');
const ogUrls = insight.match(/property="og:url"[^>]+content="([^"]+)"/g) || [];
assert.ok(ogUrls.some((l) => l.includes('www.onlytrueperspective.tech')), 'insight static og:url uses www');
assert.ok(insight.includes('sanitizeSlugParam'), 'insight article loader uses OTP.sanitizeSlugParam for ?slug=');

assert.ok(
    insightsList.includes('https://www.onlytrueperspective.tech/insights.html'),
    'insights list canonical/og uses www (matches site-config)'
);
assert.ok(!insightsList.includes('https://onlytrueperspective.tech/insights.html'), 'insights list avoids apex-only insight index URL');

assert.ok(archive.includes('https://www.onlytrueperspective.tech/archive.html'), 'archive canonical/og use www');
assert.ok(terms.includes('https://www.onlytrueperspective.tech/terms.html'), 'terms canonical/og use www');
assert.ok(privacy.includes('https://www.onlytrueperspective.tech/privacy.html'), 'privacy canonical/og use www');
assert.ok(!archive.includes('https://onlytrueperspective.tech/archive.html'), 'archive avoids apex-only page URL');

assert.ok(themeChrono.includes('OTP.getEffectiveThemeForPaint'), 'theme-chrono exposes paint theme API');
assert.ok(siteInit.includes('data-theme') || siteInit.includes("getAttribute('data-theme')"), 'site-init references data-theme');
assert.ok(siteInit.includes('OTPSetProjectType'), 'site-init exposes safe homepage package CTA helper');
assert.ok(siteInit.includes('sanitizeSlugParam'), 'site-init exposes slug sanitizer for insight query param');
assert.ok(siteInit.includes('sanitizeHttpUrl'), 'site-init exposes http(s) URL helper for embeds and insight');
assert.ok(siteInit.includes('/api/contact/submit'), 'site-init wires contact form to public submit API');
assert.ok(siteInit.includes('otp-uplink'), 'site-init listens on same Realtime channel as OTP Terminal');
assert.ok(siteInit.includes('Invalid response from server'), 'contact handler tolerates non-JSON error bodies');

assert.ok(terminal.includes('toggleAdminTheme()'), 'OTP Terminal theme control');
assert.ok(terminal.includes('data-theme'), 'OTP Terminal uses data-theme');
assert.ok(terminal.includes('admin-core.js?v='), 'OTP Terminal cache-busts admin-core');

console.log('   ✅ Marketing + theme contract OK');
console.log('🎉 MARKETING SITE CONTRACT COMPLETE');
