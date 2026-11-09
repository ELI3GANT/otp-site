/**
 * theme-chrono.js — single source for first-paint theme + chrono day/night.
 * Load synchronously in <head> before other UI (matches site-init logic).
 */
(function () {
    window.OTP = window.OTP || {};
    function applyBrowserThemeHints(theme, palette) {
        try {
            document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
            var metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) {
                metaTheme.setAttribute('content', theme === 'light'
                    ? ((palette && palette.themeColorLight) || '#eceef2')
                    : ((palette && palette.themeColorDark) || '#030305'));
            }
        } catch (e) { /* ignore */ }
    }


    var MANUAL_TTL_MS = 365 * 24 * 60 * 60 * 1000;

    function storageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function storageSet(key, value) {
        try {
            if (value) localStorage.setItem(key, value);
        } catch (e) { /* ignore */ }
    }

    function storageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) { /* ignore */ }
    }

    function sessionGet(key) {
        try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function sessionSet(key, value) {
        try { if (value) sessionStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }

    function sessionRemove(key) {
        try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
    }

    function normalizeTheme(t) {
        if (t === 'light' || t === 'dark') return t;
        return null;
    }

    try {
        var resetParams = new URLSearchParams(window.location.search || '');
        if (resetParams.get('reset_theme') === '1') {
            storageRemove('theme');
            storageRemove('theme_manual');
            storageRemove('theme_manual_time');
            storageRemove('last_global_theme');
            sessionRemove('otp_public_session_palette');
        }
    } catch (eReset) { /* ignore */ }

    /**
     * Local-time civil light:
     * sunrise 06:00–07:59, day 08:00–17:59, sunset 18:00–19:59, night 20:00–05:59.
     * Manual override is handled separately so first paint never waits on app JS.
     */
    window.OTP.calculateChronoPhase = function () {
        var hour = new Date().getHours();
        if (hour >= 6 && hour < 8) return 'sunrise';
        if (hour >= 8 && hour < 18) return 'day';
        if (hour >= 18 && hour < 20) return 'sunset';
        return 'night';
    };

    window.OTP.calculateChronoTheme = function () {
        var phase = window.OTP.calculateChronoPhase();
        return phase === 'night' ? 'dark' : 'light';
    };

    /** Manual override if active and valid; otherwise chrono. Clears stale manual flags. */
    window.OTP.getEffectiveThemeForPaint = function () {
        try {
            var isManual = storageGet('theme_manual') === 'true';
            var manualTime = parseInt(storageGet('theme_manual_time') || '0', 10);
            var expired = !manualTime || Date.now() - manualTime > MANUAL_TTL_MS;

            if (isManual && !expired) {
                var saved = normalizeTheme(storageGet('theme'));
                if (saved) return saved;
                storageRemove('theme_manual');
                storageRemove('theme_manual_time');
            }
            if (isManual && expired) {
                storageRemove('theme_manual');
                storageRemove('theme_manual_time');
            }
        } catch (eTheme) { /* fall through to chrono */ }
        return window.OTP.calculateChronoTheme();
    };

    function contrastText(rgb) {
        var parts = String(rgb || '').split(',').map(function (n) { return Number(n.trim()); });
        function linear(channel) {
            var value = Math.max(0, Math.min(255, channel || 0)) / 255;
            return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        }
        var luminance = linear(parts[0]) * 0.2126 + linear(parts[1]) * 0.7152 + linear(parts[2]) * 0.0722;
        var darkLuminance = linear(5) * 0.2126 + linear(6) * 0.7152 + linear(9) * 0.0722;
        var darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
        var lightContrast = 1.05 / (luminance + 0.05);
        return darkContrast >= lightContrast ? '#050609' : '#ffffff';
    }

    window.OTP_PALETTES = [
        {
            name: 'purple',
            dark: '184, 140, 255',
            light: '92, 44, 168',
            gradient: 'linear-gradient(135deg, #b88cff, #7b61ff, #ff76d7, #b88cff)',
            themeColorDark: '#090711',
            themeColorLight: '#f4f1ff'
        },
        {
            name: 'orange',
            dark: '255, 111, 0',
            light: '174, 72, 0',
            gradient: 'linear-gradient(135deg, #ff6f00, #ffb15f, #ffffff, #ff6f00)',
            themeColorDark: '#110803',
            themeColorLight: '#fff4e8'
        },
        {
            name: 'blue',
            dark: '0, 236, 255',
            light: '0, 100, 140',
            gradient: 'linear-gradient(135deg, #00ecff, #2f6bff, #ffffff, #00ecff)',
            themeColorDark: '#030b10',
            themeColorLight: '#eef9fc'
        },
        {
            name: 'gold',
            dark: '244, 204, 106',
            light: '155, 106, 18',
            gradient: 'linear-gradient(135deg, #f4cc6a, #fff4ce, #ff8a00, #f4cc6a)',
            themeColorDark: '#100d05',
            themeColorLight: '#fff9eb'
        },
        {
            name: 'white',
            dark: '255, 255, 255',
            light: '88, 88, 96',
            gradient: 'linear-gradient(135deg, #ffffff, #d8ecff, #b88cff, #ffffff)',
            themeColorDark: '#030305',
            themeColorLight: '#f7f8fb'
        },
        {
            name: 'glitch',
            dark: '255, 0, 204',
            light: '145, 0, 116',
            gradient: 'linear-gradient(135deg, #00ecff, #ff00cc, #ffcc00, #00ecff)',
            spectralGradient: 'linear-gradient(90deg, #00ecff, #ff00cc, #ffcc00, #00ecff)',
            themeColorDark: '#100410',
            themeColorLight: '#fff0fb'
        },
        {
            name: 'neon',
            dark: '0, 255, 170',
            light: '0, 130, 88',
            gradient: 'linear-gradient(135deg, #00ffaa, #00ecff, #ffffff, #00ffaa)',
            spectralGradient: 'linear-gradient(90deg, #00ffaa, #00ecff, #ffffff, #00ffaa)',
            themeColorDark: '#03100d',
            themeColorLight: '#ecfff9'
        }
    ];
    window.OTP_HUES = window.OTP_PALETTES;

    function findPalette(name) {
        var palettes = window.OTP_PALETTES || [];
        for (var i = 0; i < palettes.length; i += 1) {
            if (palettes[i] && palettes[i].name === name) return palettes[i];
        }
        return null;
    }

    var hueIndex = 0;
    try {
        hueIndex = Math.floor(Math.random() * window.OTP_PALETTES.length);
    } catch (e3) {
        hueIndex = 0;
    }

    // Keep one palette while navigating the public site; rotate on a true refresh.
    try {
        if (document.documentElement.hasAttribute('data-refresh-palette')) {
            var activeSessionPalette = sessionGet('otp_public_session_palette');
            var navigationEntries = window.performance && typeof window.performance.getEntriesByType === 'function'
                ? window.performance.getEntriesByType('navigation') : [];
            var isRefresh = navigationEntries.length && navigationEntries[0].type === 'reload';
            var sessionPaletteIndex = -1;
            for (var paletteIndex = 0; paletteIndex < window.OTP_PALETTES.length; paletteIndex += 1) {
                if (window.OTP_PALETTES[paletteIndex].name === activeSessionPalette) sessionPaletteIndex = paletteIndex;
            }
            if (!isRefresh && sessionPaletteIndex >= 0) {
                hueIndex = sessionPaletteIndex;
            } else {
                var previousPalette = activeSessionPalette || storageGet('otp_public_home_last_palette');
                if (window.OTP_PALETTES[hueIndex] && window.OTP_PALETTES[hueIndex].name === previousPalette) {
                    hueIndex = (hueIndex + 1) % window.OTP_PALETTES.length;
                }
                var nextSessionPalette = window.OTP_PALETTES[hueIndex] && window.OTP_PALETTES[hueIndex].name;
                sessionSet('otp_public_session_palette', nextSessionPalette);
                storageSet('otp_public_home_last_palette', nextSessionPalette);
            }
        }
    } catch (ePaletteRotation) { /* keep the randomly selected palette */ }

    var selectedHue = window.OTP_PALETTES[hueIndex] || findPalette('blue') || window.OTP_PALETTES[0];
    var spectralVariant = '';
    try {
        var spectralRoll = document.documentElement.hasAttribute('data-refresh-palette') ? 1 : Math.random();
        if (selectedHue && selectedHue.name === 'glitch') {
            spectralVariant = 'spectral-revelation';
        } else if (spectralRoll < 0.02) {
            selectedHue = findPalette('glitch') || selectedHue;
            spectralVariant = 'spectral-revelation';
        } else if (spectralRoll < 0.04) {
            selectedHue = findPalette('gold') || selectedHue;
            spectralVariant = 'spectral-revelation-gold';
        } else if (spectralRoll < 0.06) {
            selectedHue = findPalette('neon') || selectedHue;
            spectralVariant = 'spectral-revelation-neon';
        }
    } catch (eVariant) { /* keep selected palette */ }

    hueIndex = Math.max(0, (window.OTP_PALETTES || []).indexOf(selectedHue));
    window.OTP_HUE_INDEX = hueIndex;
    window.OTP_ACTIVE_HUE = selectedHue;
    window.OTP_ACTIVE_PALETTE = selectedHue;
    window.OTP_ACTIVE_PALETTE_ID = (selectedHue && selectedHue.name) || 'blue';
    window.OTP_SPECTRAL_VARIANT = spectralVariant;

    var theme = window.OTP.getEffectiveThemeForPaint();
    if (theme !== 'light' && theme !== 'dark') theme = 'dark';

    window.OTP.getActivePalette = function () {
        return window.OTP_ACTIVE_PALETTE || window.OTP_ACTIVE_HUE || findPalette('blue') || (window.OTP_PALETTES || [])[0] || {};
    };

    window.OTP.applyPaletteForTheme = function (nextTheme) {
        var normalized = nextTheme === 'light' ? 'light' : 'dark';
        var palette = window.OTP.getActivePalette();
        var root = document.documentElement;
        var rootStyle = root.style;
        var activeRgb = normalized === 'light' ? palette.light : palette.dark;

        root.classList.add('otp-brand-synced');
        root.setAttribute('data-palette', palette.name || 'blue');
        root.setAttribute('data-refresh-accent', palette.name || 'blue');
        root.setAttribute('data-chrono-phase',
            typeof window.OTP.calculateChronoPhase === 'function' ? window.OTP.calculateChronoPhase() : (normalized === 'light' ? 'day' : 'night')
        );
        rootStyle.setProperty('--accent-gradient', palette.gradient || 'linear-gradient(135deg, #00ecff, #2f6bff, #ffffff, #00ecff)');
        rootStyle.setProperty('--spectral-gradient', palette.spectralGradient || palette.gradient || 'linear-gradient(90deg, #00ecff, #ff00cc, #ffcc00, #00ecff)');

        if (normalized === 'light') {
            root.setAttribute('data-theme', 'light');
        } else {
            root.removeAttribute('data-theme');
        }

        rootStyle.setProperty('--accent2-rgb', activeRgb);
        rootStyle.setProperty('--accent2', 'rgb(' + activeRgb + ')');
        rootStyle.setProperty('--accent2-text', contrastText(activeRgb));
        // Shared OTP public surfaces consume these tokens so the selected
        // refresh palette stays in sync beyond the homepage and booking form.
        rootStyle.setProperty('--accent-otp', 'rgb(' + activeRgb + ')');
        rootStyle.setProperty('--accent-otp-ink', contrastText(activeRgb));
        applyBrowserThemeHints(normalized, palette);
        window.dispatchEvent(new CustomEvent('otp:themechange', { detail: { theme: normalized } }));
        return palette;
    };

    window.OTP.setTheme = function (nextTheme) {
        var normalized = nextTheme === 'light' ? 'light' : 'dark';
        storageSet('theme_manual_time', String(Date.now()));
        storageSet('theme', normalized);
        storageSet('theme_manual', 'true');
        return window.OTP.applyPaletteForTheme(normalized);
    };

    function syncStoredTheme() {
        var effectiveTheme = window.OTP.getEffectiveThemeForPaint();
        var currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        if (effectiveTheme !== currentTheme) window.OTP.applyPaletteForTheme(effectiveTheme);
    }
    window.addEventListener('storage', function (event) {
        if (event.key === 'theme' || event.key === 'theme_manual' || event.key === 'theme_manual_time') syncStoredTheme();
    });
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) syncStoredTheme();
    });

    if (spectralVariant) {
        document.documentElement.classList.add(spectralVariant, 'spectral-v-sync');
    }
    window.OTP.applyPaletteForTheme(theme);
})();
