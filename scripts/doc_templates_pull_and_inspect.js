/* Pull DOCX master templates from Supabase Storage and inspect field locations.
   Usage: node scripts/doc_templates_pull_and_inspect.js
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const PizZip = require('pizzip');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const BUCKET = (process.env.DOC_TEMPLATE_BUCKET || 'otp-doc-templates').trim();
const PREFIX = 'master/';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function downloadToBuffer(key) {
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error) throw error;
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

function getDocumentXml(buf) {
  const zip = new PizZip(buf);
  return zip.file('word/document.xml')?.asText() || '';
}

function xmlTextPreview(xml) {
  // Pull a rough text stream from <w:t> nodes for preview (no formatting).
  const texts = [];
  const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml))) {
    const t = m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (t) texts.push(t);
  }
  return texts.join('');
}

function findSnippets(haystack, needles, context = 80) {
  const out = [];
  for (const needle of needles) {
    const idx = haystack.toLowerCase().indexOf(String(needle).toLowerCase());
    if (idx >= 0) {
      out.push({
        needle,
        index: idx,
        snippet: haystack.slice(Math.max(0, idx - context), Math.min(haystack.length, idx + context))
      });
    }
  }
  return out;
}

async function main() {
  const outDir = path.join(process.cwd(), 'output', 'doc-templates');
  fs.mkdirSync(outDir, { recursive: true });

  const targets = [
    { type: 'proposal', key: `${PREFIX}proposal.docx` },
    { type: 'agreement', key: `${PREFIX}agreement.docx` }
  ];

  for (const t of targets) {
    console.log(`\n== Pulling ${t.key} from bucket ${BUCKET} ==`);
    const buf = await downloadToBuffer(t.key);
    const outPath = path.join(outDir, `${t.type}.docx`);
    fs.writeFileSync(outPath, buf);
    console.log(`Saved: ${outPath} (${buf.length} bytes)`);

    const xml = getDocumentXml(buf);
    if (!xml) {
      console.log('No word/document.xml found (unexpected).');
      continue;
    }

    const text = xmlTextPreview(xml);
    console.log(`Extracted text length: ${text.length}`);

    const probes = [
      'client', 'name', 'email', 'scope', 'package', 'pricing', 'quote', 'deposit', 'date', 'generated',
      'Only True Perspective', 'OTP'
    ];
    const snippets = findSnippets(text, probes, 110);
    console.log('Snippets (first matches):');
    for (const s of snippets.slice(0, 18)) {
      console.log(`- [${s.needle}] …${s.snippet.replace(/\s+/g, ' ').trim()}…`);
    }

    // Also save a raw text dump for manual confirmation
    fs.writeFileSync(path.join(outDir, `${t.type}.text.txt`), text, 'utf8');
    fs.writeFileSync(path.join(outDir, `${t.type}.document.xml`), xml, 'utf8');
  }
}

main().catch((e) => {
  console.error('Inspect failed:', e?.message || e);
  process.exit(1);
});

