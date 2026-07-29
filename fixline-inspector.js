(function initFixlineInspector(global) {
  'use strict';

  function sanitizeUrlOrHandle(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';
    if (raw.startsWith('@')) {
      const handle = raw.slice(1).replace(/[^a-zA-Z0-9._]/g, '');
      return handle ? `https://instagram.com/${handle}` : '';
    }
    if (!/^https?:\/\//i.test(raw)) {
      return `https://${raw}`;
    }
    try {
      const parsed = new URL(raw);
      return parsed.toString();
    } catch {
      return '';
    }
  }

  function getEls() {
    return {
      form: document.getElementById('inspector-form'),
      input: document.getElementById('inspector-input'),
      btn: document.getElementById('inspector-btn'),
      results: document.getElementById('inspector-results'),
      scoreVal: document.getElementById('inspector-score-val'),
      scoreRing: document.getElementById('inspector-score-ring'),
      targetDomain: document.getElementById('inspector-target-domain'),
      findingsList: document.getElementById('inspector-findings'),
      depositBtn: document.getElementById('inspector-deposit-btn'),
      error: document.getElementById('inspector-error')
    };
  }

  async function handleInspect(event) {
    if (event) event.preventDefault();
    const els = getEls();
    if (!els.input || !els.btn) return;

    const rawInput = els.input.value.trim();
    const targetUrl = sanitizeUrlOrHandle(rawInput);

    if (!targetUrl) {
      showError('Please enter a valid website URL (e.g. acmebrand.com) or Instagram handle (@acmebrand).');
      return;
    }

    showError('');
    els.btn.disabled = true;
    els.btn.textContent = 'Analyzing Conversion Systems...';

    try {
      const res = await global.fetch('/api/fixline/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ target: targetUrl, raw_input: rawInput })
      });
      const data = await res.json().catch(() => ({}));

      els.btn.disabled = false;
      els.btn.textContent = '🔍 Inspect Conversion Score';

      if (!res.ok || !data.success || !data.report) {
        showError(data.message || 'Unable to inspect website. Please check the URL and try again.');
        return;
      }

      renderResults(data.report, targetUrl);
    } catch (err) {
      els.btn.disabled = false;
      els.btn.textContent = '🔍 Inspect Conversion Score';
      showError('Audit inspector service is currently busy. Try again shortly.');
    }
  }

  function showError(msg) {
    const els = getEls();
    if (!els.error) return;
    els.error.textContent = msg;
    els.error.classList.toggle('hidden', !msg);
  }

  function animateScore(targetScore) {
    const els = getEls();
    if (!els.scoreVal) return;
    let current = 0;
    const duration = 1200;
    const stepTime = 20;
    const steps = Math.ceil(duration / stepTime);
    const increment = targetScore / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        current = targetScore;
        clearInterval(timer);
      }
      els.scoreVal.textContent = Math.round(current);
    }, stepTime);
  }

  function renderResults(report, targetUrl) {
    const els = getEls();
    if (!els.results) return;

    els.results.classList.remove('hidden');
    if (els.targetDomain) {
      const displayDomain = report.target || targetUrl;
      const displayTitle = report.title ? ` — "${report.title}"` : '';
      const displayLatency = report.latency_ms ? ` (${report.latency_ms}ms load)` : '';
      els.targetDomain.textContent = `${displayDomain}${displayTitle}${displayLatency}`;
    }

    animateScore(report.score || 58);

    if (els.findingsList) {
      els.findingsList.replaceChildren();
      const findings = Array.isArray(report.findings) && report.findings.length
        ? report.findings
        : [
            'No direct booking or payment call-to-action found on primary fold.',
            'Mobile layout headers lack high-converting value hierarchy.',
            'Page speed and asset compression need optimization for mobile visitors.'
          ];

      findings.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        els.findingsList.appendChild(li);
      });
    }

    if (els.depositBtn) {
      els.depositBtn.onclick = async () => {
        els.depositBtn.disabled = true;
        els.depositBtn.textContent = 'Preparing Secure Fast-Lane Checkout...';
        try {
          const checkoutRes = await global.fetch('/api/bookings/deposit-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              package_name: 'The Signal',
              selected_fast_offer: 'Website Cleanup',
              source: 'inspector'
            })
          });
          const checkoutData = await checkoutRes.json().catch(() => ({}));
          const checkoutUrl = checkoutData.checkoutUrl || '';

          els.depositBtn.disabled = false;
          els.depositBtn.textContent = '💳 Lock Fast-Lane Fix ($250 Deposit via Stripe) →';

          if (checkoutUrl && (checkoutUrl.includes('stripe.com') || checkoutUrl.includes('buy.stripe.com'))) {
            global.location.href = checkoutUrl;
          } else {
            global.location.href = `/bookings?status=deposit_ready&package=The+Signal&fast=website_cleanup`;
          }
        } catch {
          els.depositBtn.disabled = false;
          els.depositBtn.textContent = '💳 Lock Fast-Lane Fix ($250 Deposit via Stripe) →';
          global.location.href = `/bookings?status=deposit_ready&package=The+Signal&fast=website_cleanup`;
        }
      };
    }

    els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    const els = getEls();
    if (els.form) {
      els.form.addEventListener('submit', handleInspect);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
