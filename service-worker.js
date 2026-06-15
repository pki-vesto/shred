// Bump this string on every deploy that changes app shell assets.
// The activate step deletes any cache whose name does not match.
const CACHE_VERSION = 'shred-v21';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const PHOTO_CACHE = `${CACHE_VERSION}-photos`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/js/app.js',
  '/js/state.js',
  '/js/photos.js',
  '/js/theme.js',
  '/js/helpers.js',
  '/js/bodyMetrics.js',
  '/js/dashboardMetrics.js',
  '/js/trainingMetrics.js',
  '/js/sessions.js',
  '/js/exercises.js',
  '/js/meals.js',
  '/js/seed.js',
  '/js/nutrition.js',
  '/js/lookup.js',
  '/js/sync.js',
  '/js/lib/idb.js',
  '/js/voice/record.js',
  '/js/voice/api.js',
  '/js/voice/queue.js',
  '/js/ui/components.js',
  '/js/ui/sheet.js',
  '/js/ui/swap.js',
  '/js/ui/today.js',
  '/js/ui/body.js',
  '/js/ui/food.js',
  '/js/ui/voice.js',
  '/js/ui/overview.js',
  '/js/ui/settings.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // addAll is atomic — one 404 fails the whole install. Some assets in the
      // list (sync.js, idb.js) only appear after later phases land; tolerate
      // misses individually instead.
      await Promise.all(SHELL_ASSETS.map(async (url) => {
        try { await cache.add(new Request(url, { cache: 'reload' })); }
        catch (e) { console.warn('[sw] precache skip', url, e?.message); }
      }));
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(n => n !== SHELL_CACHE && n !== PHOTO_CACHE)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // /api/photos/:id — immutable blobs, cache-first with long TTL.
  if (url.pathname.startsWith('/api/photos/')) {
    event.respondWith(cacheFirst(req, PHOTO_CACHE));
    return;
  }

  // Other /api/* — network-first with no caching. Sync logic owns its own
  // retry/queue; we just pass through and let the client see failures.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req).catch(() => new Response('offline', { status: 503 })));
    return;
  }

  // App shell + assets — cache-first, falling back to network. Only fall back
  // to the cached shell for NAVIGATIONS; for a sub-resource (script/css/icon)
  // that misses, return a real network error instead of the HTML document —
  // otherwise a missing module resolves to index.html and fails to parse.
  event.respondWith(
    cacheFirst(req, SHELL_CACHE).catch(() =>
      req.mode === 'navigate' ? caches.match('/index.html') : Response.error()
    )
  );
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

// Allow the page to ask for an immediate update when a new SW is waiting.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
