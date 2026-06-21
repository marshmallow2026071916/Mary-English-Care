// Bump this name on every deploy so old caches are pruned automatically.
const CACHE_NAME = 'mary-english-v3.1.1';

self.addEventListener('install', () => {
  // Skip the waiting phase immediately so the new SW activates right away.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove any caches from previous versions.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Allow the client to trigger skipWaiting via postMessage as a safety net.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first strategy: always try the network; fall back to cache when offline.
// index.html is always fetched fresh so the app shell never goes stale.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
