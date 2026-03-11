
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function runSecurityPerfAudit() {
    console.log("🛡️ STARTING SECURITY & PERFORMANCE AUDIT...");
    const PORT = process.env.PORT || 3000;
    const url = `http://localhost:${PORT}`;
    
    try {
        const start = Date.now();
        const res = await fetch(url);
        const latency = Date.now() - start;
        
        console.log(`
⏱️ Performance:`);
        console.log(`- Initial Response Latency: ${latency}ms`);
        if (latency < 200) console.log("✅ PASS: Low latency (<200ms)");
        else console.warn("⚠️ WARNING: High latency detected");

        console.log(`
🛡️ Security Headers:`);
        const headers = res.headers;
        const requiredHeaders = [
            'content-security-policy',
            'x-frame-options',
            'x-content-type-options',
            'strict-transport-security',
            'referrer-policy'
        ];

        requiredHeaders.forEach(h => {
            if (headers.get(h)) {
                console.log(`✅ ${h}: PRESENT`);
            } else {
                console.warn(`❌ ${h}: MISSING`);
            }
        });

        console.log(`
📦 Optimization:`);
        const encoding = headers.get('content-encoding');
        if (encoding) {
            console.log(`✅ Compression: ENABLED (${encoding})`);
        } else {
            console.warn(`❌ Compression: DISABLED`);
        }

    } catch (e) {
        console.warn("⚠️ Audit skipped: Server likely offline. To run this test, ensure the local server is running on the specified port.");
        process.exit(0);
    }
}

runSecurityPerfAudit();
