/**
 * LINK HANDLER UNIT TEST
 * Validates the URL regex used in admin-core.js
 */

const urlPattern = /^(https?:\/\/)?(localhost|[\da-z.-]+\.[a-z.]{2,6})(:[\d]+)?([\/\w .-]*)*\/?$/;

const testCases = [
    { url: 'https://otp-site.vercel.app', expected: true },
    { url: 'http://localhost:3000', expected: true },
    { url: 'otp-site.vercel.app', expected: true },
    { url: 'invalid-url', expected: false },
    { url: 'https://site', expected: false },
    { url: 'ftp://site.com', expected: false } // Regex might be strict on http/s
];

console.log("🧪 Running Link Handler Regex Tests...");

let passed = 0;
testCases.forEach(tc => {
    const result = urlPattern.test(tc.url);
    if (result === tc.expected) {
        console.log(`✅ PASS: "${tc.url}" -> ${result}`);
        passed++;
    } else {
        console.error(`❌ FAIL: "${tc.url}" -> expected ${tc.expected}, got ${result}`);
    }
});

console.log(`\n📊 Results: ${passed}/${testCases.length} passed.`);

if (passed !== testCases.length) {
    process.exit(1);
}
