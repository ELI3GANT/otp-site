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
const indexHtml = read('index.html');
const bookingsHtml = read('bookings.html');
const bookingsJs = read('bookings.js');

assert.match(server, /'\/portal': 'portal\.html'/, '/portal must serve the public portal entry');
assert.match(server, /app\.get\('\/client\/:token'/, '/client/:token route must exist');
assert.match(server, /CLIENT_PORTAL_TOKEN_RE/, 'client portal token regex guard must exist');
assert.match(server, /normalizeClientPortalToken/, 'server must normalize client portal tokens');
assert.match(server, /publicClientPortalPath/, 'server must convert portal responses to clean public paths');
assert.match(server, /redirect: 'manual'/, 'portal upstream redirects must be handled manually');
assert.match(server, /"https:\/\/otp-os\.vercel\.app"/, 'CSP must allow the proxied portal shell to fetch the OTP OS API');
assert.match(server, /replaceAll\(`\$\{OTP_CLIENT_PORTAL_UPSTREAM\}\/client\/`/, 'portal proxy must rewrite client links only');
assert.match(server, /clientPortalAssetTypes/, 'portal proxy must serve shell CSS and JS assets from the OTP OS upstream');
assert.match(server, /app\.get\(Object\.keys\(clientPortalAssetTypes\)/, 'portal asset proxy routes must exist before static fallback');
assert.match(server, /\/client-portal-utils\.js/, 'portal asset proxy must include the shared client portal module');
assert.ok(!/replaceAll\('https:\/\/otp-os\.vercel\.app', OTP_PUBLIC_SITE_ORIGIN\)/.test(server), 'portal proxy must not rewrite the OTP OS API origin');
assert.ok(!/res\.redirect\([^)]*req\.query/i.test(server), 'server must not redirect to user-controlled query values');
assert.ok(!/app\.use\('\/client'/.test(server), 'client portal proxy must not expose a broad /client app.use proxy');
assert.ok(!/\/api\/admin|\/terminal|portal-gate/.test(portalHtml), 'public portal HTML must not expose admin routes');

assert.ok(portalHtml.includes('OTP Client Portal'), 'portal page heading is present');
assert.ok(portalHtml.includes('Access project status, documents, payment steps, and approvals.'), 'portal purpose copy is present');
assert.ok(portalHtml.includes('/bookings'), 'portal links back to OTP Bookings');
assert.ok(portalHtml.includes('portal-invite-form'), 'portal token form is present');
assert.ok(portalHtml.includes('/portal.css'), 'portal CSS is loaded');
assert.ok(portalHtml.includes('/portal.js'), 'portal JS is loaded');
assert.ok(!/otp-os\.vercel\.app/i.test(portalHtml), 'public portal page must not show OTP OS hostname');
assert.ok(!/supabase|service[_-]?key|jwt|bearer/i.test(portalHtml), 'public portal page must not leak internal implementation terms');

assert.ok(portalCss.includes('prefers-reduced-motion'), 'portal page respects reduced motion');
assert.ok(portalCss.includes('overflow-x: hidden'), 'portal page protects mobile overflow');

assert.ok(portalJs.includes('encodeURIComponent'), 'portal token redirects must encode token');
assert.ok(portalJs.includes('tokenPattern'), 'portal JS must validate token shape');
assert.ok(!/innerHTML\s*=/.test(portalJs), 'portal JS must not assign unsafe HTML');
assert.ok(!/insertAdjacentHTML/.test(portalJs), 'portal JS must not inject adjacent HTML');
assert.ok(!/otp-os\.vercel\.app/i.test(portalJs), 'portal JS must not expose OTP OS hostname');
assert.ok(!/admin|terminal|portal-gate/.test(portalJs), 'portal JS must not route clients to admin surfaces');

assert.ok(indexHtml.includes('https://www.onlytrueperspective.tech/portal'), 'homepage exposes clean Client Portal CTA');
assert.ok(bookingsHtml.includes('/portal'), 'bookings header exposes clean Client Portal CTA');
assert.ok(bookingsJs.includes('private OTP Client Portal link where you can view project status, documents, payment steps, and approvals'), 'booking success copy references clean portal wording');
assert.ok(bookingsJs.includes('safePortalHref'), 'booking success validates returned portal links');
assert.ok(!/otp-os\.vercel\.app/i.test(bookingsHtml + bookingsJs), 'bookings UI must not expose OTP OS hostname');

console.log('   OK: Client Portal route contract');
console.log('CLIENT PORTAL ROUTE CONTRACT COMPLETE');
