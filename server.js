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
const port = process.env.PORT || 3000;
let OTP_PRICING = null;
try {
    OTP_PRICING = require('./pricing-config.js');
} catch (e) {
    OTP_PRICING = null;
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
    const mission = missionRaw || 'N/A';
    const pkgR = String(f.package_reason || '').trim();
    const docR = String(f.documents_reason || '').trim();
    const tac = String(f.tactical_advice || '').trim();
    const tacProbe = tac.slice(0, Math.min(96, tac.length)).toLowerCase();
    const showTac = Boolean(tac && tacProbe && !mission.toLowerCase().includes(tacProbe));
    const htmlPkg = pkgR ? `\n  <h2>Recommended package rationale</h2>\n  <p>${escapeHtml(pkgR)}</p>` : '';
    const htmlDocR = docR ? `\n  <h2>Why these documents</h2>\n  <p>${escapeHtml(docR)}</p>` : '';
    const htmlTac = showTac ? `\n  <h2>OTP tactical summary</h2>\n  <p class="scope">${escapeHtml(tac)}</p>` : '';

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — ${escapeHtml(f.client_name || '')}</title>
  <meta name="color-scheme" content="light dark" />
  <style>
    :root {
      color-scheme: light dark;
      --doc-bg: #ffffff;
      --doc-text: #111111;
      --doc-muted: #555555;
      --doc-muted2: #444444;
      --doc-surface: #f4f4f6;
      --doc-border: #d8d8dc;
      --doc-line: #111111;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --doc-bg: #0c0c10;
        --doc-text: #ececf1;
        --doc-muted: #9b9ba8;
        --doc-muted2: #b4b4c0;
        --doc-surface: #16161e;
        --doc-border: #2e2e3a;
        --doc-line: #c8c8d4;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Arial;
      margin: clamp(16px, 4vw, 40px);
      max-width: 900px;
      background: var(--doc-bg);
      color: var(--doc-text);
    }
    .meta { color: var(--doc-muted); font-size: 12px; margin-bottom: 18px; line-height: 1.5; }
    h1 { font-size: clamp(1.1rem, 4vw, 22px); margin: 0 0 8px; color: var(--doc-text); font-weight: 700; }
    h2 { font-size: 16px; margin: 22px 0 8px; color: var(--doc-text); font-weight: 600; }
    p, li { font-size: 13px; line-height: 1.6; color: var(--doc-text); }
    .scope { white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
    .box {
      border: 1px solid var(--doc-border);
      border-radius: 10px;
      padding: 14px 16px;
      background: var(--doc-surface);
      color: var(--doc-text);
    }
    .box strong { color: var(--doc-text); }
    .row { display: flex; gap: 16px; flex-wrap: wrap; }
    .col { flex: 1; min-width: min(220px, 100%); }
    .sign { margin-top: 28px; }
    .sign .line { margin-top: 40px; border-top: 1px solid var(--doc-line); width: min(260px, 70vw); }
    .small { font-size: 12px; color: var(--doc-muted2); }
    ul { padding-left: 1.25rem; }
    @media (max-width: 520px) {
      body { margin: 14px; }
      .box .row { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="meta">${escapeHtml(f.sender_company || '')} • ${escapeHtml(f.sender_email || '')}<br/>Generated: ${escapeHtml(f.generated_at || '')}</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="box">
    <div class="row">
      <div class="col"><div class="small">Client</div><div><strong>${escapeHtml(f.client_name || '')}</strong></div><div class="small">${escapeHtml(f.client_email || '')}</div></div>
      <div class="col"><div class="small">Recommended package</div><div><strong>${escapeHtml(f.recommended_package || '')}</strong></div><div class="small">${escapeHtml(f.quote_range || '')}</div></div>
    </div>
    ${f.service_type ? `<div style="margin-top:10px;" class="small">Service type: <strong>${escapeHtml(String(f.service_type))}</strong></div>` : ''}
  </div>

  <h2>Client &amp; mission details</h2>
  <p class="scope">${escapeHtml(mission)}</p>${htmlPkg}${htmlDocR}${htmlTac}

  <h2>Required documents</h2>
  <p>${escapeHtml(docsLine)}</p>

  ${docType === 'invoice' ? `
    <h2>Invoice details</h2>
    <ul>
      <li>Currency: ${escapeHtml(f.invoice_currency || 'USD')}</li>
      <li>Estimated total (based on range floor): ${f.invoice_total_cents ? ('$' + (f.invoice_total_cents/100).toFixed(0)) : 'Scope-based'}</li>
      <li>Deposit due (50%): ${f.deposit_due_cents ? ('$' + (f.deposit_due_cents/100).toFixed(0)) : 'Scope-based'}</li>
    </ul>
  ` : ''}

  <h2>Terms (placeholder)</h2>
  <p>This is an OTP-generated draft for admin review. Final terms must be approved before export/send.</p>

  <div class="sign">
    <div class="small">Approved by</div>
    <div class="line"></div>
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

function renderDocxFromTemplate(templateBuffer, fields) {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' }
    });
    doc.setData(normalizeDocxData(fields));
    doc.render();
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
        .replace(/^#{2,6}\s+/gm, '')      // headings
        .replace(/\*\*(.*?)\*\*/g, '$1')  // bold
        .replace(/`([^`]+)`/g, '$1')      // inline code
        .replace(/^\-\s+/gm, '• ')        // bullets
        .trim();
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

    const headerH = 86;
    page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
    page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: ink });
    page.drawRectangle({ x: 0, y: height - headerH, width, height: 3, color: accent });

    // Title block
    page.drawText('ONLY TRUE PERSPECTIVE', { x: margin, y: height - headerH + 46, size: 12, font: fontBold, color: rgb(0.92, 0.94, 0.98) });
    page.drawText('Tactical Visual Intelligence', { x: margin, y: height - headerH + 30, size: 9, font, color: rgb(0.75, 0.78, 0.84) });
    page.drawText(String(title || 'DOCUMENT').toUpperCase(), { x: margin, y: height - headerH + 16, size: 9, font: fontBold, color: rgb(0.78, 0.82, 0.88) });

    let y = height - headerH - 24;
    if (subtitle) {
        const subLines = wrapPdfTextToLines(String(subtitle), font, 9, contentW).slice(0, 3);
        for (const ln of subLines) {
            page.drawText(ln, { x: margin, y, size: 9, font, color: muted });
            y -= 12;
        }
        y -= 6;
    }

    const body = String(bodyText || '').trim();
    const lines = wrapPdfTextToLines(body || '—', font, 9.5, contentW);
    for (const ln of lines) {
        if (y < 72) {
            const p2 = pdfDoc.addPage([612, 792]);
            p2.drawRectangle({ x: 0, y: 0, width, height, color: paper });
            page = p2;
            y = height - 72;
        }
        page.drawText(ln, { x: margin, y, size: 9.5, font, color: rgb(0.14, 0.16, 0.2) });
        y -= 12;
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
    const paragraphs = lines.map((l) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(l || '')}</w:t></w:r></w:p>`).join('');

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

    // Try to embed the official OTP eye emblem (eye-only crop) from public assets; fallback to text mark if unavailable.
    let logoImage = null;
    try {
        const fs = require('fs');
        const path = require('path');
        const logoPath = path.join(__dirname, 'assets', 'otp-eye-emblem-eye.jpg');
        const buf = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedJpg(buf);
    } catch (e) {
        logoImage = null;
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
    structured: 'kb_structured::'
};
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

function safeJsonParse(raw, fallback = null) {
    if (raw == null) return fallback;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
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

async function extractTextFromKnowledgeFile(file) {
    if (!file || !file.buffer) throw new Error('Missing file buffer.');
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.pdf') {
        let pdfParseLib = null;
        try {
            pdfParseLib = require('pdf-parse');
        } catch (e) {
            throw new Error('PDF parser failed to load on server. Use DOCX or contact admin.');
        }

        const pdfParseCallable = typeof pdfParseLib === 'function'
            ? pdfParseLib
            : (pdfParseLib && typeof pdfParseLib.default === 'function' ? pdfParseLib.default : null);

        // pdf-parse v2 exposes PDFParse class; v1 exposed a callable function.
        if (typeof pdfParseCallable === 'function') {
            const parsed = await pdfParseCallable(file.buffer);
            return normalizeWhitespace(parsed.text);
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
            return normalizeWhitespace(result && result.text);
        } finally {
            if (typeof parser.destroy === 'function') {
                await parser.destroy().catch(() => {});
            }
        }
    }
    if (ext === '.docx') {
        const parsed = await mammoth.extractRawText({ buffer: file.buffer });
        return normalizeWhitespace(parsed.value);
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
    const budgetHigh = /(1,?200\+|1200|2,?000|3000|premium|high budget)/.test(text) || (maxBudget !== null && maxBudget >= 1200);
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
            const wa = svcPriceDisplayByLabel('Custom Website Architecture');
            return {
                recommended_package: 'Custom Website Architecture',
                quote_range: wa ? wa : 'Starting at $3,500+',
                package_confidence: 0.83,
                package_reason: 'Website brief suggests custom architecture and implementation depth.'
            };
        }
        if (mentionsSimple || budgetLow || /(one page|single page|landing page only)/.test(text)) {
            const swp = svcPriceDisplayByLabel('Starter Web Presence');
            return {
                recommended_package: 'Starter Web Presence',
                quote_range: swp ? swp : '$750',
                package_confidence: 0.78,
                package_reason: 'Lean website scope detected; starter web presence is the cleanest fit.'
            };
        }
        const bwp = svcPriceDisplayByLabel('Business Website Pro');
        return {
            recommended_package: 'Business Website Pro',
            quote_range: bwp ? bwp : '$1,500',
            package_confidence: 0.73,
            package_reason: 'Website request maps to a business-grade build with stronger structure and polish.'
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
    const mentionsIdentifiableMediaWork = /(film|filming|photo|photography|video|on camera|likeness|voice|performance|actor|talent|face)/.test(text);
    const explicitlyNoIdentifiableMedia = /(no video|no filming|no photography|no photo|no people|no faces|faceless|product only|not on camera|without talent|no actors)/.test(text);
    if (mentionsIdentifiableMediaWork && !explicitlyNoIdentifiableMedia) {
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

function buildBrainResponse({ leadText, packageResult, requiredDocs, confidence, topMatches, completeness }) {
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

    return {
        lead_summary: leadText.slice(0, 700),
        service_type: serviceType,
        recommended_package: packageResult.recommended_package,
        quote_range: packageResult.quote_range,
        pricing_guidance: pricingGuidance,
        package_confidence: packageConfidence,
        package_reason: packageResult.package_reason || 'Recommendation generated from lead scope and pricing signals.',
        required_documents: safeDocs,
        documents_reason: requiredDocs?.documents_reason || 'Document set generated from onboarding and risk controls.',
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
            `Knowledge matches: ${(Array.isArray(topMatches) ? topMatches : []).map(m => `${m.file_name}#${m.chunk_index}`).join(', ') || 'none'}`
        ],
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
        .select('content')
        .ilike('key', `${KNOWLEDGE_PREFIX.chunk}%`)
        .limit(limit);
    if (chunkError) throw chunkError;
    return (chunkRows || [])
        .map(row => safeJsonParse(row.content, null))
        .filter(Boolean)
        .filter(chunk => !chunk.archived);
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
        .map(chunk => ({
            file_name: chunk.file_name,
            chunk_index: chunk.chunk_index,
            similarity: cosineSimilarity(
                leadVector,
                Array.isArray(chunk.vector) ? chunk.vector : textToVector(chunk.text, KB_VECTOR_DIMS)
            )
        }))
        .sort((a, b) => b.similarity - a.similarity);
}

async function runOracleRecommendation({ lead, leadId, sourceTable }) {
    const leadText = buildLeadText(lead, sourceTable);
    const completeness = evaluateLeadDataCompleteness(lead, sourceTable);
    if (!leadText || leadText.length < 12) {
        const err = new Error("Lead context is too limited to analyze. Add service, objective, or message details.");
        err.statusCode = 400;
        throw err;
    }

    const packageResult = inferPackageAndRange(leadText);
    const serviceType = classifyServiceType(String(leadText || '').toLowerCase(), packageResult);

    // Structured knowledge gets first pass, then we fill remaining slots with indexed file chunks.
    const structured = await fetchStructuredKnowledgeEntries({ includeInactive: false, limit: 500 }).catch(() => []);
    const structuredScored = structured.length ? scoreStructuredKnowledge(leadText, structured, serviceType).slice(0, 4) : [];

    const chunkPayloads = await fetchKnowledgeChunkPayloads({ limit: 3000 });
    const chunkScored = chunkPayloads.length ? scoreKnowledgeChunks(leadText, chunkPayloads) : [];

    const topMatches = [
        ...structuredScored,
        ...chunkScored.filter((m) => !String(m.file_name || '').startsWith('structured:'))
    ].slice(0, 6);

    if (!topMatches.length) {
        const err = new Error("No indexed knowledge found. Upload business files first or create structured Oracle knowledge entries.");
        err.statusCode = 400;
        throw err;
    }

    const topConfidence = topMatches.slice(0, 3);
    const confidence = topConfidence.length
        ? Math.max(0.05, Math.min(0.95, topConfidence.reduce((sum, item) => sum + item.similarity, 0) / topConfidence.length))
        : 0.12;

    const requiredDocs = computeRequiredDocuments(leadText);
    const recommendation = buildBrainResponse({
        leadText,
        packageResult,
        requiredDocs,
        confidence,
        topMatches,
        completeness
    });

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
            connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://api.openai.com", "https://generativelanguage.googleapis.com", "https://calendly.com", "https://api.stripe.com", "https://onlytrueperspective.tech", "https://www.onlytrueperspective.tech", "https://app.onlytrueperspective.tech", "https://otp-site.vercel.app", "https://vitals.vercel-insights.com"],
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
        if (!stripe) return res.status(500).send("Stripe not initialized");

        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.warn(`⚠️ Webhook Signature Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
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
    '/privacy': 'privacy.html',
    '/terms': 'terms.html',
    '/archive': 'archive.html',
    '/insights': 'insights.html',
    '/insight': 'insight.html',
    '/portal-gate': 'portal-gate.html',
    '/otp-terminal': 'otp-terminal.html',
    '/payment-success': 'payment_success.html'
};
Object.entries(staticAliases).forEach(([route, file]) => {
    app.get(route, (req, res) => {
        noStoreHtml(res);
        res.sendFile(path.join(staticPath, file));
    });
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
            message: e.message,
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
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
        if (isLocalOrigin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Tighten Vercel Preview URL matching if necessary
            if (origin.endsWith('.vercel.app') && !origin.includes('evil')) {
                callback(null, true);
            } else {
                console.warn(`🛑 CORS Blocked: ${origin}`);
                callback(new Error('CORS Policy Restricted'));
            }
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Ensure pre-flight uses same origin restrictions

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

// Before rate limiter — public read-only DDL for admin modal (Framer UI → Vercel API).
app.get('/api/schema-migration', (req, res) => sendSchemaMigrationSql(res));
app.get('/api/deploy-sql', (req, res) => sendSchemaMigrationSql(res));

// Body parsing (after Stripe webhook raw handler)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// API rate limiting
app.set('trust proxy', 1); // Trust Vercel Proxy
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

app.all('/api/diag', (req, res) => {
    res.json({ method: req.method, path: req.path, headers: req.headers });
});

// Strict Rate Limiting for Login Route (Brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
    let { passcode } = req.body;
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
    const { id, slug, table } = req.body;
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
    const { id, payload, table } = req.body;
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
    const { table, select = '*', order = 'created_at', descending = true, filters = [], limit } = req.body;

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

// 2.9 OTP Oracle — knowledge: upload + index PDF/DOCX
app.post('/api/admin/knowledge/upload', verifyToken, knowledgeUpload.single('file'), async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Missing file upload." });

        const fileName = String(req.file.originalname || '').trim();
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

        const fileId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const sourceType = path.extname(fileName).toLowerCase().replace('.', '') || 'unknown';
        const chunks = chunkText(extractedText, 1200, 220);
        const nowIso = new Date().toISOString();

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

        res.json({
            success: true,
            file: {
                file_id: fileId,
                file_name: fileName,
                source_type: sourceType,
                char_count: extractedText.length,
                chunk_count: chunks.length
            }
        });
    } catch (error) {
        console.error("knowledge-upload:", error.message);
        res.status(500).json({ success: false, message: error.message });
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
    const sourceType = (sourceTypeRaw && ['manualIntake', 'quickDeal'].includes(sourceTypeRaw)) ? sourceTypeRaw : 'manualIntake';

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
        const plain = opsDocMarkdownToPlainText(md);
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
            const plain = opsDocMarkdownToPlainText(md);
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

        const recKey = `${KNOWLEDGE_PREFIX.leadRec}${leadId}`;
        const nowIso = new Date().toISOString();
        const recPayload = {
            schema: 'otp-kb-rec-v1',
            lead_id: leadId,
            source_table: sourceTable,
            recommendation,
            confidence: Number(confidence.toFixed(4)),
            top_matches: topMatches,
            updated_at: nowIso
        };

        const { error: upsertError } = await supabaseAdmin
            .from('site_content')
            .upsert([{ key: recKey, content: JSON.stringify(recPayload), updated_at: nowIso }], { onConflict: 'key' });
        if (upsertError) throw upsertError;

        res.json({
            success: true,
            leadId,
            confidence: Number(confidence.toFixed(4)),
            recommendation,
            top_matches: topMatches.slice(0, 6)
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

        const { data: lead, error: leadError } = await supabaseAdmin
            .from(sourceTable)
            .select('*')
            .eq('id', leadId)
            .maybeSingle();
        if (leadError) throw leadError;
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

        // DOCX generation for master templates (proposal + agreement)
        // Templates are stored in Supabase Storage bucket: DOC_TEMPLATE_BUCKET at DOC_TEMPLATE_PREFIX
        const docxErrors = {};
        for (const t of ['proposal', 'agreement']) {
            try {
                const templateKey = `${DOC_TEMPLATE_PREFIX}${t}.docx`;
                const templateBuf = await getTemplateBuffer(templateKey);
                const outBuf = renderDocxFromTemplate(templateBuf, fields);
                docs[t].docx = outBuf.toString('base64');
                docs[t].docx_template = templateKey;
            } catch (e) {
                docxErrors[t] = String(e?.message || e);
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
        if (!doc.docx) return res.status(400).json({ success: false, message: 'DOCX template not configured or merge failed' });
        const buf = Buffer.from(String(doc.docx), 'base64');
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
        const has = (name) => files.some(f => String(f?.name || '').toLowerCase() === name.toLowerCase());
        res.json({
            success: true,
            bucket: DOC_TEMPLATE_BUCKET,
            prefix: DOC_TEMPLATE_PREFIX,
            templates: {
                proposal: { key: `${DOC_TEMPLATE_PREFIX}proposal.docx`, present: has('proposal.docx') },
                agreement: { key: `${DOC_TEMPLATE_PREFIX}agreement.docx`, present: has('agreement.docx') }
            }
        });
    } catch (error) {
        console.error("docs-templates-status:", error.message);
        res.status(500).json({ success: false, message: error.message });
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
                if (!doc.docx) { missing.push(`${docType}:docx_missing`); continue; }
                const a = {
                    filename: `${docType}-${packetId}.docx`,
                    content: String(doc.docx),
                    content_type: DOCX_MIME
                };
                const v = verifyAttachmentOrThrow(a);
                verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
                attachments.push(a);
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
                if (!doc.docx) { missing.push(`${docType}:docx_missing`); continue; }
                const a = { filename: `${docType}-${packetId}.docx`, content: String(doc.docx), content_type: DOCX_MIME };
                const v = verifyAttachmentOrThrow(a);
                verification.push({ filename: a.filename, ok: true, bytes: v.bytes });
                attachments.push(a);
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
        const leadIds = Array.isArray(req.body?.leadIds)
            ? req.body.leadIds.map(v => String(v).trim()).filter(Boolean).slice(0, 200)
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
                updated_at: row.updated_at
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
        return res.status(200).json({ success: true, message: "Contact received." }); // Fake success for bots
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
        if (!adminClient) throw new Error("Server missing Supabase Admin Key");

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
        res.status(500).json({ error: e.message });
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
        res.status(500).json({ success: false, message: e.message });
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
        res.status(500).json({ error: e.message });
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
        res.status(500).json({ error: e.message });
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
    res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
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
