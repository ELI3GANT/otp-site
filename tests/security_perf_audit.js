
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function runSecurityPerfAudit() {
    console.log('🛡️ STARTING SECURITY & PERFORMANCE AUDIT...');
    const PORT = process.env.PORT || 3000;
    const liveApi = (process.env.LIVE_API_URL || '').replace(/\/$/, '');
    if (process.env.REQUIRE_LIVE_API_AUDIT === '1' && !liveApi) {
        console.error('❌ REQUIRE_LIVE_API_AUDIT=1 but LIVE_API_URL is not set.');
        process.exit(1);
    }
    const url = liveApi
        ? `${liveApi}/api/health`
        : `http://127.0.0.1:${PORT}/api/health`;

    console.log(`📡 Target: ${url}`);

    try {
        const start = Date.now();
        const res = await fetch(url);
        const latency = Date.now() - start;

        if (!res.ok) {
            console.warn(`⚠️ HTTP ${res.status} — body not JSON health check?`);
        }

        console.log(`
⏱️ Performance:`);
        console.log(`- Response latency: ${latency}ms`);
        if (latency < 800) console.log('✅ PASS: Reasonable latency for remote API');
        else console.warn('⚠️ WARNING: High latency');

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
            console.log(`✅ Compression: (${encoding})`);
        } else {
            console.warn(`⚠️ Compression: not reported (common on edge)`);
        }

    } catch (e) {
        if (liveApi) {
            console.error('❌ Live API audit failed:', e.message);
            process.exit(1);
        }
        console.warn("⚠️ Audit skipped: local API offline. Start `npm start` or set LIVE_API_URL=https://otp-site.vercel.app");
        process.exit(0);
    }
}

runSecurityPerfAudit();
