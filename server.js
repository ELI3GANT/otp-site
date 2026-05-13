const fs = require('fs');
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});

// Load environment variables (Standard)
require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const mammoth = require('mammoth');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const JSZip = require('jszip');

/** Transparent OTP mark (`assets/otp-mark-doc.png`) as data URI for self-contained Oracle HTML. */
let _otpDocLogoDataUri;
function getOtpDocLogoDataUri() {
    if (_otpDocLogoDataUri !== undefined) return _otpDocLogoDataUri;
    try {
        const buf = fs.readFileSync(path.join(__dirname, 'assets', 'otp-mark-doc.png'));
        _otpDocLogoDataUri = `data:image/png;base64,${buf.toString('base64')}`;
    } catch (e) {
        _otpDocLogoDataUri = '';
    }
    return _otpDocLogoDataUri;
}

// Safe Stripe Init
let stripe = null;
try {
    if (process.env.STRIPE_SECRET_KEY) {
        // Trim to remove accidental whitespace/newlines from copy-paste
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY.trim());
    }
} catch (err) {
    console.warn("⚠️ Stripe Init Failed (Check ENV Key format):", err.message);
}

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

if (!stripe) {
    console.warn("⚠️ Stripe Payment System OFFLINE: Key missing or invalid.");
}

const app = express();
app.disable('x-powered-by'); // Hide stack details
app.set('trust proxy', 1); // Trust Vercel proxy before any rate limiter reads req.ip.
const port = process.env.PORT || 3000;
let OTP_PRICING = null;
try {
    OTP_PRICING = require('./pricing-config.js');
} catch (e) {
    OTP_PRICING = null;
}
let OTP_VIDEO_LIBRARY = null;
try {
    OTP_VIDEO_LIBRARY = require('./otp-video-library.js');
} catch (e) {
    OTP_VIDEO_LIBRARY = null;
}

function positiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const YOUTUBE_SYNC_TIMEOUT_MS = positiveNumber(process.env.YOUTUBE_SYNC_TIMEOUT_MS, 6500);
const YOUTUBE_SYNC_CACHE_TTL_MS = positiveNumber(process.env.YOUTUBE_SYNC_CACHE_TTL_MS, 15 * 60 * 1000);
const YOUTUBE_SYNC_STALE_TTL_MS = positiveNumber(process.env.YOUTUBE_SYNC_STALE_TTL_MS, 6 * 60 * 60 * 1000);
let youtubeVideoCache = { fetchedAt: 0, videos: [] };

function decodeXmlText(raw) {
    return String(raw || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}

function extractXmlTag(xml, tagName) {
    const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(xml || '').match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
    return match ? decodeXmlText(match[1]).trim() : '';
}

function extractXmlAttr(xml, tagName, attrName) {
    const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedAttr = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(xml || '').match(new RegExp(`<${escapedTag}[^>]*\\s${escapedAttr}=["']([^"']+)["'][^>]*>`, 'i'));
    return match ? decodeXmlText(match[1]).trim() : '';
}

function parseYoutubeRssVideos(xml) {
    const entries = String(xml || '').match(/<entry[\s\S]*?<\/entry>/gi) || [];
    return entries.map((entry) => {
        const id = extractXmlTag(entry, 'yt:videoId');
        return {
            id,
            title: extractXmlTag(entry, 'title'),
            url: id ? `https://www.youtube.com/watch?v=${id}` : extractXmlTag(entry, 'link'),
            embedUrl: id ? `https://www.youtube.com/embed/${id}` : '',
            thumbnail: extractXmlAttr(entry, 'media:thumbnail', 'url'),
            publishedAt: extractXmlTag(entry, 'published'),
            description: extractXmlTag(entry, 'media:description'),
            source: 'youtube',
            category: 'Video / Recap',
            bookable: true
        };
    }).filter((video) => video.id);
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = YOUTUBE_SYNC_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return data;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchTextWithTimeout(url, options = {}, timeoutMs = YOUTUBE_SYNC_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const text = await response.text().catch(() => '');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return text;
    } finally {
        clearTimeout(timer);
    }
}

function normalizeYoutubeVideos(videos) {
    const lib = OTP_VIDEO_LIBRARY;
    if (!lib || typeof lib.mergeVideoLists !== 'function') return [];
    return lib.mergeVideoLists(Array.isArray(videos) ? videos : [], lib.getFallbackVideos()).slice(0, 24);
}

async function fetchYoutubeVideosFromApi(channelId) {
    const key = String(process.env.YOUTUBE_API_KEY || '').trim();
    if (!key || !channelId) return [];
    const params = new URLSearchParams({
        part: 'snippet',
        channelId,
        maxResults: '12',
        order: 'date',
        type: 'video',
        key
    });
    const data = await fetchJsonWithTimeout(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
        headers: { Accept: 'application/json' }
    });
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((item) => {
        const id = item?.id?.videoId;
        const snippet = item?.snippet || {};
        return {
            id,
            title: snippet.title,
            description: snippet.description,
            publishedAt: snippet.publishedAt,
            thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
            source: 'youtube',
            category: 'Video / Recap',
            bookable: true
        };
    }).filter((video) => video.id);
}

async function fetchYoutubeVideosFromRss(channelId) {
    if (!channelId) return [];
    const params = new URLSearchParams({ channel_id: channelId });
    const xml = await fetchTextWithTimeout(`https://www.youtube.com/feeds/videos.xml?${params.toString()}`, {
        headers: { Accept: 'application/atom+xml, application/xml;q=0.9, text/xml;q=0.8' }
    });
    return parseYoutubeRssVideos(xml);
}

async function fetchLatestYoutubeVideos() {
    const lib = OTP_VIDEO_LIBRARY;
    const channelId = String(process.env.OTP_YOUTUBE_CHANNEL_ID || process.env.YOUTUBE_CHANNEL_ID || lib?.YOUTUBE_CHANNEL?.id || '').trim();
    const apiVideos = await fetchYoutubeVideosFromApi(channelId);
    if (apiVideos.length) return apiVideos;
    return fetchYoutubeVideosFromRss(channelId);
}

/** Slug / post_slug for RPC and filters: capped length, no control chars or angle brackets. */
function sanitizeSlugInput(raw) {
    const slug = String(raw ?? '').trim().slice(0, 256);
    if (!slug || /[\x00-\x08\x0b\x0c\x0e-\x1f<>\\]/.test(slug)) return null;
    return slug;
}

/** Escape user text for safe interpolation into HTML email bodies. */
function escapeHtmlForEmail(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function moneyFromRange(rangeText) {
    const txt = String(rangeText || '');
    const matches = txt.match(/\$[\d,]+/g) || [];
    const nums = matches.map(m => Number(m.replace(/[^0-9]/g, ''))).filter(n => Number.isFinite(n) && n > 0);
    if (!nums.length) return null;
    return { low: Math.min(...nums), high: Math.max(...nums) };
}

function pushLeadLine(parts, label, value) {
    if (!Array.isArray(parts) || !label) return;
    const v = normalizeWhitespace(String(value == null ? '' : value));
    if (v) parts.push(`${label}: ${v}`);
}

function buildDocFields({ lead, sourceTable, recommendation }) {
    const rec = recommendation || {};
    const docs = Array.isArray(rec.required_documents) ? rec.required_documents : [];
    const pkg = String(rec.recommended_package || '').trim();
    const quoteRange = String(rec.quote_range || '').trim();
    const serviceType = String(rec.service_type || '').trim();
    const knowledgeBasis = Array.isArray(rec.knowledge_basis) ? rec.knowledge_basis : [];
    const quote = moneyFromRange(quoteRange);
    const low = quote ? quote.low : null;
    const depositDue = low ? Math.round(low * 0.5) : null;

    const name = String(lead?.name || (sourceTable === 'leads' ? 'Valued Lead' : 'Client') || '').trim();
    const email = String(lead?.email || '').trim();
    const createdAt = lead?.created_at ? new Date(lead.created_at) : new Date();
    const missionBrief = normalizeWhitespace(buildLeadText(lead, sourceTable));
    const pkgReason = String(rec.package_reason || '').trim();
    const docsReason = String(rec.documents_reason || '').trim();
    const rationale = [
        pkgReason && `Package: ${pkgReason}`,
        docsReason && `Documents: ${docsReason}`
    ].filter(Boolean).join('\n\n');

    let leadSummary = [missionBrief, rationale].filter(Boolean).join('\n\n———\n\n');
    if (!normalizeWhitespace(leadSummary)) {
        leadSummary = sourceTable === 'contacts'
            ? normalizeWhitespace([lead?.message, lead?.project_details].filter(Boolean).join('\n\n'))
            : normalizeWhitespace(String(lead?.message || ''));
    }
    if (!normalizeWhitespace(leadSummary)) leadSummary = 'N/A';
    else leadSummary = leadSummary.slice(0, 8000);
    const tacticalAdvice = extractTacticalAdviceFromLead(lead);

    return {
        generated_at: new Date().toISOString(),
        client_name: name,
        client_email: email,
        lead_created_at: createdAt.toISOString(),
        mission_brief: missionBrief,
        package_reason: pkgReason,
        documents_reason: docsReason,
        lead_summary: leadSummary,
        tactical_advice: tacticalAdvice,
        service_type: serviceType || 'unknown',
        knowledge_basis: knowledgeBasis,
        recommended_package: pkg || 'Manual Review',
        quote_range: quoteRange || 'Scope-based',
        required_documents: docs,
        deposit_due_cents: depositDue ? (depositDue * 100) : null,
        invoice_total_cents: low ? (low * 100) : null,
        invoice_currency: 'USD',
        client_signature_name: '',
        client_signature_date: '',
        sender_email: 'bookings@onlytrueperspective.tech',
        sender_company: 'Only True Perspective LLC'
    };
}

/** Knowledge hits rendered as a compact list for packet HTML previews (Oracle transparency). */
function formatKnowledgeBasisHtml(knowledgeBasis, maxItems = 14) {
    if (!Array.isArray(knowledgeBasis) || !knowledgeBasis.length) return '';
    const slice = knowledgeBasis.slice(0, maxItems);
    const items = slice.map((h) => {
        const name = escapeHtml(String(h?.file_name || 'file'));
        const idx = h?.chunk_index != null && h?.chunk_index !== '' ? `#${escapeHtml(String(h.chunk_index))}` : '';
        const pct = Number.isFinite(Number(h?.similarity)) ? Math.round(Number(h.similarity) * 100) : null;
        return `<li><span class="kb-name">${name}${idx}</span>${pct != null ? ` <span class="kb-pct">${pct}%</span>` : ''}</li>`;
    }).join('\n');
    const more = knowledgeBasis.length > maxItems
        ? `<p class="kb-more">…and ${knowledgeBasis.length - maxItems} more indexed matches (preview capped).</p>`
        : '';
    return `
  <h2>Oracle knowledge citations</h2>
  <ul class="kb-list" role="list">${items}</ul>${more}`;
}

function docPacketSubtitle(docType) {
    switch (docType) {
        case 'proposal':
            return 'OTP Oracle draft — review internally before any client-facing export.';
        case 'agreement':
            return 'Service agreement draft — legal review recommended before signature.';
        case 'invoice':
            return 'Deposit figures follow the quote-range floor — reconcile in job sheet before send.';
        case 'nda':
            return 'Confidentiality draft — align with counsel and scope before signature.';
        case 'media_release':
            return 'Media / portrait release draft — verify usage rights and deliverables.';
        default:
            return 'OTP-generated preview — manual approval required.';
    }
}

function renderHtmlDoc(docType, fields) {
    const f = fields || {};
    const titleMap = {
        proposal: 'Project Proposal',
        agreement: 'Client Service Agreement',
        invoice: 'Invoice (50% Deposit)',
        nda: 'Mutual NDA',
        media_release: 'Media Release'
    };
    const title = titleMap[docType] || 'Document';
    const docsLine = Array.isArray(f.required_documents) && f.required_documents.length
        ? f.required_documents.join(', ')
        : 'Manual document selection required';

    const missionRaw = normalizeWhitespace(String(f.mission_brief || '').trim() || String(f.lead_summary || '').trim());
    const missionFull = missionRaw || 'N/A';
    const MISSION_PREVIEW_CAP = 5200;
    const missionTruncated = missionFull.length > MISSION_PREVIEW_CAP;
    const mission = missionTruncated ? missionFull.slice(0, MISSION_PREVIEW_CAP) : missionFull;
    const pkgR = String(f.package_reason || '').trim();
    const docR = String(f.documents_reason || '').trim();
    const tac = String(f.tactical_advice || '').trim();
    const tacProbe = tac.slice(0, Math.min(96, tac.length)).toLowerCase();
    const missionLower = mission.toLowerCase();
    const showTac = Boolean(tac && tacProbe && !missionLower.includes(tacProbe));
    const htmlPkg = pkgR ? `\n  <h2>Package rationale</h2>\n  <p class="prose">${escapeHtml(pkgR)}</p>` : '';
    const htmlDocR = docR ? `\n  <h2>Document rationale</h2>\n  <p class="prose">${escapeHtml(docR)}</p>` : '';
    const htmlTac = showTac ? `\n  <h2>Tactical summary</h2>\n  <p class="scope prose">${escapeHtml(tac)}</p>` : '';
    const htmlKb = formatKnowledgeBasisHtml(f.knowledge_basis);
    const subtitle = docPacketSubtitle(docType);
    const truncNote = missionTruncated
        ? `<p class="trunc-note">Preview truncated (${missionFull.length.toLocaleString()} characters). Full text remains in packet fields for merge/export.</p>`
        : '';

    const invTotal = f.invoice_total_cents ? ('$' + (f.invoice_total_cents / 100).toLocaleString('en-US')) : 'Scope-based';
    const invDep = f.deposit_due_cents ? ('$' + (f.deposit_due_cents / 100).toLocaleString('en-US')) : 'Scope-based';

    const logoUri = getOtpDocLogoDataUri();
    const logoHtml = logoUri
        ? `<img class="doc-logo" src="${logoUri}" alt="OTP" width="84" height="84" decoding="async" />`
        : '';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — ${escapeHtml(f.client_name || '')}</title>
  <meta name="color-scheme" content="light dark" />
  <style>
    :root {
      color-scheme: light dark;
      --doc-bg: #fafafa;
      --doc-text: #121218;
      --doc-muted: #5c5c6e;
      --doc-muted2: #4a4a58;
      --doc-surface: #f0f0f4;
      --doc-surface2: #ffffff;
      --doc-border: #d4d4de;
      --doc-line: #1a1a22;
      --doc-accent: #0d7a5c;
      --doc-warn-bg: rgba(255, 170, 60, 0.12);
      --doc-warn-border: rgba(200, 130, 40, 0.45);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --doc-bg: #0b0b10;
        --doc-text: #ececf3;
        --doc-muted: #9a9aaa;
        --doc-muted2: #b0b0c0;
        --doc-surface: #14141c;
        --doc-surface2: #101018;
        --doc-border: #2c2c38;
        --doc-line: #d0d0dc;
        --doc-accent: #3ecf9a;
        --doc-warn-bg: rgba(255, 190, 90, 0.1);
        --doc-warn-border: rgba(255, 200, 120, 0.35);
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto, Arial, sans-serif;
      margin: 0;
      padding: clamp(16px, 4vw, 40px);
      max-width: 820px;
      margin-inline: auto;
      background: var(--doc-bg);
      color: var(--doc-text);
      -webkit-font-smoothing: antialiased;
    }
    .shell {
      background: var(--doc-surface2);
      border: 1px solid var(--doc-border);
      border-radius: 14px;
      padding: clamp(18px, 3.5vw, 28px);
      box-shadow: 0 1px 0 rgba(0,0,0,0.04);
    }
    @media (prefers-color-scheme: dark) {
      .shell { box-shadow: 0 1px 0 rgba(255,255,255,0.04); }
    }
    .doc-brand {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 18px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--doc-border);
    }
    .doc-logo {
      width: 72px;
      height: auto;
      max-height: 84px;
      flex-shrink: 0;
      object-fit: contain;
      display: block;
    }
    /* Light UI / print: dark mark. Dark UI: light mark (assumes light-on-transparent artwork). */
    @media (prefers-color-scheme: light) {
      .doc-logo { filter: brightness(0) saturate(100%); opacity: 0.92; }
    }
    @media (prefers-color-scheme: dark) {
      .doc-logo { filter: none; opacity: 0.98; }
    }
    .doc-brand-copy { min-width: 0; flex: 1; }
    .doc-brand-company {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--doc-muted2);
      margin-bottom: 8px;
    }
    .doc-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 8px;
      align-items: center;
    }
    .doc-pill {
      font-size: 10px;
      font-weight: 750;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 4px 9px;
      border-radius: 999px;
      border: 1px solid var(--doc-warn-border);
      background: var(--doc-warn-bg);
      color: var(--doc-muted2);
    }
    .meta {
      color: var(--doc-muted);
      font-size: 12px;
      margin-bottom: 14px;
      line-height: 1.55;
    }
    h1 {
      font-size: clamp(1.25rem, 4.2vw, 1.65rem);
      margin: 0 0 6px;
      color: var(--doc-text);
      font-weight: 750;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .subtitle {
      font-size: 13px;
      color: var(--doc-muted);
      line-height: 1.45;
      margin: 0 0 18px;
      max-width: 62ch;
    }
    h2 {
      font-size: 14px;
      margin: 24px 0 8px;
      color: var(--doc-text);
      font-weight: 650;
      letter-spacing: 0.01em;
      border-bottom: 1px solid var(--doc-border);
      padding-bottom: 4px;
    }
    .prose, p, li {
      font-size: 14px;
      line-height: 1.65;
      color: var(--doc-text);
    }
    p { margin: 0 0 12px; }
    .scope { white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
    .trunc-note {
      font-size: 12px;
      color: var(--doc-muted);
      margin: 8px 0 0;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--doc-surface);
      border: 1px dashed var(--doc-border);
    }
    .box {
      border: 1px solid var(--doc-border);
      border-radius: 12px;
      padding: 16px 18px;
      background: var(--doc-surface);
      color: var(--doc-text);
    }
    .box strong { color: var(--doc-text); }
    .row { display: flex; gap: 18px; flex-wrap: wrap; }
    .col { flex: 1; min-width: min(200px, 100%); }
    .dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px 14px;
      font-size: 14px;
      margin: 0;
    }
    .dl dt { color: var(--doc-muted); font-weight: 600; }
    .dl dd { margin: 0; }
    .callout {
      margin-top: 20px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--doc-border);
      background: var(--doc-surface);
      font-size: 13px;
      line-height: 1.55;
      color: var(--doc-muted2);
    }
    .callout strong { color: var(--doc-text); }
    .kb-list {
      margin: 0;
      padding-left: 1.2rem;
      font-size: 13px;
      line-height: 1.55;
    }
    .kb-list li { margin-bottom: 4px; }
    .kb-name { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    .kb-pct { color: var(--doc-accent); font-weight: 700; font-size: 12px; }
    .kb-more { font-size: 12px; color: var(--doc-muted); margin: 8px 0 0; }
    .sign { margin-top: 32px; padding-top: 8px; border-top: 1px solid var(--doc-border); }
    .sign .line { margin-top: 36px; border-top: 1px solid var(--doc-line); width: min(280px, 75vw); }
    .small { font-size: 12px; color: var(--doc-muted2); }
    ul { padding-left: 1.2rem; }
    @media (max-width: 520px) {
      body { padding: 14px 12px; }
      .shell { padding: 16px 14px; border-radius: 12px; }
      .box .row { flex-direction: column; }
      .dl { grid-template-columns: 1fr; }
    }
    @media print {
      body { background: #fff; padding: 12mm; }
      .shell { box-shadow: none; border: none; padding: 0; }
      .doc-logo { filter: brightness(0) saturate(100%); opacity: 0.9; }
      .doc-pill { border-style: solid; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="doc-brand">
      ${logoHtml}
      <div class="doc-brand-copy">
        <div class="doc-brand-company">${escapeHtml(f.sender_company || 'Only True Perspective LLC')}</div>
        <div class="doc-pills" role="note">
          <span class="doc-pill">OTP Oracle</span>
          <span class="doc-pill">Draft</span>
          <span class="doc-pill">Not client-final</span>
        </div>
      </div>
    </header>
    <div class="meta">${escapeHtml(f.sender_email || '')}<br/>Generated ${escapeHtml(f.generated_at || '')}</div>
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <div class="box">
      <div class="row">
        <div class="col"><div class="small">Client</div><div><strong>${escapeHtml(f.client_name || '')}</strong></div><div class="small">${escapeHtml(f.client_email || '')}</div></div>
        <div class="col"><div class="small">Recommended package</div><div><strong>${escapeHtml(f.recommended_package || '')}</strong></div><div class="small">${escapeHtml(f.quote_range || '')}</div></div>
      </div>
      ${f.service_type ? `<div style="margin-top:12px;" class="small">Service type: <strong>${escapeHtml(String(f.service_type))}</strong></div>` : ''}
    </div>

    <h2>Client &amp; mission details</h2>
    <p class="scope prose">${escapeHtml(mission)}</p>${truncNote}${htmlPkg}${htmlDocR}${htmlTac}${htmlKb}

    <h2>Required documents</h2>
    <p class="prose">${escapeHtml(docsLine)}</p>

  ${docType === 'invoice' ? `
    <h2>Invoice details</h2>
    <dl class="dl">
      <dt>Currency</dt><dd>${escapeHtml(f.invoice_currency || 'USD')}</dd>
      <dt>Est. total <span class="small">(range floor)</span></dt><dd><strong>${invTotal}</strong></dd>
      <dt>Deposit <span class="small">(50%)</span></dt><dd><strong>${invDep}</strong></dd>
    </dl>
  ` : ''}

    <div class="callout"><strong>Admin review</strong> — This HTML is a preview from OTP Oracle fields. Approve in Terminal, align master DOCX/PDF, and verify amounts in the job sheet before any client send.</div>

    <div class="sign">
      <div class="small">Approver signature</div>
      <div class="line"></div>
    </div>
  </div>
</body>
</html>`;
}

async function ensureDocTemplateBucket() {
    if (!supabaseAdmin?.storage) return;
    try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const exists = Array.isArray(buckets) && buckets.some(b => b?.name === DOC_TEMPLATE_BUCKET);
        if (!exists) {
            await supabaseAdmin.storage.createBucket(DOC_TEMPLATE_BUCKET, { public: false });
        }
    } catch (e) {
        // non-fatal: may already exist or be restricted
    }
}

function normalizeDocxData(fields) {
    const flat = { ...(fields || {}) };
    if (flat.invoice_total_cents != null) flat.invoice_total = `$${(Number(flat.invoice_total_cents) / 100).toFixed(0)}`;
    if (flat.deposit_due_cents != null) flat.deposit_due = `$${(Number(flat.deposit_due_cents) / 100).toFixed(0)}`;
    if (Array.isArray(flat.required_documents)) flat.required_documents_csv = flat.required_documents.join(', ');
    if (flat.tactical_advice == null || flat.tactical_advice === '') {
        flat.tactical_advice = String(flat.lead_summary || '').trim().slice(0, 2500);
    }
    return flat;
}

async function getTemplateBuffer(templateKey) {
    await ensureDocTemplateBucket();
    const { data, error } = await supabaseAdmin.storage.from(DOC_TEMPLATE_BUCKET).download(templateKey);
    if (error) throw error;
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
}

function formatDocxtemplaterRenderError(err) {
    if (!err) return 'Unknown DOCX render error';
    const props = err.properties;
    const chunks = [String(err.message || err)];
    if (props && typeof props === 'object') {
        if (props.explanation) chunks.push(String(props.explanation));
        if (props.xtag != null) chunks.push(`placeholder:${String(props.xtag)}`);
    }
    return chunks.join(' — ');
}

function renderDocxFromTemplate(templateBuffer, fields) {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' }
    });
    doc.setData(normalizeDocxData(fields));
    try {
        doc.render();
    } catch (err) {
        const e = new Error(formatDocxtemplaterRenderError(err));
        e.cause = err;
        throw e;
    }
    return doc.getZip().generate({ type: 'nodebuffer' });
}

function dollarsFromCents(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n)) return null;
    const dollars = Math.round(n / 100);
    return `$${dollars.toLocaleString('en-US')}`;
}

function safeFilenamePart(s) {
    return String(s || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-\.]/g, '')
        .slice(0, 80) || 'doc';
}

function docTypeToSlug(docType) {
    return String(docType || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'document';
}

function opsDocMarkdownToPlainText(md) {
    const raw = String(md || '').replace(/\r\n/g, '\n');
    // Minimal, stable markdown → plain transform (no invention, no interpretation).
    return raw
        .replace(/^#\s+(.*)$/gm, '\n$1\n')          // title
        .replace(/^#{2,6}\s+(.*)$/gm, '\n$1\n')     // headings
        .replace(/\*\*(.*?)\*\*/g, '$1')  // bold
        .replace(/`([^`]+)`/g, '$1')      // inline code
        .replace(/^\-\s+/gm, '• ')        // bullets
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function stripLeadingDocTitleLine(plainText, docType) {
    const raw = String(plainText || '').replace(/\r\n/g, '\n');
    const lines = raw.split('\n');
    while (lines.length && !String(lines[0]).trim()) lines.shift();
    const first = String(lines[0] || '').trim();
    const want = String(docType || '').trim();
    if (want && first.toLowerCase() === want.toLowerCase()) {
        lines.shift();
        while (lines.length && !String(lines[0]).trim()) lines.shift();
        return lines.join('\n').trim();
    }
    return raw.trim();
}

async function renderOpsDocPdfFromText({ title, subtitle, bodyText }) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage([612, 792]); // US Letter
    const { width, height } = page.getSize();

    const ink = rgb(0.06, 0.07, 0.09);
    const paper = rgb(0.98, 0.98, 0.99);
    const muted = rgb(0.35, 0.38, 0.44);
    const accent = rgb(0.0, 0.92, 1.0);

    const margin = 54;
    const contentW = width - margin * 2;

    const headerH = 96;
    page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
    page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: ink });
    page.drawRectangle({ x: 0, y: height - headerH, width, height: 3, color: accent });

    // Title block
    page.drawText('ONLY TRUE PERSPECTIVE', { x: margin, y: height - headerH + 56, size: 12, font: fontBold, color: rgb(0.92, 0.94, 0.98) });
    page.drawText('OnlyTruePerspective LLC', { x: margin, y: height - headerH + 40, size: 9, font, color: rgb(0.75, 0.78, 0.84) });
    page.drawText(String(title || 'Document'), { x: margin, y: height - headerH + 18, size: 14, font: fontBold, color: rgb(0.96, 0.97, 0.99) });

    let y = height - headerH - 22;
    if (subtitle) {
        const subLines = wrapPdfTextToLines(String(subtitle), font, 9.2, contentW).slice(0, 3);
        for (const ln of subLines) {
            page.drawText(ln, { x: margin, y, size: 9.2, font, color: muted });
            y -= 12.5;
        }
        y -= 8;
    }

    const body = String(bodyText || '').trim();
    const lines = wrapPdfTextToLines(body || '—', font, 10.2, contentW);
    for (const ln of lines) {
        if (y < 72) {
            const p2 = pdfDoc.addPage([612, 792]);
            p2.drawRectangle({ x: 0, y: 0, width, height, color: paper });
            page = p2;
            // Page header (minimal, consistent)
            p2.drawText('OnlyTruePerspective LLC', { x: margin, y: height - 36, size: 9, font, color: muted });
            y = height - 62;
        }
        // Visual rhythm: extra space before section-like lines.
        const isSection = /^[A-Z][A-Za-z0-9 /&()'’\-]{2,}$/.test(ln) && ln.length < 46;
        if (isSection) y -= 6;
        page.drawText(ln, { x: margin, y, size: isSection ? 10.6 : 10.2, font: isSection ? fontBold : font, color: rgb(0.14, 0.16, 0.2) });
        y -= isSection ? 15 : 13;
    }

    return await pdfDoc.save();
}

function escapeXml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function renderOpsDocDocxFromText({ title, bodyText }) {
    const PizZip = require('pizzip');
    const zip = new PizZip();

    const lines = String(bodyText || '').replace(/\r\n/g, '\n').split('\n');
    const paragraphs = lines.map((l) => {
        const line = String(l || '');
        const isEmpty = !line.trim();
        const isBullet = line.trim().startsWith('• ');
        const isSection = /^[A-Z][A-Za-z0-9 /&()'’\-]{2,}$/.test(line.trim()) && line.trim().length < 46;
        if (isEmpty) return `<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>`;
        if (isSection) {
            return `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(line.trim())}</w:t></w:r></w:p>`;
        }
        if (isBullet) {
            const t = line.trim().replace(/^•\s+/, '');
            // Simple bullet-like indent (no numbering.xml dependency)
            return `<w:p><w:pPr><w:ind w:left="540"/></w:pPr><w:r><w:t xml:space="preserve">• ${escapeXml(t)}</w:t></w:r></w:p>`;
        }
        return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
    }).join('');

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Title"/></w:pPr>
      <w:r><w:t>${escapeXml(String(title || 'Document'))}</w:t></w:r>
    </w:p>
    ${paragraphs}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    zip.file('[Content_Types].xml', contentTypes);
    zip.folder('_rels').file('.rels', rels);
    zip.folder('word').file('document.xml', documentXml);

    return zip.generate({ type: 'nodebuffer' });
}

/** Word-wrap plain text to PDF line widths (Helvetica). */
function wrapPdfTextToLines(text, font, fontSize, maxWidth) {
    const raw = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!raw) return ['—'];
    const out = [];
    for (const para of raw.split('\n')) {
        const words = para.split(/\s+/).filter(Boolean);
        let line = '';
        if (!words.length) {
            out.push('');
            continue;
        }
        for (const w of words) {
            let chunk = w;
            while (chunk.length > 1 && font.widthOfTextAtSize(chunk, fontSize) > maxWidth) {
                chunk = chunk.slice(0, -1);
            }
            const test = line ? `${line} ${chunk}` : chunk;
            if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
                line = test;
            } else {
                if (line) out.push(line);
                line = chunk;
            }
        }
        if (line) out.push(line);
    }
    return out.length ? out : ['—'];
}

async function renderInvoicePdf(fields, packetId = '') {
    const f = normalizeDocxData(fields || {});
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage([612, 792]); // US Letter (reassigned when scope spans extra pages)
    const { width, height } = page.getSize();

    // OTP brand palette (dark + cyan accent)
    const ink = rgb(0.06, 0.07, 0.09);
    const paper = rgb(0.98, 0.98, 0.99);
    const muted = rgb(0.35, 0.38, 0.44);
    const accent = rgb(0.0, 0.92, 1.0); // cyan

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: paper });

    const margin = 54;
    const contentW = width - margin * 2;

    // OTP mark: prefer transparent PNG (Oracle / doc packet brand), then legacy JPG.
    let logoImage = null;
    try {
        const pngPath = path.join(__dirname, 'assets', 'otp-mark-doc.png');
        const pbuf = fs.readFileSync(pngPath);
        logoImage = await pdfDoc.embedPng(pbuf);
    } catch (e) {
        try {
            const jpgPath = path.join(__dirname, 'assets', 'otp-eye-emblem-eye.jpg');
            const jbuf = fs.readFileSync(jpgPath);
            logoImage = await pdfDoc.embedJpg(jbuf);
        } catch (e2) {
            logoImage = null;
        }
    }

    // Header bar
    const headerH = 96;
    page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: ink });
    // Accent line
    page.drawRectangle({ x: 0, y: height - headerH, width, height: 3, color: accent });

    // Logo / mark
    const leftX = margin;
    const headerY = height - 34;
    if (logoImage) {
        const targetH = 38;
        const scale = targetH / logoImage.height;
        const drawW = logoImage.width * scale;
        page.drawImage(logoImage, { x: leftX, y: height - headerH + 32, width: drawW, height: targetH, opacity: 0.96 });
        page.drawText('ONLY TRUE PERSPECTIVE', { x: leftX + drawW + 12, y: height - headerH + 48, size: 10, font: fontBold, color: rgb(0.9, 0.93, 0.98) });
        page.drawText('Tactical Visual Intelligence', { x: leftX + drawW + 12, y: height - headerH + 33, size: 9, font, color: rgb(0.75, 0.78, 0.84) });
        page.drawText('INVOICE (DEPOSIT)', { x: leftX + drawW + 12, y: height - headerH + 20, size: 8.5, font: fontBold, color: rgb(0.78, 0.82, 0.88) });
    } else {
        page.drawText('ONLY TRUE PERSPECTIVE', { x: leftX, y: height - headerH + 48, size: 12, font: fontBold, color: rgb(0.92, 0.94, 0.98) });
        page.drawText('Tactical Visual Intelligence', { x: leftX, y: height - headerH + 32, size: 9, font, color: rgb(0.75, 0.78, 0.84) });
        page.drawText('INVOICE (DEPOSIT)', { x: leftX, y: height - headerH + 20, size: 8.5, font: fontBold, color: rgb(0.78, 0.82, 0.88) });
    }

    // Invoice meta (right)
    const invNum = packetId ? `INV-${String(packetId).replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase()}` : 'INV-DRAFT';
    const invDate = String(f.generated_at || '').slice(0, 10) || '';
    const rightX = width - margin;
    const drawRight = (label, value, y) => {
        const labelW = font.widthOfTextAtSize(label, 8);
        const valueW = fontBold.widthOfTextAtSize(value, 10);
        page.drawText(label, { x: rightX - Math.max(labelW, valueW), y, size: 8, font, color: rgb(0.7, 0.73, 0.8) });
        page.drawText(value, { x: rightX - valueW, y: y - 14, size: 10, font: fontBold, color: rgb(0.92, 0.94, 0.98) });
    };
    drawRight('INVOICE #', invNum, headerY);
    drawRight('DATE', invDate || '—', headerY - 34);

    // Content start
    let y = height - headerH - 28;

    const drawSectionTitle = (title) => {
        page.drawText(title, { x: margin, y, size: 11, font: fontBold, color: rgb(0.08, 0.09, 0.12) });
        // subtle underline
        page.drawRectangle({ x: margin, y: y - 6, width: 52, height: 2, color: accent, opacity: 0.55 });
        y -= 22;
    };

    const drawKV = (k, v, x, y0, kSize = 8, vSize = 10) => {
        page.drawText(String(k || ''), { x, y: y0, size: kSize, font, color: muted });
        page.drawText(String(v || ''), { x, y: y0 - 14, size: vSize, font: fontBold, color: rgb(0.08, 0.09, 0.12) });
    };

    // Bill to / project
    drawSectionTitle('BILL TO');
    const colGap = 18;
    const colW = (contentW - colGap) / 2;
    drawKV('CLIENT', f.client_name || '—', margin, y);
    drawKV('EMAIL', f.client_email || '—', margin, y - 40);
    drawKV('PROJECT', f.recommended_package || '—', margin + colW + colGap, y);
    drawKV('QUOTE RANGE', f.quote_range || 'Scope-based', margin + colW + colGap, y - 40);
    y -= 86;

    const scopeRaw = String(f.lead_summary || '').trim();
    if (scopeRaw && scopeRaw !== 'N/A') {
        drawSectionTitle('SCOPE & CONTEXT');
        const scopeLines = wrapPdfTextToLines(scopeRaw, font, 9, contentW).slice(0, 26);
        for (const ln of scopeLines) {
            if (y < 120) {
                const p2 = pdfDoc.addPage([612, 792]);
                p2.drawRectangle({ x: 0, y: 0, width, height, color: paper });
                page = p2;
                y = height - 72;
            }
            const row = ln.length > 140 ? `${ln.slice(0, 137)}…` : ln;
            page.drawText(row, { x: margin, y, size: 9, font, color: rgb(0.14, 0.16, 0.2) });
            y -= 12;
        }
        if (scopeRaw.length > 2200) {
            page.drawText('… (summary continues in agreement / HTML packet)', { x: margin, y, size: 8, font, color: muted });
            y -= 14;
        }
        y -= 8;
    }

    // Line items table
    drawSectionTitle('LINE ITEMS');
    const tableX = margin;
    const tableW = contentW;
    const rowH = 24;
    const headerRowH = 26;
    const cols = [
        { key: 'desc', label: 'DESCRIPTION', w: Math.round(tableW * 0.54) },
        { key: 'qty', label: 'QTY', w: Math.round(tableW * 0.10) },
        { key: 'rate', label: 'RATE', w: Math.round(tableW * 0.18) },
        { key: 'amt', label: 'AMOUNT', w: Math.round(tableW * 0.18) }
    ];
    // header background
    page.drawRectangle({ x: tableX, y: y - headerRowH + 6, width: tableW, height: headerRowH, color: rgb(0.94, 0.95, 0.97) });
    // header text
    let cx = tableX + 10;
    for (const c of cols) {
        page.drawText(c.label, { x: cx, y: y, size: 8, font: fontBold, color: rgb(0.25, 0.28, 0.34) });
        cx += c.w;
    }
    y -= headerRowH;

    const totalCents = Number.isFinite(Number(f.invoice_total_cents)) ? Number(f.invoice_total_cents) : null;
    const depositCents = Number.isFinite(Number(f.deposit_due_cents)) ? Number(f.deposit_due_cents) : null;
    const remainingCents = (totalCents != null && depositCents != null) ? Math.max(0, totalCents - depositCents) : null;

    const lineDesc = `${f.recommended_package || 'Services'} — ${String(f.lead_summary || '').trim().slice(0, 90) || 'Scope-based engagement'}`;
    const rateLabel = totalCents != null ? dollarsFromCents(totalCents) : (f.quote_range || 'Scope-based');
    const amtLabel = rateLabel;

    // row background
    page.drawRectangle({ x: tableX, y: y - rowH + 6, width: tableW, height: rowH, color: rgb(0.99, 0.99, 0.995) });
    // row text
    const drawCell = (text, x, y0, size = 9, bold = false, color = rgb(0.10, 0.11, 0.14)) => {
        page.drawText(String(text || ''), { x, y: y0, size, font: bold ? fontBold : font, color });
    };
    cx = tableX + 10;
    drawCell(lineDesc, cx, y, 9, false);
    cx += cols[0].w;
    drawCell('1', cx, y, 9, true);
    cx += cols[1].w;
    drawCell(rateLabel || '—', cx, y, 9, false);
    cx += cols[2].w;
    drawCell(amtLabel || '—', cx, y, 9, true);
    y -= rowH + 10;

    // Totals box (right aligned)
    const totalsW = 220;
    const totalsX = margin + contentW - totalsW;
    const totalsYTop = y;
    page.drawRectangle({ x: totalsX, y: totalsYTop - 86, width: totalsW, height: 86, color: rgb(0.94, 0.97, 0.99), borderColor: rgb(0.86, 0.9, 0.95), borderWidth: 1 });
    const tRow = (label, value, yy, bold = false, color = rgb(0.12, 0.13, 0.16)) => {
        page.drawText(label, { x: totalsX + 12, y: yy, size: 9, font: bold ? fontBold : font, color: muted });
        const v = String(value || '—');
        const vw = (bold ? fontBold : font).widthOfTextAtSize(v, 10);
        page.drawText(v, { x: totalsX + totalsW - 12 - vw, y: yy, size: 10, font: bold ? fontBold : font, color });
    };
    tRow('Subtotal', totalCents != null ? dollarsFromCents(totalCents) : (f.quote_range || 'Scope-based'), totalsYTop - 20);
    tRow('Deposit due', depositCents != null ? dollarsFromCents(depositCents) : (f.deposit_due || 'Scope-based'), totalsYTop - 42, true, rgb(0.0, 0.55, 0.62));
    tRow('Remaining', remainingCents != null ? dollarsFromCents(remainingCents) : 'TBD', totalsYTop - 64);
    y -= 104;

    // Payment methods (client-ready)
    drawSectionTitle('PAYMENT METHODS');
    const payLines = [
        'Stripe (Card): invoice link sent after approval (or request manual link).',
        'ACH / Bank Transfer: available on request for business clients.',
        'Email: bookings@onlytrueperspective.tech'
    ];
    for (const line of payLines) {
        page.drawText(`• ${line}`, { x: margin, y, size: 9.5, font, color: rgb(0.18, 0.2, 0.25) });
        y -= 16;
    }

    // Required docs (small)
    y -= 10;
    drawSectionTitle('ONBOARDING CHECKLIST');
    const docsLine = f.required_documents_csv
        || (Array.isArray(f.required_documents) ? f.required_documents.join(', ') : 'Manual document selection required');
    page.drawText(docsLine, { x: margin, y, size: 9.2, font, color: rgb(0.18, 0.2, 0.25) });

    // Footer
    page.drawRectangle({ x: 0, y: 0, width, height: 28, color: rgb(0.97, 0.97, 0.98) });
    page.drawText('Only True Perspective LLC • Admin-approved export', { x: margin, y: 10, size: 8.5, font, color: muted });
    return Buffer.from(await pdfDoc.save());
}

const KNOWLEDGE_PREFIX = {
    file: 'kb_file::',
    chunk: 'kb_chunk::',
    leadRec: 'kb_lead_rec::',
    docPacket: 'kb_doc_packet::',
    docAudit: 'kb_doc_audit::',
    structured: 'kb_structured::',
    opsSend: 'kb_ops_send::'
};
const KB_META_KEY = 'kb_meta::index';
const VERSION_PREFIX = 'version_event::';
const MAX_VERSION_EVENTS = 20;
const KB_VECTOR_DIMS = 128;
const knowledgeUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 } // 12MB per file
});

const docTemplateUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 } // 12MB per template
});

const DOC_TEMPLATE_BUCKET = process.env.DOC_TEMPLATE_BUCKET || 'otp-doc-templates';
const DOC_TEMPLATE_PREFIX = 'master/';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Merge master DOCX for proposal/agreement; returns base64 or error message. */
async function mergeDocxForPacketDoc(doc, docType, fields) {
    try {
        const templateKey = String(doc?.docx_template || `${DOC_TEMPLATE_PREFIX}${docType}.docx`).trim();
        const templateBuf = await getTemplateBuffer(templateKey);
        const buf = renderDocxFromTemplate(templateBuf, fields);
        return { base64: base64FromBuffer(buf), error: null };
    } catch (e) {
        return { base64: null, error: String(e?.message || e) };
    }
}

/**
 * Attachment for email send: prefers stored packet doc.docx, else merges from template (legacy packets).
 */
async function buildDocxEmailAttachment(doc, docType, packetId, fields) {
    let b64 = doc?.docx ? String(doc.docx).trim() : '';
    if (!b64) {
        const merged = await mergeDocxForPacketDoc(doc, docType, fields);
        if (!merged.base64) {
            return { ok: false, missing: `${docType}:docx_merge_failed`, detail: merged.error || 'unknown' };
        }
        b64 = merged.base64;
    }
    const attachment = {
        filename: `${docType}-${packetId}.docx`,
        content: b64,
        content_type: DOCX_MIME
    };
    try {
        const v = verifyAttachmentOrThrow(attachment);
        return {
            ok: true,
            attachment,
            verification: { filename: attachment.filename, ok: true, bytes: v.bytes }
        };
    } catch (e) {
        return { ok: false, missing: `${docType}:docx_invalid`, detail: String(e?.message || e) };
    }
}

function safeJsonParse(raw, fallback = null) {
    if (raw == null) return fallback;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
}

async function getKnowledgeIndexMeta() {
    if (!supabaseAdmin) return { kb_updated_at: null };
    try {
        const { data, error } = await supabaseAdmin
            .from('site_content')
            .select('content, updated_at')
            .eq('key', KB_META_KEY)
            .maybeSingle();
        if (error) throw error;
        const payload = safeJsonParse(data?.content, {}) || {};
        return {
            kb_updated_at: data?.updated_at || payload?.kb_updated_at || null,
            reason: payload?.reason || null
        };
    } catch (_) {
        return { kb_updated_at: null };
    }
}

async function touchKnowledgeIndexMeta(reason = '') {
    if (!supabaseAdmin) return null;
    const nowIso = new Date().toISOString();
    const payload = {
        schema: 'otp-kb-meta-v1',
        kb_updated_at: nowIso,
        reason: String(reason || '').slice(0, 140)
    };
    try {
        await supabaseAdmin
            .from('site_content')
            .upsert([{ key: KB_META_KEY, content: JSON.stringify(payload), updated_at: nowIso }], { onConflict: 'key' });
    } catch (_) { /* best-effort */ }
    return payload;
}

function normalizeWhitespace(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
    return normalizeWhitespace(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length > 1);
}

function hashToken(token, dims = KB_VECTOR_DIMS) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        hash = ((hash << 5) - hash) + token.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % dims;
}

function textToVector(text, dims = KB_VECTOR_DIMS) {
    const vector = new Array(dims).fill(0);
    const tokens = tokenize(text);
    for (const token of tokens) {
        vector[hashToken(token, dims)] += 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map(value => Number((value / norm).toFixed(6)));
}

function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += (a[i] || 0) * (b[i] || 0);
    return Number(dot.toFixed(6));
}

function chunkText(text, maxChars = 1200, overlap = 200) {
    const normalized = normalizeWhitespace(text);
    if (!normalized) return [];
    const chunks = [];
    let cursor = 0;
    while (cursor < normalized.length) {
        const next = normalized.slice(cursor, cursor + maxChars);
        chunks.push(next);
        if (cursor + maxChars >= normalized.length) break;
        cursor += Math.max(1, maxChars - overlap);
    }
    return chunks;
}

function normalizeGeminiRuntimeError(message) {
    const msg = String(message || '');
    const lower = msg.toLowerCase();
    if (
        lower.includes('quota exceeded')
        || lower.includes('rate limit')
        || lower.includes('rate-limit')
        || lower.includes('high demand')
        || lower.includes('current quota')
    ) {
        return 'Gemini capacity limit reached. Switch provider or use a billed Gemini key, then retry in ~20 seconds.';
    }
    return msg || 'Gemini request failed.';
}

async function loadPdfParseLib() {
    // Some runtimes/bundlers treat pdf-parse as ESM; support both require() and import().
    try {
        // eslint-disable-next-line global-require
        return require('pdf-parse');
    } catch (_) {
        try {
            const mod = await import('pdf-parse');
            return mod && (mod.default || mod);
        } catch (e) {
            const msg = String(e?.message || e);
            const err = new Error(`PDF parser failed to load on server: ${msg}`);
            err.code = 'PDF_PARSE_LOAD_FAILED';
            throw err;
        }
    }
}

async function extractTextFromKnowledgeFile(file) {
    if (!file || !file.buffer) throw new Error('Missing file buffer.');
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.pdf') {
        const pdfParseLib = await loadPdfParseLib();

        const pdfParseCallable = typeof pdfParseLib === 'function'
            ? pdfParseLib
            : (pdfParseLib && typeof pdfParseLib.default === 'function' ? pdfParseLib.default : null);

        // pdf-parse v2 exposes PDFParse class; v1 exposed a callable function.
        if (typeof pdfParseCallable === 'function') {
            try {
                const parsed = await pdfParseCallable(file.buffer);
                const text = normalizeWhitespace(parsed && parsed.text);
                if (!text) throw new Error('No text extracted (PDF may be scanned/image-only).');
                return text;
            } catch (e) {
                const msg = String(e?.message || e);
                // Common failure modes: encrypted PDFs, image-only scans.
                if (/password|encrypted|encryption/i.test(msg)) {
                    throw new Error('PDF is encrypted/password-protected. Export a text-based PDF or upload a DOCX instead.');
                }
                throw new Error(`PDF parse failed: ${msg}`);
            }
        }

        const PDFParseCtor = pdfParseLib && typeof pdfParseLib.PDFParse === 'function'
            ? pdfParseLib.PDFParse
            : null;
        if (!PDFParseCtor) {
            throw new Error('PDF parser unavailable on server.');
        }

        const parser = new PDFParseCtor({ data: file.buffer });
        try {
            const result = await parser.getText();
            const text = normalizeWhitespace(result && result.text);
            if (!text) throw new Error('No text extracted (PDF may be scanned/image-only).');
            return text;
        } finally {
            if (typeof parser.destroy === 'function') {
                await parser.destroy().catch(() => {});
            }
        }
    }
    if (ext === '.docx') {
        try {
            const parsed = await mammoth.extractRawText({ buffer: file.buffer });
            const text = normalizeWhitespace(parsed && parsed.value);
            if (!text) throw new Error('No text extracted (DOCX may be empty or image-only).');
            return text;
        } catch (e) {
            const msg = String(e?.message || e);
            throw new Error(`DOCX parse failed: ${msg}`);
        }
    }
    throw new Error('Unsupported file type. Use PDF or DOCX.');
}

/** Merge stored OTP Oracle / analysis JSON into the same text pipeline used for KB + doc packets. */
function appendOracleStoredContext(parts, lead) {
    if (!Array.isArray(parts) || !lead) return;
    let raw = lead.ai_analysis;
    if (raw != null && raw !== '') {
        if (typeof raw === 'string') {
            const parsed = safeJsonParse(raw, null);
            raw = parsed != null ? parsed : { tactical_advice: raw.trim() };
        }
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const tactical = String(raw.tactical_advice || raw.tacticalAdvice || '').trim();
            if (tactical) parts.push(`Tactical scope (Oracle): ${tactical}`);
            const scope = String(raw.scope_summary || raw.scopeSummary || '').trim();
            if (scope) parts.push(`Scope summary: ${scope}`);
            const risks = String(raw.risks || '').trim();
            if (risks) parts.push(`Risks / constraints: ${risks}`);
        }
    }
    const adv = String(lead.advice || '').trim();
    if (adv && !parts.some((p) => typeof p === 'string' && p.includes(adv))) parts.push(`Advisor notes: ${adv}`);
    const nm = lead.neural_meta;
    if (typeof nm === 'string' && nm.trim()) {
        const t = nm.trim().slice(0, 600);
        if (t && !parts.some((p) => typeof p === 'string' && p.includes(t.slice(0, 80)))) parts.push(`Analysis meta: ${t}`);
    }
}

function extractTacticalAdviceFromLead(lead) {
    if (!lead) return '';
    let raw = lead.ai_analysis;
    if (raw != null && raw !== '') {
        if (typeof raw === 'string') {
            const parsed = safeJsonParse(raw, null);
            raw = parsed != null ? parsed : { tactical_advice: raw.trim() };
        }
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const tactical = String(raw.tactical_advice || raw.tacticalAdvice || '').trim();
            if (tactical) return tactical.slice(0, 2500);
        }
    }
    return String(lead.advice || '').trim().slice(0, 2500);
}

function buildLeadText(lead = {}, sourceTable = 'leads') {
    const parts = [];
    pushLeadLine(parts, 'Name', lead.name);
    pushLeadLine(parts, 'Email', lead.email);
    pushLeadLine(parts, 'Phone', lead.phone || lead.phone_number);
    pushLeadLine(parts, 'Company', lead.company || lead.company_name);
    if (sourceTable === 'leads') {
        const answers = safeJsonParse(lead.answers, lead.answers) || {};
        pushLeadLine(parts, 'Objective / mission', answers.q1);
        pushLeadLine(parts, 'Challenge / barrier', answers.q2);
        pushLeadLine(parts, 'Platform / domain', answers.q3);
        pushLeadLine(parts, 'Creative direction', answers.q4);
        pushLeadLine(parts, 'Primary goal', answers.q5_goal);
        pushLeadLine(parts, 'Additional notes', lead.message);
        const adv = String(lead.advice || '').trim();
        if (adv) pushLeadLine(parts, 'Advisor notes', adv);
    } else {
        const svc = normalizeWhitespace(lead.service || '');
        const ptype = normalizeWhitespace(lead.project_type || '');
        pushLeadLine(parts, 'Service focus', svc || ptype);
        if (ptype && ptype !== svc) pushLeadLine(parts, 'Project type', ptype);
        pushLeadLine(parts, 'Budget', lead.budget);
        pushLeadLine(parts, 'Timeline', lead.timeline);
        const contactBody = normalizeWhitespace(
            [lead.message, lead.project_details].filter(Boolean).join('\n\n')
        );
        if (contactBody) parts.push(`Mission / project details:\n${contactBody}`);
        const cadv = String(lead.advice || '').trim();
        if (cadv) pushLeadLine(parts, 'Advisor notes', cadv);
    }
    appendOracleStoredContext(parts, lead);
    return normalizeWhitespace(parts.join('\n'));
}

function evaluateLeadDataCompleteness(lead = {}, sourceTable = 'leads') {
    if (sourceTable === 'leads') {
        const answers = safeJsonParse(lead.answers, lead.answers) || {};
        const objective = normalizeWhitespace(answers.q1);
        const barrier = normalizeWhitespace(answers.q2);
        const goal = normalizeWhitespace(answers.q5_goal);
        const hasCoreScope = Boolean(objective || goal);
        const hasSupportingContext = Boolean(barrier || normalizeWhitespace(lead.advice));
        return {
            sufficient: hasCoreScope || hasSupportingContext,
            missing_fields: hasCoreScope ? [] : ['objective_or_goal']
        };
    }
    const service = normalizeWhitespace(lead.service);
    const message = normalizeWhitespace(
        [lead.message, lead.project_details].filter(Boolean).join('\n\n')
    );
    const budget = normalizeWhitespace(lead.budget);
    const sufficient = Boolean(service || message);
    const missing = [];
    if (!service && !message) missing.push('service_or_message');
    if (!budget) missing.push('budget');
    return { sufficient, missing_fields: missing };
}

function inferPackageAndRange(leadText) {
    const text = leadText.toLowerCase();
    const budgetValues = Array.from(text.matchAll(/\$?\s*(\d{2,5})\b/g))
        .map(match => Number(match[1]))
        .filter(value => Number.isFinite(value));
    const maxBudget = budgetValues.length ? Math.max(...budgetValues) : null;
    const mentionsSimpleEdit = /(simple edit|just an edit|quick edit|minor edit|small edit|one edit|edit only|cut|trim|cleanup|touch[-\s]?up|revise|revision|fix|sync|subtitle|subtitles|captions?|color|colour|grade|export|render|format|reformat|resize|crop|audio fix|sound fix|noise|denoise|stabiliz|stabilise|transition|b-?roll|overlay|remove|add music)/.test(text);
    const mentionsWebsite = /(website|site|landing page|ecommerce|web)/.test(text);
    const mentionsSimple = /(single|quick|one video|one deliverable|basic|starter)/.test(text);
    const mentionsLarge = /(campaign|full brand|custom architecture|retainer|multiple deliverables|system-wide|enterprise|advanced)/.test(text);
    const budgetLow = /(under\s*\$?\s*300|low budget|very small budget|tight budget)/.test(text) || (maxBudget !== null && maxBudget <= 300);
    const budgetHigh = /(1,?200\+|1200|2,?000|3,?000|3,?500|3500|premium|high budget)/.test(text) || (maxBudget !== null && maxBudget >= 1200);
    const mentionsGrowthDefault = /(growing small business|growing business|small business|artist|creator|ongoing|weekly|monthly|scale|scaling|brand growth)/.test(text);
    const mentionsCrossServiceWork = /(content|clips|video|filming|photography|branding|social|campaign|production)/.test(text);

    const pkgPriceDisplay = (key) => {
        try {
            const p = OTP_PRICING;
            const obj = p?.packages?.[key];
            const disp = String(obj?.price_display || '').trim();
            return disp || '';
        } catch (_) {
            return '';
        }
    };
    const svcPriceDisplayByLabel = (label) => {
        try {
            const svc = Object.values(OTP_PRICING?.services || {}).find((s) => String(s?.label || '').trim() === String(label || '').trim());
            const disp = String(svc?.price_display || '').trim();
            return disp || '';
        } catch (_) {
            return '';
        }
    };

    if (mentionsLarge || budgetHigh) {
        return {
            recommended_package: 'The System',
            quote_range: pkgPriceDisplay('theSystem') ? `Starting at ${pkgPriceDisplay('theSystem').replace(/^starting at\s*/i, '')}` : 'Starting at $3,500+',
            package_confidence: 0.86,
            package_reason: 'Scope and budget indicate a premium multi-deliverable engagement.'
        };
    }

    if (mentionsSimpleEdit && !mentionsWebsite) {
        const ve = svcPriceDisplayByLabel('Video Editing Services');
        return {
            recommended_package: 'The Signal',
            quote_range: ve ? `Video Editing Services (${ve})` : 'Video Editing Services ($150 to $800+)',
            package_confidence: 0.78,
            package_reason: 'Lightweight edit/revision scope detected. This routes through The Signal for streamlined execution while keeping editing rates flexible.'
        };
    }

    // For growth-stage clients, default to The Engine unless clearly cheaper/larger.
    if (mentionsGrowthDefault && !budgetLow && (mentionsCrossServiceWork || !mentionsWebsite)) {
        return {
            recommended_package: 'The Engine',
            quote_range: pkgPriceDisplay('theEngine') || '$1,200 to $2,000',
            package_confidence: 0.8,
            package_reason: 'Growth-stage needs and ongoing deliverables align best with The Engine.'
        };
    }

    if (mentionsWebsite) {
        if (/(custom|architecture|complex|portal|platform|membership|automation)/.test(text)) {
            return {
                recommended_package: 'The System',
                quote_range: pkgPriceDisplay('theSystem') || 'Starting at $3,500+',
                package_confidence: 0.83,
                package_reason: 'Website brief suggests custom architecture, automation, or portal depth, which fits The System.'
            };
        }
        if (mentionsSimple || budgetLow || /(one page|single page|landing page only)/.test(text)) {
            return {
                recommended_package: 'The Signal',
                quote_range: pkgPriceDisplay('theSignal') || 'Starting at $500',
                package_confidence: 0.78,
                package_reason: 'Lean website or landing-page scope detected; The Signal is the cleanest focused start.'
            };
        }
        return {
            recommended_package: 'The Engine',
            quote_range: pkgPriceDisplay('theEngine') || '$1,200 to $2,000',
            package_confidence: 0.73,
            package_reason: 'Website request maps to a business-grade build with connected brand structure and polish.'
        };
    }

    if (mentionsSimple || budgetLow) {
        return {
            recommended_package: 'The Signal',
            quote_range: pkgPriceDisplay('theSignal') ? `Starting at ${pkgPriceDisplay('theSignal').replace(/^starting at\s*/i, '')}` : 'Starting at $500',
            package_confidence: 0.71,
            package_reason: 'Lead appears lightweight with a single-deliverable or constrained budget profile.'
        };
    }
    return {
        recommended_package: 'The Engine',
        quote_range: pkgPriceDisplay('theEngine') || '$1,200 to $2,000',
        package_confidence: 0.65,
        package_reason: 'Defaulting to the core growth package based on available scope details.'
    };
}

function computeRequiredDocuments(leadText) {
    const text = leadText.toLowerCase();
    const docs = [
        'Proposal',
        'Client Service Agreement',
        'Invoice (50% deposit required before kickoff)'
    ];
    const reasons = [
        'Standard onboarding package requires proposal, signed agreement, and 50% deposit invoice before kickoff.'
    ];
    const flags = [];
    const isSimpleEdit = /(simple edit|just an edit|quick edit|minor edit|small edit|one edit|edit only|revision|revise|touch[-\s]?up)/.test(text);
    if (isSimpleEdit) {
        reasons.push('Scope appears to be a small, single-deliverable edit; keep the doc set minimal and only add NDA/media release when the content requires it.');
        flags.push('simple_edit');
    }
    const requestsConfidentialFlow = /(confidential|nda|private|unreleased|sensitive|stealth)/.test(text);
    const explicitlyNonConfidential = /(not confidential|non-confidential|no nda|without nda|public release|public campaign|not private|not sensitive)/.test(text);
    if (requestsConfidentialFlow && !explicitlyNonConfidential) {
        docs.push('Mutual NDA');
        reasons.push('Confidential or unreleased scope detected, so an NDA is required.');
        flags.push('confidential');
    }
    // Media release should be tied to NEW capture / identifiable talent, not pure post-production editing.
    const mentionsCaptureOrTalent = /(film|filming|shoot|on camera|photo|photography|talent|actor|performance|likeness|voice|face|portrait|interview)/.test(text);
    const editingOnly = /(edit|editing|revision|revise|trim|cleanup|caption|subtitles?|color|colour|grade|export|render|resize|crop|format|reformat)/.test(text)
        && !mentionsCaptureOrTalent;
    const explicitlyNoIdentifiableMedia = /(no video|no filming|no photography|no photo|no people|no faces|faceless|product only|not on camera|without talent|no actors)/.test(text);
    if (!editingOnly && mentionsCaptureOrTalent && !explicitlyNoIdentifiableMedia) {
        docs.push('Adult Media Release (if identifiable adults appear)');
        reasons.push('Identifiable people are part of deliverables, so media release coverage is required.');
        flags.push('media');
    }
    if (/(w-9|w9|vendor setup|tax form|1099|procurement)/.test(text)) {
        docs.push('Official W-9 workflow note');
        reasons.push('Vendor/tax paperwork request detected, so W-9 workflow note is included.');
        flags.push('tax');
    }
    return {
        required_documents: Array.from(new Set(docs)),
        documents_reason: reasons.join(' '),
        flags: Array.from(new Set(flags))
    };
}

function buildBrainResponse({ leadText, packageResult, requiredDocs, confidence, topMatches, completeness, structuredInsights = null, retrievalStats = null }) {
    const confidenceLabel = confidence > 0.55 ? 'high' : confidence > 0.35 ? 'medium' : 'low';
    const text = String(leadText || '').toLowerCase();
    const serviceType = classifyServiceType(text, packageResult);
    const explicitUnclear = /unclear|not sure|idk|help|unsure|figure it out|need guidance|not decided/.test(text);
    const missingScopeSignals = !(completeness && completeness.sufficient);
    const hasMissingFields = Boolean(completeness && Array.isArray(completeness.missing_fields) && completeness.missing_fields.length);
    const weakSignal = confidence < 0.2 && Number(packageResult?.package_confidence || 0) < 0.7;
    const reviewFlag = explicitUnclear || missingScopeSignals || weakSignal;
    const nextAction = reviewFlag
        ? 'manual_scope_review_required_before_quote'
        : 'send_intake_confirmation_and_prepare_agreement_invoice';
    const safeDocs = requiredDocs && Array.isArray(requiredDocs.required_documents) ? requiredDocs.required_documents : [];
    const statusFlags = [];
    if (reviewFlag) statusFlags.push('manual_review');
    if (missingScopeSignals || hasMissingFields) statusFlags.push('missing_data');
    if (requiredDocs && Array.isArray(requiredDocs.flags)) statusFlags.push(...requiredDocs.flags);
    if (!statusFlags.length) statusFlags.push('ready');
    const uniqueStatusFlags = Array.from(new Set(statusFlags));
    const packageConfidence = Number(
        Math.max(0.05, Math.min(0.99, ((Number(packageResult?.package_confidence) || 0.5) * 0.55) + (Number(confidence) * 0.45)))
            .toFixed(4)
    );
    const knowledgeBasis = (Array.isArray(topMatches) ? topMatches : [])
        .slice(0, 3)
        .map(match => ({
            file_name: match.file_name || 'unknown',
            chunk_index: Number.isFinite(Number(match.chunk_index)) ? Number(match.chunk_index) : 0,
            similarity: Number(Number(match.similarity || 0).toFixed(3))
        }));

    const totalGuidance = String(packageResult?.quote_range || '').trim();
    const isCustom = String(packageResult?.recommended_package || '').trim().toLowerCase() === 'custom';
    const pricingGuidance = isCustom ? '' : totalGuidance;

    const structuredNotes = [];
    if (structuredInsights && typeof structuredInsights === 'object') {
        const pricing = String(structuredInsights.pricing_guidance || '').trim();
        const rules = String(structuredInsights.doc_rules || '').trim();
        const playbook = String(structuredInsights.playbook || '').trim();
        if (pricing) structuredNotes.push(`Structured pricing guidance: ${pricing}`);
        if (rules) structuredNotes.push(`Structured doc rules: ${rules}`);
        if (playbook) structuredNotes.push(`Structured playbook: ${playbook}`);
    }

    const rt = retrievalStats && typeof retrievalStats === 'object' ? retrievalStats : {};
    const maxSRaw = Number(rt.max_similarity || 0);
    const maxS = Number.isFinite(maxSRaw) ? maxSRaw : 0;
    let retrievalNote = 'Retrieval signal within a normal range for this indexer.';
    if (rt.thin_context) retrievalNote = 'Very little lead text — match scores are exploratory; widen scope before quoting.';
    else if (!rt.chunk_pool && !rt.structured_count) retrievalNote = 'Knowledge index is empty; package and docs use lead text and defaults only.';
    else if (maxS < 0.15) retrievalNote = 'Weak match to indexed knowledge — keep manual review and verify against playbooks.';
    else if (maxS < 0.28) retrievalNote = 'Moderate retrieval signal — confirm pricing and doc stack against structured rules.';

    const oracle_retrieval = {
        thin_context: !!rt.thin_context,
        kb_chunks_indexed: Number(rt.chunk_pool || 0),
        structured_rules_count: Number(rt.structured_count || 0),
        max_match_similarity: Number(maxS.toFixed(3)),
        note: retrievalNote
    };

    return {
        lead_summary: leadText.slice(0, 700),
        service_type: serviceType,
        recommended_package: packageResult.recommended_package,
        quote_range: packageResult.quote_range,
        pricing_guidance: structuredInsights && String(structuredInsights.pricing_guidance || '').trim()
            ? String(structuredInsights.pricing_guidance || '').trim()
            : pricingGuidance,
        package_confidence: packageConfidence,
        package_reason: packageResult.package_reason || 'Recommendation generated from lead scope and pricing signals.',
        required_documents: safeDocs,
        documents_reason: [
            (requiredDocs?.documents_reason || 'Document set generated from onboarding and risk controls.'),
            (structuredInsights && String(structuredInsights.doc_rules || '').trim()) ? String(structuredInsights.doc_rules || '').trim() : ''
        ].filter(Boolean).join(' '),
        next_action: nextAction,
        status_flags: uniqueStatusFlags,
        knowledge_basis: knowledgeBasis,
        admin_notes: [
            `Confidence: ${confidenceLabel} (${confidence.toFixed(2)})`,
            `Service type: ${serviceType}`,
            'Default workflow enforces agreement + invoice + 50% deposit before work begins.',
            (missingScopeSignals || hasMissingFields)
                ? `Missing lead fields: ${(completeness?.missing_fields || []).join(', ') || 'scope details'}`
                : 'Lead scope appears sufficiently specified.',
            `Knowledge matches: ${(Array.isArray(topMatches) ? topMatches : []).map(m => `${m.file_name}#${m.chunk_index}`).join(', ') || 'none'}`,
            `Retrieval: ${retrievalNote}`,
            ...structuredNotes
        ],
        oracle_retrieval,
        draft_client_reply: `Thanks for reaching out to OnlyTruePerspective LLC. Based on your project details, the strongest next step is ${packageResult.recommended_package} (${packageResult.quote_range}). Before kickoff, we run a secure onboarding flow: proposal review, signed agreement, and invoice with a 50% deposit. Once approved, we can lock timeline and production start.`,
    };
}

function classifyServiceType(leadTextLower, packageResult) {
    const text = String(leadTextLower || '').toLowerCase();
    const pkg = String(packageResult?.recommended_package || '').toLowerCase();
    const isSimpleEdit = /(simple edit|just an edit|quick edit|minor edit|small edit|one edit|edit only|revision|revise|touch[-\s]?up|caption|subtitle|trim|cleanup|export|format|resize)/.test(text) || pkg.includes('simple edit');
    const isWebsite = /(website|site|landing page|ecommerce|web|portal|platform|membership)/.test(text) || pkg.includes('website') || pkg.includes('web presence');
    const isVideo = /(video|edit|editing|reel|shorts|tiktok|youtube|filming|shoot|cinematic|music video|color grade|vfx|sfx|audio)/.test(text) || /(signal|engine|system)/.test(pkg);
    const isBranding = /(brand|branding|identity|strategy|creative direction|art direction|design system)/.test(text);
    const isHybrid = isWebsite && (isVideo || isBranding);
    if (isHybrid) return 'hybrid_or_multideliverable';
    if (isSimpleEdit && !isWebsite) return 'simple_edit';
    if (isWebsite) return 'website_service';
    if (isBranding) return 'branding_or_strategy';
    if (isVideo) return 'video_service';
    return 'unknown';
}

// --- OTP Oracle core (shared helper) ---
async function fetchKnowledgeChunkPayloads({ limit = 3000 } = {}) {
    const { data: chunkRows, error: chunkError } = await supabaseAdmin
        .from('site_content')
        .select('key, content, updated_at')
        .ilike('key', `${KNOWLEDGE_PREFIX.chunk}%`)
        .limit(limit);
    if (chunkError) throw chunkError;
    return (chunkRows || [])
        .map((row) => {
            const chunk = safeJsonParse(row.content, null);
            if (!chunk || typeof chunk !== 'object') return null;
            if (chunk.archived) return null;
            const fileName = String(chunk.file_name || chunk.fileName || row.key || '').trim();
            const idx = Number.isFinite(Number(chunk.chunk_index)) ? Number(chunk.chunk_index) : 0;
            const vector = Array.isArray(chunk.vector) ? chunk.vector : null;
            const text = String(chunk.text || chunk.body || '').trim();
            if (!fileName) return null;
            if (!vector && !text) return null;
            return {
                file_name: fileName,
                chunk_index: idx,
                vector,
                text,
                updated_at: row.updated_at || null
            };
        })
        .filter(Boolean);
}

async function fetchStructuredKnowledgeEntries({ includeInactive = false, limit = 500 } = {}) {
    const { data: rows, error } = await supabaseAdmin
        .from('site_content')
        .select('key, content, updated_at')
        .ilike('key', `${KNOWLEDGE_PREFIX.structured}%`)
        .limit(limit);
    if (error) throw error;
    return (rows || [])
        .map((row) => {
            const payload = safeJsonParse(row.content, null);
            if (!payload || typeof payload !== 'object') return null;
            const active = payload.active !== false;
            const archived = payload.archived === true;
            if (archived) return null;
            if (!includeInactive && !active) return null;
            const entryId = String(payload.entry_id || row.key.replace(KNOWLEDGE_PREFIX.structured, '')).trim();
            const title = String(payload.title || '').trim() || entryId || 'Structured';
            const priority = Number.isFinite(Number(payload.priority)) ? Number(payload.priority) : 0;
            const serviceTags = Array.isArray(payload.service_tags) ? payload.service_tags.map((s) => String(s).toLowerCase().trim()).filter(Boolean) : [];
            const body = String(payload.body || payload.playbook || payload.pricing_guidance || '').trim();
            const docRules = String(payload.doc_rules || '').trim();
            const entryText = normalizeWhitespace([title, body, docRules].filter(Boolean).join('\n\n'));
            return {
                entry_id: entryId,
                title,
                priority,
                service_tags: serviceTags,
                active,
                updated_at: row.updated_at,
                body: String(payload.body || '').trim(),
                pricing_guidance: String(payload.pricing_guidance || '').trim(),
                doc_rules: docRules,
                playbook: String(payload.playbook || '').trim(),
                text: entryText
            };
        })
        .filter(Boolean)
        .filter((e) => e.text && e.text.length >= 20);
}

function scoreStructuredKnowledge(leadText, entries, serviceType) {
    const base = scoreKnowledgeChunks(leadText, (entries || []).map((e) => ({
        file_name: `structured:${e.entry_id}:${e.title}`,
        chunk_index: 0,
        vector: textToVector(e.text, KB_VECTOR_DIMS)
    })));

    // Re-rank with deterministic boosts: priority + service tag match.
    const st = String(serviceType || '').toLowerCase();
    return base.map((m) => {
        const key = String(m.file_name || '').replace(/^structured:/, '');
        const entryId = key.split(':')[0] || '';
        const entry = (entries || []).find((e) => e && String(e.entry_id) === String(entryId)) || null;
        const priority = entry ? Number(entry.priority || 0) : 0;
        const tags = entry ? entry.service_tags || [] : [];
        const tagMatch = st && tags.some((t) => t === st) ? 0.18 : 0;
        const priorityBoost = Math.max(0, Math.min(0.25, priority * 0.03));
        const boosted = Math.max(0, Math.min(0.999, Number(m.similarity || 0) + tagMatch + priorityBoost));
        return { ...m, similarity: boosted };
    }).sort((a, b) => b.similarity - a.similarity);
}

function scoreKnowledgeChunks(leadText, chunkPayloads) {
    const leadVector = textToVector(leadText, KB_VECTOR_DIMS);
    return (chunkPayloads || [])
        .map((chunk) => {
            const fileName = String(chunk?.file_name || '').trim();
            if (!fileName) return null;
            const idx = Number.isFinite(Number(chunk?.chunk_index)) ? Number(chunk.chunk_index) : 0;
            const v = Array.isArray(chunk?.vector) ? chunk.vector : null;
            const t = String(chunk?.text || '').trim();
            if (!v && !t) return null;
            const vec = v && v.length ? v : textToVector(t, KB_VECTOR_DIMS);
            return {
                file_name: fileName,
                chunk_index: idx,
                similarity: cosineSimilarity(leadVector, vec)
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.similarity - a.similarity);
}

/** Extra lexical hooks for retrieval only (does not change package inference). */
function augmentLeadTextForRetrieval(leadText, serviceType, packageResult) {
    const base = String(leadText || '').trim();
    const bits = [base];
    const st = String(serviceType || '');
    if (st === 'website_service') bits.push('website web site landing page ecommerce portal build');
    if (st === 'video_service') bits.push('video film edit editing reel post-production color grade');
    if (st === 'simple_edit') bits.push('edit revision trim caption subtitle export');
    if (st === 'branding_or_strategy') bits.push('brand branding identity strategy creative direction');
    if (st === 'hybrid_or_multideliverable') bits.push('hybrid multi-deliverable website video');
    const pkg = String(packageResult?.recommended_package || '').trim();
    if (pkg) bits.push(pkg);
    return normalizeWhitespace(bits.join(' ')).trim() || base;
}

/**
 * Prefer diverse sources in the match list (avoid six chunks from one PDF),
 * while confidence is still computed from the top raw scores.
 */
function diversifyTopMatches(sortedMatches, limit = 6, maxPerFile = 2) {
    const sorted = [...(sortedMatches || [])]
        .filter((m) => m && String(m.file_name || '').trim())
        .sort((a, b) => Number(b.similarity || 0) - Number(a.similarity || 0));
    const picked = [];
    const seenKey = new Set();
    const perFile = new Map();
    for (const m of sorted) {
        const fk = String(m.file_name);
        const n = perFile.get(fk) || 0;
        if (n >= maxPerFile) continue;
        const dedupe = `${fk}::${Number.isFinite(Number(m.chunk_index)) ? Number(m.chunk_index) : 0}`;
        if (seenKey.has(dedupe)) continue;
        seenKey.add(dedupe);
        perFile.set(fk, n + 1);
        picked.push(m);
        if (picked.length >= limit) return picked;
    }
    for (const m of sorted) {
        const dedupe = `${String(m.file_name)}::${Number.isFinite(Number(m.chunk_index)) ? Number(m.chunk_index) : 0}`;
        if (seenKey.has(dedupe)) continue;
        seenKey.add(dedupe);
        picked.push(m);
        if (picked.length >= limit) break;
    }
    return picked;
}

async function runOracleRecommendation({ lead, leadId, sourceTable }) {
    const tOracle = Date.now();
    const leadText = buildLeadText(lead, sourceTable);
    const completeness = evaluateLeadDataCompleteness(lead, sourceTable);
    const thinContext = !leadText || leadText.length < 12;

    const packageResult = inferPackageAndRange(leadText);
    const serviceType = classifyServiceType(String(leadText || '').toLowerCase(), packageResult);
    const retrievalText = augmentLeadTextForRetrieval(leadText, serviceType, packageResult);

    // Structured knowledge gets first pass, then we fill remaining slots with indexed file chunks.
    const structured = await fetchStructuredKnowledgeEntries({ includeInactive: false, limit: 500 }).catch(() => []);
    const structuredScored = structured.length ? scoreStructuredKnowledge(retrievalText, structured, serviceType).slice(0, 8) : [];

    // Pull top structured entry details so doc rules / pricing guidance actually affect output.
    const topStructured = structuredScored
        .map((m) => {
            const key = String(m.file_name || '');
            if (!key.startsWith('structured:')) return null;
            const entryId = key.replace(/^structured:/, '').split(':')[0] || '';
            const entry = structured.find((e) => e && String(e.entry_id) === String(entryId)) || null;
            return entry ? { entry, similarity: Number(m.similarity || 0) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (b.similarity - a.similarity));
    const structuredInsights = topStructured.length ? {
        entry_id: topStructured[0].entry.entry_id,
        title: topStructured[0].entry.title,
        pricing_guidance: topStructured[0].entry.pricing_guidance || '',
        doc_rules: topStructured[0].entry.doc_rules || '',
        playbook: topStructured[0].entry.playbook || ''
    } : null;

    const chunkPayloads = await fetchKnowledgeChunkPayloads({ limit: 3000 });
    const chunkScored = chunkPayloads.length ? scoreKnowledgeChunks(retrievalText, chunkPayloads) : [];

    const mergedSorted = [
        ...structuredScored,
        ...chunkScored.filter((m) => !String(m.file_name || '').startsWith('structured:'))
    ].sort((a, b) => Number(b.similarity || 0) - Number(a.similarity || 0));

    const topConfidence = mergedSorted.slice(0, 3);
    const confidence = topConfidence.length
        ? Math.max(0.05, Math.min(0.95, topConfidence.reduce((sum, item) => sum + item.similarity, 0) / topConfidence.length))
        : (thinContext ? 0.08 : 0.12);

    const maxSimAll = mergedSorted.length
        ? Math.max(...mergedSorted.slice(0, 32).map((m) => Number(m.similarity || 0)))
        : 0;

    const topMatches = diversifyTopMatches(mergedSorted, 6, 2);

    const requiredDocs = computeRequiredDocuments(leadText);
    const retrievalStats = {
        thin_context: thinContext,
        chunk_pool: chunkPayloads.length,
        structured_count: structured.length,
        max_similarity: maxSimAll
    };
    const recommendation = buildBrainResponse({
        leadText,
        packageResult,
        requiredDocs,
        confidence,
        topMatches,
        completeness,
        structuredInsights,
        retrievalStats
    });

    const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
    const shouldOracleLog = process.env.OTP_ORACLE_LOG === '1'
        || (nodeEnv && nodeEnv !== 'production' && nodeEnv !== 'test' && process.env.OTP_ORACLE_LOG !== '0');
    if (shouldOracleLog) {
        console.log(`[otp-oracle] lead=${leadId} table=${sourceTable} conf=${Number(confidence).toFixed(3)} maxSim=${maxSimAll.toFixed(3)} chunks=${chunkPayloads.length} structured=${structured.length} thin=${thinContext} ${Date.now() - tOracle}ms`);
    }

    return {
        leadId,
        leadText,
        serviceType,
        completeness,
        topMatches,
        confidence,
        packageResult,
        requiredDocs,
        recommendation
    };
}

// Initialize Supabase Admin Client (Service Role)
// Only needed if performing admin actions like Delete/Update on restricted tables
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY 
    ? createClient(process.env.SUPABASE_URL.trim(), process.env.SUPABASE_SERVICE_KEY.trim()) 
    : null;

if (supabaseAdmin) {
    console.log("✅ Supabase Admin Initialized");
} else {
    console.warn("⚠️ Supabase Admin NOT Initialized (Check SUPABASE_URL and SUPABASE_SERVICE_KEY)");
}

/** Persist OTP Oracle snapshot for a lead/contact (shared by /knowledge/recommend and ops job bootstrap). */
async function persistOracleLeadSnapshot({ leadId, sourceTable, oracle }) {
    if (!supabaseAdmin) throw new Error('Database Admin Interface Offline');
    const { topMatches, confidence, recommendation } = oracle;
    const kbMeta = await getKnowledgeIndexMeta();
    const recKey = `${KNOWLEDGE_PREFIX.leadRec}${leadId}`;
    const nowIso = new Date().toISOString();
    const recPayload = {
        schema: 'otp-kb-rec-v1',
        lead_id: leadId,
        source_table: sourceTable,
        recommendation,
        confidence: Number(Number(confidence || 0).toFixed(4)),
        top_matches: topMatches,
        updated_at: nowIso,
        kb_updated_at: kbMeta?.kb_updated_at || null
    };
    const { error: upsertError } = await supabaseAdmin
        .from('site_content')
        .upsert([{ key: recKey, content: JSON.stringify(recPayload), updated_at: nowIso }], { onConflict: 'key' });
    if (upsertError) throw upsertError;
    return { nowIso, kb_updated_at: kbMeta?.kb_updated_at || null };
}

if (process.env.GEMINI_API_KEY) {
    console.log("✅ Gemini API Key found");
} else {
    console.warn("⚠️ Gemini API Key NOT found");
}

// CRITICAL AUTH CHECKS
if (!process.env.ADMIN_PASSCODE) {
    console.error("❌ CRITICAL: ADMIN_PASSCODE not found in .env. Admin login will be disabled.");
}
if (!process.env.JWT_SECRET) {
    console.error("❌ CRITICAL: JWT_SECRET not found in .env. Authentication will fail.");
}

// --- SECURITY & OPTIMIZATION MIDDLEWARE ---
app.use(compression());

// 1. Helmet: Sets various HTTP headers for security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://assets.calendly.com", "https://js.stripe.com", "https://va.vercel-scripts.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://assets.calendly.com", "https://unpkg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://api.openai.com", "https://generativelanguage.googleapis.com", "https://calendly.com", "https://api.stripe.com", "https://onlytrueperspective.tech", "https://www.onlytrueperspective.tech", "https://app.onlytrueperspective.tech", "https://otp-site.vercel.app", "https://otp-os.vercel.app", "https://vitals.vercel-insights.com"],
            mediaSrc: ["'self'", "https:"],
            frameSrc: ["'self'", "https://calendly.com", "https://open.spotify.com", "https://embed.music.apple.com", "https://music.apple.com", "https://www.youtube.com", "https://w.soundcloud.com", "https://js.stripe.com", "https://hooks.stripe.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

// --- EMAIL WORKFLOW SYSTEM ---
const BUSINESS_EMAILS = {
    MAIN: 'eli3gant@onlytrueperspective.tech',
    CONTACT: 'contact@onlytrueperspective.tech',
    BOOKINGS: 'bookings@onlytrueperspective.tech',
    INFO: 'info@onlytrueperspective.tech'
};

async function sendSecureEmail({ to, subject, html, text, from = BUSINESS_EMAILS.CONTACT, replyTo = null, attachments = null }) {
    const key = process.env.RESEND_API_KEY; // Recommended service
    
    // For local dev/demo, we log the intent if no key exists
    if (!key) {
        console.log(`
[📩 EMAIL WORKFLOW SIMULATION]
FROM: ${from}
TO: ${to}
SUBJECT: ${subject}
BODY: ${text || 'HTML Content Sent'}
ATTACHMENTS: ${Array.isArray(attachments) ? attachments.map(a => a?.filename).filter(Boolean).join(', ') : 'none'}
-------------------------------
        `);
        return { success: true, simulated: true };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `OnlyTruePerspective <${from}>`,
                to: [to],
                reply_to: replyTo ? String(replyTo) : undefined,
                subject,
                html,
                text,
                attachments: Array.isArray(attachments) ? attachments : undefined
            })
        });
        const data = await response.json();
        const payloadStatus = Number(data?.statusCode);
        const ok = response.ok && !(Number.isFinite(payloadStatus) && payloadStatus >= 400);
        return { success: ok, data };
    } catch (e) {
        console.error("❌ Email Sending Failed:", e.message);
        return { success: false, error: e.message };
    }
}

// 3. API Cache Protocol
// API responses should not be browser/CDN cached.
// Static files and HTML are handled by explicit per-route/per-extension policies below.
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');
    }
    next();
});

// --- [CORE] STRIPE WEBHOOK GATEWAY ---
// CRITICAL: This MUST be defined before bodyParser.json() to capture raw buffer
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Webhook secret missing (STRIPE_WEBHOOK_SECRET)");
        if (!stripe) return res.status(500).send("Webhook temporarily unavailable");

        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.warn(`⚠️ Webhook Signature Error: ${err.message}`);
        return res.status(400).send('Webhook signature verification failed');
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_details ? session.customer_details.email : session.customer_email;
        console.log(`✅ Payment Success Signal: ${session.id} for ${email}`);
        if (supabaseAdmin && email) {
            try {
                await supabaseAdmin.from('contacts').update({ ai_status: 'paid' }).eq('email', email);
                await supabaseAdmin.from('leads').update({ status: 'paid' }).eq('email', email);
            } catch (dbErr) { console.warn("⚠️ CRM Update failed:", dbErr.message); }
        }
    }
    res.json({ received: true });
});

// --- STATIC ASSETS (CRITICAL FIX) ---
const staticPath = __dirname;
console.log("Static Path Configured:", staticPath);

/** HTML documents must not be cached long at CDN/browser (avoids stale shell after deploy). */
function noStoreHtml(res) {
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
}

// Root + clean URL aliases BEFORE express.static so `/` is not served as a long-cache static file.
app.get('/', (req, res) => {
    noStoreHtml(res);
    res.sendFile(path.join(staticPath, 'index.html'));
});
const staticAliases = {
    '/portal': 'portal.html',
    '/bookings': 'bookings.html',
    '/booking': 'bookings.html',
    '/book': 'bookings.html',
    '/book-otp': 'bookings.html',
    '/privacy': 'privacy.html',
    '/terms': 'terms.html',
    '/archive': 'archive.html',
    '/vault': 'archive.html',
    '/insights': 'insights.html',
    '/insight': 'insight.html',
    '/portal-gate': 'portal-gate.html',
    '/terminal': 'otp-terminal.html',
    '/otp-terminal': 'otp-terminal.html',
    '/payment-success': 'payment_success.html'
};
Object.entries(staticAliases).forEach(([route, file]) => {
    app.get(route, (req, res) => {
        noStoreHtml(res);
        res.sendFile(path.join(staticPath, file));
    });
});

const clientPortalAssetTypes = {
    '/client.css': 'text/css; charset=utf-8',
    '/client.js': 'application/javascript; charset=utf-8',
    '/client-portal-utils.js': 'application/javascript; charset=utf-8'
};

app.get(Object.keys(clientPortalAssetTypes), async (req, res) => {
    try {
        const upstreamUrl = new URL(req.path, OTP_CLIENT_PORTAL_UPSTREAM);
        const queryIndex = req.originalUrl.indexOf('?');
        if (queryIndex >= 0) upstreamUrl.search = req.originalUrl.slice(queryIndex);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), CLIENT_PORTAL_PROXY_TIMEOUT_MS);
        let upstream;
        try {
            upstream = await fetch(upstreamUrl.href, {
                method: 'GET',
                redirect: 'manual',
                signal: controller.signal,
                headers: {
                    Accept: req.get('accept') || '*/*',
                    'User-Agent': req.get('user-agent') || 'OTP-Site-Portal-Asset'
                }
            });
        } finally {
            clearTimeout(timer);
        }

        if (!upstream.ok) return res.status(upstream.status || 502).send('');

        const contentType = upstream.headers.get('content-type') || clientPortalAssetTypes[req.path] || 'text/plain; charset=utf-8';
        const body = Buffer.from(await upstream.arrayBuffer()).toString('utf8');
        res.status(upstream.status);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        return res.send(rewritePortalBody(body, contentType));
    } catch (error) {
        console.warn('Client portal asset proxy unavailable:', error?.message || error);
        return res.status(502).type('text/plain').send('');
    }
});

app.get('/client/:token', async (req, res) => {
    noStoreHtml(res);
    const token = normalizeClientPortalToken(req.params.token);
    if (!token) return res.redirect(302, '/portal?status=invalid');

    try {
        const upstreamUrl = new URL(`/client/${encodeURIComponent(token)}`, OTP_CLIENT_PORTAL_UPSTREAM);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), CLIENT_PORTAL_PROXY_TIMEOUT_MS);
        let upstream;
        try {
            upstream = await fetch(upstreamUrl.href, {
                method: 'GET',
                redirect: 'manual',
                signal: controller.signal,
                headers: {
                    Accept: req.get('accept') || 'text/html,application/xhtml+xml',
                    'User-Agent': req.get('user-agent') || 'OTP-Site-Portal',
                    'X-Forwarded-Host': req.get('host') || 'onlytrueperspective.tech',
                    'X-Forwarded-Proto': req.headers['x-forwarded-proto'] || req.protocol || 'https'
                }
            });
        } finally {
            clearTimeout(timer);
        }

        if (upstream.status >= 300 && upstream.status < 400) {
            const safeLocation = publicClientPortalPath(upstream.headers.get('location'));
            return res.redirect(upstream.status, safeLocation || '/portal?status=review');
        }
        if (!upstream.ok) {
            return res.redirect(302, '/portal?status=review');
        }

        const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';
        const body = Buffer.from(await upstream.arrayBuffer()).toString('utf8');
        res.status(upstream.status);
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        return res.send(rewritePortalBody(body, contentType));
    } catch (error) {
        console.warn('Client portal proxy unavailable:', error?.message || error);
        return res.redirect(302, '/portal?status=review');
    }
});

app.use(express.static(staticPath, {
    etag: true,
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const base = path.basename(filePath).toLowerCase();
        if (ext === '.html') {
            res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
        } else if (ext === '.js' || ext === '.css') {
            // Query ?v= busts deploys; short TTL limits stale JS/CSS without SW.
            res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        } else if (ext === '.xml' || ext === '.txt' || ext === '.webmanifest') {
            // Never immutable: sitemap/robots/manifest must reflect deploys quickly.
            const short = base === 'robots.txt' || base === 'sitemap.xml';
            const maxAge = short ? 120 : 600;
            res.setHeader('Cache-Control', `public, max-age=${maxAge}, must-revalidate`);
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
            // Avoid immutable without content hashes — og/favicon updates otherwise lag a week at CDNs.
            res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
        }
    }
}));

// Static Fallback for Vercel
app.get('/:file', (req, res, next) => {
    const file = req.params.file;
    const ext = path.extname(file).toLowerCase();
    const allowed = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.webmanifest', '.xml', '.txt'];
    
    if (allowed.includes(ext)) {
        const base = path.basename(file).toLowerCase();
        if (ext === '.html') noStoreHtml(res);
        else if (ext === '.js' || ext === '.css') {
            res.set('Cache-Control', 'public, max-age=300, must-revalidate');
        } else if (ext === '.xml' || ext === '.txt' || ext === '.webmanifest') {
            const short = base === 'robots.txt' || base === 'sitemap.xml';
            const maxAge = short ? 120 : 600;
            res.set('Cache-Control', `public, max-age=${maxAge}, must-revalidate`);
        } else {
            res.set('Cache-Control', 'public, max-age=86400, must-revalidate');
        }
        return res.sendFile(path.join(staticPath, file), (err) => {
            if (err) next();
        });
    }
    next();
});

app.get('/api/webhook', (req, res) => res.send("OTP WEBHOOK GATEWAY ONLINE. USE POST FOR STRIPE."));

app.get('/api/status', async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.json({
                status: 'ERR',
                database: 'DISCONNECTED',
                message: 'No Service Key',
                version: 'v10.5.1',
                env: process.env.NODE_ENV,
                stripe: !!stripe
            });
        }
        const { error } = await supabaseAdmin.from('posts').select('id', { head: true, count: 'exact' }).limit(1);
        if (error) throw error;
        res.json({
            status: 'UP',
            database: 'CONNECTED',
            timestamp: new Date().toISOString(),
            version: 'v10.5.1',
            env: process.env.NODE_ENV,
            stripe: !!stripe
        });
    } catch (e) {
        // Keep this endpoint stable for clients (avoid HTTP 500 on DB/network issues)
        res.status(200).json({
            status: 'ERR',
            database: 'DISCONNECTED',
            message: 'Database check failed',
            version: 'v10.5.1',
            env: process.env.NODE_ENV,
            stripe: !!stripe
        });
    }
});

// CORS: production domains + Vercel previews; localhost allowed via regex below (any port).
const allowedOrigins = [
    'https://onlytrueperspective.tech',
    'https://www.onlytrueperspective.tech',
    'https://app.onlytrueperspective.tech',
    'https://otp-site.vercel.app'
];
const configuredOrigins = String(process.env.OTP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const vercelDeploymentOrigin = process.env.VERCEL_URL
    ? `https://${String(process.env.VERCEL_URL).replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    : '';
const allowedOriginSet = new Set([
    ...allowedOrigins,
    ...configuredOrigins,
    vercelDeploymentOrigin
].filter(Boolean));
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
        if (isLocalOrigin) return callback(null, true);

        if (allowedOriginSet.has(origin)) {
            callback(null, true);
        } else {
            console.warn(`🛑 CORS Blocked: ${origin}`);
            callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Ensure pre-flight uses same origin restrictions

const OTP_BOOKINGS_UPSTREAM = String(
    process.env.OTP_BOOKINGS_UPSTREAM_URL
    || process.env.OTP_BOOKINGS_API_BASE
    || 'https://otp-os.vercel.app'
).replace(/\/+$/, '');
const OTP_PUBLIC_SITE_ORIGIN = String(
    process.env.OTP_PUBLIC_SITE_ORIGIN
    || 'https://onlytrueperspective.tech'
).replace(/\/+$/, '');
const OTP_CLIENT_PORTAL_UPSTREAM = String(
    process.env.OTP_CLIENT_PORTAL_UPSTREAM_URL
    || process.env.OTP_OS_PUBLIC_BASE
    || OTP_BOOKINGS_UPSTREAM
).replace(/\/+$/, '');
const OTP_BOOKINGS_ENABLE_UPSTREAM_FALLBACK = process.env.OTP_BOOKINGS_ENABLE_UPSTREAM_FALLBACK === '1'
    || (String(process.env.NODE_ENV || '').toLowerCase() === 'production' && process.env.OTP_BOOKINGS_ENABLE_UPSTREAM_FALLBACK !== '0');
const OTP_BOOKINGS_PROXY_HEADERS = new Set([
    'accept',
    'content-type',
    'content-length',
    'user-agent',
    'x-booking-token',
    'x-client-name',
    'x-file-name',
    'x-file-size',
    'x-file-type'
]);
const OTP_BOOKINGS_RESPONSE_HEADER_BLOCKLIST = new Set([
    'connection',
    'content-encoding',
    'content-length',
    'keep-alive',
    'transfer-encoding',
    'upgrade'
]);

const BOOKING_CLIENT_MESSAGE = 'Your booking request was received. OTP will review your project and prepare the next step.';
const BOOKING_PENDING_RECOMMENDATION_MESSAGE = 'Booking received. OTP Oracle recommendation is pending review.';
const BOOKING_GENERIC_ERROR_MESSAGE = 'We could not submit the booking yet. Please check the required fields and try again.';
const BOOKING_PUBLIC_PROXY_PATHS = new Set(['/api/bookings/config', '/api/bookings/submit']);
const CLIENT_PORTAL_TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._~-]{5,160}$/;
const CLIENT_PORTAL_PROXY_TIMEOUT_MS = positiveNumber(process.env.CLIENT_PORTAL_PROXY_TIMEOUT_MS, 9000);

const bookingSubmitLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: 'Too many booking attempts. Please wait a few minutes and try again.',
        errorCode: 'rate_limited',
        missingFields: []
    }
});

function cleanBookingText(value, max = 2000) {
    return sanitizeOpsText(value, max);
}

function publicBookingMessage(value, fallback = BOOKING_CLIENT_MESSAGE) {
    const message = cleanBookingText(value, 240);
    if (!message) return fallback;
    if (/(https?:\/\/|otp-os|supabase|service[_ -]?key|stack trace|bearer|jwt|postgres|database)/i.test(message)) {
        return fallback;
    }
    return message;
}

function normalizeClientPortalToken(value) {
    const token = cleanBookingText(value, 180);
    if (!token || !CLIENT_PORTAL_TOKEN_RE.test(token)) return '';
    if (/(admin|terminal|api|schema|supabase|service|jwt|bearer)/i.test(token)) return '';
    return token;
}

function publicClientPortalPath(value) {
    const raw = cleanBookingText(value, 500);
    if (!raw) return '';
    const directToken = normalizeClientPortalToken(raw);
    if (directToken) return `/client/${encodeURIComponent(directToken)}`;

    try {
        const parsed = new URL(raw, OTP_PUBLIC_SITE_ORIGIN);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const clientIndex = parts.indexOf('client');
        const token = clientIndex >= 0 ? normalizeClientPortalToken(parts[clientIndex + 1]) : '';
        if (!token) return '';
        const safe = new URL(`/client/${encodeURIComponent(token)}`, OTP_PUBLIC_SITE_ORIGIN);
        return `${safe.pathname}${safe.search}`;
    } catch (_) {
        return '';
    }
}

function rewritePortalBody(body, contentType = '') {
    const type = String(contentType || '').toLowerCase();
    if (!/(text\/html|text\/css|application\/javascript|text\/javascript)/.test(type)) return body;
    const publicClientBase = `${OTP_PUBLIC_SITE_ORIGIN}/client/`;
    return String(body || '')
        .replaceAll(`${OTP_CLIENT_PORTAL_UPSTREAM}/client/`, publicClientBase)
        .replaceAll('https://otp-os.vercel.app/client/', publicClientBase)
        .replaceAll('http://otp-os.vercel.app/client/', publicClientBase);
}

function pickPublicOption(value, values) {
    const raw = cleanBookingText(value, 160);
    if (!raw || !Array.isArray(values)) return '';
    return values.find((option) => String(option).toLowerCase() === raw.toLowerCase()) || '';
}

function normalizeBookingPhone(value) {
    const raw = cleanBookingText(value, 80);
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '').slice(0, 15);
    if (digits.length >= 7) return `${raw.trim().startsWith('+') ? '+' : ''}${digits}`;
    return raw.slice(0, 60);
}

function normalizeBookingDeadline(value) {
    const raw = cleanBookingText(value, 160);
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const dt = new Date(`${raw}T00:00:00Z`);
        if (!Number.isNaN(dt.getTime())) return raw;
    }
    return raw;
}

function bookingIdFromToken(token) {
    const clean = cleanBookingText(token, 120);
    if (clean) {
        const hash = crypto.createHash('sha256').update(clean).digest('hex').slice(0, 12).toUpperCase();
        return `BOOK-${hash}`;
    }
    return `BOOK-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}

function normalizeBookingPackageName(value) {
    const raw = String(value || '').trim();
    const lower = raw.toLowerCase();
    if (!raw) return '';
    if (lower === 'not sure yet' || lower === 'not_sure_yet' || lower === 'not-sure-yet') return 'Not Sure Yet';
    if (lower.includes('signal')) return 'The Signal';
    if (lower.includes('engine')) return 'The Engine';
    if (lower.includes('system')) return 'The System';
    if (lower.includes('custom')) return 'Custom Build';
    return raw.slice(0, 80);
}

function packageDisplayToOpsPackage(packageName) {
    const normalized = normalizeBookingPackageName(packageName);
    if (normalized === 'The Signal' || normalized === 'The Engine' || normalized === 'The System') return normalized;
    return 'Custom';
}

function packageDisplayForPublic(packageName) {
    const normalized = normalizeBookingPackageName(packageName);
    return normalized === 'Custom' ? 'Custom Build' : normalized;
}

function bookingPackageCards() {
    const cards = Array.isArray(OTP_PRICING?.bookingPackages) ? OTP_PRICING.bookingPackages : [];
    if (cards.length) return cards.map((card) => ({ ...card }));
    const p = OTP_PRICING?.packages || {};
    return [
        {
            id: 'the-signal',
            internal_key: 'The Signal',
            name: 'The Signal',
            price: p.theSignal?.price_display || 'Starting at $500',
            purpose: 'Entry-level creative service for a clean, focused deliverable.',
            description: 'The Signal is for focused creative work that gives your brand a sharper first impression.',
            best_for: ['Logo refresh', 'Simple flyer/design', 'Short video edit', 'Content cleanup', 'Landing page section', 'Brand starter work', 'Basic creative direction'],
            examples: ['Video/content', 'Logo refresh', 'Starter design', 'Landing page section'],
            cta: 'Start with The Signal'
        },
        {
            id: 'the-engine',
            internal_key: 'The Engine',
            name: 'The Engine',
            price: p.theEngine?.price_display || '$1,200 to $2,000',
            purpose: 'A stronger package for brands that need multiple connected assets.',
            description: 'The Engine builds the moving parts your brand needs to look real, move faster, and convert better.',
            best_for: ['Logo + brand kit', 'Video campaign', 'Website/landing page', 'Content rollout', 'Social media visuals', 'Business presentation', 'Client-facing brand upgrade'],
            examples: ['Brand kit', 'Video campaign', 'Landing page', 'Content rollout'],
            cta: 'Build with The Engine',
            recommended: true
        },
        {
            id: 'the-system',
            internal_key: 'The System',
            name: 'The System',
            price: p.theSystem?.price_display || 'Starting at $3,500+',
            purpose: 'Full creative and business system.',
            description: 'The System is for serious brands that need the full structure: visuals, website, automation, documents, and workflow.',
            best_for: ['Full website', 'Brand identity', 'Content system', 'AI/automation setup', 'Booking/payment workflow', 'Client portal', 'Document/invoice workflow', 'Business operating system'],
            examples: ['Full website', 'AI automation', 'Client portal', 'Document workflow'],
            cta: 'Build The System'
        },
        {
            id: 'custom-build',
            internal_key: 'Custom',
            name: 'Custom Build',
            price: p.custom?.price_display || 'Scope based',
            purpose: 'For anything unique, advanced, or mixed.',
            description: 'Custom Build is for projects that do not fit inside a box. OTP scopes the work and builds around the real goal.',
            best_for: ['Custom app', 'AI tool', 'Artist rollout', 'Product launch', 'Event coverage', 'Long-term creative support', 'Mixed video/logo/site/automation project'],
            examples: ['Custom app', 'AI tool', 'Artist rollout', 'Event coverage'],
            cta: 'Request Custom Build'
        }
    ];
}

function buildPublicBookingConfig() {
    const serviceTypes = Array.isArray(OTP_PRICING?.bookingServiceTypes)
        ? OTP_PRICING.bookingServiceTypes
        : [
            'Video / Content',
            'Logo / Brand Identity',
            'Website / Landing Page',
            'AI / Automation',
            'Business System',
            'Music / Artist Rollout',
            'Event Coverage',
            'Custom Request'
        ];
    return {
        ok: true,
        packages: bookingPackageCards(),
        serviceTypes,
        services: serviceTypes,
        packageOptions: ['The Signal', 'The Engine', 'The System', 'Custom Build', 'Not Sure Yet'],
        budgetRanges: ['Under $500', '$500 to $1,200', '$1,200 to $2,000', '$2,000 to $3,500', '$3,500+', 'Not sure yet'],
        urgencyLevels: ['Flexible', 'Soon', 'Rush', 'Launch deadline'],
        depositReadiness: ['Ready if scope is clear', 'Need quote first', 'Not ready yet'],
        upload: {
            supported: false,
            max_bytes: 25 * 1024 * 1024,
            allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'application/pdf']
        },
        nextStep: 'OTP reviews the request, confirms scope, and prepares the right proposal, invoice, or agreement.'
    };
}

function bookingLeadText(payload) {
    return normalizeWhitespace([
        `Service type: ${payload.service_type}`,
        `Package interest: ${payload.package_interest}`,
        `Business / brand: ${payload.business_name}`,
        `Budget: ${payload.budget_range}`,
        `Timeline: ${payload.ideal_deadline || payload.timeline}`,
        `Urgency: ${payload.urgency_level}`,
        `Deposit readiness: ${payload.deposit_readiness}`,
        `Reference link: ${payload.reference_link}`,
        `Social / website: ${payload.social_link}`,
        `Project: ${payload.project_description}`
    ].filter(Boolean).join('\n'));
}

function normalizeBookingRecommendation(oracle, fallbackPackage = '') {
    const rec = oracle?.recommendation || {};
    const missingInfo = Array.isArray(oracle?.completeness?.missing_fields)
        ? oracle.completeness.missing_fields
        : [];
    return {
        recommendedPackage: packageDisplayForPublic(rec.recommended_package || fallbackPackage || ''),
        quoteRange: cleanBookingText(rec.quote_range || '', 180),
        confidence: Number.isFinite(Number(oracle?.confidence)) ? Number(Number(oracle.confidence).toFixed(4)) : null,
        reason: cleanBookingText(rec.package_reason || rec.documents_reason || '', 900),
        suggestedDocuments: Array.isArray(rec.required_documents) ? rec.required_documents : [],
        nextAction: cleanBookingText(rec.next_action || 'review_scope_and_prepare_next_step', 180),
        followUpMessage: cleanBookingText(rec.draft_client_reply || '', 1600),
        internalSummary: cleanBookingText(rec.lead_summary || oracle?.leadText || '', 1400),
        missingInfo,
        statusFlags: Array.isArray(rec.status_flags) && rec.status_flags.length ? rec.status_flags : ['manual_review']
    };
}

function buildBookingInternalNotes({ bookingId, payload, recommendation, recommendationPending, clientId }) {
    const meta = {
        schema: 'otp-booking-meta-v1',
        booking_id: bookingId,
        source_type: 'otp_bookings',
        booking_status: 'new',
        requested_job_status: 'pending_review',
        saved_job_status: 'New Lead',
        payment_status: 'unpaid',
        client_id: clientId || null,
        client_name: payload.name,
        client_email: payload.email,
        client_phone: payload.phone || null,
        business_name: payload.business_name || null,
        social_link: payload.social_link || null,
        reference_link: payload.reference_link || null,
        service_type: payload.service_type,
        package_interest: payload.package_interest,
        recommended_package: recommendation?.recommendedPackage || null,
        project_description: payload.project_description,
        budget_range: payload.budget_range || null,
        ideal_deadline: payload.ideal_deadline || null,
        urgency_level: payload.urgency_level || null,
        deposit_readiness: payload.deposit_readiness || null,
        oracle_recommendation: recommendation || null,
        oracle_status: recommendationPending ? 'pending' : 'ready',
        created_at: new Date().toISOString()
    };
    return [
        'OTP_BOOKING_META:',
        JSON.stringify(meta, null, 2),
        '',
        'Internal note: booking entered from public OTP Bookings. Verify scope and price before sending invoices or agreements.'
    ].join('\n').slice(0, 12000);
}

function parseBookingPayload(input) {
    const body = input && typeof input === 'object' ? input : {};
    const publicConfig = buildPublicBookingConfig();
    const packageRaw = normalizeBookingPackageName(body.package_interest || body.packageInterest);
    const packageInterest = publicConfig.packageOptions.includes(packageRaw) ? packageRaw : '';
    const spamTrap = cleanBookingText(
        body.otp_company_website || body.company_website || body.website_url || body._gotcha,
        120
    );
    const payload = {
        booking_token: cleanBookingText(body.booking_token || body.bookingToken, 120),
        name: cleanBookingText(body.name, 140),
        email: cleanBookingText(body.email, 254),
        phone: normalizeBookingPhone(body.phone),
        business_name: cleanBookingText(body.business_name || body.businessName || body.brand_name, 180),
        social_link: cleanBookingText(body.social_link || body.socialWebsiteLink || body.website, 300),
        service_type: pickPublicOption(body.service_type || body.serviceType, publicConfig.serviceTypes),
        package_interest: packageInterest,
        project_description: cleanBookingText(body.project_description || body.projectDescription, 9000),
        reference_link: cleanBookingText(body.reference_link || body.referenceLink, 500),
        budget_range: pickPublicOption(body.budget_range || body.budgetRange, publicConfig.budgetRanges)
            || cleanBookingText(body.budget_range || body.budgetRange, 160),
        ideal_deadline: normalizeBookingDeadline(body.ideal_deadline || body.idealDeadline || body.timeline),
        urgency_level: pickPublicOption(body.urgency_level || body.urgencyLevel, publicConfig.urgencyLevels)
            || cleanBookingText(body.urgency_level || body.urgencyLevel, 80),
        deposit_readiness: pickPublicOption(body.deposit_readiness || body.depositReadiness, publicConfig.depositReadiness)
            || cleanBookingText(body.deposit_readiness || body.depositReadiness, 120),
        upload_ids: Array.isArray(body.upload_ids) ? body.upload_ids.map((v) => cleanBookingText(v, 140)).filter(Boolean).slice(0, 20) : []
    };
    const missingFields = [];
    if (!payload.name) missingFields.push('name');
    if (!payload.email) missingFields.push('email');
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) missingFields.push('valid_email');
    if (!payload.service_type) missingFields.push('service_type');
    if (!payload.package_interest) missingFields.push('package_interest');
    if (!payload.project_description) missingFields.push('project_description');
    return { payload, missingFields, spamTrap };
}

async function createBookingContact(payload, recommendation) {
    if (!supabaseAdmin) return null;
    try {
        const { data, error } = await supabaseAdmin
            .from('contacts')
            .insert([{
                name: payload.name,
                email: payload.email,
                service: payload.service_type,
                message: bookingLeadText(payload).slice(0, 12000),
                budget: payload.budget_range || null,
                timeline: payload.ideal_deadline || null,
                ai_status: recommendation ? 'booking_ready' : 'booking_pending'
            }])
            .select('id')
            .single();
        if (error) throw error;
        return data?.id || null;
    } catch (error) {
        console.warn('booking contact save skipped:', error?.message || error);
        return null;
    }
}

async function runBookingOracle(payload, bookingId) {
    if (!supabaseAdmin) return { recommendation: null, pending: true, error: 'oracle_unavailable' };
    try {
        const lead = {
            id: bookingId,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            company: payload.business_name,
            service: payload.service_type,
            message: bookingLeadText(payload),
            project_details: payload.project_description,
            budget: payload.budget_range,
            timeline: payload.ideal_deadline
        };
        const oracle = await runOracleRecommendation({ lead, leadId: bookingId, sourceTable: 'contacts' });
        return {
            recommendation: normalizeBookingRecommendation(oracle, payload.package_interest),
            pending: false,
            error: null
        };
    } catch (error) {
        console.warn('booking oracle pending:', error?.message || error);
        return { recommendation: null, pending: true, error: 'oracle_pending' };
    }
}

async function saveBookingOpsJob({ bookingId, payload, recommendation, recommendationPending, clientId }) {
    if (!supabaseAdmin) throw new Error('ops_unavailable');
    const selectedPackage = payload.package_interest === 'Not Sure Yet'
        ? (recommendation?.recommendedPackage || 'Custom Build')
        : payload.package_interest;
    const packageType = packageDisplayToOpsPackage(selectedPackage);
    const titleBits = [payload.service_type, payload.business_name || payload.name].filter(Boolean);
    const projectTitle = titleBits.join(' - ').slice(0, 180) || 'OTP Booking Request';
    const packageCard = bookingPackageCards().find((card) => card.internal_key === packageType || card.name === packageDisplayForPublic(selectedPackage));
    const deliverables = [
        packageCard?.purpose ? `Package purpose: ${packageCard.purpose}` : '',
        packageCard?.examples?.length ? `Service examples: ${packageCard.examples.join(', ')}` : '',
        payload.reference_link ? `Reference: ${payload.reference_link}` : ''
    ].filter(Boolean).join('\n');
    const followUp = recommendation?.followUpMessage || BOOKING_PENDING_RECOMMENDATION_MESSAGE;
    const normalized = normalizeOpsJobPayload({
        jobId: bookingId,
        sourceType: 'otp_bookings',
        clientName: payload.name,
        businessName: payload.business_name,
        phone: payload.phone,
        email: payload.email,
        serviceType: payload.service_type,
        packageType,
        projectTitle,
        projectDescription: payload.project_description,
        deliverables,
        addOns: [
            payload.package_interest ? `Package interest: ${payload.package_interest}` : '',
            payload.budget_range ? `Budget range: ${payload.budget_range}` : '',
            payload.urgency_level ? `Urgency: ${payload.urgency_level}` : ''
        ].filter(Boolean).join('\n'),
        startDate: '',
        dueDate: '',
        allowDateOverride: false,
        totalPrice: '0',
        depositAmount: '0',
        paymentMethod: '',
        paymentStatus: 'Unpaid',
        jobStatus: 'New Lead',
        clientNotes: followUp,
        internalNotes: buildBookingInternalNotes({ bookingId, payload, recommendation, recommendationPending, clientId }),
        portfolioPermission: false,
        agreementSigned: false,
        invoiceSent: false,
        createdBy: 'otp_bookings'
    }, { actor: 'otp_bookings' });
    if (!normalized.ok) {
        throw new Error(normalized.errors.join(' '));
    }
    const { data, error } = await supabaseAdmin
        .from('ops_jobs')
        .upsert([normalized.row], { onConflict: 'job_id' })
        .select('*')
        .maybeSingle();
    if (error) throw error;
    return mapOpsJobRowToApi(data);
}

async function forwardBookingSubmitToUpstream(body) {
    const upstreamUrl = new URL('/api/bookings/submit', OTP_BOOKINGS_UPSTREAM);
    const upstream = await fetch(upstreamUrl.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body || {}),
        redirect: 'manual'
    });
    const text = await upstream.text();
    let payload = {};
    try {
        payload = JSON.parse(text || '{}');
    } catch (_) {
        payload = {};
    }
    if (!upstream.ok || payload.ok === false || payload.error) {
        throw new Error(payload.message || `upstream_${upstream.status}`);
    }
    return payload;
}

app.get('/api/bookings/config', (req, res) => {
    res.json(buildPublicBookingConfig());
});

app.post('/api/bookings/submit', bookingSubmitLimiter, express.json({ limit: '256kb' }), async (req, res) => {
    const { payload, missingFields, spamTrap } = parseBookingPayload(req.body);
    if (spamTrap) {
        return res.status(400).json({
            ok: false,
            message: BOOKING_GENERIC_ERROR_MESSAGE,
            errorCode: 'spam_rejected',
            missingFields: []
        });
    }
    if (missingFields.length) {
        return res.status(400).json({
            ok: false,
            message: BOOKING_GENERIC_ERROR_MESSAGE,
            errorCode: 'validation_failed',
            missingFields
        });
    }

    try {
        if (!supabaseAdmin) {
            if (OTP_BOOKINGS_ENABLE_UPSTREAM_FALLBACK) {
                try {
                    const upstreamPayload = await forwardBookingSubmitToUpstream(req.body);
                    const upstreamRecommendation = upstreamPayload.recommendation && typeof upstreamPayload.recommendation === 'object' && !Array.isArray(upstreamPayload.recommendation)
                        ? upstreamPayload.recommendation
                        : null;
                    const upstreamPortalPath = publicClientPortalPath(
                        upstreamPayload.clientPortalPath
                        || upstreamPayload.portalPath
                        || upstreamPayload.clientPortalUrl
                        || upstreamPayload.portalUrl
                        || upstreamPayload.inviteUrl
                    );
                    return res.json({
                        ok: true,
                        bookingId: upstreamPayload.bookingId || upstreamPayload.booking_id || null,
                        jobId: upstreamPayload.jobId || upstreamPayload.job_id || null,
                        clientId: upstreamPayload.clientId || upstreamPayload.client_id || null,
                        message: upstreamRecommendation ? BOOKING_CLIENT_MESSAGE : 'Booking saved. Recommendation pending.',
                        recommendation: upstreamRecommendation,
                        ...(upstreamPortalPath ? { clientPortalPath: upstreamPortalPath } : {}),
                        nextStep: publicBookingMessage(
                            upstreamPayload.nextStep || upstreamPayload.next_action,
                            'OTP will review the request and prepare the next step.'
                        )
                    });
                } catch (upstreamError) {
                    console.warn('booking upstream fallback failed:', upstreamError?.message || upstreamError);
                }
            }
            return res.status(503).json({
                ok: false,
                message: BOOKING_GENERIC_ERROR_MESSAGE,
                errorCode: 'otp_os_unavailable',
                missingFields: []
            });
        }

        const bookingId = bookingIdFromToken(payload.booking_token);
        const oracleResult = await runBookingOracle(payload, bookingId);
        const clientId = await createBookingContact(payload, oracleResult.recommendation);
        const job = await saveBookingOpsJob({
            bookingId,
            payload,
            recommendation: oracleResult.recommendation,
            recommendationPending: oracleResult.pending,
            clientId
        });
        const recommendation = oracleResult.pending ? null : oracleResult.recommendation;
        return res.json({
            ok: true,
            bookingId,
            jobId: job?.jobId || bookingId,
            clientId,
            message: recommendation ? BOOKING_CLIENT_MESSAGE : 'Booking saved. Recommendation pending.',
            recommendation,
            nextStep: recommendation?.nextAction || 'OTP will review the request, confirm scope, and prepare the right proposal, invoice, or agreement.'
        });
    } catch (error) {
        console.error('booking submit failed:', error?.message || error);
        return res.status(500).json({
            ok: false,
            message: BOOKING_GENERIC_ERROR_MESSAGE,
            errorCode: 'booking_save_failed',
            missingFields: []
        });
    }
});

// Public OTP BOOKINGS stays on onlytrueperspective.tech while the canonical
// booking intake API continues to live inside OTP OS.
app.use('/api/bookings', async (req, res) => {
    try {
        const publicPath = new URL(req.originalUrl, 'https://onlytrueperspective.tech').pathname;
        if (!BOOKING_PUBLIC_PROXY_PATHS.has(publicPath)) {
            return res.status(404).json({
                ok: false,
                success: false,
                message: 'Booking endpoint not found.',
                errorCode: 'not_found'
            });
        }
        if (!OTP_BOOKINGS_ENABLE_UPSTREAM_FALLBACK) {
            return res.status(503).json({
                ok: false,
                success: false,
                message: 'OTP Bookings is temporarily unavailable.',
                errorCode: 'otp_os_unavailable'
            });
        }
        const upstreamUrl = new URL(req.originalUrl, OTP_BOOKINGS_UPSTREAM);
        const headers = {};

        for (const [key, value] of Object.entries(req.headers)) {
            const lower = key.toLowerCase();
            if (OTP_BOOKINGS_PROXY_HEADERS.has(lower) && value !== undefined) {
                headers[lower] = Array.isArray(value) ? value.join(', ') : String(value);
            }
        }

        headers['x-forwarded-host'] = req.get('host') || '';
        headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.ip || '';

        const upstream = await fetch(upstreamUrl.href, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
            redirect: 'manual'
        });

        res.status(upstream.status);
        upstream.headers.forEach((value, key) => {
            if (!OTP_BOOKINGS_RESPONSE_HEADER_BLOCKLIST.has(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        const body = Buffer.from(await upstream.arrayBuffer());
        return res.send(body);
    } catch (error) {
        console.error('OTP bookings proxy error:', error?.message || error);
        return res.status(502).json({
            success: false,
            ok: false,
            message: 'OTP Bookings is temporarily unavailable.',
            errorCode: 'otp_os_unavailable'
        });
    }
});

function sendSchemaMigrationSql(res) {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'DEPLOY_V1.3.sql');
    try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        res.type('text/plain; charset=utf-8').send(sql);
    } catch (err) {
        console.error('schema-migration:', err.message);
        res.status(404).type('text/plain').send('Schema migration file not available.');
    }
}

// Body parsing (after Stripe webhook raw handler)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// API rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased from 50 to 500 to support high-traffic drops
    message: { success: false, message: "Too many requests, please try again later." }
});
app.use('/api/', limiter);

if (process.env.OTP_VERBOSE_HTTP === '1') {
    app.use((req, res, next) => {
        console.log(`[http] ${new Date().toISOString()} ${req.method} ${req.url} ${req.ip}`);
        next();
    });
}

// --- DEFAULT CACHE (handlers that do not set Cache-Control themselves) ---
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !res.get('Cache-Control')) {
        res.set('Cache-Control', 'private, max-age=0, must-revalidate');
    }
    next();
});

// --- API ROUTES ---
// Defined BEFORE static files to ensure they take precedence

// 1. Auth Route
app.get('/api', (req, res) => {
    res.send("OTP API SERVICE RUNNING");
});
app.get('/ping', (req, res) => res.json({ status: 'PONG', timestamp: new Date() }));
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'UP',
        timestamp: new Date(),
        integrations: {
            supabase: 'UNKNOWN',
            stripe: !!stripe ? 'CONFIGURED' : 'DISCONNECTED',
            transactional_email: !!String(process.env.RESEND_API_KEY || '').trim() ? 'CONFIGURED' : 'UNAVAILABLE',
            ai: (!!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY || !!process.env.GROQ_API_KEY) ? 'CONFIGURED' : 'UNAVAILABLE',
            // Presence-only flags (never values) — helps verify Vercel env wiring after deploy.
            ai_providers: {
                gemini: !!String(process.env.GEMINI_API_KEY || '').trim(),
                openai: !!String(process.env.OPENAI_API_KEY || '').trim(),
                anthropic: !!String(process.env.ANTHROPIC_API_KEY || '').trim(),
                groq: !!String(process.env.GROQ_API_KEY || '').trim()
            }
        }
    };
    
    try {
        if (supabaseAdmin) {
            const { error } = await supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }).limit(1);
            health.integrations.supabase = error ? 'ERROR' : 'CONNECTED';
        }
    } catch(e) { health.integrations.supabase = 'ERROR'; }

    res.json(health);
});

app.get('/api/youtube/videos', async (req, res) => {
    const fallbackVideos = OTP_VIDEO_LIBRARY && typeof OTP_VIDEO_LIBRARY.getFallbackVideos === 'function'
        ? OTP_VIDEO_LIBRARY.getFallbackVideos()
        : [];
    const now = Date.now();

    try {
        if (youtubeVideoCache.videos.length && now - youtubeVideoCache.fetchedAt < YOUTUBE_SYNC_CACHE_TTL_MS) {
            return res.json({
                ok: true,
                videos: youtubeVideoCache.videos,
                fallbackUsed: false
            });
        }

        const liveVideos = await fetchLatestYoutubeVideos();
        const videos = normalizeYoutubeVideos(liveVideos);
        if (!videos.length) throw new Error('No YouTube videos returned');

        youtubeVideoCache = { fetchedAt: now, videos };
        return res.json({
            ok: true,
            videos,
            fallbackUsed: false
        });
    } catch (error) {
        const staleCacheOk = youtubeVideoCache.videos.length && now - youtubeVideoCache.fetchedAt < YOUTUBE_SYNC_STALE_TTL_MS;
        const videos = staleCacheOk ? youtubeVideoCache.videos : fallbackVideos;
        console.warn('youtube-video-sync:', error.message);
        return res.status(200).json({
            ok: false,
            videos,
            fallbackUsed: true,
            message: 'Showing saved videos while YouTube updates.'
        });
    }
});

if (process.env.NODE_ENV !== 'production' && process.env.OTP_ENABLE_PUBLIC_DIAG === '1') {
    app.all('/api/diag', (req, res) => {
        res.json({ success: true, method: req.method, path: req.path });
    });
}

// Strict Rate Limiting for Login Route (Brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    let { passcode } = body;
    const envPass = (process.env.ADMIN_PASSCODE || '').trim();
    const jwtSecret = (process.env.JWT_SECRET || '').trim();
    if (!envPass || !jwtSecret) {
        console.warn('🔓 Login rejected: ADMIN_PASSCODE or JWT_SECRET not configured');
        return res.status(503).json({ success: false, message: 'Admin login is not configured on this server.' });
    }
    // Robust comparison with trimming and case-insensitivity
    if (passcode && passcode.trim().toLowerCase() === envPass.toLowerCase()) {
        // Issue JWT
        const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '12h' });
        return res.json({ success: true, token });
    }
    
    // SECURITY: Do not log the target passcode in production!
    console.warn(`🔓 Failed login attempt for passcode: [REDACTED]`);
    return res.status(401).json({ success: false, message: 'Access Denied: Invalid Passcode' });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        if (!bearerToken || bearerToken === 'null' || bearerToken === 'undefined') {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        // STATIC BYPASS (Dev Only or Explicitly Enabled)
        const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
        const isDev = process.env.NODE_ENV === 'development';
        const legacyBypass = process.env.LEGACY_BYPASS_ENABLED === 'true';
        
        if (bearerToken === 'static-bypass-token' && (legacyBypass || (isLocal && isDev))) {
            req.auth = { role: 'admin', bypass: true };
            return next();
        }

        const jwtSecret = (process.env.JWT_SECRET || '').trim();
        if (!jwtSecret) {
            return res.status(503).json({ success: false, message: 'Server authentication is not configured.' });
        }

        jwt.verify(bearerToken, jwtSecret, (err, authData) => {
            if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
            req.auth = authData;
            next();
        });
    } else {
        res.status(401).json({ success: false, message: "Authentication required" });
    }
};

// DDL export for Terminal SQL modal — authenticated only (never public; avoids schema disclosure).
app.get('/api/schema-migration', verifyToken, (req, res) => sendSchemaMigrationSql(res));
app.get('/api/deploy-sql', verifyToken, (req, res) => sendSchemaMigrationSql(res));

// Ops Job → Document generation (internal/admin-only)
let OPS_DOCS = null;
try {
    OPS_DOCS = require('./ops-docs.js');
} catch (_) {
    OPS_DOCS = null;
}

// 2. Secure AI Generation (Proxied)
app.post('/api/ai/generate', verifyToken, async (req, res) => {
    // ... existing AI logic ...
    const { provider, prompt, title, systemPrompt, model, modelConfig = {}, keys = {} } = req.body;
    const resolveKey = (providedKey, envKey) => (String(providedKey || '').trim() || String(envKey || '').trim());
    
    try {
        let result;
        let usage;
        const safeParseGeneratedResponse = (text, fallbackTitle, fallbackPrompt) => {
            const raw = String(text || '').trim();
            const fallback = {
                title: String(fallbackTitle || 'Generated Insight'),
                tags: [],
                content: raw || String(fallbackPrompt || 'Generated content'),
                excerpt: String(fallbackPrompt || '').slice(0, 180) || 'Generated by OTP AI.',
                seo_title: String(fallbackTitle || 'Generated Insight'),
                seo_desc: String(fallbackPrompt || '').slice(0, 160) || 'Generated by OTP AI.',
                image_prompt: String(fallbackPrompt || fallbackTitle || 'Brand visual')
            };
            if (!raw) return fallback;
            const firstBrace = raw.indexOf('{');
            const lastBrace = raw.lastIndexOf('}');
            const candidate = (firstBrace !== -1 && lastBrace > firstBrace) ? raw.slice(firstBrace, lastBrace + 1) : raw;
            try {
                return JSON.parse(candidate);
            } catch (_) {
                const repaired = candidate
                    .replace(/(\r\n|\n|\r)/gm, " ")
                    .replace(/,\s*([\}\]])/g, "$1")
                    .replace(/\\(?!["\\\/bfnrtu]|u[0-9a-fA-F]{4})/g, "\\\\");
                try {
                    return JSON.parse(repaired);
                } catch (_) {
                    return { ...fallback, content: raw };
                }
            }
        };
        if (provider === 'openai') {
            const openaiKey = resolveKey(keys.openai, process.env.OPENAI_API_KEY);
            if (!openaiKey) throw new Error("OpenAI Key not configured on server or terminal.");
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${openaiKey}` 
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt }, 
                        { role: "user", content: `Generate post: "${title}". Focus: ${prompt}` }
                    ],
                    temperature: 0.8,
                    response_format: { type: "json_object" },
                    user: "admin-otp"
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = safeParseGeneratedResponse(data?.choices?.[0]?.message?.content, title, prompt);
            usage = data.usage;

        } else if (provider === 'gemini') {
            const geminiKey = resolveKey(keys.gemini, process.env.GEMINI_API_KEY);
            if (!geminiKey) throw new Error("Gemini Key not configured on server or terminal.");
            
            const candidates = model
                ? [model]
                : ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
            const versions = ['v1', 'v1beta'];
            
            // Map standard OpenAI-style model configs to Gemini format
            const geminiConfig = { responseMimeType: "application/json" };
            if (modelConfig.temperature !== undefined) geminiConfig.temperature = modelConfig.temperature;
            if (modelConfig.max_tokens !== undefined) geminiConfig.maxOutputTokens = modelConfig.max_tokens;
            if (modelConfig.top_p !== undefined) geminiConfig.topP = modelConfig.top_p;

            const payload = {
                systemInstruction: {
                    parts: [{ text: systemPrompt || 'You are a professional blog writer.' }]
                },
                contents: [{ 
                    role: 'user',
                    parts: [{ text: `Generate a post titled "${title || 'New Insight'}" based on this prompt: "${prompt}". Return ALL fields as JSON.` }] 
                }],
                generationConfig: geminiConfig
            };

            let lastErr = "";
            let success = false;

            for (const v of versions) {
                if(success) break;
                for (const m of candidates) {
                    if(success) break;
                    try {
                        const cleanModel = m.includes('models/') ? m : `models/${m}`;
                        console.log(`🤖 Gemini [${v}] Probing: ${cleanModel}...`);
                        const apiRes = await fetch(`https://generativelanguage.googleapis.com/${v}/${cleanModel}:generateContent?key=${geminiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        
                        const data = await apiRes.json();
                        
                        if (data.error) {
                            lastErr = `${m} [${v}]: ${data.error.message}`; 
                            console.warn(`⚠️ ${m} [${v}] Failed: ${data.error.message}`);
                            continue;
                        }

                        if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
                            lastErr = `${m} [${v}]: NEURAL BLOCK: Content flagged by safety filter.`;
                            console.warn(`⚠️ ${m} [${v}] SAFETY BLOCK.`);
                            continue;
                        }

                        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                            const text = data.candidates[0].content.parts[0].text;
                            result = safeParseGeneratedResponse(text, title, prompt);
                            usage = data.usageMetadata ? { total_tokens: data.usageMetadata.totalTokenCount } : null;
                            success = true;
                            console.log(`✅ Success via ${m} [${v}]`);
                        } else { 
                            lastErr = `${m} [${v}]: Unexpected response structure.`;
                            console.warn(`⚠️ ${m} [${v}] Unexpected format:`, JSON.stringify(data).substring(0, 100));
                        }
                    } catch (e) {
                        lastErr = `${m} [${v}]: ${e.message}`;
                    }
                }
            }
            if(!success) throw new Error(`Gemini Probe Failed: ${normalizeGeminiRuntimeError(lastErr)}`);

        } else if (provider === 'anthropic') {
            const anthropicKey = resolveKey(keys.anthropic, process.env.ANTHROPIC_API_KEY);
            if (!anthropicKey) throw new Error("Claude Key not configured on server or terminal.");
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: `${systemPrompt}\n\n${title}: ${prompt}` }],
                    ...modelConfig
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = safeParseGeneratedResponse(data?.content?.[0]?.text, title, prompt);
            usage = data.usage ? { total_tokens: data.usage.input_tokens + data.usage.output_tokens } : null;

        } else if (provider === 'groq') {
            const groqKey = resolveKey(keys.groq, process.env.GROQ_API_KEY);
            if (!groqKey) throw new Error("Groq Key not configured on server.");
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                body: JSON.stringify({
                    model: model || 'llama-3.1-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: "user", content: `Generate post: "${title}". ${prompt}` }
                    ],
                    response_format: { type: "json_object" },
                    ...modelConfig
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = safeParseGeneratedResponse(data?.choices?.[0]?.message?.content, title, prompt);
            usage = data.usage;

        } else {
            throw new Error("Invalid provider requested.");
        }

        res.json({ success: true, data: result, usage });

    } catch (error) {
        console.error("AI Error:", error.stack);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Internal Server Error during AI generation" 
        });
    }
});

// 3. Admin Deletion Endpoint (Bypasses RLS)
app.post('/api/admin/delete-post', verifyToken, async (req, res) => {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { id, slug, table } = body;
    const targetTable = table || 'posts'; // Default to posts
    
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: "Server misconfiguration: Missing Supabase Service Key" });
    }

    const allowedTables = ['posts', 'broadcasts', 'leads', 'contacts', 'site_content', 'categories', 'ai_archetypes'];
    if (!allowedTables.includes(targetTable)) {
        return res.status(403).json({ success: false, message: "Restricted table access denied" });
    }

    try {
        let query = supabaseAdmin.from(targetTable).delete();
        const idStr = id === undefined || id === null ? '' : String(id).trim();
        if (idStr) {
            query = query.eq('id', idStr);
        } else {
            const safeSlug = sanitizeSlugInput(slug);
            if (!safeSlug) {
                return res.status(400).json({ success: false, message: "Missing or invalid ID or Slug" });
            }
            query = query.eq('slug', safeSlug);
        }

        const { data, error } = await query.select();

        if (error) throw error;
        
        // Check if anything was actually deleted
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: "Post not found or already deleted" });
        }

        res.json({ success: true, message: "Deleted successfully", deleted: data });

    } catch (error) {
        console.error("Delete Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3.5 Admin Write Endpoint (Bypasses RLS for secure writing)
app.post('/api/admin/write-data', verifyToken, async (req, res) => {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { id, payload, table } = body;
    const targetTable = table || 'posts';
    
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: "Server misconfiguration: Missing Supabase Service Key" });
    }

    const allowedTables = ['posts', 'broadcasts', 'leads', 'contacts', 'site_content', 'categories', 'ai_archetypes'];
    if (!allowedTables.includes(targetTable)) {
        return res.status(403).json({ success: false, message: "Restricted table access denied" });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    const siteContentKeyPattern = /^[a-zA-Z][\w.-]{0,119}$/;
    const row = { ...payload };

    if (targetTable === 'site_content') {
        if (typeof row.content === 'string') {
            row.content = sanitizeHtml(row.content);
        }
        if (row.key !== undefined && row.key !== null) {
            const k = String(row.key).trim();
            if (!siteContentKeyPattern.test(k)) {
                return res.status(400).json({ success: false, message: 'Invalid site_content key' });
            }
            row.key = k;
        } else if (!id) {
            return res.status(400).json({ success: false, message: 'site_content insert requires key' });
        }
    }

    try {
        const nowIso = new Date().toISOString();
        const rowWithTimestamps = { ...row };
        if (!id) {
            if (!rowWithTimestamps.created_at) rowWithTimestamps.created_at = nowIso;
        }
        if (!rowWithTimestamps.updated_at) rowWithTimestamps.updated_at = nowIso;

        const runWrite = async (writeRow) => {
            const query = id
                ? supabaseAdmin.from(targetTable).update(writeRow).eq('id', id)
                : supabaseAdmin.from(targetTable).insert([writeRow]);
            return query.select();
        };

        const isTimestampColumnError = (err) => {
            const msg = String(err && err.message ? err.message : '').toLowerCase();
            const missingColumn = msg.includes('could not find') || msg.includes('does not exist');
            const timestampField = msg.includes('updated_at') || msg.includes('created_at');
            return missingColumn && timestampField;
        };

        let result = await runWrite(rowWithTimestamps);
        if (result.error && isTimestampColumnError(result.error)) {
            const fallbackRow = { ...row };
            result = await runWrite(fallbackRow);
        }
        if (result.error) throw result.error;

        res.json({ success: true, message: id ? "Updated" : "Created", data: result.data });

    } catch (error) {
        console.error("Save Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.7 Secure Multi-Table Data Fetching (Bypass RLS via Service Key)
app.post('/api/admin/fetch-data', verifyToken, async (req, res) => {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { table, select = '*', order = 'created_at', descending = true, filters = [], limit } = body;

    const allowedTables = ['posts', 'broadcasts', 'leads', 'contacts', 'site_content', 'categories', 'ai_archetypes'];
    if (!table || !allowedTables.includes(table)) {
        return res.status(403).json({ success: false, message: "Restricted table access denied" });
    }

    const ident = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    const safeOrder = typeof order === 'string' && ident.test(order) ? order : 'created_at';
    const rawSel = typeof select === 'string' ? select.trim() : '*';
    const safeSelect = !rawSel || rawSel.length > 2000 || /[;]|--|\/\*|\*\/|%\s*or|union\s+select/i.test(rawSel) ? '*' : rawSel;
    
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });

    try {
        const applyFilters = (q) => {
            (Array.isArray(filters) ? filters : []).forEach(f => {
                if (!f || typeof f.column !== 'string' || !ident.test(f.column)) return;
                if (f.op === 'eq') q = q.eq(f.column, f.value);
                if (f.op === 'neq') q = q.neq(f.column, f.value);
            });
            return q;
        };

        const applyLimit = (q) => {
            if (limit && Number.isInteger(limit) && limit > 0) return q.limit(limit);
            return q;
        };

        const buildQuery = ({ selectValue = safeSelect, orderValue = safeOrder, withOrder = true }) => {
            let q = supabaseAdmin.from(table).select(selectValue);
            q = applyFilters(q);
            if (withOrder) q = q.order(orderValue, { ascending: !descending });
            q = applyLimit(q);
            return q;
        };

        const isMissingColumnError = (err) => {
            const msg = String(err && err.message ? err.message : '').toLowerCase();
            return msg.includes('column') && msg.includes('does not exist');
        };

        let result = await buildQuery({ selectValue: safeSelect, orderValue: safeOrder, withOrder: true });
        if (result.error && isMissingColumnError(result.error)) {
            // Schema drift safety: retry with broad select and stable ordering.
            result = await buildQuery({ selectValue: '*', orderValue: 'created_at', withOrder: true });
            if (result.error && isMissingColumnError(result.error)) {
                // Last fallback for tables without created_at.
                result = await buildQuery({ selectValue: '*', withOrder: false });
            }
        }

        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });

    } catch (error) {
        console.error(`Fetch Error [${table}]:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.8 OTP Oracle — knowledge: list indexed files
app.get('/api/admin/knowledge/files', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const includeArchived = String(req.query?.includeArchived || '').trim() === '1';
        const { data, error } = await supabaseAdmin
            .from('site_content')
            .select('key, content, updated_at, created_at')
            .ilike('key', `${KNOWLEDGE_PREFIX.file}%`)
            .order('updated_at', { ascending: false })
            .limit(300);
        if (error) throw error;

        const files = (data || [])
            .map(row => ({ row, payload: safeJsonParse(row.content, {}) || {} }))
            .filter(({ payload }) => includeArchived ? true : !payload.archived)
            .map(({ row, payload }) => {
                return {
                    file_id: payload.file_id || row.key.replace(KNOWLEDGE_PREFIX.file, ''),
                    file_name: payload.file_name || 'Untitled',
                    source_type: payload.source_type || 'unknown',
                    chunk_count: payload.chunk_count || 0,
                    char_count: payload.char_count || 0,
                    archived: !!payload.archived,
                    archived_at: payload.archived_at || null,
                    archived_path: payload.archived_path || null,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                };
            });
        res.json({ success: true, files });
    } catch (error) {
        console.error("knowledge-files:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.8.1 OTP Oracle — knowledge: index meta (global freshness)
app.get('/api/admin/knowledge/meta', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const meta = await getKnowledgeIndexMeta();
        res.json({ success: true, meta });
    } catch (error) {
        console.error("knowledge-meta:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.9 OTP Oracle — knowledge: upload + index PDF/DOCX
app.post('/api/admin/knowledge/upload', verifyToken, knowledgeUpload.single('file'), async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Missing file upload." });

        const rawOverride = String(req.body?.fileNameOverride || req.body?.file_name_override || '').trim();
        const fileName = (rawOverride ? rawOverride : String(req.file.originalname || '').trim()).slice(0, 260);
        const extractedText = await extractTextFromKnowledgeFile(req.file);
        if (!extractedText || extractedText.length < 40) {
            return res.status(400).json({ success: false, message: "Unable to extract enough text from file." });
        }
        const sourceHash = crypto.createHash('sha256').update(extractedText).digest('hex');
        const { data: existingFileRows, error: existingFileRowsError } = await supabaseAdmin
            .from('site_content')
            .select('key, content, updated_at')
            .ilike('key', `${KNOWLEDGE_PREFIX.file}%`)
            .limit(500);
        if (existingFileRowsError) throw existingFileRowsError;
        const duplicate = (existingFileRows || [])
            .map(row => safeJsonParse(row.content, null))
            .filter(Boolean)
            .find(meta => meta.source_hash === sourceHash);
        if (duplicate) {
            return res.json({
                success: true,
                duplicate: true,
                message: 'File already indexed. Skipped duplicate ingest.',
                file: {
                    file_id: duplicate.file_id,
                    file_name: duplicate.file_name || fileName,
                    source_type: duplicate.source_type || path.extname(fileName).toLowerCase().replace('.', '') || 'unknown',
                    char_count: duplicate.char_count || extractedText.length,
                    chunk_count: duplicate.chunk_count || 0
                }
            });
        }

        // If a file with the same name already exists (active), archive it so re-upload acts like "new version".
        const normalizeName = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const nowIso = new Date().toISOString();
        const existingSameName = (existingFileRows || [])
            .map(row => safeJsonParse(row.content, null))
            .filter(Boolean)
            .filter(meta => !meta.archived)
            .find(meta => normalizeName(meta.file_name) === normalizeName(fileName));
        let replaced = false;
        if (existingSameName && existingSameName.file_id) {
            const oldId = String(existingSameName.file_id).trim();
            if (oldId) {
                // Reuse archive logic: mark meta+chunks archived so Oracle only sees latest version.
                try {
                    const archivedPath = 'archive/old_versions/';
                    const { data: fileRow } = await supabaseAdmin
                        .from('site_content')
                        .select('content')
                        .eq('key', `${KNOWLEDGE_PREFIX.file}${oldId}`)
                        .maybeSingle();
                    const meta = safeJsonParse(fileRow?.content, {}) || {};
                    meta.archived = true;
                    meta.archived_at = nowIso;
                    meta.archived_path = archivedPath;
                    await supabaseAdmin
                        .from('site_content')
                        .update({ content: JSON.stringify(meta), updated_at: nowIso })
                        .eq('key', `${KNOWLEDGE_PREFIX.file}${oldId}`);
                    const { data: chunkRows } = await supabaseAdmin
                        .from('site_content')
                        .select('key, content')
                        .ilike('key', `${KNOWLEDGE_PREFIX.chunk}${oldId}%`)
                        .limit(5000);
                    const updates = (chunkRows || []).map(row => {
                        const chunk = safeJsonParse(row.content, {}) || {};
                        chunk.archived = true;
                        chunk.archived_at = nowIso;
                        chunk.archived_path = archivedPath;
                        return { key: row.key, content: JSON.stringify(chunk), updated_at: nowIso };
                    });
                    const batchSize = 120;
                    for (let i = 0; i < updates.length; i += batchSize) {
                        const batch = updates.slice(i, i + batchSize);
                        await supabaseAdmin.from('site_content').upsert(batch, { onConflict: 'key' });
                    }
                    replaced = true;
                } catch (_) { /* non-fatal */ }
            }
        }

        const fileId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const sourceType = path.extname(fileName).toLowerCase().replace('.', '') || path.extname(String(req.file.originalname || '')).toLowerCase().replace('.', '') || 'unknown';
        const chunks = chunkText(extractedText, 1200, 220);

        const fileRow = {
            key: `${KNOWLEDGE_PREFIX.file}${fileId}`,
            content: JSON.stringify({
                schema: 'otp-kb-v1',
                file_id: fileId,
                file_name: fileName,
                source_type: sourceType,
                source_hash: sourceHash,
                char_count: extractedText.length,
                chunk_count: chunks.length,
                updated_at: nowIso
            }),
            updated_at: nowIso
        };

        const chunkRows = chunks.map((chunk, idx) => ({
            key: `${KNOWLEDGE_PREFIX.chunk}${fileId}::${idx}`,
            content: JSON.stringify({
                schema: 'otp-kb-v1',
                file_id: fileId,
                file_name: fileName,
                chunk_index: idx,
                text: chunk,
                vector: textToVector(chunk, KB_VECTOR_DIMS)
            }),
            updated_at: nowIso
        }));

        const { error: fileError } = await supabaseAdmin.from('site_content').insert([fileRow]);
        if (fileError) throw fileError;

        const batchSize = 80;
        for (let i = 0; i < chunkRows.length; i += batchSize) {
            const batch = chunkRows.slice(i, i + batchSize);
            const { error: batchError } = await supabaseAdmin.from('site_content').insert(batch);
            if (batchError) throw batchError;
        }

        await touchKnowledgeIndexMeta(replaced ? 'knowledge_upload_replace' : 'knowledge_upload');
        res.json({
            success: true,
            replaced,
            file: {
                file_id: fileId,
                file_name: fileName,
                source_type: sourceType,
                char_count: extractedText.length,
                chunk_count: chunks.length
            }
        });
    } catch (error) {
        const msg = String(error?.message || error);
        console.error("knowledge-upload:", msg);
        // Multer errors for file size limits come through as generic errors; normalize to 413.
        if (/file too large|limit.*file.*size/i.test(msg)) {
            return res.status(413).json({ success: false, message: "File too large (max 12MB). Compress the PDF/DOCX and retry." });
        }
        const status = /unsupported file type/i.test(msg) ? 415 : 500;
        res.status(status).json({ success: false, message: msg });
    }
});

// 2.10 OTP Oracle — knowledge: delete indexed file and chunks
app.post('/api/admin/knowledge/delete', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const fileId = String(req.body?.fileId || '').trim();
    if (!fileId) return res.status(400).json({ success: false, message: "Missing fileId." });
    try {
        const { error: fileError } = await supabaseAdmin.from('site_content').delete().eq('key', `${KNOWLEDGE_PREFIX.file}${fileId}`);
        if (fileError) throw fileError;
        const { error: chunkError } = await supabaseAdmin.from('site_content').delete().ilike('key', `${KNOWLEDGE_PREFIX.chunk}${fileId}%`);
        if (chunkError) throw chunkError;
        await touchKnowledgeIndexMeta('knowledge_delete');
        res.json({ success: true });
    } catch (error) {
        console.error("knowledge-delete:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.10.1 OTP Oracle — knowledge: archive indexed file (de-index, keep data)
app.post('/api/admin/knowledge/archive', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const fileId = String(req.body?.fileId || '').trim();
    const archivedPath = String(req.body?.archivedPath || 'archive/old_versions/').trim() || 'archive/old_versions/';
    if (!fileId) return res.status(400).json({ success: false, message: "Missing fileId." });
    try {
        const nowIso = new Date().toISOString();

        // Update file metadata row
        const { data: fileRow, error: fileFetchError } = await supabaseAdmin
            .from('site_content')
            .select('content')
            .eq('key', `${KNOWLEDGE_PREFIX.file}${fileId}`)
            .maybeSingle();
        if (fileFetchError) throw fileFetchError;
        if (!fileRow) return res.status(404).json({ success: false, message: "File not found." });

        const meta = safeJsonParse(fileRow.content, {}) || {};
        meta.archived = true;
        meta.archived_at = nowIso;
        meta.archived_path = archivedPath;

        const { error: metaUpdateError } = await supabaseAdmin
            .from('site_content')
            .update({ content: JSON.stringify(meta), updated_at: nowIso })
            .eq('key', `${KNOWLEDGE_PREFIX.file}${fileId}`);
        if (metaUpdateError) throw metaUpdateError;

        // Update chunk rows so recommend can ignore them
        const { data: chunkRows, error: chunkFetchError } = await supabaseAdmin
            .from('site_content')
            .select('key, content')
            .ilike('key', `${KNOWLEDGE_PREFIX.chunk}${fileId}%`)
            .limit(5000);
        if (chunkFetchError) throw chunkFetchError;

        const updates = (chunkRows || []).map(row => {
            const chunk = safeJsonParse(row.content, {}) || {};
            chunk.archived = true;
            chunk.archived_at = nowIso;
            chunk.archived_path = archivedPath;
            return { key: row.key, content: JSON.stringify(chunk), updated_at: nowIso };
        });

        const batchSize = 120;
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            const { error: batchError } = await supabaseAdmin.from('site_content').upsert(batch, { onConflict: 'key' });
            if (batchError) throw batchError;
        }

        await touchKnowledgeIndexMeta('knowledge_archive');
        res.json({ success: true });
    } catch (error) {
        console.error("knowledge-archive:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.10.2 OTP Oracle — structured knowledge (editable, priority-aware)
app.post('/api/admin/knowledge/structured/list', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const includeInactive = !!req.body?.includeInactive;
        const entries = await fetchStructuredKnowledgeEntries({ includeInactive, limit: 800 });
        res.json({ success: true, entries });
    } catch (error) {
        console.error("knowledge-structured-list:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/admin/knowledge/structured/upsert', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const nowIso = new Date().toISOString();
        const entryId = String(req.body?.entry_id || '').trim() || crypto.randomBytes(6).toString('hex');
        const title = String(req.body?.title || '').trim();
        if (!title) return res.status(400).json({ success: false, message: "Missing title." });

        const payload = {
            schema: 'otp-kb-structured-v1',
            entry_id: entryId,
            title,
            body: String(req.body?.body || '').trim(),
            pricing_guidance: String(req.body?.pricing_guidance || '').trim(),
            doc_rules: String(req.body?.doc_rules || '').trim(),
            playbook: String(req.body?.playbook || '').trim(),
            service_tags: Array.isArray(req.body?.service_tags)
                ? req.body.service_tags.map((s) => String(s).toLowerCase().trim()).filter(Boolean).slice(0, 24)
                : [],
            audience_tags: Array.isArray(req.body?.audience_tags)
                ? req.body.audience_tags.map((s) => String(s).toLowerCase().trim()).filter(Boolean).slice(0, 24)
                : [],
            priority: Number.isFinite(Number(req.body?.priority)) ? Number(req.body.priority) : 0,
            active: req.body?.active === false ? false : true,
            archived: false,
            updated_at: nowIso
        };

        const key = `${KNOWLEDGE_PREFIX.structured}${entryId}`;
        const { error: upsertError } = await supabaseAdmin
            .from('site_content')
            .upsert([{ key, content: JSON.stringify(payload), updated_at: nowIso }], { onConflict: 'key' });
        if (upsertError) throw upsertError;

        await touchKnowledgeIndexMeta('structured_upsert');
        res.json({ success: true, entry: { ...payload, key } });
    } catch (error) {
        console.error("knowledge-structured-upsert:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/admin/knowledge/structured/archive', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const entryId = String(req.body?.entry_id || '').trim();
        if (!entryId) return res.status(400).json({ success: false, message: "Missing entry_id." });
        const key = `${KNOWLEDGE_PREFIX.structured}${entryId}`;
        const { data: row, error: fetchError } = await supabaseAdmin
            .from('site_content')
            .select('content')
            .eq('key', key)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!row) return res.status(404).json({ success: false, message: "Structured entry not found." });
        const payload = safeJsonParse(row.content, null);
        if (!payload || typeof payload !== 'object') return res.status(500).json({ success: false, message: "Structured entry corrupted." });
        payload.archived = true;
        payload.archived_at = new Date().toISOString();
        payload.active = false;
        const nowIso = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin
            .from('site_content')
            .update({ content: JSON.stringify(payload), updated_at: nowIso })
            .eq('key', key);
        if (updateError) throw updateError;
        await touchKnowledgeIndexMeta('structured_archive');
        res.json({ success: true });
    } catch (error) {
        console.error("knowledge-structured-archive:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.10.3 OTP Ops — Quick Intake / Job Sheet (single source of truth: ops_jobs table)
const OPS_JOB = Object.freeze({
    packageTypes: ['The Signal', 'The Engine', 'The System', 'Custom'],
    paymentMethods: ['Apple Pay', 'Cash App', 'Zelle', 'Bank Transfer', 'Cash', 'Other'],
    paymentStatuses: ['Unpaid', 'Deposit Paid', 'Paid in Full'],
    jobStatuses: ['New Lead', 'Quote Sent', 'Deposit Paid', 'Active Client', 'Awaiting Final Payment', 'Completed', 'Archived']
});

function sanitizeOpsText(v, max = 20000) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return '';
    return s.slice(0, Math.max(0, Math.min(max, 20000)));
}

function parseCurrencyToCents(input) {
    if (input == null || input === '') return null;
    if (typeof input === 'number' && Number.isFinite(input)) {
        const cents = Math.round(input * 100);
        return cents >= 0 ? cents : null;
    }
    const raw = String(input).trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 0) return null;
    return Math.round(num * 100);
}

function validateOpsEmail(input) {
    const v = String(input || '').trim();
    if (!v) return { ok: true, value: '' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, value: v };
    return { ok: true, value: v };
}

function generateJobId() {
    return `JOB-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}

function normalizeOpsJobPayload(payload, { existingJobId = null, actor = null } = {}) {
    const p = payload && typeof payload === 'object' ? payload : {};
    const nowIso = new Date().toISOString();
    const jobId = String(existingJobId || p.jobId || '').trim() || generateJobId();

    const sourceTypeRaw = String(p.sourceType || p.source_type || '').trim();
    const sourceType = (sourceTypeRaw && ['manualIntake', 'quickDeal', 'oracleLead', 'otp_bookings'].includes(sourceTypeRaw)) ? sourceTypeRaw : 'manualIntake';

    const clientName = sanitizeOpsText(p.clientName, 140);
    const businessName = sanitizeOpsText(p.businessName, 180);
    const phone = sanitizeOpsText(p.phone, 60);
    const emailCheck = validateOpsEmail(p.email);
    const email = emailCheck.value;

    const serviceType = sanitizeOpsText(p.serviceType, 140);
    const packageType = sanitizeOpsText(p.packageType, 40);
    const projectTitle = sanitizeOpsText(p.projectTitle, 180);

    const projectDescription = sanitizeOpsText(p.projectDescription, 9000);
    const deliverables = sanitizeOpsText(p.deliverables, 6000);
    const addOns = sanitizeOpsText(p.addOns, 4000);

    const startDate = String(p.startDate || '').trim() || null;
    const dueDate = String(p.dueDate || '').trim() || null;
    const allowDateOverride = !!p.allowDateOverride;

    const totalCents = parseCurrencyToCents(p.totalPrice);
    const depositCents = parseCurrencyToCents(p.depositAmount) ?? 0;
    const remainingCents = (totalCents == null ? null : Math.max(0, totalCents - Math.min(depositCents, totalCents)));

    const paymentMethod = sanitizeOpsText(p.paymentMethod, 40);
    const paymentStatus = sanitizeOpsText(p.paymentStatus, 40);
    const jobStatus = sanitizeOpsText(p.jobStatus, 60);

    const clientNotes = sanitizeOpsText(p.clientNotes, 9000);
    const internalNotes = sanitizeOpsText(p.internalNotes, 12000);

    const portfolioPermission = !!p.portfolioPermission;
    const agreementSigned = !!p.agreementSigned;
    const invoiceSent = !!p.invoiceSent;

    const errors = [];
    if (!clientName) errors.push('Client Name is required.');
    if (!serviceType) errors.push('Service Type is required.');
    if (!packageType) errors.push('Package Type is required.');
    if (!projectTitle) errors.push('Project Title is required.');
    if (totalCents == null) errors.push('Total Price is required.');
    if (!paymentStatus) errors.push('Payment Status is required.');
    if (!jobStatus) errors.push('Job Status is required.');
    if (!emailCheck.ok) errors.push('Email is invalid.');
    if (packageType && !OPS_JOB.packageTypes.includes(packageType)) errors.push('Package Type is invalid.');
    if (paymentMethod && !OPS_JOB.paymentMethods.includes(paymentMethod)) errors.push('Payment Method is invalid.');
    if (paymentStatus && !OPS_JOB.paymentStatuses.includes(paymentStatus)) errors.push('Payment Status is invalid.');
    if (jobStatus && !OPS_JOB.jobStatuses.includes(jobStatus)) errors.push('Job Status is invalid.');
    if (totalCents != null && depositCents > totalCents) errors.push('Deposit Amount cannot exceed Total Price.');
    if (totalCents != null && totalCents < 0) errors.push('Total Price cannot be negative.');
    if (depositCents < 0) errors.push('Deposit Amount cannot be negative.');
    if (remainingCents != null && remainingCents < 0) errors.push('Remaining balance cannot be negative.');

    if (startDate && dueDate && !allowDateOverride) {
        const s = new Date(startDate);
        const d = new Date(dueDate);
        if (Number.isFinite(s.getTime()) && Number.isFinite(d.getTime()) && d.getTime() < s.getTime()) {
            errors.push('Due Date cannot be before Start Date unless override is enabled.');
        }
    }

    const row = {
        job_id: jobId,
        created_at: String(p.createdAt || '').trim() || nowIso,
        updated_at: nowIso,
        source_type: sourceType,

        client_name: clientName,
        business_name: businessName || null,
        phone: phone || null,
        email: email || null,

        service_type: serviceType,
        package_type: packageType,

        project_title: projectTitle,
        project_description: projectDescription || null,
        deliverables: deliverables || null,
        add_ons: addOns || null,
        start_date: startDate || null,
        due_date: dueDate || null,
        allow_date_override: allowDateOverride,

        total_price_cents: totalCents ?? 0,
        deposit_amount_cents: depositCents,
        remaining_balance_cents: remainingCents ?? 0,

        payment_method: paymentMethod || null,
        payment_status: paymentStatus,

        client_notes: clientNotes || null,
        internal_notes: internalNotes || null,

        portfolio_permission: portfolioPermission,
        agreement_signed: agreementSigned,
        invoice_sent: invoiceSent,

        job_status: jobStatus,
        created_by: String(p.createdBy || actor || '').trim() || null,
        updated_by: String(actor || p.updatedBy || '').trim() || null
    };

    return { ok: errors.length === 0, errors, row };
}

function mapOpsJobRowToApi(row) {
    const r = row || {};
    return {
        jobId: r.job_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        sourceType: r.source_type,
        clientName: r.client_name,
        businessName: r.business_name,
        phone: r.phone,
        email: r.email,
        serviceType: r.service_type,
        packageType: r.package_type,
        projectTitle: r.project_title,
        projectDescription: r.project_description,
        deliverables: r.deliverables,
        addOns: r.add_ons,
        startDate: r.start_date,
        dueDate: r.due_date,
        allowDateOverride: !!r.allow_date_override,
        totalPriceCents: r.total_price_cents,
        depositAmountCents: r.deposit_amount_cents,
        remainingBalanceCents: r.remaining_balance_cents,
        paymentMethod: r.payment_method,
        paymentStatus: r.payment_status,
        clientNotes: r.client_notes,
        internalNotes: r.internal_notes,
        portfolioPermission: !!r.portfolio_permission,
        agreementSigned: !!r.agreement_signed,
        invoiceSent: !!r.invoice_sent,
        jobStatus: r.job_status,
        createdBy: r.created_by,
        updatedBy: r.updated_by
    };
}

function mapOracleRecommendedPackageToOpsPackageType(recommendedPackage) {
    const pkg = String(recommendedPackage || '').trim();
    if (OPS_JOB.packageTypes.includes(pkg)) return pkg;
    const p = pkg.toLowerCase();
    if (!p) return 'Custom';
    if (/(custom build|custom request|scope based|scope-based)/.test(p)) return 'Custom';
    if (/(starter|the signal|^signal|simple edit|video editing|edit only|quick edit)/.test(p)) return 'The Signal';
    if (/(the system|^system\b|premium multi|enterprise|custom website architecture|architecture)/.test(p)) return 'The System';
    if (/(the engine|^engine\b|business website|growth|ongoing|retainer)/.test(p)) return 'The Engine';
    return 'Custom';
}

/** Parse dollar amounts from Oracle quote_range; returns midpoint for ranges. */
function suggestPriceCentsFromOracleQuoteRange(quoteRange) {
    const s = String(quoteRange || '');
    const nums = [];
    const re = /\$?\s*([\d]{1,3}(?:,\d{3})+|\d{2,5})\b/g;
    let m;
    while ((m = re.exec(s)) !== null) {
        const n = Number(String(m[1]).replace(/,/g, ''));
        if (Number.isFinite(n) && n >= 25 && n <= 999999) nums.push(n);
    }
    if (!nums.length) return null;
    const low = Math.min(...nums);
    const high = Math.max(...nums);
    const midDollars = nums.length >= 2 && high > low ? Math.round((low + high) / 2) : high;
    const totalCents = Math.min(99999900, midDollars * 100);
    const depositCents = Math.min(totalCents, Math.round(totalCents * 0.5));
    return { totalCents, depositCents };
}

function deriveClientNameFromLead(lead, sourceTable) {
    const raw = String(lead?.name || '').trim();
    if (raw) return raw.slice(0, 140);
    const email = String(lead?.email || '').trim();
    if (email.includes('@')) {
        const local = email.split('@')[0].trim();
        if (local) return local.slice(0, 140);
    }
    return sourceTable === 'leads' ? 'Audit lead' : 'Contact';
}

function buildOpsJobPayloadFromLeadAndOracle(lead, sourceTable, oracle, { existingJobId = null } = {}) {
    const rec = oracle.recommendation || {};
    const packageType = mapOracleRecommendedPackageToOpsPackageType(rec.recommended_package);
    const pricing = suggestPriceCentsFromOracleQuoteRange(rec.quote_range);
    let totalCents = pricing?.totalCents;
    let depositCents = pricing?.depositCents ?? 0;
    let priceNote = '';
    if (totalCents == null || !Number.isFinite(totalCents)) {
        totalCents = 120000;
        depositCents = 60000;
        priceNote = 'Could not parse Oracle quote_range; defaulted to $1200 total / $600 deposit — verify before invoicing.\n';
    }
    const clientName = deriveClientNameFromLead(lead, sourceTable);
    const email = String(lead?.email || '').trim();
    const phone = String(lead?.phone || lead?.phone_number || '').trim().slice(0, 60);
    const business = String(lead?.company || lead?.company_name || '').trim().slice(0, 180);
    const serviceType = String(rec.service_type || rec.recommended_package || 'General').slice(0, 140);
    let goal = '';
    if (sourceTable === 'leads') {
        const answers = safeJsonParse(lead?.answers, lead?.answers) || {};
        goal = String(answers.q5_goal || answers.q1 || '').trim();
    }
    const projectTitle = String(goal || rec.recommended_package || 'New engagement').slice(0, 180);
    const projDescParts = [
        rec.lead_summary ? `Lead summary:\n${String(rec.lead_summary).slice(0, 3500)}` : '',
        rec.quote_range ? `Oracle quote: ${rec.quote_range}` : '',
        rec.package_reason ? `Package fit: ${String(rec.package_reason).slice(0, 1200)}` : ''
    ].filter(Boolean);
    const projectDescription = projDescParts.join('\n\n').slice(0, 9000);
    const internalNotes = [
        priceNote,
        `otp_oracle_sync: ${new Date().toISOString()} source=${sourceTable} leadId=${String(oracle.leadId || lead.id || '')}`,
        `oracle_confidence: ${oracle.confidence}`,
        `next_action: ${rec.next_action || ''}`,
        `required_docs: ${Array.isArray(rec.required_documents) ? rec.required_documents.join(', ') : ''}`
    ].join('\n').slice(0, 12000);

    return {
        jobId: existingJobId || undefined,
        sourceType: 'oracleLead',
        clientName,
        businessName: business || null,
        phone: phone || null,
        email,
        serviceType,
        packageType,
        projectTitle,
        projectDescription,
        deliverables: '',
        addOns: '',
        startDate: '',
        dueDate: '',
        allowDateOverride: false,
        totalPrice: String(Math.round(totalCents / 100)),
        depositAmount: String(Math.round(depositCents / 100)),
        paymentMethod: '',
        paymentStatus: 'Unpaid',
        jobStatus: 'New Lead',
        clientNotes: String(rec.lead_summary || '').slice(0, 9000),
        internalNotes,
        portfolioPermission: false,
        agreementSigned: false,
        invoiceSent: false
    };
}

app.post('/api/admin/ops/jobs/list', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const q = String(req.body?.q || '').trim();
        const packageType = String(req.body?.packageType || '').trim();
        const paymentStatus = String(req.body?.paymentStatus || '').trim();
        const jobStatus = String(req.body?.jobStatus || '').trim();
        const dueBefore = String(req.body?.dueBefore || '').trim();
        const dueAfter = String(req.body?.dueAfter || '').trim();
        const limit = Math.max(1, Math.min(100, Number(req.body?.limit || 30)));
        const offset = Math.max(0, Number(req.body?.offset || 0));

        let query = supabaseAdmin
            .from('ops_jobs')
            .select('*', { count: 'exact' })
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (q) {
            const like = `%${q.replace(/%/g, '')}%`;
            query = query.or(`job_id.ilike.${like},client_name.ilike.${like},project_title.ilike.${like}`);
        }
        if (packageType) query = query.eq('package_type', packageType);
        if (paymentStatus) query = query.eq('payment_status', paymentStatus);
        if (jobStatus) query = query.eq('job_status', jobStatus);
        if (dueAfter) query = query.gte('due_date', dueAfter);
        if (dueBefore) query = query.lte('due_date', dueBefore);

        const { data, error, count } = await query;
        if (error) throw error;

        const counts = {};
        const statusBuckets = ['New Lead', 'Quote Sent', 'Active Client', 'Awaiting Final Payment', 'Completed'];
        const countQueries = statusBuckets.map(async (st) => {
            const { count: c, error: ce } = await supabaseAdmin
                .from('ops_jobs')
                .select('job_id', { count: 'exact', head: true })
                .eq('job_status', st);
            if (ce) throw ce;
            counts[st] = c || 0;
        });
        await Promise.all(countQueries);

        res.json({
            success: true,
            total: count || 0,
            rows: (data || []).map(mapOpsJobRowToApi),
            counts
        });
    } catch (error) {
        console.error("ops-jobs-list:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/admin/ops/jobs/get', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const jobId = String(req.body?.jobId || '').trim();
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });
        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });
        res.json({ success: true, row: mapOpsJobRowToApi(data) });
    } catch (error) {
        console.error("ops-jobs-get:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/admin/ops/jobs/upsert', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const input = req.body?.job || {};
        const requestedJobId = String(req.body?.jobId || input.jobId || '').trim() || null;
        let existing = null;
        if (requestedJobId) {
            const { data, error } = await supabaseAdmin
                .from('ops_jobs')
                .select('job_id, created_at, created_by')
                .eq('job_id', requestedJobId)
                .maybeSingle();
            if (error) throw error;
            existing = data || null;
        }

        const actor = String(req.auth?.role || 'admin');
        const normalized = normalizeOpsJobPayload(input, { existingJobId: existing?.job_id || requestedJobId, actor });
        if (!normalized.ok) return res.status(400).json({ success: false, message: normalized.errors.join(' ') });

        // Preserve created_at/by on updates.
        if (existing) {
            normalized.row.created_at = existing.created_at;
            normalized.row.created_by = existing.created_by || normalized.row.created_by;
        }

        const { data: upserted, error: upsertError } = await supabaseAdmin
            .from('ops_jobs')
            .upsert([normalized.row], { onConflict: 'job_id' })
            .select('*')
            .maybeSingle();
        if (upsertError) throw upsertError;
        res.json({ success: true, row: mapOpsJobRowToApi(upserted) });
    } catch (error) {
        console.error("ops-jobs-upsert:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create or refresh an ops job from a lead/contact + fresh OTP Oracle run (mobile-friendly pipeline).
app.post('/api/admin/ops/jobs/from-oracle', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const sourceTable = req.body?.sourceTable === 'contacts' ? 'contacts' : 'leads';
        const leadId = String(req.body?.leadId || '').trim();
        const existingJobId = String(req.body?.existingJobId || '').trim() || null;
        if (!leadId) return res.status(400).json({ success: false, message: 'Missing leadId' });

        const { data: lead, error: leadErr } = await supabaseAdmin
            .from(sourceTable)
            .select('*')
            .eq('id', leadId)
            .maybeSingle();
        if (leadErr) throw leadErr;
        if (!lead) return res.status(404).json({ success: false, message: 'Lead or contact not found' });

        const oracle = await runOracleRecommendation({ lead, leadId, sourceTable });
        await persistOracleLeadSnapshot({ leadId, sourceTable, oracle });

        let existing = null;
        if (existingJobId) {
            const { data: ex, error: exErr } = await supabaseAdmin
                .from('ops_jobs')
                .select('job_id, created_at, created_by')
                .eq('job_id', existingJobId)
                .maybeSingle();
            if (exErr) throw exErr;
            if (!ex) return res.status(404).json({ success: false, message: 'existingJobId not found' });
            existing = ex;
        }

        const jobPayload = buildOpsJobPayloadFromLeadAndOracle(lead, sourceTable, oracle, { existingJobId });
        const actor = String(req.auth?.role || 'admin');
        const normalized = normalizeOpsJobPayload(jobPayload, { existingJobId: existing?.job_id || existingJobId, actor });
        if (!normalized.ok) return res.status(400).json({ success: false, message: normalized.errors.join(' ') });

        if (existing) {
            normalized.row.created_at = existing.created_at;
            normalized.row.created_by = existing.created_by || normalized.row.created_by;
        }

        const { data: upserted, error: upsertError } = await supabaseAdmin
            .from('ops_jobs')
            .upsert([normalized.row], { onConflict: 'job_id' })
            .select('*')
            .maybeSingle();
        if (upsertError) throw upsertError;

        const rec = oracle.recommendation || {};
        res.json({
            success: true,
            row: mapOpsJobRowToApi(upserted),
            oracle: {
                confidence: oracle.confidence,
                recommended_package: rec.recommended_package,
                quote_range: rec.quote_range,
                next_action: rec.next_action
            }
        });
    } catch (error) {
        console.error('ops-jobs-from-oracle:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/admin/ops/jobs/update-status', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const jobId = String(req.body?.jobId || '').trim();
        const jobStatus = String(req.body?.jobStatus || '').trim();
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });
        if (!jobStatus) return res.status(400).json({ success: false, message: 'Missing jobStatus' });
        if (!OPS_JOB.jobStatuses.includes(jobStatus)) return res.status(400).json({ success: false, message: 'Invalid jobStatus' });
        const nowIso = new Date().toISOString();
        const actor = String(req.auth?.role || 'admin');
        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .update({ job_status: jobStatus, updated_at: nowIso, updated_by: actor })
            .eq('job_id', jobId)
            .select('*')
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });
        res.json({ success: true, row: mapOpsJobRowToApi(data) });
    } catch (error) {
        console.error("ops-jobs-update-status:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/admin/ops/jobs/archive', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const jobId = String(req.body?.jobId || '').trim();
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });
        const nowIso = new Date().toISOString();
        const actor = String(req.auth?.role || 'admin');
        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .update({ job_status: 'Archived', updated_at: nowIso, updated_by: actor })
            .eq('job_id', jobId)
            .select('*')
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });
        res.json({ success: true, row: mapOpsJobRowToApi(data) });
    } catch (error) {
        console.error("ops-jobs-archive:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.10.6 Ops Jobs → hard delete (admin-only trash)
app.post('/api/admin/ops/jobs/delete', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const jobId = String(req.body?.jobId || '').trim();
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });

        // Delete row (hard). Client/UI must confirm; server remains admin-only via verifyToken.
        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .delete()
            .eq('job_id', jobId)
            .select('job_id')
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });
        res.json({ success: true, deleted: { jobId: data.job_id } });
    } catch (error) {
        console.error("ops-jobs-delete:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.10.x Ops Jobs → Oracle document generation from saved records
app.post('/api/admin/ops/docs/generate', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    if (!OPS_DOCS || typeof OPS_DOCS.generateOpsDocument !== 'function') {
        return res.status(503).json({ success: false, message: 'Ops document generator offline' });
    }
    try {
        const jobId = String(req.body?.jobId || '').trim();
        const docType = String(req.body?.docType || '').trim();
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });
        if (!docType) return res.status(400).json({ success: false, message: 'Missing docType' });

        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });

        const job = mapOpsJobRowToApi(data);
        // Safety: never allow internal notes in any client-facing output payload.
        delete job.internalNotes;

        const result = OPS_DOCS.generateOpsDocument({ docType, job, pricing: OTP_PRICING });
        if (!result || !result.ok) {
            const st = Number(result?.status) || 500;
            return res.status(st).json({ success: false, message: result?.message || 'Generation failed' });
        }

        res.json({
            success: true,
            jobId,
            docType,
            doc: result.doc
        });
    } catch (error) {
        console.error("ops-docs-generate:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.10.y Ops Jobs → Export generated docs as files (PDF/DOCX)
app.get('/api/admin/ops/docs/export/:format/:jobId/:docType', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    if (!OPS_DOCS || typeof OPS_DOCS.generateOpsDocument !== 'function') {
        return res.status(503).json({ success: false, message: 'Ops document generator offline' });
    }
    try {
        const format = String(req.params?.format || '').trim().toLowerCase();
        const jobId = String(req.params?.jobId || '').trim();
        const docType = String(req.params?.docType || '').trim();
        if (!format || !jobId || !docType) return res.status(400).json({ success: false, message: 'Missing format/jobId/docType' });
        if (!['pdf', 'docx'].includes(format)) return res.status(400).json({ success: false, message: 'Invalid format (pdf|docx)' });

        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });

        const job = mapOpsJobRowToApi(data);
        delete job.internalNotes;
        const result = OPS_DOCS.generateOpsDocument({ docType, job, pricing: OTP_PRICING });
        if (!result || !result.ok || !result.doc) {
            const st = Number(result?.status) || 500;
            return res.status(st).json({ success: false, message: result?.message || 'Generation failed' });
        }
        const doc = result.doc;

        if (doc?.validation?.blocking) {
            return res.status(422).json({
                success: false,
                message: doc.validation.message || 'Missing required fields',
                validation: doc.validation
            });
        }

        const yyyyMmDd = new Date().toISOString().slice(0, 10);
        const baseName = `${safeFilenamePart(jobId)}-${safeFilenamePart(docTypeToSlug(docType))}-${yyyyMmDd}`;

            const md = String(doc.rendered_markdown || '').trim();
            const plain = stripLeadingDocTitleLine(opsDocMarkdownToPlainText(md), docType);
        const subtitleParts = [
            doc?.display?.client_label ? `Client: ${doc.display.client_label}` : '',
            doc?.display?.project_label ? `Project: ${doc.display.project_label}` : '',
            job?.email ? `Email: ${job.email}` : ''
        ].filter(Boolean);
        const subtitle = subtitleParts.join(' • ');

        if (format === 'pdf') {
            const pdfBuf = await renderOpsDocPdfFromText({
                title: docType,
                subtitle,
                bodyText: plain
            });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
            return res.send(Buffer.from(pdfBuf));
        }

        const docxBuf = renderOpsDocDocxFromText({
            title: `OnlyTruePerspective LLC — ${docType}`,
            bodyText: plain
        });
        res.setHeader('Content-Type', DOCX_MIME);
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}.docx"`);
        return res.send(docxBuf);
    } catch (error) {
        console.error("ops-docs-export:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

function normalizeOpsPacketDocTypes(input) {
    const allowed = new Set(['Proposal', 'Invoice', 'Agreement', 'Paid Receipt', 'Service Summary']);
    const list = Array.isArray(input) ? input : [];
    return Array.from(new Set(list.map((v) => String(v || '').trim()).filter((v) => allowed.has(v))));
}

function normalizeOpsPacketFormats(input) {
    const allowed = new Set(['pdf', 'docx']);
    const list = Array.isArray(input) ? input : [];
    const out = Array.from(new Set(list.map((v) => String(v || '').trim().toLowerCase()).filter((v) => allowed.has(v))));
    return out.length ? out : ['pdf', 'docx'];
}

function buildOpsPacketSummary({ job, docsIncluded = [], docsBlocked = [], formats = [] }) {
    const client = String(job?.clientName || job?.businessName || '').trim();
    const project = String(job?.projectTitle || job?.serviceType || '').trim();
    const email = String(job?.email || '').trim();
    const pay = String(job?.paymentStatus || '').trim();
    const total = Number.isFinite(Number(job?.totalPriceCents)) ? `$${(Number(job.totalPriceCents) / 100).toFixed(2)}` : '';
    const dep = Number.isFinite(Number(job?.depositAmountCents)) ? `$${(Number(job.depositAmountCents) / 100).toFixed(2)}` : '';
    const rem = Number.isFinite(Number(job?.remainingBalanceCents)) ? `$${(Number(job.remainingBalanceCents) / 100).toFixed(2)}` : '';

    const includedNames = docsIncluded.map((d) => d.docType).join(', ') || '—';
    const blockedNames = docsBlocked.map((d) => d.docType).join(', ') || '—';
    const fmtLine = (formats || []).join(' + ') || 'pdf + docx';

    const shareSummary = normalizeWhitespace([
        `Client: ${client || '—'}`,
        project ? `Project: ${project}` : '',
        `Included docs: ${includedNames}`,
        docsBlocked.length ? `Blocked docs: ${blockedNames}` : '',
        pay ? `Payment status: ${pay}${total ? ` • Total: ${total}` : ''}${dep ? ` • Deposit: ${dep}` : ''}${rem ? ` • Remaining: ${rem}` : ''}` : '',
        email ? `Client email: ${email}` : '',
        `Formats: ${fmtLine}`,
    ].filter(Boolean).join('\n'));

    const clientMessage = normalizeWhitespace([
        `Hi${client ? ` ${client}` : ''},`,
        '',
        project ? `Attached are your OTP documents for: ${project}.` : 'Attached are your OTP documents.',
        `Included: ${includedNames}.`,
        '',
        'If you have any questions or need an adjustment before kickoff, reply here and we’ll tighten it immediately.',
        '',
        '— OnlyTruePerspective LLC',
    ].join('\n'));

    return {
        schema: 'otp-ops-packet-v1',
        jobId: String(job?.jobId || '').trim() || null,
        generated_at: new Date().toISOString(),
        formats: formats || ['pdf', 'docx'],
        included: docsIncluded,
        blocked: docsBlocked,
        share_summary: shareSummary,
        client_message: clientMessage,
    };
}

// 2.10.z Ops Jobs → Packet bundling (preview summary)
app.post('/api/admin/ops/packets/preview', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    if (!OPS_DOCS || typeof OPS_DOCS.generateOpsDocument !== 'function') {
        return res.status(503).json({ success: false, message: 'Ops document generator offline' });
    }
    try {
        const jobId = String(req.body?.jobId || '').trim();
        const docTypes = normalizeOpsPacketDocTypes(req.body?.docTypes || []);
        const formats = normalizeOpsPacketFormats(req.body?.formats || []);
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });
        if (!docTypes.length) return res.status(400).json({ success: false, message: 'Select at least one document type' });

        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });

        const job = mapOpsJobRowToApi(data);
        delete job.internalNotes;

        const included = [];
        const blocked = [];
        for (const docType of docTypes) {
            const out = OPS_DOCS.generateOpsDocument({ docType, job, pricing: OTP_PRICING });
            const doc = out?.doc || null;
            const validation = doc?.validation || {};
            const missing = Array.isArray(validation.missing_required_fields) ? validation.missing_required_fields : [];
            const isBlocked = !!validation.blocking;
            if (isBlocked) {
                blocked.push({ docType, missing_required_fields: missing, message: validation.message || 'Missing required fields' });
            } else {
                included.push({ docType, formats });
            }
        }

        const packet = buildOpsPacketSummary({ job, docsIncluded: included, docsBlocked: blocked, formats });
        res.json({ success: true, packet });
    } catch (error) {
        console.error("ops-packets-preview:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.10.z1 Ops Jobs → Packet ZIP export (regenerates from live job)
app.post('/api/admin/ops/packets/export-zip', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    if (!OPS_DOCS || typeof OPS_DOCS.generateOpsDocument !== 'function') {
        return res.status(503).json({ success: false, message: 'Ops document generator offline' });
    }
    try {
        const jobId = String(req.body?.jobId || '').trim();
        const docTypes = normalizeOpsPacketDocTypes(req.body?.docTypes || []);
        const formats = normalizeOpsPacketFormats(req.body?.formats || []);
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });
        if (!docTypes.length) return res.status(400).json({ success: false, message: 'Select at least one document type' });

        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });

        const job = mapOpsJobRowToApi(data);
        delete job.internalNotes;

        const yyyyMmDd = new Date().toISOString().slice(0, 10);
        const zip = new JSZip();

        const included = [];
        const blocked = [];

        for (const docType of docTypes) {
            const out = OPS_DOCS.generateOpsDocument({ docType, job, pricing: OTP_PRICING });
            const doc = out?.doc || null;
            const validation = doc?.validation || {};
            const missing = Array.isArray(validation.missing_required_fields) ? validation.missing_required_fields : [];
            if (!doc || validation.blocking) {
                blocked.push({ docType, missing_required_fields: missing, message: validation.message || 'Missing required fields' });
                continue;
            }

            const md = String(doc.rendered_markdown || '').trim();
            const plain = stripLeadingDocTitleLine(opsDocMarkdownToPlainText(md), docType);
            const subtitleParts = [
                doc?.display?.client_label ? `Client: ${doc.display.client_label}` : '',
                doc?.display?.project_label ? `Project: ${doc.display.project_label}` : '',
                job?.email ? `Email: ${job.email}` : ''
            ].filter(Boolean);
            const subtitle = subtitleParts.join(' • ');

            const slug = safeFilenamePart(docTypeToSlug(docType));
            const baseName = `${safeFilenamePart(jobId)}-${slug}-${yyyyMmDd}`;

            for (const fmt of formats) {
                if (fmt === 'pdf') {
                    const pdfBuf = await renderOpsDocPdfFromText({ title: docType, subtitle, bodyText: plain });
                    zip.file(`${baseName}.pdf`, Buffer.from(pdfBuf));
                }
                if (fmt === 'docx') {
                    const docxBuf = renderOpsDocDocxFromText({ title: `OnlyTruePerspective LLC — ${docType}`, bodyText: plain });
                    zip.file(`${baseName}.docx`, docxBuf);
                }
            }
            included.push({ docType, formats });
        }

        const packet = buildOpsPacketSummary({ job, docsIncluded: included, docsBlocked: blocked, formats });
        zip.file(`${safeFilenamePart(jobId)}-packet-summary-${yyyyMmDd}.txt`, packet.share_summary);

        const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilenamePart(jobId)}-packet-${yyyyMmDd}.zip"`);
        res.send(buf);
    } catch (error) {
        console.error("ops-packets-export-zip:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

function opsDocTypeSlugLower(docType) {
    return String(docType || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'document';
}

function buildOpsSendDefaults({ job, mode, includedDocTypes, isPacket }) {
    const client = String(job?.clientName || job?.businessName || '').trim() || 'Client';
    const project = String(job?.projectTitle || job?.serviceType || '').trim();
    const subjectBase = project ? `${project}` : `${String(job?.serviceType || '').trim() || 'OTP Documents'}`;
    const subject = `Only True Perspective — ${subjectBase}`;

    const includedLine = Array.isArray(includedDocTypes) && includedDocTypes.length
        ? includedDocTypes.join(', ')
        : (isPacket ? 'Packet' : 'Documents');

    const body = normalizeWhitespace([
        `Hi ${client},`,
        '',
        project ? `Attached are your OTP documents for: ${project}.` : 'Attached are your OTP documents.',
        `Included: ${includedLine}.`,
        '',
        'If you need an adjustment before kickoff, reply here and we’ll tighten it immediately.',
        '',
        '— OnlyTruePerspective LLC'
    ].join('\n'));

    return { subject, body };
}

async function appendOpsSendHistory({ jobId, event }) {
    if (!supabaseAdmin) return null;
    const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const key = `${KNOWLEDGE_PREFIX.opsSend}${jobId}::${id}`;
    const nowIso = new Date().toISOString();
    const payload = {
        schema: 'otp-ops-send-v1',
        id,
        job_id: jobId,
        created_at: nowIso,
        event
    };
    const { error } = await supabaseAdmin
        .from('site_content')
        .upsert([{ key, content: JSON.stringify(payload), updated_at: nowIso }], { onConflict: 'key' });
    if (error) throw error;
    return { key, id };
}

// 2.10.z2 Ops Jobs → Send prep (docs or packet)
app.post('/api/admin/ops/send/prepare', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    if (!OPS_DOCS || typeof OPS_DOCS.generateOpsDocument !== 'function') {
        return res.status(503).json({ success: false, message: 'Ops document generator offline' });
    }
    try {
        const jobId = String(req.body?.jobId || '').trim();
        const mode = String(req.body?.mode || 'packet').trim(); // packet|docs
        const docTypes = normalizeOpsPacketDocTypes(req.body?.docTypes || []);
        const formats = normalizeOpsPacketFormats(req.body?.formats || []);
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });
        if (!['packet', 'docs'].includes(mode)) return res.status(400).json({ success: false, message: 'Invalid mode' });
        if (!docTypes.length) return res.status(400).json({ success: false, message: 'Select at least one document type' });

        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });

        const job = mapOpsJobRowToApi(data);
        delete job.internalNotes;

        const included = [];
        const blocked = [];
        for (const docType of docTypes) {
            const out = OPS_DOCS.generateOpsDocument({ docType, job, pricing: OTP_PRICING });
            const doc = out?.doc || null;
            const validation = doc?.validation || {};
            const missing = Array.isArray(validation.missing_required_fields) ? validation.missing_required_fields : [];
            if (!doc || validation.blocking) {
                blocked.push({ docType, missing_required_fields: missing, message: validation.message || 'Missing required fields' });
                continue;
            }
            included.push({ docType, formats, filenames: formats.map((fmt) => {
                const yyyyMmDd = new Date().toISOString().slice(0, 10);
                const baseName = `${safeFilenamePart(jobId)}-${safeFilenamePart(docTypeToSlug(docType))}-${yyyyMmDd}`;
                return `${baseName}.${fmt}`;
            })});
        }

        const includedDocTypes = included.map(d => d.docType);
        const defaults = buildOpsSendDefaults({ job, mode, includedDocTypes, isPacket: mode === 'packet' });

        const packetPreview = buildOpsPacketSummary({ job, docsIncluded: included.map(d => ({ docType: d.docType, formats })), docsBlocked: blocked, formats });
        const toDefault = String(job.email || '').trim();

        res.json({
            success: true,
            jobId,
            mode,
            to_default: toDefault || null,
            subject_default: defaults.subject,
            body_default: defaults.body,
            included,
            blocked,
            packet: packetPreview
        });
    } catch (error) {
        console.error("ops-send-prepare:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.10.z3 Ops Jobs → Send execute (controlled, admin-only)
app.post('/api/admin/ops/send/execute', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    if (!OPS_DOCS || typeof OPS_DOCS.generateOpsDocument !== 'function') {
        return res.status(503).json({ success: false, message: 'Ops document generator offline' });
    }
    try {
        const jobId = String(req.body?.jobId || '').trim();
        const mode = String(req.body?.mode || 'packet').trim();
        const to = safeEmail(req.body?.to);
        const from = resolveDocPacketFrom(req.body?.from); // reuse existing from constraints
        const replyTo = BUSINESS_EMAILS.BOOKINGS;
        const subject = String(req.body?.subject || '').trim();
        const body = String(req.body?.body || '').trim();
        const docTypes = normalizeOpsPacketDocTypes(req.body?.docTypes || []);
        const formats = normalizeOpsPacketFormats(req.body?.formats || []);
        if (!jobId) return res.status(400).json({ success: false, message: 'Missing jobId' });
        if (!['packet', 'docs'].includes(mode)) return res.status(400).json({ success: false, message: 'Invalid mode' });
        if (!to) return res.status(400).json({ success: false, message: 'Missing/invalid recipient email' });
        if (!subject) return res.status(400).json({ success: false, message: 'Missing subject' });
        if (!body) return res.status(400).json({ success: false, message: 'Missing body message' });
        if (!docTypes.length) return res.status(400).json({ success: false, message: 'Select at least one document type' });

        const { data, error } = await supabaseAdmin
            .from('ops_jobs')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Job not found' });

        const job = mapOpsJobRowToApi(data);
        delete job.internalNotes;

        const yyyyMmDd = new Date().toISOString().slice(0, 10);
        const attachments = [];
        const missing = [];
        const verification = [];

        // Build docs (exclude blocked always)
        const included = [];
        const blocked = [];
        const zip = mode === 'packet' ? new JSZip() : null;

        for (const docType of docTypes) {
            const out = OPS_DOCS.generateOpsDocument({ docType, job, pricing: OTP_PRICING });
            const doc = out?.doc || null;
            const validation = doc?.validation || {};
            const miss = Array.isArray(validation.missing_required_fields) ? validation.missing_required_fields : [];
            if (!doc || validation.blocking) {
                blocked.push({ docType, missing_required_fields: miss, message: validation.message || 'Missing required fields' });
                missing.push(`${docType}:blocked`);
                continue;
            }

                    const md = String(doc.rendered_markdown || '').trim();
                    const plain = stripLeadingDocTitleLine(opsDocMarkdownToPlainText(md), docType);
            const subtitleParts = [
                doc?.display?.client_label ? `Client: ${doc.display.client_label}` : '',
                doc?.display?.project_label ? `Project: ${doc.display.project_label}` : '',
                job?.email ? `Email: ${job.email}` : ''
            ].filter(Boolean);
            const subtitle = subtitleParts.join(' • ');

            const slug = safeFilenamePart(docTypeToSlug(docType));
            const baseName = `${safeFilenamePart(jobId)}-${slug}-${yyyyMmDd}`;

            for (const fmt of formats) {
                if (fmt === 'pdf') {
                    const pdfBuf = await renderOpsDocPdfFromText({ title: docType, subtitle, bodyText: plain });
                    const filename = `${baseName}.pdf`;
                    if (mode === 'packet') {
                        zip.file(filename, Buffer.from(pdfBuf));
                    } else {
                        const a = { filename, content: base64FromBuffer(Buffer.from(pdfBuf)), content_type: 'application/pdf' };
                        const v = verifyAttachmentOrThrow(a);
                        verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
                        attachments.push(a);
                    }
                }
                if (fmt === 'docx') {
                    const docxBuf = renderOpsDocDocxFromText({ title: `OnlyTruePerspective LLC — ${docType}`, bodyText: plain });
                    const filename = `${baseName}.docx`;
                    if (mode === 'packet') {
                        zip.file(filename, docxBuf);
                    } else {
                        const a = { filename, content: base64FromBuffer(docxBuf), content_type: DOCX_MIME };
                        const v = verifyAttachmentOrThrow(a);
                        verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
                        attachments.push(a);
                    }
                }
            }

            included.push({ docType, formats });
        }

        let packetSummary = null;
        if (mode === 'packet') {
            packetSummary = buildOpsPacketSummary({ job, docsIncluded: included, docsBlocked: blocked, formats });
            zip.file(`${safeFilenamePart(jobId)}-packet-summary-${yyyyMmDd}.txt`, packetSummary.share_summary);
            const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            const filename = `${safeFilenamePart(jobId)}-packet-${yyyyMmDd}.zip`;
            const a = { filename, content: base64FromBuffer(zipBuf), content_type: 'application/zip' };
            const v = verifyAttachmentOrThrow(a);
            verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
            attachments.push(a);
        }

        if (!attachments.length) {
            return res.status(400).json({
                success: false,
                message: 'No valid documents are ready to send (all selected docs are blocked)',
                details: { blocked }
            });
        }

        const list = attachments.map(a => a.filename).join(', ');
        const html = `
            <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Arial; line-height:1.6; color:#111;">
              <p>${escapeHtmlForEmail(body).replace(/\n/g, '<br/>')}</p>
              <p style="margin:14px 0 0;"><strong>Included:</strong> ${escapeHtmlForEmail(list)}</p>
              <p style="margin-top:18px;"><strong>Only True Perspective</strong><br/>${escapeHtmlForEmail(from)}</p>
            </div>
        `;
        const text = `${body}\n\nIncluded: ${list}\n\nOnly True Perspective\n${from}`;

        const emailResult = await sendSecureEmail({ to, from, replyTo, subject, html, text, attachments });
        const resendId = String(emailResult?.data?.id || '').trim() || null;

        // Lightweight send history (ops_jobs based)
        const historyEvent = {
            type: 'ops_send',
            actor: req.auth?.role || 'admin',
            job_id: jobId,
            mode,
            to,
            from,
            reply_to: replyTo,
            subject,
            included_docs: included.map(d => d.docType),
            blocked_docs: blocked,
            attachments: attachments.map(a => ({ filename: a.filename, content_type: a.content_type })),
            attachment_verification: verification,
            provider: 'resend',
            success: !!emailResult?.success,
            provider_response: emailResult?.data || null,
            simulated: !!emailResult?.simulated,
            resend_email_id: resendId
        };
        const history = await appendOpsSendHistory({ jobId, event: historyEvent });

        if (!emailResult?.success) {
            const msg = String(emailResult?.data?.message || emailResult?.error || 'Email failed');
            return res.status(502).json({
                success: false,
                message: msg,
                blocked,
                resend_email_id: resendId,
                history_key: history?.key || null
            });
        }

        res.json({
            success: true,
            message: emailResult?.simulated ? 'Email simulated (no RESEND_API_KEY configured)' : 'Email sent',
            sent: attachments.map(a => ({ filename: a.filename, content_type: a.content_type })),
            blocked,
            resend_email_id: resendId,
            history_key: history?.key || null,
            packet: packetSummary
        });
    } catch (error) {
        console.error("ops-send-execute:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.11 OTP Oracle — knowledge: lead/contact recommendation
app.post('/api/admin/knowledge/recommend', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const sourceTable = req.body?.sourceTable === 'contacts' ? 'contacts' : 'leads';
        let lead = req.body?.leadData || null;
        let leadId = String(req.body?.leadId || '').trim();

        if (!lead && leadId) {
            const { data, error } = await supabaseAdmin
                .from(sourceTable)
                .select('*')
                .eq('id', leadId)
                .maybeSingle();
            if (error) throw error;
            lead = data;
        }
        if (!lead) return res.status(400).json({ success: false, message: "Missing lead context." });
        if (!leadId) leadId = String(lead.id || '').trim() || crypto.randomBytes(6).toString('hex');
        const oracle = await runOracleRecommendation({ lead, leadId, sourceTable });
        const { topMatches, confidence, recommendation } = oracle;

        const { nowIso, kb_updated_at } = await persistOracleLeadSnapshot({ leadId, sourceTable, oracle });

        res.json({
            success: true,
            leadId,
            confidence: Number(confidence.toFixed(4)),
            recommendation,
            top_matches: topMatches.slice(0, 6),
            updated_at: nowIso,
            kb_updated_at: kb_updated_at || null
        });
    } catch (error) {
        const status = Number(error.statusCode) || 500;
        console.error("knowledge-recommend:", error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// --- OTP Dynamic Document Generation (Admin Approval Gate) ---
// 2.12 Generate a doc packet (HTML previews) from Oracle recommendation path
app.post('/api/admin/docs/packet', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const sourceTable = req.body?.sourceTable === 'contacts' ? 'contacts' : 'leads';
        const leadId = String(req.body?.leadId || '').trim();
        if (!leadId) return res.status(400).json({ success: false, message: "Missing leadId." });

        let lead = req.body?.leadData || null;
        if (!lead) {
            const { data: rowLead, error: leadError } = await supabaseAdmin
                .from(sourceTable)
                .select('*')
                .eq('id', leadId)
                .maybeSingle();
            if (leadError) throw leadError;
            lead = rowLead || null;
        }
        if (!lead) return res.status(404).json({ success: false, message: "Lead not found." });
        // Run Oracle-style recommendation (shared helper)
        const oracle = await runOracleRecommendation({ lead, leadId, sourceTable });
        const { recommendation } = oracle;

        const fields = buildDocFields({ lead, sourceTable, recommendation });
        const docTypes = ['proposal', 'agreement', 'invoice', 'nda', 'media_release'];
        const docs = {};
        for (const t of docTypes) {
            docs[t] = {
                html: renderHtmlDoc(t, fields),
                approved: false,
                approved_at: null,
                signed: false,
                signed_at: null,
                signature_required: t === 'agreement'
            };
        }

        // DOCX: merge master templates (proposal + agreement) into base64 on the packet for send/download UX.
        // Templates live in Supabase Storage: DOC_TEMPLATE_BUCKET / DOC_TEMPLATE_PREFIX
        const docxErrors = {};
        for (const t of ['proposal', 'agreement']) {
            const templateKey = `${DOC_TEMPLATE_PREFIX}${t}.docx`;
            docs[t].docx_template = templateKey;
            const { base64, error } = await mergeDocxForPacketDoc(docs[t], t, fields);
            if (error || !base64) {
                docxErrors[t] = error || 'merge returned empty';
                delete docs[t].docx;
            } else {
                docs[t].docx = base64;
            }
        }

        const packetId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const nowIso = new Date().toISOString();
        const key = `${KNOWLEDGE_PREFIX.docPacket}${packetId}`;
        const record = {
            schema: 'otp-doc-packet-v1',
            packet_id: packetId,
            source_table: sourceTable,
            lead_id: leadId,
            generated_at: nowIso,
            fields,
            docs,
            recommendation
        };

        const { error: upsertError } = await supabaseAdmin
            .from('site_content')
            .upsert([{ key, content: JSON.stringify(record), updated_at: nowIso }], { onConflict: 'key' });
        if (upsertError) throw upsertError;

        res.json({
            success: true,
            packet_id: packetId,
            fields,
            recommendation,
            docs,
            docx_errors: Object.keys(docxErrors).length ? docxErrors : null
        });
    } catch (error) {
        const status = Number(error.statusCode) || 500;
        console.error("docs-packet:", error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// 2.13 Approve one or more docs in a packet (manual gate)
app.post('/api/admin/docs/approve', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.body?.packetId || '').trim();
    const approvals = req.body?.approvals || {};
    if (!packetId) return res.status(400).json({ success: false, message: "Missing packetId." });
    try {
        const key = `${KNOWLEDGE_PREFIX.docPacket}${packetId}`;
        const { data: row, error: fetchError } = await supabaseAdmin
            .from('site_content')
            .select('content')
            .eq('key', key)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!row) return res.status(404).json({ success: false, message: "Packet not found." });
        const packet = safeJsonParse(row.content, null);
        if (!packet || typeof packet !== 'object') return res.status(500).json({ success: false, message: "Packet corrupted." });

        const docs = packet.docs && typeof packet.docs === 'object' ? packet.docs : {};
        for (const [docType, isApproved] of Object.entries(approvals || {})) {
            if (!docs[docType]) continue;
            docs[docType].approved = !!isApproved;
            docs[docType].approved_at = !!isApproved ? new Date().toISOString() : null;
        }
        packet.docs = docs;
        const nowIso = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin
            .from('site_content')
            .update({ content: JSON.stringify(packet), updated_at: nowIso })
            .eq('key', key);
        if (updateError) throw updateError;
        res.json({ success: true, packet_id: packetId, docs: Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, { approved: !!v.approved }])) });
    } catch (error) {
        console.error("docs-approve:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.13.1 Signature hooks (internal scaffolding; no external e-sign provider yet)
app.post('/api/admin/docs/signature/request', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.body?.packetId || '').trim();
    const docType = String(req.body?.docType || '').trim();
    if (!packetId) return res.status(400).json({ success: false, message: 'Missing packetId' });
    if (!docType) return res.status(400).json({ success: false, message: 'Missing docType' });
    try {
        const got = await getDocPacketOrThrow(packetId);
        const packet = got.packet;
        const docs = packet.docs && typeof packet.docs === 'object' ? packet.docs : {};
        if (!docs[docType]) return res.status(404).json({ success: false, message: 'Doc not found' });
        const audit = await appendDocAudit(packetId, {
            type: 'doc_signature_requested',
            actor: req.auth?.role || 'admin',
            doc_type: docType,
            packet_version: got.meta
        });
        res.json({ success: true, audit_last_hash: audit?.last_hash || null });
    } catch (error) {
        const status = Number(error.statusCode) || 500;
        console.error("docs-signature-request:", error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

app.post('/api/admin/docs/signature/capture', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.body?.packetId || '').trim();
    const docType = String(req.body?.docType || '').trim();
    const signerName = String(req.body?.signer_name || '').trim();
    if (!packetId) return res.status(400).json({ success: false, message: 'Missing packetId' });
    if (!docType) return res.status(400).json({ success: false, message: 'Missing docType' });
    if (!signerName) return res.status(400).json({ success: false, message: 'Missing signer_name' });
    try {
        const got = await getDocPacketOrThrow(packetId);
        const packet = got.packet;
        const docs = packet.docs && typeof packet.docs === 'object' ? packet.docs : {};
        if (!docs[docType]) return res.status(404).json({ success: false, message: 'Doc not found' });

        // Minimal state update (scaffolding). Later: signer sessions + locked render + binary artifacts.
        docs[docType].signed = true;
        docs[docType].signed_at = new Date().toISOString();
        packet.docs = docs;
        if (!packet.fields || typeof packet.fields !== 'object') packet.fields = {};
        packet.fields.client_signature_name = signerName;
        packet.fields.client_signature_date = new Date().toISOString().slice(0, 10);

        const key = `${KNOWLEDGE_PREFIX.docPacket}${packetId}`;
        const nowIso = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin
            .from('site_content')
            .update({ content: JSON.stringify(packet), updated_at: nowIso })
            .eq('key', key);
        if (updateError) throw updateError;

        const audit = await appendDocAudit(packetId, {
            type: 'doc_signature_captured',
            actor: req.auth?.role || 'admin',
            doc_type: docType,
            signer_name: signerName,
            packet_version: got.meta
        });

        res.json({ success: true, packet_id: packetId, doc_type: docType, audit_last_hash: audit?.last_hash || null });
    } catch (error) {
        const status = Number(error.statusCode) || 500;
        console.error("docs-signature-capture:", error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// 2.14 Download an approved doc (HTML)
app.get('/api/admin/docs/download/:packetId/:docType', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.params?.packetId || '').trim();
    const docType = String(req.params?.docType || '').trim();
    if (!packetId || !docType) return res.status(400).send('Missing packetId/docType');
    try {
        const key = `${KNOWLEDGE_PREFIX.docPacket}${packetId}`;
        const { data: row, error: fetchError } = await supabaseAdmin
            .from('site_content')
            .select('content')
            .eq('key', key)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!row) return res.status(404).send('Packet not found');
        const packet = safeJsonParse(row.content, null);
        const doc = packet?.docs?.[docType];
        if (!doc) return res.status(404).send('Doc not found');
        if (!doc.approved) return res.status(403).send('Doc not approved');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${docType}-${packetId}.html"`);
        res.send(String(doc.html || ''));
    } catch (error) {
        console.error("docs-download:", error.message);
        res.status(500).send('Download failed');
    }
});

// 2.15 Download an approved doc as DOCX (proposal/agreement)
app.get('/api/admin/docs/download-docx/:packetId/:docType', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.params?.packetId || '').trim();
    const docType = String(req.params?.docType || '').trim();
    if (!packetId || !docType) return res.status(400).json({ success: false, message: 'Missing packetId/docType' });
    if (!['proposal', 'agreement'].includes(docType)) return res.status(400).json({ success: false, message: 'DOCX export not enabled for this doc type' });
    try {
        const key = `${KNOWLEDGE_PREFIX.docPacket}${packetId}`;
        const { data: row, error: fetchError } = await supabaseAdmin
            .from('site_content')
            .select('content')
            .eq('key', key)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!row) return res.status(404).json({ success: false, message: 'Packet not found' });
        const packet = safeJsonParse(row.content, null);
        const doc = packet?.docs?.[docType];
        if (!doc) return res.status(404).json({ success: false, message: 'Doc not found' });
        if (!doc.approved) return res.status(403).json({ success: false, message: 'Doc not approved' });
        const templateKey = String(doc.docx_template || `${DOC_TEMPLATE_PREFIX}${docType}.docx`).trim();
        if (!templateKey) return res.status(400).json({ success: false, message: 'DOCX template not configured' });
        const fields = packet?.fields && typeof packet.fields === 'object' ? packet.fields : {};
        const templateBuf = await getTemplateBuffer(templateKey);
        const buf = renderDocxFromTemplate(templateBuf, fields);
        res.setHeader('Content-Type', DOCX_MIME);
        res.setHeader('Content-Disposition', `attachment; filename="${docType}-${packetId}.docx"`);
        res.send(buf);
    } catch (error) {
        console.error("docs-download-docx:", error.message);
        res.status(500).json({ success: false, message: 'Download failed' });
    }
});

// 2.17 Download an approved invoice as PDF
app.get('/api/admin/docs/download-pdf/:packetId/:docType', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.params?.packetId || '').trim();
    const docType = String(req.params?.docType || '').trim();
    if (!packetId || !docType) return res.status(400).json({ success: false, message: 'Missing packetId/docType' });
    if (docType !== 'invoice') return res.status(400).json({ success: false, message: 'PDF export is only enabled for invoice' });
    try {
        const key = `${KNOWLEDGE_PREFIX.docPacket}${packetId}`;
        const { data: row, error: fetchError } = await supabaseAdmin
            .from('site_content')
            .select('content')
            .eq('key', key)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!row) return res.status(404).json({ success: false, message: 'Packet not found' });
        const packet = safeJsonParse(row.content, null);
        const doc = packet?.docs?.[docType];
        if (!doc) return res.status(404).json({ success: false, message: 'Doc not found' });
        if (!doc.approved) return res.status(403).json({ success: false, message: 'Doc not approved' });
        const fields = packet?.fields || {};
        const pdfBuf = await renderInvoicePdf(fields, packetId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${packetId}.pdf"`);
        res.send(pdfBuf);
    } catch (error) {
        console.error("docs-download-pdf:", error.message);
        res.status(500).json({ success: false, message: 'Download failed' });
    }
});

// 2.16 Upload master DOCX templates (admin-only)
app.post('/api/admin/docs/templates/upload', verifyToken, docTemplateUpload.single('file'), async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const docType = String(req.body?.docType || '').trim();
        if (!['proposal', 'agreement'].includes(docType)) {
            return res.status(400).json({ success: false, message: "docType must be proposal or agreement" });
        }
        if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: "Missing file upload." });
        await ensureDocTemplateBucket();
        const key = `${DOC_TEMPLATE_PREFIX}${docType}.docx`;
        const { error } = await supabaseAdmin.storage
            .from(DOC_TEMPLATE_BUCKET)
            .upload(key, req.file.buffer, { upsert: true, contentType: DOCX_MIME });
        if (error) throw error;
        res.json({ success: true, template_key: key });
    } catch (error) {
        console.error("docs-template-upload:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.16 Template status (global)
app.get('/api/admin/docs/templates/status', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        await ensureDocTemplateBucket();
        const { data, error } = await supabaseAdmin.storage
            .from(DOC_TEMPLATE_BUCKET)
            .list(DOC_TEMPLATE_PREFIX, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw error;
        const files = Array.isArray(data) ? data : [];
        const byName = new Map();
        for (const f of files) {
            const n = String(f?.name || '').trim();
            if (n) byName.set(n.toLowerCase(), f);
        }
        const fileStatus = (fileName) => {
            const want = String(fileName || '').trim().toLowerCase();
            const row = want ? byName.get(want) : null;
            const key = `${DOC_TEMPLATE_PREFIX}${fileName}`;
            if (!row) {
                return { key, present: false, updated_at: null, size: null };
            }
            const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
            const sizeRaw = meta.size;
            const size = Number.isFinite(Number(sizeRaw)) ? Number(sizeRaw) : null;
            return {
                key,
                present: true,
                updated_at: row.updated_at || row.created_at || null,
                size
            };
        };
        res.json({
            success: true,
            bucket: DOC_TEMPLATE_BUCKET,
            prefix: DOC_TEMPLATE_PREFIX,
            templates: {
                proposal: fileStatus('proposal.docx'),
                agreement: fileStatus('agreement.docx')
            }
        });
    } catch (error) {
        console.error("docs-templates-status:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Download current master template (edit locally, then re-upload)
app.get('/api/admin/docs/templates/download/:docType', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const docType = String(req.params?.docType || '').trim();
    if (!['proposal', 'agreement'].includes(docType)) {
        return res.status(400).json({ success: false, message: 'docType must be proposal or agreement' });
    }
    try {
        const key = `${DOC_TEMPLATE_PREFIX}${docType}.docx`;
        const buf = await getTemplateBuffer(key);
        if (!buf || !buf.length) {
            return res.status(404).json({ success: false, message: 'Template file is empty' });
        }
        res.setHeader('Content-Type', DOCX_MIME);
        res.setHeader('Content-Disposition', `attachment; filename="${docType}.docx"`);
        res.send(buf);
    } catch (error) {
        const msg = String(error?.message || error);
        const low = msg.toLowerCase();
        const notFound = low.includes('not found') || low.includes('does not exist') || /object not found|404/.test(low);
        if (notFound) {
            return res.status(404).json({ success: false, message: 'No template in storage yet — upload a .docx first' });
        }
        console.error('docs-template-download:', msg);
        res.status(500).json({ success: false, message: msg });
    }
});

async function getDocPacketOrThrow(packetId) {
    const key = `${KNOWLEDGE_PREFIX.docPacket}${packetId}`;
    const { data: row, error: fetchError } = await supabaseAdmin
        .from('site_content')
        .select('content, updated_at, key')
        .eq('key', key)
        .maybeSingle();
    if (fetchError) throw fetchError;
    if (!row) {
        const e = new Error('Packet not found');
        e.statusCode = 404;
        throw e;
    }
    const packet = safeJsonParse(row.content, null);
    if (!packet || typeof packet !== 'object') {
        const e = new Error('Packet corrupted');
        e.statusCode = 500;
        throw e;
    }
    const raw = String(row.content || '');
    const packet_sha256 = crypto.createHash('sha256').update(raw).digest('hex');
    return {
        packet,
        meta: {
            packet_id: packetId,
            packet_key: String(row.key || key),
            packet_updated_at: row.updated_at || null,
            packet_sha256
        }
    };
}

async function appendDocAudit(packetId, entry) {
    const nowIso = new Date().toISOString();
    const key = `${KNOWLEDGE_PREFIX.docAudit}${packetId}`;
    const { data: row, error: fetchError } = await supabaseAdmin
        .from('site_content')
        .select('content')
        .eq('key', key)
        .maybeSingle();
    if (fetchError) throw fetchError;
    const existing = row ? safeJsonParse(row.content, null) : null;
    const events = Array.isArray(existing?.events) ? existing.events : [];
    const lastHash = String(existing?.last_hash || '');
    const eventId = crypto.randomBytes(6).toString('hex');
    const payload = { id: eventId, ...entry, at: nowIso };
    const nextHash = crypto
        .createHash('sha256')
        .update(`${lastHash}\n${JSON.stringify(payload)}`)
        .digest('hex');
    events.push({ ...payload, prev_hash: lastHash || null, hash: nextHash });
    const record = {
        schema: 'otp-doc-audit-v1',
        packet_id: packetId,
        events,
        last_hash: events.length ? events[events.length - 1].hash : lastHash || null
    };
    const { error: upsertError } = await supabaseAdmin
        .from('site_content')
        .upsert([{ key, content: JSON.stringify(record), updated_at: nowIso }], { onConflict: 'key' });
    if (upsertError) throw upsertError;
    return record;
}

function safeEmail(s) {
    const v = String(s || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
    return v;
}

/** Only workspace addresses may appear in Resend `from` (domain is verified there). */
function resolveDocPacketFrom(raw) {
    const allowed = new Set(Object.values(BUSINESS_EMAILS).map((e) => String(e).toLowerCase()));
    const r = safeEmail(raw);
    if (r && allowed.has(r.toLowerCase())) return r;
    return BUSINESS_EMAILS.BOOKINGS;
}

function base64FromBuffer(buf) {
    return Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf).toString('base64');
}

function verifyAttachmentOrThrow(att) {
    const name = String(att?.filename || '').toLowerCase();
    const type = String(att?.content_type || '');
    const contentB64 = String(att?.content || '');
    if (!name || !type || !contentB64) throw new Error('Attachment invalid (missing fields)');
    let buf;
    try { buf = Buffer.from(contentB64, 'base64'); } catch (e) { throw new Error(`Attachment invalid base64: ${name}`); }
    if (!buf || !buf.length) throw new Error(`Attachment empty: ${name}`);
    if (name.endsWith('.pdf')) {
        if (!buf.slice(0, 4).equals(Buffer.from('%PDF'))) throw new Error(`Attachment verification failed (PDF): ${name}`);
    }
    if (name.endsWith('.docx')) {
        if (!buf.slice(0, 2).equals(Buffer.from('PK'))) throw new Error(`Attachment verification failed (DOCX): ${name}`);
    }
    if (name.endsWith('.zip') || type === 'application/zip') {
        if (!buf.slice(0, 2).equals(Buffer.from('PK'))) throw new Error(`Attachment verification failed (ZIP): ${name}`);
    }
    if (name.endsWith('.html')) {
        const head = buf.slice(0, 64).toString('utf8').toLowerCase();
        if (!head.includes('<!doctype') && !head.includes('<html')) throw new Error(`Attachment verification failed (HTML): ${name}`);
    }
    return { bytes: buf.length };
}

async function fetchResendEmailStatus(resendId) {
    const key = String(process.env.RESEND_API_KEY || '').trim();
    if (!key) return { available: false, message: 'RESEND_API_KEY not configured' };
    const id = String(resendId || '').trim();
    if (!id) return { available: false, message: 'Missing resend id' };
    const r = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
        headers: { 'Authorization': `Bearer ${key}` }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
        return { available: true, success: false, status: null, data };
    }
    // Resend returns fields like {id, to, subject, created_at, last_event, ...}
    return { available: true, success: true, status: data?.last_event || data?.status || null, data };
}

// 2.18 Send approved doc packet via email + audit trail
app.post('/api/admin/docs/send', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.body?.packetId || '').trim();
    const to = safeEmail(req.body?.to);
    const from = resolveDocPacketFrom(req.body?.from);
    const replyTo = BUSINESS_EMAILS.BOOKINGS; // Default replies to Google Workspace bookings inbox
    const include = Array.isArray(req.body?.include) ? req.body.include.map(v => String(v).trim()).filter(Boolean) : [];
    if (!packetId) return res.status(400).json({ success: false, message: 'Missing packetId' });
    if (!to) return res.status(400).json({ success: false, message: 'Missing/invalid recipient email' });
    if (!include.length) return res.status(400).json({ success: false, message: 'Select at least one document to send' });

    try {
        const got = await getDocPacketOrThrow(packetId);
        const packet = got.packet;
        const packetMeta = got.meta || {};
        const docs = packet.docs && typeof packet.docs === 'object' ? packet.docs : {};
        const fields = packet.fields || {};
        const clientName = String(fields.client_name || '').trim() || 'Client';

        const allowedDocs = new Set(['proposal', 'agreement', 'invoice', 'nda', 'media_release']);
        const toSend = include.filter(d => allowedDocs.has(d));
        if (!toSend.length) return res.status(400).json({ success: false, message: 'No valid doc types selected' });

        // Build attachments (approved only)
        const attachments = [];
        const missing = [];
        const verification = [];
        for (const docType of toSend) {
            const doc = docs[docType];
            if (!doc) { missing.push(`${docType}:not_generated`); continue; }
            if (!doc.approved) { missing.push(`${docType}:not_approved`); continue; }

            if (docType === 'proposal' || docType === 'agreement') {
                const built = await buildDocxEmailAttachment(doc, docType, packetId, fields);
                if (!built.ok) {
                    missing.push(built.missing);
                    continue;
                }
                verification.push(built.verification);
                attachments.push(built.attachment);
                continue;
            }
            if (docType === 'invoice') {
                const pdfBuf = await renderInvoicePdf(fields, packetId);
                const a = {
                    filename: `invoice-${packetId}.pdf`,
                    content: base64FromBuffer(pdfBuf),
                    content_type: 'application/pdf'
                };
                const v = verifyAttachmentOrThrow(a);
                verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
                attachments.push(a);
                continue;
            }
            // NDA / media_release as HTML
            if (!doc.html) { missing.push(`${docType}:html_missing`); continue; }
            const a = {
                filename: `${docType}-${packetId}.html`,
                content: base64FromBuffer(Buffer.from(String(doc.html), 'utf8')),
                content_type: 'text/html'
            };
            const v = verifyAttachmentOrThrow(a);
            verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
            attachments.push(a);
        }

        if (!attachments.length) {
            return res.status(400).json({
                success: false,
                message: 'No approved documents are ready to send',
                details: { missing }
            });
        }

        const subject = `Only True Perspective — Documents for ${clientName}`;
        const list = attachments.map(a => a.filename).join(', ');
        const html = `
            <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Arial; line-height:1.6; color:#111;">
              <p>Attached are your approved documents from Only True Perspective.</p>
              <p style="margin:0 0 10px;"><strong>Included:</strong> ${escapeHtmlForEmail(list)}</p>
              <p>If anything needs adjustment, reply to this email and we’ll handle it.</p>
              <p style="margin-top:18px;"><strong>Only True Perspective</strong><br/>${escapeHtmlForEmail(from)}</p>
            </div>
        `;
        const text = `Attached are your approved documents from Only True Perspective.\n\nIncluded: ${list}\n\nReply to this email if anything needs adjustment.\n\nOnly True Perspective\n${from}`;

        const emailResult = await sendSecureEmail({ to, from, replyTo, subject, html, text, attachments });
        const resendId = String(emailResult?.data?.id || '').trim() || null;

        // Audit trail (append-only)
        const event = {
            type: 'doc_packet_send',
            actor: req.auth?.role || 'admin',
            to,
            from,
            reply_to: replyTo,
            include: toSend,
            attachments: attachments.map(a => ({ filename: a.filename, content_type: a.content_type })),
            attachment_verification: verification,
            missing,
            provider: 'resend',
            success: !!emailResult?.success,
            provider_response: emailResult?.data || null,
            simulated: !!emailResult?.simulated,
            resend_email_id: resendId,
            packet_version: packetMeta
        };
        const auditRecord = await appendDocAudit(packetId, event);

        if (!emailResult?.success) {
            const msg = String(emailResult?.data?.message || emailResult?.error || 'Email failed');
            return res.status(502).json({
                success: false,
                message: msg,
                sent: [],
                missing,
                resend_email_id: resendId,
                audit_last_hash: auditRecord?.last_hash || null
            });
        }

        res.json({
            success: true,
            message: emailResult?.simulated ? 'Email simulated (no RESEND_API_KEY configured)' : 'Email sent',
            sent: attachments.map(a => ({ filename: a.filename, content_type: a.content_type })),
            missing,
            resend_email_id: resendId,
            audit_last_hash: auditRecord?.last_hash || null
        });
    } catch (error) {
        const status = Number(error.statusCode) || 500;
        console.error("docs-send:", error.message);
        try {
            if (packetId) {
                await appendDocAudit(packetId, {
                    type: 'doc_packet_send',
                    actor: req.auth?.role || 'admin',
                    to,
                    from,
                    include,
                    success: false,
                    error: String(error.message || error)
                });
            }
        } catch (e) {}
        res.status(status).json({ success: false, message: error.message });
    }
});

// 2.19 Fetch doc packet audit trail
app.get('/api/admin/docs/audit/:packetId', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.params?.packetId || '').trim();
    if (!packetId) return res.status(400).json({ success: false, message: 'Missing packetId' });
    try {
        const key = `${KNOWLEDGE_PREFIX.docAudit}${packetId}`;
        const { data: row, error: fetchError } = await supabaseAdmin
            .from('site_content')
            .select('content, updated_at')
            .eq('key', key)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!row) return res.json({ success: true, packet_id: packetId, events: [] });
        const payload = safeJsonParse(row.content, null);
        const events = Array.isArray(payload?.events) ? payload.events : [];
        res.json({ success: true, packet_id: packetId, events, updated_at: row.updated_at });
    } catch (error) {
        console.error("docs-audit:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.20 Refresh delivery status (append-only status updates)
app.post('/api/admin/docs/send-status', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.body?.packetId || '').trim();
    if (!packetId) return res.status(400).json({ success: false, message: 'Missing packetId' });
    try {
        // Read audit events, find recent sends that have resend ids
        const key = `${KNOWLEDGE_PREFIX.docAudit}${packetId}`;
        const { data: row, error: fetchError } = await supabaseAdmin
            .from('site_content')
            .select('content')
            .eq('key', key)
            .maybeSingle();
        if (fetchError) throw fetchError;
        const payload = row ? safeJsonParse(row.content, null) : null;
        const events = Array.isArray(payload?.events) ? payload.events : [];
        const recent = events
            .filter(e => e && e.type === 'doc_packet_send' && e.resend_email_id && !e.simulated)
            .slice(-6);
        const results = [];
        for (const ev of recent) {
            const st = await fetchResendEmailStatus(ev.resend_email_id);
            results.push({ resend_email_id: ev.resend_email_id, status: st.status || null, ok: !!st.success });
            await appendDocAudit(packetId, {
                type: 'doc_packet_delivery_update',
                actor: req.auth?.role || 'admin',
                resend_email_id: ev.resend_email_id,
                status: st.status || null,
                success: !!st.success,
                provider: 'resend',
                provider_response: st.data || null
            });
        }
        res.json({ success: true, packet_id: packetId, updates: results });
    } catch (error) {
        console.error("docs-send-status:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.21 Retry a failed send (append-only)
app.post('/api/admin/docs/send-retry', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    const packetId = String(req.body?.packetId || '').trim();
    const retryOf = String(req.body?.retry_of_event_id || '').trim();
    if (!packetId) return res.status(400).json({ success: false, message: 'Missing packetId' });
    if (!retryOf) return res.status(400).json({ success: false, message: 'Missing retry_of_event_id' });
    try {
        const key = `${KNOWLEDGE_PREFIX.docAudit}${packetId}`;
        const { data: row, error: fetchError } = await supabaseAdmin
            .from('site_content')
            .select('content')
            .eq('key', key)
            .maybeSingle();
        if (fetchError) throw fetchError;
        const payload = row ? safeJsonParse(row.content, null) : null;
        const events = Array.isArray(payload?.events) ? payload.events : [];
        const base = events.find(e => e && e.id === retryOf && e.type === 'doc_packet_send');
        if (!base) return res.status(404).json({ success: false, message: 'Base send event not found' });

        // Re-run send using current packet (but same include/to/from as base)
        req.body = { packetId, to: base.to, from: base.from, include: Array.isArray(base.include) ? base.include : [] };
        // Mark retry attempt as a new send event (caller can infer via retry_of)
        const got = await getDocPacketOrThrow(packetId);
        const packet = got.packet;
        const packetMeta = got.meta || {};
        const docs = packet.docs && typeof packet.docs === 'object' ? packet.docs : {};
        const fields = packet.fields || {};
        const clientName = String(fields.client_name || '').trim() || 'Client';
        const allowedDocs = new Set(['proposal', 'agreement', 'invoice', 'nda', 'media_release']);
        const toSend = (Array.isArray(req.body.include) ? req.body.include : []).filter(d => allowedDocs.has(String(d)));
        const to = safeEmail(base.to);
        const from = resolveDocPacketFrom(base.from);
        const replyTo = BUSINESS_EMAILS.BOOKINGS;
        if (!to || !toSend.length) return res.status(400).json({ success: false, message: 'Retry payload invalid' });

        const attachments = [];
        const missing = [];
        const verification = [];
        for (const docType of toSend) {
            const doc = docs[docType];
            if (!doc) { missing.push(`${docType}:not_generated`); continue; }
            if (!doc.approved) { missing.push(`${docType}:not_approved`); continue; }
            if (docType === 'proposal' || docType === 'agreement') {
                const built = await buildDocxEmailAttachment(doc, docType, packetId, fields);
                if (!built.ok) {
                    missing.push(built.missing);
                    continue;
                }
                verification.push(built.verification);
                attachments.push(built.attachment);
                continue;
            }
            if (docType === 'invoice') {
                const pdfBuf = await renderInvoicePdf(fields, packetId);
                const a = { filename: `invoice-${packetId}.pdf`, content: base64FromBuffer(pdfBuf), content_type: 'application/pdf' };
                const v = verifyAttachmentOrThrow(a);
                verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
                attachments.push(a);
                continue;
            }
            if (!doc.html) { missing.push(`${docType}:html_missing`); continue; }
            const a = { filename: `${docType}-${packetId}.html`, content: base64FromBuffer(Buffer.from(String(doc.html), 'utf8')), content_type: 'text/html' };
            const v = verifyAttachmentOrThrow(a);
            verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
            attachments.push(a);
        }
        if (!attachments.length) return res.status(400).json({ success: false, message: 'No approved documents are ready to send', details: { missing } });

        const subject = `Only True Perspective — Documents for ${clientName}`;
        const list = attachments.map(a => a.filename).join(', ');
        const html = `<div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Arial; line-height:1.6; color:#111;"><p>Attached are your approved documents from Only True Perspective.</p><p style="margin:0 0 10px;"><strong>Included:</strong> ${escapeHtmlForEmail(list)}</p><p>If anything needs adjustment, reply to this email and we’ll handle it.</p><p style="margin-top:18px;"><strong>Only True Perspective</strong><br/>${escapeHtmlForEmail(from)}</p></div>`;
        const text = `Attached are your approved documents from Only True Perspective.\n\nIncluded: ${list}\n\nReply to this email if anything needs adjustment.\n\nOnly True Perspective\n${from}`;
        const emailResult = await sendSecureEmail({ to, from, replyTo, subject, html, text, attachments });
        const resendId = String(emailResult?.data?.id || '').trim() || null;

        const auditRecord = await appendDocAudit(packetId, {
            type: 'doc_packet_send',
            actor: req.auth?.role || 'admin',
            to,
            from,
            reply_to: replyTo,
            include: toSend,
            attachments: attachments.map(a => ({ filename: a.filename, content_type: a.content_type })),
            attachment_verification: verification,
            missing,
            provider: 'resend',
            success: !!emailResult?.success,
            provider_response: emailResult?.data || null,
            simulated: !!emailResult?.simulated,
            resend_email_id: resendId,
            retry_of_event_id: retryOf,
            packet_version: packetMeta
        });

        if (!emailResult?.success) {
            const msg = String(emailResult?.data?.message || emailResult?.error || 'Email failed');
            return res.status(502).json({
                success: false,
                message: msg,
                resend_email_id: resendId,
                audit_last_hash: auditRecord?.last_hash || null,
                missing
            });
        }

        res.json({
            success: true,
            message: emailResult?.simulated ? 'Email simulated (no RESEND_API_KEY configured)' : 'Email sent',
            resend_email_id: resendId,
            audit_last_hash: auditRecord?.last_hash || null,
            missing
        });
    } catch (error) {
        console.error("docs-send-retry:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.12 OTP Oracle — knowledge: retrieve saved recommendations for lead cards
app.post('/api/admin/knowledge/recommendations', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
        const leadIds = Array.isArray(body.leadIds)
            ? body.leadIds.map(v => String(v).trim()).filter(Boolean).slice(0, 200)
            : [];
        if (!leadIds.length) return res.json({ success: true, recommendations: {} });

        const keys = leadIds.map(id => `${KNOWLEDGE_PREFIX.leadRec}${id}`);
        const { data, error } = await supabaseAdmin
            .from('site_content')
            .select('key, content, updated_at')
            .in('key', keys);
        if (error) throw error;

        const recommendations = {};
        (data || []).forEach(row => {
            const payload = safeJsonParse(row.content, null);
            if (!payload || !payload.recommendation) return;
            const leadId = row.key.replace(KNOWLEDGE_PREFIX.leadRec, '');
            recommendations[leadId] = {
                recommendation: payload.recommendation,
                confidence: payload.confidence || 0,
                updated_at: row.updated_at,
                kb_updated_at: payload.kb_updated_at || null
            };
        });

        res.json({ success: true, recommendations });
    } catch (error) {
        console.error("knowledge-recommendations:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Secure Image Generation (DALL-E 3 + Supabase Storage)
// 2.5 Secure AI Chat Completion (Generic)
app.post('/api/ai/chat', verifyToken, async (req, res) => {
    const { provider, messages, systemPrompt, model, modelConfig = {}, keys = {} } = req.body;
    const resolveKey = (providedKey, envKey) => (String(providedKey || '').trim() || String(envKey || '').trim());
    
    try {
        const safeMessages = Array.isArray(messages) ? messages : [];
        const chatSystemPrompt = systemPrompt || "You are a professional assistant.";
        let result;
        if (provider === 'openai') {
            const openaiKey = resolveKey(keys.openai, process.env.OPENAI_API_KEY);
            if (!openaiKey) throw new Error("OpenAI Key not configured on server.");
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${openaiKey}` 
                },
                body: JSON.stringify({
                    model: model || "gpt-4o",
                    messages: [
                        { role: "system", content: chatSystemPrompt },
                        ...safeMessages
                    ],
                    ...modelConfig
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = data.choices[0].message.content;

        } else if (provider === 'gemini') {
            const geminiKey = resolveKey(keys.gemini, process.env.GEMINI_API_KEY);
            if (!geminiKey) throw new Error("Gemini Key not configured on server.");
            
            const modelsToTry = model
                ? [model]
                : ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
            const geminiConfig = {};
            if (modelConfig.temperature !== undefined) geminiConfig.temperature = modelConfig.temperature;
            if (modelConfig.max_tokens !== undefined) geminiConfig.maxOutputTokens = modelConfig.max_tokens;
            if (modelConfig.top_p !== undefined) geminiConfig.topP = modelConfig.top_p;
            if (modelConfig.top_k !== undefined) geminiConfig.topK = modelConfig.top_k;
            let lastErr = 'Unknown Gemini error';
            for (const m of modelsToTry) {
                const payload = {
                    systemInstruction: {
                        parts: [{ text: chatSystemPrompt }]
                    },
                    contents: safeMessages.map(msg => ({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: String(msg.content || '') }]
                    })),
                    generationConfig: geminiConfig
                };
                const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await apiRes.json();
                if (data.error) {
                    lastErr = data.error.message;
                    continue;
                }
                const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (candidate) {
                    result = candidate;
                    break;
                }
                lastErr = 'Unexpected Gemini response format';
            }
            if (!result) throw new Error(normalizeGeminiRuntimeError(lastErr));

        } else if (provider === 'anthropic') {
            const anthropicKey = resolveKey(keys.anthropic, process.env.ANTHROPIC_API_KEY);
            if (!anthropicKey) throw new Error("Anthropic Key not configured on server.");
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20240620',
                    max_tokens: modelConfig.max_tokens || 1200,
                    system: chatSystemPrompt,
                    messages: safeMessages.map(msg => ({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: String(msg.content || '')
                    })),
                    ...modelConfig
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = data?.content?.[0]?.text || '';

        } else if (provider === 'groq') {
            const groqKey = resolveKey(keys.groq, process.env.GROQ_API_KEY);
            if (!groqKey) throw new Error("Groq Key not configured on server.");
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`
                },
                body: JSON.stringify({
                    model: model || 'llama-3.1-70b-versatile',
                    messages: [
                        { role: 'system', content: chatSystemPrompt },
                        ...safeMessages
                    ],
                    ...modelConfig
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = data?.choices?.[0]?.message?.content || '';

        } else {
            throw new Error("Invalid provider requested for chat.");
        }

        res.json({ success: true, data: result });

    } catch (error) {
        console.error("AI Chat Error:", error.stack);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/ai/generate-image', verifyToken, async (req, res) => {
    const { prompt, title, aspect_ratio, cloud_key } = req.body;
    
    try {
        let buffer;

        // Try OpenAI DALL-E 3 First (If Key Provided)
        const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
        const apiKey = openaiKey || cloud_key;
        let usedOpenAI = false;

        if (apiKey && apiKey.length > 10) {
            try {
                const aiRes = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.trim()}` },
                    body: JSON.stringify({
                        model: "dall-e-3",
                        prompt: `High-tech, cinematic, professional photography/render for a brand called 'Only True Perspective'. Subject: ${prompt}. Style: Dark, futuristic, minimal, deep purples and cyans. High resolution, 4k. Title reference: ${title}`,
                        n: 1,
                        size: aspect_ratio === 'landscape' ? "1792x1024" : "1024x1024",
                        quality: "hd"
                    })
                });

                const aiData = await aiRes.json();
                if (aiData.error) throw new Error(aiData.error.message);
                
                const imgRes = await fetch(aiData.data[0].url);
                buffer = Buffer.from(await imgRes.arrayBuffer());
                usedOpenAI = true;
            } catch(e) {
                console.warn("OpenAI Image Sync Failed, triggering Flux fallback:", e.message);
            }
        }

        // 2. Flux Image Proxy Failover (High-Speed Cinematic Engine)
        if (!usedOpenAI) {
            const width = aspect_ratio === 'landscape' ? 1280 : 1024;
            const height = aspect_ratio === 'landscape' ? 720 : 1024;
            
            const models = ['flux', 'flux-pro', 'flux-realism', 'any'];
            const seed = Date.now();
            const enhancedPrompt = `${prompt}. Cinematic lighting, ultra-detailed. Style: Dark futuristic.`;
            const safePrompt = encodeURIComponent(enhancedPrompt);

            let success = false;
            let lastErr = "";

            // --- TIER 1: MULTI-MODEL PROBE ---
            for (const m of models) {
                if (success) break;
                try {
                    const url = `https://pollinations.ai/p/${safePrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${m}`;
                    console.log(`🤖 Visual Probing [${m}]: ${url.substring(0, 80)}...`);
                    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
                    if (res.ok) {
                        buffer = Buffer.from(await res.arrayBuffer());
                        success = true;
                        console.log(`✅ Success via ${m}`);
                    } else {
                        lastErr = `HTTP ${res.status}`;
                    }
                } catch(e) {
                    lastErr = e.message;
                }
            }

            // --- TIER 2: RAW BYPASS (SIMPLEST URL) ---
            if (!success) {
                try {
                    console.log("⚠️ Neural Synthesis Straining. Attempting RAW Bypass...");
                    const bypassUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
                    const res = await fetch(bypassUrl, { signal: AbortSignal.timeout(10000) });
                    if (res.ok) {
                        buffer = Buffer.from(await res.arrayBuffer());
                        success = true;
                    }
                } catch(e) { lastErr = e.message; }
            }

            // --- TIER 3: STATIC DECONSTRUCTION FALLBACK (LAST RESORT) ---
            if (!success) {
                console.warn("🛑 All Visual Engines Exhausted. Using Static Deconstruction Background.");
                // High-End dark tech placeholder from stock-ish source
                const fallbackUrl = "https://images.unsplash.com/photo-1635776062127-d379bfcbb9c8?q=80&w=1792&h=1024&auto=format&fit=crop";
                try {
                    const res = await fetch(fallbackUrl);
                    buffer = Buffer.from(await res.arrayBuffer());
                    success = true;
                } catch(e) {
                    throw new Error(`CRITICAL SYSTEM FAILURE: ${lastErr}`);
                }
            }
        }

        // 3. Upload to Supabase Storage (Permanent)
        const fileName = `generated/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('uploads')
            .upload(fileName, buffer, { contentType: 'image/png' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('uploads')
            .getPublicUrl(fileName);

        res.json({ success: true, url: publicUrl });

    } catch (error) {
        console.error("Image Gen Error:", error.stack);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. CONTACT AGENT (AI Auto-Draft)
app.post('/api/contact/submit', async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { name, email, project_type, project_details, budget, timeline, _gotcha } = body;

    // 0. Honeypot Spam Check
    if (_gotcha) {
        console.warn(`🛑 Spam caught by honeypot: ${email}`);
        return res.status(400).json({
            success: false,
            message: 'We could not submit this request. Please try again.',
            errorCode: 'spam_rejected'
        });
    }

    const nameT = name != null ? String(name).trim().slice(0, 200) : '';
    const emailT = email != null ? String(email).trim().slice(0, 254) : '';
    const projectTypeT = project_type != null ? String(project_type).trim().slice(0, 200) : '';
    const projectDetailsT = project_details != null ? String(project_details).trim().slice(0, 12000) : '';
    const budgetT = budget != null ? String(budget).trim().slice(0, 200) : '';
    const timelineT = timeline != null ? String(timeline).trim().slice(0, 200) : '';

    // 1. Basic Validation
    if (!nameT || !emailT) {
        return res.status(400).json({ success: false, message: "Name and Email are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailT)) {
        return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }

    try {
        const adminClient = supabaseAdmin; 
        if (!adminClient) {
            return res.status(503).json({
                success: false,
                message: 'Contact workflow is temporarily unavailable.',
                errorCode: 'contact_unavailable'
            });
        }

        // 2. Save Contact to DB
        const { data: contactData, error: dbError } = await adminClient
            .from('contacts')
            .insert([{ 
                name: nameT, 
                email: emailT, 
                service: projectTypeT, // Map to DB column
                message: projectDetailsT, // Map to DB column
                budget: budgetT, 
                timeline: timelineT, 
                ai_status: 'processing' 
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        // RESPOND QUICKLY TO PREVENT CLIENT-SIDE HANG
        res.json({ success: true, message: "Contact workflow initiated successfully." });

        // BACKGROUND PROCESSING FOR HEAVY TASKS
        Promise.resolve().then(async () => {
        // 3. INTERNAL NOTIFICATION (Forward to contact@)
        await sendSecureEmail({
            to: BUSINESS_EMAILS.CONTACT,
            subject: `[NEW LEAD] ${nameT.replace(/[\r\n]/g, ' ').slice(0, 120)} // OTP`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff;">
                    <h2 style="color: #00ffaa; border-bottom: 1px solid #333; padding-bottom: 10px;">TACTICAL LEAD ACQUISITION</h2>
                    <p><strong>NAME:</strong> ${escapeHtmlForEmail(nameT)}</p>
                    <p><strong>EMAIL:</strong> ${escapeHtmlForEmail(emailT)}</p>
                    <p><strong>PROJECT TYPE:</strong> ${escapeHtmlForEmail(projectTypeT || 'N/A')}</p>
                    <p><strong>BUDGET:</strong> ${escapeHtmlForEmail(budgetT || 'N/A')}</p>
                    <p><strong>TIMELINE:</strong> ${escapeHtmlForEmail(timelineT || 'N/A')}</p>
                    <p><strong>DETAILS:</strong><br>${escapeHtmlForEmail(projectDetailsT || '')}</p>
                    <div style="margin-top: 20px; font-size: 0.8rem; color: #666;">
                        Generated via OTP Portal System // ID: ${contactData.id}
                    </div>
                </div>
            `,
            text: `NEW LEAD: ${nameT}\nEmail: ${emailT}\nProject Type: ${projectTypeT}\nBudget: ${budgetT}\nTimeline: ${timelineT}\n\nMessage:\n${projectDetailsT}`,
            from: BUSINESS_EMAILS.CONTACT
        });

        // 4. AUTO-RESPONSE (Send to Lead)
        await sendSecureEmail({
            to: emailT,
            subject: 'We got your request — OnlyTruePerspective',
            text: `Hey — appreciate you reaching out to OnlyTruePerspective.\n\nWe just received your request and we’re reviewing it now.\n\nIf you want to speed things up, reply with your timeline, budget range, and any references or examples.\n\nWe’ll get back to you shortly.\n\n– ELI\nOnlyTruePerspective`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
                    <p>Hey — appreciate you reaching out to OnlyTruePerspective.</p>
                    <p>We just received your request and we’re reviewing it now.</p>
                    <p>If you want to speed things up, reply with your timeline, budget range, and any references or examples.</p>
                    <p>We’ll get back to you shortly.</p>
                    <br>
                    <p><strong>– ELI</strong><br>OnlyTruePerspective</p>
                </div>
            `,
            from: BUSINESS_EMAILS.CONTACT
        });

        // 5. TRIGGER AI AGENT (Content Analysis & Draft Generation)
        const systemPrompt = `You are the Studio Manager for 'Only True Perspective' (OTP), a high-end creative agency.
        Draft a high-status, professional reply email for ${nameT}.
        Sign off with "OTP // Visual Division".`;

        const userPrompt = `Lead: ${nameT}\nService: ${projectTypeT}\nBudget: ${budgetT}\nDetails: ${projectDetailsT}`;
        
        let draftReply = "";
        try {
            if (process.env.GEMINI_API_KEY) {
                const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
                let data = null;
                const endpoints = ['v1', 'v1beta'];
                for (const v of endpoints) {
                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/${v}/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }]
                            })
                        });
                        data = await response.json();
                        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                            draftReply = data.candidates[0].content.parts[0].text;
                            break;
                        } else if (data.error) {
                            console.warn(`⚠️ Lead Draft Prompt [${v}] Error:`, data.error.message);
                        }
                    } catch (fetchErr) {
                        console.warn(`⚠️ Lead Draft Prompt [${v}] Fetch Error:`, fetchErr.message);
                    }
                }
            } 
        } catch (aiError) {
            console.warn("⚠️ AI Drafting fallback triggered:", aiError.message);
        }
        
        // Update DB with Draft
        if (draftReply) {
            await adminClient
                .from('contacts')
                .update({ 
                    draft_reply: draftReply,
                    ai_status: 'drafted',
                    ai_analysis: { processed_at: new Date().toISOString() }
                })
                .eq('id', contactData.id);
        }

        }).catch(bgErr => console.error("Background Contact Processing Error:", bgErr));

    } catch (error) {
        console.error("Agent Error:", error);
        res.status(500).json({ success: false, message: "Server error processing contact." });
    }
});

// 6. PERSPECTIVE AUDIT ENGINE (AI Strategy Generator)
app.post('/api/audit/submit', async (req, res) => {
    const { email, answers } = req.body;
    
    if (!email || !answers) {
        return res.status(400).json({ success: false, message: "Email and answers are required." });
    }

    try {
        const adminClient = supabaseAdmin;
        
        // 1. Construct the Strategic Prompt (Aligned with OTP Oracle style)
        // Sanitization with safe limits
        const sanitize = (s, len) => (typeof s === 'string' ? s.replace(/[<>"{}$[\]\\]/g, '') : '').substring(0, len);
        
        const goal = sanitize(answers.q1, 50) || 'Unknown';
        const hurdle = sanitize(answers.q2, 50) || 'Unknown';
        const platform = sanitize(answers.q3, 50) || 'Unknown';
        const vibe = sanitize(answers.q4, 50) || 'Unknown';
        const specificGoal = sanitize(answers.q5_goal, 200) || 'Not specified';

        const systemPrompt = `You are the 'OTP Oracle', a high-dimensional strategy entity. 
        Your task is to provide a "Perspective Audit" that feels uniquely calculated for the user.
        
        STYLE GUIDELINES (STRICT):
        1. **Hyper-Detail**: Provide real-life, actionable tips. Don't be vague. Give them the actual move.
        2. **Radical Specificity**: You MUST weave the user's specific goal ("${specificGoal}") and platform ("${platform}") into every single point.
        3. **High-Status / Tactical Tone**: Professional, visionary, slightly mystical, but grounded in technical and street reality.
        4. **NO CORNINESS**: Absolutely FORBIDDEN phrases: "In today's fast-paced world", "Unlock your potential", "Elevate your brand", "Harness the power", "The road to success", "Game-changer".
        5. **Maximum Value**: Under 250 words. Focus on raw insight over filler. Just the Truth. No introductions or 'Hope this helps'. Start directly with the situation.`;

        const userPrompt = `ANALYZE THIS SIGNAL:
        - CORE OBJECTIVE: ${goal}
        - THE BARRIER: ${hurdle}
        - REALM: ${platform}
        - TARGET AESTHETIC: ${vibe}
        - THE SPECIFIC MISSION: "${specificGoal}"
         
        OUTPUT STRUCTURE (Strictly enforce):
        
        **YOUR SITUATION.**
        (Briefly explain why "${hurdle}" is the main blocker for "${specificGoal}". Be direct.)
        
        **THE MOVE.**
        1. **The Tactical Pivot**: (One specific action for ${platform} to hit "${specificGoal}".)
        2. **Visual Rebranding**: (How to achieve the "${vibe}" look right now.)
        3. **The Habit**: (A simple daily rule to ensure success.)
        
        **THE CORE.**
        (Give 2 specific insider tips for "${platform}" that directly help achieve "${specificGoal}". No filler.)

        **THE TAKE.**
        (A short, powerful closing thought for the creator.)`;

        let advice = "";

        // 2. Call Gemini (With Robust Logic)
        if (process.env.GEMINI_API_KEY) {
            const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
            let success = false;
            
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            for (let i = 0; i < modelsToTry.length; i++) {
                const modelName = modelsToTry[i];
                if (success) break;
                try {
                    console.log(`[ORACLE] Transmitting signal to AI Realm via ${modelName}...`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // Extended to 15s to allow deep strategy synthesis

                    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
                    const startTime = Date.now();
                    
                    const fetchPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            systemInstruction: {
                                parts: [{ text: systemPrompt }]
                            },
                            contents: [{ 
                                role: 'user',
                                parts: [{ text: userPrompt }] 
                            }],
                            generationConfig: {
                                temperature: 0.85,
                                maxOutputTokens: 1500,
                                topP: 0.9,
                                topK: 40
                            },
                            safetySettings: [
                                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
                            ]
                        }),
                        signal: controller.signal
                    });

                    const response = await fetchPromise.finally(() => clearTimeout(timeoutId));
                    const duration = Date.now() - startTime;

                    if (response.status === 429) {
                        console.warn(`[ORACLE-WARN] Realm Congestion (HTTP 429) on ${modelName} after ${duration}ms.`);
                        if (i < modelsToTry.length - 1) await delay(1000 * Math.pow(2, i + 1));
                        continue;
                    }

                    if (!response.ok) {
                        const errData = await response.text();
                        console.error(`[ORACLE-ERROR] HTTP ${response.status} on ${modelName}. Body: ${errData}`);
                        throw new Error(`API Error: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                        advice = data.candidates[0].content.parts[0].text;
                        success = true;
                        console.log(`[ORACLE-SUCCESS] Transmission Captured via ${modelName} in ${duration}ms. Tokens: ${data.usageMetadata?.totalTokenCount || 'N/A'}`);
                    } else if (data.error) {
                        console.error(`[ORACLE-ERROR] Gemini Error Response (${modelName}):`, data.error.message);
                    } else if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
                        console.warn(`[ORACLE-WARN] SAFETY BLOCK triggered on ${modelName}`);
                    } else {
                        console.warn(`[ORACLE-WARN] Unexpected response format from ${modelName}:`, JSON.stringify(data).substring(0, 200));
                    }
                } catch (fetchError) {
                    const isTimeout = fetchError.name === 'AbortError';
                    console.error(`[ORACLE-FAILED] Portal Error (${modelName}):`, isTimeout ? 'TIMEOUT (15s)' : fetchError.message);
                    if (!isTimeout) await delay(1500); // Backoff before retry
                }
            }

            if (!success) {
                advice = `**THE DIAGNOSIS.**
The Oracle's connection to the realm is unstable. Your specific quest for "${specificGoal}" is noted, but the frequency is jammed.

**THE PLAN.**
1. **Immediate Shift**: Pivot away from "${hurdle}" immediately. No delays.
2. **Visual Pivot**: Lean into the "${vibe}" energy by stripping away all noise.
3. **The Habit**: Execute your move on "${platform}" before the sun sets.

**THE FORTUNE.**
"When the signal is weak, the intent must be absolute."`;
            }
        } else {
            advice = "**THE DIAGNOSIS.**\nOracle Silenced. (Check GEMINI_API_KEY on server)\n\n**THE FORTUNE.**\nAction without vision is a nightmare.";
        }

        // 3. Save Lead to DB (Using Admin Client for bypass)
        if (adminClient) {
            try {
                await adminClient
                    .from('leads')
                    .insert([{ 
                        email, 
                        answers, 
                        advice,
                        status: 'pending',
                        type: 'perspective_audit'
                    }]);
                console.log("✅ Lead saved to database.");
            } catch (dbEx) {
                console.error("DB Exception saving lead:", dbEx);
            }
        }
        
        res.json({ success: true, advice });

    } catch (error) {
        console.error("Audit Engine Critical Error:", error);
        // FAIL-SAFE: Never show the user a 500 error. Fallback to the hardcoded advice.
        const fallbackAdvice = `**THE DIAGNOSIS.**
The neural link encountered static, but your signal was received. The path to "${req.body.answers?.q5_goal || 'Excellence'}" requires immediate action.

**THE PLAN.**
1. **The Reset**: Clear your current strategy board. Start fresh today.
2. **The Visuals**: Simplify. If it doesn't serve the goal, delete it.
3. **The Protocol**: One high-value action every morning before consumption.

**THE FORTUNE.**
"Obstacles are just instructions in disguise."`;

        res.json({ success: true, advice: fallbackAdvice });
    }
});

// --- ADMIN POWER TOOLS (Service Role Bypass) ---
app.post('/api/admin/purge-leads', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Server Audit Config Missing (SUPABASE_SERVICE_KEY)' });

    try {
        // 1. Authentication handled by verifyToken middleware
        console.log(`🗑️ PURGE LEADS initiated by Admin`);
        
        // Use the absolute "Delete Everything" filter for UUIDs
        const { error } = await supabaseAdmin.from('leads').delete().not('id', 'is', null);

        if (error) throw error;
        
        res.json({ success: true, message: 'System Purge Complete' });

    } catch (e) {
        console.error("Purge Error:", e);
        res.status(500).json({ error: 'Purge operation failed' });
    }
});

// --- PURGE ALL INBOX CONTACTS ---
app.post('/api/admin/purge-contacts', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ success: false, message: 'Server Config Missing (SUPABASE_SERVICE_KEY)' });

    try {
        console.log(`🗑️ PURGE CONTACTS/INBOX initiated by Admin`);
        const { error } = await supabaseAdmin.from('contacts').delete().not('id', 'is', null);
        if (error) throw error;
        res.json({ success: true, message: 'Inbox purged successfully' });
    } catch (e) {
        console.error("Inbox Purge Error:", e);
        res.status(500).json({ success: false, message: 'Inbox purge failed' });
    }
});

// --- NEW SECURE PROXIES (Relay Client Actions to Service Role) ---

// 6.1 Secure Analytics Tracking
app.post('/api/analytics/view', async (req, res) => {
    const slug = sanitizeSlugInput(req.body?.slug);
    if (!slug) {
        return res.status(400).json({ success: false, message: "Invalid or missing slug" });
    }

    // Prevent direct spamming by checking simple rate limit (already applied globally, but logic here helps too)
    // We strictly use the Service Key here to bypass "Anonymous" RLS restrictions on UPDATES.
    if (!supabaseAdmin) return res.status(500).json({ success: false, message: "Server Analytics Config Missing" });

    try {
        // increment_view_count() is void and returns no error when zero rows match — do not treat RPC success as "handled".
        let handled = false;

        const { data: postRow } = await supabaseAdmin.from('posts').select('id, views').eq('slug', slug).maybeSingle();
        if (postRow) {
            const { error: rpcError } = await supabaseAdmin.rpc('increment_view_count', { post_slug: slug });
            if (!rpcError) {
                handled = true;
            } else {
                await supabaseAdmin.from('posts').update({ views: (postRow.views || 0) + 1 }).eq('id', postRow.id);
                handled = true;
            }
        } else {
            const { data: bData } = await supabaseAdmin.from('broadcasts').select('views, id').eq('slug', slug).maybeSingle();
            if (bData) {
                await supabaseAdmin.from('broadcasts').update({ views: (parseInt(bData.views) || 0) + 1 }).eq('id', bData.id);
                handled = true;
            }
        }

        if (handled) res.json({ success: true });
        else res.json({ success: false, message: "Slug not found in valid tables" });

    } catch (e) {
        console.error("Analytics Error:", e);
        res.status(500).json({ success: false, message: 'Analytics update failed' });
    }
});

// 6.2 Secure Live Editor Update
app.post('/api/content/update', verifyToken, async (req, res) => {
    const { updates } = req.body; // Array of { key, content }
    
    if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    if (!supabaseAdmin) return res.status(500).json({ success: false, message: "Server DB Config Missing" });

    try {
        console.log(`📝 Secure Content Update: ${updates.length} items from ${req.auth?.role || 'admin'}`);

        const keyPattern = /^[a-zA-Z][\w.-]{0,119}$/;
        const rows = updates.map((u) => {
            const key = typeof u.key === 'string' ? u.key.trim() : '';
            if (!keyPattern.test(key)) {
                throw new Error(`Invalid content key: ${JSON.stringify(u.key)}`);
            }
            const raw = typeof u.content === 'string' ? u.content : '';
            return {
                key,
                content: sanitizeHtml(raw),
                updated_by: 'admin-proxy',
                updated_at: new Date().toISOString()
            };
        });

        const { error } = await supabaseAdmin.from('site_content').upsert(rows);

        if (error) throw error;
        
        res.json({ success: true, message: "Content Updated Securely" });

    } catch (e) {
        console.error("Content Update Error:", e);
        const msg = e.message || String(e);
        if (msg.includes('Invalid content key')) {
            return res.status(400).json({ success: false, message: msg });
        }
        res.status(500).json({ error: msg });
    }
});

// 7. STRIPE CHECKOUT SESSION (ADDED FOR PAYMENTS)
app.route('/api/create-checkout-session')
    .post(async (req, res) => {
    const { packageName, customerEmail } = req.body;
    
    // Check if Stripe is actually ready (Key might be invalid or missing)
    if (!stripe) {
        return res.status(500).json({ error: "PAYMENT SYSTEM OFFLINE (Stripe Config Error)" });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.get('host');
    const origin = req.headers.origin || `${protocol}://${host}`;


    // Pricing Map (In cents) - Customize these values
    // Using lowercase keys for robust matching
    // Pricing Map (In cents) — must match public "from $X" copy on index.html (#packages + contact form)
    const prices = {
        'the signal': 25000,         // $250.00
        'the engine': 50000,         // $500.00
        'the system': 90000,         // $900.00
        // Legacy Support
        'the perspective': 40000,
        'the alliance': 150000,
        'the drop': 10000,
        'the vision': 40000,
        'the campaign': 150000
    };

    // Normalize input to lowercase to avoid case-mismatch fallbacks
    const normalizedName = packageName ? packageName.toLowerCase().trim() : '';
    const amount = prices[normalizedName];

    if (!amount) {
        console.error(`❌ Checkout Failed: Package [${packageName}] not found in map.`);
        return res.status(400).json({ error: `Package '${packageName}' is currently set to Inquiry Only.` });
    }

    try {
        const sessionConfig = {
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `OTP // ${(packageName || 'CREATIVE SERVICE').toUpperCase()}`,
                        // Dynamic Description based on package
                        description: normalizedName === 'the signal' ? '1x Tactical Asset (Viral/Ad) + Advanced VFX - 24/48H Delivery' :
                                     normalizedName === 'the engine' ? 'Full Production Infrastructure + 4x Cinematic Assets + Complete Brand Motion Suite' :
                                     normalizedName === 'the system' ? 'Retainer Creative Direction + 10x Technical Assets + Digital HQ Architecture' :
                                     normalizedName === 'the drop' ? '1 High-End Vertical Edit (Algorithm Friendly)' :
                                     normalizedName === 'the vision' ? 'Editorial/Studio Shoot (4h) - 15 High-End Retouched Images' :
                                     normalizedName === 'the campaign' ? 'Comprehensive Production Package (Shoot + Full High-End Edit Bundle)' :
                                     normalizedName === 'the visualizer' ? 'Perfect Loop + Lyric Integration for Audio' :
                                     normalizedName === 'the identity' ? 'Professional Brand Identity System (Logo + Marks)' :
                                     normalizedName === 'the stack' ? '5-10 Short-Form Edits / Batch Alignment' :
                                     normalizedName === 'the rollout' ? 'Album/EP Launch Kit (Cover + Teasers)' :
                                     normalizedName === 'the official video' ? 'Full Video Production + VFX + Color' :
                                     normalizedName === 'the digital hq' ? 'Modern, High-Speed Performance Website' :
                                     normalizedName === 'the rebrand' ? 'Full Logo System + Professional Website Overhaul' :
                                     normalizedName === 'the partner' ? 'Monthly Creative Retainer - Priority Activation' :
                                     'OTP Priority Activation & Booking',
                        metadata: {
                            package: packageName,
                            realm: 'visual_division',
                            server_version: 'v10.5.1'
                        }
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${origin}/payment_success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/index.html#packages`,
        };

        // Pre-fill email if provided from contact form
        if (customerEmail) {
            sessionConfig.customer_email = customerEmail;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        res.json({ id: session.id });
    } catch (e) {
        console.error("Stripe Error:", e.message);
        res.status(500).json({ error: 'Checkout could not be started. Try again or use inquiry flow.' });
    }
})

// --- VERSION CONTROL LOGIC ---
app.get('/api/admin/versions', verifyToken, async (req, res) => {
    if (process.env.VERCEL) {
        try {
            if (!supabaseAdmin) {
                return res.json({
                    success: true,
                    versions: [{
                        hash: 'VERCEL_PROD',
                        message: 'Managed deployment mode active. Use Vercel dashboard for instant rollback.',
                        date: new Date().toISOString(),
                        managed: true,
                        rollback_mode: 'vercel'
                    }]
                });
            }

            const nowIso = new Date().toISOString();
            const deployHash = String(process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'VERCEL_PROD');
            const deployMessage = String(process.env.VERCEL_GIT_COMMIT_MESSAGE || 'Production deployment captured');
            const deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
            const deployId = String(process.env.VERCEL_DEPLOYMENT_ID || deployHash).replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 120) || 'live';
            const snapshotKey = `${VERSION_PREFIX}${deployId}`;

            const snapshotPayload = {
                schema: 'otp-version-v1',
                hash: deployHash,
                message: deployMessage,
                date: nowIso,
                deployment_url: deploymentUrl,
                managed: true,
                rollback_mode: 'vercel'
            };

            const { error: upsertError } = await supabaseAdmin
                .from('site_content')
                .upsert([{ key: snapshotKey, content: JSON.stringify(snapshotPayload), updated_at: nowIso }], { onConflict: 'key' });
            if (upsertError) throw upsertError;

            const { data, error } = await supabaseAdmin
                .from('site_content')
                .select('key, content, updated_at')
                .ilike('key', `${VERSION_PREFIX}%`)
                .order('updated_at', { ascending: false })
                .limit(MAX_VERSION_EVENTS + 20);
            if (error) throw error;

            const parsed = (data || [])
                .map(row => {
                    const payload = safeJsonParse(row.content, {}) || {};
                    return {
                        key: row.key,
                        hash: payload.hash || row.key.replace(VERSION_PREFIX, ''),
                        message: payload.message || 'Deployment snapshot',
                        date: payload.date || row.updated_at || nowIso,
                        deployment_url: payload.deployment_url || '',
                        managed: true,
                        rollback_mode: 'vercel'
                    };
                })
                .filter(v => v.hash && v.message)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const unique = [];
            const seen = new Set();
            for (const v of parsed) {
                const sig = `${v.hash}|${v.message}`;
                if (seen.has(sig)) continue;
                seen.add(sig);
                unique.push(v);
            }

            const limited = unique.slice(0, MAX_VERSION_EVENTS);
            const staleKeys = unique.slice(MAX_VERSION_EVENTS).map(v => v.key).filter(Boolean);
            if (staleKeys.length) {
                await supabaseAdmin.from('site_content').delete().in('key', staleKeys).throwOnError().catch(() => {});
            }

            return res.json({ success: true, versions: limited });
        } catch (e) {
            console.error("[SYSTEM] Managed version fetch error:", e.message);
            return res.status(500).json({ success: false, message: "VERSION_MANAGER_OFFLINE" });
        }
    }

    const { exec } = require('child_process');
    exec('git log -n 12 --pretty=format:"%H|%s|%ad"', { cwd: __dirname }, (error, stdout) => {
        if (error) {
            console.error("[SYSTEM] Version Fetch Error:", error.message);
            return res.status(500).json({ success: false, message: "GIT_LOG_FAILURE: Verify repo is initialized." });
        }
        const versions = stdout.split('\n').filter(Boolean).map(line => {
            const [hash, message, date] = line.split('|');
            return { hash, message, date, managed: false, rollback_mode: 'git' };
        });
        res.json({ success: true, versions });
    });
});

app.post('/api/admin/rollback', verifyToken, (req, res) => {
    const { version } = req.body;
    if (!version) return res.status(400).json({ success: false, message: "Version hash required" });
    
    if (process.env.VERCEL) {
        return res.status(403).json({
            success: false,
            message: "Managed mode active: use Vercel deployment rollback controls.",
            rollback_url: "https://vercel.com/only-true-perspective/otp-site/deployments"
        });
    }

    console.log(`[SYSTEM] Authorized Rollback Initiated for commit: ${version}`);
    const { exec } = require('child_process');
    
    // Hard reset + clean: Ensures filesystem maps exactly to the requested hash
    const cmd = `git stash --include-untracked && git reset --hard ${version} && git clean -fd`;
    
    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error("[SYSTEM] Rollback Error:", error.message);
            return res.status(500).json({ success: false, message: `Git Error: ${error.message}` });
        }

        console.log(`[SYSTEM] Successful rollback to ${version.substring(0, 7)}. Rebooting...`);
        res.json({ success: true, message: `System state synchronized to ${version.substring(0, 7)}. Rebooting in 3s.` });
        
        // Signal process manager to restart
        setTimeout(() => process.exit(0), 3000);
    });
});


// --- GLOBAL ERROR HANDLER ---
// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    const errorLog = `[${new Date().toISOString()}] ERROR: ${err.message}\nStack: ${err.stack}\n`;
    // Console only for Vercel
    console.error(errorLog);
    res.status(500).json({ success: false, message: "Internal Server Error", errorCode: "internal_server_error" });
});

// --- START SERVER ---
// --- START SERVER ---
// Only listen if running locally (not imported as a module)
if (require.main === module) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`\n🚀 OTP SECURE SERVER V1.4.1 ONLINE`);
        console.log(`🔒 Security Headers: ENABLED`);
        console.log(`📦 Compression: ENABLED`);
        console.log(`🔑 Auth System: JWT ENABLED`);
        console.log(`📡 Dev listen: http://127.0.0.1:${port} (not production)\n`);
    });

    server.on('error', (e) => {
        console.error("SERVER STARTUP ERROR:", e);
    });
}
// --- FALLBACK ROUTE ---
// Serve 404 for any unknown API routes specifically
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: "API Endpoint Not Found" });
});

// Serve 404.html for any unknown frontend routes
app.use((req, res) => {
    noStoreHtml(res);
    res.status(404).sendFile(path.join(staticPath, '404.html'));
});

// Export for Vercel Serverless Function

module.exports = app;
