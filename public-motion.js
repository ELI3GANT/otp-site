(function publicMotion() {
  'use strict';
  if (!document.body.classList.contains('public-page')) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  let atmosphere;

  function syncMotion() {
    if (observer) observer.disconnect();
    document.querySelectorAll('.public-motion-enter').forEach((node) => {
      node.classList.remove('public-motion-enter', 'is-visible');
    });
    if (preference.matches) {
      if (atmosphere) atmosphere.remove();
      atmosphere = null;
      return;
    }
    if (!atmosphere) {
      atmosphere = document.createElement('div');
      atmosphere.className = 'public-atmosphere';
      atmosphere.setAttribute('aria-hidden', 'true');
      document.body.prepend(atmosphere);
    }
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -32px 0px', threshold: 0 });
    document.querySelectorAll('main > section, .flo-section, .flo-contact, .project-section').forEach((node) => {
      if (node.getBoundingClientRect().top < window.innerHeight) return;
      node.classList.add('public-motion-enter');
      observer.observe(node);
    });
  }

  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('public-motion-paused', document.hidden);
  });
  preference.addEventListener('change', syncMotion);
  syncMotion();
})();
