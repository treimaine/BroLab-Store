/**
 * React hook for offline functionality
 * Integrates OfflineManager with useNetworkStatus
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { OfflineOperation, OptimisticUpdate } from "../../../shared/types/system-optimization";
import { OfflineManagerImpl } from "../../../shared/utils/offline-manager";
import { OptimisticUpdateManagerImpl } from "../../../shared/utils/optimistic-update-manager";
import { syncManager } from "../../../shared/utils/system-manager";
import { useNetworkStatus } from "./useNetworkStatus";

interface OfflineManagerHook {
  // Offline status
  isOnline: boolean;
  isOfflineMode: boolean;

  // Queue management
  queueOperation: (
    operation: Omit<OfflineOperation, "id" | "timestamp" | "retryCount" | "status">
  ) => Promise<string>;
  getPendingOperations: () => Promise<OfflineOperation[]>;
  getOperationStats: () => Promise<{
    total: number;
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
  }>;

  // Optimistic updates
  applyOptimisticUpdate: <T>(
    update: Omit<OptimisticUpdate<T>, "id" | "timestamp" | "confirmed">
  ) => string;
  confirmUpdate: (updateId: string) => void;
  rollbackUpdate: (updateId: string) => void;
  getPendingUpdates: () => OptimisticUpdate[];

  // Convenience methods for common operations
  addToCartOffline: (productId: string, quantity?: number) => Promise<string>;
  removeFromCartOffline: (productId: string, quantity?: number) => Promise<string>;
  toggleFavoriteOffline: (productId: string, isFavorite: boolean) => Promise<string>;
  startDownloadOffline: (productId: string, downloadType: string) => Promise<string>;

  // Sync control
  syncNow: () => Promise<void>;
  clearCompleted: () => Promise<void>;
}

export function useOfflineManager(): OfflineManagerHook {
  const networkStatus = useNetworkStatus();
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);

  // Managers (using refs to maintain instances across re-renders)
  const offlineManagerRef = useRef<OfflineManagerImpl | null>(null);
  const optimisticManagerRef = useRef<OptimisticUpdateManagerImpl | null>(null);

  // Initialize managers
  useEffect(() => {
    if (!offlineManagerRef.current) {
      offlineManagerRef.current = new OfflineManagerImpl(syncManager);
    }

    if (!optimisticManagerRef.current) {
      optimisticManagerRef.current = new OptimisticUpdateManagerImpl();
    }

    const offlineManager = offlineManagerRef.current;
    const optimisticManager = optimisticManagerRef.current;

    // Set up offline/online callbacks
    const handleOffline = () => {
      setIsOfflineMode(true);
      console.log("Entered offline mode");
    };

    const handleOnline = () => {
      setIsOfflineMode(false);
      console.log("Exited offline mode - syncing pending operations");

      // Sync pending operations when coming back online
      offlineManager.syncPendingOperations().catch(error => {
        console.error("Failed to sync pending operations:", error);
      });
    };

    offlineManager.onOffline(handleOffline);
    offlineManager.onOnline(handleOnline);

    // Set up optimistic update callbacks for common operations
    optimisticManager.onUpdate("cart_add", update => {
      console.log("Optimistic cart add:", update);
      // Update local cart state immediately
    });

    optimisticManager.onUpdate("cart_remove", update => {
      console.log("Optimistic cart remove:", update);
      // Update local cart state immediately
    });

    optimisticManager.onUpdate("favorite_toggle", update => {
      console.log("Optimistic favorite toggle:", update);
      // Update local favorites state immediately
    });

    optimisticManager.onRollback("cart_add", update => {
      console.log("Rolling back cart add:", update);
      // Revert local cart state
    });

    optimisticManager.onRollback("cart_remove", update => {
      console.log("Rolling back cart remove:", update);
      // Revert local cart state
    });

    optimisticManager.onRollback("favorite_toggle", update => {
      console.log("Rolling back favorite toggle:", update);
      // Revert local favorites state
    });

    // Cleanup function
    return () => {
      if (offlineManagerRef.current) {
        offlineManagerRef.current.destroy();
      }
    };
  }, []);

  // Update offline mode based on network status
  useEffect(() => {
    if (!networkStatus.isOnline && !isOfflineMode) {
      setIsOfflineMode(true);
    } else if (networkStatus.isOnline && isOfflineMode) {
      setIsOfflineMode(false);
    }
  }, [networkStatus.isOnline, isOfflineMode]);

  // Periodically update pending operations and updates
  useEffect(() => {
    const updatePendingData = async () => {
      if (offlineManagerRef.current && optimisticManagerRef.current) {
        try {
          const [operations, updates] = await Promise.all([
            offlineManagerRef.current.getPendingOperations(),
            Promise.resolve(optimisticManagerRef.current.getPendingUpdates()),
          ]);

          setPendingOperations(operations);
          setPendingUpdates(updates);
        } catch (error) {
          console.error("Failed to update pending data:", error);
        }
      }
    };

    // Initial update
    updatePendingData();

    // Update every 5 seconds
    const interval = setInterval(updatePendingData, 5000);

    return () => clearInterval(interval);
  }, []);

  // Queue an offline operation
  const queueOperation = useCallback(
    async (
      operation: Omit<OfflineOperation, "id" | "timestamp" | "retryCount" | "status">
    ): Promise<string> => {
      if (!offlineManagerRef.current) {
        throw new Error("OfflineManager not initialized");
      }

      return offlineManagerRef.current.queueOperation(operation);
    },
    []
  );

  // Get pending operations
  const getPendingOperations = useCallback(async (): Promise<OfflineOperation[]> => {
    if (!offlineManagerRef.current) {
      return [];
    }

    return offlineManagerRef.current.getPendingOperations();
  }, []);

  // Get operation statistics
  const getOperationStats = useCallback(async () => {
    if (!offlineManagerRef.current) {
      return { total: 0, pending: 0, syncing: 0, completed: 0, failed: 0 };
    }

    return offlineManagerRef.current.getOperationStats();
  }, []);

  // Apply optimistic update
  const applyOptimisticUpdate = useCallback(
    <T>(update: Omit<OptimisticUpdate<T>, "id" | "timestamp" | "confirmed">): string => {
      if (!optimisticManagerRef.current) {
        throw new Error("OptimisticUpdateManager not initialized");
      }

      return optimisticManagerRef.current.applyOptimisticUpdate(update);
    },
    []
  );

  // Confirm optimistic update
  const confirmUpdate = useCallback((updateId: string): void => {
    if (optimisticManagerRef.current) {
      optimisticManagerRef.current.confirmUpdate(updateId);
    }
  }, []);

  // Rollback optimistic update
  const rollbackUpdate = useCallback((updateId: string): void => {
    if (optimisticManagerRef.current) {
      optimisticManagerRef.current.rollbackUpdate(updateId);
    }
  }, []);

  // Get pending updates
  const getPendingUpdates = useCallback((): OptimisticUpdate[] => {
    if (!optimisticManagerRef.current) {
      return [];
    }

    return optimisticManagerRef.current.getPendingUpdates();
  }, []);

  // Convenience method: Add to cart offline
  const addToCartOffline = useCallback(
    async (productId: string, quantity: number = 1): Promise<string> => {
      if (!optimisticManagerRef.current || !offlineManagerRef.current) {
        throw new Error("Managers not initialized");
      }

      // Apply optimistic update first
      const updateId = optimisticManagerRef.current.addToCartOptimistic(productId, quantity);

      // Queue the actual operation
      const operationId = await offlineManagerRef.current.queueOperation({
        type: "cart_add",
        data: { productId, quantity, updateId },
      });

      return operationId;
    },
    []
  );

  // Convenience method: Remove from cart offline
  const removeFromCartOffline = useCallback(
    async (productId: string, quantity: number = 1): Promise<string> => {
      if (!optimisticManagerRef.current || !offlineManagerRef.current) {
        throw new Error("Managers not initialized");
      }

      // Apply optimistic update first
      const updateId = optimisticManagerRef.current.removeFromCartOptimistic(productId, quantity);

      // Queue the actual operation
      const operationId = await offlineManagerRef.current.queueOperation({
        type: "cart_remove",
        data: { productId, quantity, updateId },
      });

      return operationId;
    },
    []
  );

  // Convenience method: Toggle favorite offline
  const toggleFavoriteOffline = useCallback(
    async (productId: string, isFavorite: boolean): Promise<string> => {
      if (!optimisticManagerRef.current || !offlineManagerRef.current) {
        throw new Error("Managers not initialized");
      }

      // Apply optimistic update first
      const updateId = optimisticManagerRef.current.toggleFavoriteOptimistic(productId, isFavorite);

      // Queue the actual operation
      const operationId = await offlineManagerRef.current.queueOperation({
        type: "favorite_toggle",
        data: { productId, isFavorite, updateId },
      });

      return operationId;
    },
    []
  );

  // Convenience method: Start download offline
  const startDownloadOffline = useCallback(
    async (productId: string, downloadType: string): Promise<string> => {
      if (!optimisticManagerRef.current || !offlineManagerRef.current) {
        throw new Error("Managers not initialized");
      }

      // Apply optimistic update first
      const updateId = optimisticManagerRef.current.startDownloadOptimistic(
        productId,
        downloadType
      );

      // Queue the actual operation
      const operationId = await offlineManagerRef.current.queueOperation({
        type: "download_start",
        data: { productId, downloadType, updateId },
      });

      return operationId;
    },
    []
  );

  // Sync now
  const syncNow = useCallback(async (): Promise<void> => {
    if (offlineManagerRef.current) {
      await offlineManagerRef.current.syncPendingOperations();
    }
  }, []);

  // Clear completed operations
  const clearCompleted = useCallback(async (): Promise<void> => {
    if (offlineManagerRef.current) {
      await offlineManagerRef.current.clearCompletedOperations();
    }

    if (optimisticManagerRef.current) {
      optimisticManagerRef.current.clearConfirmedUpdates();
    }
  }, []);

  return {
    // Status
    isOnline: networkStatus.isOnline,
    isOfflineMode,

    // Queue management
    queueOperation,
    getPendingOperations,
    getOperationStats,

    // Optimistic updates
    applyOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    getPendingUpdates,

    // Convenience methods
    addToCartOffline,
    removeFromCartOffline,
    toggleFavoriteOffline,
    startDownloadOffline,

    // Sync control
    syncNow,
    clearCompleted,
  };
}
