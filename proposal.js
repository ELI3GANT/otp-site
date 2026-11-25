(function otpPrivateProposal() {
  'use strict';

  const root = document.getElementById('proposal-root');
  if (!root) return;

  const usd = (cents) => `$${Math.round(Number(cents || 0) / 100).toLocaleString('en-US')}`;
  const catalog = window.OTP_LAUNCH_CATALOG;
  const media = window.OTP_LAUNCH_MEDIA || null;
  const proofUI = window.OTP_LAUNCH_PROOF || null;

  const SLUG_IMAGES = {
    floivation: '/assets/demos/floivation-desktop-poster.webp',
    'hyh-architecture-design': '/assets/hyh-otp-rebuild.jpg',
    floorops: '/assets/demos/floorops-dockguard.webp',
    weatheros: '/assets/demos/weatheros-desktop.webp',
    evehalo: '/assets/demos/evehalo-iphone-poster.webp',
    vault: '/assets/demos/vault-nowplaying-iphone.webp',
    'otp-studio': '/assets/demos/otp-studio-iphone-poster.webp',
    'otp-os': '/assets/demos/otp-os-desktop.webp'
  };

  const CLIENT_STATUS_LABELS = {
    draft: 'Draft Scope',
    sent: 'Prepared for Review',
    viewed: 'Ready for Approval',
    accepted: 'Accepted · Active Build',
    declined: 'Declined',
    expired: 'Window Expired',
    revoked: 'Link Closed'
  };

  function tokenFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'proposal' && parts[1]) {
      try { return decodeURIComponent(parts[1]); } catch { return parts[1]; }
    }
    const q = new URLSearchParams(window.location.search).get('token');
    return String(q || '').trim();
  }

  const token = tokenFromPath();
  let currentProposal = null;

  function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function cleanLeadingIndex(text = '') {
    return String(text || '').replace(/^\s*(?:\d{1,2}[.)\-:]\s*)+/, '').trim();
  }

  function renderError(message) {
    root.replaceChildren();
    const box = el('section', 'launch-stage-card');
    box.append(
      el('p', 'public-label', 'Private Link Unavailable'),
      el('h1', 'public-heading', 'Proposal could not be opened.'),
      el('p', 'public-muted', message || 'This link may have expired, been revoked, or is not published yet.'),
      Object.assign(el('a', 'public-text-link', 'Visit OnlyTruePerspective ↗'), { href: '/' })
    );
    root.append(box);
  }

  function resolveProofImage(example) {
    if (example.image) return example.image;
    if (example.slug && SLUG_IMAGES[example.slug]) return SLUG_IMAGES[example.slug];
    if (media && example.id) {
      const m = media.getAssetById(example.id);
      if (m?.poster) return m.poster;
    }
    if (catalog && Array.isArray(catalog.PORTFOLIO_EVIDENCE)) {
      const match = catalog.PORTFOLIO_EVIDENCE.find(
        (p) => p.slug === example.slug || p.title.toLowerCase() === String(example.title || '').toLowerCase()
      );
      if (match?.image) return match.image;
    }
    return '/assets/hyh-otp-rebuild.jpg';
  }

  function makeStageCard(num, title, subtitle) {
    const card = el('section', 'launch-stage-card');
    const head = el('div', 'launch-stage-head');
    head.append(el('span', 'launch-step-num', num));
    const textWrap = el('div');
    textWrap.append(el('h3', '', title));
    if (subtitle) textWrap.append(el('p', '', subtitle));
    head.append(textWrap);
    card.append(head);
    return card;
  }

  function humanProposalSummary(proposal) {
    const cleanClient = String(proposal.business_name || proposal.prospect_name || '').replace(/\[DEMO\]/gi, '').trim();
    const serviceObj = catalog?.findService?.(proposal.service_id);
    const serviceName = serviceObj?.name || 'Custom Digital Build';
    return cleanClient
      ? `Prepared for ${cleanClient} by OnlyTruePerspective — clear deliverables, real examples, and a straightforward timeline for your ${serviceName.toLowerCase()}.`
      : `Prepared by OnlyTruePerspective — clear deliverables, real examples, and full ownership at handoff.`;
  }

  function renderProposal(proposal, extra = {}) {
    currentProposal = proposal;
    root.replaceChildren();

    const cleanClientLabel = String(proposal.business_name || proposal.prospect_name || '').trim();
    const clientBadge = CLIENT_STATUS_LABELS[String(proposal.status || 'sent').toLowerCase()] || 'Ready for Review';

    // 1. Editorial Cover Masthead
    const masthead = el('section', 'prop-masthead');
    const top = el('div', 'prop-masthead-top');
    const lockup = el('div', 'prop-brand-lockup');
    const wizardMark = el('span', 'launch-wizard-mark');
    const logo = document.createElement('img');
    logo.src = '/assets/otp-logo-transparent.png';
    logo.width = 24;
    logo.height = 24;
    logo.alt = '';
    wizardMark.append(logo);
    lockup.append(
      wizardMark,
      el('span', 'public-label public-muted', `Prepared for ${proposal.prospect_name}${proposal.business_name ? ` · ${cleanClientLabel}` : ''}`)
    );
    top.append(lockup, el('span', 'prop-status-pill', clientBadge));

    const title = el('h1', 'prop-masthead-title', proposal.title);
    const sub = el('p', 'prop-masthead-sub', humanProposalSummary(proposal));

    const kpis = el('div', 'prop-kpi-strip');
    const totalKpi = el('div', 'prop-kpi');
    totalKpi.append(el('span', '', 'Total Investment'), el('strong', '', usd(proposal.total_price_cents)));
    const depKpi = el('div', 'prop-kpi');
    depKpi.append(el('span', '', 'Deposit to Begin'), el('strong', '', usd(proposal.deposit_cents)));
    const timeKpi = el('div', 'prop-kpi');
    timeKpi.append(el('span', '', 'Estimated Timeline'), el('strong', '', proposal.timeline || 'Scoped'));
    kpis.append(totalKpi, depKpi, timeKpi);

    masthead.append(top, title, sub, kpis);
    root.append(masthead);

    // 2. Main Split Presentation Grid
    const grid = el('div', 'launch-configurator-grid');
    const left = el('div', 'launch-form-stack');
    let secNum = 1;
    const nextNum = () => String(secNum++).padStart(2, '0');

    // Conceptual Service Visual Ribbon (clearly separate from verified portfolio builds below)
    const serviceVisual = media && typeof media.getServiceVisual === 'function'
      ? media.getServiceVisual(proposal.service_id || 'custom-web-app')
      : null;
    if (serviceVisual?.poster) {
      const conceptBanner = el('div', 'prop-concept-banner');
      if (serviceVisual.flowSlot?.status === 'ready' && serviceVisual.flowSlot?.mp4 && proofUI) {
        const mediaEl = proofUI.createMediaElement(
          {
            title: proposal.service_name || serviceVisual.title,
            poster: serviceVisual.poster,
            mp4: serviceVisual.flowSlot.mp4,
            webm: serviceVisual.flowSlot.webm || '',
            alt: serviceVisual.alt || `${proposal.service_name || 'OTP Service'} preview`
          },
          { autoplayWhenVisible: true, showPlayButton: false }
        );
        conceptBanner.append(mediaEl);
      } else {
        const bannerImg = document.createElement('img');
        bannerImg.src = serviceVisual.poster;
        bannerImg.alt = serviceVisual.alt || `${proposal.service_name || 'OTP Service'} conceptual direction`;
        bannerImg.width = 1280;
        bannerImg.height = 800;
        bannerImg.loading = 'eager';
        conceptBanner.append(bannerImg);
      }
      const bannerMeta = el('div', 'prop-concept-meta');
      bannerMeta.append(
        el('span', 'public-label public-muted', 'Your Selected Service'),
        el('strong', '', proposal.service_name || serviceVisual.title || 'Custom Scope'),
        el('span', 'public-muted', 'Real examples and before/after work included below.')
      );
      conceptBanner.append(bannerMeta);
      left.append(conceptBanner);
    }

    // Authentic Visual Proof Stage tailored to proposal.service_id or selected proof_asset_ids
    if (proofUI && media) {
      const stageCard = makeStageCard(
        nextNum(),
        'Real Client & Studio Work',
        'Interactive previews of live websites and apps built by OTP.'
      );
      const selectedAssetIds = Array.isArray(proposal.proof_asset_ids) && proposal.proof_asset_ids.length
        ? proposal.proof_asset_ids
        : null;
      const stageHost = el('div');
      const presetId = (proposal.service_id || '').includes('app') ? 'apps' : 'websites';
      proofUI.renderHardwareStage(stageHost, { category: presetId, compact: true });
      stageCard.append(stageHost);

      if (['redesign-repair', 'business-website', 'starter-website'].includes(proposal.service_id)) {
        const cmpHost = el('div');
        cmpHost.style.marginTop = '14px';
        proofUI.renderBeforeAfterSlider(cmpHost, { defaultId: proposal.service_id === 'business-website' ? 'floivation' : 'hyh' });
        stageCard.append(cmpHost);
      }

      if (selectedAssetIds) {
        const reelHost = el('div');
        reelHost.style.marginTop = '14px';
        proofUI.renderPortfolioReel(reelHost, { assetIds: selectedAssetIds.slice(0, 3) });
        stageCard.append(reelHost);
      }
      left.append(stageCard);
    }

    if (proposal.observations?.length) {
      const obsCard = makeStageCard(nextNum(), 'What We Noticed', 'Key things we spotted while reviewing your project.');
      const obsGrid = el('div', 'prop-card-grid');
      proposal.observations.forEach((o, i) => {
        const item = el('div', 'prop-insight-card');
        item.append(el('span', 'prop-insight-num', String(i + 1).padStart(2, '0')), el('span', '', cleanLeadingIndex(o)));
        obsGrid.append(item);
      });
      obsCard.append(obsGrid);
      left.append(obsCard);
    }

    if (proposal.recommendations?.length) {
      const recCard = makeStageCard(nextNum(), 'Recommended Plan', 'Clear improvements to make your site easier to use.');
      const recGrid = el('div', 'prop-card-grid');
      proposal.recommendations.forEach((r, i) => {
        const item = el('div', 'prop-insight-card');
        item.append(el('span', 'prop-insight-num', String(i + 1).padStart(2, '0')), el('span', '', cleanLeadingIndex(r)));
        recGrid.append(item);
      });
      recCard.append(recGrid);
      left.append(recCard);
    }

    if (proposal.deliverables?.length) {
      const delCard = makeStageCard(nextNum(), 'What’s Included', 'Everything included cleanly in this build.');
      const delGrid = el('div', 'prop-card-grid');
      proposal.deliverables.forEach((d) => {
        const item = el('div', 'prop-deliverable-card');
        item.append(el('span', 'prop-deliverable-check', '✓'), el('span', '', cleanLeadingIndex(d)));
        delGrid.append(item);
      });
      delCard.append(delGrid);
      left.append(delCard);
    }

    if (proposal.optional_upgrades?.length) {
      const upCard = makeStageCard(nextNum(), 'Optional Enhancements', 'Toggle enhancements to customize your final scope live.');
      const tileGrid = el('div', 'launch-tile-grid');
      const selected = new Set(proposal.selected_upgrade_ids || []);
      const locked = proposal.status === 'accepted' || proposal.status === 'declined';
      proposal.optional_upgrades.forEach((up) => {
        const isChecked = selected.has(up.id);
        const tile = el('label', `launch-feature-tile${isChecked ? ' is-checked' : ''}`);
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = isChecked;
        cb.disabled = locked;
        cb.addEventListener('change', async () => {
          if (cb.checked) selected.add(up.id);
          else selected.delete(up.id);
          tile.classList.toggle('is-checked', cb.checked);
          await respond({ action: 'select_upgrades', selected_upgrade_ids: Array.from(selected) });
        });

        const iconBox = el('span', 'launch-tile-icon');
        iconBox.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4v24M4 16h24M8 8l16 16M24 8 8 24"/></svg>';

        const copy = el('span', 'launch-tile-copy');
        copy.append(
          el('strong', '', up.label),
          el('small', '', `+${usd(up.price_cents)}${up.description ? ` · ${up.description}` : ''}`)
        );
        const checkRing = el('span', 'launch-tile-check', '✓');
        tile.append(cb, iconBox, copy, checkRing);
        tileGrid.append(tile);
      });
      upCard.append(tileGrid);
      left.append(upCard);
    }

    // Milestone Roadmap
    const roadmapCard = makeStageCard(nextNum(), 'Delivery Milestones', 'How OTP moves from kickoff to handoff without guesswork.');
    const timelineList = el('ol', 'prop-timeline-list');
    [
      ['01', 'Kickoff & Alignment', 'Approve scope, settle deposit & confirm assets.'],
      ['02', 'Visual Architecture', 'Typography, layout structure & first staging build.'],
      ['03', 'Interactive Polish', 'Responsive tuning, integrations & QA checks.'],
      ['04', 'Final Handoff', 'Launch live on your domain with full ownership.']
    ].forEach(([stepNo, stepTitle, stepDesc]) => {
      const li = el('li', 'prop-timeline-step');
      li.append(el('span', '', stepNo), el('strong', '', stepTitle), el('small', '', stepDesc));
      timelineList.append(li);
    });
    roadmapCard.append(timelineList);
    left.append(roadmapCard);

    if (proposal.portfolio_examples?.length) {
      const portCard = makeStageCard(nextNum(), 'Selected Case Studies', 'Live websites and systems informed by this scope.');
      const proofGrid = el('div', 'prop-proof-grid');
      proposal.portfolio_examples.forEach((ex) => {
        const a = el('a', 'prop-proof-item');
        a.href = ex.href || '/archive';
        const img = document.createElement('img');
        img.src = resolveProofImage(ex);
        img.alt = `${ex.title} preview`;
        img.loading = 'lazy';
        a.append(
          img,
          el('span', 'public-label public-muted', ex.category || 'Selected Work'),
          el('strong', '', `${ex.title} ↗`),
          el('small', '', ex.outcome || '')
        );
        proofGrid.append(a);
      });
      portCard.append(proofGrid);
      left.append(portCard);
    }

    // 3. Sticky Investment & Decision Column
    const right = el('aside', 'launch-summary-card');
    const summaryStatus = el('p', 'launch-status', extra.notice || '');

    const topRow = el('div', 'launch-summary-top');
    topRow.append(
      el('span', 'public-label', 'Investment Summary'),
      el('span', 'prop-status-pill', proposal.package_tier || 'Custom Scope')
    );

    const summaryMeta = el('div', 'prop-summary-meta');
    summaryMeta.innerHTML = `<span>Deposit due now: <strong>${usd(proposal.deposit_cents)}</strong></span><span>Delivery: <strong>${proposal.timeline || 'Scoped'}</strong></span>`;

    const rows = el('dl', 'launch-summary-rows');
    const upgradesTotal = Math.max(0, Number(proposal.total_price_cents || 0) - Number(proposal.base_price_cents || 0));
    [
      ['Base Scope', usd(proposal.base_price_cents)],
      ['Selected Enhancements', upgradesTotal > 0 ? `+${usd(upgradesTotal)}` : 'None added'],
      ['Deposit to Begin', usd(proposal.deposit_cents)],
      ['Remaining upon Delivery', usd(Math.max(0, Number(proposal.total_price_cents || 0) - Number(proposal.deposit_cents || 0)))]
    ].forEach(([k, v]) => {
      const div = el('div');
      div.append(el('dt', '', k), el('dd', '', v));
      rows.append(div);
    });

    right.append(
      topRow,
      el('h3', 'prop-investment-total', usd(proposal.total_price_cents)),
      summaryMeta,
      rows,
      summaryStatus
    );

    const actions = el('div', 'launch-summary-actions');
    if (proposal.status !== 'accepted' && proposal.status !== 'declined' && proposal.status !== 'expired') {
      const acceptBtn = el('button', 'public-button');
      acceptBtn.type = 'button';
      acceptBtn.innerHTML = '<span>Accept Proposal &amp; Initialize Project</span><span aria-hidden="true">↗</span>';
      acceptBtn.addEventListener('click', () => respond({ action: 'accept' }));
      actions.append(acceptBtn);

      const qInput = document.createElement('textarea');
      qInput.className = 'prop-note-area';
      qInput.rows = 2;
      qInput.placeholder = 'Ask a scope question or request an adjustment...';
      const askBtn = el('button', 'launch-secondary-btn');
      askBtn.type = 'button';
      askBtn.innerHTML = '<span>Send Question to OTP</span><span aria-hidden="true">→</span>';
      askBtn.addEventListener('click', () => respond({ action: 'inquiry', note: qInput.value }));
      const declineBtn = el('button', 'prop-decline-btn', 'Decline this proposal');
      declineBtn.type = 'button';
      declineBtn.addEventListener('click', () => respond({ action: 'decline' }));
      actions.append(qInput, askBtn, declineBtn);
    }

    if (proposal.payment_enabled) {
      const payDepBtn = el('button', 'public-button');
      payDepBtn.type = 'button';
      payDepBtn.innerHTML = `<span>Pay Deposit (${usd(proposal.deposit_cents)})</span><span aria-hidden="true">→</span>`;
      payDepBtn.addEventListener('click', () => startCheckout('deposit', summaryStatus));
      const payFullBtn = el('button', 'launch-secondary-btn');
      payFullBtn.type = 'button';
      payFullBtn.innerHTML = `<span>Pay Full Amount (${usd(proposal.total_price_cents)})</span><span aria-hidden="true">→</span>`;
      payFullBtn.addEventListener('click', () => startCheckout('full', summaryStatus));
      actions.append(payDepBtn, payFullBtn);
    } else if (proposal.status === 'accepted') {
      actions.append(el('p', 'launch-summary-policy', 'Proposal accepted. OTP will unlock online payment or share your Client Portal link shortly.'));
    }

    if (extra.portal_token) {
      const portalLink = el('a', 'public-text-link', 'Open Private Client Portal ↗');
      portalLink.href = `/client/${encodeURIComponent(extra.portal_token)}`;
      actions.append(portalLink);
    }

    right.append(actions);
    grid.append(left, right);
    root.append(grid);
  }

  async function respond(payload) {
    const res = await fetch(`/api/launch/proposals/${encodeURIComponent(token)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      renderProposal(currentProposal, { notice: data.code || 'Action failed.' });
      return;
    }
    const notice = payload.action === 'accept'
      ? 'Proposal accepted! Your project portal is ready.'
      : payload.action === 'inquiry'
        ? 'Your note was sent directly to OTP.'
        : payload.action === 'decline'
          ? 'Proposal marked as declined.'
          : 'Scope updated.';
    renderProposal(data.proposal, { notice, portal_token: data.portal_token });
  }

  function openProposalOrderReview(proposal, orderType, onConfirm) {
    const serviceObj = catalog?.findService?.(proposal.service_id) || {};
    const visual = media?.getServiceVisual?.(proposal.service_id || 'business-website');
    const dueCents = orderType === 'deposit' ? Number(proposal.deposit_cents || 0) : Number(proposal.total_price_cents || 0);
    const remCents = orderType === 'deposit' ? Math.max(0, Number(proposal.total_price_cents || 0) - dueCents) : 0;

    const backdrop = document.createElement('div');
    backdrop.className = 'launch-review-backdrop';
    const dialog = document.createElement('div');
    dialog.className = 'launch-review-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const head = document.createElement('div');
    head.className = 'launch-review-head';
    const tWrap = document.createElement('div');
    tWrap.append(
      el('span', 'public-label', 'Order Review · Owner-Approved Proposal'),
      el('h3', '', proposal.title || 'Approve & Continue to Checkout')
    );
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'otp-select-sheet-close';
    closeBtn.setAttribute('aria-label', 'Close order review');
    closeBtn.textContent = '×';
    head.append(tWrap, closeBtn);

    const hero = document.createElement('div');
    hero.className = 'launch-review-hero';
    const img = document.createElement('img');
    img.src = visual?.poster || serviceObj.previewImage || '/assets/services/business-website.webp';
    img.alt = proposal.service_id || 'OTP proposal visual';
    const meta = document.createElement('div');
    meta.append(
      el('strong', '', serviceObj.name || proposal.package_tier || 'Custom Build'),
      el('div', 'public-muted', `Estimated timeline: ${proposal.timeline || 'Scoped'}`)
    );
    hero.append(img, meta);

    const ul = el('ul', 'launch-review-list');
    (proposal.deliverables || []).slice(0, 6).forEach((d) => ul.append(el('li', '', d)));

    const totals = el('div', 'launch-review-totals');
    [
      ['Selected Enhancements', (proposal.selected_upgrade_ids || []).length ? `${proposal.selected_upgrade_ids.length} approved upgrade(s)` : 'Included in base scope', false],
      ['Total Investment', usd(proposal.total_price_cents), false],
      ['Remaining Balance After Payment', usd(remCents), false],
      [orderType === 'deposit' ? 'Approved Deposit Due Today' : 'Approved Total Due Today', usd(dueCents), true]
    ].forEach(([k, v, isDue]) => {
      const row = el('div', `launch-review-row${isDue ? ' is-due' : ''}`);
      row.append(el('span', '', k), el('strong', '', v));
      totals.append(row);
    });

    const walletNote = el('p', 'launch-review-wallets', 'Encrypted Stripe Checkout · Supports Cards, Apple Pay, Google Pay, and Link when eligible.');
    const actions = el('div', 'launch-return-actions');
    const proceed = el('button', 'public-button', 'Continue to Stripe Checkout →');
    proceed.type = 'button';
    const cancel = el('button', 'launch-secondary-btn', 'Cancel');
    cancel.type = 'button';
    cancel.style.width = 'auto';
    actions.append(proceed, cancel);

    dialog.append(head, hero, el('span', 'public-label', 'Included Deliverables'), ul, totals, walletNote, actions);
    backdrop.append(dialog);
    document.body.append(backdrop);

    const cleanup = () => backdrop.remove();
    closeBtn.addEventListener('click', cleanup);
    cancel.addEventListener('click', cleanup);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup();
    });
    proceed.addEventListener('click', async () => {
      proceed.disabled = true;
      proceed.textContent = 'Connecting to Stripe...';
      cleanup();
      await onConfirm();
    });
  }

  async function startCheckout(orderType, statusEl) {
    openProposalOrderReview(currentProposal, orderType, async () => {
      statusEl.textContent = 'Preparing secure Stripe checkout...';
      const returnBase = `${window.location.origin}${window.location.pathname}`;
      const res = await fetch('/api/launch/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          proposal_token: token,
          order_type: orderType,
          origin: window.location.origin,
          success_url: `${returnBase}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${returnBase}?checkout=cancelled`,
          idempotency_key: `PROP-${currentProposal?.proposal_id}-${orderType}-${Date.now()}`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      if (data.code === 'checkout_temporarily_disabled') {
        statusEl.textContent = data.blocker || 'Online checkout is temporarily paused. Existing payments remain unaffected.';
        return;
      }
      statusEl.textContent = data.blocker || data.message || 'Payment gateway requires active Stripe credentials on OTP OS.';
    });
  }

  async function init() {
    if (!token) {
      renderError('Missing proposal token.');
      return;
    }
    const res = await fetch(`/api/launch/proposals/${encodeURIComponent(token)}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.proposal) {
      renderError(data.code === 'proposal_revoked' ? 'This proposal link has been revoked.' : 'This proposal is unavailable or expired.');
      return;
    }
    let notice = '';
    let portalToken = '';
    const params = new URLSearchParams(window.location.search || '');
    const checkoutParam = params.get('checkout');
    const sessionId = params.get('session_id');
    if (checkoutParam === 'cancelled') {
      notice = 'Checkout canceled. No charge occurred.';
    } else if (checkoutParam && sessionId) {
      const stRes = await fetch(`/api/launch/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' }).catch(() => null);
      const stData = stRes ? await stRes.json().catch(() => ({})) : {};
      if (stData.verified_paid) {
        notice = `Payment confirmed (${usd(stData.payment_summary?.amount_cents)}). Client Portal unlocked.`;
        portalToken = stData.payment_summary?.portal_token || '';
      } else {
        notice = 'Payment processing — waiting for Stripe confirmation before unlocking portal.';
      }
    }
    renderProposal(data.proposal, { notice, portal_token: portalToken });
  }

  init().catch(() => renderError('Unable to load proposal right now.'));
})();
