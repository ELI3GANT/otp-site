import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 VERIFYING CREATIVE MEDIA SHOWCASE & ANALYTICS ENGINE...');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`   ✅ PASS: ${message}`);
        passCount++;
    } else {
        console.error(`   ❌ FAIL: ${message}`);
        failCount++;
    }
}

// 1. Check file existence
const showcaseCssPath = path.join(rootDir, 'components', 'otp-media-showcase.css');
const showcaseJsPath = path.join(rootDir, 'components', 'otp-media-showcase.js');
const analyticsJsPath = path.join(rootDir, 'otp-analytics-engine.js');
const videoLibPath = path.join(rootDir, 'otp-video-library.js');
const indexPath = path.join(rootDir, 'index.html');
const serverPath = path.join(rootDir, 'server.js');

assert(fs.existsSync(showcaseCssPath), 'otp-media-showcase.css exists');
assert(fs.existsSync(showcaseJsPath), 'otp-media-showcase.js exists');
assert(fs.existsSync(analyticsJsPath), 'otp-analytics-engine.js exists');
assert(fs.existsSync(videoLibPath), 'otp-video-library.js exists');

// 2. Validate Showcase CSS content
const cssContent = fs.readFileSync(showcaseCssPath, 'utf8');
assert(cssContent.includes('.otp-showcase-container'), 'CSS defines showcase container');
assert(cssContent.includes('.otp-media-modal-backdrop'), 'CSS defines video player modal overlay');
assert(cssContent.includes('.otp-filter-btn'), 'CSS defines filter category pills');

// 3. Validate Showcase JS content
const jsContent = fs.readFileSync(showcaseJsPath, 'utf8');
assert(jsContent.includes('OTPMediaShowcase'), 'JS exports OTPMediaShowcase module');
assert(jsContent.includes('createShowcaseComponent'), 'JS contains grid and filter renderer');
assert(jsContent.includes('openModal'), 'JS contains interactive video modal player logic');

// 4. Validate Analytics Engine content
const analyticsContent = fs.readFileSync(analyticsJsPath, 'utf8');
assert(analyticsContent.includes('OTPAnalytics'), 'Analytics engine exports OTPAnalytics');
assert(analyticsContent.includes('queueEvent'), 'Analytics engine includes queueEvent logic');
assert(analyticsContent.includes('web_vitals'), 'Analytics engine includes Core Web Vitals observers');

// 5. Validate Video Library items
const videoLibContent = fs.readFileSync(videoLibPath, 'utf8');
assert(videoLibContent.includes('FALLBACK_VIDEOS'), 'Video library defines video catalog');
assert(videoLibContent.includes('embedUrl'), 'Video library item contains embedUrl property');

// 6. Validate index.html integrations
const indexContent = fs.readFileSync(indexPath, 'utf8');
const serverContent = fs.readFileSync(serverPath, 'utf8');
assert(indexContent.includes('otp-media-showcase.css'), 'index.html links showcase CSS');
assert(indexContent.includes('otpMediaShowcaseMount'), 'index.html includes showcase mount element');
const analyticsEndpoint = analyticsContent.match(/ANALYTICS_ENDPOINT\s*=\s*['"]([^'"]+)['"]/)?.[1];
assert(
    !indexContent.includes('otp-analytics-engine.js') || serverContent.includes(`app.post('${analyticsEndpoint}'`),
    'index.html loads analytics only when its server endpoint exists'
);
assert(indexContent.includes('otp-media-showcase.js'), 'index.html includes media showcase script');

console.log('\n----------------------------------------');
if (failCount === 0) {
    console.log(`🎉 ALL ${passCount} SHOWCASE & ANALYTICS VERIFICATIONS PASSED!`);
    process.exit(0);
} else {
    console.error(`💥 VERIFICATION FAILED: ${failCount} errors, ${passCount} passed.`);
    process.exit(1);
}
