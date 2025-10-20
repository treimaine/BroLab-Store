/**
 * Optimistic Updates Provider
 *
 * Provides optimistic updates context and integrates with the dashboard
 * real-time synchronization system for seamless user experience.
 */

import { useEventBus } from "@/hooks/useEventBus";
import {
  OptimisticUpdateManager,
  getOptimisticUpdateManager,
} from "@/services/OptimisticUpdateManager";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { DashboardEvent, SyncError } from "@shared/types";
import type { OptimisticUpdate } from "@shared/types/sync";
import React, { createContext, useContext, useEffect, useRef } from "react";

export interface OptimisticUpdatesContextValue {
  manager: OptimisticUpdateManager | null;
  isReady: boolean;
}

const OptimisticUpdatesContext = createContext<OptimisticUpdatesContextValue>({
  manager: null,
  isReady: false,
});

export interface OptimisticUpdatesProviderProps {
  children: React.ReactNode;
  /** Configuration for the optimistic update manager */
  config?: {
    maxPendingUpdates?: number;
    confirmationTimeout?: number;
    autoRetry?: boolean;
    maxRetries?: number;
  };
}

/**
 * Provider component for optimistic updates functionality
 */
export const OptimisticUpdatesProvider: React.FC<OptimisticUpdatesProviderProps> = ({
  children,
  config = {},
}) => {
  const managerRef = useRef<OptimisticUpdateManager | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  // Dashboard store actions
  const {
    applyOptimisticUpdate: storeApplyUpdate,
    confirmOptimisticUpdate: storeConfirmUpdate,
    rollbackOptimisticUpdate: storeRollbackUpdate,
  } = useDashboardStore();

  // Event bus for communication
  const { subscribe, publishTyped } = useEventBus();

  // Initialize optimistic update manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = getOptimisticUpdateManager(config);
      setIsReady(true);
    }

    return () => {
      // Cleanup is handled by the singleton manager
    };
  }, [config]);

  // Integrate with dashboard store
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const handleOptimisticApplied = (update: OptimisticUpdate) => {
      // The store will handle the actual data update
      storeApplyUpdate(update);
    };

    const handleOptimisticConfirmed = (update: OptimisticUpdate) => {
      storeConfirmUpdate(update.id);
    };

    const handleOptimisticRollback = ({
      update,
      reason,
      error,
    }: {
      update: OptimisticUpdate;
      reason: string;
      error?: SyncError;
    }) => {
      storeRollbackUpdate(update.id);
    };

    const handleDashboardEvent = (event: DashboardEvent) => {
      // Forward dashboard events to the event bus
      publishTyped(event.type as any, event.payload, event.source);
    };

    // Subscribe to manager events
    manager.on("optimistic_applied", handleOptimisticApplied);
    manager.on("optimistic_confirmed", handleOptimisticConfirmed);
    manager.on("optimistic_rollback", handleOptimisticRollback);
    manager.on("dashboard_event", handleDashboardEvent);

    return () => {
      manager.off("optimistic_applied", handleOptimisticApplied);
      manager.off("optimistic_confirmed", handleOptimisticConfirmed);
      manager.off("optimistic_rollback", handleOptimisticRollback);
      manager.off("dashboard_event", handleDashboardEvent);
    };
  }, [storeApplyUpdate, storeConfirmUpdate, storeRollbackUpdate, publishTyped]);

  // Listen for server confirmations via event bus
  useEffect(() => {
    const unsubscribeUserAction = subscribe("user.action", event => {
      const manager = managerRef.current;
      if (!manager) return;

      const { action, data } = event.payload as any;

      // Handle server responses to user actions
      if (data.updateId) {
        if (data.success !== false) {
          // Assume success if not explicitly failed
          manager.confirmOptimisticUpdate(data.updateId, data.serverData);
        } else {
          // Handle failure
          manager.rollbackOptimisticUpdate(
            data.updateId,
            data.error?.message || "Server operation failed",
            data.error
          );
        }
      }
    });

    const unsubscribeDataUpdated = subscribe("data.updated", event => {
      const manager = managerRef.current;
      if (!manager) return;

      // Handle real-time data updates from server
      const { section, data } = event.payload as any;

      // Check if this update confirms any pending optimistic updates
      const queueStatus = manager.getQueueStatus();
      queueStatus.pending.forEach(update => {
        if (update.section === section) {
          // Check if the server data matches our optimistic update
          const updateData = update.data as { id?: string | number };
          if (data.id && updateData?.id === data.id) {
            manager.confirmOptimisticUpdate(update.id, data);
          }
        }
      });
    });

    const unsubscribeError = subscribe("error.sync", event => {
      const manager = managerRef.current;
      if (!manager) return;

      // Type guard for error payload
      const payload = event.payload as {
        error?: { message?: string };
        context?: { updateId?: string };
      };
      const error = payload.error || {};
      const context = payload.context || {};

      // If error is related to a specific update, rollback
      if (context.updateId) {
        manager.rollbackOptimisticUpdate(context.updateId, error.message || "Sync error occurred");
      }
    });

    return () => {
      unsubscribeUserAction();
      unsubscribeDataUpdated();
      unsubscribeError();
    };
  }, [subscribe]);

  const contextValue: OptimisticUpdatesContextValue = {
    manager: managerRef.current,
    isReady,
  };

  return (
    <OptimisticUpdatesContext.Provider value={contextValue}>
      {children}
    </OptimisticUpdatesContext.Provider>
  );
};

/**
 * Hook to access the optimistic updates context
 */
export const useOptimisticUpdatesContext = (): OptimisticUpdatesContextValue => {
  const context = useContext(OptimisticUpdatesContext);
  if (!context) {
    throw new Error("useOptimisticUpdatesContext must be used within OptimisticUpdatesProvider");
  }
  return context;
};

/**
 * Hook to check if optimistic updates are ready
 */
export const useOptimisticUpdatesReady = (): boolean => {
  const { isReady } = useOptimisticUpdatesContext();
  return isReady;
};

export default OptimisticUpdatesProvider;
