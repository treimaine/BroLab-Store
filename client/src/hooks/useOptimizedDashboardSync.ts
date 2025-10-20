/**
 * Optimized Dashboard Sync Hook
 *
 * React hook that integrates OptimizedSyncManager with the dashboard store
 * to provide performance-optimized real-time synchronization.
 */

import {
  getOptimizedSyncManager,
  type OptimizedSyncMetrics,
} from "@/services/OptimizedSyncManager";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { DashboardData } from "@shared/types/dashboard";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseOptimizedDashboardSyncOptions {
  /** Enable automatic sync on mount */
  autoSync?: boolean;
  /** Sync interval (ms) */
  syncInterval?: number;
  /** Enable performance optimizations */
  enableOptimizations?: boolean;
  /** Sections to always sync */
  alwaysSyncSections?: string[];
  /** Enable debug logging */
  debug?: boolean;
}

export interface OptimizedDashboardSyncState {
  /** Sync manager instance */
  syncManager: ReturnType<typeof getOptimizedSyncManager> | null;
  /** Performance metrics */
  metrics: OptimizedSyncMetrics | null;
  /** Is syncing */
  isSyncing: boolean;
  /** Last sync time */
  lastSync: number;
  /** Sync error */
  error: Error | null;
}

/**
 * Hook for optimized dashboard synchronization
 */
export function useOptimizedDashboardSync(options: UseOptimizedDashboardSyncOptions = {}) {
  const {
    autoSync = true,
    syncInterval = 30000,
    enableOptimizations = true,
    alwaysSyncSections = ["stats", "user"],
  } = options;

  const [state, setState] = useState<OptimizedDashboardSyncState>({
    syncManager: null,
    metrics: null,
    isSyncing: false,
    lastSync: 0,
    error: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Get store actions
  const setData = useDashboardStore(storeState => storeState.setData);
  const setSyncStatus = useDashboardStore(storeState => storeState.setSyncStatus);
  const setError = useDashboardStore(storeState => storeState.setError);

  // Initialize sync manager
  useEffect(() => {
    if (!enableOptimizations) return;

    const syncManager = getOptimizedSyncManager({
      enableBatching: true,
      enableDeduplication: true,
      enableMemoryOptimization: true,
      enableSelectiveSync: true,
      enableProgressiveLoading: true,
      enableSmartCaching: true,
      alwaysSyncSections,
      syncOnlyVisible: true,
      maxBatchSize: 50,
      maxBatchWaitTime: 100,
      deduplicationWindow: 1000,
      cacheTTL: 60000,
    });

    // Set up event listeners
    syncManager.on("data_updated", (event: unknown) => {
      if (mountedRef.current) {
        const { section, data } = event as { section: string; data: DashboardData };
        if (section === "all" && data) {
          setData(data);
        }
      }
    });

    syncManager.on("status_changed", (status: unknown) => {
      if (mountedRef.current) {
        setSyncStatus(status as Parameters<typeof setSyncStatus>[0]);
      }
    });

    syncManager.on("sync_error", (event: unknown) => {
      if (mountedRef.current) {
        const { error } = event as { error: { message: string } };
        setError(error as Parameters<typeof setError>[0]);
        setState(prev => ({ ...prev, error: new Error(error.message) }));
      }
    });

    setState(prev => ({ ...prev, syncManager }));

    // Start sync if auto-sync is enabled
    if (autoSync) {
      syncManager.startSync().catch(error => {
        console.error("Failed to start sync:", error);
        if (mountedRef.current) {
          setState(prev => ({ ...prev, error }));
        }
      });
    }

    return () => {
      mountedRef.current = false;
      syncManager.stopSync();
    };
  }, [enableOptimizations, autoSync, alwaysSyncSections, setData, setSyncStatus, setError]);

  /**
   * Perform sync operation
   */
  const performSync = useCallback(async () => {
    if (!state.syncManager || state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      await state.syncManager.forceSyncAll();

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: Date.now(),
          error: null,
        }));
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: error as Error,
        }));
      }
    }
  }, [state.syncManager, state.isSyncing]);

  // Set up periodic sync
  useEffect(() => {
    if (!autoSync || !state.syncManager) return;

    syncIntervalRef.current = setInterval(() => {
      if (state.syncManager && !state.isSyncing) {
        performSync();
      }
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [autoSync, syncInterval, state.syncManager, state.isSyncing, performSync]);

  // Update metrics periodically
  useEffect(() => {
    if (!state.syncManager) return;

    const metricsInterval = setInterval(() => {
      if (state.syncManager && mountedRef.current) {
        const metrics = state.syncManager.getOptimizedMetrics();
        setState(prev => ({ ...prev, metrics }));
      }
    }, 5000);

    return () => clearInterval(metricsInterval);
  }, [state.syncManager]);

  /**
   * Force sync all data
   */
  const forceSync = async () => {
    await performSync();
  };

  /**
   * Flush pending batches
   */
  const flushBatches = async () => {
    if (state.syncManager) {
      await state.syncManager.flushBatches();
    }
  };

  /**
   * Clear all caches
   */
  const clearCaches = () => {
    if (state.syncManager) {
      state.syncManager.clearCaches();
    }
  };

  /**
   * Register section for selective sync
   */
  const registerSection = (section: string, element: Element, priority = 5) => {
    if (state.syncManager) {
      state.syncManager.registerSection(section, element, priority);
    }
  };

  /**
   * Unregister section
   */
  const unregisterSection = (section: string, element: Element) => {
    if (state.syncManager) {
      state.syncManager.unregisterSection(section, element);
    }
  };

  /**
   * Get performance metrics
   */
  const getMetrics = (): OptimizedSyncMetrics | null => {
    return state.metrics;
  };

  return {
    // State
    isSyncing: state.isSyncing,
    lastSync: state.lastSync,
    error: state.error,
    metrics: state.metrics,

    // Actions
    forceSync,
    flushBatches,
    clearCaches,
    registerSection,
    unregisterSection,
    getMetrics,
  };
}

/**
 * Hook to register a section for selective sync
 */
export function useSectionSync(section: string, priority = 5) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const { registerSection, unregisterSection } = useOptimizedDashboardSync({
    autoSync: false,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (element) {
      registerSection(section, element, priority);

      return () => {
        unregisterSection(section, element);
      };
    }
    return undefined;
  }, [section, priority, registerSection, unregisterSection]);

  return elementRef;
}

/**
 * Hook to get performance metrics
 */
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<OptimizedSyncMetrics | null>(null);

  useEffect(() => {
    const syncManager = getOptimizedSyncManager();

    const interval = setInterval(() => {
      const currentMetrics = syncManager.getOptimizedMetrics();
      setMetrics(currentMetrics);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
}
