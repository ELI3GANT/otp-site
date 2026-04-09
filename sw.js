/**
 * OTP SERVICE WORKER — Cache Control Engine
 * Strategy:
 *  - HTML files: NETWORK-FIRST (always fresh, fall back to cache)
 *  - CSS/JS with version strings: CACHE-FIRST (immutable, versioned)
 *  - Everything else: NETWORK-FIRST
 */

const CACHE_NAME = 'otp-v16.0.0';
const IMMUTABLE_ASSETS = /\.(css|js|gif|png|jpg|jpeg|svg|woff2?|ttf)(\?v=.+)?$/;

// Install: activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET and cross-origin (CDN scripts, Supabase, etc.)
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  const isHTML = request.headers.get('Accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTML) {
    // HTML: always try network first — browser gets fresh content
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((networkResponse) => {
          // Cache the fresh response
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(request)) // fallback to cache if offline
    );
  } else if (IMMUTABLE_ASSETS.test(url.pathname + url.search) && url.search.includes('v=')) {
    // Versioned assets: cache-first (they're immutable by design)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
          return networkResponse;
        });
      })
    );
  }
  // All other requests: browser default (no SW intervention)
});
