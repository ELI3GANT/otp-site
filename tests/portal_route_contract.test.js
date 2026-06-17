/**
 * Public Client Portal contract.
 * Guards the clean /portal entry and constrained /client/:token handoff.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('CLIENT PORTAL ROUTE CONTRACT...');

const server = read('server.js');
const portalHtml = read('portal.html');
const portalCss = read('portal.css');
const portalJs = read('portal.js');
const clientHtml = read('client.html');
const clientCss = read('client.css');
const clientJs = read('client.js');
const indexHtml = read('index.html');
const bookingsHtml = read('bookings.html');
const bookingsJs = read('bookings.js');

assert.match(server, /'\/portal': 'portal\.html'/, '/portal must serve the public portal entry');
assert.match(server, /app\.get\(\['\/client', '\/client\/'\]/, '/client missing-token route must exist');
assert.match(server, /app\.get\('\/client\/:token'/, '/client/:token route must exist');
assert.match(server, /client\.html/, '/client/:token must serve the local client portal shell');
assert.match(server, /app\.get\('\/api\/client-portal\/:token'/, 'client portal data API must exist');
assert.match(server, /app\.post\('\/api\/admin\/ops\/jobs\/portal-link', verifyToken/, 'admin-only portal link generation endpoint must exist');
assert.match(server, /privatePortalHtml/, 'private portal pages must use no-store/noindex/no-referrer headers');
assert.match(server, /CLIENT_PORTAL_TOKEN_RE/, 'client portal token regex guard must exist');
assert.match(server, /normalizeClientPortalToken/, 'server must normalize client portal tokens');
assert.match(server, /createClientPortalToken/, 'server must generate encrypted client portal tokens');
assert.match(server, /readClientPortalToken/, 'server must validate and expire client portal tokens');
assert.match(server, /buildClientPortalData/, 'server must map live ops_jobs rows to a client-safe portal payload');
assert.match(server, /publicClientPortalPath/, 'server must convert portal responses to clean public paths');
assert.match(server, /clientPortalAssetTypes/, 'portal must serve local client shell CSS and JS assets with private headers');
assert.match(server, /app\.get\(Object\.keys\(clientPortalAssetTypes\)/, 'portal asset proxy routes must exist before static fallback');
assert.match(server, /ops_jobs/, 'portal API must use live ops_jobs data');
assert.match(server, /Paid Receipt/, 'portal API must include receipt gating logic');
assert.ok(!/replaceAll\('https:\/\/otp-os\.vercel\.app', OTP_PUBLIC_SITE_ORIGIN\)/.test(server), 'portal proxy must not rewrite the OTP OS API origin');
assert.ok(!/otp-api-base[\s\S]{0,240}OTP_PUBLIC_SITE_ORIGIN/.test(server), 'portal proxy must preserve upstream API metadata for OTP OS API calls');
assert.ok(!/res\.redirect\([^)]*req\.query/i.test(server), 'server must not redirect to user-controlled query values');
assert.ok(!/app\.use\('\/client'/.test(server), 'client portal proxy must not expose a broad /client app.use proxy');
assert.ok(!/\/api\/admin|\/terminal|portal-gate/.test(portalHtml), 'public portal HTML must not expose admin routes');

assert.ok(portalHtml.includes('OTP Client Portal'), 'portal page heading is present');
assert.ok(portalHtml.includes('Access project status, documents, payment steps, and approvals.'), 'portal purpose copy is present');
assert.ok(portalHtml.includes('/bookings'), 'portal links back to OTP Bookings');
assert.ok(portalHtml.includes('https://www.reddit.com/r/OnlyTruePerspective'), 'portal footer includes Official Reddit');
assert.ok(portalHtml.includes('portal-invite-form'), 'portal token form is present');
assert.ok(portalHtml.includes('/portal.css'), 'portal CSS is loaded');
assert.ok(portalHtml.includes('/portal.js'), 'portal JS is loaded');
assert.ok(portalHtml.includes('Powered by OnlyTruePerspective'), 'portal gate has powered-by footer');
assert.ok(!/otp-os\.vercel\.app/i.test(portalHtml), 'public portal page must not show OTP OS hostname');
assert.ok(!/supabase|service[_-]?key|jwt|bearer/i.test(portalHtml), 'public portal page must not leak internal implementation terms');

assert.ok(portalCss.includes('prefers-reduced-motion'), 'portal page respects reduced motion');
assert.ok(!portalCss.includes('prefers-color-scheme: light'), 'portal stays locked to the OTP dark visual system');
assert.ok(portalCss.includes('--active-accent'), 'portal shares the OTP bookings active accent system');
assert.ok(portalCss.includes('portalOrbitalShift'), 'portal has the bookings-style atmospheric glow layer');
assert.ok(portalCss.includes('backdrop-filter: var(--glass)'), 'portal cards use the OTP glass depth language');
assert.ok(portalCss.includes('@media (max-width: 430px)'), 'portal page has small-phone layout protection');
assert.ok(portalCss.includes('overflow-x: hidden'), 'portal page protects mobile overflow');

assert.ok(portalJs.includes('encodeURIComponent'), 'portal token redirects must encode token');
assert.ok(portalJs.includes('tokenPattern'), 'portal JS must validate token shape');
assert.ok(portalJs.includes("status === 'missing'"), 'portal JS must show a missing-token state');
assert.ok(!/innerHTML\s*=/.test(portalJs), 'portal JS must not assign unsafe HTML');
assert.ok(!/insertAdjacentHTML/.test(portalJs), 'portal JS must not inject adjacent HTML');
assert.ok(!/otp-os\.vercel\.app/i.test(portalJs), 'portal JS must not expose OTP OS hostname');
assert.ok(!/admin|terminal|portal-gate/.test(portalJs), 'portal JS must not route clients to admin surfaces');

assert.ok(clientHtml.includes('/client.css'), 'client portal shell loads local CSS');
assert.ok(clientHtml.includes('/client.js'), 'client portal shell loads local JS');
assert.ok(clientHtml.includes('Private Client Portal'), 'client portal shell has private label');
assert.ok(clientHtml.includes('Private Project Profile'), 'client portal uses client-safe project profile wording');
assert.ok(clientHtml.includes('Powered by OnlyTruePerspective'), 'client portal has powered-by footer');
assert.ok(!/otp-os\.vercel\.app|OTP OS|supabase|service[_-]?key|jwt|bearer/i.test(clientHtml), 'client portal HTML must not leak internals');

assert.ok(clientJs.includes('/api/client-portal/'), 'client portal fetches the server-side portal API');
assert.ok(clientJs.includes("cache: 'no-store'"), 'client portal fetch uses no-store');
assert.ok(clientJs.includes('Locked until payment is saved'), 'client portal has locked receipt state');
assert.ok(server.includes('Receipt unlocks after a saved payment'), 'server portal payload explains locked receipts');
assert.ok(clientJs.includes('textContent'), 'client portal renders with textContent');
assert.ok(!/innerHTML\s*=/.test(clientJs), 'client portal JS must not assign unsafe HTML');
assert.ok(!/insertAdjacentHTML/.test(clientJs), 'client portal JS must not inject adjacent HTML');
assert.ok(!/jobId|internalNotes|createdBy|updatedBy/.test(clientJs), 'client portal client code must not render raw internal fields');
assert.ok(!/otp-os\.vercel\.app|SUPABASE_SERVICE|service[_-]?role/i.test(clientJs), 'client portal JS must not leak upstream or secrets');

assert.ok(clientCss.includes('--gold'), 'client portal uses black/gold OTP style');
assert.ok(clientCss.includes('backdrop-filter: var(--glass)'), 'client portal cards use glass depth');
assert.ok(clientCss.includes('@media (max-width: 430px)'), 'client portal has small-phone layout protection');
assert.ok(clientCss.includes('overflow-x: hidden'), 'client portal protects mobile overflow');
assert.ok(clientCss.includes('prefers-reduced-motion'), 'client portal respects reduced motion');

assert.ok(indexHtml.includes('href="/portal"'), 'homepage exposes clean same-origin Client Portal CTA');
assert.ok(bookingsHtml.includes('/portal'), 'bookings header exposes clean Client Portal CTA');
assert.ok(bookingsJs.includes('private OTP Client Portal link where you can view project status, documents, payment steps, and approvals'), 'booking success copy references clean portal wording');
assert.ok(bookingsJs.includes('safePortalHref'), 'booking success validates returned portal links');
assert.ok(!/otp-os\.vercel\.app/i.test(bookingsHtml + bookingsJs), 'bookings UI must not expose OTP OS hostname');

console.log('   OK: Client Portal route contract');
console.log('CLIENT PORTAL ROUTE CONTRACT COMPLETE');
