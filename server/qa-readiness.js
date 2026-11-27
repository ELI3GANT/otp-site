function classifyStripeMode(secret = '') {
    const key = String(secret || '').trim();
    if (/^(?:sk|rk)_test_/i.test(key)) return 'test';
    if (/^(?:sk|rk)_live_/i.test(key)) return 'live';
    return key ? 'invalid' : 'offline';
}

function safeBackendSnapshot(payload = {}) {
    return {
        ok: payload.ok === true,
        environment: ['qa', 'sandbox'].includes(String(payload.environment)) ? String(payload.environment) : 'invalid',
        supabaseProjectRef: /^[a-z0-9]{20}$/.test(String(payload.supabaseProjectRef || '')) ? String(payload.supabaseProjectRef) : '',
        stripeMode: ['test', 'live', 'offline', 'invalid'].includes(String(payload.stripeMode)) ? String(payload.stripeMode) : 'invalid',
        databaseReadOnlyCheck: ['passed', 'failed', 'not_run'].includes(String(payload.databaseReadOnlyCheck)) ? String(payload.databaseReadOnlyCheck) : 'failed'
    };
}

function buildOtpSiteQaReadiness({ isPreview = false, isolationActive = false, directSupabaseEnabled = false, stripeKey = '', upstreamOrigin = '', backendPayload = null } = {}) {
    let upstreamHost = '';
    try { upstreamHost = new URL(String(upstreamOrigin || '')).hostname.toLowerCase(); } catch (_) {}
    const backend = safeBackendSnapshot(backendPayload || {});
    const productionHost = new Set(['otp-os.vercel.app', 'otp-site.vercel.app', 'onlytrueperspective.tech', 'www.onlytrueperspective.tech']).has(upstreamHost);
    const siteStripeMode = classifyStripeMode(stripeKey);
    const ok = isPreview === true
        && isolationActive === true
        && siteStripeMode === 'test'
        && Boolean(upstreamHost)
        && !productionHost
        && backend.ok
        && backend.environment === 'sandbox'
        && backend.supabaseProjectRef === 'tybgpykqaqaeoghdvpet'
        && backend.stripeMode === 'test'
        && backend.databaseReadOnlyCheck === 'passed';
    return Object.freeze({
        ok,
        statusCode: isPreview ? (ok ? 200 : 503) : 404,
        body: Object.freeze({
            ok,
            environment: 'preview',
            siteStripeMode,
            directSupabaseEnabled: directSupabaseEnabled === true,
            upstreamHost,
            backend
        })
    });
}

module.exports = { classifyStripeMode, safeBackendSnapshot, buildOtpSiteQaReadiness };
