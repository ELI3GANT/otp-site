/* eslint-disable no-console */
/**
 * OTP prod Terminal sweep (admin-only).
 * - Reads OTP_ADMIN_TOKEN from env (never hardcode).
 * - Navigates to https://www.onlytrueperspective.tech/otp-terminal
 * - Runs an interaction sweep: ops jobs, docs+exports, packet preview+zip,
 *   send prep, quick deal save+open, and doc packet modal approve toggles.
 *
 * Usage:
 *   OTP_ADMIN_TOKEN="..." node scripts/prod_terminal_sweep.js > prod-terminal-sweep.json
 */

const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

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

function looksLikeJwt(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  const parts = t.split('.');
  return parts.length === 3 && parts[0].length > 10 && parts[1].length > 10;
}

async function main() {
  const token = String(process.env.OTP_ADMIN_TOKEN || '').trim();
  if (!token) {
    throw new Error('Missing OTP_ADMIN_TOKEN env var');
  }
  if (!looksLikeJwt(token)) {
    throw new Error('OTP_ADMIN_TOKEN does not look like a JWT');
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

  const artifactsDir = path.join(process.cwd(), 'qa-artifacts');
  try { fs.mkdirSync(artifactsDir, { recursive: true }); } catch (_) {}

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

  // Generate + export all ops docs (PDF + DOCX) from the same job record.
  const DOC_TYPES = ['Proposal', 'Invoice', 'Agreement', 'Paid Receipt', 'Service Summary'];

  async function tryDownload(btnText, prefix) {
    const btn = page.locator(`button:has-text("${btnText}")`);
    if (!(await btn.count())) return null;
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45000 }).catch(() => null),
      btn.first().click({ timeout: 15000 }),
    ]);
    if (!download) {
      push('download', { ok: false, kind: btnText, message: 'No download event (blocked or failed)' });
      return null;
    }
    const suggested = download.suggestedFilename();
    const safeName = `${prefix || 'opsdoc'}__${suggested}`.replace(/[^\w.\-]+/g, '_').slice(0, 180);
    const savePath = path.join(artifactsDir, safeName);
    await download.saveAs(savePath).catch(() => {});
    push('download', { ok: true, kind: btnText, filename: suggested, savedAs: path.relative(process.cwd(), savePath) });
    return savePath;
  }

  for (const docType of DOC_TYPES) {
    const genBtn = page.locator(`button:has-text("Generate ${docType}")`);
    if (!(await genBtn.count())) {
      push('doc_missing_button', { docType });
      continue;
    }

    await genBtn.first().click({ timeout: 15000 });
    await page.waitForTimeout(1700);

    const meta = await page.locator('#opsDocMeta').innerText().catch(() => '');
    const out = await page.locator('#opsDocOutput').innerText().catch(() => '');
    const outShort = short(out, 340);
    push('doc_generated', { docType, meta: short(meta, 200), out_preview: outShort });

    // Basic correctness assertions (non-fatal; record as warnings if missing).
    const mustContain = ['Live QA Test Client', 'QA-2026-04-14', 'OTP Validation Reel Cut', 'Video Editing Services', 'The Signal'];
    const missing = mustContain.filter((s) => !out.includes(s));
    if (missing.length) push('doc_assert_missing', { docType, missing });

    await tryDownload('EXPORT PDF', docType.toLowerCase().replace(/\s+/g, '-'));
    await tryDownload('EXPORT DOCX', docType.toLowerCase().replace(/\s+/g, '-'));
  }

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

  // Packet ZIP export (download only)
  const exportZip = page.locator('button:has-text("EXPORT PACKET ZIP")');
  if (await exportZip.count()) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45000 }).catch(() => null),
      exportZip.first().click({ timeout: 15000 }),
    ]);
    if (!download) push('download', { ok: false, kind: 'EXPORT PACKET ZIP', message: 'No download event' });
    else {
      push('download', { ok: true, kind: 'EXPORT PACKET ZIP', filename: download.suggestedFilename() });
      await download.cancel().catch(() => {});
    }
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

  // Quick Deal Mode (non-destructive: verify inputs + math + checkbox interactions; do NOT save)
  const qdName = page.locator('#qdClientName');
  if (await qdName.count()) {
    await qdName.fill('QA CHECK (no save)');
    await page.locator('#qdServiceType').fill('Video Editing Services');
    await page.locator('#qdPackageType').selectOption({ label: 'Custom' }).catch(async () => {
      await page.locator('#qdPackageType').selectOption('Custom').catch(() => {});
    });
    await page.locator('#qdSummary').fill('Interaction sweep only. No save performed.');
    await page.locator('#qdTotalPrice').fill('500');
    await page.locator('#qdDepositAmount').fill('250');
    await page.waitForTimeout(250);
    const rem = await page.locator('#qdRemainingBalance').innerText().catch(() => '');
    push('quick_deal_math', { remaining: short(rem, 60) });

    // Toggle a doc checkbox to verify interaction
    const qdDoc = page.locator('.qdDocNeed').first();
    if (await qdDoc.count()) {
      const before = await qdDoc.isChecked().catch(() => null);
      await qdDoc.click({ timeout: 15000 });
      const after = await qdDoc.isChecked().catch(() => null);
      push('quick_deal_doc_toggle', { before, after });
    }
  }

  // Doc Packet modal approve toggles (lead packet system)
  // Establish a reply context by opening the first inbox thread, then open DOC PACKET.
  // This does NOT send any email.
  await page.evaluate(() => window.fetchInbox?.());
  await page.waitForTimeout(1400);
  // Prefer MODULATE RESPONSE when draft exists, else GENERATE RESPONSE.
  // Prefer the canonical QA thread to avoid ambiguity when multiple threads exist.
  const inboxButtons = page.locator('#inboxManager .post-row:has-text("qa@example.com") button:has-text("MODULATE RESPONSE"), #inboxManager .post-row:has-text("qa@example.com") button:has-text("GENERATE RESPONSE")');
  const inboxCount = await inboxButtons.count();
  push('inbox_threads', { count: inboxCount });

  let openedReplyContext = false;
  if (inboxCount > 0) {
    await inboxButtons.first().click({ timeout: 15000 });
    await page.waitForSelector('#replyModal', { timeout: 15000 });
    await page.waitForTimeout(800);
    openedReplyContext = true;
  } else {
    // Fallback: open reply context from the first Perspective Audit Lead
    await page.evaluate(() => window.fetchLeads?.());
    await page.waitForTimeout(1600);
    const leadReplyBtn = page.locator('#leadsManager button[title="Reply"]');
    const leadReplyCount = await leadReplyBtn.count();
    push('lead_reply_buttons', { count: leadReplyCount });
    if (leadReplyCount > 0) {
      await leadReplyBtn.first().click({ timeout: 15000 });
      await page.waitForSelector('#replyModal', { timeout: 15000 });
      await page.waitForTimeout(800);
      openedReplyContext = true;
    }
  }

  if (openedReplyContext) {

    // Open doc packet from reply modal (this should set replyContactId/sourceTable).
    const replyDocBtn = page.locator('#replyDocsBtn');
    const replyDocVisible = await replyDocBtn.isVisible().catch(() => false);
    if (replyDocVisible) {
      await replyDocBtn.click({ timeout: 15000 });
    } else {
      await page.evaluate(() => window.openDocPacket?.());
    }

    const modal = page.locator('#docPacketModal');
    const modalVisible = await modal.isVisible().catch(() => false);
    if (!modalVisible) {
      push('doc_packet_skip', { reason: 'Doc packet modal did not open (unexpected in reply context)' });
    } else {
      await page.waitForTimeout(700);

      // Generate packet
      const gen = page.locator('#docPacketGenerateBtn');
      if (await gen.count()) {
        await gen.first().click({ timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2600);
      }

      // Toggle first non-disabled approval checkbox if present
      const toggle = page.locator('#docPacketList input.doc-approve-toggle:not([disabled])');
      const tCount = await toggle.count();
      push('doc_packet_toggles', { count: tCount });
      if (tCount > 0) {
        const before = await toggle.first().isChecked().catch(() => null);
        await toggle.first().click({ timeout: 15000 });
        await page.waitForTimeout(250);
        const after = await toggle.first().isChecked().catch(() => null);
        push('doc_packet_toggle', { before, after });

        // Apply approvals (persist + re-render send-pick UI)
        const apply = page.locator('#docPacketApproveBtn');
        if (await apply.count()) {
          await apply.first().click({ timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(2600);
          const stateSnap = await page.evaluate(() => {
            const st = window.__docPacketState || {};
            const docs = st.docs || {};
            const approved = Object.entries(docs).filter(([, v]) => v && v.approved).map(([k]) => k);
            return {
              packetId: st.packetId || null,
              approvedCount: approved.length,
              approvedKeys: approved,
              notice: st.notice || null,
            };
          }).catch(() => null);
          if (stateSnap) push('doc_packet_state_after_approve', stateSnap);
        }
      }

      // Toggle an "Attach to client email" checkbox (doc-send-include).
      const includeToggle = page.locator('#docPacketSendPick input.doc-send-include:not([disabled])');
      const iCount = await includeToggle.count();
      push('doc_packet_include_toggles', { count: iCount });
      if (iCount > 0) {
        const before = await includeToggle.first().isChecked().catch(() => null);
        await includeToggle.first().click({ timeout: 15000 });
        await page.waitForTimeout(250);
        const after = await includeToggle.first().isChecked().catch(() => null);
        push('doc_packet_include_toggle', { before, after });

        // Ensure we also verify the enabled state (checked=true) path.
        if (after === false) {
          await includeToggle.first().click({ timeout: 15000 });
          await page.waitForTimeout(250);
          const after2 = await includeToggle.first().isChecked().catch(() => null);
          push('doc_packet_include_toggle_2', { after: after2 });
        }
      }

      // Verify send button gate state transitions (never click send).
      const sendBtn = page.locator('#docPacketSendBtn');
      if (await sendBtn.count()) {
        const disabled = await sendBtn.isDisabled().catch(() => null);
        const title = await sendBtn.getAttribute('title').catch(() => null);
        push('doc_packet_send_gate', { disabled, title: short(title, 160) });
      }
    }
  } else {
    push('doc_packet_skip', { reason: 'No inbox threads or leads available to open reply context' });
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

