(function initFixlineAnalytics(global) {
  'use strict';

  const allowedEvents = new Set([
    'fixline_page_view',
    'intake_started',
    'intake_step_completed',
    'intake_submitted',
    'duplicate_submission',
    'audit_cta_selected',
    'consultation_cta_selected',
    'archive_to_fixline',
    'homepage_to_fixline'
  ]);

  function track(event, step) {
    if (!allowedEvents.has(event) || !global.navigator?.sendBeacon) return;
    if (!['www.onlytrueperspective.tech', 'onlytrueperspective.tech'].includes(global.location?.hostname)) return;
    const payload = step ? { event, step: String(step).slice(0, 40) } : { event };
    global.navigator.sendBeacon(
      '/fixline/api/events',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );
  }

  global.document?.addEventListener('DOMContentLoaded', () => {
    if (global.document.body?.dataset.fixlinePage === 'true') {
      track('fixline_page_view');
    }
    global.document.querySelectorAll('[data-fixline-event]').forEach((element) => {
      element.addEventListener('click', () => track(element.dataset.fixlineEvent));
    });
  });

  global.OTPFixlineAnalytics = Object.freeze({ track });
})(typeof window !== 'undefined' ? window : globalThis);
