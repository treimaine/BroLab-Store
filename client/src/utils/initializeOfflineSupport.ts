/**
 * Initialize offline support for the application
 * This should be called in the main app initialization
 */

import { register } from "./serviceWorkerRegistration";

export function initializeOfflineSupport(): void {
  // Register service worker for offline functionality
  if (process.env.NODE_ENV === "production") {
    register({
      onSuccess: registration => {
        console.log("Service Worker registered successfully:", registration);
      },
      onUpdate: registration => {
        console.log("New content is available; please refresh.");

        // Optionally show a notification to the user
        if (window.confirm("New version available! Refresh to update?")) {
          window.location.reload();
        }
      },
      onOfflineReady: () => {
        console.log("App is ready for offline use.");

        // Optionally show a notification
        const event = new CustomEvent("offline-ready");
        window.dispatchEvent(event);
      },
    });
  } else {
    console.log("Service Worker registration skipped in development mode");
  }

  // Listen for service worker sync events
  window.addEventListener("sw-sync-complete", (event: any) => {
    console.log("Background sync completed:", event.detail);

    // Optionally refresh data or show notification
    const syncEvent = new CustomEvent("offline-sync-complete", {
      detail: event.detail,
    });
    window.dispatchEvent(syncEvent);
  });

  // Listen for offline ready events
  window.addEventListener("offline-ready", () => {
    console.log("App is ready for offline use");

    // You could show a toast notification here
    // toast.success('App is ready for offline use!');
  });

  // Listen for network status changes
  window.addEventListener("online", () => {
    console.log("Connection restored");

    // Optionally show notification or trigger sync
    const onlineEvent = new CustomEvent("network-online");
    window.dispatchEvent(onlineEvent);
  });

  window.addEventListener("offline", () => {
    console.log("Connection lost - entering offline mode");

    // Optionally show notification
    const offlineEvent = new CustomEvent("network-offline");
    window.dispatchEvent(offlineEvent);
  });
}

/**
 * Check if the app is running as a PWA
 */
export function isPWA(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Show install prompt for PWA
 */
export function showInstallPrompt(): Promise<boolean> {
  return new Promise(resolve => {
    let deferredPrompt: any;

    window.addEventListener("beforeinstallprompt", e => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
    });

    if (deferredPrompt) {
      // Show the prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the A2HS prompt");
          resolve(true);
        } else {
          console.log("User dismissed the A2HS prompt");
          resolve(false);
        }
        deferredPrompt = null;
      });
    } else {
      console.log("Install prompt not available");
      resolve(false);
    }
  });
}
