/**
 * Shared Cinematic Playback Controller across OnlyTruePerspective public surfaces
 * (/index, /launch, /start-project).
 *
 * Unifies IntersectionObserver viewport management, muted inline autoplay setup,
 * loop/resume recovery, reduced-motion handling, and blocked-autoplay fallback UI.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.OTP_MOTION = factory(root);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const tracked = new Map();
  let observer = null;
  let globalBound = false;
  let syncTimer = null;

  const prefersReducedMotion = () => Boolean(
    root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  function isElementNearViewport(el, margin = 120) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect || rect.width === 0 || rect.height === 0) return false;
    const vh = root.innerHeight || root.document?.documentElement?.clientHeight || 900;
    return rect.bottom >= -margin && rect.top <= vh + margin;
  }

  function configureVideo(vid, options = {}) {
    if (!vid) return;
    const autoplay = options.autoplay !== false;
    const eager = Boolean(options.eager);
    vid.muted = true;
    vid.defaultMuted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');
    vid.setAttribute('loop', '');
    vid.dataset.autoplayVisible = autoplay ? 'true' : 'false';
    if (autoplay && !prefersReducedMotion()) {
      vid.setAttribute('autoplay', '');
    } else {
      vid.removeAttribute('autoplay');
    }
    if (autoplay) {
      if (vid.preload === 'none' || !vid.getAttribute('preload')) {
        vid.preload = eager ? 'auto' : 'metadata';
      }
    } else if (!vid.getAttribute('preload')) {
      vid.preload = 'none';
    }
  }

  function defaultBlockedHandler(vid, blocked) {
    const wrap = vid?.closest?.('.otp-media-slot');
    if (blocked) {
      vid.dataset.autoplayBlocked = 'true';
      wrap?.classList?.add('is-autoplay-blocked');
      wrap?.setAttribute?.('data-autoplay-blocked', 'true');
    } else {
      delete vid.dataset.autoplayBlocked;
      wrap?.classList?.remove('is-autoplay-blocked');
      wrap?.removeAttribute?.('data-autoplay-blocked');
    }
    const btn = wrap?.querySelector?.('.otp-media-play-toggle');
    if (btn && vid.paused) {
      btn.textContent = 'Play';
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  function defaultReadyHandler(vid) {
    const wrap = vid?.closest?.('.otp-media-slot');
    vid?.classList?.add('is-video-ready');
    wrap?.classList?.add('is-video-ready');
  }

  function safePlay(vid) {
    if (!vid) return;
    const opts = tracked.get(vid) || {};
    configureVideo(vid, { autoplay: vid.dataset.autoplayVisible !== 'false', eager: opts.eager });
    if (vid.preload === 'none') vid.preload = 'auto';
    try {
      const p = vid.play?.();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          (opts.onBlocked || defaultBlockedHandler)(vid, false);
          if (vid.readyState >= 2) (opts.onReady || defaultReadyHandler)(vid);
        }).catch((err) => {
          if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
            (opts.onBlocked || defaultBlockedHandler)(vid, true);
          }
        });
      }
    } catch {}
  }

  function sync() {
    const hidden = Boolean(root.document?.hidden);
    const reduced = prefersReducedMotion();
    for (const [vid, opts] of Array.from(tracked.entries())) {
      if (!vid.isConnected) {
        tracked.delete(vid);
        observer?.unobserve?.(vid);
        continue;
      }
      const near = isElementNearViewport(vid, opts.margin ?? 120);
      if (reduced || hidden || !near) {
        vid.pause?.();
        continue;
      }
      if (vid.dataset.userPaused !== 'true' && vid.dataset.autoplayVisible !== 'false' && vid.paused) {
        safePlay(vid);
      }
    }
  }

  function scheduleSync(delay = 80) {
    if (syncTimer) root.clearTimeout(syncTimer);
    syncTimer = root.setTimeout(() => {
      syncTimer = null;
      sync();
    }, delay);
  }

  function bindGlobalListeners() {
    if (globalBound || !root.document?.addEventListener) return;
    globalBound = true;
    root.document.addEventListener('visibilitychange', sync);
    root.addEventListener?.('otp:themechange', sync);
    root.addEventListener?.('otp:accentchange', sync);
    root.addEventListener?.('resize', () => scheduleSync(120), { passive: true });
    root.addEventListener?.('scroll', () => scheduleSync(120), { passive: true });
    if (root.matchMedia) {
      const mq = root.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener?.('change', sync);
    }
  }

  function ensureObserver() {
    bindGlobalListeners();
    if (observer || !('IntersectionObserver' in root)) return observer;
    observer = new root.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vid = entry.target;
          if (!(vid instanceof root.HTMLVideoElement)) return;
          if (prefersReducedMotion() || root.document?.hidden) {
            vid.pause?.();
            return;
          }
          if (entry.isIntersecting && vid.dataset.userPaused !== 'true' && vid.dataset.autoplayVisible !== 'false') {
            safePlay(vid);
          } else {
            vid.pause?.();
          }
        });
      },
      { threshold: 0.05, rootMargin: '120px 0px' }
    );
    return observer;
  }

  function register(vid, options = {}) {
    if (!vid) return;
    const opts = {
      autoplay: options.autoplay !== false,
      eager: Boolean(options.eager),
      margin: typeof options.margin === 'number' ? options.margin : 120,
      onBlocked: options.onBlocked || defaultBlockedHandler,
      onReady: options.onReady || defaultReadyHandler
    };
    configureVideo(vid, opts);
    if (!tracked.has(vid)) {
      tracked.set(vid, opts);
      const tryStart = () => {
        opts.onReady(vid);
        if (opts.autoplay && vid.dataset.userPaused !== 'true' && !prefersReducedMotion() && !root.document?.hidden && isElementNearViewport(vid, opts.margin)) {
          safePlay(vid);
        }
      };
      vid.addEventListener('loadeddata', tryStart);
      vid.addEventListener('canplay', tryStart);
      vid.addEventListener('playing', () => opts.onReady(vid));
      vid.addEventListener('ended', () => {
        // Explicit loop fallback for browsers that ignore the loop attribute cleanly
        if (vid.loop && !prefersReducedMotion() && vid.dataset.userPaused !== 'true' && isElementNearViewport(vid, opts.margin)) {
          try { vid.currentTime = 0; } catch {}
          safePlay(vid);
        }
      });
    } else {
      tracked.set(vid, opts);
    }
    if (vid.readyState >= 2) opts.onReady(vid);
    const obs = ensureObserver();
    if (obs) obs.observe(vid);
    if (opts.autoplay && (opts.eager || isElementNearViewport(vid, opts.margin))) {
      safePlay(vid);
    }
    root.requestAnimationFrame?.(sync);
  }

  return Object.freeze({
    prefersReducedMotion,
    isElementNearViewport,
    configureVideo,
    safePlay,
    register,
    sync
  });
});
