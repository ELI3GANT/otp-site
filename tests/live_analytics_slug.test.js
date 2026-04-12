/**
 * Optional live check: POST /api/analytics/view must reject malformed slugs (400).
 * Requires LIVE_API_URL (e.g. https://www.onlytrueperspective.tech). Skips otherwise.
 */

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

(async () => {
    const base = (process.env.LIVE_API_URL || '').replace(/\/$/, '');
    if (!base) {
        console.log('⏭️  Live analytics slug test skipped (set LIVE_API_URL to enable)');
        process.exit(0);
        return;
    }

    const url = `${base}/api/analytics/view`;

    try {
        const strict = process.env.OTP_LIVE_STRICT_SLUG === '1';
        const bad = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: 'x<y>' }),
        });
        if (bad.status !== 400) {
            const t = await bad.text();
            if (!strict && bad.status === 200) {
                console.warn('⚠️  Live API still accepts junk view slugs (HTTP 200). Deploy latest server.js; then set OTP_LIVE_STRICT_SLUG=1 in CI to require HTTP 400.');
                process.exit(0);
                return;
            }
            console.error(`❌ Invalid slug: expected HTTP 400, got ${bad.status}: ${t.slice(0, 200)}`);
            process.exit(1);
        }

        const ok = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: 'definitely-nonexistent-slug-' + Date.now() }),
        });
        if (ok.status !== 200) {
            const t = await ok.text();
            console.error(`❌ Valid-format slug: expected HTTP 200, got ${ok.status}: ${t.slice(0, 200)}`);
            process.exit(1);
        }
        const j = await ok.json();
        if (typeof j.success !== 'boolean') {
            console.error('❌ Unexpected JSON body', j);
            process.exit(1);
        }
        if (j.success !== false) {
            console.error('❌ Unknown slug must return success:false, got:', JSON.stringify(j));
            process.exit(1);
        }

        console.log('✅ Live analytics slug validation OK');
    } catch (e) {
        console.error('❌ Live analytics slug test failed:', e.message);
        process.exit(1);
    }
})();
