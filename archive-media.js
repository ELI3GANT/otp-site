(function renderArchiveFilms() {
  'use strict';
  const container = document.querySelector('[data-video-feed="archive"]');
  if (!container || !window.OTP_VIDEO_LIBRARY) return;
  const films = window.OTP_VIDEO_LIBRARY.getFallbackVideos();
  const filters = [...document.querySelectorAll('[data-filter]')];
  function render(category) {
    const selected = films.filter((film) => category === 'All' || film.category === category);
    container.replaceChildren(...selected.map((film) => {
      const link = document.createElement('a');
      link.className = 'archive-film';
      link.href = film.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const media = document.createElement('div');
      media.className = 'archive-film-image';
      const img = document.createElement('img');
      img.src = film.thumbnail;
      img.alt = film.title ? `${film.title} film preview` : 'OTP film preview';
      img.width = 480; img.height = 360; img.loading = 'lazy';
      img.addEventListener('error', () => { img.hidden = true; }, { once: true });
      const action = document.createElement('span');
      action.textContent = 'Watch film ↗';
      media.append(img, action);
      const label = document.createElement('p'); label.className = 'public-label'; label.textContent = film.category;
      const title = document.createElement('h3'); title.textContent = film.title;
      link.append(media, label, title);
      return link;
    }));
    if (!selected.length) { const message = document.createElement('p'); message.textContent = 'No films in this category yet.'; container.append(message); }
    filters.forEach((button) => { const active = button.dataset.filter === category; button.setAttribute('aria-pressed', String(active)); button.classList.toggle('active', active); });
  }
  filters.forEach((button) => button.addEventListener('click', () => render(button.dataset.filter)));
  render('All');
})();
