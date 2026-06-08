/* eslint-disable no-console */
/**
 * OTP Production Full Sweep v2
 *
 * Broader public production health checks with optional admin-authenticated checks.
 * Admin checks prefer OTP_ADMIN_PASSCODE/ADMIN_PASSCODE login, then OTP_ADMIN_TOKEN fallback.
 * Useful for deploy verification when you want the whole public surface validated.
 */

const { runSweep, short } = require('./prod_sweep_v2_runner');

const BASE_URL = String(process.env.OTP_SWEEP_BASE_URL || 'https://www.onlytrueperspective.tech').replace(/\/+$/, '');
const TOKEN = String(process.env.OTP_ADMIN_TOKEN || '').trim();

const publicTargets = [
  { name: 'home', path: '/', kind: 'html', markers: ['Book OTP', 'Insights', '/bookings?source=', 'href="/portal"'] },
  { name: 'bookings', path: '/bookings', kind: 'html', markers: ['/bookings.css', '/bookings.js', 'canonical', 'OTP Bookings Portal'] },
  { name: 'booking-alias', path: '/booking', kind: 'html', markers: ['/bookings.css', '/bookings.js'] },
  { name: 'book-alias', path: '/book', kind: 'html', markers: ['/bookings.css', '/bookings.js'] },
  { name: 'bookings-html', path: '/bookings.html', kind: 'html', markers: ['Start Booking', '/bookings.css'] },
  { name: 'bookings-css', path: '/bookings.css', kind: 'css', markers: ['booking-page', 'package-grid'] },
  { name: 'bookings-js', path: '/bookings.js', kind: 'js', markers: ['fetch(\'/api/bookings/config\'', 'fetch(\'/api/bookings/submit\''] },
  { name: 'booking-animated-logo', path: '/assets/otp-hero-centered.gif', kind: 'gif' },
  { name: 'booking-static-logo', path: '/assets/otp-hero-poster-frame.png', kind: 'png' },
  { name: 'primary-logo', path: '/assets/otp-logo-transparent.png', kind: 'png' },
  { name: 'app-icon', path: '/icon.png', kind: 'png' },
  { name: 'favicon-32', path: '/favicon-32x32.png', kind: 'png' },
  { name: 'apple-touch-icon', path: '/apple-touch-icon.png', kind: 'png' },
  { name: 'social-preview', path: '/og.jpg', kind: 'jpg' },
  { name: 'client-portal', path: '/portal', kind: 'html', markers: ['OTP Client Portal', 'Access project status', '/portal.css', '/portal.js'] },
  { name: 'client-portal-css', path: '/portal.css', kind: 'css', markers: ['portal-page', 'portal-emblem'] },
  { name: 'client-portal-js', path: '/portal.js', kind: 'js', markers: ['extractToken', '/client/'] },
  { name: 'private-client-css', path: '/client.css', kind: 'css', markers: ['client-shell', 'documents-list', 'overflow-x: hidden'] },
  { name: 'private-client-js', path: '/client.js', kind: 'js', markers: ['/api/client-portal/', 'Locked until payment is saved'] },
  { name: 'portal-gate', path: '/portal-gate', kind: 'html', markers: ['portal', 'gate'] },
  { name: 'terminal-alias', path: '/terminal', kind: 'html', markers: ['postForm', 'admin-core.js'] },
  { name: 'terminal-shell', path: '/otp-terminal', kind: 'html', markers: ['postForm', 'magicBtn', 'admin-core.js', 'blog-enhancements.css', 'window.draftPostWithAI()', 'window.generateOpsDoc(\'Proposal\')'] },
  { name: 'admin-core-js', path: '/admin-core.js', kind: 'js', markers: ['window.draftPostWithAI', 'resetPostComposerState', 'window.generateOpsDoc'] },
  { name: 'insights', path: '/insights', kind: 'html', markers: ['insight-card', 'insight.html?slug='] },
  { name: 'insight', path: '/insight?slug=spooky-luh-ooky', kind: 'html', markers: ['post-content', 'back-to-vault'] },
  { name: 'privacy', path: '/privacy', kind: 'html' },
  { name: 'terms', path: '/terms', kind: 'html' },
  { name: 'archive', path: '/archive', kind: 'html' },
  { name: 'payment-success', path: '/payment-success', kind: 'html' },
  { name: 'api-health', path: '/api/health', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.status === 'string' && payload.integrations) },
  { name: 'api-status', path: '/api/status', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.status === 'string') },
  { name: 'bookings-config', path: '/api/bookings/config', kind: 'json', shape: (payload) => Boolean(payload && Array.isArray(payload.services) && payload.upload) }
];

const adminTargets = [
  { name: 'admin-qa-sweep', path: '/api/admin/qa/sweep', kind: 'json', shape: (payload) => Boolean(payload && payload.success === true && payload.fixtures && payload.mutationPolicy) },
  { name: 'admin-knowledge-meta', path: '/api/admin/knowledge/meta', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.success === 'boolean') },
  { name: 'admin-knowledge-files', path: '/api/admin/knowledge/files', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.success === 'boolean') },
  { name: 'admin-docs-templates-status', path: '/api/admin/docs/templates/status', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.success === 'boolean') },
  { name: 'schema-migration', path: '/api/schema-migration', kind: 'text', markers: ['CREATE TABLE', 'ALTER TABLE'] }
];

async function main() {
  const sweep = await runSweep({
    baseUrl: BASE_URL,
    schema: 'otp-prod-full-sweep-v2',
    publicTargets,
    adminTargets,
    browserSmoke: true,
    token: TOKEN
  });

  console.log(JSON.stringify(sweep, null, 2));
  if (!sweep.publicChecks.every((check) => check.ok)) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: 'otp-prod-full-sweep-v2',
    ok: false,
    baseUrl: BASE_URL,
    publicChecks: [],
    adminChecks: [],
    warnings: [],
    errors: [short(error?.message || error)],
    skipped: []
  }, null, 2));
  process.exit(1);
});
