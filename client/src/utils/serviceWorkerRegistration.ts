/**
 * Service Worker Registration Utility
 * Handles registration, updates, and communication with the service worker
 */

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
}

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

/**
 * Register the service worker
 */
export function register(config?: ServiceWorkerConfig): void {
  if ("serviceWorker" in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL || "", window.location.href);

    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      return;
    }

    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        // This is running on localhost. Let's check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            "This web app is being served cache-first by a service " +
              "worker. To learn more, visit https://cra.link/PWA"
          );
        });
      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

/**
 * Register a valid service worker
 */
function registerValidSW(swUrl: string, config?: ServiceWorkerConfig): void {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      console.log("Service Worker registered successfully:", registration);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log(
                "New content is available and will be used when all " +
                  "tabs for this page are closed. See https://cra.link/PWA."
              );

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log("Content is cached for offline use.");

              // Execute callback
              if (config && config.onOfflineReady) {
                config.onOfflineReady();
              }
            }
          }
        };
      };

      // Execute success callback
      if (config && config.onSuccess) {
        config.onSuccess(registration);
      }

      // Set up background sync
      setupBackgroundSync(registration);

      // Set up message handling
      setupMessageHandling();
    })
    .catch(error => {
      console.error("Error during service worker registration:", error);
    });
}

/**
 * Check if service worker is valid
 */
function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig): void {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { "Service-Worker": "script" },
  })
    .then(response => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get("content-type");
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf("javascript") === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log("No internet connection found. App is running in offline mode.");
    });
}

/**
 * Unregister the service worker
 */
export function unregister(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

/**
 * Set up background sync for offline operations
 */
function setupBackgroundSync(registration: ServiceWorkerRegistration): void {
  if ("sync" in window.ServiceWorkerRegistration.prototype) {
    // Register for background sync
    (registration as any).sync
      ?.register("offline-sync")
      .then(() => {
        console.log("Background sync registered");
      })
      .catch((error: any) => {
        console.error("Background sync registration failed:", error);
      });
  }
}

/**
 * Set up message handling with service worker
 */
function setupMessageHandling(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", event => {
      console.log("Message from service worker:", event.data);

      // Handle different message types
      if (event.data && event.data.type) {
        switch (event.data.type) {
          case "CACHE_UPDATED":
            console.log("Cache updated:", event.data.cacheName);
            break;
          case "OFFLINE_READY":
            console.log("App is ready for offline use");
            break;
          case "SYNC_COMPLETED":
            console.log("Background sync completed");
            // Notify the app that sync is complete
            window.dispatchEvent(
              new CustomEvent("sw-sync-complete", {
                detail: event.data,
              })
            );
            break;
          default:
            console.log("Unknown message from service worker:", event.data);
        }
      }
    });
  }
}

/**
 * Send message to service worker
 */
export function sendMessageToSW(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
      reject(new Error("Service worker not available"));
      return;
    }

    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = event => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Cache specific URLs through service worker
 */
export async function cacheUrls(urls: string[]): Promise<void> {
  try {
    await sendMessageToSW({
      type: "CACHE_URLS",
      urls,
    });
    console.log("URLs cached successfully");
  } catch (error) {
    console.error("Failed to cache URLs:", error);
  }
}

/**
 * Clear cache through service worker
 */
export async function clearCache(cacheName?: string): Promise<void> {
  try {
    await sendMessageToSW({
      type: "CLEAR_CACHE",
      cacheName,
    });
    console.log("Cache cleared successfully");
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
}

/**
 * Skip waiting for new service worker
 */
export async function skipWaiting(): Promise<void> {
  try {
    await sendMessageToSW({
      type: "SKIP_WAITING",
    });
    console.log("Service worker skip waiting triggered");
  } catch (error) {
    console.error("Failed to skip waiting:", error);
  }
}

/**
 * Check if app is running in standalone mode (PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  return "serviceWorker" in navigator;
}

/**
 * Get service worker registration
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration || null;
  } catch (error) {
    console.error("Failed to get service worker registration:", error);
    return null;
  }
}

/**
 * Update service worker
 */
export async function updateServiceWorker(): Promise<void> {
  const registration = await getRegistration();

  if (registration) {
    try {
      await registration.update();
      console.log("Service worker update triggered");
    } catch (error) {
      console.error("Failed to update service worker:", error);
    }
  }
}
