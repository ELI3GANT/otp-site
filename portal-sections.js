const sectionDefinitions = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'project', label: 'Project', icon: 'project' },
  { key: 'documents', label: 'Files', icon: 'documents' },
  { key: 'billing', label: 'Payment', icon: 'billing' },
  { key: 'support', label: 'Help', icon: 'support' }
];

const sectionIconPaths = Object.freeze({
  overview: ['M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7'],
  project: ['M4 5h16v14H4zM8 9h8M8 13h5'],
  documents: ['M7 3h8l4 4v14H5V3h2zM15 3v5h5M8 12h8M8 16h8'],
  billing: ['M3 7h18v13H3zM3 10h18M7 16h3'],
  support: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 4M12 17h.01']
});

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of sectionIconPaths[name] || sectionIconPaths.overview) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

// Selection lives only in this page, never alongside portal credentials.
export function createPortalSections(sections, { selected = 'overview' } = {}) {
  const root = document.createElement('div');
  root.className = 'portal-sections';
  const navigation = document.createElement('nav');
  navigation.className = 'portal-section-nav';
  navigation.setAttribute('aria-label', 'Your project sections');
  navigation.setAttribute('role', 'tablist');
  const content = document.createElement('div');
  content.className = 'portal-section-content';
  const entries = sectionDefinitions.map(({ key, label, icon: iconName }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `portal-tab-${key}`;
    button.className = 'portal-section-tab';
    const labelNode = document.createElement('span');
    labelNode.textContent = label;
    button.append(icon(iconName), labelNode);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-label', label);
    button.title = label;
    button.setAttribute('aria-controls', `portal-panel-${key}`);
    const panel = document.createElement('section');
    panel.id = `portal-panel-${key}`;
    panel.className = 'portal-section-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    (sections[key] || []).filter(Boolean).forEach((item) => panel.append(item));
    navigation.append(button);
    content.append(panel);
    return { key, button, panel };
  });
  function select(key, focus = false) {
    for (const entry of entries) {
      const active = entry.key === key;
      entry.button.setAttribute('aria-selected', String(active));
      entry.button.tabIndex = active ? 0 : -1;
      entry.panel.hidden = !active;
      if (active && focus) entry.button.focus();
    }
    root.dataset.section = key;
  }
  entries.forEach(({ key, button }, index) => {
    button.addEventListener('click', () => select(key));
    button.addEventListener('keydown', (event) => {
      const next = { ArrowRight: (index + 1) % entries.length, ArrowLeft: (index + entries.length - 1) % entries.length, Home: 0, End: entries.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(entries[next].key, true);
    });
  });
  select(entries.some((entry) => entry.key === selected) ? selected : 'overview');
  root.append(navigation, content);
  return { root, select, panels: Object.fromEntries(entries.map(({ key, panel }) => [key, panel])) };
}
