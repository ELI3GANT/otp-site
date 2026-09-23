(function initOtpConversionAnalytics(global) {
  const allowed = new Set([
    'cta_site_audit_click',
    'cta_start_project_click',
    'cta_view_work_click',
    'booking_started',
    'booking_submitted',
    'email_click',
    'phone_click',
    'calendly_click',
    'case_study_view'
  ]);

  function track(eventName) {
    if (!allowed.has(eventName) || typeof global.gtag !== 'function') return false;
    try {
      global.gtag('event', eventName);
      return true;
    } catch (_) {
      return false;
    }
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const eventName = link.dataset.analyticsEvent || (link.href.startsWith('mailto:') ? 'email_click' : link.href.startsWith('tel:') ? 'phone_click' : null);
    if (eventName) track(eventName);
  });

  global.OTPConversionAnalytics = Object.freeze({ track });
})(window);
