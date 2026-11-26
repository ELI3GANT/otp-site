(function otpLaunchApp() {
  'use strict';

  const catalog = window.OTP_LAUNCH_CATALOG;
  if (!catalog) return;

  const ICONS = {
    spark: '<path d="M16 4v6M16 22v6M4 16h6M22 16h6M7.5 7.5l4.2 4.2M20.3 20.3l4.2 4.2M24.5 7.5l-4.2 4.2M11.7 20.3l-4.2 4.2"/>',
    music: '<path d="M12 22a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm0 0V7l14-3v15m0 0a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"/>',
    building: '<path d="M4 27V7l10-3v23M14 13l14 3v11M2 27h28M9 11h.1M9 16h.1M9 21h.1M21 19h.1M21 23h.1"/>',
    bag: '<path d="M6 10h20l-1.5 17h-17L6 10Zm5 0a5 5 0 0 1 10 0"/>',
    wrench: '<path d="M21 5a6 6 0 0 0-7.6 7.6L6 20l4 4 7.4-7.4A6 6 0 0 0 25 9l-3.5 3.5-2.5-2.5L22.5 6.5"/>',
    layers: '<path d="m16 4 12 6-12 6-12-6 12-6Zm-12 12 12 6 12-6M4 22l12 6 12-6"/>',
    phone: '<rect x="8" y="3" width="16" height="26" rx="3"/><path d="M14 7h4M15 24h2"/>',
    grid: '<rect x="4" y="4" width="10" height="10" rx="2"/><rect x="18" y="4" width="10" height="10" rx="2"/><rect x="4" y="18" width="10" height="10" rx="2"/><rect x="18" y="18" width="10" height="10" rx="2"/>',
    shield: '<path d="M16 4 6 8v8c0 6.5 4.3 10.6 10 12 5.7-1.4 10-5.5 10-12V8l-10-4Zm-4 12 3 3 5-6"/>',
    mobile: '<rect x="9" y="4" width="14" height="24" rx="2.5"/><path d="M14 23h4"/>',
    seo: '<circle cx="14" cy="14" r="9"/><path d="m21 21 7 7M10 14h8M14 10v8"/>',
    inbox: '<path d="M4 10a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10Zm0 1 12 7 12-7"/>',
    calendar: '<rect x="4" y="6" width="24" height="21" rx="2"/><path d="M4 12h24M10 4v4M22 4v4M11 18l3 3 7-6"/>',
    portal: '<rect x="4" y="5" width="24" height="22" rx="2"/><path d="M12 5v22M4 12h24"/>',
    card: '<rect x="3" y="7" width="26" height="18" rx="2.5"/><path d="M3 13h26M8 20h6"/>',
    play: '<circle cx="16" cy="16" r="11"/><path d="m13 11 9 5-9 5v-10Z"/>',
    cpu: '<rect x="9" y="9" width="14" height="14" rx="2"/><path d="M12 4v5M20 4v5M12 23v5M20 23v5M4 12h5M4 20h5M23 12h5M23 20h5"/>',
    plug: '<path d="M12 4v7M20 4v7M7 11h18v3a9 9 0 0 1-18 0v-3Zm9 12v5"/>',
    bolt: '<path d="M17 3 7 18h8l-1 11 11-15h-8l0-11Z"/>',
    palette: '<circle cx="16" cy="16" r="11"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="11" cy="19" r="1.5"/>',
    feather: '<path d="M25 7c-5 0-11 3-14 8l-6 12 12-6c5-3 8-9 8-14ZM11 21l6-6"/>',
    chevron: '<path d="m9 13 7 7 7-7"/>'
  };

  function iconSvg(key, className = 'launch-icon') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[key] || ICONS.spark;
    return svg;
  }

  const els = {
    categoryTabs: document.getElementById('launch-category-tabs'),
    catalogGrid: document.getElementById('launch-catalog-grid'),
    proofGrid: document.getElementById('launch-proof-grid'),
    compareStage: document.getElementById('launch-compare-stage'),
    heroDeviceStage: document.getElementById('launch-hero-device-stage'),
    heroImg: document.getElementById('launch-hero-preview-img'),
    heroTag: document.getElementById('launch-hero-preview-tag'),
    heroTitle: document.getElementById('launch-hero-preview-title'),
    activeBanner: document.getElementById('lc-active-banner'),
    serviceSelect: document.getElementById('lc-service'),
    objectives: document.getElementById('lc-objectives'),
    features: document.getElementById('lc-features'),
    enhancements: document.getElementById('lc-enhancements'),
    form: document.getElementById('launch-configurator-form'),
    assetsInput: document.getElementById('lc-assets'),
    assetList: document.getElementById('lc-asset-list'),
    summaryService: document.getElementById('lc-summary-service'),
    summaryBadge: document.getElementById('lc-summary-badge'),
    summaryPrice: document.getElementById('lc-summary-price'),
    summaryPolicy: document.getElementById('lc-summary-policy'),
    summaryRows: document.getElementById('lc-summary-rows'),
    mobileService: document.getElementById('lc-mobile-service'),
    mobilePrice: document.getElementById('lc-mobile-price'),
    submitBtn: document.getElementById('lc-submit-proposal-btn'),
    checkoutBtn: document.getElementById('lc-checkout-btn'),
    consultBtn: document.getElementById('lc-consult-btn'),
    status: document.getElementById('lc-status'),
    resultBox: document.getElementById('lc-result-box'),
    progressBar: document.getElementById('launch-progress-bar')
  };
  const launchCtx = window.OTP_LAUNCH_CONTEXT || null;
  const launchProof = window.OTP_LAUNCH_PROOF || null;
  const launchMedia = window.OTP_LAUNCH_MEDIA || null;
  let heroStageController = null;

  const state = {
    activeGroup: 'all',
    selectedServiceId: 'starter-website',
    expandedServiceIds: new Set(),
    objectives: new Set(),
    features: new Set(['mobile-responsive', 'seo-foundation', 'inquiry-cta']),
    enhancements: new Set(),
    uploadedAssets: [],
    uploadSession: null,
    bookingToken: launchCtx?.getOrCreateBookingToken?.('LAUNCH') || `LAUNCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  };

  function setStatus(msg, isError = false) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.classList.toggle('is-error', Boolean(isError));
  }

  function renderCategoryTabs() {
    if (!els.categoryTabs || !Array.isArray(catalog.VISUAL_GROUPS)) return;
    els.categoryTabs.replaceChildren();
    catalog.VISUAL_GROUPS.forEach((grp) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.role = 'tab';
      btn.className = `launch-cat-tab${grp.id === state.activeGroup ? ' is-active' : ''}`;
      btn.setAttribute('aria-selected', grp.id === state.activeGroup ? 'true' : 'false');
      const count = grp.id === 'all'
        ? catalog.SERVICES.length
        : catalog.SERVICES.filter((s) => s.visualGroup === grp.id).length;
      btn.textContent = `${grp.label} (${count})`;
      btn.addEventListener('click', () => {
        state.activeGroup = grp.id;
        renderCategoryTabs();
        filterCatalogCards();
        const presetId = grp.id === 'apps' ? 'apps' : grp.id === 'care' ? 'care' : 'websites';
        heroStageController?.selectPreset?.(presetId === 'care' ? 'systems' : presetId);
      });
      els.categoryTabs.append(btn);
    });
  }

  function filterCatalogCards() {
    if (!els.catalogGrid) return;
    els.catalogGrid.querySelectorAll('.launch-service-card').forEach((card) => {
      const group = card.getAttribute('data-visual-group') || 'websites';
      card.hidden = state.activeGroup !== 'all' && group !== state.activeGroup;
    });
    launchProof?.syncVisibleVideos?.();
  }

  function renderCatalog() {
    if (!els.catalogGrid) return;
    els.catalogGrid.replaceChildren();
    catalog.SERVICES.forEach((svc, idx) => {
      const card = document.createElement('article');
      card.className = `launch-service-card${svc.id === state.selectedServiceId ? ' is-selected' : ''}`;
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-service-id', svc.id);
      card.setAttribute('data-visual-group', svc.visualGroup || 'websites');
      card.hidden = state.activeGroup !== 'all' && (svc.visualGroup || 'websites') !== state.activeGroup;

      const serviceVisual = launchMedia && typeof launchMedia.getServiceVisual === 'function'
        ? launchMedia.getServiceVisual(svc.id)
        : null;
      const flowSlotReady = serviceVisual?.flowSlot?.status === 'ready' && serviceVisual?.flowSlot?.mp4;

      const media = document.createElement('div');
      const isStudioConcept = svc.visualStyle === 'studio-concept' || Boolean(serviceVisual);
      const isPortrait = !isStudioConcept && svc.previewDevice === 'iphone';
      const styleClass = svc.visualStyle ? ` is-${svc.visualStyle}` : '';
      media.className = `launch-card-media${isPortrait ? ' is-portrait' : ''}${styleClass}`;
      media.setAttribute('data-visual-role', svc.visualRole || serviceVisual?.visualRole || 'conceptual_service_illustration');

      if (flowSlotReady && launchProof) {
        media.append(
          launchProof.createMediaElement(
            {
              title: svc.name,
              poster: svc.previewImage || serviceVisual.poster,
              mp4: serviceVisual.flowSlot.mp4,
              webm: serviceVisual.flowSlot.webm || '',
              alt: svc.previewAlt || serviceVisual.alt || svc.name
            },
            { autoplayWhenVisible: true, showPlayButton: true, hoverTriggerEl: card, eager: idx < 3 }
          )
        );
      } else {
        const img = document.createElement('img');
        img.src = svc.previewImage || serviceVisual?.poster || '/assets/services/starter-website.webp';
        img.alt = svc.previewAlt || serviceVisual?.alt || svc.name;
        img.width = 1280;
        img.height = 800;
        img.loading = 'lazy';
        img.decoding = 'async';
        media.append(img);
      }

      const overlay = document.createElement('div');
      overlay.className = 'launch-card-media-overlay';
      if (svc.pricingMode === 'fixed_offer') {
        const priceLabel = document.createElement('span');
        priceLabel.className = 'launch-price-pill is-fixed';
        priceLabel.textContent = '$199 Fixed';
        overlay.append(priceLabel);
      } else {
        const formatTag = document.createElement('span');
        formatTag.className = 'launch-price-pill';
        formatTag.textContent = svc.previewLabel || svc.category;
        overlay.append(formatTag);
      }
      media.append(overlay);

      const body = document.createElement('div');
      body.className = 'launch-card-body';
      const title = document.createElement('h3');
      title.textContent = svc.name;
      const tagline = document.createElement('p');
      tagline.textContent = svc.cardSummary || svc.tagline;

      const benefitRow = document.createElement('div');
      benefitRow.className = 'launch-card-benefits';
      const items = Array.isArray(svc.benefitItems)
        ? svc.benefitItems
        : (svc.deliverables || []).slice(0, 3).map((d) => ({ iconKey: 'spark', label: d }));
      items.slice(0, 3).forEach((item) => {
        const chip = document.createElement('div');
        chip.className = 'launch-benefit-item';
        const iWrap = document.createElement('span');
        iWrap.className = 'launch-benefit-icon';
        iWrap.append(iconSvg(item.iconKey || 'spark'));
        const txt = document.createElement('span');
        txt.className = 'launch-benefit-label';
        txt.textContent = item.label;
        chip.append(iWrap, txt);
        benefitRow.append(chip);
      });

      const isExpanded = state.expandedServiceIds.has(svc.id);
      const details = document.createElement('div');
      details.className = `launch-card-details${isExpanded ? ' is-expanded' : ''}`;
      details.addEventListener('click', (e) => e.stopPropagation());

      const toggleId = `lc-card-toggle-${svc.id}`;
      const panelId = `lc-card-panel-${svc.id}`;
      const sum = document.createElement('button');
      sum.type = 'button';
      sum.id = toggleId;
      sum.className = 'launch-card-details-toggle';
      sum.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      sum.setAttribute('aria-controls', panelId);
      const sumLabel = document.createElement('span');
      sumLabel.textContent = 'What’s included';
      const chev = iconSvg('chevron', 'launch-card-details-chevron');
      sum.append(sumLabel, chev);

      const panel = document.createElement('div');
      panel.id = panelId;
      panel.className = 'launch-card-details-panel';
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', toggleId);
      panel.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
      const inner = document.createElement('div');
      inner.className = 'launch-card-details-inner';
      const specList = document.createElement('ul');
      (svc.deliverables || []).forEach((d) => {
        const li = document.createElement('li');
        li.textContent = `✓ ${d}`;
        specList.append(li);
      });
      inner.append(specList);
      panel.append(inner);

      sum.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nextOpen = !state.expandedServiceIds.has(svc.id);
        if (nextOpen) state.expandedServiceIds.add(svc.id);
        else state.expandedServiceIds.delete(svc.id);
        details.classList.toggle('is-expanded', nextOpen);
        sum.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
        panel.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
      });

      details.append(sum, panel);

      body.append(title, tagline, benefitRow, details);

      const footer = document.createElement('div');
      footer.className = 'launch-card-footer';
      const meta = document.createElement('div');
      meta.className = 'launch-card-meta';
      const priceStrong = document.createElement('strong');
      priceStrong.textContent = svc.pricingMode === 'fixed_offer' ? '$199' : 'Custom quote';
      const timing = document.createElement('small');
      timing.textContent = svc.timeline;
      meta.append(priceStrong, timing);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'launch-select-btn';
      btn.textContent = svc.id === state.selectedServiceId ? 'Selected ✓' : `${svc.ctaLabel || 'Get started'} →`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectService(svc.id, true);
      });
      footer.append(meta, btn);

      card.addEventListener('click', () => selectService(svc.id, false));
      card.append(media, body, footer);
      els.catalogGrid.append(card);
    });
  }

  function renderProof() {
    if (els.compareStage && launchProof) {
      launchProof.renderBeforeAfterSlider(els.compareStage, { defaultId: 'hyh' });
    }
    if (!els.proofGrid) return;
    if (launchProof && launchMedia) {
      els.proofGrid.className = 'launch-proof-reel-wrap';
      launchProof.renderPortfolioReel(els.proofGrid, {
        assetIds: ['floivation-desktop', 'floorops-platform', 'evehalo-ios', 'vault-ios', 'otp-studio-ios', 'weatheros-suite']
      });
      return;
    }
    els.proofGrid.replaceChildren();
    catalog.PORTFOLIO_EVIDENCE.forEach((item) => {
      const card = document.createElement('a');
      card.className = 'launch-proof-card';
      card.href = item.href;
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = `${item.title} preview`;
      img.loading = 'lazy';
      const cat = document.createElement('span');
      cat.className = 'public-label';
      cat.textContent = item.category;
      const h3 = document.createElement('h3');
      h3.textContent = item.title;
      const p = document.createElement('p');
      p.textContent = item.outcome;
      card.append(img, cat, h3, p);
      els.proofGrid.append(card);
    });
  }

  function syncHeroStageAndBanner(svc) {
    if (heroStageController && svc) {
      const presetMap = {
        'starter-website': 'studio',
        'business-website': 'websites',
        'ecommerce-experience': 'websites',
        'redesign-repair': 'websites',
        'artist-epk': 'systems',
        'custom-web-app': 'apps',
        'native-app': 'apps',
        'digital-templates': 'studio',
        'maintenance-enhancements': 'systems'
      };
      heroStageController.selectPreset(presetMap[svc.id] || 'websites');
    }
    if (els.heroImg && svc.previewImage) {
      els.heroImg.src = svc.previewImage;
      els.heroImg.alt = svc.previewAlt || svc.name;
    }
    if (els.heroTag) els.heroTag.textContent = svc.previewLabel || svc.category;
    if (els.heroTitle) els.heroTitle.textContent = `${svc.name} — ${svc.priceDisplay}`;

    if (els.activeBanner) {
      els.activeBanner.replaceChildren();
      const thumb = document.createElement('img');
      thumb.src = svc.previewImage || '/assets/hyh-otp-rebuild.jpg';
      thumb.alt = '';
      const info = document.createElement('div');
      info.className = 'launch-active-banner-info';
      const strong = document.createElement('strong');
      strong.textContent = `${svc.name} · ${svc.timeline}`;
      const small = document.createElement('small');
      small.textContent = svc.tagline;
      info.append(strong, small);
      const badge = document.createElement('span');
      badge.className = `launch-price-pill${svc.pricingMode === 'fixed_offer' ? ' is-fixed' : ''}`;
      badge.textContent = svc.pricingMode === 'fixed_offer' ? '$199 Fixed' : 'Custom Quote';
      els.activeBanner.append(thumb, info, badge);
    }

    const includedBox = document.getElementById('lc-included-deliverables');
    if (includedBox && Array.isArray(svc?.deliverables)) {
      includedBox.replaceChildren();
      const disclosure = document.createElement('details');
      disclosure.className = 'launch-included-disclosure';
      const summary = document.createElement('summary');
      summary.textContent = `What’s included in ${svc.name} (${svc.deliverables.length})`;
      const list = document.createElement('ul');
      svc.deliverables.forEach((d) => {
        const li = document.createElement('li');
        li.textContent = `✓ ${d}`;
        list.append(li);
      });
      disclosure.append(summary, list);
      includedBox.append(disclosure);
    }
  }

  function populateFormControls() {
    if (els.serviceSelect) {
      els.serviceSelect.replaceChildren();
      catalog.SERVICES.forEach((svc) => {
        const opt = document.createElement('option');
        opt.value = svc.id;
        opt.textContent = `${svc.name} — ${svc.priceDisplay}`;
        els.serviceSelect.append(opt);
      });
      els.serviceSelect.value = state.selectedServiceId;
      if (launchCtx && typeof launchCtx.enhanceSelect === 'function') {
        launchCtx.enhanceSelect(els.serviceSelect, {
          sheetTitle: 'Choose an OTP service',
          labelledBy: 'lc-service-label',
          footerNote: 'Starter Website is fixed at $199. Custom services include a private proposal and owner scope approval before payment.',
          getOptionMeta(val) {
            const svc = catalog.findService(val);
            return {
              icon: svc.iconKey || 'spark',
              thumb: svc.previewImage,
              title: svc.name,
              subtitle: svc.timeline,
              badge: svc.pricingMode === 'fixed_offer' ? '$199 Fixed' : `${catalog.formatUsd(svc.estimateMinCents)}+ est.`,
              badgeVariant: svc.pricingMode === 'fixed_offer' ? 'fixed' : 'custom'
            };
          }
        });
      }
    }

    if (els.objectives) {
      els.objectives.replaceChildren();
      catalog.OBJECTIVES.forEach((label) => {
        const wrap = document.createElement('label');
        wrap.className = 'launch-pill-tile';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = label;
        input.addEventListener('change', () => {
          if (input.checked) state.objectives.add(label);
          else state.objectives.delete(label);
          wrap.classList.toggle('is-checked', input.checked);
          updateSummary();
        });
        const text = document.createElement('span');
        text.textContent = label;
        wrap.append(input, text);
        els.objectives.append(wrap);
      });
    }

    const renderTileGroup = (container, items, targetSet) => {
      if (!container) return;
      container.replaceChildren();
      items.forEach((item) => {
        const checked = targetSet.has(item.id);
        const tile = document.createElement('label');
        tile.className = `launch-feature-tile${checked ? ' is-checked' : ''}`;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = item.id;
        input.checked = checked;
        input.addEventListener('change', () => {
          if (input.checked) targetSet.add(item.id);
          else targetSet.delete(item.id);
          tile.classList.toggle('is-checked', input.checked);
          updateSummary();
        });

        const iconBox = document.createElement('span');
        iconBox.className = 'launch-tile-icon';
        iconBox.append(iconSvg(item.iconKey || 'spark'));

        const copy = document.createElement('span');
        copy.className = 'launch-tile-copy';
        const title = document.createElement('strong');
        title.textContent = item.customerTitle || item.label;
        const hint = document.createElement('small');
        hint.textContent = item.hint || (item.starterCompatible ? 'Included in Starter Offer' : 'Scoped custom capability');
        copy.append(title, hint);

        const checkRing = document.createElement('span');
        checkRing.className = 'launch-tile-check';
        checkRing.setAttribute('aria-hidden', 'true');
        checkRing.textContent = '✓';

        tile.append(input, iconBox, copy, checkRing);
        container.append(tile);
      });
    };

    renderTileGroup(els.features, catalog.FEATURES, state.features);
    renderTileGroup(els.enhancements, catalog.ENHANCEMENTS, state.enhancements);
  }

  function syncFeatureCheckboxes() {
    if (!els.features) return;
    els.features.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      const on = state.features.has(box.value);
      box.checked = on;
      box.closest('.launch-feature-tile')?.classList.toggle('is-checked', on);
    });
  }

  let contextReady = false;

  function persistLaunchContext(input, requirements, summaryText) {
    if (!contextReady || !launchCtx || typeof launchCtx.save !== 'function') return;
    const svc = catalog.findService(input.service_id);
    const tracking = window.OTPAttribution && typeof window.OTPAttribution.getSourceTrackingPayload === 'function'
      ? window.OTPAttribution.getSourceTrackingPayload({ ctaSource: 'otp_launch_configurator', bookingRoute: '/launch' })
      : null;
    launchCtx.save({
      booking_token: state.bookingToken,
      service_id: svc.id,
      service_name: requirements.service_name,
      booking_service_type: svc.bookingServiceType,
      package_interest: requirements.recommended_package,
      estimate_display: requirements.estimate_display,
      estimate_min_cents: requirements.estimate_min_cents,
      estimate_max_cents: requirements.estimate_max_cents,
      checkout_eligible: requirements.checkout_eligible,
      owner_approval_required: requirements.owner_approval_required,
      timeline: requirements.timeline,
      deliverables: requirements.deliverables,
      name: input.name,
      business_name: input.business_name,
      email: input.email,
      phone: input.phone,
      existing_website: input.existing_website,
      social_links: input.social_links,
      project_description: input.project_description,
      objectives: input.objectives,
      features: input.features,
      enhancements: input.enhancements,
      summary_text: summaryText,
      ...(tracking ? { attribution: tracking } : {})
    });
  }

  function syncCatalogSelection() {
    if (!els.catalogGrid) return;
    els.catalogGrid.querySelectorAll('.launch-service-card').forEach((card) => {
      const id = card.getAttribute('data-service-id');
      const isSel = id === state.selectedServiceId;
      card.classList.toggle('is-selected', isSel);
      const btn = card.querySelector('.launch-select-btn');
      if (btn) {
        const svc = catalog.findService(id);
        btn.textContent = isSel ? 'Selected ✓' : `${svc.ctaLabel || 'Get started'} →`;
      }
    });
    launchProof?.syncVisibleVideos?.();
  }

  function selectService(serviceId, scroll = false, { preserveFeatures = false } = {}) {
    const svc = catalog.findService(serviceId);
    state.selectedServiceId = svc.id;
    if (!preserveFeatures) {
      state.features = new Set(svc.defaultFeatures);
    }
    if (els.serviceSelect) {
      els.serviceSelect.value = svc.id;
      launchCtx?.syncEnhancedSelect?.(els.serviceSelect);
    }
    syncFeatureCheckboxes();
    if (els.catalogGrid?.children?.length) {
      syncCatalogSelection();
    } else {
      renderCatalog();
    }
    syncHeroStageAndBanner(svc);
    updateSummary();
    if (scroll) {
      document.getElementById('configurator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function currentPayload() {
    const fd = els.form ? new FormData(els.form) : new FormData();
    return {
      service_id: state.selectedServiceId,
      name: String(fd.get('name') || '').trim(),
      business_name: String(fd.get('business_name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      existing_website: String(fd.get('existing_website') || '').trim(),
      social_links: String(fd.get('social_links') || '').trim(),
      project_description: String(fd.get('project_description') || '').trim(),
      objectives: Array.from(state.objectives),
      features: Array.from(state.features),
      enhancements: Array.from(state.enhancements),
      assets: state.uploadedAssets
    };
  }

  function updateProgress(input) {
    if (!els.progressBar) return;
    const step1Done = Boolean(input.name && (input.email || input.phone));
    const step2Done = input.objectives.length > 0 || input.features.length > 0;
    const step3Done = Boolean(input.project_description || state.uploadedAssets.length);
    const states = [
      { n: '1', done: step1Done, active: !step1Done },
      { n: '2', done: step2Done && step1Done, active: step1Done && !step3Done },
      { n: '3', done: step3Done, active: step1Done && step3Done }
    ];
    states.forEach((s) => {
      const li = els.progressBar.querySelector(`[data-step-pill="${s.n}"]`);
      if (!li) return;
      li.classList.toggle('is-done', s.done);
      li.classList.toggle('is-active', s.active);
    });
  }

  function updateSummary() {
    const input = currentPayload();
    const { requirements, summaryText } = catalog.computeLaunchEstimate(input);
    const svc = catalog.findService(input.service_id);
    syncHeroStageAndBanner(svc);
    updateProgress(input);
    persistLaunchContext(input, requirements, summaryText);

    if (els.summaryService) els.summaryService.textContent = requirements.service_name;
    if (els.summaryBadge) {
      els.summaryBadge.textContent = requirements.checkout_eligible ? 'Instant Starter' : 'Custom Quote';
    }
    if (els.summaryPrice) els.summaryPrice.textContent = requirements.estimate_display;
    if (els.summaryPolicy) {
      els.summaryPolicy.textContent = requirements.checkout_eligible
        ? 'Fixed $199 price—ready for immediate booking or proposal request.'
        : (requirements.scope_upgrade_triggered
          ? 'Custom capabilities added: OTP reviews scope and approves exact pricing before payment.'
          : 'Tailored estimate: OTP reviews your brief and sends a private proposal & payment link.');
    }
    if (els.mobileService) els.mobileService.textContent = requirements.service_name;
    if (els.mobilePrice) {
      els.mobilePrice.textContent = requirements.checkout_eligible
        ? '$199 Fixed Offer'
        : `${catalog.formatUsd(requirements.estimate_min_cents)}–${catalog.formatUsd(requirements.estimate_max_cents)} est.`;
    }

    if (els.summaryRows) {
      const featureNames = requirements.features.map((f) => {
        const match = catalog.FEATURES.find((x) => x.id === f.id);
        return (match && (match.shortLabel || match.customerTitle)) || f.label;
      });
      const enhancementNames = requirements.enhancements.map((e) => {
        const match = catalog.ENHANCEMENTS.find((x) => x.id === e.id);
        return (match && (match.shortLabel || match.customerTitle)) || e.label;
      });
      els.summaryRows.replaceChildren();
      [
        ['Studio Tier', requirements.recommended_package],
        ['Target Timeline', requirements.timeline]
      ].forEach(([k, v]) => {
        const row = document.createElement('div');
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        row.append(dt, dd);
        els.summaryRows.append(row);
      });

      const addChipRow = (label, chips, emptyLabel) => {
        const row = document.createElement('div');
        row.className = 'launch-summary-row-full';
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.style.textAlign = 'left';
        const list = document.createElement('ul');
        list.className = 'launch-summary-chips';
        if (chips.length) {
          chips.forEach((chipText) => {
            const li = document.createElement('li');
            li.className = 'launch-summary-chip';
            li.textContent = chipText;
            list.append(li);
          });
        } else {
          const li = document.createElement('li');
          li.className = 'launch-summary-chip is-empty';
          li.textContent = emptyLabel;
          list.append(li);
        }
        dd.append(list);
        row.append(dt, dd);
        els.summaryRows.append(row);
      };

      addChipRow('Capabilities', featureNames, 'Core defaults');
      addChipRow('Enhancements', enhancementNames, 'None added');
      addChipRow(
        'Brand Files',
        state.uploadedAssets.map((a) => a.name),
        'None attached'
      );
    }

    if (els.checkoutBtn) {
      els.checkoutBtn.disabled = !requirements.checkout_eligible;
      els.checkoutBtn.querySelector('span').textContent = requirements.checkout_eligible
        ? 'Start $199 Starter Now'
        : 'Unlocked After Owner Approval';
    }

    if (launchCtx && typeof launchCtx.save === 'function') {
      launchCtx.save({
        ...input,
        service_name: requirements.service_name,
        package_interest: requirements.recommended_package,
        estimate_display: requirements.estimate_display,
        checkout_eligible: requirements.checkout_eligible,
        deliverables: requirements.deliverables,
        booking_service_type: svc.bookingServiceType,
        summary_text: catalog.computeLaunchEstimate(input).summaryText
      });
    }
  }

  async function handleAssetUpload(files) {
    if (!files || !files.length) return;
    const selected = Array.from(files).slice(0, 3);
    state.uploadedAssets = [];
    if (els.assetList) els.assetList.replaceChildren();

    let session = null;
    try {
      const res = await fetch('/api/bookings/upload-session', { method: 'POST', headers: { Accept: 'application/json' } });
      if (res.ok) session = await res.json();
    } catch (_) { /* offline fallback records safe metadata */ }

    if (session?.upload_token && session?.booking_token) {
      state.uploadSession = { bookingToken: session.booking_token, uploadToken: session.upload_token };
      state.bookingToken = session.booking_token;
    }

    for (const file of selected) {
      if (file.size > 10 * 1024 * 1024) {
        setStatus(`Skipped ${file.name}: exceeds 10MB limit.`, true);
        continue;
      }
      const meta = { id: '', name: file.name, type: file.type, size: file.size, uploaded: false };
      let fallbackNotice = '';
      if (session?.upload_token && session?.booking_token) {
        try {
          const uploadRes = await fetch(`/api/bookings/upload?file_name=${encodeURIComponent(file.name)}&file_type=${encodeURIComponent(file.type)}&file_size=${file.size}`, {
            method: 'POST',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'x-booking-token': session.booking_token,
              'x-booking-upload-token': session.upload_token
            },
            body: file
          });
          if (uploadRes.ok) {
            const upData = await uploadRes.json().catch(() => ({}));
            meta.uploaded = true;
            meta.id = String(upData.upload_id || '').trim();
          } else {
            fallbackNotice = 'Direct file storage is offline here—file details are noted; add a Drive/Figma link above or upload in your Client Portal after kickoff.';
          }
        } catch (_) {
          fallbackNotice = 'Direct file storage is offline here—file details are noted; add a Drive/Figma link above or upload in your Client Portal after kickoff.';
        }
      } else {
        fallbackNotice = 'File details noted with your brief—you can also paste a Google Drive or Figma link above.';
      }
      state.uploadedAssets.push(meta);
      if (els.assetList) {
        const li = document.createElement('li');
        li.textContent = `${meta.name} (${Math.round(meta.size / 1024)} KB) — ${meta.uploaded ? 'uploaded' : 'noted with brief (share link or add in Portal)'}`;
        els.assetList.append(li);
      }
      if (fallbackNotice) setStatus(fallbackNotice, false);
    }
    updateSummary();
  }

  function showResult(title, detail, linkHref = '', linkLabel = '') {
    if (!els.resultBox) return;
    els.resultBox.classList.remove('hidden');
    els.resultBox.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = title;
    const p = document.createElement('p');
    p.textContent = detail;
    els.resultBox.append(strong, p);
    if (linkHref && linkLabel) {
      const a = document.createElement('a');
      a.className = 'public-text-link';
      a.href = linkHref;
      a.textContent = linkLabel;
      els.resultBox.append(a);
    }
  }

  async function submitProposalRequest() {
    const input = currentPayload();
    if (!input.name || (!input.email && !input.phone) || !input.project_description) {
      setStatus('Please enter your name, email or phone, and a short description of your project.', true);
      return;
    }

    const { requirements, summaryText } = catalog.computeLaunchEstimate(input);
    const tracking = window.OTPAttribution && typeof window.OTPAttribution.getSourceTrackingPayload === 'function'
      ? window.OTPAttribution.getSourceTrackingPayload({ ctaSource: 'otp_launch_configurator', bookingRoute: '/launch' })
      : {};

    setStatus('Sending your build plan to OnlyTruePerspective...');
    if (els.submitBtn) els.submitBtn.disabled = true;

    try {
      const uploadedIds = state.uploadedAssets.map((a) => a.id).filter(Boolean);
      const submitHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (uploadedIds.length && state.uploadSession?.uploadToken) {
        submitHeaders['x-booking-upload-token'] = state.uploadSession.uploadToken;
      }
      const response = await fetch('/api/launch/submit', {
        method: 'POST',
        headers: submitHeaders,
        body: JSON.stringify({
          booking_token: (uploadedIds.length && state.uploadSession?.bookingToken) || state.bookingToken,
          upload_ids: uploadedIds,
          name: input.name,
          business_name: input.business_name,
          email: input.email,
          phone: input.phone,
          ig_handle: input.social_links,
          reference_link: input.existing_website,
          service_type: catalog.findService(input.service_id).bookingServiceType,
          package_interest: requirements.recommended_package,
          project_description: summaryText,
          desired_deliverables: requirements.deliverables.join('; '),
          budget_range: requirements.estimate_display,
          launch_requirements: requirements,
          contact_consent: true,
          source_tracking: { ...tracking, cta_source: 'otp_launch_configurator' }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.message || 'Could not submit requirements right now.');
      }
      setStatus('Received! OTP will review your build plan and follow up shortly.');
      const portalHref = data.clientPortalPath || data.portalUrl || '/portal';
      if (launchCtx && typeof launchCtx.save === 'function') {
        launchCtx.save({
          booking_id: data.booking_id || state.bookingToken,
          job_id: data.job_id || data.booking_id || state.bookingToken,
          portal_url: portalHref
        });
      }
      showResult(
        'Proposal Request Received',
        `Reference: ${data.booking_id || state.bookingToken}. Your ${requirements.service_name} plan is saved.`,
        portalHref,
        data.clientPortalPath || data.portalUrl ? 'Open Private Client Portal ↗' : 'Access Client Portal ↗'
      );
    } catch (err) {
      setStatus(err.message || 'Submission failed. Please try again.', true);
    } finally {
      if (els.submitBtn) els.submitBtn.disabled = false;
    }
  }

  function openOrderReviewDialog({ service, requirements, onConfirm }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'launch-review-backdrop';
    backdrop.setAttribute('role', 'presentation');

    const dialog = document.createElement('div');
    dialog.id = 'lc-order-review-modal';
    dialog.className = 'launch-review-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'lc-review-title');

    const head = document.createElement('div');
    head.className = 'launch-review-head';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'public-label';
    kicker.textContent = 'Order Review · Approved Fixed Pricing';
    const h3 = document.createElement('h3');
    h3.id = 'lc-review-title';
    h3.textContent = `Confirm ${service.name}`;
    titleWrap.append(kicker, h3);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'otp-select-sheet-close';
    closeBtn.setAttribute('aria-label', 'Close order review');
    closeBtn.textContent = '×';
    head.append(titleWrap, closeBtn);

    const hero = document.createElement('div');
    hero.className = 'launch-review-hero';
    const img = document.createElement('img');
    img.src = service.previewImage || '/assets/services/starter-website.webp';
    img.alt = service.name;
    img.width = 1280;
    img.height = 800;
    const heroMeta = document.createElement('div');
    const heroTitle = document.createElement('strong');
    heroTitle.textContent = service.name;
    const heroTime = document.createElement('div');
    heroTime.className = 'public-muted';
    heroTime.style.fontSize = '0.82rem';
    heroTime.textContent = `Estimated timeline: ${service.timeline}`;
    heroMeta.append(heroTitle, heroTime);
    hero.append(img, heroMeta);

    const incHeading = document.createElement('span');
    incHeading.className = 'public-label';
    incHeading.textContent = 'Included Deliverables';
    const ul = document.createElement('ul');
    ul.className = 'launch-review-list';
    (requirements.deliverables || service.deliverables || []).forEach((d) => {
      const li = document.createElement('li');
      li.textContent = d;
      ul.append(li);
    });

    const totals = document.createElement('div');
    totals.className = 'launch-review-totals';
    const dueCents = requirements.fixed_price_cents || 19900;
    [
      ['Selected Enhancements', requirements.enhancements?.length ? requirements.enhancements.map((e) => e.label).join(', ') : 'None added', false],
      ['Total Investment', catalog.formatUsd(dueCents), false],
      ['Remaining Balance After Payment', '$0', false],
      ['Approved Amount Due Today', catalog.formatUsd(dueCents), true]
    ].forEach(([k, v, isDue]) => {
      const row = document.createElement('div');
      row.className = `launch-review-row${isDue ? ' is-due' : ''}`;
      const s1 = document.createElement('span');
      s1.textContent = k;
      const s2 = document.createElement('strong');
      s2.textContent = v;
      row.append(s1, s2);
      totals.append(row);
    });

    const walletNote = document.createElement('p');
    walletNote.className = 'launch-review-wallets';
    walletNote.textContent = 'Encrypted Stripe Checkout · Supports Credit & Debit Cards, Apple Pay, Google Pay, and Link when eligible on your device.';

    const actions = document.createElement('div');
    actions.className = 'launch-return-actions';
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.id = 'lc-review-proceed-btn';
    confirmBtn.className = 'public-button';
    confirmBtn.textContent = 'Continue to Stripe Checkout →';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'launch-secondary-btn';
    cancelBtn.style.width = 'auto';
    cancelBtn.textContent = 'Edit Build';
    actions.append(confirmBtn, cancelBtn);

    dialog.append(head, hero, incHeading, ul, totals, walletNote, actions);
    backdrop.append(dialog);
    document.body.append(backdrop);

    const cleanup = () => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') cleanup();
    };
    document.addEventListener('keydown', onKey);
    closeBtn.addEventListener('click', cleanup);
    cancelBtn.addEventListener('click', cleanup);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup();
    });
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Connecting to Stripe...';
      cleanup();
      await onConfirm();
    });
  }

  async function executeStarterCheckout() {
    const input = currentPayload();
    const { requirements } = catalog.computeLaunchEstimate(input);
    setStatus('Preparing secure Stripe checkout session...');
    if (els.checkoutBtn) els.checkoutBtn.disabled = true;

    try {
      const response = await fetch('/api/launch/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          service_id: input.service_id,
          features: input.features,
          enhancements: input.enhancements,
          customer_email: input.email,
          customer_name: input.name || input.business_name,
          origin: window.location.origin,
          requirements,
          idempotency_key: `LAUNCH-CHK-${state.bookingToken}`
        })
      });
      const data = await response.json().catch(() => ({}));
      if (data.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      if (data.code === 'stripe_not_configured' || data.code === 'checkout_temporarily_disabled') {
        const paused = data.code === 'checkout_temporarily_disabled';
        setStatus(
          paused
            ? 'Online checkout is temporarily paused. Submit your request or book a consultation cleanly without losing your build.'
            : 'Stripe checkout is currently in local preview mode. Submit your request above to save your build in OTP OS.',
          false
        );
        showResult(
          paused ? 'Checkout Temporarily Paused' : 'Checkout Preview Notice',
          data.blocker || 'Checkout is unavailable right now. Your project configuration can still be saved via proposal request or consultation.'
        );
        return;
      }
      throw new Error(data.message || 'Checkout unavailable.');
    } catch (err) {
      setStatus(err.message || 'Unable to start checkout.', true);
    } finally {
      updateSummary();
    }
  }

  async function startStarterCheckout() {
    const input = currentPayload();
    const { requirements } = catalog.computeLaunchEstimate(input);
    if (!requirements.checkout_eligible) {
      setStatus('This custom build requires owner approval before payment.', true);
      return;
    }
    if (!input.email) {
      setStatus('Please enter your email address before starting $199 Starter checkout.', true);
      return;
    }
    const service = catalog.findService(input.service_id);
    openOrderReviewDialog({
      service,
      requirements,
      onConfirm: executeStarterCheckout
    });
  }

  async function handleCheckoutReturn(params) {
    const checkoutParam = String(params.get('checkout') || '').trim().toLowerCase();
    if (!checkoutParam) return;
    const sessionId = params.get('session_id') || '';
    const orderId = params.get('order_id') || '';
    const main = document.getElementById('main');
    if (!main) return;

    let card = document.getElementById('lc-checkout-return');
    if (!card) {
      card = document.createElement('section');
      card.id = 'lc-checkout-return';
      card.className = 'public-wrap';
      card.setAttribute('aria-live', 'polite');
      main.prepend(card);
    }

    const renderReturnState = (statusKey, summary = {}) => {
      card.replaceChildren();
      const box = document.createElement('div');
      const isErr = statusKey === 'failed' || statusKey === 'expired';
      box.className = `launch-return-card${isErr ? ' is-error' : ''}`;

      const titles = {
        paid: ['Payment Verified · Project Activated', 'Stripe confirmed your payment and OTP OS synchronized your Client Portal cleanly.'],
        deposit_paid: ['Deposit Verified · Scope Locked In', 'Your project deposit has been verified by Stripe webhook and synced to your workspace.'],
        processing: ['Payment Processing · Awaiting Confirmation', 'Your checkout finished redirecting, and OnlyTruePerspective is waiting for Stripe confirmation before unlocking workspace access.'],
        failed: ['Payment Unsuccessful', 'Your card or wallet payment could not be completed. No charge was recorded.'],
        cancelled: ['Checkout Canceled', 'Your configured build and brief details are preserved below whenever you are ready to continue.'],
        expired: ['Checkout Session Expired', 'Your previous Stripe Checkout window expired. Start a fresh checkout session below whenever ready.']
      };
      const [headingText, bodyText] = titles[statusKey] || titles.processing;

      const head = document.createElement('div');
      head.className = 'launch-return-head';
      const pill = document.createElement('span');
      pill.className = 'launch-kicker-pill';
      pill.textContent = `Stripe Checkout · ${statusKey.replace(/_/g, ' ').toUpperCase()}`;
      head.append(pill);

      const h2 = document.createElement('h2');
      h2.className = 'public-h3';
      h2.textContent = headingText;
      const desc = document.createElement('p');
      desc.className = 'public-muted';
      desc.textContent = bodyText;

      box.append(head, h2, desc);

      if (summary.order_id || summary.transaction_ref || Number(summary.amount_cents || 0) > 0) {
        const meta = document.createElement('div');
        meta.className = 'launch-return-meta';
        if (Number(summary.amount_cents || 0) > 0) {
          const amt = document.createElement('span');
          amt.textContent = `Amount: ${catalog.formatUsd(summary.amount_cents)}`;
          meta.append(amt);
        }
        if (Number(summary.remaining_balance_cents || 0) > 0) {
          const rem = document.createElement('span');
          rem.textContent = `Remaining: ${catalog.formatUsd(summary.remaining_balance_cents)}`;
          meta.append(rem);
        }
        if (summary.transaction_ref) {
          const tx = document.createElement('span');
          tx.textContent = `Ref: ${summary.transaction_ref}`;
          meta.append(tx);
        }
        box.append(meta);
      }

      const actions = document.createElement('div');
      actions.className = 'launch-return-actions';
      if (summary.portal_token) {
        const pLink = document.createElement('a');
        pLink.className = 'public-button';
        pLink.href = `/client/${encodeURIComponent(summary.portal_token)}`;
        pLink.textContent = 'Open Private Client Portal ↗';
        actions.append(pLink);
      }
      if (summary.receipt_url && /^https:\/\//i.test(summary.receipt_url)) {
        const rLink = document.createElement('a');
        rLink.className = 'public-text-link';
        rLink.href = summary.receipt_url;
        rLink.target = '_blank';
        rLink.rel = 'noopener noreferrer';
        rLink.textContent = 'View Stripe Receipt ↗';
        actions.append(rLink);
      }
      if (statusKey === 'processing') {
        const refBtn = document.createElement('button');
        refBtn.type = 'button';
        refBtn.className = 'launch-secondary-btn';
        refBtn.style.width = 'auto';
        refBtn.textContent = 'Refresh Payment Status';
        refBtn.addEventListener('click', () => handleCheckoutReturn(params));
        actions.append(refBtn);
      }
      if (['cancelled', 'failed', 'expired'].includes(statusKey)) {
        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'public-button';
        retryBtn.textContent = 'Review & Retry Checkout →';
        retryBtn.addEventListener('click', () => {
          document.getElementById('configurator')?.scrollIntoView({ behavior: 'smooth' });
        });
        actions.append(retryBtn);
      }
      if (actions.childNodes.length) box.append(actions);
      card.append(box);
    };

    if (checkoutParam === 'cancelled') {
      renderReturnState('cancelled');
      return;
    }
    if (checkoutParam === 'expired') {
      renderReturnState('expired');
      return;
    }
    if (checkoutParam === 'failed') {
      renderReturnState('failed');
      return;
    }

    if (sessionId || orderId) {
      try {
        const q = new URLSearchParams();
        if (sessionId) q.set('session_id', sessionId);
        if (orderId) q.set('order_id', orderId);
        const res = await fetch(`/api/launch/checkout/status?${q.toString()}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          renderReturnState(data.status || 'processing', data.payment_summary || {});
          return;
        }
      } catch { /* fall through safely to processing banner */ }
    }
    renderReturnState('processing');
  }

  function bookConsultationWithScope() {
    const input = currentPayload();
    const { requirements, summaryText } = catalog.computeLaunchEstimate(input);
    const svc = catalog.findService(input.service_id);
    if (launchCtx && typeof launchCtx.save === 'function') {
      launchCtx.save({
        ...input,
        service_name: requirements.service_name,
        package_interest: requirements.recommended_package,
        estimate_display: requirements.estimate_display,
        checkout_eligible: requirements.checkout_eligible,
        deliverables: requirements.deliverables,
        booking_service_type: svc.bookingServiceType,
        summary_text: summaryText,
        mode: 'consultation'
      });
    }
    const dest = new URL('/start-project', window.location.origin);
    dest.searchParams.set('source', 'launch_configurator');
    dest.searchParams.set('mode', 'consultation');
    dest.searchParams.set('launch_service', svc.id);
    dest.searchParams.set('service', svc.bookingServiceType);
    dest.searchParams.set('package', requirements.recommended_package);
    if (input.business_name || input.name) dest.searchParams.set('client', input.business_name || input.name);
    window.location.href = dest.pathname + dest.search;
  }

  function restoreFromContext() {
    const saved = launchCtx && typeof launchCtx.load === 'function' ? launchCtx.load() : null;
    if (!saved) return;
    if (Array.isArray(saved.objectives)) state.objectives = new Set(saved.objectives);
    if (Array.isArray(saved.features) && saved.features.length) state.features = new Set(saved.features);
    if (Array.isArray(saved.enhancements)) state.enhancements = new Set(saved.enhancements);
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el && v && !el.value) el.value = String(v);
    };
    setVal('lc-name', saved.name);
    setVal('lc-business', saved.business_name);
    setVal('lc-email', saved.email);
    setVal('lc-phone', saved.phone);
    setVal('lc-website', saved.existing_website);
    setVal('lc-socials', saved.social_links);
    setVal('lc-notes', saved.project_description);

    els.objectives?.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      const on = state.objectives.has(box.value);
      box.checked = on;
      box.closest('.launch-pill-tile')?.classList.toggle('is-checked', on);
    });
    els.enhancements?.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      const on = state.enhancements.has(box.value);
      box.checked = on;
      box.closest('.launch-feature-tile')?.classList.toggle('is-checked', on);
    });
  }

  function init() {
    if (window.OTPAttribution) window.OTPAttribution.captureOnLoad();
    renderCategoryTabs();
    populateFormControls();

    const params = new URLSearchParams(window.location.search || '');
    const saved = launchCtx && typeof launchCtx.load === 'function' ? launchCtx.load() : null;
    const rawSvc = params.get('service') || params.get('offer') || saved?.service_id;
    const mappedSvc = launchCtx && rawSvc && !catalog.SERVICES.some((s) => s.id === rawSvc)
      ? launchCtx.mapBookingServiceToLaunch(rawSvc)
      : rawSvc;

    restoreFromContext();

    if (els.heroDeviceStage && launchProof && launchMedia) {
      heroStageController = launchProof.renderHardwareStage(els.heroDeviceStage, { category: 'websites' });
    }

    if (mappedSvc) {
      const targetId = mappedSvc === 'starter-website-199' ? 'starter-website' : mappedSvc;
      const shouldPreserveFeatures = Array.isArray(saved?.features) && saved.features.length > 0 && saved.service_id === targetId;
      selectService(targetId, false, { preserveFeatures: shouldPreserveFeatures });
    } else {
      renderCatalog();
      updateSummary();
    }
    contextReady = true;
    updateSummary();
    renderProof();
    launchProof?.observeReveals?.();

    els.serviceSelect?.addEventListener('change', (e) => selectService(e.target.value, false));
    els.form?.addEventListener('input', updateSummary);
    els.assetsInput?.addEventListener('change', (e) => handleAssetUpload(e.target.files));
    els.submitBtn?.addEventListener('click', submitProposalRequest);
    els.checkoutBtn?.addEventListener('click', startStarterCheckout);
    els.consultBtn?.addEventListener('click', bookConsultationWithScope);
    if (params.get('checkout')) {
      handleCheckoutReturn(params);
    }

    // Hide the mobile sticky action bar whenever the Build Plan summary, Hero CTAs, or Footer are visible.
    const mobileBar = document.getElementById('lc-mobile-bar');
    if (mobileBar && typeof window.IntersectionObserver === 'function') {
      const hiddenReasons = new Set(['hero']);
      const syncMobileBarVisibility = () => {
        mobileBar.classList.toggle('is-hidden', hiddenReasons.size > 0);
      };
      syncMobileBarVisibility();
      const targets = [
        ['hero', document.querySelector('.launch-hero-copy')],
        ['summary', document.getElementById('launch-summary-panel')],
        ['footer', document.querySelector('.public-footer')]
      ].filter(([, el]) => Boolean(el));
      const observer = new window.IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const match = targets.find(([, el]) => el === entry.target);
          if (!match) return;
          if (entry.isIntersecting) hiddenReasons.add(match[0]);
          else hiddenReasons.delete(match[0]);
        });
        syncMobileBarVisibility();
      }, { threshold: 0.08 });
      targets.forEach(([, el]) => observer.observe(el));
    }
  }

  init();
})();
