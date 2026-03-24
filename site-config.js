/**
 * OTP Site Configuration
 * Centralized credentials and settings.
 * Loaded before other scripts to ensure window.OTP_CONFIG is available.
 */
window.OTP_CONFIG = {
    supabaseUrl: 'https://ckumhowhucbbmpdeqkrl.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdW1ob3dodWNiYm1wZGVxa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzQ3NjcsImV4cCI6MjA4MzQ1MDc2N30.yIJ1diGLWjtLWm8P2D5flF2nd0xPKn_8x2RR3DlIrag',
    apiBase: (function() {
        const h = window.location.hostname;
        // Always use relative URLs — works for localhost, Vercel, and custom domain
        // The server.js handles all /api/* routes in every environment
        return '';
    })(),
};

// Global Helper for resolving best API base URL
window.OTP = window.OTP || {};
window.OTP.getApiBase = function() {
    // Check if user has overridden the satellite URL via localStorage
    const stored = localStorage.getItem('otp_api_base');
    if (stored && stored.startsWith('http') && !stored.includes('localhost')) {
        return stored;
    }
    // Default: same-origin relative requests (works on localhost:3000, localhost:8080, Vercel, custom domain)
    return window.location.origin;
};