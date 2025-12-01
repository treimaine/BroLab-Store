import {
  SyncError,
  SyncManager,
  SyncMetrics,
  SyncStatus,
  getSyncManager,
} from "@/services/SyncManager";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSyncManagerOptions {
  autoStart?: boolean;
  debugMode?: boolean;
  onDataUpdate?: (data: Record<string, unknown>) => void;
  onError?: (error: SyncError) => void;
  onStatusChange?: (status: SyncStatus) => void;
}

export interface UseSyncManagerReturn {
  syncManager: SyncManager;
  status: SyncStatus;
  metrics: SyncMetrics;
  isConnected: boolean;
  connectionType: "websocket" | "polling" | "offline";
  startSync: () => Promise<void>;
  stopSync: () => void;
  forceSync: () => Promise<void>;
  validateConsistency: () => Promise<boolean>;
  enableDebug: (enabled: boolean) => void;
}

/**
 * React hook for managing real-time synchronization
 * Provides access to SyncManager functionality with React state integration
 */
export const useSyncManager = (options: UseSyncManagerOptions = {}): UseSyncManagerReturn => {
  const { autoStart = true, debugMode = false, onDataUpdate, onError, onStatusChange } = options;

  const syncManagerRef = useRef<SyncManager | null>(null);
  const [status, setStatus] = useState<SyncStatus>({
    connected: false,
    connectionType: "offline",
    lastSync: 0,
    syncInProgress: false,
    errors: [],
    metrics: {
      averageLatency: 0,
      successRate: 100,
      errorCount: 0,
      reconnectCount: 0,
      dataInconsistencies: 0,
      totalSyncs: 0,
      failedSyncs: 0,
    },
  });

  // Initialize sync manager
  useEffect(() => {
    if (!syncManagerRef.current) {
      syncManagerRef.current = getSyncManager();

      if (debugMode) {
        syncManagerRef.current.enableDebugMode(true);
      }

      // Set initial status
      setStatus(syncManagerRef.current.getStatus());
    }

    return () => {
      // Don't destroy the singleton instance, just clean up listeners
      if (syncManagerRef.current) {
        syncManagerRef.current.removeAllListeners();
      }
    };
  }, [debugMode]);

  // Set up event listeners
  useEffect(() => {
    const syncManager = syncManagerRef.current;
    if (!syncManager) return;

    const handleStatusChange = (newStatus: SyncStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    };

    const handleDataUpdate = (data: Record<string, unknown>) => {
      onDataUpdate?.(data);
    };

    const handleSyncError = (error: SyncError) => {
      onError?.(error);
    };

    const handleMetricsUpdate = (metrics: SyncMetrics) => {
      setStatus(prev => ({ ...prev, metrics }));
    };

    // Subscribe to events
    syncManager.on("status_changed", handleStatusChange);
    syncManager.on("data_updated", handleDataUpdate);
    syncManager.on("sync_error", handleSyncError);
    syncManager.on("metrics_updated", handleMetricsUpdate);

    return () => {
      syncManager.off("status_changed", handleStatusChange);
      syncManager.off("data_updated", handleDataUpdate);
      syncManager.off("sync_error", handleSyncError);
      syncManager.off("metrics_updated", handleMetricsUpdate);
    };
  }, [onDataUpdate, onError, onStatusChange]);

  // Auto-start sync if enabled
  useEffect(() => {
    if (autoStart && syncManagerRef.current && !status.connected) {
      syncManagerRef.current.startSync().catch(console.error);
    }
  }, [autoStart, status.connected]);

  // Memoized callbacks
  const startSync = useCallback(async () => {
    if (syncManagerRef.current) {
      await syncManagerRef.current.startSync();
    }
  }, []);

  const stopSync = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.stopSync();
    }
  }, []);

  const forceSync = useCallback(async () => {
    if (syncManagerRef.current) {
      await syncManagerRef.current.forceSyncAll();
    }
  }, []);

  const validateConsistency = useCallback(async () => {
    if (syncManagerRef.current) {
      return await syncManagerRef.current.validateDataConsistency();
    }
    return false;
  }, []);

  const enableDebug = useCallback((enabled: boolean) => {
    if (syncManagerRef.current) {
      syncManagerRef.current.enableDebugMode(enabled);
    }
  }, []);

  return {
    syncManager: syncManagerRef.current!,
    status,
    metrics: status.metrics,
    isConnected: status.connected,
    connectionType: status.connectionType,
    startSync,
    stopSync,
    forceSync,
    validateConsistency,
    enableDebug,
  };
};

/**
 * Hook for subscribing to specific sync events
 */
export const useSyncEvents = (
  eventType: string,
  handler: (data: Record<string, unknown>) => void,
  deps: React.DependencyList = []
) => {
  const syncManager = getSyncManager();

  useEffect(() => {
    syncManager.on(eventType, handler);

    return () => {
      syncManager.off(eventType, handler);
    };
  }, [syncManager, eventType, ...deps]);
};

/**
 * Hook for monitoring sync metrics
 */
export const useSyncMetrics = () => {
  const [metrics, setMetrics] = useState<SyncMetrics>({
    averageLatency: 0,
    successRate: 100,
    errorCount: 0,
    reconnectCount: 0,
    dataInconsistencies: 0,
    totalSyncs: 0,
    failedSyncs: 0,
  });

  useEffect(() => {
    const syncManager = getSyncManager();

    const updateMetrics = (newMetrics: SyncMetrics) => {
      setMetrics(newMetrics);
    };

    syncManager.on("metrics_updated", updateMetrics);

    // Get initial metrics
    setMetrics(syncManager.getMetrics());

    return () => {
      syncManager.off("metrics_updated", updateMetrics);
    };
  }, []);

  return metrics;
};
