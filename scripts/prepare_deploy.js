const fs = require('fs');
const path = require('path');

const FILES_TO_UPDATE = [
    'index.html',
    'otp-terminal.html',
    'portal-gate.html',
    'insights.html',
    'insight.html',
    '404.html',
    'archive.html',
    'privacy.html',
    'terms.html'
];

const ROOT_DIR = path.join(__dirname, '..');
const NEW_VERSION = Math.floor(Date.now() / 1000);

console.log(`🚀 MASTER CACHE BUSTER: v${NEW_VERSION}`);

FILES_TO_UPDATE.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Universal replacement for any script or link with ?v=
    content = content.replace(/(\.js|\.css)\?v=[0-9.]+/g, `$1?v=${NEW_VERSION}`);

    // Update Footer Year
    const year = new Date().getFullYear();
    content = content.replace(/<span id="year">.*?<\/span>/g, `<span id="year">${year}</span>`);

    fs.writeFileSync(filePath, content);
    console.log(`✅ ${file} synchronized.`);
});