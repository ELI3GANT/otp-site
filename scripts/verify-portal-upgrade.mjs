import fs from 'fs';
import path from 'path';

console.log('🧪 VERIFYING CLIENT PORTAL UPGRADE V2.5...');

const baseDir = process.cwd();
const portalHtmlPath = path.join(baseDir, 'portal.html');
const portalCssPath = path.join(baseDir, 'portal.css');
const portalJsPath = path.join(baseDir, 'portal.js');

let passCount = 0;
function assert(cond, msg) {
    if (!cond) {
        console.error(`❌ FAIL: ${msg}`);
        process.exit(1);
    }
    console.log(`   ✅ PASS: ${msg}`);
    passCount++;
}

// 1. Files Exist
assert(fs.existsSync(portalHtmlPath), 'portal.html exists');
assert(fs.existsSync(portalCssPath), 'portal.css exists');
assert(fs.existsSync(portalJsPath), 'portal.js exists');

// 2. HTML Inspection
const html = fs.readFileSync(portalHtmlPath, 'utf8');
assert(html.includes('portal-dashboard-mount'), 'portal.html defines dashboard mount container');
assert(html.includes('milestone-pipeline'), 'portal.html defines milestone tracker pipeline');
assert(html.includes('4K Master Asset Vault'), 'portal.html defines 4K Master Asset Vault');
assert(html.includes('Invoice & Balance Overview'), 'portal.html defines Invoice & Balance section');
assert(html.includes('portal-video-modal'), 'portal.html defines video modal preview overlay');

// 3. CSS Inspection
const css = fs.readFileSync(portalCssPath, 'utf8');
assert(css.includes('.portal-dashboard-container'), 'portal.css defines portal-dashboard-container');
assert(css.includes('.milestone-pipeline'), 'portal.css defines milestone-pipeline grid');
assert(css.includes('.asset-card'), 'portal.css defines asset-card styling');
assert(css.includes('.portal-modal-overlay'), 'portal.css defines modal overlay');

// 4. JS Inspection
const js = fs.readFileSync(portalJsPath, 'utf8');
assert(js.includes('unlockDashboard'), 'portal.js defines unlockDashboard function');
assert(js.includes('previewAsset'), 'portal.js defines previewAsset modal trigger');
assert(js.includes('simulateDownload'), 'portal.js defines simulateDownload handler');

console.log('\n----------------------------------------');
console.log(`🎉 ALL ${passCount} CLIENT PORTAL VERIFICATIONS PASSED!`);
