(function publicShell(root) {
  'use strict';
  const links = [['Home', '/'], ['Archive', '/archive'], ['Signal', '/signal'], ['Studio', '/studio']];
  function renderHeader(active = '') {
    const navigation = links.map(([label, href]) => `<a href="${href}"${label === active ? ' aria-current="page"' : ''}>${label}</a>`).join('');
    return `<header class="public-header" id="top"><a class="public-brand" href="/" aria-label="OnlyTrue Perspective home"><img src="/assets/otp-logo-transparent.png" width="44" height="44" alt="" /><span>OnlyTrue<br>Perspective</span></a><nav class="public-desktop-nav" aria-label="Primary">${navigation}</nav><a class="public-header-cta" href="/bookings?source=public-nav">Start a project <span aria-hidden="true">↗</span></a><details class="public-menu"><summary aria-label="Navigation menu">Menu <span aria-hidden="true">+</span></summary><nav aria-label="Mobile">${navigation}<a href="/bookings?source=public-mobile">Start a project ↗</a></nav></details></header>`;
  }
  function renderFooter() {
    return `<footer class="public-footer"><div class="public-wrap"><div class="public-footer-top"><a href="/" class="public-footer-brand">OnlyTruePerspective</a><p>Independent perspective.<br>Rhode Island · Working everywhere.</p></div><div class="public-footer-links"><nav aria-label="Explore"><a href="/archive">Archive</a><a href="/signal">Signal</a><a href="/studio">Studio</a><a href="/insights">Journal</a></nav><nav aria-label="Work with OTP"><a href="/bookings?source=public-footer">Start a project ↗</a><a href="/website-design.html">Web & systems</a><a href="/services/consultant-audit">Consultant audit</a><a href="/fixline">FIXLINE</a><a href="/portal">Client Portal</a></nav><nav aria-label="Elsewhere"><a href="https://instagram.com/onlytrueperspective" target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href="https://youtube.com/@onlytrueperspective" target="_blank" rel="noopener noreferrer">YouTube ↗</a><a href="https://www.reddit.com/r/OnlyTruePerspective" target="_blank" rel="noopener noreferrer">Reddit ↗</a><a href="mailto:contact@onlytrueperspective.tech">Email ↗</a></nav></div><div class="public-footer-bottom"><span>© <span data-public-year>2026</span> OnlyTruePerspective LLC</span><span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="#top">Back to top ↑</a></span></div></div></footer>`;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { renderHeader, renderFooter };
  if (!root.document) return;
  root.document.querySelectorAll('[data-public-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });
  const menu = root.document.querySelector('.public-menu');
  if (menu) {
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { menu.open = false; }));
    root.document.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target)) {
        menu.open = false;
      }
    });
    root.matchMedia('(min-width: 801px)').addEventListener('change', (event) => { if (event.matches) menu.open = false; });
  }
  const legacy = { '#packages': '/studio#engagements', '#faq': '/studio#questions', '#audio': '/signal', '#media-showcase': '/archive#motion', '#results': '/archive', '#fast-lane-capture': '/studio#engagements' };
  if (root.location.pathname === '/' && legacy[root.location.hash]) {
    const destination = new URL(legacy[root.location.hash], root.location.origin);
    destination.search = root.location.search;
    root.location.replace(destination.pathname + destination.search + destination.hash);
  }
})(typeof window !== 'undefined' ? window : globalThis);
