/**
 * OTP SERVICE WORKER v16.0.0
 * Always serve HTML fresh from network. Never cache HTML.
 */

const SW_VERSION = 'otp-sw-v16.0.0';

self.addEventListener('install', () => {
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  // Delete ALL old caches without mercy
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  const isHTML = url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    !url.pathname.includes('.');

  if (isHTML) {
    // HTML: ALWAYS fetch from network, never cache
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).catch(() => {
        // Only fall back to cache if truly offline
        return caches.match(request);
      })
    );
  }
  // All other assets: let browser handle normally
});
