// ── Cache names ──────────────────────────────────────────────────────────────
// Bump APP_CACHE_NAME on every deploy; ASSET_CACHE_NAME only when assets change.
const APP_CACHE_NAME   = 'mary-english-app-cache-v3-1-1-20260622-001';
const ASSET_CACHE_NAME = 'mary-english-asset-cache-v1';

const APP_VERSION = '3.1.1';
const APP_BUILD   = '2026-06-22-001';

// ── Helper: is this request for a long-lived asset? ──────────────────────────
// Asset requests go to the asset cache (cache-first).
// Everything else is treated as app-shell (network-first).
function isAssetRequest(url) {
  const path = new URL(url).pathname;
  // Mary avatars, outfits, emotes, sounds, icons
  return (
    path.startsWith('/assets/mary/') ||
    path.startsWith('/assets/sounds/') ||
    path.startsWith('/assets/icons/') ||
    /\.(png|jpg|jpeg|webp|gif|svg|ico|mp3|wav|ogg)$/.test(path)
  );
}

// ── Install ───────────────────────────────────────────────────────────────────
// Do NOT call skipWaiting() here.
// The client sends SKIP_WAITING after registering the controllerchange listener,
// guaranteeing the reload event is never missed.
self.addEventListener('install', () => {
  console.log(`[SW] Install — app ${APP_VERSION} build ${APP_BUILD}`);
  // intentionally no skipWaiting — client controls timing
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activate — app ${APP_VERSION} build ${APP_BUILD}`);

  event.waitUntil(
    caches.keys().then((keys) => {
      const deletions = keys
        .filter((k) => k.startsWith('mary-english-app-cache-') && k !== APP_CACHE_NAME)
        .map((k) => {
          console.log(`[SW] Deleting old app cache: ${k}`);
          return caches.delete(k);
        });

      // Never delete asset cache
      const kept = keys.filter((k) => k === ASSET_CACHE_NAME);
      if (kept.length) console.log(`[SW] Asset cache kept: ${ASSET_CACHE_NAME}`);

      return Promise.all(deletions);
    }).then(() => {
      console.log('[SW] Old app caches deleted. Claiming clients…');
      return self.clients.claim();
    }).then(() => {
      console.log('[SW] Activated and clients claimed.');
    })
  );
});

// ── Message ───────────────────────────────────────────────────────────────────
// Client sends { type: "SKIP_WAITING" } after setting up controllerchange listener.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating new service worker.');
    self.skipWaiting();
  }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  if (isAssetRequest(url)) {
    // ── Cache-first for long-lived assets ─────────────────────────────────
    event.respondWith(
      caches.open(ASSET_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
  } else {
    // ── Network-first for app shell ────────────────────────────────────────
    // index.html is always fetched fresh; JS/CSS are versioned by Vite.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            caches.open(APP_CACHE_NAME).then((cache) =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
