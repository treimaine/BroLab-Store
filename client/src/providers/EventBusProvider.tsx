import { EventBus, getEventBus } from "@/services/EventBus";
import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";

interface EventBusContextValue {
  eventBus: EventBus;
  isReady: boolean;
}

const EventBusContext = createContext<EventBusContextValue | null>(null);

interface EventBusProviderProps {
  children: React.ReactNode;
  enableLogging?: boolean;
  enableDebugMode?: boolean;
}

/**
 * EventBus Provider component that initializes and manages the EventBus system
 * for the entire application
 */
export const EventBusProvider: React.FC<EventBusProviderProps> = ({
  children,
  enableLogging = false,
  enableDebugMode = false,
}) => {
  const eventBusRef = useRef<EventBus | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    // Initialize EventBus
    eventBusRef.current ??= getEventBus();

    if (enableLogging) {
      eventBusRef.current.enableLogging(true);
    }

    if (enableDebugMode) {
      eventBusRef.current.enableDebugMode(true);
    }

    // Mark as ready
    setIsReady(true);

    // Publish initial system events
    if (eventBusRef.current) {
      eventBusRef.current.publishTyped(
        "ui.update",
        {
          component: "EventBusProvider",
          state: { initialized: true, logging: enableLogging, debug: enableDebugMode },
        },
        "system"
      );
    }

    return () => {
      // Don't destroy singleton instances on unmount
      // They should persist for the lifetime of the application
    };
  }, [enableLogging, enableDebugMode]);

  // Handle application-level events
  useEffect(() => {
    if (!eventBusRef.current || !isReady) return;

    const eventBus = eventBusRef.current;

    // Handle critical errors
    const unsubscribeError = eventBus.subscribeTyped(
      "error.sync",
      event => {
        console.error("[EventBusProvider] Sync error:", event.payload);

        // You could add additional error handling here, such as:
        // - Showing user notifications
        // - Triggering fallback mechanisms
        // - Logging to external services
      },
      { priority: 10 } // High priority for error handling
    );

    // Handle connection status changes
    const unsubscribeConnection = eventBus.subscribeTyped("connection.status", event => {
      console.log("[EventBusProvider] Connection status:", event.payload.status);

      // You could add connection status handling here, such as:
      // - Updating UI indicators
      // - Triggering reconnection attempts
      // - Notifying users of connectivity issues
    });

    // Handle data inconsistencies
    const unsubscribeInconsistency = eventBus.subscribeTyped("data.inconsistency", event => {
      console.warn("[EventBusProvider] Data inconsistency detected:", event.payload);

      // Automatically attempt to resolve inconsistencies
      eventBus.publishTyped("sync.forced", { trigger: "system" }, "system", event.id);
    });

    return () => {
      unsubscribeError();
      unsubscribeConnection();
      unsubscribeInconsistency();
    };
  }, [isReady]);

  const contextValue: EventBusContextValue = useMemo(
    () => ({
      eventBus: eventBusRef.current!,
      isReady,
    }),
    [isReady]
  );

  return <EventBusContext.Provider value={contextValue}>{children}</EventBusContext.Provider>;
};

/**
 * Hook to access the EventBus context
 */
export const useEventBusContext = (): EventBusContextValue => {
  const context = useContext(EventBusContext);

  if (!context) {
    throw new Error("useEventBusContext must be used within an EventBusProvider");
  }

  return context;
};

/**
 * Hook to check if EventBus is ready
 */
export const useEventBusReady = (): boolean => {
  const { isReady } = useEventBusContext();
  return isReady;
};

/**
 * Higher-order component that ensures EventBus is ready before rendering
 */
export const withEventBus = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    const { isReady } = useEventBusContext();

    if (!isReady) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="text-sm text-muted-foreground">Initializing EventBus...</div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};
