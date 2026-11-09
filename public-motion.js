(function publicMotion() {
  'use strict';
  if (!document.body.classList.contains('public-page')) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  let atmosphere;
  let stopDrawing;
  function drawEye() {
    const emblem = document.querySelector('.home-emblem');
    const original = emblem?.querySelector('img');
    if (!original || preference.matches || !original.complete || !original.naturalWidth) return;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 500 500');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('eye-draw');
    const defs = document.createElementNS(ns, 'defs');
    const mask = document.createElementNS(ns, 'mask');
    mask.id = 'otp-eye-marker';
    const paths = [
      'M55 230 Q120 55 280 45 Q365 25 420 55',
      'M420 73 Q390 205 350 244 Q280 306 138 292',
      'M145 110 C95 290 350 340 360 180 C375 90 275 55 220 95',
      'M240 180 C168 157 230 66 286 129 C310 170 268 215 240 180',
      'M120 385 C260 250 176 498 98 445 C20 390 178 290 166 368',
      'M240 365 C190 303 314 288 296 338 L255 433 C180 521 170 414 233 416',
      'M290 305 Q350 305 375 270 Q416 230 412 283 L376 397 Q336 465 323 418 Q312 384 358 358',
      'M360 305 Q402 204 423 270 Q460 355 369 363',
      'M40 75 L460 75 M460 145 L40 145 M40 215 L460 215 M460 285 L40 285 M40 355 L460 355 M460 425 L40 425 M40 470 L460 470'
    ];
    let variant = Math.floor(Math.random() * 4);
    try {
      const previous = Number(sessionStorage.getItem('otp_eye_variant'));
      if (variant === previous) variant = (variant + 1) % 4;
      sessionStorage.setItem('otp_eye_variant', String(variant));
    } catch { /* Drawing still works without storage. */ }
    emblem.dataset.drawVariant = String(variant);
    const order = variant % 2 ? [3, 2, 0, 1, 7, 6, 5, 4, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const strokes = order.map(index => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', paths[index]);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'white');
      path.setAttribute('stroke-width', index === 8 ? '82' : '46');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '1';
      mask.append(path);
      return path;
    });
    defs.append(mask); svg.append(defs);
    const picture = document.createElementNS(ns, 'image');
    picture.setAttribute('href', original.getAttribute('src'));
    picture.setAttribute('width', '500'); picture.setAttribute('height', '500');
    picture.setAttribute('mask', 'url(#otp-eye-marker)'); svg.append(picture);
    emblem.append(svg); emblem.classList.add('is-drawing');
    const animations = strokes.map((stroke, index) => stroke.animate([
      { strokeDashoffset: variant > 1 ? '-1' : '1' }, { strokeDashoffset: '0' }
    ], { duration: index === 8 ? 220 : 320, delay: 120 + index * 220, easing: 'cubic-bezier(.3,.05,.4,1)', fill: 'forwards' }));
    const cleanup = () => {
      emblem.classList.remove('is-drawing'); svg.remove();
      animations.forEach(animation => animation.cancel()); stopDrawing = null;
    };
    stopDrawing = cleanup;
    Promise.all(animations.map(animation => animation.finished)).then(cleanup).catch(() => {});
  }


  function syncMotion() {
    if (observer) observer.disconnect();
    document.querySelectorAll('.public-motion-enter').forEach((node) => {
      node.classList.remove('public-motion-enter', 'is-visible');
    });
    if (preference.matches) {
      if (stopDrawing) stopDrawing();
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
  const mark = document.querySelector('.home-emblem img');
  if (mark?.complete) drawEye();
  else mark?.addEventListener('load', drawEye, { once: true });
})();
