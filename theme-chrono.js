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


    var MANUAL_TTL_MS = 365 * 24 * 60 * 60 * 1000;

    function storageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function storageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) { /* ignore */ }
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
        var r = parts[0] || 0;
        var g = parts[1] || 0;
        var b = parts[2] || 0;
        var luminance = (r * 299 + g * 587 + b * 114) / 1000;
        return luminance > 148 ? '#050609' : '#ffffff';
    }

    window.OTP_HUES = [
        {
            name: 'purple',
            dark: '184, 140, 255',
            light: '92, 44, 168',
            gradient: 'linear-gradient(135deg, #b88cff, #7b61ff, #ff76d7, #b88cff)'
        },
        {
            name: 'orange',
            dark: '255, 111, 0',
            light: '174, 72, 0',
            gradient: 'linear-gradient(135deg, #ff6f00, #ffb15f, #ffffff, #ff6f00)'
        },
        {
            name: 'blue',
            dark: '0, 236, 255',
            light: '0, 100, 140',
            gradient: 'linear-gradient(135deg, #00ecff, #2f6bff, #ffffff, #00ecff)'
        },
        {
            name: 'gold',
            dark: '244, 204, 106',
            light: '155, 106, 18',
            gradient: 'linear-gradient(135deg, #f4cc6a, #fff4ce, #ff8a00, #f4cc6a)'
        },
        {
            name: 'white',
            dark: '255, 255, 255',
            light: '88, 88, 96',
            gradient: 'linear-gradient(135deg, #ffffff, #d8ecff, #b88cff, #ffffff)'
        },
        {
            name: 'glitch',
            dark: '255, 0, 204',
            light: '145, 0, 116',
            gradient: 'linear-gradient(135deg, #00ecff, #ff00cc, #ffcc00, #00ecff)'
        }
    ];

    var hueIndex = 0;
    try {
        hueIndex = Math.floor(Math.random() * window.OTP_HUES.length);
    } catch (e3) {
        hueIndex = 0;
    }
    window.OTP_HUE_INDEX = hueIndex;
    var selectedHue = window.OTP_HUES[hueIndex];
    window.OTP_ACTIVE_HUE = selectedHue;

    var theme = window.OTP.getEffectiveThemeForPaint();
    if (theme !== 'light' && theme !== 'dark') theme = 'dark';

    var rootStyle = document.documentElement.style;
    document.documentElement.setAttribute('data-refresh-accent', selectedHue.name || 'blue');
    document.documentElement.setAttribute('data-chrono-phase',
        typeof window.OTP.calculateChronoPhase === 'function' ? window.OTP.calculateChronoPhase() : (theme === 'light' ? 'day' : 'night')
    );
    rootStyle.setProperty('--accent-gradient', selectedHue.gradient || 'linear-gradient(135deg, #00ecff, #ff00cc, #ffcc00, #00ecff)');

    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        rootStyle.setProperty('--accent2-rgb', selectedHue.light);
        rootStyle.setProperty('--accent2', 'rgb(' + selectedHue.light + ')');
        rootStyle.setProperty('--accent2-text', contrastText(selectedHue.light));
    } else {
        document.documentElement.removeAttribute('data-theme');
        rootStyle.setProperty('--accent2-rgb', selectedHue.dark);
        rootStyle.setProperty('--accent2', 'rgb(' + selectedHue.dark + ')');
        rootStyle.setProperty('--accent2-text', contrastText(selectedHue.dark));
    }
    applyBrowserThemeHints(theme);
})();
