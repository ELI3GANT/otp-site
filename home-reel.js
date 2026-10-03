(function homeReel(root) {
  'use strict';
  const clips = [
    { id: 'j70o4Psmxfk', title: 'TJ’s Night', category: 'Event recap', poster: '/assets/films/tjs-night.jpg' },
    { id: 'vNxUzSmr7x0', title: 'Fame and Fortune', category: 'Music visuals', poster: '/assets/films/fame-and-fortune.jpg' },
    { id: 'oFM_roer79A', title: '2 The Froze Tour', category: 'Tour documentary', poster: '/assets/films/froze-tour.jpg' }
  ];
  function startAt(duration, random) {
    return duration > 10 ? Math.floor((duration - 6) * (0.2 + random * 0.5)) : 0;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { clips, startAt };
  if (!root.document) return;
  const doc = root.document;
  const panel = doc.querySelector('[data-home-reel]');
  if (!panel) return;
  const button = panel.querySelector('[data-reel-toggle]');
  const poster = panel.querySelector('.home-reel-poster');
  const title = panel.querySelector('[data-reel-title]');
  const category = panel.querySelector('[data-reel-category]');
  const status = panel.querySelector('[data-reel-status]');
  const motion = root.matchMedia('(prefers-reduced-motion: reduce)');
  let player, index = 0, timer, watchdog, failed = 0, positioned = false, visible = false;
  let requested = !motion.matches && !root.navigator.connection?.saveData;
  button.hidden = false;
  function clearTimers() { root.clearTimeout(timer); root.clearTimeout(watchdog); }
  function canPlay() { return requested && visible && !doc.hidden; }
  function state(value) {
    panel.dataset.state = value;
    button.textContent = value === 'playing' || value === 'loading' ? 'Pause showcase' : 'Play showcase';
    button.setAttribute('aria-label', button.textContent);
  }
  function fallback(message) {
    clearTimers(); requested = false;
    player?.pauseVideo?.(); state('poster');
    status.hidden = false; status.textContent = message;
  }
  function load() {
    clearTimers(); positioned = false;
    const clip = clips[index];
    title.textContent = clip.title + ' ↗';
    title.href = 'https://www.youtube.com/watch?v=' + clip.id;
    category.textContent = clip.category; poster.src = clip.poster;
    poster.alt = clip.title + ', from the OTP film portfolio';
    state('loading');
    player.loadVideoById({ videoId: clip.id, startSeconds: 0 });
    watchdog = root.setTimeout(() => fallback('The showcase could not play here. Watch any full film below.'), 15000);
  }
  function advance() { index = (index + 1) % clips.length; load(); }
  function boot() {
    if (player || !canPlay()) return;
    state('loading');
    const ready = () => {
      if (player || !canPlay()) return;
      player = new root.YT.Player('home-reel-player', {
        videoId: clips[index].id,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, origin: root.location.origin, rel: 0 },
        events: {
          onReady(event) {
            const frame = event.target.getIframe();
            frame.title = 'OTP selected film showcase';
            frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
            event.target.mute();
            if (canPlay()) load();
          },
          onStateChange(event) {
            if (event.data === 2 && ['loading', 'poster'].includes(panel.dataset.state)) return;
            if ([0, 1, 2, 3].includes(event.data)) clearTimers();
            if (event.data === 1) {
              if (!canPlay()) { event.target.pauseVideo(); return; }
              failed = 0; status.hidden = true;
              if (!positioned) {
                positioned = true;
                event.target.seekTo(startAt(event.target.getDuration(), Math.random()), true);
              }
              state('playing'); timer = root.setTimeout(advance, 5000);
            } else if (event.data === 0 && canPlay()) advance();
            else if (event.data === 2) { if (canPlay()) requested = false; state('paused'); }
            else if (event.data === 3 && canPlay()) {
              watchdog = root.setTimeout(() => fallback('The showcase could not play here. Watch any full film below.'), 15000);
            }
          },
          onAutoplayBlocked() { fallback('Tap Play showcase, or choose a full film below.'); },
          onError() {
            failed += 1;
            if (failed >= clips.length) fallback('The showcase is unavailable here. Watch the full films on YouTube below.');
            else if (canPlay()) advance();
          }
        }
      });
    };
    if (root.YT?.Player) ready();
    else if (!doc.querySelector('[data-otp-youtube-api]')) {
      const previous = root.onYouTubeIframeAPIReady;
      root.onYouTubeIframeAPIReady = () => { if (typeof previous === 'function') previous(); ready(); };
      const script = doc.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api'; script.async = true; script.dataset.otpYoutubeApi = '';
      script.onerror = () => fallback('Watch the full films below while the showcase is unavailable.');
      doc.head.appendChild(script);
      watchdog = root.setTimeout(() => fallback('The showcase could not load here. Watch any full film below.'), 15000);
    }
  }
  function sync() {
    clearTimers();
    if (!canPlay()) { player?.pauseVideo?.(); if (player && typeof player.pauseVideo === 'function') state('paused'); return; }
    if (!player) boot();
    else if (typeof player.playVideo === 'function') player.playVideo();
  }
  button.addEventListener('click', () => { requested = panel.dataset.state !== 'playing' && panel.dataset.state !== 'loading'; sync(); });
  doc.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', event => { if (event.matches) { requested = false; sync(); } });
  if (root.IntersectionObserver) {
    const observer = new root.IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.25 });
    observer.observe(panel);
  } else { visible = true; sync(); }
})(typeof window !== 'undefined' ? window : globalThis);
