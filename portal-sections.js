const sectionLabels = ['Overview', 'Project', 'Documents', 'Billing', 'Support'];

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
  const entries = sectionLabels.map((label) => {
    const key = label.toLowerCase();
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `portal-tab-${key}`;
    button.className = 'portal-section-tab';
    button.textContent = label;
    button.setAttribute('role', 'tab');
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
