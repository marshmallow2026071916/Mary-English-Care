import { useState, useEffect, useCallback } from "react";

// sessionStorage key — prevents a reload loop across the one reload we do per update.
const RELOAD_FLAG = "maryEnglishUpdateReloaded";

export interface PwaUpdateResult {
  updateAvailable: boolean;
  checkForUpdate: () => void;
  forceRefresh: () => Promise<void>;
}

export function usePwaUpdate(): PwaUpdateResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    // ── Tell a waiting SW to take over.
    // Must be called AFTER the controllerchange listener is registered so we
    // never miss the resulting event.
    function activateWaiting(reg: ServiceWorkerRegistration) {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    }

    // ── Watch an installing worker; when it reaches "installed" (= waiting),
    //    signal it to activate.
    function watchInstalling(sw: ServiceWorker, reg: ServiceWorkerRegistration) {
      if (!cancelled) setUpdateAvailable(true);
      if (sw.state === "installed") {
        // Already waiting — activate immediately.
        activateWaiting(reg);
        return;
      }
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && !cancelled) {
          setUpdateAvailable(true);
          activateWaiting(reg);
        }
      });
    }

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (cancelled) return;

        // Trigger an update check on every app open.
        reg.update().catch(() => {});

        // If a new SW is already waiting when we mount, activate it now.
        if (reg.waiting) {
          if (!cancelled) setUpdateAvailable(true);
          activateWaiting(reg);
        }

        // If a new SW is installing right now, watch it.
        if (reg.installing) {
          watchInstalling(reg.installing, reg);
        }

        // Watch for future updates.
        reg.addEventListener("updatefound", () => {
          if (reg.installing) watchInstalling(reg.installing, reg);
        });
      } catch {
        // Service worker not supported — silently skip.
      }
    }

    // ── Reload the page once when a new SW takes control.
    //    sessionStorage flag prevents an infinite reload loop.
    function onControllerChange() {
      if (sessionStorage.getItem(RELOAD_FLAG) === "true") {
        sessionStorage.removeItem(RELOAD_FLAG);
        return;
      }
      sessionStorage.setItem(RELOAD_FLAG, "true");
      window.location.reload();
    }

    // Register the controllerchange listener BEFORE setup() (which calls
    // activateWaiting → postMessage → skipWaiting), so we cannot miss the event.
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    setup();

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  // ── Manual update check (for the "Check for update" button).
  const checkForUpdate = useCallback(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.update().catch(() => {});
        // If there is already a waiting worker, activate it right now.
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      })
      .catch(() => {});
  }, []);

  // ── Nuclear option: unregister all SWs, clear all caches, reload.
  const forceRefresh = useCallback(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      // ignore
    }
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // ignore
    }
    window.location.reload();
  }, []);

  return { updateAvailable, checkForUpdate, forceRefresh };
}
