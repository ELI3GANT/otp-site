/**
 * OTP Site Configuration — v15.2.0
 * Centralized credentials and settings.
 * Loaded before other scripts to ensure window.OTP_CONFIG is available.
 *
 * ARCHITECTURE:
 *   - Public / admin UI: Vercel (this repo) on www / preview URLs; optional mirrors (Framer, Pages).
 *   - Backend (API): same deployment on Vercel; apex may redirect /api → www (POST body unsafe on redirect).
 *   - Fallback API host: otp-site.vercel.app when origin is not this project.
 */

const _OTP_VERCEL_API = 'https://otp-site.vercel.app';
/** Production site + API live on www (same Vercel project); apex redirects API to www. */
const _OTP_CANONICAL_WWW = 'https://www.onlytrueperspective.tech';

window.OTP_CONFIG = {
    supabaseUrl: 'https://ckumhowhucbbmpdeqkrl.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdW1ob3dodWNiYm1wZGVxa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzQ3NjcsImV4cCI6MjA4MzQ1MDc2N30.yIJ1diGLWjtLWm8P2D5flF2nd0xPKn_8x2RR3DlIrag',
    apiBase: _OTP_VERCEL_API,
};
Object.freeze(window.OTP_CONFIG);

// Global helper — resolves the correct API base for every environment
window.OTP = window.OTP || {};

/**
 * Shared Supabase Client (Singleton)
 * Prevents "Multiple GoTrueClient instances" warnings.
 */
window.OTP.getSupabase = function() {
    if (window.OTP._supabaseClient) return window.OTP._supabaseClient;
    
    if (typeof window.supabase === 'undefined') {
        console.warn("[OTP] Supabase library not loaded yet.");
        return null;
    }

    window.OTP._supabaseClient = window.supabase.createClient(
        window.OTP_CONFIG.supabaseUrl, 
        window.OTP_CONFIG.supabaseKey
    );
    return window.OTP._supabaseClient;
};

/**
 * Sanitize HTML for safe innerHTML (CMS / markdown output).
 * Uses DOMPurify when present; otherwise escapes to plain text.
 */
window.OTP.sanitizeHtml = function(html) {
    const raw = String(html ?? '');
    if (typeof window.DOMPurify !== 'undefined') {
        return window.DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
    }
    const t = document.createElement('template');
    t.textContent = raw;
    return t.innerHTML;
};

window.OTP.getApiBase = function() {
    // 0. Manual Override (For advanced development & satellite testing)
    const stored = localStorage.getItem('otp_api_base');
    if (stored && stored.startsWith('http')) return stored;

    const h = window.location.hostname;

    // 1. Localhost dev: same-origin only when Node/server.js is actually serving /api (3000 or 8080).
    // Static servers (e.g. 5500) have no backend — must hit the deployed Vercel API.
    if (h === 'localhost' || h === '127.0.0.1') {
        const port = window.location.port;
        const localApiPorts = new Set(['3000', '8080']);
        if (port && localApiPorts.has(port)) {
            return window.location.origin;
        }
        return _OTP_VERCEL_API;
    }

    // 2. On Vercel preview/prod (*.vercel.app or the main deployment):
    //    API is same-origin — server.js is the serverless handler
    if (h.endsWith('.vercel.app')) {
        return window.location.origin;
    }

    // 2b. App subdomain on same Vercel project (Node + static together).
    if (h === 'app.onlytrueperspective.tech') {
        return window.location.origin;
    }

    // 2c. Primary marketing + API on www (same origin — avoids cross-origin + CORS on every call).
    if (h === 'www.onlytrueperspective.tech') {
        return window.location.origin;
    }

    // 2d. Apex redirects /api to www; call www directly so POST /api/auth/login etc. are not broken by 307.
    if (h === 'onlytrueperspective.tech') {
        return _OTP_CANONICAL_WWW;
    }

    // 3. Other hosts (Framer-only, GitHub Pages, etc. — no /api on origin):
    //    Use canonical Vercel deployment.
    return _OTP_VERCEL_API;
};