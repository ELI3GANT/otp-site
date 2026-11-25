/**
 * OTP LAUNCH V1.3 — Reusable Visual Proof, Device Framing & Motion Engine
 * Renders authentic OTP recordings and verified captures inside sculpted MacBook Pro
 * and iPhone hardware frames, interactive Before/After transformation sliders,
 * and reduced-motion-safe viewport playback controls.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.OTP_LAUNCH_PROOF = factory(root);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const media = () => root.OTP_LAUNCH_MEDIA || null;
  const prefersReducedMotion = () => Boolean(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function el(tag, className = '', text = '') {
    const node = root.document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  const trackedVideos = new Set();
  const isElementNearViewport = (el, margin = 120) => {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect || rect.width === 0 || rect.height === 0) return false;
    const vh = root.innerHeight || root.document.documentElement?.clientHeight || 900;
    return rect.bottom >= -margin && rect.top <= vh + margin;
  };

  const setPlayBlockedState = (vid, blocked) => {
    const wrap = vid?.closest?.('.otp-media-slot');
    if (blocked) {
      vid.dataset.autoplayBlocked = 'true';
      wrap?.classList?.add('is-autoplay-blocked');
      wrap?.setAttribute?.('data-autoplay-blocked', 'true');
    } else {
      delete vid.dataset.autoplayBlocked;
      wrap?.classList?.remove('is-autoplay-blocked');
      wrap?.removeAttribute?.('data-autoplay-blocked');
    }
    const btn = wrap?.querySelector?.('.otp-media-play-toggle');
    if (btn && vid.paused) {
      btn.textContent = blocked ? 'Play' : (btn.dataset.defaultPausedLabel || 'Play');
      btn.setAttribute('aria-pressed', 'false');
    }
  };

  const markVideoReady = (vid) => {
    const wrap = vid?.closest?.('.otp-media-slot');
    vid?.classList?.add('is-video-ready');
    wrap?.classList?.add('is-video-ready');
  };

  const motion = () => root.OTP_MOTION || null;

  const configureLoopVideo = (vid, autoplay, eager = false) => {
    const shared = motion();
    if (shared) {
      shared.configureVideo(vid, { autoplay, eager });
      return;
    }
    vid.muted = true;
    vid.defaultMuted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');
    vid.setAttribute('loop', '');
    if (autoplay && !prefersReducedMotion()) {
      vid.setAttribute('autoplay', '');
    } else {
      vid.removeAttribute('autoplay');
    }
  };

  const safePlay = (vid) => {
    if (!vid) return;
    const shared = motion();
    if (shared) {
      shared.safePlay(vid);
      return;
    }
    configureLoopVideo(vid, vid.dataset.autoplayVisible !== 'false');
    if (vid.preload === 'none') vid.preload = 'auto';
    try {
      const p = vid.play?.();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          setPlayBlockedState(vid, false);
          if (vid.readyState >= 2) markVideoReady(vid);
        }).catch((err) => {
          if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
            setPlayBlockedState(vid, true);
          }
        });
      }
    } catch {}
  };

  let videoObserver = null;
  let globalPlaybackListenersBound = false;

  function syncVisibleVideos() {
    const shared = motion();
    if (shared) {
      shared.sync();
      return;
    }
    const hidden = Boolean(root.document?.hidden);
    const reduced = prefersReducedMotion();
    for (const vid of Array.from(trackedVideos)) {
      if (!vid.isConnected) {
        trackedVideos.delete(vid);
        videoObserver?.unobserve?.(vid);
        continue;
      }
      if (reduced || hidden || !isElementNearViewport(vid, 120)) {
        vid.pause?.();
        continue;
      }
      if (vid.dataset.userPaused !== 'true' && vid.dataset.autoplayVisible !== 'false' && vid.paused) {
        safePlay(vid);
      }
    }
  }

  function bindGlobalPlaybackListeners() {
    if (motion() || globalPlaybackListenersBound || !root.document?.addEventListener) return;
    globalPlaybackListenersBound = true;
    root.document.addEventListener('visibilitychange', () => syncVisibleVideos());
    root.addEventListener?.('otp:themechange', () => syncVisibleVideos());
    root.addEventListener?.('otp:accentchange', () => syncVisibleVideos());
  }

  function ensureVideoObserver() {
    bindGlobalPlaybackListeners();
    if (videoObserver || !('IntersectionObserver' in root)) return videoObserver;
    videoObserver = new root.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vid = entry.target;
          if (!(vid instanceof root.HTMLVideoElement)) return;
          if (prefersReducedMotion() || root.document?.hidden) {
            vid.pause?.();
            return;
          }
          if (entry.isIntersecting && vid.dataset.userPaused !== 'true' && vid.dataset.autoplayVisible !== 'false') {
            safePlay(vid);
          } else {
            vid.pause?.();
          }
        });
      },
      { threshold: 0.05, rootMargin: '120px 0px' }
    );
    return videoObserver;
  }

  function registerManagedVideo(video, eager = false) {
    const shared = motion();
    if (shared) {
      shared.register(video, {
        autoplay: video.dataset.autoplayVisible !== 'false',
        eager,
        onBlocked: setPlayBlockedState,
        onReady: markVideoReady
      });
      return;
    }
    trackedVideos.add(video);
    video.addEventListener('loadeddata', () => {
      markVideoReady(video);
      if (video.dataset.autoplayVisible !== 'false' && video.dataset.userPaused !== 'true' && !prefersReducedMotion() && !root.document?.hidden && isElementNearViewport(video, 120)) {
        safePlay(video);
      }
    });
    video.addEventListener('canplay', () => {
      markVideoReady(video);
      if (video.dataset.autoplayVisible !== 'false' && video.dataset.userPaused !== 'true' && !prefersReducedMotion() && !root.document?.hidden && isElementNearViewport(video, 120)) {
        safePlay(video);
      }
    });
    video.addEventListener('playing', () => markVideoReady(video));
    const obs = ensureVideoObserver();
    if (obs) obs.observe(video);
    if (eager || isElementNearViewport(video, 120)) {
      safePlay(video);
    }
    root.requestAnimationFrame?.(() => syncVisibleVideos());
  }

  function createMediaElement(asset, options = {}) {
    const {
      autoplayWhenVisible = true,
      showPlayButton = true,
      hoverTriggerEl = null
    } = options;

    const wrap = el('div', 'otp-media-slot');
    wrap.style.position = 'relative';
    wrap.style.width = '100%';
    wrap.style.height = '100%';

    const hasVideo = Boolean(asset?.mp4) && !prefersReducedMotion();
    const img = root.document.createElement('img');
    img.className = 'otp-media-frame-visual';
    img.src = asset?.poster || '/assets/hyh-otp-rebuild.jpg';
    img.alt = asset?.alt || `${asset?.title || 'OnlyTruePerspective'} visual preview`;
    img.loading = options.eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    wrap.append(img);

    if (!asset?.mp4) {
      return wrap;
    }

    const video = root.document.createElement('video');
    video.className = 'otp-media-frame-visual';
    video.style.position = 'absolute';
    video.style.inset = '0';
    video.dataset.autoplayVisible = autoplayWhenVisible ? 'true' : 'false';
    configureLoopVideo(video, autoplayWhenVisible);
    video.preload = autoplayWhenVisible ? (options.eager ? 'auto' : 'metadata') : 'none';
    video.poster = asset.poster || '';
    video.setAttribute('aria-label', asset.alt || asset.title || 'Product recording');

    if (asset.webm) {
      const webmSrc = root.document.createElement('source');
      webmSrc.src = asset.webm;
      webmSrc.type = 'video/webm';
      video.append(webmSrc);
    }
    const mp4Src = root.document.createElement('source');
    mp4Src.src = asset.mp4;
    mp4Src.type = 'video/mp4';
    video.append(mp4Src);

    if (hasVideo) {
      wrap.append(video);
      if (autoplayWhenVisible) {
        registerManagedVideo(video, Boolean(options.eager));
      }
      if (hoverTriggerEl) {
        hoverTriggerEl.addEventListener('pointerenter', () => {
          if (prefersReducedMotion()) return;
          video.dataset.userPaused = 'false';
          safePlay(video);
        });
        if (!autoplayWhenVisible) {
          hoverTriggerEl.addEventListener('pointerleave', () => {
            if (video.dataset.manualPlay !== 'true') video.pause?.();
          });
        }
      }
    }

    if (showPlayButton) {
      const btn = el('button', 'otp-media-play-toggle', autoplayWhenVisible ? 'Pause' : 'Preview');
      btn.type = 'button';
      btn.dataset.defaultPausedLabel = autoplayWhenVisible ? 'Play' : 'Preview';
      btn.setAttribute('aria-pressed', autoplayWhenVisible && hasVideo ? 'true' : 'false');
      btn.setAttribute('aria-label', `${autoplayWhenVisible ? 'Pause' : 'Play'} ${asset.title || 'demo'} loop`);
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!wrap.contains(video)) {
          wrap.append(video);
        }
        if (video.paused) {
          video.dataset.userPaused = 'false';
          video.dataset.manualPlay = 'true';
          setPlayBlockedState(video, false);
          safePlay(video);
          btn.textContent = 'Pause';
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', `Pause ${asset.title || 'demo'} loop`);
        } else {
          video.dataset.userPaused = 'true';
          video.dataset.manualPlay = 'false';
          video.pause?.();
          btn.textContent = 'Play';
          btn.setAttribute('aria-pressed', 'false');
          btn.setAttribute('aria-label', `Play ${asset.title || 'demo'} loop`);
        }
      });
      video.addEventListener('play', () => {
        wrap.classList.add('is-playing');
        setPlayBlockedState(video, false);
        btn.textContent = 'Pause';
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', `Pause ${asset.title || 'demo'} loop`);
      });
      video.addEventListener('playing', () => {
        markVideoReady(video);
        wrap.classList.add('is-playing');
        setPlayBlockedState(video, false);
        btn.textContent = 'Pause';
        btn.setAttribute('aria-pressed', 'true');
      });
      video.addEventListener('pause', () => {
        wrap.classList.remove('is-playing');
        btn.textContent = video.dataset.autoplayBlocked === 'true'
          ? 'Play'
          : (video.dataset.userPaused === 'true' ? 'Play' : (btn.dataset.defaultPausedLabel || 'Play'));
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', `Play ${asset.title || 'demo'} loop`);
      });
      wrap.append(btn);
    }

    return wrap;
  }

  function createMacBookFrame(asset, options = {}) {
    const shell = el('figure', 'otp-macbook');
    const lid = el('div', 'otp-macbook-lid');
    const cam = el('div', 'otp-macbook-cam');
    const screen = el('div', 'otp-macbook-screen');
    screen.append(createMediaElement(asset, options));
    lid.append(cam, screen);
    const base = el('div', 'otp-macbook-base');
    shell.append(lid, base);
    return shell;
  }

  function createIPhoneFrame(asset, options = {}) {
    const phone = el('figure', 'otp-iphone');
    const island = el('div', 'otp-iphone-island');
    const screen = el('div', 'otp-iphone-screen');
    screen.append(createMediaElement(asset, options));
    phone.append(island, screen);
    return phone;
  }

  function createWizardCameo() {
    const manifest = media();
    const seq = manifest ? manifest.getFlowSequence('flow-wizard-presence') : null;
    const badge = el('div', 'otp-wizard-cameo');
    const orb = el('div', 'otp-wizard-orb');
    if (seq?.mp4 && !prefersReducedMotion()) {
      const vid = root.document.createElement('video');
      vid.dataset.autoplayVisible = 'true';
      configureLoopVideo(vid, true);
      vid.preload = 'metadata';
      vid.poster = seq.poster || '/assets/demos/otp-wizard-poster.webp';
      const src = root.document.createElement('source');
      src.src = seq.mp4;
      src.type = 'video/mp4';
      vid.append(src);
      orb.append(vid);
      registerManagedVideo(vid, true);
    } else {
      const img = root.document.createElement('img');
      img.src = seq?.poster || '/assets/demos/otp-wizard-poster.webp';
      img.alt = seq?.alt || 'OTP Studio Wizard mark';
      orb.append(img);
    }
    badge.append(orb, el('span', '', 'OTP STUDIO MOTION'));
    return badge;
  }

  /**
   * Renders a synchronized MacBook + iPhone hardware rig with instant project switcher tabs.
   */
  function renderHardwareStage(container, options = {}) {
    if (!container || !media()) return;
    const manifest = media();
    const presetCategory = options.category || 'websites';
    const compact = Boolean(options.compact);

    const presets = options.presets || [
      { id: 'websites', label: 'Websites', desktopId: 'floivation-desktop', mobileId: 'floivation-mobile' },
      { id: 'apps', label: 'Apps & Tools', desktopId: 'floorops-platform', mobileId: 'evehalo-ios' },
      { id: 'systems', label: 'Music & Hubs', desktopId: 'otp-os-control', mobileId: 'vault-ios' },
      { id: 'studio', label: 'OTP Studio', desktopId: 'otp-site-experience', mobileId: 'otp-studio-ios' }
    ];

    let activePreset = presets.find((p) => p.id === presetCategory) || presets[0];

    function paint() {
      const desktopAsset = manifest.getAssetById(activePreset.desktopId);
      const mobileAsset = manifest.getAssetById(activePreset.mobileId);
      container.replaceChildren();

      const stage = el('div', `otp-device-stage${compact ? ' is-compact' : ''}`);
      const topbar = el('div', 'otp-stage-topbar');
      const originPill = el('span', 'otp-origin-pill');
      originPill.append(el('i', 'otp-origin-dot'), root.document.createTextNode(desktopAsset.originLabel || 'Authentic OTP Build'));

      const controls = el('div', 'otp-stage-controls');
      presets.forEach((preset) => {
        const chip = el('button', `otp-stage-chip${preset.id === activePreset.id ? ' is-active' : ''}`, preset.label);
        chip.type = 'button';
        chip.addEventListener('click', () => {
          activePreset = preset;
          paint();
        });
        controls.append(chip);
      });
      topbar.append(originPill, controls);

      const rig = el('div', 'otp-duo-rig');
      rig.append(
        createMacBookFrame(desktopAsset, { autoplayWhenVisible: true, eager: !compact }),
        createIPhoneFrame(mobileAsset, { autoplayWhenVisible: true, eager: !compact })
      );

      const foot = el('div', 'otp-stage-footer');
      const meta = el('div', 'otp-stage-meta');
      meta.append(
        el('strong', '', `${desktopAsset.title} + ${mobileAsset.title}`),
        el('small', '', desktopAsset.outcome)
      );
      foot.append(meta);
      if (!compact) foot.append(createWizardCameo());

      stage.append(topbar, rig, foot);
      container.append(stage);
    }

    paint();
    return {
      selectPreset(id) {
        const match = presets.find((p) => p.id === id);
        if (match && match.id !== activePreset.id) {
          activePreset = match;
          paint();
        }
      }
    };
  }

  /**
   * Renders an interactive Before/After Transformation Slider supporting HYH and FLOIVATION.
   */
  function renderBeforeAfterSlider(container, options = {}) {
    if (!container || !media()) return;
    const pairs = media().BEFORE_AFTER_PAIRS;
    let activePair = pairs.find((p) => p.id === options.defaultId) || pairs[0];

    function paint() {
      container.replaceChildren();
      const card = el('div', 'otp-compare-card');
      let pct = 52;
      card.style.setProperty('--compare-pct', `${pct}%`);

      const head = el('div', 'otp-compare-header');
      const titleBox = el('div');
      titleBox.append(
        el('p', 'public-label', 'Interactive Before → After'),
        el('h3', '', activePair.title),
        el('small', '', activePair.subtitle)
      );

      const tabs = el('div', 'otp-compare-tabs');
      pairs.forEach((pair) => {
        const tab = el('button', `otp-compare-tab${pair.id === activePair.id ? ' is-active' : ''}`, pair.title.split(' ')[0]);
        tab.type = 'button';
        tab.addEventListener('click', () => {
          activePair = pair;
          paint();
        });
        tabs.append(tab);
      });
      head.append(titleBox, tabs);

      const viewport = el('div', 'otp-compare-viewport');
      const beforeLayer = el('div', 'otp-compare-layer');
      const beforeImg = root.document.createElement('img');
      beforeImg.src = activePair.beforeImage;
      beforeImg.alt = `${activePair.title} previous website`;
      beforeImg.loading = 'lazy';
      beforeLayer.append(beforeImg);

      const afterLayer = el('div', 'otp-compare-layer otp-compare-after');
      const afterImg = root.document.createElement('img');
      afterImg.src = activePair.afterImage;
      afterImg.alt = `${activePair.title} rebuilt by OnlyTruePerspective`;
      afterImg.loading = 'lazy';
      afterLayer.append(afterImg);

      const divider = el('div', 'otp-compare-divider');
      divider.append(el('span', 'otp-compare-knob', '↔'));

      const range = root.document.createElement('input');
      range.type = 'range';
      range.min = '4';
      range.max = '96';
      range.value = String(pct);
      range.className = 'otp-compare-range';
      range.setAttribute('aria-label', `Compare before and after redesign for ${activePair.title}`);
      range.addEventListener('input', () => {
        pct = Number(range.value);
        card.style.setProperty('--compare-pct', `${pct}%`);
      });

      viewport.append(
        beforeLayer,
        afterLayer,
        el('span', 'otp-compare-badge is-before', activePair.beforeLabel),
        el('span', 'otp-compare-badge is-after', activePair.afterLabel),
        divider,
        range
      );

      const foot = el('div', 'otp-compare-foot');
      const link = el('a', 'public-text-link', 'Inspect case study ↗');
      link.href = activePair.href || '/archive';
      foot.append(el('span', '', activePair.metrics), link);

      card.append(head, viewport, foot);
      container.append(card);
    }

    paint();
  }

  /**
   * Renders authentic portfolio cards with desktop hover playback & mobile tap preview.
   */
  function renderPortfolioReel(container, options = {}) {
    if (!container || !media()) return;
    const assets = options.assetIds
      ? options.assetIds.map((id) => media().getAssetById(id))
      : media().getAssetsForCategory(options.category || 'all').slice(0, options.limit || 6);

    const grid = el('div', 'otp-reel-grid');
    assets.forEach((asset) => {
      const card = el('article', 'otp-reel-card');
      const mediaBox = el('div', `otp-reel-media${asset.deviceType === 'iphone' ? ' is-portrait' : ''}`);
      if (asset.deviceType === 'iphone') {
        mediaBox.append(createIPhoneFrame(asset, { autoplayWhenVisible: true, hoverTriggerEl: card }));
      } else {
        mediaBox.append(createMediaElement(asset, { autoplayWhenVisible: true, hoverTriggerEl: card }));
      }

      const body = el('div', 'otp-reel-body');
      const topMeta = el('span', 'public-label', `${asset.originLabel} · ${asset.category}`);
      const h4 = el('h4', '', asset.title);
      const desc = el('p', '', asset.outcome);
      const link = el('a', 'public-text-link', 'View project ↗');
      link.href = asset.href || '/archive';
      body.append(topMeta, h4, desc, link);
      card.append(mediaBox, body);
      grid.append(card);
    });

    container.replaceChildren(grid);
  }

  function observeReveals() {
    const nodes = root.document.querySelectorAll('[data-proof-reveal]');
    if (!nodes.length) return;
    if (prefersReducedMotion() || !('IntersectionObserver' in root)) {
      nodes.forEach((n) => n.classList.add('is-revealed'));
      return;
    }
    const obs = new root.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -24px 0px', threshold: 0.05 }
    );
    nodes.forEach((n) => obs.observe(n));
  }

  return Object.freeze({
    createMacBookFrame,
    createIPhoneFrame,
    createWizardCameo,
    createMediaElement,
    renderHardwareStage,
    renderBeforeAfterSlider,
    renderPortfolioReel,
    observeReveals,
    syncVisibleVideos
  });
});
