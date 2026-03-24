/**
 * OTP Site Configuration — v15.1.1
 * Centralized credentials and settings.
 * Loaded before other scripts to ensure window.OTP_CONFIG is available.
 *
 * ARCHITECTURE:
 *   - Frontend (static): GitHub Pages → onlytrueperspective.tech
 *   - Backend (API):     Vercel Node  → otp-site.vercel.app
 *   - The /api/* routes ONLY work on Vercel, not on the GitHub Pages custom domain.
 */

const _OTP_VERCEL_API = 'https://otp-site.vercel.app';

window.OTP_CONFIG = {
    supabaseUrl: 'https://ckumhowhucbbmpdeqkrl.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdW1ob3dodWNiYm1wZGVxa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzQ3NjcsImV4cCI6MjA4MzQ1MDc2N30.yIJ1diGLWjtLWm8P2D5flF2nd0xPKn_8x2RR3DlIrag',
    apiBase: _OTP_VERCEL_API,
};

// Global helper — resolves the correct API base for every environment
window.OTP = window.OTP || {};
window.OTP.getApiBase = function() {
    const h = window.location.hostname;

    // 1. Localhost dev: use same-origin (server.js runs on :3000 / :8080)
    if (h === 'localhost' || h === '127.0.0.1') {
        return window.location.origin;
    }

    // 2. On Vercel preview/prod (*.vercel.app or the main deployment):
    //    API is same-origin — server.js is the serverless handler
    if (h.endsWith('.vercel.app')) {
        return window.location.origin;
    }

    // 3. Custom domain (GitHub Pages — static only, no Node backend):
    //    Must proxy all API calls to the Vercel backend
    return _OTP_VERCEL_API;
};