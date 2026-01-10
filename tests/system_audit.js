/**
 * SYSTEM AUDIT V1.0
 * Automated integrity check for all site pages.
 */
const fs = require('fs');
const path = require('path');

const PAGES = [
    'index.html', 'archive.html', 'insights.html', '404.html', 
    'privacy.html', 'terms.html', 'otp-terminal.html', 'portal-gate.html'
];

const REQUIRED_SCRIPTS = ['site-config.js', 'site-init.js'];
const ADMIN_SCRIPTS = ['admin-core.js'];

function auditPage(file) {
    console.log(`\n📄 Auditing: ${file}`);
    if (!fs.existsSync(file)) {
        console.error(`❌ FAILED: File does not exist.`);
        return false;
    }

    const content = fs.readFileSync(file, 'utf8');
    let errors = 0;

    // 1. Check for basic HTML structure
    if (!content.includes('<!DOCTYPE html>')) { console.warn('⚠️ Missing DOCTYPE'); errors++; }
    if (!content.includes('<meta name="viewport"')) { console.warn('⚠️ Missing Viewport Meta'); errors++; }

    // 2. Check for Scripts
    if (file !== 'portal-gate.html') {
        REQUIRED_SCRIPTS.forEach(script => {
            if (!content.includes(script)) {
                console.error(`❌ MISSING SCRIPT: ${script}`);
                errors++;
            }
        });
    }

    if (file === 'otp-terminal.html') {
        ADMIN_SCRIPTS.forEach(script => {
            if (!content.includes(script)) {
                console.error(`❌ MISSING ADMIN SCRIPT: ${script}`);
                errors++;
            }
        });
    }

    // 3. Selector Integrity Check
    if (file === 'index.html') {
        if (!content.includes('class="cool-work-link')) { console.error('❌ MISSING: .cool-work-link (Black Hole Effect target)'); errors++; }
        if (!content.includes('class="nav-toggle')) { console.error('❌ MISSING: .nav-toggle'); errors++; }
    }

    // 4. Broken Link check (relative only)
    const links = content.match(/href="([^"]+)"/g) || [];
    links.forEach(l => {
        const url = l.split('"')[1];
        if (url.endsWith('.html') && !url.startsWith('http') && !url.includes('#')) {
            if (!fs.existsSync(url)) {
                console.error(`❌ BROKEN LINK: ${url}`);
                errors++;
            }
        }
    });

    if (errors === 0) console.log(`✅ ${file} passed integrity check.`);
    return errors === 0;
}

console.log("🚀 STARTING GLOBAL SITE AUDIT...");
let allPassed = true;
PAGES.forEach(p => {
    if (!auditPage(p)) allPassed = false;
});

if (allPassed) {
    console.log("\n🎊 GLOBAL AUDIT SUCCESSFUL. NO CRITICAL PATHWAY FAILURES DETECTED.");
} else {
    console.error("\n❌ AUDIT FAILED. RESOLVE ISSUES ABOVE.");
    process.exit(1);
}
