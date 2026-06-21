import { useState, useEffect, useCallback } from "react";

// Stored in sessionStorage to prevent a reload loop.
// Set BEFORE reload, cleared on the next page load if already set.
const RELOAD_FLAG = "maryEnglishReloadedForUpdate";

export interface PwaUpdateResult {
  updateAvailable: boolean;
  checkForUpdate: () => void;
}

export function usePwaUpdate(): PwaUpdateResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    // ── Watch an installing SW and set updateAvailable when it progresses
    function watchInstalling(sw: ServiceWorker) {
      if (sw.state === "installing" || sw.state === "installed" || sw.state === "activating") {
        if (!cancelled) setUpdateAvailable(true);
      }
      sw.addEventListener("statechange", () => {
        if ((sw.state === "installed" || sw.state === "activating") && !cancelled) {
          setUpdateAvailable(true);
        }
      });
    }

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (cancelled) return;

        // Trigger an update check every time the app opens
        reg.update().catch(() => {});

        // If a new worker is already installing when we mount
        if (reg.installing) watchInstalling(reg.installing);

        // Watch for future updates
        reg.addEventListener("updatefound", () => {
          if (reg.installing) watchInstalling(reg.installing);
        });
      } catch {
        // no service worker support — silently skip
      }
    }

    setup();

    // ── When a new SW takes control, reload the page (once per update cycle)
    function onControllerChange() {
      if (sessionStorage.getItem(RELOAD_FLAG) === "true") {
        // We already reloaded for this update — clear the flag and stop
        sessionStorage.removeItem(RELOAD_FLAG);
        return;
      }
      // Set the guard, then reload
      sessionStorage.setItem(RELOAD_FLAG, "true");
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  // ── Manual update check (for the "Check for update" button)
  const checkForUpdate = useCallback(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.update())
      .catch(() => {});
  }, []);

  return { updateAvailable, checkForUpdate };
}
