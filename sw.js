/**
 * OTP SERVICE WORKER v16.2.0
 * Always serve HTML fresh from network. Never cache HTML.
 */

const SW_VERSION = 'otp-sw-v16.3.0';

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

self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Do not intercept API, health, or live transactional commercial/portal routes.
  const pathName = url.pathname;
  const isDynamicOrApi = (
    pathName.startsWith('/api') ||
    pathName === '/ping' ||
    pathName.startsWith('/proposal') ||
    pathName.startsWith('/client') ||
    pathName.startsWith('/portal') ||
    pathName.startsWith('/payment') ||
    pathName.startsWith('/launch') ||
    pathName.startsWith('/start-project') ||
    pathName.startsWith('/bookings') ||
    pathName.startsWith('/quote') ||
    pathName.startsWith('/os')
  );
  if (isDynamicOrApi) return;
  const isHTML = (
    pathName === '/' ||
    pathName.endsWith('.html') ||
    !pathName.includes('.')
  );

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
