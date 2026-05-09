/* eslint-disable no-console */
/**
 * OTP Production Full Sweep (admin-only)
 *
 * Covers:
 * - Public pages (home + key pages) console/network sanity
 * - Portal gate page sanity
 * - OTP Terminal authenticated flows (delegates to logic similar to prod_terminal_sweep)
 *
 * Usage:
 *   OTP_ADMIN_TOKEN="..." node scripts/prod_full_sweep.js > prod-qa-full.json
 */

const { chromium } = require('playwright');

const ORIGIN = 'https://www.onlytrueperspective.tech';
const TOKEN_KEY = 'otp_admin_token';

const publicTargets = [
  { name: 'home', url: `${ORIGIN}/` },
  { name: 'packages', url: `${ORIGIN}/#packages` },
  { name: 'privacy', url: `${ORIGIN}/privacy` },
  { name: 'terms', url: `${ORIGIN}/terms` },
  { name: 'insights', url: `${ORIGIN}/insights` },
  { name: 'portal-gate', url: `${ORIGIN}/portal-gate` },
];

function short(s, n = 420) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

function redactJwt(s) {
  const t = String(s || '').trim();
  const parts = t.split('.');
  if (parts.length === 3) return `${parts[0]}.${parts[1].slice(0, 8)}…[redacted]`;
  return t ? `${t.slice(0, 8)}…[redacted]` : '';
}

function looksLikeJwt(s) {
  const t = String(s || '').trim();
  const parts = t.split('.');
  return parts.length === 3 && parts[0].length > 10 && parts[1].length > 10;
}

function tokenSetupHelp() {
  return [
    'OTP_ADMIN_TOKEN must be a real admin JWT (three dot-separated segments).',
    'GitHub Actions secret: Settings → Secrets and variables → Actions → OTP_ADMIN_TOKEN.',
    'Vercel env var if needed: OTP_ADMIN_TOKEN.',
    'Use the JWT from the admin login flow; do not use a placeholder or static bypass token.'
  ].join(' ');
}

async function runPageProbe({ context, url, name, viewport }) {
  const page = await context.newPage();
  const events = [];
  const push = (type, payload) => events.push({ at: new Date().toISOString(), type, ...payload });

  page.on('response', async (resp) => {
    try {
      const st = resp.status();
      if (st >= 400) {
        const u = resp.url();
        // Keep noise down: only log same-origin + supabase failures.
        if (u.startsWith(ORIGIN) || u.includes('supabase.co')) {
          push('response_error', { status: st, url: u.slice(0, 240) });
        }
      }
    } catch (_) {}
  });

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      push('console', { level: type, text: short(msg.text()) });
    }
  });
  page.on('pageerror', (err) => push('pageerror', { text: short(err?.message || err) }));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    const text = short(f?.errorText || '');
    if (!text) return;
    // Common during fast navigation; not a production defect.
    if (text.toLowerCase().includes('err_aborted')) return;
    push('requestfailed', { method: req.method(), url: req.url(), error: text });
  });

  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  push('nav', { status: resp ? resp.status() : null, finalUrl: page.url(), viewport });
  await page.waitForTimeout(1200);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

  // Basic overflow sanity
  const overflowX = await page.evaluate(() => {
    try {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    } catch (_) {
      return null;
    }
  }).catch(() => null);
  push('layout', { overflowX });

  await page.close();
  return { name, url, viewport, events };
}

async function runTerminalFlows({ context, token }) {
  const page = await context.newPage();
  const events = [];
  const push = (type, payload) => events.push({ at: new Date().toISOString(), type, ...payload });

  page.on('response', async (resp) => {
    try {
      const st = resp.status();
      if (st >= 400) {
        const u = resp.url();
        if (u.startsWith(ORIGIN) || u.includes('supabase.co')) {
          push('response_error', { status: st, url: u.slice(0, 240) });
        }
      }
    } catch (_) {}
  });

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      push('console', { level: type, text: short(msg.text()) });
    }
  });
  page.on('pageerror', (err) => push('pageerror', { text: short(err?.message || err) }));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    const text = short(f?.errorText || '');
    if (!text) return;
    if (text.toLowerCase().includes('err_aborted')) return;
    push('requestfailed', { method: req.method(), url: req.url(), error: text });
  });

  push('meta', { url: `${ORIGIN}/otp-terminal`, token: redactJwt(token) });
  const resp = await page.goto(`${ORIGIN}/otp-terminal`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  push('nav', { status: resp ? resp.status() : null, finalUrl: page.url() });
  await page.waitForTimeout(900);
  if (page.url().includes('portal-gate')) {
    push('auth', { ok: false, message: 'Redirected to portal-gate (token rejected)' });
    await page.close();
    return { ok: false, events };
  }
  push('auth', { ok: true });

  await page.waitForSelector('#opsJobsBadge', { timeout: 45000 });
  await page.evaluate(() => window.fetchOpsJobs?.());
  await page.waitForTimeout(1500);
  push('ops_jobs_badge', { text: short(await page.locator('#opsJobsBadge').innerText().catch(() => ''), 120) });

  // Open first job
  const openButtons = page.locator('button:has-text("OPEN / EDIT")');
  const openCount = await openButtons.count();
  push('ops_open_buttons', { count: openCount });
  if (openCount > 0) {
    await openButtons.first().click({ timeout: 15000 });
    await page.waitForSelector('#opsJobsEditor', { timeout: 15000 });
    await page.waitForTimeout(600);
  }

  // Generate Proposal
  const genProposal = page.locator('button:has-text("Generate Proposal")');
  if (await genProposal.count()) {
    await genProposal.first().click({ timeout: 15000 });
    await page.waitForTimeout(1800);
    push('doc_meta', { text: short(await page.locator('#opsDocMeta').innerText().catch(() => ''), 240) });
  }

  // Export PDF/DOCX
  async function tryDownload(btnText) {
    const btn = page.locator(`button:has-text("${btnText}")`);
    if (!(await btn.count())) return;
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45000 }).catch(() => null),
      btn.first().click({ timeout: 15000 }),
    ]);
    if (!download) push('download', { ok: false, kind: btnText, message: 'No download event' });
    else {
      push('download', { ok: true, kind: btnText, filename: download.suggestedFilename() });
      await download.cancel().catch(() => {});
    }
  }
  await tryDownload('EXPORT PDF');
  await tryDownload('EXPORT DOCX');

  // Packet preview + zip
  const packetSummary = page.locator('summary:has-text("PACKET BUILDER")');
  if (await packetSummary.count()) {
    const packetDetails = packetSummary.locator('..');
    const isOpen = await packetDetails.getAttribute('open').catch(() => null);
    if (isOpen == null) await packetSummary.first().click({ timeout: 15000 });
  }
  const buildPacket = page.locator('button:has-text("BUILD / PREVIEW")');
  if (await buildPacket.count()) {
    await buildPacket.first().click({ timeout: 15000 });
    await page.waitForTimeout(1400);
    push('packet_status', { text: short(await page.locator('#opsPacketStatus').innerText().catch(() => ''), 260) });
  }
  await tryDownload('EXPORT PACKET ZIP');

  // Send prep only (never send)
  const sendSummary = page.locator('summary:has-text("SEND (CONTROLLED)")');
  if (await sendSummary.count()) {
    const sendDetails = sendSummary.locator('..');
    const isOpen = await sendDetails.getAttribute('open').catch(() => null);
    if (isOpen == null) await sendSummary.first().click({ timeout: 15000 });
  }
  const prepSend = page.locator('button:has-text("PREPARE")');
  if (await prepSend.count()) {
    await prepSend.first().click({ timeout: 15000 });
    await page.waitForTimeout(1600);
    push('send_status', { text: short(await page.locator('#opsSendStatus').innerText().catch(() => ''), 320) });
  }

  // Checkbox visibility sanity (quick deal doc toggle)
  const qdDoc = page.locator('.qdDocNeed').first();
  if (await qdDoc.count()) {
    const before = await qdDoc.isChecked().catch(() => null);
    await qdDoc.click({ timeout: 15000 });
    const after = await qdDoc.isChecked().catch(() => null);
    push('quick_deal_doc_toggle', { before, after });
  }

  // Doc Packet approvals path depends on live threads/leads; we only validate the empty-state behavior here.
  await page.evaluate(() => window.fetchInbox?.());
  await page.waitForTimeout(1200);
  const inboxCount = await page.locator('#inboxManager button:has-text("MODULATE RESPONSE")').count();
  push('inbox_threads', { count: inboxCount });

  await page.evaluate(() => window.fetchLeads?.());
  await page.waitForTimeout(1200);
  const leadReplyCount = await page.locator('#leadsManager button[title="Reply"]').count();
  push('lead_reply_buttons', { count: leadReplyCount });

  await page.close();
  const hadErrors = events.some((e) => e.type === 'pageerror' || (e.type === 'console' && e.level === 'error'));
  return { ok: !hadErrors, events };
}

async function main() {
  const token = String(process.env.OTP_ADMIN_TOKEN || '').trim();
  if (!token) throw new Error(`Missing OTP_ADMIN_TOKEN env var. ${tokenSetupHelp()}`);
  if (!looksLikeJwt(token)) throw new Error(`OTP_ADMIN_TOKEN does not look like a JWT. ${tokenSetupHelp()}`);

  const browser = await chromium.launch({ headless: true });

  const sweep = { schema: 'otp-prod-full-sweep-v1', at: new Date().toISOString(), public: [], terminal: null };

  for (const vp of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    for (const t of publicTargets) {
      // Public probes: no token injection
      // eslint-disable-next-line no-await-in-loop
      sweep.public.push(await runPageProbe({ context, url: t.url, name: t.name, viewport: vp.name }));
    }
    await context.close();
  }

  // Terminal flows: inject token before scripts execute
  const termContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await termContext.addInitScript(({ key, value }) => {
    try { window.localStorage.setItem(key, value); } catch (_) {}
  }, { key: TOKEN_KEY, value: token });
  sweep.terminal = await runTerminalFlows({ context: termContext, token });
  await termContext.close();

  await browser.close();
  console.log(JSON.stringify(sweep, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ schema: 'otp-prod-full-sweep-v1', ok: false, error: short(e?.message || e) }, null, 2));
  process.exit(1);
});
