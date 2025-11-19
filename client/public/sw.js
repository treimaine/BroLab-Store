/**
 * Service Worker for Offline Functionality and Asset Caching
 * Provides offline support for critical app functionality
 */

const CACHE_NAME = "brolab-v1";
const OFFLINE_CACHE = "brolab-offline-v1";
const RUNTIME_CACHE = "brolab-runtime-v1";

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  // Add critical CSS and JS files
  "/assets/index.css",
  "/assets/index.js",
  // Add offline fallback pages
  "/offline.html",
];

// API endpoints that should be cached
const CACHEABLE_APIS = [
  "/api/beats",
  "/api/user/profile",
  "/api/user/favorites",
  "/api/categories",
];

// Install event - cache static assets
self.addEventListener("install", event => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Create offline cache
      caches.open(OFFLINE_CACHE).then(cache => {
        return cache.add("/offline.html");
      }),
    ]).then(() => {
      // Force activation of new service worker
      return globalThis.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== OFFLINE_CACHE &&
              cacheName !== RUNTIME_CACHE
            ) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      globalThis.clients.claim(),
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith("/api/")) {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    // Static assets - cache first
    event.respondWith(handleStaticAsset(request));
  } else {
    // HTML pages - network first with offline fallback
    event.respondWith(handlePageRequest(request));
  }
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses for cacheable APIs
    if (networkResponse.ok && CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (networkError) {
    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for critical APIs
    if (
      url.pathname.startsWith("/api/user/") ||
      url.pathname.startsWith("/api/beats") ||
      url.pathname.startsWith("/api/favorites")
    ) {
      return new Response(
        JSON.stringify({
          error: "offline",
          message: "This data is not available offline",
          cached: false,
        }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    throw networkError;
  }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (staticError) {
    throw staticError;
  }
}

/**
 * Handle page requests with network-first and offline fallback
 */
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful HTML responses
    if (networkResponse.ok && networkResponse.headers.get("content-type")?.includes("text/html")) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (pageError) {
    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      const offlineResponse = await caches.match("/offline.html");
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    throw pageError;
  }
}

// Handle background sync for offline operations
self.addEventListener("sync", event => {
  if (event.tag === "offline-sync") {
    event.waitUntil(syncOfflineOperations());
  }
});

/**
 * Sync offline operations when connection is restored
 */
async function syncOfflineOperations() {
  try {
    // Get offline operations from IndexedDB or localStorage
    const operations = await getOfflineOperations();

    for (const operation of operations) {
      try {
        await syncOperation(operation);
        await markOperationSynced(operation.id);
      } catch (syncError) {
        // Retry failed operation
        await incrementRetryCount(operation.id);
        throw syncError;
      }
    }

    // Sync completed successfully
  } catch (syncError) {
    // Background sync failed - will retry on next sync event
    throw syncError;
  }
}

/**
 * Get offline operations (placeholder - would integrate with OfflineManager)
 */
async function getOfflineOperations() {
  // This would integrate with the OfflineManager's storage
  // For now, return empty array
  return [];
}

/**
 * Sync a single operation
 */
async function syncOperation(operation) {
  const response = await fetch(operation.endpoint, {
    method: operation.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...operation.headers,
    },
    body: JSON.stringify(operation.data),
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Mark operation as synced
 */
async function markOperationSynced(operationId) {
  // This would update the OfflineManager's storage
}

/**
 * Increment retry count for failed operation
 */
async function incrementRetryCount(operationId) {
  // This would update the OfflineManager's storage
}

// Handle push notifications (for future use)
self.addEventListener("push", event => {
  if (event.data) {
    const data = event.data.json();

    event.waitUntil(
      globalThis.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || "/favicon.ico",
        badge: "/favicon.ico",
        data: data.data,
      })
    );
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", event => {
  event.notification.close();

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === globalThis.location.origin && "focus" in client) {
          return client.focus();
        }
      }

      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});

// Message handling for communication with main thread
self.addEventListener("message", event => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        globalThis.skipWaiting();
        break;
      case "CACHE_URLS":
        cacheUrls(event.data.urls);
        break;
      case "CLEAR_CACHE":
        clearCache(event.data.cacheName);
        break;
    }
  }
});

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.addAll(urls);
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
  await caches.delete(cacheName || CACHE_NAME);
}
