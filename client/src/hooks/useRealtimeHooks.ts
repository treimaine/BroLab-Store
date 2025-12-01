/**
 * Real-time Dashboard Hooks
 *
 * Specialized hooks for real-time dashboard operations.
 * Separated from the provider component for React Fast Refresh compatibility.
 */

import {
  RealtimeContext,
  type RealtimeContextValue,
  type RealtimeEvent,
  type RealtimeEventType,
} from "@/providers/DashboardRealtimeContext";
import { useContext, useEffect } from "react";

/**
 * Hook to access the real-time context
 * @throws Error if used outside of DashboardRealtimeProvider
 */
export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtimeContext must be used within a DashboardRealtimeProvider");
  }
  return context;
}

/**
 * Hook for managing real-time connection state
 */
export function useRealtimeConnection(): {
  isConnected: boolean;
  connectionStatus: RealtimeContextValue["connectionStatus"];
  lastConnected: Date | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
} {
  const {
    isConnected,
    connectionStatus,
    lastConnected,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
  } = useRealtimeContext();

  return {
    isConnected,
    connectionStatus,
    lastConnected,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Hook for managing optimistic updates
 */
export function useOptimisticUpdates(): {
  addOptimisticUpdate: RealtimeContextValue["addOptimisticUpdate"];
  rollbackOptimisticUpdate: RealtimeContextValue["rollbackOptimisticUpdate"];
  clearOptimisticUpdates: RealtimeContextValue["clearOptimisticUpdates"];
} {
  const { addOptimisticUpdate, rollbackOptimisticUpdate, clearOptimisticUpdates } =
    useRealtimeContext();

  return {
    addOptimisticUpdate,
    rollbackOptimisticUpdate,
    clearOptimisticUpdates,
  };
}

/**
 * Hook for subscribing to real-time events
 * @param events - Array of event types to subscribe to
 * @param callback - Callback function to handle received events
 */
export function useRealtimeSubscription(
  events: RealtimeEventType[],
  callback: (event: RealtimeEvent) => void
): void {
  const { subscribe } = useRealtimeContext();

  useEffect(() => {
    return subscribe(events, callback);
  }, [subscribe, callback, events]);
}
