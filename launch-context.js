/**
 * Shared OTP LAUNCH <-> Start a Project (Bookings) Conversion Context & Unified UI Controls
 * - Persists selected services, objectives, features, enhancements, contact info, brief,
 *   estimates, attribution, and idempotent lead/booking tokens across navigation & refreshes.
 * - Provides accessible, theme-aware custom selector UI (with mobile bottom sheet & keyboard nav)
 *   built strictly via safe DOM APIs (zero innerHTML).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.OTP_LAUNCH_CONTEXT = factory(root);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const STORAGE_KEY = 'otp_launch_context_v1';
  const BOOKING_TOKEN_KEY = 'otp_booking_token';
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  const BOOKING_TO_LAUNCH_MAP = {
    'Website / Digital System': 'business-website',
    'Website Cleanup': 'redesign-repair',
    'Music / Artist Rollout': 'artist-epk',
    'Brand Launch': 'business-website',
    'Brand Launch Assets': 'digital-templates',
    'Business System': 'custom-web-app',
    'Custom Build': 'native-app',
    'AI / Automation': 'custom-web-app',
    'Video / Content': 'artist-epk',
    'Same-Day Reel': 'redesign-repair',
    'Emergency Booking/Client Flow Fix': 'redesign-repair',
    'website-business-fix': 'redesign-repair',
    'product-design': 'native-app',
    'artist-campaign': 'artist-epk',
    'event-community-rollout': 'artist-epk',
    'business-systems': 'custom-web-app'
  };

  function mapBookingServiceToLaunch(raw = '') {
    const val = String(raw || '').trim();
    if (!val) return '';
    if (BOOKING_TO_LAUNCH_MAP[val]) return BOOKING_TO_LAUNCH_MAP[val];
    const lower = val.toLowerCase();
    if (lower.includes('starter') || lower.includes('199')) return 'starter-website';
    if (lower.includes('artist') || lower.includes('music') || lower.includes('epk')) return 'artist-epk';
    if (lower.includes('ecommerce') || lower.includes('commerce') || lower.includes('shop')) return 'ecommerce-experience';
    if (lower.includes('fix') || lower.includes('clean') || lower.includes('redesign')) return 'redesign-repair';
    if (lower.includes('ios') || lower.includes('native') || lower.includes('product-design')) return 'native-app';
    if (lower.includes('system') || lower.includes('app') || lower.includes('ai')) return 'custom-web-app';
    if (lower.includes('template')) return 'digital-templates';
    if (lower.includes('maint')) return 'maintenance-enhancements';
    return 'business-website';
  }

  function readStorage(store) {
    try {
      const raw = store?.getItem?.(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (parsed.updated_at) {
        const age = Date.now() - Date.parse(parsed.updated_at);
        if (Number.isFinite(age) && age > MAX_AGE_MS) return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function load() {
    return readStorage(root.sessionStorage) || readStorage(root.localStorage) || null;
  }

  function save(patch = {}) {
    if (!patch || typeof patch !== 'object') return null;
    const prev = load() || {};
    const next = {
      ...prev,
      ...patch,
      updated_at: new Date().toISOString()
    };
    const serialized = JSON.stringify(next);
    try {
      root.sessionStorage?.setItem(STORAGE_KEY, serialized);
    } catch { /* ignore */ }
    try {
      root.localStorage?.setItem(STORAGE_KEY, serialized);
    } catch { /* ignore */ }
    return next;
  }

  function clear() {
    try {
      root.sessionStorage?.removeItem(STORAGE_KEY);
      root.sessionStorage?.removeItem(BOOKING_TOKEN_KEY);
    } catch { /* ignore */ }
    try {
      root.localStorage?.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }

  function getOrCreateBookingToken(prefix = 'LAUNCH') {
    const saved = load();
    if (saved?.booking_token) {
      try {
        root.sessionStorage?.setItem(BOOKING_TOKEN_KEY, saved.booking_token);
      } catch { /* ignore */ }
      return saved.booking_token;
    }
    try {
      const existing = root.sessionStorage?.getItem(BOOKING_TOKEN_KEY);
      if (existing) {
        save({ booking_token: existing });
        return existing;
      }
    } catch { /* ignore */ }
    const token = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    try {
      root.sessionStorage?.setItem(BOOKING_TOKEN_KEY, token);
    } catch { /* ignore */ }
    save({ booking_token: token });
    return token;
  }

  // Shared SVG Icon Primitives (strictly DOM-built, zero innerHTML)
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICON_DEFS = {
    spark: [['path', { d: 'M16 4v6M16 22v6M4 16h6M22 16h6M7.5 7.5l4.2 4.2M20.3 20.3l4.2 4.2M24.5 7.5l-4.2 4.2M11.7 20.3l-4.2 4.2' }]],
    music: [['path', { d: 'M12 22a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm0 0V7l14-3v15m0 0a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z' }]],
    building: [['path', { d: 'M4 27V7l10-3v23M14 13l14 3v11M2 27h28M9 11h.1M9 16h.1M9 21h.1M21 19h.1M21 23h.1' }]],
    bag: [['path', { d: 'M6 10h20l-1.5 17h-17L6 10Zm5 0a5 5 0 0 1 10 0' }]],
    wrench: [['path', { d: 'M21 5a6 6 0 0 0-7.6 7.6L6 20l4 4 7.4-7.4A6 6 0 0 0 25 9l-3.5 3.5-2.5-2.5L22.5 6.5' }]],
    layers: [['path', { d: 'm16 4 12 6-12 6-12-6 12-6Zm-12 12 12 6 12-6M4 22l12 6 12-6' }]],
    phone: [['rect', { x: '8', y: '3', width: '16', height: '26', rx: '3' }], ['path', { d: 'M14 7h4M15 24h2' }]],
    grid: [['rect', { x: '4', y: '4', width: '10', height: '10', rx: '2' }], ['rect', { x: '18', y: '4', width: '10', height: '10', rx: '2' }], ['rect', { x: '4', y: '18', width: '10', height: '10', rx: '2' }], ['rect', { x: '18', y: '18', width: '10', height: '10', rx: '2' }]],
    shield: [['path', { d: 'M16 4 6 8v8c0 6.5 4.3 10.6 10 12 5.7-1.4 10-5.5 10-12V8l-10-4Zm-4 12 3 3 5-6' }]],
    bolt: [['path', { d: 'M17 3 7 18h8l-1 11 11-15h-8l0-11Z' }]],
    calendar: [['rect', { x: '4', y: '6', width: '24', height: '21', rx: '2' }], ['path', { d: 'M4 12h24M10 4v4M22 4v4M11 18l3 3 7-6' }]],
    card: [['rect', { x: '3', y: '7', width: '26', height: '18', rx: '2.5' }], ['path', { d: 'M3 13h26M8 20h6' }]],
    inbox: [['path', { d: 'M4 10a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10Zm0 1 12 7 12-7' }]],
    chevron: [['path', { d: 'm9 13 7 7 7-7' }]],
    check: [['path', { d: 'm7 16.5 5.5 5.5L25 9.5' }]],
    close: [['path', { d: 'M8 8l16 16M24 8 8 24' }]]
  };

  function createSvgIcon(key = 'spark', className = 'otp-select-svg') {
    const doc = root.document;
    if (!doc || typeof doc.createElementNS !== 'function') return null;
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const nodes = ICON_DEFS[key] || ICON_DEFS.spark;
    nodes.forEach(([tag, attrs]) => {
      const el = doc.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      svg.appendChild(el);
    });
    return svg;
  }

  const selectRegistry = new WeakMap();

  function enhanceSelect(selectEl, config = {}) {
    const doc = root.document;
    if (!doc || !selectEl) return null;
    if (selectRegistry.has(selectEl)) {
      const existing = selectRegistry.get(selectEl);
      existing.updateConfig(config);
      existing.sync();
      return existing;
    }

    let currentConfig = { ...config };
    const uid = selectEl.id || `otp-sel-${Math.random().toString(36).slice(2, 7)}`;
    const triggerId = `${uid}-trigger`;
    const listboxId = `${uid}-listbox`;

    selectEl.classList.add('otp-native-select-sr');
    selectEl.setAttribute('tabindex', '-1');
    selectEl.setAttribute('aria-hidden', 'true');

    const wrap = doc.createElement('div');
    wrap.className = `otp-select-wrap${currentConfig.wrapClass ? ` ${currentConfig.wrapClass}` : ''}`;

    const trigger = doc.createElement('button');
    trigger.type = 'button';
    trigger.id = triggerId;
    trigger.className = 'otp-select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', listboxId);
    if (currentConfig.labelledBy) trigger.setAttribute('aria-labelledby', currentConfig.labelledBy);

    const iconSlot = doc.createElement('span');
    iconSlot.className = 'otp-select-trigger-icon';

    const copySlot = doc.createElement('span');
    copySlot.className = 'otp-select-trigger-copy';
    const labelText = doc.createElement('span');
    labelText.className = 'otp-select-trigger-title';
    const subText = doc.createElement('span');
    subText.className = 'otp-select-trigger-sub';
    copySlot.append(labelText, subText);

    const badgeSlot = doc.createElement('span');
    badgeSlot.className = 'otp-select-badge';
    badgeSlot.hidden = true;

    const chevronSlot = doc.createElement('span');
    chevronSlot.className = 'otp-select-chevron';
    const chevronSvg = createSvgIcon('chevron', 'otp-select-svg');
    if (chevronSvg) chevronSlot.append(chevronSvg);

    trigger.append(iconSlot, copySlot, badgeSlot, chevronSlot);

    const backdrop = doc.createElement('div');
    backdrop.className = 'otp-select-backdrop';
    backdrop.hidden = true;

    const panel = doc.createElement('div');
    panel.className = 'otp-select-panel';
    panel.hidden = true;

    const sheetHead = doc.createElement('div');
    sheetHead.className = 'otp-select-sheet-head';
    const grabber = doc.createElement('span');
    grabber.className = 'otp-select-sheet-grabber';
    grabber.setAttribute('aria-hidden', 'true');
    const sheetTitle = doc.createElement('strong');
    sheetTitle.className = 'otp-select-sheet-title';
    sheetTitle.textContent = currentConfig.sheetTitle || 'Choose an option';
    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'otp-select-sheet-close';
    closeBtn.setAttribute('aria-label', 'Close menu');
    const closeSvg = createSvgIcon('close', 'otp-select-svg');
    if (closeSvg) closeBtn.append(closeSvg);
    sheetHead.append(grabber, sheetTitle, closeBtn);

    const listbox = doc.createElement('div');
    listbox.id = listboxId;
    listbox.className = 'otp-select-listbox';
    listbox.setAttribute('role', 'listbox');
    if (currentConfig.labelledBy) listbox.setAttribute('aria-labelledby', currentConfig.labelledBy);

    const footerNote = doc.createElement('div');
    footerNote.className = 'otp-select-footer';
    footerNote.hidden = true;

    panel.append(sheetHead, listbox, footerNote);
    wrap.append(trigger, backdrop, panel);
    selectEl.insertAdjacentElement('afterend', wrap);

    let isOpen = false;
    let activeIndex = 0;

    function getOptions() {
      return Array.from(selectEl.options || []);
    }

    function optionMetaFor(opt) {
      if (typeof currentConfig.getOptionMeta === 'function') {
        return currentConfig.getOptionMeta(opt.value, opt.textContent, opt) || {};
      }
      return {};
    }

    function renderOptions() {
      const options = getOptions();
      listbox.replaceChildren();
      options.forEach((opt, idx) => {
        const meta = optionMetaFor(opt);
        const btn = doc.createElement('button');
        btn.type = 'button';
        btn.id = `${uid}-opt-${idx}`;
        btn.className = 'otp-select-option';
        btn.setAttribute('role', 'option');
        btn.setAttribute('data-value', opt.value);
        btn.setAttribute('data-index', String(idx));
        const selected = opt.value === selectEl.value;
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
        if (opt.disabled) btn.disabled = true;
        if (selected) btn.classList.add('is-selected');
        if (idx === activeIndex) btn.classList.add('is-active');

        if (meta.icon) {
          const icoWrap = doc.createElement('span');
          icoWrap.className = 'otp-select-option-icon';
          const ico = createSvgIcon(meta.icon, 'otp-select-svg');
          if (ico) icoWrap.append(ico);
          btn.append(icoWrap);
        }

        if (meta.thumb) {
          const thumbImg = doc.createElement('img');
          thumbImg.className = 'otp-select-option-thumb';
          thumbImg.src = meta.thumb;
          thumbImg.alt = '';
          thumbImg.width = 40;
          thumbImg.height = 25;
          thumbImg.loading = 'lazy';
          thumbImg.decoding = 'async';
          btn.append(thumbImg);
        }

        const optCopy = doc.createElement('span');
        optCopy.className = 'otp-select-option-copy';
        const optTitle = doc.createElement('strong');
        optTitle.textContent = meta.title || opt.textContent;
        optCopy.append(optTitle);
        if (meta.subtitle) {
          const optSub = doc.createElement('small');
          optSub.textContent = meta.subtitle;
          optCopy.append(optSub);
        }
        btn.append(optCopy);

        if (meta.badge) {
          const bdg = doc.createElement('span');
          bdg.className = `otp-select-badge${meta.badgeVariant === 'fixed' ? ' is-fixed' : ''}`;
          bdg.textContent = meta.badge;
          btn.append(bdg);
        }

        const chk = doc.createElement('span');
        chk.className = 'otp-select-check';
        chk.setAttribute('aria-hidden', 'true');
        const chkSvg = createSvgIcon('check', 'otp-select-svg');
        if (chkSvg) chk.append(chkSvg);
        btn.append(chk);

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          chooseIndex(idx);
        });
        btn.addEventListener('mouseenter', () => setActiveIndex(idx, false));
        listbox.append(btn);
      });

      if (currentConfig.footerNote) {
        footerNote.textContent = currentConfig.footerNote;
        footerNote.hidden = false;
      } else {
        footerNote.hidden = true;
      }
      sheetTitle.textContent = currentConfig.sheetTitle || 'Choose an option';
    }

    function setActiveIndex(idx, scrollIntoView = true) {
      const optionBtns = Array.from(listbox.querySelectorAll('.otp-select-option'));
      if (!optionBtns.length) return;
      activeIndex = ((idx % optionBtns.length) + optionBtns.length) % optionBtns.length;
      optionBtns.forEach((b, i) => {
        const active = i === activeIndex;
        b.classList.toggle('is-active', active);
        if (active) {
          trigger.setAttribute('aria-activedescendant', b.id);
          if (scrollIntoView && typeof b.scrollIntoView === 'function') {
            b.scrollIntoView({ block: 'nearest' });
          }
        }
      });
    }

    function syncTrigger() {
      const options = getOptions();
      const selectedOpt = options.find((o) => o.value === selectEl.value) || options[0];
      if (!selectedOpt) return;
      const idx = Math.max(0, options.indexOf(selectedOpt));
      activeIndex = idx;
      const meta = optionMetaFor(selectedOpt);

      iconSlot.replaceChildren();
      if (meta.icon) {
        iconSlot.hidden = false;
        const ico = createSvgIcon(meta.icon, 'otp-select-svg');
        if (ico) iconSlot.append(ico);
      } else {
        iconSlot.hidden = true;
      }

      labelText.textContent = meta.title || selectedOpt.textContent || 'Choose';
      labelText.classList.toggle('is-placeholder', !selectedOpt.value);
      if (meta.subtitle) {
        subText.textContent = meta.subtitle;
        subText.hidden = false;
      } else {
        subText.hidden = true;
      }

      if (meta.badge) {
        badgeSlot.textContent = meta.badge;
        badgeSlot.className = `otp-select-badge${meta.badgeVariant === 'fixed' ? ' is-fixed' : ''}`;
        badgeSlot.hidden = false;
      } else {
        badgeSlot.hidden = true;
      }

      renderOptions();
    }

    function close(restoreFocus = false) {
      if (!isOpen) return;
      isOpen = false;
      wrap.classList.remove('is-open');
      panel.classList.remove('is-sheet-open');
      backdrop.classList.remove('is-sheet-open');
      if (panel.parentElement === doc.body) {
        wrap.append(backdrop, panel);
      }
      panel.hidden = true;
      backdrop.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (restoreFocus && typeof trigger.focus === 'function') trigger.focus();
    }

    function open() {
      if (isOpen) return;
      renderOptions();
      isOpen = true;
      wrap.classList.add('is-open');
      const isMobileSheet = typeof root.matchMedia === 'function' && root.matchMedia('(max-width: 680px)').matches;
      if (isMobileSheet && doc.body) {
        doc.body.append(backdrop, panel);
        backdrop.classList.add('is-sheet-open');
        panel.classList.add('is-sheet-open');
      }
      panel.hidden = false;
      backdrop.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      const selectedIdx = Math.max(0, getOptions().findIndex((o) => o.value === selectEl.value));
      setActiveIndex(selectedIdx, true);
    }

    function chooseIndex(idx) {
      const options = getOptions();
      const opt = options[idx];
      if (!opt || opt.disabled) return;
      const changed = selectEl.value !== opt.value;
      selectEl.value = opt.value;
      syncTrigger();
      close(true);
      if (changed) {
        selectEl.dispatchEvent(new root.Event('change', { bubbles: true }));
      }
      if (typeof currentConfig.onSelect === 'function') {
        currentConfig.onSelect(opt.value, opt);
      }
    }

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) close(false);
      else open();
    });

    trigger.addEventListener('keydown', (e) => {
      const options = getOptions();
      if (!options.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) open();
        else setActiveIndex(activeIndex + 1, true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) open();
        else setActiveIndex(activeIndex - 1, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (!isOpen) open();
        setActiveIndex(0, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        if (!isOpen) open();
        setActiveIndex(options.length - 1, true);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) open();
        else chooseIndex(activeIndex);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      } else if (e.key === 'Tab' && isOpen) {
        close(false);
      }
    });

    backdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      close(true);
    });
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    });
    doc.addEventListener('click', (e) => {
      if (isOpen && !wrap.contains(e.target) && !panel.contains(e.target)) close(false);
    });
    selectEl.addEventListener('change', syncTrigger);

    // If clicked via sibling <label for="selectEl.id">, redirect focus to visible combobox trigger
    if (selectEl.id) {
      doc.querySelectorAll(`label[for="${selectEl.id}"]`).forEach((lbl) => {
        lbl.addEventListener('click', (e) => {
          if (e.target === trigger || wrap.contains(e.target)) return;
          e.preventDefault();
          trigger.focus();
          open();
        });
      });
    }

    syncTrigger();

    const api = {
      sync: syncTrigger,
      open,
      close,
      trigger,
      updateConfig(nextCfg = {}) {
        currentConfig = { ...currentConfig, ...nextCfg };
      }
    };
    selectRegistry.set(selectEl, api);
    return api;
  }

  function syncEnhancedSelect(selectEl) {
    if (!selectEl) return;
    const ctrl = selectRegistry.get(selectEl);
    if (ctrl) ctrl.sync();
  }

  return Object.freeze({
    STORAGE_KEY,
    BOOKING_TOKEN_KEY,
    mapBookingServiceToLaunch,
    load,
    save,
    clear,
    getOrCreateBookingToken,
    createSvgIcon,
    enhanceSelect,
    syncEnhancedSelect
  });
});
