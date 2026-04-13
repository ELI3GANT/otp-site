/* Dump DOCX visible text for verification.
   Usage: node scripts/docx_text_dump.js path/to/file.docx
*/
const fs = require('fs');
const PizZip = require('pizzip');

const p = process.argv[2];
if (!p) {
  console.error('Usage: node scripts/docx_text_dump.js <file.docx>');
  process.exit(1);
}

const buf = fs.readFileSync(p);
const zip = new PizZip(buf);
const xml = zip.file('word/document.xml')?.asText() || '';
const out = [];
const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
let m;
while ((m = re.exec(xml))) {
  const t = m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  if (t) out.push(t);
}

process.stdout.write(out.join(''));

