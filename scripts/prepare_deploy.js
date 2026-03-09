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
const NEW_VERSION = Math.floor(Date.now() / 1000); // Unix Timestamp

console.log(`🚀 PREPARING DEPLOYMENT: v${NEW_VERSION}`);

FILES_TO_UPDATE.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Update CSS Versions
    content = content.replace(/styles\.css\?v=[0-9.]+/g, `styles.css?v=${NEW_VERSION}`);
    content = content.replace(/admin-styles\.css\?v=[0-9.]+/g, `admin-styles.css?v=${NEW_VERSION}`);
    content = content.replace(/blog-enhancements\.css\?v=[0-9.]+/g, `blog-enhancements.css?v=${NEW_VERSION}`);

    // 2. Update JS Versions
    content = content.replace(/site-init\.js\?v=[0-9.]+/g, `site-init.js?v=${NEW_VERSION}`);
    content = content.replace(/admin-core\.js\?v=[0-9.]+/g, `admin-core.js?v=${NEW_VERSION}`);
    content = content.replace(/admin-init\.js\?v=[0-9.]+/g, `admin-init.js?v=${NEW_VERSION}`);
    content = content.replace(/audit-engine\.js\?v=[0-9.]+/g, `audit-engine.js?v=${NEW_VERSION}`);

    // 3. Update Footer Year
    const year = new Date().getFullYear();
    content = content.replace(/© <span id="year">.*?<\/span>/g, `© <span id="year">${year}</span>`);

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${file}`);
});

console.log(`\n✨ ASSETS BUSTED. READY TO PUSH.`);
