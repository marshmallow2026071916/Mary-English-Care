import { useState, useEffect, useCallback } from "react";

// Prefix used to identify app-shell caches (NOT asset cache).
const APP_CACHE_PREFIX   = "mary-english-app-cache-";
const ASSET_CACHE_NAME   = "mary-english-asset-cache-v1";

// sessionStorage key — prevents a reload loop: set BEFORE reload, cleared on
// the next render if already set.
const RELOAD_FLAG = "maryEnglishUpdateReloaded";

export interface PwaUpdateResult {
  updateAvailable: boolean;
  applyUpdate: () => void;
  checkForUpdate: () => void;
  forceRefresh: () => Promise<void>;
  resetAssetCache: () => Promise<void>;
}

export function usePwaUpdate(): PwaUpdateResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Keep a ref to the current waiting SW so applyUpdate() can reach it.
  const waitingSwRef = { current: null as ServiceWorker | null };

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    // ── Watch an installing worker; when it becomes "installed" (= waiting),
    //    mark an update as available so the banner can show.
    //    We do NOT send SKIP_WAITING automatically — the user taps "Update".
    function watchInstalling(sw: ServiceWorker) {
      const advance = () => {
        if (sw.state === "installed" && !cancelled) {
          console.log("[App] New service worker waiting. Showing update banner.");
          waitingSwRef.current = sw;
          setUpdateAvailable(true);
        }
      };

      advance(); // already installed?
      sw.addEventListener("statechange", advance);
    }

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (cancelled) return;

        console.log("[App] Service worker registered.");

        // Trigger a background update check on every app open.
        reg.update().catch(() => {});

        // Already a waiting worker (e.g. user opened app while update was pending).
        if (reg.waiting) {
          console.log("[App] Service worker waiting at mount.");
          waitingSwRef.current = reg.waiting;
          if (!cancelled) setUpdateAvailable(true);
        }

        // Installing worker present at mount.
        if (reg.installing) {
          watchInstalling(reg.installing);
        }

        // Future updates.
        reg.addEventListener("updatefound", () => {
          console.log("[App] Service worker update found.");
          if (reg.installing) watchInstalling(reg.installing);
        });
      } catch {
        // Service worker not supported — silently skip.
      }
    }

    // ── Reload once when a new SW takes control.
    //    The flag ensures we don't loop.
    function onControllerChange() {
      console.log("[App] Service worker controller changed.");
      if (sessionStorage.getItem(RELOAD_FLAG) === "true") {
        sessionStorage.removeItem(RELOAD_FLAG);
        console.log("[App] Reload flag cleared — skipping duplicate reload.");
        return;
      }
      console.log("[App] Reloading into new version…");
      sessionStorage.setItem(RELOAD_FLAG, "true");
      window.location.reload();
    }

    // IMPORTANT: register controllerchange BEFORE setup() so we can't miss it
    // when applyUpdate() triggers skipWaiting.
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    setup();

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tell the waiting SW to take over (called by the "Update" button).
  const applyUpdate = useCallback(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      const sw = reg.waiting ?? waitingSwRef.current;
      if (sw) {
        console.log("[App] Sending SKIP_WAITING to waiting service worker.");
        sw.postMessage({ type: "SKIP_WAITING" });
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual update check (Check for update button).
  const checkForUpdate = useCallback(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      console.log("[App] Manual update check requested.");
      reg.update().catch(() => {});
      // If a worker is already waiting, activate it immediately.
      if (reg.waiting) {
        console.log("[App] Waiting worker found — activating.");
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    }).catch(() => {});
  }, []);

  // ── Force refresh: unregister all SWs, clear only app-shell caches, reload
  //    with a cache-busting query string.  Asset cache is preserved.
  const forceRefresh = useCallback(async () => {
    console.log("[App] Force refresh executed.");
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch { /* ignore */ }
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(APP_CACHE_PREFIX))
          .map((k) => {
            console.log(`[App] Deleting app cache: ${k}`);
            return caches.delete(k);
          })
      );
      console.log(`[App] Asset cache preserved: ${ASSET_CACHE_NAME}`);
    } catch { /* ignore */ }
    window.location.href = `${window.location.pathname}?refresh=${Date.now()}`;
  }, []);

  // ── Reset downloaded assets: delete only the asset cache.
  //    localStorage, Review Log, XP, wardrobe are untouched.
  const resetAssetCache = useCallback(async () => {
    console.log("[App] Downloaded assets reset.");
    try {
      await caches.delete(ASSET_CACHE_NAME);
    } catch { /* ignore */ }
    // Reload so assets re-download cleanly.
    window.location.reload();
  }, []);

  return { updateAvailable, applyUpdate, checkForUpdate, forceRefresh, resetAssetCache };
}
