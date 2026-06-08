if (typeof window.gsap !== 'undefined' && window.gsap.ticker) {
    window.gsap.ticker.fps(60);
    window.gsap.config({ force3D: true });
}
/**
 * site-init.js [SIG:2026-01-10-04-58]
 * Centralized initialization for Kursor, Year, and Scroll Progress.
 */

    (function() {
        if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                if (!registration || typeof registration.addEventListener !== 'function') return;
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            } catch (err) {
                console.warn('[OTP] Service worker registration failed:', err);
            }
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (window.__otpSwRefreshing) return;
            window.__otpSwRefreshing = true;
            window.location.reload();
        });
    })();

    try {
        if (window.OTPAttribution && typeof window.OTPAttribution.captureOnLoad === 'function') {
            window.OTPAttribution.captureOnLoad();
        }
    } catch (attrErr) {
        console.warn('[OTP] Attribution capture skipped:', attrErr);
    }

    // 1. Footer Year
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    /** Homepage package CTAs — safe if #contact form is absent (e.g. other pages). */
    window.OTPSetProjectType = function (value) {
        const el = document.getElementById('project_type');
        if (!el) return;
        const v = String(value || '').trim();
        const optionExists = Array.from(el.options || []).some((o) => o.value === v);
        el.value = optionExists ? v : 'Custom Build';
        el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    /** URL query slug — align with server sanitizeSlugInput (no control chars / brackets). */
    window.OTP.sanitizeSlugParam = function (raw) {
        const slug = String(raw ?? '').trim().slice(0, 256);
        if (!slug || /[\x00-\x08\x0b\x0c\x0e-\x1f<>\\]/.test(slug)) return '';
        return slug;
    };

    /** Only http(s) media URLs (insight hero, lazy embeds). */
    window.OTP.sanitizeHttpUrl = function (raw) {
        const s = String(raw || '').trim();
        if (!s || /[\s"'<>\\]/.test(s)) return '';
        try {
            const origin = (window.location && window.location.origin) ? window.location.origin : 'https://invalid.local';
            const u = new URL(s, origin);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
            if (u.username || u.password) return '';
            return u.toString();
        } catch (e) {
            return '';
        }
    };

    // --- PRICING SYNC (single source of truth) ---
    (function applyUnifiedPricingOnce() {
        try {
            const cfg = window.OTP_PRICING;
            if (!cfg || !cfg.packages) return;

            // Update contact form package labels (display only; values remain stable keys)
            const sel = document.getElementById('project_type');
            if (sel) {
                const map = {
                    'The Signal': cfg.packages.theSignal?.price_display,
                    'The Engine': cfg.packages.theEngine?.price_display,
                    'The System': cfg.packages.theSystem?.price_display
                };
                Array.from(sel.options || []).forEach((opt) => {
                    const v = String(opt.value || '');
                    if (map[v]) {
                        opt.textContent = `${v} (${map[v]})`;
                    }
                });
            }
        } catch (e) {
            // non-fatal
        }
    })();

    // PREMIUM PRELOADER — inline fail-safe in index.html owns dismiss; this mirrors it.
    function hidePageLoader() {
        if (window.OTP && typeof window.OTP.dismissPageLoader === 'function') {
            window.OTP.dismissPageLoader();
            return;
        }
        const loader = document.getElementById('page-loader');
        if (!loader || loader.getAttribute('data-dismissed') === '1') return;
        loader.setAttribute('data-dismissed', '1');
        loader.classList.add('is-dismissed');
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        loader.style.pointerEvents = 'none';
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hidePageLoader, { once: true });
    } else {
        hidePageLoader();
    }
    window.addEventListener('load', hidePageLoader, { once: true });
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader && loader.getAttribute('data-dismissed') !== '1') {
            hidePageLoader();
            console.warn('[OTP] Loading timeout reached. Bypassing preloader.');
        }
    }, 1600);

    function scheduleAfterFirstPaint(fn, timeoutMs = 2200) {
        if (typeof fn !== 'function') return;
        if ('requestIdleCallback' in window) {
            requestIdleCallback(fn, { timeout: timeoutMs });
        } else {
            setTimeout(fn, Math.min(timeoutMs, 1400));
        }
    }

    /** Unified hero identity: a single animated mark with a static fallback on true load failure. */
    function activateHeroAnimatedLogo() {
        const heroMark = document.querySelector('.home-page .hero-symbol-mark');
        if (!heroMark) return;
        heroMark.addEventListener('error', () => {
            const fallbackSrc = heroMark.dataset.fallbackSrc;
            if (fallbackSrc && heroMark.getAttribute('src') !== fallbackSrc) {
                heroMark.src = fallbackSrc;
            }
        }, { once: true });
    }
    scheduleAfterFirstPaint(() => {
        try {
            activateHeroAnimatedLogo();
        } catch (heroErr) {
            console.warn('[OTP] Hero animation reveal skipped:', heroErr);
        }
    }, 2600);

    // 1.5 Lenis Smooth Scroll REMOVED for native feel.


    // 2. Kursor.js Initialization
    // Check if we are on desktop. Kursor typically hinders mobile touch.
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    
    // Cursor ring disabled (removes the black circle/ring around the mouse).
    // If we ever want it back, gate behind an explicit config flag.
    const shouldEnableKursor = !!(window.OTP_CONFIG && window.OTP_CONFIG.enableKursor);
    if (shouldEnableKursor && typeof kursor !== 'undefined' && !isMobile) {
        new kursor({
            type: 1, // Ring
            color: 'var(--accent2)', // Cyan
            removeDefaultCursor: false
        });
    } else {
        // Safety: remove any injected nodes.
        const kursorNodes = document.querySelectorAll('.kursor, .kursor-child');
        kursorNodes.forEach(n => n.remove());
    }
    
    // Mobile Starfield Visiblity Logic
    if (isMobile) {
        // Ensure kursor elements are hidden if they were somehow injected
        const kursorNodes = document.querySelectorAll('.kursor, .kursor-child');
        kursorNodes.forEach(n => n.remove());
        
        // Mark the starfield as available; CSS owns opacity by theme/breakpoint.
        const canvas = document.getElementById('cursor-canvas');
        if (canvas) {
            canvas.style.display = 'block';
            canvas.classList.add('stars-mounted');
        }
    }

    // 3. Scroll Progress + Nav Shrink (Optimized for 120fps)
    let isScrolling = false;
    const navEl = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            isScrolling = true;
            window.requestAnimationFrame(() => {
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                // Calculate scroll depth for progress indicators
                const docHeight = document.documentElement.scrollHeight;
                const winHeight = window.innerHeight;
                const max = docHeight - winHeight;
                const scrollPercent = max > 0 ? (scrollTop / max) * 100 : 0;
                document.body.style.setProperty('--scroll', `${scrollPercent}%`);

                // Nav scroll-shrink logic
                if (navEl) {
                    if (scrollTop > 20) {
                        navEl.classList.add('scrolled');
                    } else {
                        navEl.classList.remove('scrolled');
                    }
                }
                isScrolling = false;
            });
        }
    }, { passive: true });

    // --- GLOBAL RESIZE THROTTLER ---
    let isResizing = false;
    window.addEventListener('resize', () => {
        if (!isResizing) {
            isResizing = true;
            window.requestAnimationFrame(() => {
                // Global resize events can be handled here if needed (e.g. killing/refreshing GSAP)
                if (typeof window.ScrollTrigger !== 'undefined') {
                    try { window.ScrollTrigger.refresh(); } catch (e) { /* GSAP blocked or version mismatch */ }
                }
                isResizing = false;
            });
        }
    }, { passive: true });


    // 4. Force Scroll To Top on Refresh (HomePage Only)
    // Prevents mobile jumping on index, but allows reading continuity on blogs.
    const path = window.location.pathname;
    const isHome = path === '/' || path.endsWith('index.html') || path === '';
    
    if (isHome) {
        if (history.scrollRestoration) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
        setTimeout(() => window.scrollTo(0, 0), 10);
    }

    // 5. Black Hole Effect for "Enter Archive"
    const bindBlackHole = () => {
        const warpBtn = document.querySelector('.cool-work-link');
        
        if (!warpBtn) return; // No button on this page
        if (warpBtn.dataset.vaultBound === '1') return;

        let active = false;
        let releaseTimer = 0;
        let raf = 0;

        const getCenter = () => {
            const rect = warpBtn.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        };
        const setAttractorCenter = () => {
            if (typeof window.setAttractor === 'function') {
                const c = getCenter();
                window.setAttractor(c.x, c.y);
            }
        };
        const activateVault = () => {
            active = true;
            window.clearTimeout(releaseTimer);
            warpBtn.classList.add('is-black-hole');
            setAttractorCenter();
        };
        const deactivateVault = () => {
            active = false;
            warpBtn.classList.remove('is-black-hole');
            if (typeof window.clearAttractor === 'function') window.clearAttractor();
        };
        const releaseVault = (delay = 0) => {
            window.clearTimeout(releaseTimer);
            releaseTimer = window.setTimeout(deactivateVault, delay);
        };
        const updateVaultCenter = () => {
            if (!active || typeof window.setAttractor !== 'function' || raf) return;
            raf = window.requestAnimationFrame(() => {
                raf = 0;
                if (active) setAttractorCenter();
            });
        };

        warpBtn.addEventListener('pointerenter', activateVault);
        warpBtn.addEventListener('pointerleave', () => releaseVault(90));
        warpBtn.addEventListener('pointermove', updateVaultCenter, { passive: true });
        warpBtn.addEventListener('focusin', activateVault);
        warpBtn.addEventListener('focusout', () => releaseVault(90));
        warpBtn.addEventListener('pointerdown', activateVault, { passive: true });
        warpBtn.addEventListener('pointerup', () => releaseVault(520), { passive: true });
        warpBtn.addEventListener('pointercancel', () => releaseVault(160), { passive: true });

        warpBtn.dataset.vaultBound = '1';
    };
    
    // Start binding process
    bindBlackHole();

    // 6. Portal Dropdown Logic (Removed)

// 7. Site-Wide Initialization

// Global OTP Namespace for Theme Logic & Tests
window.OTP = window.OTP || {};

window.OTP.getThemeIcon = function(theme) {
    if (theme === 'light') {
        // Moon Icon (Switch to Dark)
        return `<svg class="theme-icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    } else {
        // Sun Icon (Switch to Light)
        return `<svg class="theme-icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }
};

window.OTP.normalizeScarcityCopy = function() {
    const scarcityEl = document.getElementById('scarcity-text');
    if (!scarcityEl) return;

    const text = (scarcityEl.textContent || '').trim();
    const hasMonthSlotCopy = /\bslot\s+remaining\s+for\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text);
    const hasMonthLimitedOpenings = /\blimited\s+openings\s*[—-]\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text);

    if (hasMonthSlotCopy || hasMonthLimitedOpenings) {
        scarcityEl.textContent = 'Limited openings — inquire for the next available slot';
    }
};

window.OTP.isManualThemeActive = function() {
    const isManual = localStorage.getItem('theme_manual') === 'true';
    if (!isManual) return false;
    const manualTime = parseInt(localStorage.getItem('theme_manual_time') || '0', 10);
    const active = !!manualTime && Date.now() - manualTime <= 12 * 60 * 60 * 1000;
    if (!active) {
        try {
            localStorage.removeItem('theme_manual');
            localStorage.removeItem('theme_manual_time');
        } catch (e) { /* ignore */ }
    }
    return active;
};

window.OTP.setTheme = function(theme, isManual = false) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    const html = document.documentElement;
    const rootStyle = html.style;
    
    // Fallback if THEME GUARD didn't run for some reason
    let hues = window.OTP_HUES || [{ dark: '0, 236, 255', light: '0, 170, 204' }];
    let hueIndex = window.OTP_HUE_INDEX !== undefined ? window.OTP_HUE_INDEX : 0;
    let selectedHue = hues[hueIndex];
    const contrastText = (rgb) => {
        const parts = String(rgb || '').split(',').map((n) => Number(n.trim()));
        const luminance = ((parts[0] || 0) * 299 + (parts[1] || 0) * 587 + (parts[2] || 0) * 114) / 1000;
        return luminance > 148 ? '#050609' : '#ffffff';
    };

    // ZERO-BLUR PROTOCOL: Freeze transitions/filters during swap
    html.classList.add('is-theme-switching');
    if (selectedHue.name) html.setAttribute('data-refresh-accent', selectedHue.name);
    if (selectedHue.gradient) rootStyle.setProperty('--accent-gradient', selectedHue.gradient);

    if (normalized === 'light') {
        html.setAttribute('data-theme', 'light');
        rootStyle.setProperty('--accent2-rgb', selectedHue.light);
        rootStyle.setProperty('--accent2', `rgb(${selectedHue.light})`);
        rootStyle.setProperty('--accent2-text', contrastText(selectedHue.light));
    } else {
        html.removeAttribute('data-theme');
        rootStyle.setProperty('--accent2-rgb', selectedHue.dark);
        rootStyle.setProperty('--accent2', `rgb(${selectedHue.dark})`);
        rootStyle.setProperty('--accent2-text', contrastText(selectedHue.dark));
    }

    if (!isManual && typeof window.OTP.calculateChronoPhase === 'function') {
        html.setAttribute('data-chrono-phase', window.OTP.calculateChronoPhase());
    }

    // Keep browser chrome and native controls aligned with active theme.
    try {
        html.style.colorScheme = normalized === 'light' ? 'light' : 'dark';
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', normalized === 'light' ? '#eceef2' : '#030305');
        }
    } catch (e) { /* ignore */ }

    // Release freeze after brief frame delay
    requestAnimationFrame(() => {
        setTimeout(() => {
            html.classList.remove('is-theme-switching');
        }, 50);
    });
    
    if (isManual) {
        try {
            localStorage.setItem('theme', normalized);
            localStorage.setItem('theme_manual', 'true');
            localStorage.setItem('theme_manual_time', Date.now().toString());
        } catch (storageErr) {
            console.warn('[OTP] Theme preference not persisted:', storageErr);
        }
    }
    
    // Globally update any toggles on the page
    if (typeof window.OTP.updateAllToggles === 'function') {
        window.OTP.updateAllToggles(normalized);
    }

    hidePageLoader();
};

window.OTP.initTheme = function() {
    const resolveAuto = () => {
        if (typeof window.OTP.getEffectiveThemeForPaint === 'function') {
            return window.OTP.getEffectiveThemeForPaint();
        }
        if (typeof window.OTP.calculateChronoTheme === 'function') {
            return window.OTP.calculateChronoTheme();
        }
        const h = new Date().getHours();
        return 'dark';
    };

    const targetTheme = resolveAuto();
    const isManual = localStorage.getItem('theme_manual') === 'true';
    const manualTime = parseInt(localStorage.getItem('theme_manual_time') || '0', 10);
    const manualActive = isManual && manualTime && Date.now() - manualTime <= 12 * 60 * 60 * 1000;
    console.log(manualActive
        ? `[OTP] Theme: ${targetTheme} (Manual Override Active)`
        : `[OTP] Theme: ${targetTheme} (World Timing Sync)`);

    window.OTP.setTheme(targetTheme);

    if (window.matchMedia && !window.OTP._themeListenerBound) {
        window.OTP._themeListenerBound = true;
        const onSchemeChange = () => {
            const m = localStorage.getItem('theme_manual') === 'true';
            const t = parseInt(localStorage.getItem('theme_manual_time') || '0', 10);
            const expired = !t || Date.now() - t > 12 * 60 * 60 * 1000;
            if (m && !expired) return;
            if (m && expired) {
                try {
                    localStorage.removeItem('theme_manual');
                    localStorage.removeItem('theme_manual_time');
                } catch (e) { /* ignore */ }
            }
            const next = resolveAuto();
            window.OTP.setTheme(next);
        };
        try {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onSchemeChange);
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', onSchemeChange);
        } catch (e) {
            try {
                window.matchMedia('(prefers-color-scheme: dark)').addListener(onSchemeChange);
            } catch (e2) { /* ignore */ }
        }
    }

    // 3. Start Live Sync (Check every 5 minutes)
    setInterval(() => {
        const isManual = localStorage.getItem('theme_manual') === 'true';
        const manualTime = parseInt(localStorage.getItem('theme_manual_time') || '0', 10);
        const isExpired = !manualTime || Date.now() - manualTime > 12 * 60 * 60 * 1000;

        if (!isManual || (isManual && isExpired)) {
            if (isManual && isExpired) {
                try {
                    localStorage.removeItem('theme_manual');
                    localStorage.removeItem('theme_manual_time');
                } catch (e) { /* ignore */ }
            }

            const nextTheme = resolveAuto();
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            if (nextTheme !== currentTheme) {
                console.log(`[OTP] World Timing Sync: Auto-Switching to ${nextTheme}`);
                window.OTP.setTheme(nextTheme);
            }
        }
    }, 5 * 60 * 1000);

    // 4. REFRESH ACCENT SYSTEM: day/night controls light; refresh owns OTP personality.
    const activeHue = window.OTP_ACTIVE_HUE || ((window.OTP_HUES || [])[window.OTP_HUE_INDEX || 0]) || {};
    const spectralRoll = Math.random();
    let variant = '';
    
    // 6% Total Chance (2% each variant) for SITE-WIDE effects
    if (activeHue.name === 'glitch' || spectralRoll < 0.02) variant = 'spectral-revelation'; // V1: Iridescent
    else if (spectralRoll < 0.04) variant = 'spectral-revelation-gold'; // V2: Gold
    else if (spectralRoll < 0.06) variant = 'spectral-revelation-neon'; // V3: Neon

    // CORE BRANDING FIX: "ONLY TRUE PERSPECTIVE" ALWAYS SHOWS SPECIAL COLOR
    // We add a permanent class for the brand itself to ensure it's always high-status.
    document.documentElement.classList.add('otp-brand-synced');

    if (variant) {
        document.documentElement.classList.add(variant, 'spectral-v-sync');
        console.log(`[OTP] SYSTEM_STATE: ${variant.toUpperCase()}_ACTIVE`);
    }

    // Determine the active brand gradient. It follows the refresh accent; gold is one possible accent.
    let brandGradient = activeHue.gradient || 'linear-gradient(135deg, #00ecff, #ff00cc, #ffcc00, #00ecff)';
    if (variant === 'spectral-revelation-gold') brandGradient = 'linear-gradient(135deg, #ffcc00, #ff8800, #ffffff, #ffcc00)';
    if (variant === 'spectral-revelation-neon') brandGradient = 'linear-gradient(135deg, #00ffaa, #00ecff, #ffffff, #00ffaa)';

    const style = document.createElement('style');
    style.textContent = `
        @keyframes spectral-flow-force {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* 1. PERMANENT BRANDING SYNC (Always On for Hero) */
        /* Targets .title AND any SplitType spans (.char, .line, .word) */
        .otp-brand-synced .luxe-title .title,
        .otp-brand-synced .luxe-title .title *,
        .otp-brand-synced .luxe-title .title div {
          background-image: ${brandGradient} !important;
          background-size: 300% 300% !important;
          background-attachment: ${window.innerWidth > 1024 ? 'fixed' : 'scroll'} !important; 
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          animation: spectral-flow-force 12s linear infinite !important;
          opacity: 1 !important;
          visibility: visible !important;
          -webkit-text-stroke: 0px transparent !important;
          text-shadow: none !important;
          will-change: background-position;
        }

        /* Ensure parent spans don't hide children */
        .otp-brand-synced .luxe-title .title {
           display: block !important;
           overflow: visible !important;
        }

        /* 2. CONDITIONAL AURA (SITE-WIDE SECTOR)
           Removed logo/eye glow so 'special color' is unique to brand text */
        .spectral-v-sync .bg-fixed {
          background: radial-gradient(circle at 50% 50%, rgba(var(--accent2-rgb), 0.05), transparent 70%) !important;
        }

        /* Mobile Compatibility Fallback */
        @media (max-width: 768px) {
          .otp-brand-synced .luxe-title .title,
          .otp-brand-synced .luxe-title .title * {
            background-attachment: scroll !important;
            background-size: 200% 200% !important;
          }
        }
    `;
    document.head.appendChild(style);

    return targetTheme;
};

// calculateChronoTheme + getEffectiveThemeForPaint: theme-chrono.js (head)

window.OTP.trackView = async function(slug) {
    if (typeof window.supabase === 'undefined' || !window.OTP_CONFIG) return;
    
    // SECURE UPDATE: Use Server Backend (Bypasses RLS)
    try {
        // Use centralized config
        const apiBase = window.OTP.getApiBase();

        await fetch(`${apiBase}/api/analytics/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug })
        });
    } catch (e) {
        console.warn("[OTP] Analytics Tracking Offline", e);
    }
};

// 7.5 Premium Broadcast UI
// 7.5 Cinematic Transmission Overlay
window.OTP.showBroadcast = function(message) {
    const existing = document.getElementById('otp-broadcast-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'otp-broadcast-overlay';
    overlay.style = `
        position: fixed; inset: 0;
        background: radial-gradient(circle at center, rgba(0,20,40,0.95) 0%, rgba(0,0,0,0.98) 100%);
        backdrop-filter: blur(20px) saturate(1.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 2147483647; color: #fff; text-align: center; 
        font-family: 'Space Grotesk', sans-serif;
        overflow: hidden; pointer-events: auto;
    `;

    // Fix for mobile horizontal scroll & iOS auto-zoom on forms
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        body, html {
            overflow-x: hidden;
        }
        @media (max-width: 768px) {
            input, select, textarea, button {
                font-size: 16px !important;
            }
        }
    `;
    document.head.appendChild(styleElement);

    overlay.innerHTML = `
        <!-- Scanlines -->
        <div style="position:absolute; inset:0; background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03)); background-size: 100% 4px, 3px 100%; pointer-events:none; z-index:1;"></div>
        
        <div class="bc-container" style="position:relative; z-index:2; padding: 60px; max-width: 900px; width: 90%;">
            <!-- Close Button -->
            <button onclick="this.closest('#otp-broadcast-overlay').remove()" style="position:fixed; top:40px; right:40px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); color:#fff; width:44px; height:44px; border-radius:50%; cursor:pointer; font-size:1.2rem; display:flex; align-items:center; justify-content:center; transition:0.3s; z-index:100; backdrop-filter:blur(10px);">×</button>

            <div class="bc-eyebrow" style="font-size: 0.7rem; letter-spacing: 0.5em; color: var(--accent2); margin-bottom: 30px; font-weight: 700; opacity: 0; transform: translateY(20px);">
                <span style="display:inline-block; padding: 4px 12px; border: 1px solid var(--accent2); border-radius: 4px; background: rgba(0,195,255,0.05);">SYSTEM UPLINK ACTIVE</span>
            </div>
            
            <h2 class="bc-title" style="font-size: clamp(1.8rem, 7vw, 4rem); font-weight: 900; line-height: 1.1; margin-bottom: 40px; text-transform: uppercase; font-family: 'Syne', sans-serif; opacity: 0; filter: blur(10px); color: #fff; text-shadow: 0 0 30px rgba(255,255,255,0.2);">
                ${message}
            </h2>
            
            <div class="bc-timer-bar" style="width: 100%; height: 2px; background: rgba(255,255,255,0.05); position:relative; overflow:hidden; border-radius: 2px; opacity: 0;">
                <div class="bc-timer-fill" style="position:absolute; top:0; left:0; height:100%; width:100%; background: var(--accent2); transform-origin: left; box-shadow: 0 0 15px var(--accent2);"></div>
            </div>
            
            <div class="bc-footer" style="margin-top: 30px; font-size: 0.6rem; color: #666; letter-spacing: 3px; font-weight: 600; opacity: 0;">
                SECURE STREAM ESTABLISHED // AUTH_ID: ${Math.random().toString(36).substr(2, 6).toUpperCase()}
            </div>
        </div>

        <style>
            @keyframes bc-glitch {
                0% { transform: translate(0); }
                20% { transform: translate(-2px, 2px); }
                40% { transform: translate(-2px, -2px); }
                60% { transform: translate(2px, 2px); }
                80% { transform: translate(2px, -2px); }
                100% { transform: translate(0); }
            }
            .bc-glitch-active { animation: bc-glitch 0.2s infinite; }
        </style>
    `;

    document.body.appendChild(overlay);

    // GSAP ANIMATION SEQUENCE
    if (typeof gsap !== 'undefined') {
        const tl = gsap.timeline();
        
        // Initial Blur & Pop
        tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power4.out" });
        
        // Content Stagger
        tl.to('.bc-eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" }, "-=0.2");
        
        tl.to('.bc-title', { 
            opacity: 1, 
            filter: 'blur(0px)', 
            duration: 0.8, 
            ease: "expo.out",
            onStart: () => overlay.querySelector('.bc-title').classList.add('bc-glitch-active'),
            onComplete: () => setTimeout(() => overlay.querySelector('.bc-title').classList.remove('bc-glitch-active'), 500)
        }, "-=0.4");

        tl.to('.bc-timer-bar', { opacity: 1, duration: 0.4 }, "-=0.4");
        tl.to('.bc-footer', { opacity: 1, duration: 0.4 }, "-=0.2");

        // Timer Fill Animation (5 seconds)
        gsap.fromTo('.bc-timer-fill', 
            { scaleX: 1 }, 
            { scaleX: 0, duration: 6, ease: "none" }
        );

        // Auto Logout / Dismiss
        tl.to(overlay, { 
            opacity: 0, 
            scale: 1.1, 
            filter: 'blur(20px)',
            duration: 1, 
            delay: 5, 
            ease: "power4.in",
            onComplete: () => overlay.remove() 
        });

    } else {
        // Fallback for no GSAP
        setTimeout(() => {
            overlay.style.transition = 'opacity 1s ease';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 1000);
        }, 6000);
    }
};

// Run init immediately — never block page render if theme setup fails
try {
    if (window.OTP && typeof window.OTP.initTheme === 'function') {
        window.OTP.initTheme();
    }
} catch (themeInitErr) {
    console.warn('[OTP] Theme init failed; using head paint defaults:', themeInitErr);
    hidePageLoader();
}

// 8. REALTIME SITE STATE (Sync Dashboard Controls)

// 8. REALTIME SITE STATE (Sync Dashboard Controls)
window.OTP.initRealtimeState = async function() {
    // SAFETY: Never sync on Admin/Portal
    if (window.location.pathname.includes('otp-terminal') || 
        window.location.pathname.includes('portal')) return;
    if (navigator.webdriver && !(window.OTP_CONFIG && window.OTP_CONFIG.allowRealtimeInAutomation)) return;

    if (window.__OTP_INIT_REALTIME_STATE__) return;

    // WAIT FOR DEPENDENCIES
    let attempts = 0;
    while ((typeof window.supabase === 'undefined' || !window.OTP_CONFIG) && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    
    if (typeof window.supabase === 'undefined' || !window.OTP_CONFIG) {
        console.warn("📡 REALTIME: Dependencies timed out.");
        return;
    }

    const client = window.OTP.getSupabase();
    if (!client) {
        console.warn("📡 REALTIME: Supabase Client offline.");
        return;
    }

    // Lock after deps exist so a failed/timed-out first attempt can retry on a future call.
    window.__OTP_INIT_REALTIME_STATE__ = true;
    
    // 8.1 Fetch Remote State on Load (Sticky Config)
    try {
        const { data, error } = await client
            .from('posts')
            .select('content')
            .eq('slug', 'system-global-state')
            .single();
        
        if (data && data.content) {
            let config;
            try {
                config = JSON.parse(data.content);
            } catch (parseErr) {
                console.error('📡 REALTIME: Invalid system-global-state JSON', parseErr);
                config = null;
            }
            if (!config || typeof config !== 'object') {
                /* fall through to Realtime subscribe only */
            } else {
            console.log("📡 REMOTE STATE SYNC:", config);
            
            // Apply Maintenance IMMEDIATELY
            if (config.maintenance === 'on') {
                document.body.style.visibility = 'hidden'; // Hide while rendering maintenance
                document.body.innerHTML = `
                    <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #fff; font-family: 'Space Grotesk', sans-serif; text-align: center; padding: 20px; visibility: visible !important;">
                        <h1 style="font-size: 3rem; margin-bottom: 10px;">SYSTEM MAINTENANCE</h1>
                        <p style="opacity: 0.5; letter-spacing: 2px;">WE ARE CURRENTLY CALIBRATING THE FEED. STANDBY.</p>
                        <div style="margin-top: 30px; width: 40px; height: 1px; background: #333;"></div>
                    </div>
                `;
                document.body.style.visibility = 'visible';
                return; // STOP EXECUTION
            }

            // Apply Visuals (match broadcast branch: perf-mode + otp-fx-change)
            if (config.visuals) {
                const requestedVisuals = String(config.visuals).toLowerCase();
                const starsDisabled = ['off', 'none', 'disabled'].includes(requestedVisuals);
                const intensity = requestedVisuals === 'high' ? 'high' : 'low';
                document.documentElement.setAttribute('data-fx-intensity', intensity);
                window.FX_INTENSITY = intensity;
                const highFi = intensity === 'high';
                document.documentElement.classList.toggle('perf-mode', !highFi);
                window.dispatchEvent(new CustomEvent('otp-fx-change', { detail: { intensity } }));
                const canvas = document.getElementById('cursor-canvas');
                if (starsDisabled) {
                    document.documentElement.setAttribute('data-stars', 'disabled');
                } else if (canvas && canvas.classList.contains('stars-mounted')) {
                    document.documentElement.setAttribute('data-stars', 'mounted');
                } else {
                    document.documentElement.removeAttribute('data-stars');
                }
                if (canvas) {
                    canvas.classList.toggle('stars-disabled', starsDisabled);
                    canvas.style.removeProperty('display');
                }
            }
            
             // Apply Kursor
            if (config.kursor) {
                const kNodes = document.querySelectorAll('.kursor, .kursor-child');
                kNodes.forEach(n => n.style.opacity = config.kursor === 'on' ? '1' : '0');
            }
            
            // Local chrono/manual theme owns public display; remote config must not override night/day.
            if (config.theme && !window.location.pathname.includes('otp-terminal')) {
                localStorage.setItem('last_global_theme', config.theme);
            }

            // Footer / strip status (same payload terminal persists as `status`)
            if (config.status != null && String(config.status).trim() !== '') {
                const line = String(config.status).toUpperCase();
                const statusHost = document.getElementById('siteStatus');
                const textEl = statusHost?.querySelector('.status-text');
                if (textEl) textEl.textContent = `SYSTEM: ${line}`;
            }
            }
        }
    } catch(e) { console.error("Config Sync Error:", e); }

    // Listen for Site Commands — MUST match OTP Terminal (`admin-core.js` channel `otp-uplink`).
    const channel = client.channel('otp-uplink');

    channel.on('broadcast', { event: 'command' }, (message) => {
        console.log("📡 INCOMING COMMAND:", message);
        const { type, value } = message.payload || {};
        
        if (type === 'maintenance') {
            // SAFETY: Ignore on Admin/Portal
            if (window.location.pathname.includes('otp-terminal') || 
                window.location.pathname.includes('portal')) return;

            if (value === 'on') {
                document.body.innerHTML = `
                    <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #fff; font-family: 'Space Grotesk', sans-serif; text-align: center; padding: 20px;">
                        <h1 style="font-size: 3rem; margin-bottom: 10px;">SYSTEM MAINTENANCE</h1>
                        <p style="opacity: 0.5; letter-spacing: 2px;">WE ARE CURRENTLY CALIBRATING THE FEED. STANDBY.</p>
                        <div style="margin-top: 30px; width: 40px; height: 1px; background: #333;"></div>
                    </div>
                `;
            } else { location.reload(); }
        }

        if (type === 'theme') {
            // Public pages use local chrono/manual theme, so global broadcasts are recorded only.
            localStorage.setItem('last_global_theme', value);

            // Visual transition
            if (typeof gsap !== 'undefined') {
                gsap.fromTo('body', { opacity: 0.5 }, { opacity: 1, duration: 0.6, ease: "power2.out" });
            }
        }
        if (type === 'refresh') location.reload();
        if (type === 'alert') window.OTP.showBroadcast(value);
        
        if (type === 'visuals') {
            const requestedVisuals = String(value).toLowerCase();
            const starsDisabled = ['off', 'none', 'disabled'].includes(requestedVisuals);
            const intensity = requestedVisuals === 'high' ? 'high' : 'low';
            document.documentElement.setAttribute('data-fx-intensity', intensity);
            window.FX_INTENSITY = intensity;
            const highFi = intensity === 'high';
            document.documentElement.classList.toggle('perf-mode', !highFi);
            window.dispatchEvent(new CustomEvent('otp-fx-change', { detail: { intensity } }));
            const canvas = document.getElementById('cursor-canvas');
            if (starsDisabled) {
                document.documentElement.setAttribute('data-stars', 'disabled');
            } else if (canvas && canvas.classList.contains('stars-mounted')) {
                document.documentElement.setAttribute('data-stars', 'mounted');
            } else {
                document.documentElement.removeAttribute('data-stars');
            }
            if (canvas) {
                canvas.classList.toggle('stars-disabled', starsDisabled);
                canvas.style.removeProperty('display');
            }
        }

        if (type === 'kursor') {
            const kNodes = document.querySelectorAll('.kursor, .kursor-child');
            kNodes.forEach(n => n.style.opacity = value === 'on' ? '1' : '0');
        }

        if (type === 'status') {
            const line = String(value != null ? value : '').trim();
            const upper = line.toUpperCase();
            const statusEl = document.getElementById('siteStatus');
            const textEl = statusEl?.querySelector('.status-text');
            if (textEl && upper) textEl.textContent = `SYSTEM: ${upper}`;
            document.querySelectorAll('#footer-status').forEach((el) => {
                el.textContent = upper ? `SYSTEM: ${upper}` : el.textContent;
            });
            if (upper && statusEl && window.gsap) {
                window.gsap.fromTo(statusEl, { opacity: 0.35 }, { opacity: 1, duration: 0.45, repeat: 2, yoyo: true });
            }
        }

        if (type === 'warp') {
            // SAFETY: Ignore on Admin/Portal
            if (window.location.pathname.includes('otp-terminal') || 
                window.location.pathname.includes('portal') ||
                window.location.pathname.includes('404')) return;

            let dest = String(value || '').trim();
            if (!dest || /^(javascript|data|vbscript):/i.test(dest)) return;
            if (!/^https?:\/\//i.test(dest)) dest = 'https://' + dest;
            let href;
            try {
                const u = new URL(dest);
                if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
                href = u.href;
            } catch (_) {
                return;
            }

            window.OTP.showBroadcast('NETWORK WARP INITIATED: REDIRECTING TO ' + href);
            setTimeout(() => { window.location.href = href; }, 5000);
        }
    }).subscribe((status) => {
        console.log("📡 SITE COMMAND CHANNEL (otp-uplink):", status);
    });

    // Init Presence
    const sessionId = 'visitor-' + Math.random().toString(36).substring(2, 9);
    const room = client.channel('system', {
        config: { presence: { key: sessionId } }
    });
    room.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await room.track({ 
                id: sessionId,
                online_at: new Date().toISOString(), 
                page: window.location.pathname || 'index.html',
                agent: navigator.userAgent,
                lang: navigator.language || 'en-US',
                screen: `${window.innerWidth}x${window.innerHeight}`
            });
        }
    });
};

// 9. LIVE SITE EDITOR (Admin Only)
window.OTP.initLiveEditor = async function() {
    if (typeof window.supabase === 'undefined' || !window.OTP_CONFIG) return;
    
    const client = window.OTP.getSupabase();
    if (!client) return;
    const params = new URLSearchParams(window.location.search);
    const isEditMode = params.get('mode') === 'edit';
    const token = localStorage.getItem('otp_admin_token');

    // 9.1 Fetch & Apply Content (Always run)
    try {
        const { data: contentRows, error } = await client.from('site_content').select('*');
        if (!error && contentRows) {
            contentRows.forEach(row => {
                const el = document.getElementById(row.key);
                if (el) el.innerHTML = window.OTP.sanitizeHtml(row.content);
            });
            if (typeof window.OTP.normalizeScarcityCopy === 'function') {
                window.OTP.normalizeScarcityCopy();
            }
            console.log(`[OTP] Loaded ${contentRows.length} dynamic content blocks.`);
        }
    } catch (e) {
        console.warn("[OTP] Content Load Error:", e);
    }

    // 9.2 Init Editor UI (Only if authorized & mode=edit)
    if (isEditMode && token) {
        console.log("📝 LIVE EDITOR ACTIVE");
        document.body.classList.add('otp-edit-mode');

        // Inject Styles
        const style = document.createElement('style');
        style.innerHTML = `
            .otp-edit-mode [data-editable] {
                outline: 2px dashed rgba(0, 255, 170, 0.3);
                cursor: text;
                transition: outline 0.2s;
            }
            .otp-edit-mode [data-editable]:hover,
            .otp-edit-mode [data-editable]:focus {
                outline: 2px solid #00ffaa;
                background: rgba(0, 255, 170, 0.05);
            }
            .otp-editor-toolbar {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: #111;
                border: 1px solid #333;
                padding: 10px 20px;
                border-radius: 50px;
                display: flex;
                gap: 15px;
                z-index: 99999;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                align-items: center;
            }
            .otp-editor-btn {
                background: transparent;
                color: #fff;
                border: 1px solid #444;
                padding: 8px 16px;
                border-radius: 20px;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 0.8rem;
                cursor: pointer;
                transition: 0.2s;
            }
            .otp-editor-btn.save { background: #00ffaa; color: #000; border: none; font-weight: bold; }
            .otp-editor-btn:hover { transform: translateY(-2px); }
        `;
        document.head.appendChild(style);

        // Make Editable
        const editables = document.querySelectorAll('[data-editable]');
        editables.forEach(el => {
            el.contentEditable = "true";
        });

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'otp-editor-toolbar';
        toolbar.innerHTML = `
            <span style="color:#666; font-size:0.75rem; font-family:monospace;">LIVE EDITOR</span>
            <button class="otp-editor-btn save" onclick="window.OTP.saveContent()">SAVE CHANGES</button>
            <button class="otp-editor-btn" onclick="window.location.search=''">EXIT</button>
        `;
        document.body.appendChild(toolbar);

        // Save Function (SECURE PROXY)
        window.OTP.saveContent = async function() {
            const btn = document.querySelector('.otp-editor-btn.save');
            if (!btn) return;
            btn.textContent = "SAVING...";
            
            const updates = [];
            document.querySelectorAll('[data-editable]').forEach(el => {
                if(el.id) {
                    updates.push({
                        key: el.id,
                        content: el.innerHTML.trim()
                    });
                }
            });

            const token = localStorage.getItem('otp_admin_token');
            if (!token) {
                alert("Session Expired. Please login via Terminal.");
                return;
            }

            try {
                // Use Secure Backend Proxy
                const apiBase = window.OTP.getApiBase();
                const res = await fetch(`${apiBase}/api/content/update`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ updates })
                });

                const result = await res.json();
                if(!result.success) throw new Error(result.message);
                
                btn.textContent = "SAVED!";
                setTimeout(() => btn.textContent = "SAVE CHANGES", 2000);
                
                // 1. Local Feedback
                window.OTP.showBroadcast("SITE CONTENT UPDATED");

                // 2. Network Broadcast (Vice-Versa Sync)
                // We still use the client channel for realtime NOTIFICATION, just not storage
                const channel = client.channel('otp-uplink');
                channel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        channel.send({
                            type: 'broadcast',
                            event: 'command',
                            payload: { type: 'alert', value: 'Global Site Content Updated' }
                        });
                    }
                });
            } catch(e) {
                console.error(e);
                alert("Save Failed: " + String(e && e.message != null ? e.message : e));
                btn.textContent = "RETRY";
            }
        };
    }
};

function initSite() {
    if (window.OTP && typeof window.OTP.normalizeScarcityCopy === 'function') {
        window.OTP.normalizeScarcityCopy();
    }

    (function initLazyEmbeds() {
        const embeds = document.querySelectorAll('iframe[data-src]');
        if (!embeds.length) return;

        const loadEmbed = (iframe) => {
            if (!iframe || iframe.dataset.loaded === 'true') return;
            const raw = iframe.getAttribute('data-src');
            if (!raw) return;
            const safe = window.OTP && typeof window.OTP.sanitizeHttpUrl === 'function'
                ? window.OTP.sanitizeHttpUrl(raw)
                : '';
            if (!safe) return;
            iframe.src = safe;
            iframe.dataset.loaded = 'true';
        };

        if (!('IntersectionObserver' in window)) {
            embeds.forEach(loadEmbed);
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                loadEmbed(entry.target);
                obs.unobserve(entry.target);
            });
        }, { rootMargin: '250px 0px', threshold: 0.01 });

        embeds.forEach((iframe) => observer.observe(iframe));
    })();

    (function initYoutubeVideoSections() {
        const featuredRoot = document.querySelector('[data-video-feed="featured"]');
        const archiveRoot = document.querySelector('[data-video-feed="archive"]');
        if (!featuredRoot && !archiveRoot) return;

        const lib = window.OTP_VIDEO_LIBRARY;
        const fallbackVideos = lib && typeof lib.getFallbackVideos === 'function'
            ? lib.getFallbackVideos()
            : [];

        const safeUrl = (raw) => {
            if (window.OTP && typeof window.OTP.sanitizeHttpUrl === 'function') {
                return window.OTP.sanitizeHttpUrl(raw);
            }
            try {
                const url = new URL(String(raw || ''), window.location.origin);
                return (url.protocol === 'http:' || url.protocol === 'https:') ? url.toString() : '';
            } catch (e) {
                return '';
            }
        };

        const text = (value, fallback = '') => {
            const raw = String(value == null ? '' : value)
                .replace(/[\u0000-\u001f\u007f]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            return raw || fallback;
        };

        const formatVideoDate = (video) => {
            if (video && video.publishedAt) {
                const date = new Date(video.publishedAt);
                if (!Number.isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }
            }
            return text(video && video.year, 'OTP Archive');
        };

        const createBadge = (label, className) => {
            const badge = document.createElement('span');
            badge.className = className || 'otp-platform-badge';
            badge.textContent = label;
            return badge;
        };

        const createVideoImage = (video, className) => {
            const img = document.createElement('img');
            img.className = className;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = text(video.title, 'OTP video thumbnail');
            img.src = safeUrl(video.thumbnail) || `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`;
            img.addEventListener('error', () => {
                img.removeAttribute('src');
                img.classList.add('otp-video-img-missing');
            }, { once: true });
            return img;
        };

        const createVideoActions = (video, watchLabel) => {
            const actions = document.createElement('div');
            actions.className = 'otp-video-card-actions';

            const watchUrl = safeUrl(video.url);
            if (watchUrl) {
                const watch = document.createElement('a');
                watch.className = 'otp-video-action otp-video-action-primary';
                watch.href = watchUrl;
                watch.target = '_blank';
                watch.rel = 'noopener noreferrer';
                watch.textContent = watchLabel || 'Watch';
                actions.appendChild(watch);
            }

            if (video.bookable !== false) {
                const book = document.createElement('a');
                book.className = 'otp-video-action otp-video-action-secondary';
                book.href = '/bookings';
                book.textContent = 'Book Similar Work';
                actions.appendChild(book);
            }

            return actions;
        };

        const makeVideoCardClickable = (card, video) => {
            const watchUrl = safeUrl(video && video.url);
            if (!card || !watchUrl) return;
            card.classList.add('is-clickable');
            card.setAttribute('aria-label', `${text(video.title, 'OTP video')} - open video`);
            card.addEventListener('click', (event) => {
                if (event.target && event.target.closest && event.target.closest('a, button, input, textarea, select')) return;
                window.open(watchUrl, '_blank', 'noopener,noreferrer');
            });
        };

        const createFeaturedCard = (video) => {
            const card = document.createElement('article');
            card.className = 'work-card-mini otp-video-card k-hover';
            card.dataset.videoId = video.id;

            const thumb = document.createElement('div');
            thumb.className = 'work-thumb-visual portfolio-visual';
            thumb.appendChild(createVideoImage(video, 'work-img-full'));

            const scanline = document.createElement('div');
            scanline.className = 'scanline-overlay';
            thumb.appendChild(scanline);

            const overlay = document.createElement('div');
            overlay.className = 'work-overlay-info';
            overlay.appendChild(createBadge('YouTube', 'work-type-tag'));
            thumb.appendChild(overlay);
            card.appendChild(thumb);

            const meta = document.createElement('div');
            meta.className = 'work-meta-mini otp-video-meta';
            meta.appendChild(createBadge('YouTube', 'otp-platform-badge'));

            const title = document.createElement('h3');
            title.className = 'work-title-mini';
            title.textContent = text(video.title, 'OTP video');
            meta.appendChild(title);

            const description = document.createElement('p');
            description.className = 'otp-video-description';
            description.textContent = text(video.description, 'Watch the latest OTP video and book creative work for your own project.');
            meta.appendChild(description);

            const row = document.createElement('div');
            row.className = 'otp-card-meta-row';
            row.appendChild(createBadge(text(video.category, 'Video / Recap'), 'otp-category-pill'));
            row.appendChild(createBadge(formatVideoDate(video), 'otp-date-pill'));
            meta.appendChild(row);
            meta.appendChild(createVideoActions(video, video.id === 'j70o4Psmxfk' ? 'Watch Recap' : 'Watch'));
            card.appendChild(meta);
            makeVideoCardClickable(card, video);
            return card;
        };

        const createArchiveCard = (video) => {
            const card = document.createElement('article');
            card.className = 'project-card otp-archive-card k-hover';
            card.dataset.category = text(video.category, 'Video / Recap');
            card.dataset.videoId = video.id;

            card.appendChild(createVideoImage(video, 'project-img-static'));

            const overlay = document.createElement('div');
            overlay.className = 'project-overlay otp-project-overlay';

            const top = document.createElement('div');
            top.className = 'otp-archive-card-topline';
            top.appendChild(createBadge('YouTube', 'otp-platform-badge'));
            top.appendChild(createBadge(formatVideoDate(video), 'otp-date-pill'));
            overlay.appendChild(top);

            const title = document.createElement('h3');
            title.textContent = text(video.title, 'OTP video');
            overlay.appendChild(title);

            const category = document.createElement('span');
            category.className = 'otp-archive-category';
            category.textContent = text(video.category, 'Video / Recap');
            overlay.appendChild(category);

            const description = document.createElement('p');
            description.className = 'otp-video-description';
            description.textContent = text(video.description, 'A moment from the OTP vault.');
            overlay.appendChild(description);
            overlay.appendChild(createVideoActions(video, video.id === 'j70o4Psmxfk' ? 'Watch Recap' : 'Watch'));
            card.appendChild(overlay);
            makeVideoCardClickable(card, video);
            return card;
        };

        const setEmptyState = (root, message) => {
            root.replaceChildren();
            const empty = document.createElement('div');
            empty.className = 'otp-video-empty';
            empty.textContent = message || 'No videos are available right now.';
            root.appendChild(empty);
        };

        const renderFeatured = (videos, fallbackUsed) => {
            if (!featuredRoot) return;
            const selected = lib && typeof lib.getFeaturedVideos === 'function'
                ? lib.getFeaturedVideos(videos, 4)
                : videos.slice(0, 4);
            if (!selected.length) return setEmptyState(featuredRoot, 'Recent work is updating. Check back shortly.');
            featuredRoot.replaceChildren(...selected.map(createFeaturedCard));
            featuredRoot.dataset.syncState = fallbackUsed ? 'fallback' : 'live';
        };

        const renderArchive = (videos, fallbackUsed) => {
            if (!archiveRoot) return;
            if (!videos.length) return setEmptyState(archiveRoot, 'The Vault is updating. Check back shortly.');
            archiveRoot.replaceChildren(...videos.map(createArchiveCard));
            archiveRoot.dataset.syncState = fallbackUsed ? 'fallback' : 'live';
            wireArchiveFilters();
        };

        const wireArchiveFilters = () => {
            const buttons = Array.from(document.querySelectorAll('.filter-btn[data-filter]'));
            const cards = Array.from(document.querySelectorAll('[data-video-feed="archive"] .project-card'));
            if (!buttons.length || !cards.length) return;

            const applyFilter = (filter) => {
                const next = text(filter, 'All');
                buttons.forEach((button) => button.classList.toggle('active', button.dataset.filter === next));
                cards.forEach((card) => {
                    const matches = next === 'All' || card.dataset.category === next;
                    card.hidden = !matches;
                });
            };

            buttons.forEach((button) => {
                if (button.dataset.otpFilterWired === 'true') return;
                button.dataset.otpFilterWired = 'true';
                button.addEventListener('click', () => applyFilter(button.dataset.filter));
            });

            const active = buttons.find((button) => button.classList.contains('active')) || buttons[0];
            applyFilter(active ? active.dataset.filter : 'All');
        };

        const getVideos = async () => {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 7000);
            try {
                const apiBase = window.OTP && typeof window.OTP.getApiBase === 'function'
                    ? window.OTP.getApiBase()
                    : window.location.origin;
                const endpoint = new URL('/api/youtube/videos', apiBase).toString();
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    signal: controller.signal
                });
                const data = await response.json().catch(() => null);
                if (!response.ok || !data || !Array.isArray(data.videos)) throw new Error('Video API unavailable');
                const videos = lib && typeof lib.mergeVideoLists === 'function'
                    ? lib.mergeVideoLists(data.videos, fallbackVideos)
                    : data.videos;
                return { videos, fallbackUsed: data.fallbackUsed === true || data.ok === false };
            } finally {
                window.clearTimeout(timer);
            }
        };

        getVideos()
            .catch(() => ({ videos: fallbackVideos, fallbackUsed: true }))
            .then(({ videos, fallbackUsed }) => {
                const normalized = lib && typeof lib.mergeVideoLists === 'function'
                    ? lib.mergeVideoLists(videos, fallbackVideos)
                    : videos;
                renderFeatured(normalized, fallbackUsed);
                renderArchive(normalized, fallbackUsed);
                document.dispatchEvent(new CustomEvent('otp:videos-rendered', {
                    detail: { fallbackUsed, count: normalized.length }
                }));
            });
    })();

    (function injectThemeToggle() {
        if (window.OTP_THEME_TOGGLE_INJECTED) return;
        // Don't inject on Admin/Dashboard (they handle it manually)
        if (window.location.pathname.includes('otp-terminal.html') || window.location.pathname.includes('portal-gate.html')) return;
        
        window.OTP_THEME_TOGGLE_INJECTED = true;

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const currentTheme = isLight ? 'light' : 'dark';
        
        // Helper: Update all toggle buttons on page
        window.OTP.updateAllToggles = (theme) => {
            const icon = window.OTP.getThemeIcon(theme);
            document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
                // Determine if it's the mobile one (has text) or desktop (icon only) based on class
                const isMobileBtn = btn.classList.contains('mobile-theme-toggle');
                const nextLabel = theme === 'light' ? 'Switch to night theme' : 'Switch to day theme';
                btn.setAttribute('aria-label', nextLabel);
                btn.setAttribute('title', nextLabel);
                
                // Animate
                btn.style.transform = 'scale(0.8) rotate(90deg)';
                setTimeout(() => {
                    if (isMobileBtn) {
                        btn.innerHTML = icon + '<span style="margin-left:10px; font-weight:600; font-size: 0.9rem; white-space: nowrap;">Switch Theme</span>';
                        btn.style.background = theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
                    } else {
                        btn.innerHTML = icon;
                    }
                    btn.style.transform = 'scale(1) rotate(0deg)';
                }, 150);
            });
        };

        // Shared Click Handler
        const handleToggle = () => {
            const wasLight = document.documentElement.getAttribute('data-theme') === 'light';
            const newTheme = wasLight ? 'dark' : 'light';
            
            // Passing true for isManual
            window.OTP.setTheme(newTheme, true);
        };

        // Create Main Toggle (Desktop)
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'theme-toggle-btn';
        toggleBtn.ariaLabel = currentTheme === 'light' ? 'Switch to night theme' : 'Switch to day theme';
        toggleBtn.innerHTML = window.OTP.getThemeIcon(currentTheme);
        toggleBtn.addEventListener('click', handleToggle);

        // Inject Desktop Toggle as Fixed FAB (Bottom-Right)
        document.body.appendChild(toggleBtn);

        // Inject Mobile Drawer Toggle (inside Drawer; keep visible without scrolling)
        const navDrawer = document.querySelector('.nav-drawer');
        if (navDrawer) {
            const mobileToggle = document.createElement('button');
            mobileToggle.className = 'theme-toggle-btn mobile-theme-toggle';
            mobileToggle.ariaLabel = currentTheme === 'light' ? 'Switch to night theme' : 'Switch to day theme';
            // Inline styles for mobile layout
            mobileToggle.style.marginLeft = '0';
            mobileToggle.style.marginTop = '0';
            mobileToggle.style.setProperty('width', '100%', 'important');
            mobileToggle.style.borderRadius = '12px';
            mobileToggle.style.justifyContent = 'center';
            mobileToggle.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
            mobileToggle.innerHTML = window.OTP.getThemeIcon(currentTheme) + '<span style="margin-left:10px; font-weight:600; font-size: 0.9rem; white-space: nowrap;">Switch Theme</span>';
            
            mobileToggle.addEventListener('click', handleToggle);
            // Insert near the top so it’s visible immediately on mobile.
            const firstLink = navDrawer.querySelector('a');
            if (firstLink) navDrawer.insertBefore(mobileToggle, firstLink);
            else navDrawer.appendChild(mobileToggle);
        }
    })();

    // --- SCROLL SPY (Active Link on Scroll) ---
    const sectionIds = ['work', 'services', 'contact'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(el => el);
    const spyLinks = document.querySelectorAll('.nav-links a, .nav-drawer a');
    
    if (sections.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    spyLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        // Match either '#id' or 'index.html#id'
                        if (href === `#${id}` || href === `index.html#${id}`) {
                            spyLinks.forEach(l => l.classList.remove('active'));
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 }); // Trigger when section is in middle
        
        sections.forEach(s => observer.observe(s));
    }
    
    /**
     * Security Utility: Escape HTML
     * Prevents XSS in innerHTML injections
     */
    window.escapeHtml = function(text) {
        if (text === undefined || text === null) return '';
        return text
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // --- ACTIVE LINK LOGIC & CLICK SCROLL ---
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .nav-drawer a, .book-btn[href^="#"], .book-btn[href*="index.html#"]');
    
    // Normalize path (handle root / vs index.html)
    const normalize = (p) => (p === '/' || p.endsWith('index.html')) ? 'index.html' : p;
    const effectivePath = normalize(currentPath);

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Initial Active State
        if (normalize(href) === effectivePath || (effectivePath === 'index.html' && href === 'index.html')) {
             if (!href.startsWith('#')) {
                 navLinks.forEach(l => l.classList.remove('active'));
                 link.classList.add('active');
             }
        }

        // Click Handler for Smooth Scroll & Active State
        link.addEventListener('click', (e) => {
            const currentPath = window.location.pathname;
            const isHome = currentPath === '/' || currentPath.endsWith('index.html');
            let targetId = null;

            // GLOBAL MOBILE FIX: Always unlock body on any drawer link click
            if (document.body.classList.contains('nav-open')) {
                 document.body.classList.remove('nav-open');
                document.documentElement.classList.remove('nav-open');
                 const drawer = document.querySelector('.nav-drawer');
                 if (drawer) drawer.classList.remove('open');
                 const btn = document.querySelector('.nav-toggle');
                 if (btn) btn.setAttribute('aria-expanded', 'false');
            }

            if (href.startsWith('#')) {
                targetId = href.substring(1);
            } else if (isHome && href.includes('index.html#')) {
                targetId = href.split('#')[1];
            }

            if (targetId) {
                const targetEl = document.getElementById(targetId);
                
                if (targetEl) {
                    e.preventDefault();
                    
                    // Smooth Scroll leveraging native CSS scroll-margin-top
                    setTimeout(() => {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 10); // Tiny delay to ensure layout unlocks

                    // Update Active State
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            }
        });
    });

    // --- IDENTITY CARD & PHYSICS ---
    const card = document.querySelector('.glass-manifesto');
    const bootIdentityCard = () => {
    if (!card) return;
        let targetX = 0, targetY = 0;
        let currentX = 0, currentY = 0;
        let targetEyeX = 0, targetEyeY = 0;
        let currentEyeX = 0, currentEyeY = 0;
        let bgTargetX = 50, bgTargetY = 50;
        let bgCurrentX = 50, bgCurrentY = 50;
        
        const isMobileDevice = window.matchMedia("(hover: none)").matches;
        const reducedCardMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const lerp = (start, end, amt) => start * (1 - amt) + end * amt;
        const identityMotionDisabled = () => reducedCardMotion.matches;
        const identityPerformanceLite = () => (
            document.documentElement.classList.contains('stars-performance-mode')
            || document.documentElement.hasAttribute('data-otp-performance-mode')
        );
        const identityMotionProfile = () => {
            if (identityMotionDisabled()) {
                return { tilt: 0, float: 0, eye: 0, lerp: 1 };
            }
            if (identityPerformanceLite()) {
                return { tilt: 10, float: 5, eye: 0.55, lerp: 0.09 };
            }
            return { tilt: 22, float: 8, eye: 1, lerp: 0.1 };
        };

        const applyPointerTargets = (x, y, rect) => {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const profile = identityMotionProfile();
            targetX = ((y - centerY) / centerY) * -profile.tilt;
            targetY = ((x - centerX) / centerX) * profile.tilt;
            bgTargetX = (x / rect.width) * 100;
            bgTargetY = (y / rect.height) * 100;

            const ex = x - centerX;
            const ey = y - centerY;
            targetEyeX = (ex / rect.width) * 45 * profile.eye;
            targetEyeY = (ey / rect.height) * 40 * profile.eye;
        };

        const handlePointerMove = (e) => {
            if (identityMotionDisabled() || isMobileDevice) return;
            const rect = card.getBoundingClientRect();
            applyPointerTargets(e.clientX - rect.left, e.clientY - rect.top, rect);
        };

        card.addEventListener('mousemove', handlePointerMove);
        card.addEventListener('pointermove', handlePointerMove);

        card.addEventListener('mouseleave', () => {
            targetX = 0; targetY = 0;
            bgTargetX = 50; bgTargetY = 50;
            targetEyeX = 0; targetEyeY = 0;
        });

        const handleOrientation = (e) => {
            if (identityMotionDisabled()) return;
            const profile = identityMotionProfile();
            const gamma = e.gamma || 0;
            const beta = e.beta || 0;
            const tilt = profile.tilt;
            targetX = Math.min(Math.max(beta / 1.5, -tilt), tilt) * -1;
            targetY = Math.min(Math.max(gamma / 1.5, -tilt), tilt);
            bgTargetX = 50 + (gamma / 90 * 45 * profile.eye);
            bgTargetY = 50 + (beta / 90 * 45 * profile.eye);
        };

        const enableGyro = async () => {
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') window.addEventListener('deviceorientation', handleOrientation);
                } catch (e) { console.log('Gyro error', e); }
            } else {
                window.addEventListener('deviceorientation', handleOrientation);
            }
        };

        if (isMobileDevice) {
            document.body.addEventListener('touchstart', enableGyro, { once: true });
        }

        let startTime = Date.now();
        let animationFrameId = null;
        let isCardVisible = false;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isCardVisible = entry.isIntersecting;
                if (isCardVisible && !animationFrameId) {
                    update();
                } else if (!isCardVisible && animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            });
        }, { threshold: 0.1 });

        observer.observe(card);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && isCardVisible && !animationFrameId) {
                update();
            }
        }, { passive: true });

        function update() {
            if (!isCardVisible || document.visibilityState !== 'visible') {
                animationFrameId = null;
                return;
            }

            const profile = identityMotionProfile();
            const elapsed = (Date.now() - startTime) / 1000;
            const floatY = identityMotionDisabled() ? 0 : Math.sin(elapsed * 1.0) * profile.float;

            currentX = lerp(currentX, targetX, profile.lerp);
            currentY = lerp(currentY, targetY, profile.lerp);
            bgCurrentX = lerp(bgCurrentX, bgTargetX, profile.lerp);
            bgCurrentY = lerp(bgCurrentY, bgTargetY, profile.lerp);
            currentEyeX = lerp(currentEyeX, targetEyeX, profile.lerp);
            currentEyeY = lerp(currentEyeY, targetEyeY, profile.lerp);

            // Apply to CSS variables
            card.style.setProperty('--rotateX', `${currentX}deg`);
            card.style.setProperty('--rotateY', `${currentY}deg`);
            card.style.setProperty('--bgX', `${bgCurrentX}%`);
            card.style.setProperty('--bgY', `${bgCurrentY}%`);
            card.style.setProperty('--floatY', `${floatY}px`);
            card.style.setProperty('--eyeX', `${currentEyeX}px`);
            card.style.setProperty('--eyeY', `${currentEyeY}px`);
            
            animationFrameId = requestAnimationFrame(update);
        }
    };
    if (card) scheduleAfterFirstPaint(bootIdentityCard, 2400);

    // --- MOBILE NAV DRAWER (iOS/Safari reliable) ---
    (function bindMobileNavDrawer() {
        const drawer = document.querySelector('.nav-drawer');
        const btn = document.querySelector('.nav-toggle');
        const scrim = document.getElementById('navDrawerScrim');
        if (!drawer || !btn) return;
        let lockedScrollY = 0;

        const setExpanded = (expanded) => {
            btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            btn.setAttribute('aria-label', expanded ? 'Close primary navigation menu' : 'Open primary navigation menu');
        };

        const lockScroll = () => {
            lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
            // iOS Safari: overflow:hidden alone can still allow background scroll / break fixed overlays.
            // Pin the body to freeze the background while allowing the drawer to scroll.
            document.body.style.position = 'fixed';
            document.body.style.top = `-${lockedScrollY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.width = '100%';
        };

        const unlockScroll = () => {
            // Restore body scroll state
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
            if (lockedScrollY) {
                // Prevent "smooth" scroll animation on restore (mobile can feel like a glitch).
                const html = document.documentElement;
                const prevScrollBehavior = html.style.scrollBehavior;
                html.style.scrollBehavior = 'auto';
                try {
                    window.scrollTo({ top: lockedScrollY, left: 0, behavior: 'auto' });
                } catch (e) {
                    window.scrollTo(0, lockedScrollY);
                }
                requestAnimationFrame(() => {
                    html.style.scrollBehavior = prevScrollBehavior;
                });
            }
            lockedScrollY = 0;
        };

        const close = () => {
            drawer.classList.remove('open');
            document.body.classList.remove('nav-open');
            document.documentElement.classList.remove('nav-open');
            setExpanded(false);
            unlockScroll();
        };

        const open = () => {
            drawer.classList.add('open');
            document.body.classList.add('nav-open');
            document.documentElement.classList.add('nav-open');
            setExpanded(true);
            lockScroll();
        };

        const toggle = () => {
            if (drawer.classList.contains('open')) close();
            else open();
        };

        // Debounce across touch/click "ghost" events (not per-event).
        let lastToggleAt = 0;
        const onToggleIntent = (e) => {
            // iOS: ensure the button tap never scrolls/zooms/selects.
            if (e) {
                e.preventDefault?.();
                e.stopPropagation?.();
            }

            const now = Date.now();
            if (now - lastToggleAt < 350) return;
            lastToggleAt = now;
            toggle();
        };

        // Bind directly to the button (more reliable than body delegation on mobile browsers).
        // Prefer Pointer Events (iOS Safari 13+), fall back to click.
        btn.addEventListener('pointerup', (e) => {
            // Only treat touch/pen as a "tap" toggle to avoid desktop mouseup double-firing with click.
            if (e && (e.pointerType === 'touch' || e.pointerType === 'pen')) onToggleIntent(e);
        }, { passive: false });
        btn.addEventListener('click', onToggleIntent, { passive: false });

        // Scrim close.
        if (scrim && !scrim.dataset.bound) {
            scrim.dataset.bound = '1';
            scrim.addEventListener('pointerup', (e) => {
                if (e && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
                    e.preventDefault?.();
                    close();
                }
            }, { passive: false });
            scrim.addEventListener('click', (e) => {
                e.preventDefault?.();
                close();
            }, { passive: false });
        }

        // Close when clicking a drawer link.
        drawer.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            close();
        });

        // Click outside — close if open (capture phase so it still works if other handlers stopPropagation).
        document.addEventListener('click', (e) => {
            if (!drawer.classList.contains('open')) return;
            if (drawer.contains(e.target)) return;
            if (btn.contains(e.target)) return;
            close();
        }, true);

        // Keyboard: close drawer on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!drawer.classList.contains('open')) return;
            close();
            btn.focus?.();
        });

        // Fix: Close mobile drawer on desktop resize to prevent stuck overflow:hidden
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && document.body.classList.contains('nav-open')) {
                close();
            }
        });
    })();

    // --- BEFORE/AFTER SLIDER ---
    const slider = document.getElementById('baSlider');
    const afterWrap = document.querySelector('.ba-after-wrap');
    const handle = document.querySelector('.ba-handle');
    const container = document.querySelector('.ba-slider');
    if (slider && afterWrap && handle && container) {
        const updateSlider = () => {
            const val = slider.value;
            afterWrap.style.width = `${val}%`;
            handle.style.left = `${val}%`;
            const afterImg = afterWrap.querySelector('img');
            if (afterImg) { 
                afterImg.style.width = `${container.offsetWidth}px`; 
            }
        };

        // Ensure update runs after images load
        const allImages = container.querySelectorAll('img');
        allImages.forEach(img => {
            if (img.complete) updateSlider();
            else img.onload = updateSlider;
        });

        slider.addEventListener('input', updateSlider);
        window.addEventListener('resize', updateSlider);
        setTimeout(updateSlider, 100);
    }

    // --- ARCHIVE HOVER VIDEOS ---
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(pCard => {
        const video = pCard.querySelector('.video-preview');
        if (video) {
            const source = pCard.querySelector('video source');
            if (source && source.src && source.src.trim() !== '' && !source.src.endsWith(window.location.pathname) && !source.src.endsWith(window.location.href)) {
                 pCard.classList.add('has-video'); 
            }

            pCard.addEventListener('mouseenter', () => {
                if (pCard.classList.contains('has-video')) {
                     video.play().catch(() => {});
                }
            });
            pCard.addEventListener('mouseleave', () => video.pause());
        }
    });

    // --- INSIGHT CARD CLICKABILITY ---
    const insightCards = document.querySelectorAll('.insight-card');
    insightCards.forEach(iCard => {
        iCard.style.cursor = 'pointer';
        iCard.addEventListener('click', (e) => {
            const link = iCard.querySelector('a.read-more');
            if (link && e.target !== link) { link.click(); }
        });
    });

    // --- HERO IDENTITY ---
    // Homepage hero logo motion is CSS-owned so the mark never receives stacked runtime transforms.


    // --- LOGO SCROLL TO TOP ---
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
        navLogo.addEventListener('click', (e) => {
            // Only intercept if we are on the homepage (index.html or root)
            const path = window.location.pathname;
            if (path === '/' || path.endsWith('index.html')) {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                
                // Backup for GSAP if loaded
                if (typeof gsap !== 'undefined' && typeof ScrollToPlugin !== 'undefined') {
                    gsap.to(window, { scrollTo: 0, duration: 1, ease: "power2.inOut" });
                }
            }
        });
    }

    // --- PACKAGE FILTERING ---
    const pkgTabs = document.querySelectorAll('.pkg-tab-btn');
    const pkgItems = document.querySelectorAll('.package-static');
    const pkgHeaders = document.querySelectorAll('.pkg-group-header');

    if (pkgTabs.length > 0) {
        pkgTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                pkgTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const category = tab.getAttribute('data-tab');

                pkgItems.forEach(item => {
                    item.classList.remove('hidden');
                    if (category === 'all') return;

                    const cat1 = item.getAttribute('data-category');
                    const cat2 = item.getAttribute('data-category-2');
                    const cat3 = item.getAttribute('data-category-3');

                    if (cat1 !== category && cat2 !== category && cat3 !== category) {
                        item.classList.add('hidden');
                    }
                });

                pkgHeaders.forEach(header => {
                    header.classList.remove('hidden');
                    if (category !== 'all' && header.getAttribute('data-category') !== category) {
                        header.classList.add('hidden');
                    }
                });
            });
        });
    }

    // --- PACKAGE SELECTION (CONTACT PRE-FILL) ---
    const pkgButtons = document.querySelectorAll('.pkg-select-btn');
    const contactSection = document.getElementById('contact');
    const serviceSelect = document.getElementById('project_type');
    const messageInput = document.getElementById('project_details');

    if (pkgButtons.length > 0 && contactSection && serviceSelect && messageInput) {
        pkgButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const pkgName = btn.getAttribute('data-package');
                
                // Direct Mapping (Options now match Package Names)
                const targetValue = pkgName; 
                
                // Fallback check
                const optionExists = Array.from(serviceSelect.options).some(o => o.value === targetValue);
                serviceSelect.value = optionExists ? targetValue : 'Custom Build';

                messageInput.value = `I'm interested in the "${pkgName}" package. \n\nHere are some details about my project:`;

                if (typeof gsap !== 'undefined' && typeof ScrollToPlugin !== 'undefined') {
                    gsap.registerPlugin(ScrollToPlugin);
                    gsap.to(window, {
                        duration: 1,
                        scrollTo: { y: contactSection, offsetY: 80, autoKill: false },
                        ease: "power2.inOut"
                    });
                } else {
                    contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                // Trigger change so any listeners on package/contact UI stay in sync
                serviceSelect.dispatchEvent(new Event('change'));
            });
        });
    }

    // --- CONTACT FORM SUBMISSION (AI AGENT) ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn ? btn.innerText : 'SUBMIT';
            if (btn) {
                btn.innerText = 'SENDING...';
                btn.disabled = true;
            }

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            const statusDiv = document.getElementById('formStatus');
            if (!window.OTP || typeof window.OTP.getApiBase !== 'function') {
                if (statusDiv) statusDiv.textContent = 'Configuration error: reload the page and try again.';
                if (btn) {
                    btn.innerText = 'ERROR - TRY AGAIN';
                    btn.disabled = false;
                    setTimeout(() => { btn.innerText = originalText; }, 3000);
                }
                return;
            }
            const apiBase = window.OTP.getApiBase();
            if (statusDiv) statusDiv.textContent = '';

            try {
                const res = await fetch(`${apiBase}/api/contact/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const raw = await res.text();
                let result = {};
                try {
                    result = raw ? JSON.parse(raw) : {};
                } catch (_) {
                    throw new Error(
                        res.ok
                            ? 'Invalid response from server.'
                            : `Server error (${res.status}). Try again or email us directly.`
                    );
                }

                if (res.ok && result.success) {
                    // Hide Form, Show Success
                    contactForm.style.display = 'none';
                    const successDiv = document.getElementById('successState');
                    if (successDiv) {
                        successDiv.style.display = 'block';
                        // Animate if GSAP available
                        if (typeof gsap !== 'undefined') {
                            const okIcon = successDiv.querySelector('.success-icon');
                            const okH = successDiv.querySelector('h3');
                            const okP = successDiv.querySelector('p');
                            if (okIcon) gsap.to(okIcon, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" });
                            if (okH) gsap.to(okH, { opacity: 1, y: 0, delay: 0.2, duration: 0.5 });
                            if (okP) gsap.to(okP, { opacity: 1, y: 0, delay: 0.3, duration: 0.5 });
                        } else {
                            // Fallback simple fade
                            successDiv.style.opacity = 1;
                        }
                    }
                    if (typeof window.gtag === 'function') {
                        window.gtag('event', 'generate_lead', { value: 0, currency: 'USD' });
                    }
                } else {
                    throw new Error(result.message || `Request failed (${res.status}).`);
                }

            } catch (err) {
                console.error(err);
                if (btn) {
                    btn.innerText = 'ERROR - TRY AGAIN';
                    btn.disabled = false;
                    setTimeout(() => { btn.innerText = originalText; }, 3000);
                }

                if (statusDiv) {
                    const msg = String(err?.message ?? err ?? 'Something went wrong.');
                    statusDiv.textContent = 'Error: ' + msg;
                }
            }
        });
    }

    // 10. BOOTSTRAP REALTIME & DYNAMIC CONTENT
    // Site Command Pro (terminal) broadcasts on Supabase Realtime channel `otp-uplink`.
    // Subscribe for all public visitors so toggles reach the live site without opt-in.
    // Heavy fetches (posts/inbox) stay gated below; initRealtimeState already try/catches its post read.
    const params = new URLSearchParams(window.location.search);
    const isEditMode = params.get('mode') === 'edit';
    const adminToken = localStorage.getItem('otp_admin_token');
    const allowPublicDynamic = !!(window.OTP_CONFIG && window.OTP_CONFIG.allowPublicDynamicContent);
    const allowDynamic = allowPublicDynamic || (isEditMode && adminToken);

    if (window.OTP && window.OTP.initRealtimeState) {
        window.OTP.initRealtimeState().catch(() => {});
    }
    if (allowDynamic && window.OTP && window.OTP.initLiveEditor) {
        window.OTP.initLiveEditor();
    }
    
    // 11. SITE STATUS — initial + live updates come from OTP.initRealtimeState (posts + otp-uplink).
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSite);
} else {
    initSite();
}// ==========================================
// 10. MAGNETIC BUTTON EFFECT (High-End Interaction)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const magneticBtns = document.querySelectorAll('.magnetic-btn');
    
    magneticBtns.forEach(btn => {
        // Create an inner wrapper for the text if it doesn't exist, to move it slightly more for parallax
        // Actually, we can just move the whole button
        
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            // Calculate distance form center
            const h = rect.width / 2;
            const v = rect.height / 2;
            
            const x = e.clientX - rect.left - h;
            const y = e.clientY - rect.top - v;
            
            // Move button 30% of the distance to the mouse
            gsap.to(btn, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.4,
                ease: "power3.out"
            });
        });
        
        btn.addEventListener('mouseleave', () => {
            // Snap back to center
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.7,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });
});

// ==========================================
// 11. 3D CARD TILT EFFECT (Holographic Glare)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Only apply on non-touch devices for performance
    if (window.matchMedia("(hover: none)").matches) return;

    const cards = document.querySelectorAll('.package-static:not(.pkg-icon-bubble)');
    
    cards.forEach(card => {
        // Ensure card can position the glare
        if (getComputedStyle(card).position === 'static') {
            card.style.position = 'relative';
        }

        // Create Glare Element
        const glare = document.createElement('div');
        glare.className = 'card-glare';
        glare.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 60%);
            opacity: 0;
            mix-blend-mode: overlay; /* Very high-end feel */
            z-index: 10;
            transition: opacity 0.3s;
        `;
        card.appendChild(glare);

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Subtle rotation (max 6 degrees to feel realistic)
            const rotateX = ((y - centerY) / centerY) * -6; 
            const rotateY = ((x - centerX) / centerX) * 6;
            
            // Glare center tracking
            const glareX = (x / rect.width) * 100;
            const glareY = (y / rect.height) * 100;
            
            if (typeof gsap !== 'undefined') {
                gsap.to(card, {
                    rotationX: rotateX,
                    rotationY: rotateY,
                    transformPerspective: 1200,
                    ease: "power2.out",
                    duration: 0.4
                });
            } else {
                card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            }

            glare.style.opacity = '1';
            glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`;
        });
        
        card.addEventListener('mouseleave', () => {
             if (typeof gsap !== 'undefined') {
                 gsap.to(card, {
                     rotationX: 0,
                     rotationY: 0,
                     ease: "power2.out",
                     duration: 0.7
                 });
             } else {
                 card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg)`;
             }
             glare.style.opacity = '0';
        });
    });
});

// --- SCROLL REVEAL (Visual Success Engineering) ---
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const resultsSection = document.getElementById('results');
        if (!resultsSection) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    resultsSection.classList.add('reveal');
                    // Once revealed, no need to track
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        observer.observe(resultsSection);
    });
})();

// --- SITE COMMAND PRO (broadcast UI only; live channel is OTP.initRealtimeState → otp-uplink) ---
(function() {
    function showEmergencyBroadcast(msg) {
        // Prevent dupes
        const existing = document.getElementById('emergency-broadcast');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'emergency-broadcast';
        overlay.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9999999; width:90%; max-width:600px; background:rgba(0,0,0,0.9); border:1px solid var(--accent); padding:20px; border-radius:12px; box-shadow:0 0 50px rgba(0,255,255,0.2); backdrop-filter:blur(10px); display:flex; gap:20px; align-items:center; animation: broadcastSlideIn 0.5s cubic-bezier(0.2, 1, 0.3, 1) forwards;";
        
        overlay.innerHTML = `
            <div style="font-size:1.5rem;">📡</div>
            <div style="flex:1;">
                <div style="font-size:0.6rem; color:var(--accent); text-transform:uppercase; letter-spacing:2px; margin-bottom:5px; font-weight:800;">BROADCAST // SECURE UPLINK</div>
                <div class="otp-broadcast-body" style="font-family:'Space Grotesk', sans-serif; font-weight:500; color:#fff; line-height:1.4;"></div>
            </div>
            <button type="button" class="otp-broadcast-dismiss" style="background:transparent; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:1.2rem;">&times;</button>
        `;
        const bodyEl = overlay.querySelector('.otp-broadcast-body');
        if (bodyEl) bodyEl.textContent = String(msg == null ? '' : msg);
        const dismiss = overlay.querySelector('.otp-broadcast-dismiss');
        if (dismiss) dismiss.addEventListener('click', () => overlay.remove());

        document.body.appendChild(overlay);
        
        // Add animation if not present
        if (!document.getElementById('broadcast-anim')) {
            const style = document.createElement('style');
            style.id = 'broadcast-anim';
            style.textContent = `
                @keyframes broadcastSlideIn {
                    from { transform: translate(-50%, -100px); opacity:0; }
                    to { transform: translate(-50%, 0); opacity:1; }
                }
            `;
            document.head.appendChild(style);
        }

        // Audio cue (optional, but cinematic)
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.2);
        } catch(e) {}
    }

    window.OTP = window.OTP || {};
    window.OTP.showBroadcast = (msg) => showEmergencyBroadcast(msg);
})();
