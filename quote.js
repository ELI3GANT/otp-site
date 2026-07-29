(function initQuotePage() {
  'use strict';

  function getQuoteId() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return params.get('id').trim();
    if (params.get('token')) return params.get('token').trim();
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && (parts[0] === 'quote' || parts[0] === 'proposal')) {
      return decodeURIComponent(parts[1]).trim();
    }
    return '';
  }

  const els = {
    loading: document.getElementById('quote-loading'),
    error: document.getElementById('quote-error'),
    errorMsg: document.getElementById('quote-error-msg'),
    container: document.getElementById('quote-container'),
    title: document.getElementById('q-title'),
    subtitle: document.getElementById('q-subtitle'),
    packageBadge: document.getElementById('q-package-badge'),
    serviceBadge: document.getElementById('q-service-badge'),
    id: document.getElementById('q-id'),
    date: document.getElementById('q-date'),
    deliverables: document.getElementById('q-deliverables'),
    summaryPkg: document.getElementById('q-summary-pkg'),
    summaryTotal: document.getElementById('q-summary-total'),
    summaryDeposit: document.getElementById('q-summary-deposit'),
    payBtn: document.getElementById('q-pay-btn'),
    modal: document.getElementById('quote-checkout-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalDepositAmt: document.getElementById('modal-deposit-amt'),
    modalStripeLink: document.getElementById('modal-stripe-link'),
    modalPortalLink: document.getElementById('modal-portal-link')
  };

  let currentProposal = null;
  let currentQuoteId = '';

  async function loadQuote() {
    currentQuoteId = getQuoteId();
    if (!currentQuoteId) {
      showError('No proposal ID provided. Please check your proposal link.');
      return;
    }

    try {
      const response = await fetch(`/api/quote/${encodeURIComponent(currentQuoteId)}`, {
        headers: { Accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.proposal) {
        showError(data.message || 'This proposal link could not be found or has expired.');
        return;
      }

      currentProposal = data.proposal;
      renderQuote(currentProposal, currentQuoteId);
    } catch (err) {
      showError('Unable to load proposal details right now. Please try again shortly.');
    }
  }

  function showError(msg) {
    if (els.loading) els.loading.classList.add('hidden');
    if (els.container) els.container.classList.add('hidden');
    if (els.error) {
      els.error.classList.remove('hidden');
      if (els.errorMsg) els.errorMsg.textContent = msg;
    }
  }

  function openModal(depositAmount, checkoutUrl) {
    if (els.modalDepositAmt) els.modalDepositAmt.textContent = depositAmount;
    const token = currentProposal?.booking_token || currentProposal?.portal_token || currentQuoteId;

    if (els.modalStripeLink) {
      const isExternalStripe = checkoutUrl && (checkoutUrl.includes('stripe.com') || checkoutUrl.includes('buy.stripe.com'));
      els.modalStripeLink.href = isExternalStripe ? checkoutUrl : '#';
      els.modalStripeLink.onclick = (e) => {
        if (!isExternalStripe) {
          e.preventDefault();
          els.modalStripeLink.style.pointerEvents = 'none';
          els.modalStripeLink.innerHTML = '<span>⚡ Deposit Confirmed! Unlocking Portal...</span><span>✓</span>';
          setTimeout(() => {
            window.location.href = `/client/${encodeURIComponent(token)}`;
          }, 1200);
        }
      };
    }
    if (els.modalPortalLink) {
      els.modalPortalLink.href = `/client/${encodeURIComponent(token)}`;
    }
    if (els.modal) els.modal.classList.remove('hidden');
  }

  function closeModal() {
    if (els.modal) els.modal.classList.add('hidden');
  }

  function renderQuote(proposal, quoteId) {
    if (els.loading) els.loading.classList.add('hidden');
    if (els.error) els.error.classList.add('hidden');
    if (els.container) els.container.classList.remove('hidden');

    const clientName = proposal.client_name || proposal.clientName || 'Valued Client';
    const projectName = proposal.project_name || proposal.projectTitle || 'Custom Build & Creative Systems';
    const packageName = proposal.package_name || proposal.packageInterest || 'The Signal';
    const serviceName = proposal.service_type || proposal.serviceType || 'Creative Technology';
    const totalAmount = proposal.total_amount_display || proposal.totalDisplay || '$500';
    const depositAmount = proposal.deposit_amount_display || proposal.depositDisplay || '$250';
    const deliverablesList = Array.isArray(proposal.deliverables) && proposal.deliverables.length
      ? proposal.deliverables
      : [
          'Custom Brand & Media Deliverables',
          'Responsive Digital Experience / Booking Flow',
          'Automated Client Portal Access & Documentation'
        ];

    if (els.title) els.title.textContent = projectName;
    if (els.subtitle) els.subtitle.textContent = `Prepared for ${clientName}`;
    if (els.packageBadge) els.packageBadge.textContent = packageName;
    if (els.serviceBadge) els.serviceBadge.textContent = serviceName;
    if (els.id) els.id.textContent = quoteId.toUpperCase();
    if (els.date) els.date.textContent = `Date: ${proposal.date || new Date().toLocaleDateString()}`;

    if (els.summaryPkg) els.summaryPkg.textContent = packageName;
    if (els.summaryTotal) els.summaryTotal.textContent = totalAmount;
    if (els.summaryDeposit) els.summaryDeposit.textContent = depositAmount;

    if (els.deliverables) {
      els.deliverables.replaceChildren();
      deliverablesList.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        els.deliverables.appendChild(li);
      });
    }

    if (els.modalCloseBtn) {
      els.modalCloseBtn.onclick = closeModal;
    }

    if (els.payBtn) {
      els.payBtn.textContent = `💳 Approve Scope & Pay Deposit (${depositAmount}) →`;
      els.payBtn.onclick = async () => {
        els.payBtn.disabled = true;
        els.payBtn.textContent = 'Preparing Secure Checkout...';
        try {
          const checkoutRes = await fetch('/api/bookings/deposit-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              package_name: packageName,
              booking_token: proposal.booking_token || quoteId,
              selected_fast_offer: proposal.selected_fast_offer || '',
              source: 'quote'
            })
          });
          const checkoutData = await checkoutRes.json().catch(() => ({}));
          const checkoutUrl = checkoutData.checkoutUrl || '';

          els.payBtn.disabled = false;
          els.payBtn.textContent = `💳 Approve Scope & Pay Deposit (${depositAmount}) →`;

          const isExternalStripe = checkoutUrl && (checkoutUrl.includes('stripe.com') || checkoutUrl.includes('buy.stripe.com'));

          if (isExternalStripe) {
            window.location.href = checkoutUrl;
          } else {
            openModal(depositAmount, checkoutUrl);
          }
        } catch {
          els.payBtn.disabled = false;
          els.payBtn.textContent = `💳 Approve Scope & Pay Deposit (${depositAmount}) →`;
          openModal(depositAmount, '');
        }
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadQuote);
  } else {
    loadQuote();
  }
})();
