/* eslint-disable no-console */
/**
 * OTP Production Full Sweep v2
 *
 * Broader public production health checks with optional admin-authenticated checks.
 * Admin checks prefer OTP_SWEEP_ADMIN_PASSCODE login, then OTP_SWEEP_ADMIN_TOKEN fallback.
 * Useful for deploy verification when you want the whole public surface validated.
 */

const { runSweep, short } = require('./prod_sweep_v2_runner');

const BASE_URL = String(process.env.OTP_SWEEP_BASE_URL || 'https://www.onlytrueperspective.tech').replace(/\/+$/, '');
const TOKEN = String(process.env.OTP_SWEEP_ADMIN_TOKEN || process.env.OTP_ADMIN_TOKEN || '').trim();

const publicTargets = [
  { name: 'home', path: '/', kind: 'html', markers: ['OnlyTruePerspective | Rhode Island Creative Technology &amp; Media Studio', 'rel="canonical" href="https://www.onlytrueperspective.tech/"', 'href="/archive"', 'href="/studio#digital"', 'href="/portal"'] },
  { name: 'bookings', path: '/bookings', kind: 'html', markers: ['/bookings.css?v=20261112-budget-fit-preview-v2', '/bookings.js?v=20261112-budget-fit-preview-v2', 'canonical', 'Your next project starts here.', 'service-selector', 'budget-guide-intro', 'booking-budget-options', 'data-quick-fit-preview', 'quick-fit-examples'] },
  { name: 'songwars', path: '/songwars', kind: 'html', markers: ['Song Wars Weekend', 'data-songwars-poster', 'discord.gg/Awk2b7RSW', 'rel="canonical" href="https://www.onlytrueperspective.tech/songwars"'] },
  { name: 'songwars-poster', path: '/assets/songwars/songwars-poster.jpg', kind: 'jpg' },
  { name: 'booking-alias', path: '/booking', kind: 'html', markers: ['/bookings.css', '/bookings.js'] },
  { name: 'book-alias', path: '/book', kind: 'html', markers: ['/bookings.css', '/bookings.js'] },
  { name: 'bookings-html', path: '/bookings.html', kind: 'html', markers: ['Your next project starts here.', '/bookings.css'] },
  { name: 'bookings-css', path: '/bookings.css', kind: 'css', markers: ['booking-page', 'package-grid', 'button.budget-range-card.is-selected', '.quick-budget-preview', '.quick-fit-icon svg', 'otpStarDrift 54s'] },
  { name: 'bookings-js', path: '/bookings.js', kind: 'js', markers: ['fetch(\'/api/bookings/config\'', 'fetch(\'/api/bookings/submit\'', 'function renderQuickBudgetPreview', 'Under $500 routes toward a Fast Lane', 'The Signal starts at $500'] },
  { name: 'booking-animated-logo', path: '/assets/otp-hero-centered.gif', kind: 'gif' },
  { name: 'booking-static-logo', path: '/assets/otp-hero-poster-frame.png', kind: 'png' },
  { name: 'primary-logo', path: '/assets/otp-logo-transparent.png', kind: 'png' },
  { name: 'app-icon', path: '/icon.png', kind: 'png' },
  { name: 'favicon-32', path: '/favicon-32x32.png', kind: 'png' },
  { name: 'apple-touch-icon', path: '/apple-touch-icon.png', kind: 'png' },
  { name: 'social-preview', path: '/og.jpg', kind: 'jpg' },
  { name: 'client-portal', path: '/portal', kind: 'html', markers: ['Client portal', 'Your project.', 'All in one place.', '/portal-entry.css', '/workspace-v2.css', '/portal.js'] },
  { name: 'client-portal-css', path: '/portal-entry.css', kind: 'css', markers: ['portal-entry-layout', 'portal-entry-capabilities'] },
  { name: 'client-portal-workspace-css', path: '/workspace-v2.css', kind: 'css', markers: ['portal-section-nav', 'prefers-reduced-motion'] },
  { name: 'client-portal-sections-js', path: '/portal-sections.js', kind: 'js', markers: ['createPortalSections', 'tablist'] },
  { name: 'client-portal-js', path: '/portal.js', kind: 'js', markers: ['extractToken', '/client/'] },
  { name: 'private-client-css', path: '/client.css', kind: 'css', markers: ['portal-shell', 'portal-root', 'overflow-x: hidden'] },
  { name: 'private-client-js', path: '/client.js', kind: 'js', markers: ['/api/client-portal/', 'Locked until payment is saved'] },
  { name: 'portal-gate', path: '/portal-gate', kind: 'html', markers: ['portal', 'gate'] },
  { name: 'terminal-alias', path: '/terminal', kind: 'html', markers: ['postForm', 'admin-core.js'] },
  { name: 'terminal-shell', path: '/otp-terminal', kind: 'html', markers: ['postForm', 'magicBtn', 'admin-core.js', 'blog-enhancements.css', 'window.draftPostWithAI()', 'window.generateOpsDoc(\'Proposal\')'] },
  { name: 'admin-core-js', path: '/admin-core.js', kind: 'js', markers: ['window.draftPostWithAI', 'resetPostComposerState', 'window.generateOpsDoc'] },
  { name: 'insights', path: '/insights', kind: 'html', markers: ['insight-card', 'insight.html?slug='] },
  { name: 'insight', path: '/insight?slug=spooky-luh-ooky', kind: 'html', markers: ['post-content', 'back-to-vault'] },
  { name: 'privacy', path: '/privacy', kind: 'html' },
  { name: 'terms', path: '/terms', kind: 'html' },
  { name: 'archive', path: '/archive', kind: 'html', markers: ['/archive.css?v=20261112-floivation-newest-v1', '/archive.js?v=20261112-floivation-newest-v1', 'data-project-id="floivation"', 'archive-project-newest', 'FLOIVATION'] },
  { name: 'archive-css', path: '/archive.css', kind: 'css', markers: ['.archive-project-newest', '.archive-case-study-card.is-featured'] },
  { name: 'archive-js', path: '/archive.js', kind: 'js', markers: ["const order = ['floivation', 'hyh-architecture-design'", 'archive-project-newest'] },
  { name: 'public-navigation-js', path: '/public-shell.js', kind: 'js', markers: ['Client Portal', 'Services', '/portal'] },
  { name: 'public-system-css', path: '/public-system.css', kind: 'css', markers: ['public-light-drift 46s', 'public-light-drift 58s'] },
  { name: 'payment-success', path: '/payment-success', kind: 'html' },
  { name: 'api-health', path: '/api/health', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.status === 'string' && payload.integrations) },
  { name: 'api-status', path: '/api/status', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.status === 'string') },
  { name: 'bookings-config', path: '/api/bookings/config', kind: 'json', shape: (payload) => Boolean(payload && Array.isArray(payload.services) && payload.upload) }
];

function partitionPublicTargets(targets) {
  const defer = new Set(
    String(process.env.OTP_SWEEP_DEFER || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  );
  if (!defer.size) {
    return { active: targets, deferred: [] };
  }
  return {
    active: targets.filter((target) => !defer.has(target.name)),
    deferred: targets.filter((target) => defer.has(target.name))
  };
}

const adminTargets = [
  { name: 'admin-qa-sweep', path: '/api/admin/qa/sweep', kind: 'json', shape: (payload) => Boolean(payload && payload.success === true && payload.fixtures && payload.mutationPolicy) },
  { name: 'admin-knowledge-meta', path: '/api/admin/knowledge/meta', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.success === 'boolean') },
  { name: 'admin-knowledge-files', path: '/api/admin/knowledge/files', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.success === 'boolean') },
  { name: 'admin-docs-templates-status', path: '/api/admin/docs/templates/status', kind: 'json', shape: (payload) => Boolean(payload && typeof payload.success === 'boolean') },
  { name: 'schema-migration', path: '/api/schema-migration', kind: 'text', markers: ['CREATE TABLE', 'ALTER TABLE'] }
];

async function main() {
  const { active, deferred } = partitionPublicTargets(publicTargets);
  const sweep = await runSweep({
    baseUrl: BASE_URL,
    schema: 'otp-prod-full-sweep-v2',
    publicTargets: active,
    adminTargets,
    browserSmoke: process.env.OTP_SWEEP_HTTP_ONLY !== '1',
    token: TOKEN
  });

  if (process.env.OTP_SWEEP_HTTP_ONLY === '1') {
    sweep.skipped.push('terminal-browser-smoke');
    sweep.warnings.push('HTTP-only sweep: authenticated browser smoke intentionally omitted.');
  }

  if (deferred.length) {
    sweep.skipped.push(...deferred.map((target) => target.name));
    sweep.warnings.push(
      `Deferred pre-live public checks until after deploy: ${deferred.map((target) => target.name).join(', ')}`
    );
  }

  console.log(JSON.stringify(sweep, null, 2));
  if (!sweep.ok) process.exit(1);
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
