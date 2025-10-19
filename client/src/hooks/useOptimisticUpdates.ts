/**
 * React Hook for Optimistic Updates
 *
 * Provides easy-to-use interface for applying optimistic updates in React components
 * with automatic rollback, retry functionality, and user feedback.
 */

import { useEventBus } from "@/hooks/useEventBus";
import {
  OptimisticUpdateManager,
  UpdateQueue,
  UserFeedback,
  getOptimisticUpdateManager,
} from "@/services/OptimisticUpdateManager";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { DashboardData } from "@shared/types";
import type { OptimisticUpdate, SyncError } from "@shared/types/sync";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseOptimisticUpdatesOptions {
  /** Whether to auto-retry failed updates */
  autoRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Whether to show user feedback notifications */
  showFeedback?: boolean;
  /** Custom feedback handler */
  onFeedback?: (feedback: UserFeedback) => void;
}

export interface UseOptimisticUpdatesReturn {
  /** Apply an optimistic update */
  applyUpdate: <T>(
    section: keyof DashboardData,
    operation: "add" | "update" | "delete",
    data: T,
    rollbackData?: T
  ) => Promise<OptimisticUpdate>;

  /** Confirm an optimistic update */
  confirmUpdate: (updateId: string, serverData?: any) => void;

  /** Rollback an optimistic update */
  rollbackUpdate: (updateId: string, reason: string, error?: SyncError) => void;

  /** Retry a failed update */
  retryUpdate: (updateId: string) => Promise<OptimisticUpdate | null>;

  /** Current queue status */
  queueStatus: UpdateQueue & { totalPending: number; canAddMore: boolean };

  /** Whether any updates are pending */
  hasPendingUpdates: boolean;

  /** Current user feedback */
  feedback: UserFeedback | null;

  /** Dismiss current feedback */
  dismissFeedback: () => void;

  /** Clear all updates */
  clearAll: () => void;
}

/**
 * Hook for managing optimistic updates with automatic integration to dashboard store
 */
export const useOptimisticUpdates = (
  options: UseOptimisticUpdatesOptions = {}
): UseOptimisticUpdatesReturn => {
  const { autoRetry = true, maxRetries = 3, showFeedback = true, onFeedback } = options;

  const managerRef = useRef<OptimisticUpdateManager | null>(null);
  const [queueStatus, setQueueStatus] = useState<
    UpdateQueue & { totalPending: number; canAddMore: boolean }
  >({
    pending: [],
    processing: [],
    failed: [],
    confirmed: [],
    totalPending: 0,
    canAddMore: true,
  });
  const [feedback, setFeedback] = useState<UserFeedback | null>(null);

  // Dashboard store actions
  const {
    applyOptimisticUpdate: storeApplyUpdate,
    confirmOptimisticUpdate: storeConfirmUpdate,
    rollbackOptimisticUpdate: storeRollbackUpdate,
  } = useDashboardStore();

  // Event bus for communication
  const { subscribe } = useEventBus();

  // Initialize manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = getOptimisticUpdateManager({
        autoRetry,
        maxRetries,
      });

      // Update queue status periodically
      const updateStatus = () => {
        if (managerRef.current) {
          setQueueStatus(managerRef.current.getQueueStatus());
        }
      };

      updateStatus();
      const interval = setInterval(updateStatus, 1000);

      return () => {
        clearInterval(interval);
      };
    }
    return undefined;
  }, [autoRetry, maxRetries]);

  // Subscribe to manager events
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const handleOptimisticApplied = (update: OptimisticUpdate) => {
      // Apply to dashboard store
      storeApplyUpdate(update);
      setQueueStatus(manager.getQueueStatus());
    };

    const handleOptimisticConfirmed = (update: OptimisticUpdate) => {
      // Confirm in dashboard store
      storeConfirmUpdate(update.id);
      setQueueStatus(manager.getQueueStatus());
    };

    const handleOptimisticRollback = ({
      update,
      reason,
    }: {
      update: OptimisticUpdate;
      reason: string;
    }) => {
      // Rollback in dashboard store
      storeRollbackUpdate(update.id);
      setQueueStatus(manager.getQueueStatus());
    };

    const handleUserFeedback = (userFeedback: UserFeedback) => {
      if (showFeedback) {
        setFeedback(userFeedback);

        // Auto-dismiss after timeout
        if (userFeedback.timeout) {
          setTimeout(() => {
            setFeedback(current => (current?.updateId === userFeedback.updateId ? null : current));
          }, userFeedback.timeout);
        }
      }

      // Call custom feedback handler
      if (onFeedback) {
        onFeedback(userFeedback);
      }
    };

    const handleFeedbackDismissed = (updateId: string) => {
      setFeedback(current => (current?.updateId === updateId ? null : current));
    };

    // Add event listeners
    manager.on("optimistic_applied", handleOptimisticApplied);
    manager.on("optimistic_confirmed", handleOptimisticConfirmed);
    manager.on("optimistic_rollback", handleOptimisticRollback);
    manager.on("user_feedback", handleUserFeedback);
    manager.on("feedback_dismissed", handleFeedbackDismissed);

    return () => {
      manager.off("optimistic_applied", handleOptimisticApplied);
      manager.off("optimistic_confirmed", handleOptimisticConfirmed);
      manager.off("optimistic_rollback", handleOptimisticRollback);
      manager.off("user_feedback", handleUserFeedback);
      manager.off("feedback_dismissed", handleFeedbackDismissed);
    };
  }, [storeApplyUpdate, storeConfirmUpdate, storeRollbackUpdate, showFeedback, onFeedback]);

  // Apply optimistic update
  const applyUpdate = useCallback(
    async <T>(
      section: keyof DashboardData,
      operation: "add" | "update" | "delete",
      data: T,
      rollbackData?: T
    ): Promise<OptimisticUpdate> => {
      const manager = managerRef.current;
      if (!manager) {
        throw new Error("OptimisticUpdateManager not initialized");
      }

      try {
        const update = manager.applyOptimisticUpdate(section, operation, data, rollbackData);

        return update;
      } catch (error) {
        throw new Error(
          `Failed to apply optimistic update: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
    []
  );

  // Confirm update
  const confirmUpdate = useCallback((updateId: string, serverData?: any) => {
    const manager = managerRef.current;
    if (manager) {
      manager.confirmOptimisticUpdate(updateId, serverData);
    }
  }, []);

  // Rollback update
  const rollbackUpdate = useCallback((updateId: string, reason: string, error?: SyncError) => {
    const manager = managerRef.current;
    if (manager) {
      manager.rollbackOptimisticUpdate(updateId, reason, error);
    }
  }, []);

  // Retry update
  const retryUpdate = useCallback(async (updateId: string): Promise<OptimisticUpdate | null> => {
    const manager = managerRef.current;
    if (!manager) {
      return null;
    }

    return manager.retryOptimisticUpdate(updateId);
  }, []);

  // Dismiss feedback
  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  // Clear all updates
  const clearAll = useCallback(() => {
    const manager = managerRef.current;
    if (manager) {
      manager.clearAllUpdates();
      setQueueStatus(manager.getQueueStatus());
    }
  }, []);

  return {
    applyUpdate,
    confirmUpdate,
    rollbackUpdate,
    retryUpdate,
    queueStatus,
    hasPendingUpdates: queueStatus.totalPending > 0,
    feedback,
    dismissFeedback,
    clearAll,
  };
};

/**
 * Hook for optimistic favorites management
 */
export const useOptimisticFavorites = () => {
  const { applyUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdates();
  const { publishTyped } = useEventBus();

  const addFavorite = useCallback(
    async (beatId: number, beatData: any) => {
      const favoriteData = {
        id: `temp_${Date.now()}`,
        beatId,
        beatTitle: beatData.title || "Unknown Beat",
        beatArtist: beatData.artist,
        beatImageUrl: beatData.imageUrl,
        beatGenre: beatData.genre,
        beatBpm: beatData.bpm,
        beatPrice: beatData.price,
        createdAt: new Date().toISOString(),
      };

      try {
        const update = await applyUpdate("favorites", "add", favoriteData);

        // Simulate server call
        publishTyped("user.action", {
          action: "add_favorite",
          data: { beatId, updateId: update.id },
        });

        return update;
      } catch (error) {
        throw error;
      }
    },
    [applyUpdate, publishTyped]
  );

  const removeFavorite = useCallback(
    async (favoriteId: string, favoriteData: any) => {
      try {
        const update = await applyUpdate("favorites", "delete", { id: favoriteId }, favoriteData);

        // Simulate server call
        publishTyped("user.action", {
          action: "remove_favorite",
          data: { favoriteId, updateId: update.id },
        });

        return update;
      } catch (error) {
        throw error;
      }
    },
    [applyUpdate, publishTyped]
  );

  return {
    addFavorite,
    removeFavorite,
    confirmUpdate,
    rollbackUpdate,
  };
};

/**
 * Hook for optimistic downloads management
 */
export const useOptimisticDownloads = () => {
  const { applyUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdates();
  const { publishTyped } = useEventBus();

  const addDownload = useCallback(
    async (beatId: number, licenseType: string, beatData: any) => {
      const downloadData = {
        id: `temp_${Date.now()}`,
        beatId,
        beatTitle: beatData.title || "Unknown Beat",
        beatArtist: beatData.artist,
        beatImageUrl: beatData.imageUrl,
        fileSize: beatData.fileSize,
        format: "mp3" as const,
        quality: "high",
        licenseType,
        downloadedAt: new Date().toISOString(),
        downloadCount: 1,
        maxDownloads: licenseType === "exclusive" ? -1 : 3,
      };

      try {
        const update = await applyUpdate("downloads", "add", downloadData);

        // Simulate server call
        publishTyped("user.action", {
          action: "add_download",
          data: { beatId, licenseType, updateId: update.id },
        });

        return update;
      } catch (error) {
        throw error;
      }
    },
    [applyUpdate, publishTyped]
  );

  return {
    addDownload,
    confirmUpdate,
    rollbackUpdate,
  };
};

/**
 * Hook for optimistic orders management
 */
export const useOptimisticOrders = () => {
  const { applyUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdates();
  const { publishTyped } = useEventBus();

  const createOrder = useCallback(
    async (orderData: any) => {
      const order = {
        id: `temp_${Date.now()}`,
        orderNumber: `ORD-${Date.now()}`,
        items: orderData.items || [],
        total: orderData.total || 0,
        currency: "USD",
        status: "pending" as const,
        paymentMethod: orderData.paymentMethod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const update = await applyUpdate("orders", "add", order);

        // Simulate server call
        publishTyped("user.action", {
          action: "create_order",
          data: { order, updateId: update.id },
        });

        return update;
      } catch (error) {
        throw error;
      }
    },
    [applyUpdate, publishTyped]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: string, currentOrder: any) => {
      const updatedOrder = {
        ...currentOrder,
        status,
        updatedAt: new Date().toISOString(),
      };

      try {
        const update = await applyUpdate("orders", "update", updatedOrder, currentOrder);

        // Simulate server call
        publishTyped("user.action", {
          action: "update_order_status",
          data: { orderId, status, updateId: update.id },
        });

        return update;
      } catch (error) {
        throw error;
      }
    },
    [applyUpdate, publishTyped]
  );

  return {
    createOrder,
    updateOrderStatus,
    confirmUpdate,
    rollbackUpdate,
  };
};
