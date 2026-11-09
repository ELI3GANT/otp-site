(function loreTransmission() {
  'use strict';
  const section = document.querySelector('.home-lore');
  if (!section) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const letters = Array.from(section.querySelectorAll('.lore-glyph'));
  const artist = section.querySelector('[data-lore-artist]');
  const toggle = section.querySelector('.lore-motion-toggle');
  const pool = '01X7/3_';
  let visible = false;
  let paused = false;
  let timer;
  let burstTimer;

  function restore() {
    letters.forEach((letter, index) => {
      letter.textContent = 'LORE'[index];
      letter.dataset.glyph = 'LORE'[index];
    });
    if (artist) artist.textContent = 'ELI3GANT';
    section.classList.remove('is-interference');
  }

  function stop() {
    clearTimeout(timer);
    clearTimeout(burstTimer);
    section.classList.remove('is-running');
    restore();
  }

  function canRun() {
    return visible && !paused && !preference.matches && !document.hidden;
  }

  function schedule() {
    timer = setTimeout(burst, 6800 + Math.random() * 3200);
  }

  function burst() {
    if (!canRun()) return;
    section.classList.add('is-interference');
    let step = 0;
    function tick() {
      if (!canRun()) { stop(); return; }
      if (step === 2) { restore(); schedule(); return; }
      letters.forEach((letter, index) => {
        const character = index < step * 2 ? 'LORE'[index] : pool[Math.floor(Math.random() * pool.length)];
        letter.textContent = character;
        letter.dataset.glyph = character;
      });
      if (artist) artist.textContent = step === 0 ? '3LI3G4NT' : 'ELI3GANT';
      step += 1;
      burstTimer = setTimeout(tick, 360);
    }
    tick();
  }

  function sync() {
    stop();
    if (toggle) toggle.hidden = preference.matches;
    if (canRun()) {
      section.classList.add('is-running');
      timer = setTimeout(burst, 700);
    }
  }

  toggle?.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Resume LORE animation' : 'Pause LORE animation');
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      sync();
    }, { threshold: 0 });
    observer.observe(section);
  }
  // Without an observer, keep the final static artwork and usable destination.
  sync();
})();
