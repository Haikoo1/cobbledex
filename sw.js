/**
 * sw.js — Service Worker for Cobbledex PWA
 *
 * Strategy: Cache First for static assets (CSS, JS) and the data JSON.
 * Network First for everything else, with cache fallback.
 */

const CACHE_NAME = 'cobbledex-v1';
const STATIC_CACHE = 'cobbledex-static-v1';

/** Assets to pre-cache on install */
const PRECACHE_URLS = [
  './',
  './index.html',
  './pokemon.html',
  './css/reset.css',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/dark-mode.css',
  './js/main.js',
  './js/pokemon-detail.js',
  './js/data.js',
  './js/search.js',
  './js/favorites.js',
  './js/comparator.js',
  './js/theme.js',
  './js/i18n.js',
  './js/pwa.js',
  './locales/en.json',
  './locales/pt-BR.json',
  './data/pokemon.json',
  './manifest.json',
];

/* ============================================
   INSTALL — Pre-cache static assets
   ============================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(PRECACHE_URLS);
        console.log('[SW] Pre-cached static assets');
      } catch (err) {
        console.error('[SW] Pre-cache failed:', err);
      }
    })()
  );
  self.skipWaiting();
});

/* ============================================
   ACTIVATE — Clean old caches
   ============================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      console.log('[SW] Old caches cleared');
    })()
  );
  self.clients.claim();
});

/* ============================================
   FETCH — Cache First for assets, Network First for data
   ============================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Cache First strategy for our own static assets and data
  if (url.origin === self.location.origin) {
    const pathname = url.pathname;

    // Static assets (CSS, JS, locales) — Cache First
    if (
      pathname.endsWith('.css') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.json') ||
      pathname === '/manifest.json' ||
      pathname.endsWith('.html')
    ) {
      event.respondWith(cacheFirst(request));
      return;
    }

    // Everything else from our origin — Network First with cache fallback
    event.respondWith(networkFirst(request));
    return;
  }

  // External resources (PokeAPI sprites, Cobbledex CDN) — Stale While Revalidate
  if (
    url.hostname.includes('raw.githubusercontent.com') ||
    url.hostname.includes('cobbledex.b-cdn.net')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // External API calls — Network only, no caching
  return;
});

/* ============================================
   STRATEGIES
   ============================================ */

/**
 * Cache First — Serve from cache, fall back to network.
 * For static assets that rarely change.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network First — Try network, fall back to cache.
 * For data that changes occasionally.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale While Revalidate — Serve cache immediately, update cache with network response.
 * For sprites and external images.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
