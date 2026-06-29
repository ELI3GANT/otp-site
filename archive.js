(function initOtpArchive(root) {
  'use strict';

  const library = root.OTP_PROJECT_LIBRARY;
  const projectRoot = document.querySelector('[data-archive-projects]');
  if (!library || !projectRoot) return;

  const state = {
    collection: 'Everything',
    search: '',
    category: '',
    status: '',
    year: '',
    technology: ''
  };

  const projects = library.getProjects();
  const controls = {
    collections: Array.from(document.querySelectorAll('[data-archive-collection]')),
    search: document.querySelector('[data-archive-search]'),
    category: document.querySelector('[data-archive-category]'),
    status: document.querySelector('[data-archive-status]'),
    year: document.querySelector('[data-archive-year]'),
    technology: document.querySelector('[data-archive-technology]'),
    clear: document.querySelector('[data-archive-clear]'),
    count: document.querySelector('[data-archive-result-count]'),
    empty: document.querySelector('[data-archive-empty]'),
    timeline: document.querySelector('[data-archive-timeline]')
  };

  const cleanText = (value, fallback = '') => {
    const normalized = String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized || fallback;
  };

  const safeHref = (value) => {
    if (!cleanText(value)) return '';
    try {
      const url = new URL(String(value || ''), root.location.origin);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return url.origin === root.location.origin ? `${url.pathname}${url.search}${url.hash}` : url.toString();
    } catch (error) {
      return '';
    }
  };

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = cleanText(text);
    return node;
  };

  const formatDate = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return 'Archive entry';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const appendOptions = (select, values) => {
    if (!select) return;
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = String(value);
      select.appendChild(option);
    });
  };

  const createPills = (items, className, limit) => {
    const list = element('ul', className);
    (Array.isArray(items) ? items : []).slice(0, limit).forEach((item) => {
      list.appendChild(element('li', 'archive-project-pill', item));
    });
    return list;
  };

  const createAction = (project, kind) => {
    const isCaseStudy = kind === 'case-study';
    const href = safeHref(isCaseStudy ? project.caseStudyUrl : project.projectUrl);
    const label = cleanText(
      isCaseStudy ? project.caseStudyCtaLabel : project.projectCtaLabel,
      isCaseStudy ? 'Read Case Study' : 'Visit Project'
    );

    if (!href) {
      const unavailable = element('span', 'archive-project-action archive-project-action-secondary is-unavailable', `${label} · Soon`);
      unavailable.setAttribute('aria-disabled', 'true');
      unavailable.title = 'Full case study coming soon';
      return unavailable;
    }

    const link = element('a', `archive-project-action ${isCaseStudy ? 'archive-project-action-secondary' : 'archive-project-action-primary'}`, label);
    link.href = href;
    if (/^https?:\/\//.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    return link;
  };

  const createProjectCard = (project, index) => {
    const card = element('article', `archive-case-study-card${project.featured ? ' is-featured' : ''}`);
    const titleId = `archive-project-${cleanText(project.id, String(index + 1))}`;
    card.setAttribute('aria-labelledby', titleId);
    card.dataset.projectId = cleanText(project.id);
    card.dataset.status = cleanText(project.status);

    const media = element('div', `archive-project-media${project.heroFit === 'contain' ? ' is-contain' : ''}`);
    const image = document.createElement('img');
    image.src = safeHref(project.heroImage && project.heroImage.src);
    image.alt = cleanText(project.heroImage && project.heroImage.alt, `${project.title} project artwork`);
    image.width = Number(project.heroImage && project.heroImage.width) || 1200;
    image.height = Number(project.heroImage && project.heroImage.height) || 800;
    image.loading = index < 2 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      image.removeAttribute('src');
      media.classList.add('is-missing');
      media.appendChild(element('span', 'archive-project-media-fallback', project.title));
    }, { once: true });
    media.appendChild(image);

    const mediaMeta = element('div', 'archive-project-media-meta');
    mediaMeta.appendChild(element('span', 'archive-project-status', project.status));
    if (project.featured) mediaMeta.appendChild(element('span', 'archive-project-featured', 'Featured'));
    media.appendChild(mediaMeta);
    card.appendChild(media);

    const content = element('div', 'archive-project-content');
    const topline = element('div', 'archive-project-topline');
    topline.appendChild(element('span', 'archive-project-type', project.type));
    topline.appendChild(element('time', 'archive-project-date', formatDate(project.launchDate)));
    topline.lastChild.dateTime = project.launchDate;
    content.appendChild(topline);

    const title = element('h3', 'archive-project-title', project.title);
    title.id = titleId;
    content.appendChild(title);
    content.appendChild(element('p', 'archive-project-summary', project.shortDescription));
    content.appendChild(createPills(project.disciplines, 'archive-project-pills', 6));

    const details = element('div', 'archive-project-details');
    const serviceGroup = element('div', 'archive-project-detail-group');
    serviceGroup.appendChild(element('p', 'archive-project-detail-label', 'Services'));
    serviceGroup.appendChild(element('p', 'archive-project-detail-copy', (project.services || []).slice(0, 4).join(' · ')));
    details.appendChild(serviceGroup);
    const technologyGroup = element('div', 'archive-project-detail-group');
    technologyGroup.appendChild(element('p', 'archive-project-detail-label', 'Technology'));
    technologyGroup.appendChild(element('p', 'archive-project-detail-copy', (project.technology || []).join(' · ')));
    details.appendChild(technologyGroup);
    content.appendChild(details);

    const actions = element('div', 'archive-project-actions');
    actions.appendChild(createAction(project, 'project'));
    actions.appendChild(createAction(project, 'case-study'));
    content.appendChild(actions);
    card.appendChild(content);
    return card;
  };

  const searchableText = (project) => [
    project.title,
    project.type,
    project.shortDescription,
    ...(project.categories || []),
    ...(project.disciplines || []),
    ...(project.services || []),
    ...(project.technology || []),
    ...(project.tags || [])
  ].join(' ').toLowerCase();

  const projectMatches = (project) => {
    const collectionMatch = state.collection === 'Everything' || (project.collections || []).includes(state.collection);
    const searchMatch = !state.search || searchableText(project).includes(state.search.toLowerCase());
    const categoryMatch = !state.category || (project.categories || []).includes(state.category);
    const statusMatch = !state.status || project.status === state.status;
    const yearMatch = !state.year || String(project.year) === state.year;
    const technologyMatch = !state.technology || (project.technology || []).includes(state.technology);
    return collectionMatch && searchMatch && categoryMatch && statusMatch && yearMatch && technologyMatch;
  };

  const renderProjects = () => {
    const matches = projects.filter(projectMatches);
    projectRoot.replaceChildren(...matches.map(createProjectCard));
    projectRoot.setAttribute('aria-busy', 'false');
    if (controls.count) controls.count.textContent = `${matches.length} ${matches.length === 1 ? 'project' : 'projects'}`;
    if (controls.empty) controls.empty.hidden = matches.length !== 0;
  };

  const renderTimeline = () => {
    if (!controls.timeline) return;
    const timelineProjects = [...projects].sort((a, b) => String(a.launchDate).localeCompare(String(b.launchDate)));
    const items = timelineProjects.map((project) => {
      const item = element('li', 'archive-timeline-item');
      const marker = element('span', 'archive-timeline-marker');
      marker.setAttribute('aria-hidden', 'true');
      item.appendChild(marker);
      const copy = element('div', 'archive-timeline-copy');
      copy.appendChild(element('time', 'archive-timeline-date', formatDate(project.launchDate)));
      copy.lastChild.dateTime = project.launchDate;
      const href = safeHref(project.projectUrl);
      const heading = element(href ? 'a' : 'span', 'archive-timeline-title', project.title);
      if (href) heading.href = href;
      copy.appendChild(heading);
      copy.appendChild(element('p', 'archive-timeline-type', `${project.status} · ${project.type}`));
      item.appendChild(copy);
      return item;
    });
    controls.timeline.replaceChildren(...items);
  };

  const syncCollectionButtons = () => {
    controls.collections.forEach((button) => {
      const active = button.dataset.archiveCollection === state.collection;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const resetFilters = () => {
    Object.assign(state, { collection: 'Everything', search: '', category: '', status: '', year: '', technology: '' });
    [controls.search, controls.category, controls.status, controls.year, controls.technology].forEach((control) => {
      if (control) control.value = '';
    });
    syncCollectionButtons();
    renderProjects();
  };

  appendOptions(controls.category, library.getCategories());
  appendOptions(controls.status, library.getStatuses());
  appendOptions(controls.year, library.getYears());
  appendOptions(controls.technology, library.getTechnologies());

  controls.collections.forEach((button) => {
    button.addEventListener('click', () => {
      state.collection = button.dataset.archiveCollection || 'Everything';
      syncCollectionButtons();
      renderProjects();
    });
  });

  if (controls.search) controls.search.addEventListener('input', () => {
    state.search = controls.search.value.trim();
    renderProjects();
  });

  ['category', 'status', 'year', 'technology'].forEach((key) => {
    if (!controls[key]) return;
    controls[key].addEventListener('change', () => {
      state[key] = controls[key].value;
      renderProjects();
    });
  });

  if (controls.clear) controls.clear.addEventListener('click', resetFilters);

  renderTimeline();
  renderProjects();
})(window);
