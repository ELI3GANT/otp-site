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

/**
 * Helper to retry page.evaluate calls up to 3 times if execution context is destroyed.
 * Waits for load state before retrying to ensure context stability.
 */
async function safeEvaluate(page, fn, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await page.evaluate(fn);
    } catch (e) {
      lastError = e;
      const msg = String(e?.message || e);
      if (msg.includes('Execution context was destroyed')) {
        if (i < maxRetries - 1) {
          // Wait for load state to stabilize and retry
          await page.waitForLoadState('domcontentloaded').catch(() => {});
          await page.waitForTimeout(300);
          continue;
        }
      }
      throw e;
    }
  }
  throw lastError;
}

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

  // Wait for any redirects to complete and page to stabilize
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  
  // Check for gate redirect—this should be stable now
  const finalUrl = page.url();
  push('final_url', { url: finalUrl });
  if (finalUrl.includes('portal-gate')) {
    throw new Error('Redirected to portal-gate (token rejected or missing)');
  }

  // Wait for Terminal to render—use locator with built-in waits instead of raw selector
  await page.locator('#opsJobsBadge').waitFor({ timeout: 45000 }).catch((e) => {
    throw new Error(`Terminal UI failed to render: ${e.message}`);
  });

  // Load jobs
  await safeEvaluate(page, () => window.fetchOpsJobs?.());
  await page.waitForTimeout(1500);
  const badge = await page.locator('#opsJobsBadge').innerText().catch(() => '');
  push('ops_jobs_badge', { text: short(badge, 120) });

  // Knowledge index sanity (non-destructive)
  await safeEvaluate(page, () => window.fetchKnowledgeFiles?.());
  await page.waitForTimeout(1200);
  const kbBadge = await page.locator('#knowledgeStatusBadge').innerText().catch(() => '');
  push('knowledge_badge', { text: short(kbBadge, 120) });
  const kbRows = page.locator('#knowledgeFilesManager button:has-text("ARCHIVE")');
  const kbCount = await kbRows.count().catch(() => 0);
  push('knowledge_rows', { count: kbCount });
  if (kbCount > 0) {
    const updCount = await page.locator('#knowledgeFilesManager button:has-text("UPDATE")').count().catch(() => 0);
    push('knowledge_update_buttons', { count: updCount });
    if (updCount === 0) push('warn', { text: 'Knowledge files exist but UPDATE button not found (UI regression?)' });
  }

  // Open first job if present
  const openButtons = page.locator('button:has-text("OPEN / EDIT")');
  const openCount = await openButtons.count();
  push('ops_open_buttons', { count: openCount });
  if (openCount > 0) {
    await openButtons.first().click({ timeout: 15000 });
    await page.locator('#opsJobsEditor').waitFor({ timeout: 15000 }).catch((e) => {
      throw new Error(`Job editor failed to open: ${e.message}`);
    });
    await page.waitForTimeout(600);
  } else {
    push('warn', { text: 'No jobs found to open; skipping doc/export flows.' });
  }

  // Generate + export all ops docs (PDF + DOCX) from the same job record.
  const DOC_TYPES = ['Proposal', 'Invoice', 'Agreement', 'Paid Receipt', 'Service Summary'];

  async function tryDownloadFromFunction(fnName, arg, prefix) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
      invokeUiFunction(fnName, arg),
    ]);
    if (!download) {
      push('download', { ok: false, kind: `${fnName}:${String(arg || '')}`, message: 'No download event (blocked or failed)' });
      return null;
    }
    const suggested = download.suggestedFilename();
    const safeName = `${prefix || 'opsdoc'}__${suggested}`.replace(/[^\w.\-]+/g, '_').slice(0, 180);
    const savePath = path.join(artifactsDir, safeName);
    await download.saveAs(savePath).catch(() => {});
    push('download', { ok: true, kind: `${fnName}:${String(arg || '')}`, filename: suggested, savedAs: path.relative(process.cwd(), savePath) });
    return savePath;
  }

  async function invokeUiFunction(fnName, arg) {
    return page.evaluate(async ({ name, value }) => {
      const fn = window[name];
      if (typeof fn !== 'function') {
        return { ok: false, reason: 'missing_fn' };
      }
      await fn(value);
      return { ok: true };
    }, { name: fnName, value: arg });
  }

  for (const docType of DOC_TYPES) {
    const genResult = await invokeUiFunction('generateOpsDoc', docType);
    push('doc_generate_call', { docType, ...genResult });
    await page.waitForTimeout(1700);

    const meta = await page.locator('#opsDocMeta').innerText().catch(() => '');
    const out = await page.locator('#opsDocOutput').innerText().catch(() => '');
    const outShort = short(out, 340);
    push('doc_generated', { docType, meta: short(meta, 200), out_preview: outShort });

    // Basic correctness assertions (non-fatal; avoid hard-coded QA strings).
    const checks = [];
    const hasMarkdownHeader = /^#\s+\w+/m.test(out);
    if (!hasMarkdownHeader) checks.push('missing_markdown_header');
    const hasJobId = /JOB-\d{6,}-[A-Z0-9]{4,}/.test(out);
    if (!hasJobId) checks.push('missing_job_id');
    // Should mention client/project labels somewhere.
    const hasClient = /\*\*Client\*\*:/i.test(out);
    if (!hasClient) checks.push('missing_client_label');
    const hasProject = /\*\*Project\*\*:/i.test(out);
    if (!hasProject) checks.push('missing_project_label');
    if (checks.length) push('doc_assert_warn', { docType, checks });

    await tryDownloadFromFunction('exportOpsDoc', 'pdf', docType.toLowerCase().replace(/\s+/g, '-'));
    await tryDownloadFromFunction('exportOpsDoc', 'docx', docType.toLowerCase().replace(/\s+/g, '-'));
  }

  const buildResult = await invokeUiFunction('previewOpsPacket');
  push('packet_preview_call', buildResult);
  await page.waitForTimeout(1400);
  const pktStatus = await page.locator('#opsPacketStatus').innerText().catch(() => '');
  push('packet_preview', { status: short(pktStatus, 240) });

  // Packet ZIP export (download only)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    invokeUiFunction('exportOpsPacketZip'),
  ]);
  if (!download) push('download', { ok: false, kind: 'EXPORT PACKET ZIP', message: 'No download event' });
  else {
    push('download', { ok: true, kind: 'EXPORT PACKET ZIP', filename: download.suggestedFilename() });
    await download.cancel().catch(() => {});
  }

  // Send prep (never execute send)
  const prepResult = await invokeUiFunction('prepareOpsSend');
  push('send_prepare_call', prepResult);
  await page.waitForTimeout(1600);
  const sendStatus = await page.locator('#opsSendStatus').innerText().catch(() => '');
  push('send_prepare', { status: short(sendStatus, 320) });

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
  await safeEvaluate(page, () => window.fetchInbox?.());
  await page.waitForTimeout(1400);

  /** `#replyModal` stays `display:none` until `openReplyManager` finishes; it is async, so onclick does not await — use evaluate+await for CI stability. */
  async function waitReplyModalVisible(timeoutMs = 20000) {
    try {
      await page.waitForFunction(() => {
        try {
          const el = document.getElementById('replyModal');
          if (!el) return false;
          const st = window.getComputedStyle(el);
          return st.display !== 'none' && st.visibility !== 'hidden';
        } catch (_) {
          return false;
        }
      }, { timeout: timeoutMs });
    } catch (e) {
      // If waitForFunction fails due to context destruction, try locator-based wait as fallback
      const msg = String(e?.message || e);
      if (msg.includes('Execution context was destroyed')) {
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        try {
          await page.locator('#replyModal').waitFor({ state: 'visible', timeout: 5000 });
        } catch (_) {
          // Still not visible; re-throw original error
          throw e;
        }
      } else {
        throw e;
      }
    }
  }

  let openedReplyContext = false;

  const openedContacts = await safeEvaluate(page, async () => {
    try {
      const cache = window.inboxCache;
      if (!Array.isArray(cache) || cache.length === 0) return { ok: false, reason: 'no_inbox_cache' };
      const prefer = cache.find((c) => c && String(c.email || '').toLowerCase() === 'qa@example.com');
      const c = prefer || cache[0];
      if (!c || c.id == null) return { ok: false, reason: 'no_row' };
      if (typeof window.openReplyManager !== 'function') return { ok: false, reason: 'no_fn' };
      await window.openReplyManager(String(c.id), 'contacts');
      return { ok: true, id: String(c.id) };
    } catch (e) {
      return { ok: false, reason: String(e && e.message ? e.message : e) };
    }
  });
  push('reply_open_eval', openedContacts);
  if (openedContacts && openedContacts.ok) {
    try {
      await waitReplyModalVisible(20000);
      await page.waitForTimeout(800);
      openedReplyContext = true;
    } catch (e) {
      push('warn', { text: `replyModal not visible after openReplyManager: ${short(e?.message || e)}` });
    }
  }

  if (!openedReplyContext) {
    // Legacy path: click inbox CTA (async handler may race; eval path above is preferred).
    let inboxButtons = page.locator('#inboxManager .post-row:has-text("qa@example.com") button:has-text("MODULATE RESPONSE"), #inboxManager .post-row:has-text("qa@example.com") button:has-text("GENERATE RESPONSE")');
    let inboxCount = await inboxButtons.count();
    if (inboxCount === 0) {
      inboxButtons = page.locator('#inboxManager .post-row button:has-text("MODULATE RESPONSE"), #inboxManager .post-row button:has-text("GENERATE RESPONSE")');
      inboxCount = await inboxButtons.count();
      if (inboxCount > 0) push('inbox_threads', { count: inboxCount, note: 'fallback_any_thread' });
      else push('inbox_threads', { count: 0 });
    } else {
      push('inbox_threads', { count: inboxCount, note: 'qa_thread_preferred' });
    }

    if (inboxCount > 0) {
      await inboxButtons.first().click({ timeout: 15000 });
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      try {
        await waitReplyModalVisible(20000);
      } catch (_) {
        await page.locator('#replyModal').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      }
      await page.waitForTimeout(800);
      openedReplyContext = true;
    } else {
      await safeEvaluate(page, () => window.fetchLeads?.());
      await page.waitForTimeout(1600);
      const leadOpened = await safeEvaluate(page, async () => {
        try {
          const cache = window.leadsCache;
          if (!Array.isArray(cache) || !cache.length) return { ok: false };
          const row = cache[0];
          if (!row || row.id == null) return { ok: false };
          await window.openReplyManager(String(row.id), 'leads');
          return { ok: true };
        } catch (e) {
          return { ok: false, err: String(e && e.message ? e.message : e) };
        }
      });
      push('reply_open_lead_eval', leadOpened);
      if (leadOpened && leadOpened.ok) {
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        try {
          await waitReplyModalVisible(20000);
          await page.waitForTimeout(800);
          openedReplyContext = true;
        } catch (e) {
          push('warn', { text: `lead replyModal: ${short(e?.message || e)}` });
        }
      }
      if (!openedReplyContext) {
        const leadReplyBtn = page.locator('#leadsManager button[title="Reply"]');
        const leadReplyCount = await leadReplyBtn.count();
        push('lead_reply_buttons', { count: leadReplyCount });
        if (leadReplyCount > 0) {
          await leadReplyBtn.first().click({ timeout: 15000 });
          await page.waitForLoadState('domcontentloaded').catch(() => {});
          try {
            await waitReplyModalVisible(20000);
          } catch (_) {
            await page.locator('#replyModal').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
          }
          await page.waitForTimeout(800);
          openedReplyContext = true;
        }
      }
    }
  }

  if (openedReplyContext) {

    // Open doc packet from reply modal (this should set replyContactId/sourceTable).
    const replyDocBtn = page.locator('#replyDocsBtn');
    const replyDocVisible = await replyDocBtn.isVisible().catch(() => false);
    if (replyDocVisible) {
      await replyDocBtn.click({ timeout: 15000 });
    } else {
      await safeEvaluate(page, () => window.openDocPacket?.());
    }

    // Wait for modal to stabilize after click/evaluate
    await page.waitForLoadState('domcontentloaded').catch(() => {});

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
          const stateSnap = await safeEvaluate(page, () => {
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
