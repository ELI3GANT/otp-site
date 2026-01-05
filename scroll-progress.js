window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const max = document.body.scrollHeight - window.innerHeight;
  const scrollPercent = max > 0 ? (scrolled / max) * 100 : 0;
  document.body.style.setProperty('--scroll', `${scrollPercent}%`);
}, { passive: true });
