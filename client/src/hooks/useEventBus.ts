import {
  DashboardEvent,
  DashboardEventTypes,
  EventBus,
  EventMetrics,
  SubscriptionOptions,
  getEventBus,
} from "@/services/EventBus";
import React, { useCallback, useEffect, useRef } from "react";

export interface UseEventBusOptions {
  enableLogging?: boolean;
  enableDebugMode?: boolean;
}

export interface UseEventBusReturn {
  eventBus: EventBus;
  publish: <T>(event: DashboardEvent<T>) => void;
  publishTyped: <K extends keyof DashboardEventTypes>(
    type: K,
    payload: DashboardEventTypes[K],
    source?: "user" | "server" | "system",
    correlationId?: string
  ) => void;
  subscribe: <T>(
    eventType: string,
    handler: (event: DashboardEvent<T>) => void,
    options?: SubscriptionOptions
  ) => () => void;
  subscribeTyped: <K extends keyof DashboardEventTypes>(
    eventType: K,
    handler: (event: DashboardEvent<DashboardEventTypes[K]>) => void,
    options?: SubscriptionOptions
  ) => () => void;
  getMetrics: () => EventMetrics;
  enableLogging: (enabled: boolean) => void;
  enableDebugMode: (enabled: boolean) => void;
}

/**
 * React hook for using the EventBus in components
 * Provides access to EventBus functionality with automatic cleanup
 */
export const useEventBus = (options: UseEventBusOptions = {}): UseEventBusReturn => {
  const { enableLogging = false, enableDebugMode = false } = options;
  const eventBusRef = useRef<EventBus | null>(null);

  // Initialize EventBus
  useEffect(() => {
    if (!eventBusRef.current) {
      eventBusRef.current = getEventBus();

      if (enableLogging) {
        eventBusRef.current.enableLogging(true);
      }

      if (enableDebugMode) {
        eventBusRef.current.enableDebugMode(true);
      }
    }
  }, [enableLogging, enableDebugMode]);

  // Memoized functions
  const publish = useCallback(<T>(event: DashboardEvent<T>) => {
    eventBusRef.current?.publish(event);
  }, []);

  const publishTyped = useCallback(
    <K extends keyof DashboardEventTypes>(
      type: K,
      payload: DashboardEventTypes[K],
      source: "user" | "server" | "system" = "system",
      correlationId?: string
    ) => {
      eventBusRef.current?.publishTyped(type, payload, source, correlationId);
    },
    []
  );

  const subscribe = useCallback(
    <T>(
      eventType: string,
      handler: (event: DashboardEvent<T>) => void,
      options?: SubscriptionOptions
    ) => {
      return eventBusRef.current?.subscribe(eventType, handler, options) ?? (() => {});
    },
    []
  );

  const subscribeTyped = useCallback(
    <K extends keyof DashboardEventTypes>(
      eventType: K,
      handler: (event: DashboardEvent<DashboardEventTypes[K]>) => void,
      options?: SubscriptionOptions
    ) => {
      return eventBusRef.current?.subscribeTyped(eventType, handler, options) ?? (() => {});
    },
    []
  );

  const getMetrics = useCallback(() => {
    return (
      eventBusRef.current?.getMetrics() ?? {
        totalEvents: 0,
        eventsPerSecond: 0,
        averageProcessingTime: 0,
        subscriberCount: 0,
        duplicatesFiltered: 0,
        errorsCount: 0,
      }
    );
  }, []);

  const enableLoggingCallback = useCallback((enabled: boolean) => {
    eventBusRef.current?.enableLogging(enabled);
  }, []);

  const enableDebugModeCallback = useCallback((enabled: boolean) => {
    eventBusRef.current?.enableDebugMode(enabled);
  }, []);

  return {
    eventBus: eventBusRef.current!,
    publish,
    publishTyped,
    subscribe,
    subscribeTyped,
    getMetrics,
    enableLogging: enableLoggingCallback,
    enableDebugMode: enableDebugModeCallback,
  };
};

/**
 * Hook for subscribing to a specific event type with automatic cleanup
 */
export const useEventSubscription = <T>(
  eventType: string,
  handler: (event: DashboardEvent<T>) => void,
  options?: SubscriptionOptions,
  _deps: React.DependencyList = []
): void => {
  const eventBus = getEventBus();

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(eventType, handler, options);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, eventType, ..._deps]);
};

/**
 * Hook for subscribing to typed events with automatic cleanup
 */
export const useTypedEventSubscription = <K extends keyof DashboardEventTypes>(
  eventType: K,
  handler: (event: DashboardEvent<DashboardEventTypes[K]>) => void,
  options?: SubscriptionOptions,
  _deps: React.DependencyList = []
): void => {
  const eventBus = getEventBus();

  useEffect(() => {
    const unsubscribe = eventBus.subscribeTyped(eventType, handler, options);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, eventType, ..._deps]);
};

/**
 * Hook for subscribing to multiple event types with a single handler
 */
export const useMultipleEventSubscription = <T>(
  eventTypes: string[],
  handler: (event: DashboardEvent<T>) => void,
  options?: SubscriptionOptions,
  _deps: React.DependencyList = []
): void => {
  const eventBus = getEventBus();

  useEffect(() => {
    const unsubscribe = eventBus.subscribeToMultiple(eventTypes, handler, options);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, eventTypes, handler, options, ..._deps]);
};

/**
 * Hook for monitoring EventBus metrics
 * FIX: Default interval increased from 1s to 5s to prevent performance issues
 * 1 second intervals were causing browser freezes due to excessive re-renders
 * FIX: Added visibility awareness to pause metrics collection when tab is hidden
 */
export const useEventBusMetrics = (updateInterval = 5000) => {
  const eventBus = getEventBus();
  const [metrics, setMetrics] = React.useState<EventMetrics>(() => eventBus.getMetrics());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startInterval = (): void => {
      if (interval) return;
      interval = setInterval(() => {
        // Only update if tab is visible
        if (!document.hidden) {
          setMetrics(eventBus.getMetrics());
        }
      }, updateInterval);
    };

    const stopInterval = (): void => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopInterval();
      } else {
        startInterval();
      }
    };

    // Start if visible
    if (!document.hidden) {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [eventBus, updateInterval]);

  return metrics;
};

/**
 * Hook for debugging events - provides event history and real-time monitoring
 * FIX: Increased update interval from 500ms to 2s to prevent performance issues
 * Fast intervals were causing browser freezes during debugging
 * FIX: Added visibility awareness to pause debugging when tab is hidden
 */
export const useEventBusDebug = () => {
  const eventBus = getEventBus();
  const [eventHistory, setEventHistory] = React.useState(() => eventBus.getEventHistory());
  const [metrics, setMetrics] = React.useState(() => eventBus.getMetrics());

  useEffect(() => {
    // Enable debug mode
    eventBus.enableDebugMode(true);

    let interval: ReturnType<typeof setInterval> | null = null;

    const startInterval = (): void => {
      if (interval) return;
      // Update history and metrics periodically - 2s is sufficient for debugging
      interval = setInterval(() => {
        if (!document.hidden) {
          setEventHistory([...eventBus.getEventHistory()]);
          setMetrics(eventBus.getMetrics());
        }
      }, 2000);
    };

    const stopInterval = (): void => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopInterval();
      } else {
        startInterval();
      }
    };

    // Start if visible
    if (!document.hidden) {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      eventBus.enableDebugMode(false);
    };
  }, [eventBus]);

  const getRecentEvents = useCallback(
    (eventType?: string, limit = 10) => {
      return eventBus.getRecentEvents(eventType, limit);
    },
    [eventBus]
  );

  const getActiveEventTypes = useCallback(() => {
    return eventBus.getActiveEventTypes();
  }, [eventBus]);

  const getSubscriberCount = useCallback(
    (eventType: string) => {
      return eventBus.getSubscribers(eventType);
    },
    [eventBus]
  );

  return {
    eventHistory,
    metrics,
    getRecentEvents,
    getActiveEventTypes,
    getSubscriberCount,
  };
};
