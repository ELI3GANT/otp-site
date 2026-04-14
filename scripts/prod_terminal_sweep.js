/* eslint-disable no-console */
/**
 * OTP prod Terminal sweep (admin-only).
 * - Reads OTP_ADMIN_TOKEN from env (never hardcode).
 * - Navigates to https://www.onlytrueperspective.tech/otp-terminal
 * - Runs a small interaction smoke: load jobs, open first job, generate doc,
 *   attempt exports, packet preview, send prep.
 *
 * Usage:
 *   OTP_ADMIN_TOKEN="..." node scripts/prod_terminal_sweep.js
 */

const { chromium } = require('playwright');

const ORIGIN = 'https://www.onlytrueperspective.tech';
const URL = `${ORIGIN}/otp-terminal`;
const TOKEN_KEY = 'otp_admin_token';

function redact(s) {
  const t = String(s || '');
  if (!t) return '';
  // Basic JWT redaction: keep header/prefix only
  const parts = t.split('.');
  if (parts.length >= 2) return `${parts[0]}.${parts[1].slice(0, 8)}…[redacted]`;
  return `${t.slice(0, 8)}…[redacted]`;
}

function short(s, n = 380) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

async function main() {
  const token = String(process.env.OTP_ADMIN_TOKEN || '').trim();
  if (!token) {
    throw new Error('Missing OTP_ADMIN_TOKEN env var');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Inject token before any scripts run.
  await context.addInitScript(({ key, value }) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {}
  }, { key: TOKEN_KEY, value: token });

  const page = await context.newPage();

  const events = [];
  const push = (type, payload) => events.push({ at: new Date().toISOString(), type, ...payload });

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
    if (text) push('requestfailed', { url: req.url(), method: req.method(), error: text });
  });

  push('meta', { url: URL, token: redact(token) });

  const resp = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  push('nav', { status: resp ? resp.status() : null });

  // Ensure we weren't redirected to gate.
  await page.waitForTimeout(800);
  const finalUrl = page.url();
  push('final_url', { url: finalUrl });
  if (finalUrl.includes('portal-gate')) {
    throw new Error('Redirected to portal-gate (token rejected or missing)');
  }

  // Wait for Terminal to render.
  await page.waitForSelector('#opsJobsBadge', { timeout: 45000 });

  // Load jobs
  await page.evaluate(() => window.fetchOpsJobs?.());
  await page.waitForTimeout(1500);
  const badge = await page.locator('#opsJobsBadge').innerText().catch(() => '');
  push('ops_jobs_badge', { text: short(badge, 120) });

  // Open first job if present
  const openButtons = page.locator('button:has-text("OPEN / EDIT")');
  const openCount = await openButtons.count();
  push('ops_open_buttons', { count: openCount });
  if (openCount > 0) {
    await openButtons.first().click({ timeout: 15000 });
    await page.waitForSelector('#opsJobsEditor', { timeout: 15000 });
    await page.waitForTimeout(600);
  } else {
    push('warn', { text: 'No jobs found to open; skipping doc/export flows.' });
  }

  // Generate a Proposal (non-destructive)
  const genProposal = page.locator('button:has-text("Generate Proposal")');
  if (await genProposal.count()) {
    await genProposal.first().click({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const meta = await page.locator('#opsDocMeta').innerText().catch(() => '');
    const out = await page.locator('#opsDocOutput').innerText().catch(() => '');
    push('doc_generated', { meta: short(meta, 200), out_preview: short(out, 240) });
  }

  // Export PDF/DOCX (download only; no email send)
  async function tryDownload(btnText) {
    const btn = page.locator(`button:has-text("${btnText}")`);
    if (!(await btn.count())) return;
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45000 }).catch(() => null),
      btn.first().click({ timeout: 15000 }),
    ]);
    if (!download) {
      push('download', { ok: false, kind: btnText, message: 'No download event (blocked or failed)' });
      return;
    }
    const suggested = download.suggestedFilename();
    push('download', { ok: true, kind: btnText, filename: suggested });
    await download.cancel().catch(() => {});
  }

  await tryDownload('EXPORT PDF');
  await tryDownload('EXPORT DOCX');

  // Packet preview/build
  // Ensure Packet Builder panel is open (details)
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
    const pktStatus = await page.locator('#opsPacketStatus').innerText().catch(() => '');
    push('packet_preview', { status: short(pktStatus, 240) });
  }

  // Send prep (never execute send)
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
    const sendStatus = await page.locator('#opsSendStatus').innerText().catch(() => '');
    push('send_prepare', { status: short(sendStatus, 320) });
  }

  // Final summary
  const hadErrors = events.some((e) => e.type === 'pageerror' || (e.type === 'console' && e.level === 'error'));
  console.log(JSON.stringify({ schema: 'otp-prod-terminal-sweep-v1', ok: !hadErrors, events }, null, 2));

  await context.close();
  await browser.close();
}

main().catch((e) => {
  console.error(JSON.stringify({ schema: 'otp-prod-terminal-sweep-v1', ok: false, error: short(e?.message || e) }, null, 2));
  process.exit(1);
});

