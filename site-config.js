/**
 * OTP Site Configuration — v16.4.2
 * Centralized credentials and settings.
 * Loaded before other scripts to ensure window.OTP_CONFIG is available.
 *
 * LIVE (primary):
 *   - Marketing + API: https://www.onlytrueperspective.tech (same origin on www).
 *   - Apex onlytrueperspective.tech redirects /api → www; clients on apex use www for POST /api.
 *   - Previews: *.vercel.app and otp-site.vercel.app; mirrors without /api fall back to otp-site.vercel.app.
 *
 * Optional local Node (`npm start` on localhost:3000 or :8080): same-origin → local server.js + .env.
 * Other localhost ports (e.g. static Live Server): no /api → deployed API (otp-site.vercel.app).
 * Override: localStorage.setItem('otp_api_base', 'https://www.onlytrueperspective.tech'); reload. Remove key to undo.
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
    const stored = localStorage.getItem('otp_api_base');
    const h = window.location.hostname;
    const isLocalHost = (h === 'localhost' || h === '127.0.0.1' || h === '::1');
    const localApiPorts = new Set(['3000', '8080']);

    if (stored && stored.startsWith('http')) {
        // Safety: on localhost, stale remote overrides can break login with
        // "server unreachable". Prefer local API unless override is local too.
        try {
            const storedUrl = new URL(stored);
            // Apex can 307 /api requests to www, which breaks CORS preflights for POST.
            if (storedUrl.hostname === 'onlytrueperspective.tech') {
                return _OTP_CANONICAL_WWW;
            }
            if (!isLocalHost) return storedUrl.origin;
        } catch (e) {
            if (!isLocalHost) return stored;
        }
        try {
            const storedHost = new URL(stored).hostname;
            if (storedHost === 'localhost' || storedHost === '127.0.0.1' || storedHost === '::1') {
                return stored;
            }
        } catch (e) {
            // ignore malformed override and continue with auto resolution
        }
    }

    // Live / preview: same-origin API (Vercel serverless + static).
    if (h.endsWith('.vercel.app')) {
        return window.location.origin;
    }
    if (h === 'app.onlytrueperspective.tech') {
        return window.location.origin;
    }
    if (h === 'www.onlytrueperspective.tech') {
        return window.location.origin;
    }
    // Apex redirects /api → www; use www for POST /api so bodies are not lost on 307.
    if (h === 'onlytrueperspective.tech') {
        return _OTP_CANONICAL_WWW;
    }

    // Local Node only when server.js actually serves /api (other localhost ports → deployed API).
    if (isLocalHost) {
        const port = window.location.port;
        if (port && localApiPorts.has(port)) {
            return window.location.origin;
        }
        return _OTP_VERCEL_API;
    }

    // Mirrors / static hosts without /api on this origin.
    return _OTP_VERCEL_API;
};