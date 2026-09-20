(function initArchive(root) {
  'use strict';
  const library = root.OTP_PROJECT_LIBRARY;
  const projectRoot = document.querySelector('[data-archive-projects]');
  if (!library || !projectRoot) return;
  const order = ['hyh-architecture-design', 'weatheros', 'otp-fixline', 'protocol', 'song-wars', 'otp-os'];
  const projects = library.getProjects().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const state = { collection: 'Everything', search: '', category: '', status: '', year: '', technology: '' };
  const controls = Object.fromEntries(Object.keys(state).filter((key) => key !== 'collection').map((key) => [key, document.querySelector(`[data-archive-${key}]`)]));
  const buttons = [...document.querySelectorAll('[data-archive-collection]')];
  const count = document.querySelector('[data-archive-result-count]');
  const empty = document.querySelector('[data-archive-empty]');
  const blurbs = {
    'hyh-architecture-design': 'A new frame for architecture. Website, visual direction, and a clearer path into the work.',
    weatheros: 'Atmospheric weather, visual forecasts, and an interface with room to breathe.',
    'otp-fixline': 'A structured starting point for understanding a business’s digital presence.',
    protocol: 'Music, identity, and a digital release world for ELI3GANT.',
    'song-wars': 'An event identity and online entry point for The Smack Club’s music community.',
    'otp-os': 'The private operational system behind OTP’s client work, documents, and delivery.'
  };
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const safeHref = (value) => {
    try {
      const url = new URL(value, root.location.origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  function createAction(label, url, className) {
    const href = safeHref(url);
    const action = node(href ? 'a' : 'span', className, label);
    if (href) action.href = href;
    else action.setAttribute('aria-disabled', 'true');
    return action;
  }
  function createProjectCard(project) {
    const card = node('article', `archive-case-study-card${project.id === order[0] ? ' is-featured' : ''}`);
    card.dataset.projectId = project.id;
    const titleId = `archive-project-${project.id}`;
    card.setAttribute('aria-labelledby', titleId);
    const media = createAction('', project.caseStudyUrl, `archive-project-media${project.heroFit === 'contain' ? ' is-contain' : ''}`);
    media.setAttribute('aria-label', `Explore ${project.title}`);
    const img = document.createElement('img');
    img.src = safeHref(project.heroImage.src);
    img.alt = project.heroImage.alt;
    img.width = project.heroImage.width;
    img.height = project.heroImage.height;
    img.loading = project.id === order[0] ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => { img.hidden = true; media.append(node('span', 'archive-image-unavailable', `${project.title} · Image unavailable`)); }, { once: true });
    media.append(img);
    const serial = node('span', 'archive-project-index', String(order.indexOf(project.id) + 1).padStart(2, '0'));
    serial.setAttribute('aria-hidden', 'true');
    media.append(serial);
    card.append(media);
    const content = node('div', 'archive-project-content');
    const meta = node('div', 'archive-project-meta');
    meta.append(node('span', '', project.category), node('span', '', project.status));
    content.append(meta);
    const title = node('h2', 'archive-project-title');
    title.id = titleId;
    title.append(createAction(project.title, project.caseStudyUrl, ''));
    content.append(title, node('p', 'archive-project-summary', blurbs[project.id] || project.shortDescription));
    const actions = node('div', 'archive-project-actions');
    actions.append(createAction('Explore project ↗', project.caseStudyUrl, 'archive-project-action-primary'));
    const booking = createAction(project.bookingCtaLabel, project.bookingUrl, 'archive-project-action-conversion');
    if (project.id === 'otp-fixline') booking.dataset.fixlineEvent = 'audit_cta_selected';
    actions.append(booking);
    content.append(actions);
    card.append(content);
    return card;
  }
  function matches(project) {
    const creative = project.collections.some((value) => ['Music', 'Events'].includes(value));
    const collection = state.collection === 'Everything' || (state.collection === 'Creative' ? creative : project.collections.includes(state.collection));
    const haystack = [project.title, project.type, project.shortDescription, ...project.categories, ...project.disciplines, ...project.services, ...project.technology, ...project.tags].join(' ').toLowerCase();
    return collection && (!state.search || haystack.includes(state.search.toLowerCase()))
      && (!state.category || project.categories.includes(state.category))
      && (!state.status || project.status === state.status)
      && (!state.year || String(project.year) === state.year)
      && (!state.technology || project.technology.includes(state.technology));
  }

  const options = {
    category: [...new Set(projects.flatMap((p) => p.categories))].sort(),
    status: [...new Set(projects.map((p) => p.status))],
    year: library.getYears(),
    technology: library.getTechnologies()
  };

  function parseUrlParams() {
    const nextState = { collection: 'Everything', search: '', category: '', status: '', year: '', technology: '' };
    try {
      if (!root.location || !root.location.search) return nextState;
      const params = new URLSearchParams(root.location.search);

      const col = params.get('collection');
      if (col) {
        const matchedCol = buttons.map((b) => b.dataset.archiveCollection).find((c) => c.toLowerCase() === col.trim().toLowerCase());
        if (matchedCol) nextState.collection = matchedCol;
      }

      const q = params.get('search');
      if (q) nextState.search = q.trim();

      const cat = params.get('category');
      if (cat) {
        const matchedCat = options.category.find((c) => c.toLowerCase() === cat.trim().toLowerCase());
        if (matchedCat) nextState.category = matchedCat;
      }

      const stat = params.get('status');
      if (stat) {
        const matchedStat = options.status.find((s) => s.toLowerCase() === stat.trim().toLowerCase());
        if (matchedStat) nextState.status = matchedStat;
      }

      const yr = params.get('year');
      if (yr) {
        const matchedYear = options.year.map(String).find((y) => y === yr.trim());
        if (matchedYear) nextState.year = matchedYear;
      }

      const tech = params.get('technology');
      if (tech) {
        const matchedTech = options.technology.find((t) => t.toLowerCase() === tech.trim().toLowerCase());
        if (matchedTech) nextState.technology = matchedTech;
      }
    } catch (_) {
      // Safe fallback on any malformed input
    }
    return nextState;
  }

  function buildCanonicalQueryString(targetState) {
    const params = new URLSearchParams();
    if (targetState.collection && targetState.collection !== 'Everything') {
      params.set('collection', targetState.collection);
    }
    if (targetState.category) {
      params.set('category', targetState.category);
    }
    if (targetState.status) {
      params.set('status', targetState.status);
    }
    if (targetState.year) {
      params.set('year', targetState.year);
    }
    if (targetState.technology) {
      params.set('technology', targetState.technology);
    }
    if (targetState.search) {
      params.set('search', targetState.search);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  function syncUrl(action = 'none') {
    if (!root.history || !root.location) return;
    const newQs = buildCanonicalQueryString(state);
    const targetUrl = root.location.pathname + newQs + (root.location.hash || '');
    const currentUrl = root.location.pathname + (root.location.search || '') + (root.location.hash || '');

    if (targetUrl === currentUrl) return;

    if (action === 'push' && typeof root.history.pushState === 'function') {
      root.history.pushState({ otpArchive: true }, '', targetUrl);
    } else if (action === 'replace' && typeof root.history.replaceState === 'function') {
      root.history.replaceState({ otpArchive: true }, '', targetUrl);
    }
  }

  function syncControlsFromState() {
    if (controls.search) controls.search.value = state.search;
    if (controls.category) controls.category.value = state.category;
    if (controls.status) controls.status.value = state.status;
    if (controls.year) controls.year.value = state.year;
    if (controls.technology) controls.technology.value = state.technology;

    const hasRefine = Boolean(state.category || state.status || state.year || state.technology);
    const refineDetails = document.querySelector('.archive-refine');
    if (refineDetails && hasRefine) {
      refineDetails.open = true;
    }
  }

  function render(historyAction = 'none') {
    const selected = projects.filter(matches);
    projectRoot.replaceChildren(...selected.map(createProjectCard));
    projectRoot.setAttribute('aria-busy', 'false');
    count.textContent = `${String(selected.length).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')} projects`;
    empty.hidden = selected.length > 0;
    buttons.forEach((button) => {
      const active = button.dataset.archiveCollection === state.collection;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (historyAction === 'push' || historyAction === 'replace') {
      syncUrl(historyAction);
    }
  }

  function reset() {
    Object.assign(state, { collection: 'Everything', search: '', category: '', status: '', year: '', technology: '' });
    Object.values(controls).forEach((control) => { if (control) control.value = ''; });
    render('push');
  }

  Object.entries(options).forEach(([key, values]) => values.forEach((value) => {
    const option = node('option', '', value);
    option.value = value;
    if (controls[key]) controls[key].append(option);
  }));

  buttons.forEach((button) => button.addEventListener('click', () => {
    if (state.collection === button.dataset.archiveCollection) return;
    state.collection = button.dataset.archiveCollection;
    render('push');
  }));

  ['category', 'status', 'year', 'technology'].forEach((key) => {
    if (controls[key]) {
      controls[key].addEventListener('change', () => {
        state[key] = controls[key].value.trim();
        render('push');
      });
    }
  });

  let searchDebounceTimer = null;
  if (controls.search) {
    controls.search.addEventListener('input', () => {
      state.search = controls.search.value.trim();
      render('none');
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        syncUrl('replace');
      }, 150);
    });

    controls.search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(searchDebounceTimer);
        state.search = controls.search.value.trim();
        render('replace');
      }
    });
  }

  document.querySelectorAll('[data-archive-clear], [data-archive-reset]').forEach((button) => button.addEventListener('click', reset));

  if (typeof root.addEventListener === 'function') {
    root.addEventListener('popstate', () => {
      const parsed = parseUrlParams();
      Object.assign(state, parsed);
      syncControlsFromState();
      render('none');
    });
  }

  const timeline = document.querySelector('[data-archive-timeline]');
  if (timeline) {
    [...projects].sort((a, b) => a.launchDate.localeCompare(b.launchDate)).forEach((project) => {
      const row = node('li', 'archive-timeline-item');
      const date = node('time', '', new Date(`${project.launchDate}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }));
      date.dateTime = project.launchDate;
      row.append(date, createAction(project.title, project.caseStudyUrl, ''), node('span', '', project.category));
      timeline.append(row);
    });
  }

  // Initialize state from URL params
  const initialParams = parseUrlParams();
  Object.assign(state, initialParams);
  syncControlsFromState();
  render('none');
  syncUrl('replace');
})(typeof window !== 'undefined' ? window : globalThis);
