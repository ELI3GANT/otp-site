let screen = document.getElementById('feature-screen');
const caption = document.getElementById('screen-caption');
const featureButtons = document.querySelectorAll('.feature[data-screen]');
const descriptions = {
  studio: 'VAULT Studio showing a sample catalog and an active master.',
  library: 'VAULT Library with songs and versions from a sample catalog.',
  player: 'VAULT Now Playing with audio details, waveform, and two versions of a sample song.',
  signal: 'VAULT SIGNAL release workflow with a sample catalog.',
  'artist-setup': 'VAULT artist setup with sample identity and genre selections.',
  onboarding: 'VAULT onboarding: a private, local-first workspace for your music.'
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let transitionToken = 0;
const revealTargets = document.querySelectorAll(
  '.hero-copy > *, .hero-phone, .principles > *, .product-screen, .inside-copy > *, .feature, .questions > *, .answers > article, .backup-note > *, .footer > *'
);

if (!reduceMotion && 'IntersectionObserver' in window) {
  revealTargets.forEach((element, index) => {
    element.dataset.reveal = '';
    element.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 80}ms`);
  });
  document.documentElement.classList.add('motion-ready');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });

  revealTargets.forEach((element) => revealObserver.observe(element));
}

document.querySelectorAll('[data-screen]').forEach((button) => {
  button.addEventListener('click', () => {
    const name = button.dataset.screen;
    const figure = screen.closest('figure');
    featureButtons.forEach((item) => {
      const selected = item.dataset.screen === name;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });

    const source = '/assets/vault/launch/' + name + '.png';
    const token = ++transitionToken;
    const phone = figure.querySelector('.phone');
    figure.querySelector('.screen-next')?.remove();
    figure.classList.remove('is-switching');
    if (screen.getAttribute('src') === source) return;

    const updateCaption = () => {
      caption.textContent = name === 'onboarding'
        ? 'Actual app · First launch'
        : name === 'artist-setup'
          ? 'Actual app · Artist setup'
          : 'Actual app · Sample catalog';
    };

    if (reduceMotion) {
      screen.src = source;
      screen.alt = descriptions[name];
      updateCaption();
    } else {
      const incoming = new Image();
      incoming.className = 'screen-next';
      incoming.alt = descriptions[name];
      incoming.setAttribute('aria-hidden', 'true');
      figure.classList.add('is-switching');

      incoming.addEventListener('load', () => {
        if (token !== transitionToken) return;
        figure.querySelector('.screen-next')?.remove();
        phone.append(incoming);
        requestAnimationFrame(() => incoming.classList.add('is-entering'));
        updateCaption();

        window.setTimeout(() => {
          if (!incoming.isConnected) return;
          screen.src = source;
          screen.alt = descriptions[name];
          incoming.remove();
          figure.classList.remove('is-switching');
        }, 600);
      }, { once: true });

      incoming.addEventListener('error', () => {
        if (token !== transitionToken) return;
        figure.classList.remove('is-switching');
      }, { once: true });
      incoming.src = source;
    }

    if (window.matchMedia('(max-width:760px)').matches) {
      figure.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth'
      });
    }
  });
});

const heroPhone = document.querySelector('.hero-phone');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
if (heroPhone && !reduceMotion && finePointer.matches) {
  let tiltFrame = 0;
  heroPhone.addEventListener('pointermove', (event) => {
    const bounds = heroPhone.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    cancelAnimationFrame(tiltFrame);
    tiltFrame = requestAnimationFrame(() => {
      heroPhone.style.setProperty('--tilt-x', `${-y * 5}deg`);
      heroPhone.style.setProperty('--tilt-y', `${x * 6}deg`);
    });
  });
  heroPhone.addEventListener('pointerleave', () => {
    cancelAnimationFrame(tiltFrame);
    heroPhone.style.setProperty('--tilt-x', '0deg');
    heroPhone.style.setProperty('--tilt-y', '0deg');
  });
}
