(function initArchive(root) {
  'use strict';
  const library = root.OTP_PROJECT_LIBRARY;
  const projectRoot = document.querySelector('[data-archive-projects]');
  if (!library || !projectRoot) return;
  const order = ['hyh-architecture-design', 'weatheros', 'otp-fixline', 'protocol', 'song-wars', 'otp-os', 'vault'];
  const projects = library.getProjects().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const buttons = [...document.querySelectorAll('[data-archive-collection]')];
  const films = document.getElementById('motion');
  const projectSection = document.querySelector('[data-archive-project-section]');
  const status = document.querySelector('[data-archive-selection-status]');
  const empty = document.querySelector('[data-archive-empty]');
  const history = document.querySelector('.archive-history');
  const categories = ['All', 'Video', 'Digital', 'Music / Campaigns'];
  const legacy = { Everything: 'All', Creative: 'Music / Campaigns', Music: 'Music / Campaigns', Events: 'Music / Campaigns', 'Internal Products': 'Digital', Software: 'Digital', 'Client Projects': 'Digital', 'Featured Projects': 'All', Newest: 'All' };
  let category = 'All';
  const blurbs = {
    'hyh-architecture-design': 'A new frame for architecture. Website, visual direction, and a clearer path into the work.',
    weatheros: 'Atmospheric weather, visual forecasts, and an interface with room to breathe.',
    'otp-fixline': 'A structured starting point for understanding a business’s digital presence.',
    protocol: 'Music, identity, and a digital release world for ELI3GANT.',
    'song-wars': 'A short-run event campaign, now preserved as a record after registration closed.',
    'otp-os': 'The private, protected operational system behind OTP’s client work, documents, and delivery.',
    vault: 'A private music archive and release-planning workspace in development. No launch date announced.'
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
    const primaryLabel = project.id === 'vault' ? 'Preview VAULT ↗' : 'Explore project ↗';
    actions.append(createAction(primaryLabel, project.caseStudyUrl, 'archive-project-action-primary'));
    const booking = createAction(project.bookingCtaLabel, project.bookingUrl, 'archive-project-action-conversion');
    if (project.id === 'otp-fixline') booking.dataset.fixlineEvent = 'audit_cta_selected';
    actions.append(booking);
    content.append(actions);
    card.append(content);
    return card;
  }
  function readCategory() {
    const value = new URLSearchParams(root.location.search).get('collection') || 'All';
    return categories.find(item => item.toLowerCase() === value.trim().toLowerCase())
      || Object.entries(legacy).find(([key]) => key.toLowerCase() === value.trim().toLowerCase())?.[1] || 'All';
  }
  function belongs(project) {
    const music = project.collections.some(value => ['Music', 'Events'].includes(value));
    return category === 'All' || (category === 'Digital' && !music) || (category === 'Music / Campaigns' && music);
  }
  function render(historyAction) {
    const selected = projects.filter(belongs);
    projectRoot.replaceChildren(...selected.map(createProjectCard));
    projectRoot.setAttribute('aria-busy', 'false');
    films.hidden = !['All', 'Video'].includes(category);
    projectSection.hidden = category === 'Video';
    if (history) history.hidden = category === 'Video';
    if (empty) empty.hidden = selected.length > 0 || category === 'Video';
    const messages = { All: 'Showing video work and selected projects.', Video: 'Showing video work.', Digital: 'Showing websites, apps, and systems.', 'Music / Campaigns': 'Showing music and campaign projects.' };
    if (status) status.textContent = messages[category];
    buttons.forEach(button => {
      const active = button.dataset.archiveCollection === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = false;
    });
    const videoLink = document.querySelector('.archive-hero-bottom a');
    if (videoLink) videoLink.setAttribute('href', films.hidden ? '?collection=Video#motion' : '#motion');
    const params = new URLSearchParams();
    if (category !== 'All') params.set('collection', category);
    const query = params.toString();
    const url = root.location.pathname + (query ? '?' + query : '') + root.location.hash;
    if (historyAction && url !== root.location.pathname + root.location.search + root.location.hash) {
      root.history[historyAction === 'push' ? 'pushState' : 'replaceState']({ otpArchive: true }, '', url);
    }
    const timeline = document.querySelector('[data-archive-timeline]');
    if (timeline) {
      timeline.replaceChildren();
      [...selected].sort((a, b) => String(a.launchDate || '9999-12-31').localeCompare(String(b.launchDate || '9999-12-31'))).forEach((project) => {
        const row = node('li', 'archive-timeline-item');
        const hasLaunchDate = /^\d{4}-\d{2}-\d{2}$/.test(String(project.launchDate || ''));
        const dateLabel = hasLaunchDate
          ? new Date(`${project.launchDate}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
          : project.status === 'Coming Soon' ? 'Coming soon' : String(project.year || 'Date not set');
        const date = node('time', '', dateLabel);
        if (hasLaunchDate) date.dateTime = project.launchDate;
        row.append(date, createAction(project.title, project.caseStudyUrl, ''), node('span', '', project.category));
        timeline.append(row);
      });
    }

  }
  buttons.forEach(button => button.addEventListener('click', () => {
    if (category === button.dataset.archiveCollection) return;
    category = button.dataset.archiveCollection;
    render('push');
  }));
  document.querySelectorAll('[data-archive-reset]').forEach(button => button.addEventListener('click', () => { category = 'All'; render('push'); }));
  root.addEventListener('popstate', () => { category = readCategory(); render(); });
  category = readCategory();
  render('replace');
})(typeof window !== 'undefined' ? window : globalThis);
