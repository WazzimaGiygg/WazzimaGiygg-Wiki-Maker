const CACHE_VERSION = 'v1';
const STATIC_CACHE = `wazzima-static-${CACHE_VERSION}`;
const FONT_STYLES_CACHE = `wazzima-gfonts-css-${CACHE_VERSION}`;
const FONT_FILES_CACHE = `wazzima-gfonts-files-${CACHE_VERSION}`;

const ACTIVE_CACHES = new Set([STATIC_CACHE, FONT_STYLES_CACHE, FONT_FILES_CACHE]);

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/assets/aistudio/image_c25fcad0.png',
];

const BYPASS_HOSTS = new Set([
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'apis.google.com',
  'accounts.google.com',
  'www.googleapis.com',
]);

const STATIC_EXTENSIONS = /\.(?:js|mjs|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|webmanifest)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' }))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ACTIVE_CACHES.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && (response.status === 200 || response.type === 'opaque')) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && (response.status === 200 || response.type === 'opaque')) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(networkPromise);
    return cached;
  }

  const fresh = await networkPromise;
  if (fresh) {
    return fresh;
  }
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      await cache.put('/index.html', response.clone());
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match('/index.html')) ||
      (await cache.match('/')) ||
      new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never intercept Firebase / Firestore / Auth requests
  if (BYPASS_HOSTS.has(url.hostname)) return;

  // Never cache Vite dev internals or the service worker script itself
  if (
    url.origin === self.location.origin &&
    (url.pathname === '/sw.js' ||
      url.pathname.startsWith('/@vite') ||
      url.pathname.startsWith('/@react-refresh') ||
      url.pathname.startsWith('/node_modules/'))
  ) {
    return;
  }

  // Google Fonts CSS stylesheets -> Stale-While-Revalidate
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(event, request, FONT_STYLES_CACHE));
    return;
  }

  // Google Fonts binary font files -> Cache-First
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_FILES_CACHE));
    return;
  }

  // Same-origin handling
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstNavigation(request));
      return;
    }

    // Content-hashed Vite bundles (/assets/index-XYZ.js) -> Cache-First
    if (/^\/assets\/[^/]+-[a-zA-Z0-9_-]{6,}\.(?:js|css)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }

    // Other same-origin static assets -> Stale-While-Revalidate
    if (url.pathname.startsWith('/assets/') || STATIC_EXTENSIONS.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(event, request, STATIC_CACHE));
    }
  }
});
