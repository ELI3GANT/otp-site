/* Inject merge placeholders into master DOCX templates without changing layout.
   Strategy: replace existing underscore blanks and specific inline field values only.
   Usage: node scripts/doc_templates_inject_placeholders.js
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
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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

async function uploadBuffer(key, buf) {
  const { error } = await supabase.storage.from(BUCKET).upload(key, buf, {
    upsert: true,
    contentType: DOCX_MIME
  });
  if (error) throw error;
}

function getXml(zip, file) {
  return zip.file(file)?.asText() || '';
}

function setXml(zip, file, xml) {
  zip.file(file, xml);
}

function replaceOnce(haystack, needle, replacement, label) {
  const idx = haystack.indexOf(needle);
  if (idx < 0) throw new Error(`Missing expected field: ${label || needle}`);
  return haystack.slice(0, idx) + replacement + haystack.slice(idx + needle.length);
}

function patchProposalXml(xml) {
  // Keep labels as-is; only replace the blank values.
  // Client name field: include email in same field to satisfy mapping without adding new lines.
  xml = replaceOnce(
    xml,
    'Client Name: __________________________',
    'Client Name: {{client_name}} ({{client_email}})',
    'proposal client name'
  );
  xml = replaceOnce(
    xml,
    'Project: __________________________',
    'Project: {{recommended_package}}',
    'proposal project/package'
  );
  xml = replaceOnce(
    xml,
    'Date: __________________________',
    'Date: {{generated_at}}',
    'proposal generated date'
  );

  // Scope section: keep the bullet labels, append values.
  xml = replaceOnce(
    xml,
    'Services to be provided:',
    'Services to be provided: {{lead_summary}}',
    'proposal scope lead_summary'
  );
  xml = replaceOnce(
    xml,
    'Platforms/Tools:',
    'Platforms/Tools: {{required_documents_csv}}',
    'proposal required docs'
  );

  // Pricing section: replace the blanks, preserve $ and label.
  xml = replaceOnce(
    xml,
    'Service: __________________________',
    'Service: {{recommended_package}}',
    'proposal pricing service'
  );
  xml = replaceOnce(
    xml,
    'Price: $__________',
    'Price: {{quote_range}} (Deposit due: {{deposit_due}})',
    'proposal pricing quote/deposit'
  );

  return xml;
}

function patchAgreementXml(xml) {
  xml = replaceOnce(
    xml,
    'Client Name: __________________________',
    'Client Name: {{client_name}} ({{client_email}})',
    'agreement client name'
  );
  xml = replaceOnce(
    xml,
    'Project: __________________________',
    'Project: {{recommended_package}}',
    'agreement project/package'
  );
  xml = replaceOnce(
    xml,
    'Project Fee: __________________________',
    'Project Fee: {{quote_range}} (Deposit due: {{deposit_due}})',
    'agreement fee/quote/deposit'
  );
  xml = replaceOnce(
    xml,
    'Start Date: __________________________',
    'Start Date: {{generated_at}}',
    'agreement date'
  );

  // Insert lead summary + docs in the scope section by extending the first sentence only.
  // This preserves paragraph structure while adding context.
  xml = replaceOnce(
    xml,
    'Clearly defined deliverables and scope.',
    'Clearly defined deliverables and scope. Project description: {{lead_summary}}. Required docs: {{required_documents_csv}}.',
    'agreement scope summary/docs'
  );

  return xml;
}

function patchDocxBuffer(buf, patcher) {
  const zip = new PizZip(buf);
  const docXml = getXml(zip, 'word/document.xml');
  if (!docXml) throw new Error('Missing word/document.xml');
  const nextXml = patcher(docXml);
  setXml(zip, 'word/document.xml', nextXml);
  return zip.generate({ type: 'nodebuffer' });
}

async function main() {
  const outDir = path.join(process.cwd(), 'output', 'doc-templates', 'final');
  fs.mkdirSync(outDir, { recursive: true });

  const proposalKey = `${PREFIX}proposal.docx`;
  const agreementKey = `${PREFIX}agreement.docx`;

  console.log(`Downloading ${proposalKey} and ${agreementKey} from ${BUCKET}...`);
  const proposalBuf = await downloadToBuffer(proposalKey);
  const agreementBuf = await downloadToBuffer(agreementKey);

  console.log('Patching proposal...');
  const patchedProposal = patchDocxBuffer(proposalBuf, patchProposalXml);
  console.log('Patching agreement...');
  const patchedAgreement = patchDocxBuffer(agreementBuf, patchAgreementXml);

  const proposalOut = path.join(outDir, 'proposal.docx');
  const agreementOut = path.join(outDir, 'agreement.docx');
  fs.writeFileSync(proposalOut, patchedProposal);
  fs.writeFileSync(agreementOut, patchedAgreement);
  console.log(`Wrote: ${proposalOut}`);
  console.log(`Wrote: ${agreementOut}`);

  console.log('Uploading patched templates back to storage...');
  await uploadBuffer(proposalKey, patchedProposal);
  await uploadBuffer(agreementKey, patchedAgreement);
  console.log('Upload complete.');
}

main().catch((e) => {
  console.error('Inject failed:', e?.message || e);
  process.exit(1);
});

