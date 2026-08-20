/**
 * WeatherOS Privacy Policy Contract Test
 * Validates Google Play & Apple App Store legal compliance,
 * OTP design system integration, SEO metadata, Schema.org graph,
 * Express routing, and Vercel routing.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('WEATHEROS PRIVACY CONTRACT...');

// 1. File existence and parity
assert.ok(fs.existsSync(path.join(root, 'weatheros-privacy.html')), 'weatheros-privacy.html must exist in root');
assert.ok(fs.existsSync(path.join(root, 'weatheros', 'privacy.html')), 'weatheros/privacy.html must exist in subdirectory');

const html = read('weatheros-privacy.html');
const subHtml = read('weatheros/privacy.html');
assert.strictEqual(html, subHtml, 'weatheros-privacy.html and weatheros/privacy.html must be identical');

// 2. SEO & Head Metadata
const titleOf = (doc) => (doc.match(/<title>([^<]+)<\/title>/i) || [])[1]?.trim();
const metaDescription = (doc) => (doc.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1]?.trim();
const metaKeywords = (doc) => (doc.match(/<meta\s+name="keywords"\s+content="([^"]*)"/i) || [])[1]?.trim();
const canonical = (doc) => (doc.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1]?.trim();

const title = titleOf(html);
assert.strictEqual(title, 'WeatherOS Privacy Policy | OnlyTruePerspective LLC', 'Exact title match');

const canon = canonical(html);
assert.strictEqual(canon, 'https://www.onlytrueperspective.tech/weatheros/privacy', 'Canonical URL match');

const desc = metaDescription(html);
assert.ok(desc && desc.length > 20, 'Meta description present and non-empty');
assert.ok(desc.includes('WeatherOS privacy policy'), 'Meta description mentions WeatherOS privacy policy');
assert.ok(desc.includes('OnlyTruePerspective LLC'), 'Meta description mentions OnlyTruePerspective LLC');

const keywords = metaKeywords(html);
assert.ok(keywords && keywords.includes('WeatherOS privacy policy'), 'Keywords include WeatherOS privacy policy');
assert.ok(keywords && keywords.includes('weather app privacy'), 'Keywords include weather app privacy');

// 3. Social Media Cards
assert.ok(html.includes('property="og:type" content="website"'), 'og:type website');
assert.ok(html.includes('property="og:site_name" content="OnlyTruePerspective"'), 'og:site_name');
assert.ok(html.includes('property="og:url" content="https://www.onlytrueperspective.tech/weatheros/privacy"'), 'og:url');
assert.ok(html.includes('property="og:title" content="WeatherOS Privacy Policy | OnlyTruePerspective LLC"'), 'og:title');
assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), 'twitter:card');
assert.ok(html.includes('name="twitter:title" content="WeatherOS Privacy Policy | OnlyTruePerspective LLC"'), 'twitter:title');

// 4. Schema.org JSON-LD
const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
assert.ok(schemaMatch, 'Schema.org JSON-LD script present');
const schema = JSON.parse(schemaMatch[1]);
assert.ok(schema['@graph'], 'Schema has @graph');
const orgSchema = schema['@graph'].find(item => item['@type'] === 'Organization');
assert.ok(orgSchema, 'Organization schema present');
assert.strictEqual(orgSchema.name, 'OnlyTruePerspective LLC', 'Organization name');

const appSchema = schema['@graph'].find(item => item['@type'] === 'SoftwareApplication');
assert.ok(appSchema, 'SoftwareApplication schema present');
assert.strictEqual(appSchema.name, 'WeatherOS', 'SoftwareApplication name');
assert.strictEqual(appSchema.applicationCategory, 'WeatherApplication', 'SoftwareApplication category');

const aboutSchema = schema['@graph'].find(item => item['@type'] === 'AboutPage');
assert.ok(aboutSchema, 'AboutPage schema present');
assert.strictEqual(aboutSchema.url, 'https://www.onlytrueperspective.tech/weatheros/privacy', 'AboutPage URL');

// 5. Legal Commitments & Zero-Tracking Guarantees
assert.ok(html.includes('OnlyTruePerspective LLC'), 'Company identity disclosed');
assert.ok(html.includes('WeatherOS'), 'Product identity disclosed');
assert.ok(html.includes('0 Ads'), 'Zero ads disclosed');
assert.ok(html.includes('0 Data Sales'), 'Zero data sales disclosed');
assert.ok(html.includes('No user account, registration, login, or personal profile is required'), 'No account requirement disclosed');

// 6. Data Processed & Location Usage
assert.ok(html.includes('Location Data'), 'Location data section present');
assert.ok(html.includes('latitude and longitude') || html.includes('coordinates'), 'Coordinates disclosed');
assert.ok(html.includes('resolve your local weather conditions'), 'Weather purpose disclosed');
assert.ok(html.includes('No Location History'), 'No location history disclosed');

// 7. Platform Permissions
// Android
assert.ok(html.includes('android.permission.INTERNET'), 'android.permission.INTERNET disclosed');
assert.ok(html.includes('android.permission.ACCESS_FINE_LOCATION'), 'android.permission.ACCESS_FINE_LOCATION disclosed');
assert.ok(html.includes('android.permission.ACCESS_COARSE_LOCATION'), 'android.permission.ACCESS_COARSE_LOCATION disclosed');

// iOS
assert.ok(html.includes('NSLocationWhenInUseUsageDescription'), 'NSLocationWhenInUseUsageDescription disclosed');
assert.ok(html.includes('NSLocationAlwaysAndWhenInUseUsageDescription'), 'NSLocationAlwaysAndWhenInUseUsageDescription disclosed');

// 8. Third-Party Weather Provider
assert.ok(html.includes('Open-Meteo'), 'Open-Meteo weather provider disclosed');
assert.ok(html.includes('HTTPS'), 'HTTPS transport disclosed');

// 9. Storage & Caching
assert.ok(html.includes('SharedPreferences'), 'SharedPreferences disclosed');
assert.ok(html.includes('UserDefaults'), 'UserDefaults disclosed');

// 10. Children's Privacy
assert.ok(html.includes('Children'), 'Children privacy section present');
assert.ok(html.includes('13'), 'Age threshold 13 disclosed');
assert.ok(html.includes('COPPA'), 'COPPA compliance disclosed');

// 11. User Controls & Contact
assert.ok(html.includes('Settings → Apps → WeatherOS'), 'Android permission control steps present');
assert.ok(html.includes('Settings → WeatherOS → Location'), 'iOS permission control steps present');
assert.ok(html.includes('contact@onlytrueperspective.tech'), 'Contact email disclosed');

// 12. Routing & Architecture
const serverJs = read('server.js');
assert.ok(serverJs.includes("'/weatheros/privacy': 'weatheros-privacy.html'"), 'server.js staticAliases has /weatheros/privacy');
assert.ok(serverJs.includes("'/weatheros/privacy.html': 'weatheros-privacy.html'"), 'server.js staticAliases has /weatheros/privacy.html');

const vercelJson = JSON.parse(read('vercel.json'));
const weatherOsRoute = vercelJson.routes.find(r => r.src && r.src.includes('weatheros'));
assert.ok(weatherOsRoute, 'vercel.json defines /weatheros route');
const serverBuild = vercelJson.builds.find(b => b.src === 'server.js');
assert.ok(serverBuild.config.includeFiles.includes('weatheros/**'), 'vercel.json includes weatheros/** files');

const sitemap = read('sitemap.xml');
assert.ok(sitemap.includes('https://www.onlytrueperspective.tech/weatheros/privacy'), 'sitemap.xml includes /weatheros/privacy');

// 13. Cross-Linking from Legal Ecosystem
const privacyPage = read('privacy.html');
assert.ok(privacyPage.includes('/weatheros/privacy'), 'privacy.html links to WeatherOS Privacy');

const termsPage = read('terms.html');
assert.ok(termsPage.includes('/weatheros/privacy'), 'terms.html links to WeatherOS Privacy');

console.log('   OK: WeatherOS Privacy Contract passed cleanly.');
console.log('WEATHEROS PRIVACY CONTRACT COMPLETE');
