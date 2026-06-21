const CACHE_NAME = 'mary-english-v3.1.1';

// Install: cache nothing special; do NOT skipWaiting here.
// The client will send SKIP_WAITING after it has set up the controllerchange
// listener, so we never miss the event.
self.addEventListener('install', () => {
  // intentionally left empty — client controls activation timing
});

self.addEventListener('activate', (event) => {
  // Prune old caches, then claim all open clients immediately.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Client sends { type: "SKIP_WAITING" } after setting up the controllerchange
// listener, guaranteeing the reload event is caught.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first strategy: always try the network; fall back to cache when offline.
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
