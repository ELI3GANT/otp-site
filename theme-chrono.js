/**
 * theme-chrono.js — single source for first-paint theme + chrono day/night.
 * Load synchronously in <head> before other UI (matches site-init logic).
 */
(function () {
    window.OTP = window.OTP || {};
    function applyBrowserThemeHints(theme) {
        try {
            document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
            var metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) {
                metaTheme.setAttribute('content', theme === 'light' ? '#eceef2' : '#030305');
            }
        } catch (e) { /* ignore */ }
    }


    var MANUAL_TTL_MS = 12 * 60 * 60 * 1000;

    function normalizeTheme(t) {
        if (t === 'light' || t === 'dark') return t;
        return null;
    }

    /**
     * OS preference wins when set. Otherwise local-time “civil day”:
     * light 07:00–19:59, dark 20:00–06:59 (avoids treating no-preference as always-light).
     */
    window.OTP.calculateChronoTheme = function () {
        try {
            if (window.matchMedia) {
                if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
            }
        } catch (e) { /* ignore */ }
        var hour = new Date().getHours();
        return hour >= 7 && hour < 20 ? 'light' : 'dark';
    };

    /** Manual override if active and valid; otherwise chrono. Clears stale manual flags. */
    window.OTP.getEffectiveThemeForPaint = function () {
        var isManual = localStorage.getItem('theme_manual') === 'true';
        var manualTime = parseInt(localStorage.getItem('theme_manual_time') || '0', 10);
        var expired = !manualTime || Date.now() - manualTime > MANUAL_TTL_MS;

        if (isManual && !expired) {
            var saved = normalizeTheme(localStorage.getItem('theme'));
            if (saved) return saved;
            try {
                localStorage.removeItem('theme_manual');
                localStorage.removeItem('theme_manual_time');
            } catch (e2) { /* ignore */ }
        }
        if (isManual && expired) {
            try {
                localStorage.removeItem('theme_manual');
                localStorage.removeItem('theme_manual_time');
            } catch (e) { /* ignore */ }
        }
        return window.OTP.calculateChronoTheme();
    };

    window.OTP_HUES = [
        { dark: '0, 236, 255', light: '0, 100, 140' },
        { dark: '170, 0, 255', light: '90, 0, 150' },
        { dark: '255, 0, 170', light: '160, 0, 90' },
        { dark: '255, 215, 0', light: '130, 90, 0' },
        { dark: '255, 60, 0', light: '160, 30, 0' },
        { dark: '50, 255, 126', light: '0, 100, 60' },
        { dark: '30, 144, 255', light: '20, 70, 160' },
        { dark: '255, 50, 50', light: '140, 10, 10' }
    ];

    var hueIndex = Math.floor(Math.random() * window.OTP_HUES.length);
    window.OTP_HUE_INDEX = hueIndex;
    var selectedHue = window.OTP_HUES[hueIndex];

    var theme = window.OTP.getEffectiveThemeForPaint();
    if (theme !== 'light' && theme !== 'dark') theme = 'dark';

    var rootStyle = document.documentElement.style;
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        rootStyle.setProperty('--accent2-rgb', selectedHue.light);
        rootStyle.setProperty('--accent2', 'rgb(' + selectedHue.light + ')');
    } else {
        document.documentElement.removeAttribute('data-theme');
        rootStyle.setProperty('--accent2-rgb', selectedHue.dark);
        rootStyle.setProperty('--accent2', 'rgb(' + selectedHue.dark + ')');
    }
    applyBrowserThemeHints(theme);
})();
