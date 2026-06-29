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
const otpProjects = read('otp-projects.js');
const server = read('server.js');
const bookings = read('bookings.html');

assert.ok(index.includes('theme-chrono.js'), 'index loads theme-chrono (first paint)');
assert.ok(index.includes('styles.css?v='), 'index loads styles.css');
assert.ok(index.includes('gsap.min.js'), 'index loads GSAP');
assert.ok(index.includes('ScrollTrigger.min.js'), 'index loads ScrollTrigger');
assert.ok(index.includes('site-init.js?v='), 'index loads site-init');
assert.ok(index.includes('otp-projects.js?v=20260629-archive4'), 'index loads reusable public project library');
assert.ok(archive.includes('otp-projects.js?v=20260629-archive4'), 'archive loads reusable public project library');
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
assert.ok(!notFound.includes('site-init.js'), '404 stays standalone and does not load site-init on unknown nested routes');
assert.ok(!notFound.includes('theme-chrono.js'), '404 stays standalone and does not run theme switching');
assert.ok(!notFound.includes('stars-v2.js'), '404 stays standalone and does not run the animated starfield');
const indexStylesV = (index.match(/styles\.css\?v=([^"'>\s]+)/) || [])[1];
const assertStylesMatchesIndex = (html, label) => {
    const v = (html.match(/styles\.css\?v=([^"'>\s]+)/) || [])[1];
    assert.strictEqual(v, indexStylesV, `${label} styles.css?v must match index.html`);
};
assertStylesMatchesIndex(insight, 'insight.html');
assertStylesMatchesIndex(insightsList, 'insights.html');
assertStylesMatchesIndex(archive, 'archive.html');
assertStylesMatchesIndex(terms, 'terms.html');
assertStylesMatchesIndex(privacy, 'privacy.html');
assertStylesMatchesIndex(notFound, '404.html');
assert.ok(index.includes('data-editable='), 'CMS-editable regions present');
assert.match(index, /href="\/archive"/, 'desktop nav includes the canonical Archive route (parity with mobile drawer)');
assert.ok(
    index.includes('https://www.onlytrueperspective.tech/') && index.includes('rel="canonical"'),
    'index homepage canonical/og use final www canonical host'
);
assert.ok(!index.includes('https://onlytrueperspective.tech/og.jpg'), 'index avoids apex social image URLs in head/schema because apex redirects to www');
assert.ok(index.includes('helps artists, creators, and businesses build cinematic visuals'), 'index meta description uses SEO entity summary');
assert.ok(index.includes('"@type": "ProfessionalService"'), 'index includes ProfessionalService entity schema');
assert.ok(index.includes('ELI3GANT is the creative artist identity of Elijah Huertas'), 'index includes official ELI3GANT schema description');
assert.ok(!index.includes('https://onlytrueperspective.tech/'), 'index avoids apex-only https homepage URLs in head/schema');
assert.ok(index.includes('"name": "ELI3GANT"'), 'homepage schema identifies ELI3GANT as founder');
assert.ok(index.includes('OnlyTruePerspective is the creative technology and media company founded by ELI3GANT'), 'homepage copy connects ELI3GANT to OTP naturally');
const officialSocialImage = 'https://www.onlytrueperspective.tech/assets/seo/otp-og-image.webp';
for (const [label, html] of [
    ['index', index],
    ['insight', insight],
    ['archive', archive],
    ['insights', insightsList],
    ['terms', terms],
    ['privacy', privacy],
    ['bookings', bookings]
]) {
    assert.ok(html.includes(`property="og:image" content="${officialSocialImage}"`), `${label} uses official OTP OG image`);
    assert.ok(html.includes(`name="twitter:image" content="${officialSocialImage}"`), `${label} uses official OTP Twitter image`);
}
assert.ok(![index, insight, archive, insightsList, terms, privacy, bookings].join('\n').includes('https://www.onlytrueperspective.tech/og.jpg'), 'public pages no longer point social cards at the generic OG image');
assert.ok(index.includes('"image": "https://www.onlytrueperspective.tech/assets/seo/eli3gant-founder.webp"'), 'homepage schema keeps optimized ELI3GANT founder image');
assert.ok(insight.includes('"image": "https://www.onlytrueperspective.tech/assets/seo/eli3gant-founder.webp"'), 'insight schema keeps optimized ELI3GANT founder image');
assert.ok(!index.includes('founder-identity-card'), 'homepage does not render the SEO founder image as a visible card');
assert.ok(!index.includes('src="assets/seo/eli3gant-founder.webp"'), 'homepage founder image remains metadata-only');
assert.ok(!archive.includes('vault-preview-media'), 'archive does not render the SEO work preview as a splash image');
assert.ok(!archive.includes('src="assets/seo/otp-work-preview.webp"'), 'archive work preview remains metadata/future-use only');

// insight.html: live apex redirects to www, so public metadata canonicalizes to www.
assert.ok(!insight.includes('https://onlytrueperspective.tech/insight.html'), 'insight canonical should not use redirecting apex host');
assert.ok(insight.includes('https://www.onlytrueperspective.tech/insight.html'), 'insight canonical uses final www host');
assert.ok(insight.includes('"url": "https://www.onlytrueperspective.tech/"'), 'insight JSON-LD org url matches final www host');
const ogUrls = insight.match(/property="og:url"[^>]+content="([^"]+)"/g) || [];
assert.ok(ogUrls.some((l) => l.includes('https://www.onlytrueperspective.tech/insight.html')), 'insight static og:url uses final www host');
assert.ok(insight.includes('sanitizeSlugParam'), 'insight article loader uses OTP.sanitizeSlugParam for ?slug=');

assert.ok(
    insightsList.includes('https://www.onlytrueperspective.tech/insights.html'),
    'insights list canonical/og uses final www host'
);
assert.ok(!insightsList.includes('https://onlytrueperspective.tech/insights.html'), 'insights list avoids redirecting apex insight index URL');

assert.ok(archive.includes('https://www.onlytrueperspective.tech/archive'), 'archive canonical/og use final www host and clean route');
assert.ok(terms.includes('https://www.onlytrueperspective.tech/terms.html'), 'terms canonical/og use final www host');
assert.ok(privacy.includes('https://www.onlytrueperspective.tech/privacy.html'), 'privacy canonical/og use final www host');
assert.ok(!archive.includes('https://onlytrueperspective.tech/archive'), 'archive avoids redirecting apex page URL');
assert.ok(!archive.includes('https://www.onlytrueperspective.tech/archive.html'), 'archive avoids duplicate .html metadata URLs');

for (const [label, html] of [
    ['index', index],
    ['archive', archive],
    ['insights', insightsList],
    ['terms', terms],
    ['privacy', privacy],
    ['bookings', bookings]
]) {
    assert.ok(
        html.includes('https://www.reddit.com/r/OnlyTruePerspective'),
        `${label} includes Official Reddit`
    );
}
assert.ok(terms.includes('contact@onlytrueperspective.tech'), 'terms use business contact email');
assert.ok(privacy.includes('contact@onlytrueperspective.tech'), 'privacy uses business contact email');
assert.ok(!terms.includes('mailto:eli3gant@onlytrueperspective.tech'), 'terms do not list personal/founder mailbox as public legal contact');
assert.ok(!privacy.includes('mailto:eli3gant@onlytrueperspective.tech'), 'privacy does not list personal/founder mailbox as public privacy contact');
assert.ok(!/OnlyTruePerspective\.com|onlytrueperspective\.com|wixsite|lovable/i.test(index + archive + insightsList + terms + privacy + bookings), 'public SEO pages avoid stale builder or .com identity');

assert.ok(themeChrono.includes('OTP.getEffectiveThemeForPaint'), 'theme-chrono exposes paint theme API');
assert.ok(themeChrono.includes('OTP.applyPaletteForTheme'), 'theme-chrono exposes first-paint palette apply API');
assert.ok(themeChrono.includes('OTP.getActivePalette'), 'theme-chrono exposes active palette API');
assert.ok(themeChrono.includes("root.setAttribute('data-palette'"), 'theme-chrono stamps the active palette on html before CSS paint');
assert.ok(themeChrono.includes('OTP_SPECTRAL_VARIANT'), 'theme-chrono chooses spectral variant before deferred runtime');
assert.ok(siteInit.includes('OTP.applyPaletteForTheme'), 'site-init reuses the first-paint palette source of truth');
assert.ok(!siteInit.includes('const spectralRoll = Math.random()'), 'site-init must not reroll spectral palette after first paint');
assert.ok(siteInit.includes('data-theme') || siteInit.includes("getAttribute('data-theme')"), 'site-init references data-theme');
assert.ok(siteInit.includes('OTPSetProjectType'), 'site-init exposes safe homepage package CTA helper');
assert.ok(siteInit.includes('OTP_PROJECT_LIBRARY'), 'site-init reads reusable public project entries');
assert.ok(siteInit.includes('sanitizeSlugParam'), 'site-init exposes slug sanitizer for insight query param');
assert.ok(siteInit.includes('sanitizeHttpUrl'), 'site-init exposes http(s) URL helper for embeds and insight');
assert.ok(siteInit.includes('/api/contact/submit'), 'site-init wires contact form to public submit API');
assert.ok(siteInit.includes('otp-uplink'), 'site-init listens on same Realtime channel as OTP Terminal');
assert.ok(siteInit.includes('Invalid response from server'), 'contact handler tolerates non-JSON error bodies');
assert.ok(server.includes("app.get('/packages'"), 'server exposes /packages as a homepage package-section alias');
assert.ok(server.includes('#packages'), '/packages alias redirects to homepage package section instead of duplicate HTML');
assert.ok(!index.includes('onmouseenter='), 'Enter Vault has no inline hover handler');
assert.ok(!index.includes('onmouseleave='), 'Enter Vault has no inline leave handler');
assert.ok(siteInit.includes("warpBtn.dataset.vaultBound === '1'"), 'Enter Vault binding is guarded against duplicates');
assert.ok(siteInit.includes("['off', 'none', 'disabled']"), 'remote visuals can only disable stars explicitly');
assert.ok(!siteInit.includes("cursorCanvas.style.display = entry.isIntersecting"), 'IntersectionObserver does not hide star canvas');
assert.ok(otpProjects.includes('HYH Architecture & Design'), 'HYH project is registered in public project library');
assert.ok(otpProjects.includes('Website Transformation / Architecture Visualization Brand System'), 'HYH project type is explicit');
assert.ok(otpProjects.includes('Previous Website'), 'HYH project exposes before-state label');
assert.ok(otpProjects.includes('OTP Rebuild'), 'HYH project exposes after-state label');
assert.ok(otpProjects.includes('assets/hyh-previous-website.jpg'), 'HYH previous-state image is public asset-backed');
assert.ok(otpProjects.includes('assets/hyh-otp-rebuild.jpg'), 'HYH rebuild image is public asset-backed');
assert.ok(otpProjects.includes('Architecture visualization positioning'), 'HYH project lists services OTP performed');
for (const [label, body] of Object.entries({ otpProjects, siteInit, index, archive })) {
    assert.ok(!/Wayback|web\.archive|Pops/i.test(body), `${label} contains no private/source-only HYH context`);
}

assert.ok(terminal.includes('toggleAdminTheme()'), 'OTP Terminal theme control');
assert.ok(terminal.includes('data-theme'), 'OTP Terminal uses data-theme');
assert.ok(terminal.includes('admin-core.js?v='), 'OTP Terminal cache-busts admin-core');

assert.ok(bookings.includes('project-intake-panel'), 'bookings page bridges to secure project intake');
assert.ok(bookings.includes('Open Secure Project Intake'), 'bookings exposes secure intake CTA label');
assert.ok(bookings.includes('https://otp-os.vercel.app/bookings'), 'bookings links secure intake to OTP OS');
assert.ok(fs.readFileSync(path.join(root, 'otp-attribution.js'), 'utf8').includes('buildUrlWithAttribution'), 'attribution helper can append UTMs to intake URL');

console.log('   ✅ Marketing + theme contract OK');
console.log('🎉 MARKETING SITE CONTRACT COMPLETE');
