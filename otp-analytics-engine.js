(function initOtpAnalytics(root) {
    'use strict';

    const QUEUE_FLUSH_INTERVAL_MS = 5000;
    const MAX_QUEUE_SIZE = 50;
    const ANALYTICS_ENDPOINT = '/api/analytics';

    const eventQueue = [];
    let isFlushing = false;
    let pageStartTime = Date.now();

    const sessionMeta = {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
        referrer: document.referrer || 'direct',
        url: window.location.href,
        path: window.location.pathname,
        userAgent: navigator.userAgent || 'unknown',
        screenRes: `${window.screen ? window.screen.width : 0}x${window.screen ? window.screen.height : 0}`
    };

    function queueEvent(eventName, payload = {}) {
        const eventItem = {
            event: eventName,
            timestamp: new Date().toISOString(),
            elapsedMs: Date.now() - pageStartTime,
            meta: sessionMeta,
            data: payload
        };

        eventQueue.push(eventItem);

        if (eventQueue.length >= MAX_QUEUE_SIZE) {
            flushQueue();
        }
    }

    function flushQueue() {
        if (eventQueue.length === 0 || isFlushing) return;

        const payloadToSend = eventQueue.splice(0, eventQueue.length);
        isFlushing = true;

        if (navigator.sendBeacon) {
            try {
                const blob = new Blob([JSON.stringify({ events: payloadToSend })], { type: 'application/json' });
                navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
                isFlushing = false;
                return;
            } catch (err) {
                // Fall back to fetch
            }
        }

        fetch(ANALYTICS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: payloadToSend }),
            keepalive: true
        }).catch(() => {
            // Safe fallback if offline or endpoint offline
        }).finally(() => {
            isFlushing = false;
        });
    }

    // Auto-capture Core Web Vitals if supported
    function initPerformanceObserver() {
        if (typeof PerformanceObserver !== 'function') return;

        try {
            // LCP
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) {
                    queueEvent('web_vitals_lcp', { valueMs: Math.round(lastEntry.startTime) });
                }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

            // CLS
            let clsScore = 0;
            const clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsScore += entry.value;
                    }
                }
                queueEvent('web_vitals_cls', { score: parseFloat(clsScore.toFixed(4)) });
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
            // Ignore unsupported observer types
        }
    }

    // Auto-track key interactive clicks
    function initClickTracking() {
        document.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('a, button, [role="button"]');
            if (!targetBtn) return;

            const href = targetBtn.getAttribute('href') || '';
            const text = (targetBtn.textContent || '').trim().substring(0, 60);

            if (href.includes('/bookings') || text.toLowerCase().includes('book')) {
                queueEvent('cta_click_booking', { href, text });
            } else if (href.includes('/fixline') || text.toLowerCase().includes('fixline')) {
                queueEvent('cta_click_fixline', { href, text });
            } else if (href.includes('/portal') || text.toLowerCase().includes('portal')) {
                queueEvent('cta_click_portal', { href, text });
            }
        }, { passive: true });
    }

    // Unload Dwell Time Event
    function initUnloadTracker() {
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                queueEvent('page_dwell_time', { totalDwellMs: Date.now() - pageStartTime });
                flushQueue();
            }
        });
    }

    // Start Engine
    queueEvent('page_view', { path: sessionMeta.path });
    initPerformanceObserver();
    initClickTracking();
    initUnloadTracker();
    setInterval(flushQueue, QUEUE_FLUSH_INTERVAL_MS);

    // Public API
    root.OTPAnalytics = {
        trackEvent: queueEvent,
        flush: flushQueue,
        getSession: () => Object.assign({}, sessionMeta),
        getQueue: () => [...eventQueue]
    };

})(typeof window !== 'undefined' ? window : this);
