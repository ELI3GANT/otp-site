'use strict';
// Static pages and project stories share the same navigation source.
const fs = require('fs');
const path = require('path');
const { renderHeader, renderFooter } = require('../public-shell');
const pages = {
  'index.html': 'Home', 'archive.html': 'Archive', 'studio.html': 'Studio',
  'insights.html': '', 'insight.html': '', 'terms.html': '', 'privacy.html': '',
  'website-design.html': 'Studio', 'consultant-audit.html': 'Studio',
  'weatheros/index.html': '', 'weatheros/privacy.html': '', 'weatheros/support.html': ''
};
for (const [file, active] of Object.entries(pages)) {
  const filename = path.join(__dirname, '..', file);
  let html = fs.readFileSync(filename, 'utf8');
  const header = `<!-- PUBLIC HEADER START -->${renderHeader(active)}<!-- PUBLIC HEADER END -->`;
  const footer = `<!-- PUBLIC FOOTER START -->${renderFooter()}<!-- PUBLIC FOOTER END -->`;
  html = html.includes('<!-- PUBLIC HEADER START -->')
    ? html.replace(/<!-- PUBLIC HEADER START -->[\s\S]*?<!-- PUBLIC HEADER END -->/, header)
    : html.replace(/<header class="(?:nav nav-split|wrap nav)"[^>]*>[\s\S]*?<\/header>/, header);
  html = html.includes('<!-- PUBLIC FOOTER START -->')
    ? html.replace(/<!-- PUBLIC FOOTER START -->[\s\S]*?<!-- PUBLIC FOOTER END -->/, footer)
    : html.replace(/<footer class="(?:footer|wrap footer)"[^>]*>[\s\S]*?<\/footer>/, footer);
  if (!html.includes('/public-system.css?')) html = html.replace('</head>', '<link rel="stylesheet" href="/public-system.css?v=20260915" />\n</head>');
  if (!html.includes('/public-shell.js?')) html = html.replace('</body>', '<script src="/public-shell.js?v=20260915" defer></script>\n</body>');
  fs.writeFileSync(filename, html);
}
fs.copyFileSync(path.join(__dirname, '..', 'weatheros/index.html'), path.join(__dirname, '..', 'weatheros.html'));
fs.copyFileSync(path.join(__dirname, '..', 'weatheros/privacy.html'), path.join(__dirname, '..', 'weatheros-privacy.html'));
console.log(`Synced navigation and footer across ${Object.keys(pages).length} public pages.`);
