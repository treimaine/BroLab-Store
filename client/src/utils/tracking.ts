import { storage } from "@/services/StorageManager";

/** Tracking event data payload - supports primitive values and nested objects */
type TrackingEventData = Record<string, string | number | boolean | null | undefined>;

interface TrackingEvent {
  event: string;
  timestamp: number;
  data: TrackingEventData;
  sessionId: string;
}

// Generate a session ID for tracking
function getSessionId(): string {
  return storage.getSessionId();
}

// Main tracking function
export function track(event: string, data: TrackingEventData = {}): void {
  try {
    const trackingEvent: TrackingEvent = {
      event,
      timestamp: Date.now(),
      data,
      sessionId: getSessionId(),
    };

    // Get existing queue
    const existingQueue = storage.getTrackingQueue<TrackingEvent>();

    // Add new event
    existingQueue.push(trackingEvent);

    // Keep only last 100 events to prevent localStorage bloat
    if (existingQueue.length > 100) {
      existingQueue.splice(0, existingQueue.length - 100);
    }

    // Save back to storage
    storage.setTrackingQueue(existingQueue);

    // Console log for development only
    if (import.meta.env.DEV) {
      console.log("📊 Tracked event:", event, data);
    }
  } catch (error) {
    console.error("Tracking error:", error);
  }
}

// Specific tracking functions for common events
export const trackAddToCart = (
  productId: string,
  productName: string,
  price: number,
  licenseType?: string
) => {
  track("add_to_cart", {
    product_id: productId,
    product_name: productName,
    price,
    license_type: licenseType || "basic",
    currency: "USD",
  });
};

export const trackPlayPreview = (productId: string, productName: string, duration?: number) => {
  track("play_preview", {
    product_id: productId,
    product_name: productName,
    duration_seconds: duration || 0,
    source: "beat_card",
  });
};

export const trackSubscriptionCheckoutStarted = (
  planId: string,
  planName: string,
  billingInterval: "monthly" | "annual",
  price: number
) => {
  track("subscription_checkout_started", {
    plan_id: planId,
    plan_name: planName,
    billing_interval: billingInterval,
    price,
    currency: "USD",
  });
};

export const trackPageView = (page: string, title?: string) => {
  track("page_view", {
    page,
    title: title || document.title,
    url: globalThis.location.href,
    referrer: document.referrer,
  });
};

export const trackSearch = (query: string, resultsCount?: number) => {
  track("search", {
    query,
    results_count: resultsCount || 0,
  });
};

export const trackAudioAction = (
  action: "play" | "pause" | "seek" | "volume_change",
  productId: string,
  currentTime?: number
) => {
  track("audio_action", {
    action,
    product_id: productId,
    current_time: currentTime || 0,
  });
};

// Get tracking queue for analytics/debugging
export function getTrackingQueue(): TrackingEvent[] {
  return storage.getTrackingQueue<TrackingEvent>();
}

// Clear tracking queue (useful for testing)
export function clearTrackingQueue(): void {
  storage.removeTrackingQueue();
}

// Export tracking events for analysis
export function exportTrackingData(): string {
  const queue = getTrackingQueue();
  return JSON.stringify(queue, null, 2);
}
