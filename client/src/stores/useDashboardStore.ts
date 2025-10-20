/**
 * Unified Dashboard Data Store
 *
 * Centralized Zustand store for all dashboard data with consistent state management,
 * real-time synchronization, optimistic updates, and data consistency validation.
 *
 * This store replaces multiple separate hooks and provides a single source of truth
 * for all dashboard data across all sections.
 */

import { CrossTabSyncManager } from "@/services/CrossTabSyncManager";
import type { DashboardData } from "@shared/types/dashboard";
import type {
  ConsistentUserStats,
  CrossValidationResult,
  DashboardEvent,
  Inconsistency,
  MemoryStats,
  OptimisticUpdate,
  SyncError,
  SyncStatus,
  ValidationResult,
} from "@shared/types/sync";
import {
  generateDataHash,
  validateDashboardData,
  validateOptimisticUpdate,
  validateSyncStatus,
} from "@shared/validation/sync";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ================================
// STORE STATE INTERFACE
// ================================

interface DashboardStoreState {
  // Core dashboard data
  data: DashboardData | null;

  // Sync status and metadata
  syncStatus: SyncStatus;
  lastUpdated: Record<string, number>;
  dataVersion: number;

  // Optimistic updates
  pendingUpdates: OptimisticUpdate[];

  // Validation and consistency
  lastValidation: ValidationResult | null;
  inconsistencies: Inconsistency[];

  // Memory management
  memoryStats: MemoryStats;

  // Event subscriptions
  eventSubscriptions: Map<string, Set<(event: DashboardEvent) => void>>;
  eventHistory: DashboardEvent[];

  // Cross-tab synchronization
  crossTabSync: CrossTabSyncManager | null;

  // Loading and error states
  isLoading: boolean;
  error: SyncError | null;
}

// ================================
// STORE ACTIONS INTERFACE
// ================================

interface DashboardStoreActions {
  // Data management
  setData: (data: DashboardData) => void;
  updateSection: (
    section: keyof DashboardData,
    data: Partial<DashboardData[keyof DashboardData]>
  ) => void;
  mergeData: (partialData: Partial<DashboardData>) => void;

  // Sync status management
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  updateSyncMetrics: (metrics: Partial<SyncStatus["metrics"]>) => void;
  addSyncError: (error: SyncError) => void;
  clearSyncErrors: () => void;

  // Optimistic updates
  applyOptimisticUpdate: (update: OptimisticUpdate) => void;
  confirmOptimisticUpdate: (updateId: string) => void;
  rollbackOptimisticUpdate: (updateId: string) => void;
  clearPendingUpdates: () => void;

  // Data validation and consistency
  validateData: () => ValidationResult;
  validateCrossSection: () => CrossValidationResult;
  detectInconsistencies: () => Inconsistency[];
  resolveInconsistency: (inconsistencyId: string) => void;

  // Event system
  subscribe: (eventType: string, handler: (event: DashboardEvent) => void) => () => void;
  publish: (event: DashboardEvent) => void;
  clearEventHistory: () => void;

  // Cross-tab synchronization
  initializeCrossTabSync: (userId: string) => void;
  destroyCrossTabSync: () => void;
  getCrossTabInfo: () => { activeTabs: number; currentTabFocused: boolean };

  // Utility actions
  forceSync: () => Promise<void>;
  reset: () => void;
  cleanup: () => void;
  getMemoryUsage: () => MemoryStats;

  // Loading and error management
  setLoading: (loading: boolean) => void;
  setError: (error: SyncError | null) => void;
  clearError: () => void;
}

// ================================
// INITIAL STATE
// ================================

const initialSyncStatus: SyncStatus = {
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
  },
};

const initialMemoryStats: MemoryStats = {
  cacheSize: 0,
  eventHistorySize: 0,
  subscriptionCount: 0,
  pendingUpdatesCount: 0,
  totalMemoryUsage: 0,
  measuredAt: Date.now(),
};

const initialState: DashboardStoreState = {
  data: null,
  syncStatus: initialSyncStatus,
  lastUpdated: {},
  dataVersion: 1,
  pendingUpdates: [],
  lastValidation: null,
  inconsistencies: [],
  memoryStats: initialMemoryStats,
  eventSubscriptions: new Map(),
  eventHistory: [],
  crossTabSync: null,
  isLoading: false,
  error: null,
};

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Apply add operation for optimistic update
 */
function applyAddOperation(
  updatedData: DashboardData,
  section: keyof DashboardData,
  data: unknown
): void {
  if (Array.isArray(updatedData[section])) {
    const sectionArray = updatedData[section] as unknown[];
    (updatedData[section] as unknown[]) = [...sectionArray, data];
  }
}

/**
 * Apply update operation for optimistic update
 */
function applyUpdateOperation(
  updatedData: DashboardData,
  section: keyof DashboardData,
  updateData: { id?: string | number; [key: string]: unknown }
): void {
  if (Array.isArray(updatedData[section])) {
    const items = updatedData[section] as Array<{ id?: string | number }>;
    const index = items.findIndex(item => item.id === updateData?.id);
    if (index !== -1 && updateData) {
      items[index] = { ...items[index], ...updateData };
    }
  } else if (
    typeof updatedData[section] === "object" &&
    updateData &&
    !Array.isArray(updatedData[section])
  ) {
    const currentSection = updatedData[section];
    Object.assign(currentSection, updateData);
  }
}

/**
 * Apply delete operation for optimistic update
 */
function applyDeleteOperation(
  updatedData: DashboardData,
  section: keyof DashboardData,
  deleteData: { id?: string | number }
): void {
  if (Array.isArray(updatedData[section]) && deleteData?.id) {
    const sectionArray = updatedData[section] as Array<{ id?: string | number }>;
    (updatedData[section] as Array<{ id?: string | number }>) = sectionArray.filter(
      item => item.id !== deleteData.id
    );
  }
}

/**
 * Check if section needs stats recalculation
 */
function needsStatsRecalculation(section: keyof DashboardData): boolean {
  return section === "favorites" || section === "downloads" || section === "orders";
}

/**
 * Rollback add operation
 */
function rollbackAddOperation(
  updatedData: DashboardData,
  section: keyof DashboardData,
  addData: { id?: string | number }
): void {
  if (Array.isArray(updatedData[section]) && addData?.id) {
    const sectionArray = updatedData[section] as Array<{ id?: string | number }>;
    (updatedData[section] as Array<{ id?: string | number }>) = sectionArray.filter(
      item => item.id !== addData.id
    );
  }
}

/**
 * Rollback update operation
 */
function rollbackUpdateOperation(
  updatedData: DashboardData,
  section: keyof DashboardData,
  rollbackData: { id?: string | number; [key: string]: unknown }
): void {
  if (Array.isArray(updatedData[section])) {
    const items = updatedData[section] as Array<{ id?: string | number }>;
    const index = items.findIndex(item => item.id === rollbackData.id);
    if (index !== -1) {
      items[index] = rollbackData;
    }
  } else if (typeof updatedData[section] === "object" && !Array.isArray(updatedData[section])) {
    const currentSection = updatedData[section];
    Object.assign(currentSection, rollbackData);
  }
}

/**
 * Rollback delete operation
 */
function rollbackDeleteOperation(
  updatedData: DashboardData,
  section: keyof DashboardData,
  rollbackData: unknown
): void {
  if (rollbackData && Array.isArray(updatedData[section])) {
    const sectionArray = updatedData[section] as unknown[];
    (updatedData[section] as unknown[]) = [...sectionArray, rollbackData];
  }
}

/**
 * Generate consistent user stats with validation metadata
 */
function generateConsistentStats(data: DashboardData): ConsistentUserStats {
  const stats = data.stats;
  const now = new Date().toISOString();

  const consistentStats: ConsistentUserStats = {
    ...stats,
    calculatedAt: now,
    dataHash: generateDataHash(stats),
    source: "database",
    version: 1,
  };

  return consistentStats;
}

/**
 * Detect inconsistencies between dashboard sections
 */
function detectDataInconsistencies(data: DashboardData): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];
  const now = Date.now();

  // Check if stats match actual data counts (only if we have reasonable data)
  const actualFavorites = data.favorites.length;
  const actualDownloads = data.downloads.length;
  const actualOrders = data.orders.length;

  // Only validate if we have some data and stats show less than what we have
  if (actualFavorites > 0 && data.stats.totalFavorites < actualFavorites) {
    inconsistencies.push({
      type: "calculation",
      sections: ["stats", "favorites"],
      description: `Favorites count mismatch: stats shows ${data.stats.totalFavorites}, but favorites array has ${actualFavorites} items`,
      severity: "medium",
      autoResolvable: true,
      detectedAt: now,
      expectedValue: actualFavorites,
      actualValue: data.stats.totalFavorites,
    });
  }

  if (actualDownloads > 0 && data.stats.totalDownloads < actualDownloads) {
    inconsistencies.push({
      type: "calculation",
      sections: ["stats", "downloads"],
      description: `Downloads count mismatch: stats shows ${data.stats.totalDownloads}, but downloads array has ${actualDownloads} items`,
      severity: "medium",
      autoResolvable: true,
      detectedAt: now,
      expectedValue: actualDownloads,
      actualValue: data.stats.totalDownloads,
    });
  }

  if (actualOrders > 0 && data.stats.totalOrders < actualOrders) {
    inconsistencies.push({
      type: "calculation",
      sections: ["stats", "orders"],
      description: `Orders count mismatch: stats shows ${data.stats.totalOrders}, but orders array has ${actualOrders} items`,
      severity: "medium",
      autoResolvable: true,
      detectedAt: now,
      expectedValue: actualOrders,
      actualValue: data.stats.totalOrders,
    });
  }

  return inconsistencies;
}

/**
 * Update memory statistics
 */
function updateMemoryStats(state: DashboardStoreState): MemoryStats {
  const dataSize = state.data ? JSON.stringify(state.data).length * 2 : 0; // Rough byte estimate
  const eventHistorySize = state.eventHistory.reduce(
    (size, event) => size + JSON.stringify(event).length * 2,
    0
  );
  const subscriptionCount = Array.from(state.eventSubscriptions.values()).reduce(
    (count, handlers) => count + handlers.size,
    0
  );

  return {
    cacheSize: dataSize,
    eventHistorySize,
    subscriptionCount,
    pendingUpdatesCount: state.pendingUpdates.length,
    totalMemoryUsage: dataSize + eventHistorySize,
    measuredAt: Date.now(),
  };
}

// ================================
// ZUSTAND STORE
// ================================

export const useDashboardStore = create<DashboardStoreState & DashboardStoreActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ================================
    // DATA MANAGEMENT ACTIONS
    // ================================

    setData: (data: DashboardData) => {
      const now = Date.now();
      const validation = validateDashboardData(data);
      const inconsistencies = detectDataInconsistencies(data);

      set(state => ({
        data: {
          ...data,
          stats: generateConsistentStats(data),
        },
        lastUpdated: {
          ...state.lastUpdated,
          all: now,
        },
        dataVersion: state.dataVersion + 1,
        lastValidation: validation,
        inconsistencies,
        memoryStats: updateMemoryStats({
          ...state,
          data: {
            ...data,
            stats: generateConsistentStats(data),
          },
        }),
        isLoading: false,
        error: null,
      }));

      // Publish data update event
      get().publish({
        type: "data.updated",
        payload: { section: "all", data },
        timestamp: now,
        source: "system",
        id: `data-update-${now}`,
      });

      // Broadcast to other tabs
      const crossTabSync = get().crossTabSync;
      if (crossTabSync) {
        crossTabSync.broadcastDataUpdate("all", data);
      }
    },

    updateSection: (section, sectionData) => {
      const state = get();
      if (!state.data) return;

      const now = Date.now();
      const updatedData = {
        ...state.data,
        [section]: sectionData,
      };

      // Recalculate stats if needed
      if (section === "favorites" || section === "downloads" || section === "orders") {
        updatedData.stats = generateConsistentStats(updatedData);
      }

      const validation = validateDashboardData(updatedData);
      const inconsistencies = detectDataInconsistencies(updatedData);

      set(prevState => ({
        data: updatedData,
        lastUpdated: {
          ...prevState.lastUpdated,
          [section as string]: now,
        },
        dataVersion: prevState.dataVersion + 1,
        lastValidation: validation,
        inconsistencies,
        memoryStats: updateMemoryStats({
          ...prevState,
          data: updatedData,
        }),
      }));

      // Publish section update event
      get().publish({
        type: "data.updated",
        payload: { section: section as string, data: sectionData },
        timestamp: now,
        source: "system",
        id: `section-update-${section}-${now}`,
      });

      // Broadcast to other tabs
      const crossTabSync = get().crossTabSync;
      if (crossTabSync) {
        crossTabSync.broadcastDataUpdate(section as string, { [section]: sectionData });
      }
    },

    mergeData: partialData => {
      const state = get();
      if (!state.data) return;

      const now = Date.now();
      const mergedData = {
        ...state.data,
        ...partialData,
      };

      // Recalculate stats
      mergedData.stats = generateConsistentStats(mergedData);

      const validation = validateDashboardData(mergedData);
      const inconsistencies = detectDataInconsistencies(mergedData);

      set(prevState => ({
        data: mergedData,
        lastUpdated: {
          ...prevState.lastUpdated,
          ...Object.keys(partialData).reduce(
            (acc, key) => ({
              ...acc,
              [key]: now,
            }),
            {}
          ),
        },
        dataVersion: prevState.dataVersion + 1,
        lastValidation: validation,
        inconsistencies,
        memoryStats: updateMemoryStats({
          ...prevState,
          data: mergedData,
        }),
      }));

      // Publish merge event
      get().publish({
        type: "data.updated",
        payload: { section: "multiple", data: partialData },
        timestamp: now,
        source: "system",
        id: `data-merge-${now}`,
      });
    },

    // ================================
    // SYNC STATUS MANAGEMENT
    // ================================

    setSyncStatus: status => {
      const validation = validateSyncStatus({ ...get().syncStatus, ...status });

      set(state => ({
        syncStatus: {
          ...state.syncStatus,
          ...status,
        },
        lastValidation: validation.valid ? state.lastValidation : validation,
      }));

      // Publish sync status event
      get().publish({
        type: "connection.status",
        payload: { status: get().syncStatus },
        timestamp: Date.now(),
        source: "system",
        id: `sync-status-${Date.now()}`,
      });
    },

    updateSyncMetrics: metrics => {
      set(state => ({
        syncStatus: {
          ...state.syncStatus,
          metrics: {
            ...state.syncStatus.metrics,
            ...metrics,
          },
        },
      }));
    },

    addSyncError: error => {
      set(state => ({
        syncStatus: {
          ...state.syncStatus,
          errors: [...state.syncStatus.errors, error],
          metrics: {
            ...state.syncStatus.metrics,
            errorCount: state.syncStatus.metrics.errorCount + 1,
          },
        },
        error,
      }));

      // Publish error event
      get().publish({
        type: "error.sync",
        payload: { error, context: {} },
        timestamp: Date.now(),
        source: "system",
        id: `sync-error-${Date.now()}`,
        priority: "high",
      });
    },

    clearSyncErrors: () => {
      set(state => ({
        syncStatus: {
          ...state.syncStatus,
          errors: [],
        },
        error: null,
      }));
    },

    // ================================
    // OPTIMISTIC UPDATES
    // ================================

    applyOptimisticUpdate: update => {
      const validation = validateOptimisticUpdate(update);
      if (!validation.valid) {
        console.error("Invalid optimistic update:", validation.errors);
        return;
      }

      const state = get();
      if (!state.data) return;

      // Apply the optimistic update to the data immediately
      const updatedData = { ...state.data };
      const section = update.section as keyof DashboardData;

      try {
        // Apply the appropriate operation based on update type
        switch (update.type) {
          case "add": {
            applyAddOperation(updatedData, section, update.data);
            break;
          }

          case "update": {
            const updateData = update.data as { id?: string | number; [key: string]: unknown };
            applyUpdateOperation(updatedData, section, updateData);
            break;
          }

          case "delete": {
            const deleteData = update.data as { id?: string | number };
            applyDeleteOperation(updatedData, section, deleteData);
            break;
          }
        }

        // Recalculate stats if needed
        if (needsStatsRecalculation(section)) {
          updatedData.stats = generateConsistentStats(updatedData);
        }

        set(prevState => ({
          data: updatedData,
          pendingUpdates: [...prevState.pendingUpdates, update],
          dataVersion: prevState.dataVersion + 1,
          lastUpdated: {
            ...prevState.lastUpdated,
            [section]: Date.now(),
          },
          memoryStats: updateMemoryStats({
            ...prevState,
            data: updatedData,
            pendingUpdates: [...prevState.pendingUpdates, update],
          }),
        }));

        // Publish optimistic update event
        get().publish({
          type: "optimistic.applied",
          payload: { update },
          timestamp: Date.now(),
          source: "user",
          id: `optimistic-${update.id}`,
        });

        // Broadcast to other tabs
        const crossTabSync = get().crossTabSync;
        if (crossTabSync) {
          crossTabSync.broadcastOptimisticUpdate(update);
        }
      } catch (error) {
        console.error("Error applying optimistic update:", error);
        // Don't add to pending updates if application failed
      }
    },

    confirmOptimisticUpdate: updateId => {
      set(state => ({
        pendingUpdates: state.pendingUpdates.map(update =>
          update.id === updateId ? { ...update, confirmed: true } : update
        ),
      }));
    },

    rollbackOptimisticUpdate: updateId => {
      const state = get();
      const update = state.pendingUpdates.find(u => u.id === updateId);

      if (update && state.data) {
        const updatedData = { ...state.data };
        const section = update.section as keyof DashboardData;

        try {
          // Reverse the optimistic update based on type
          switch (update.type) {
            case "add": {
              const addData = update.data as { id?: string | number };
              rollbackAddOperation(updatedData, section, addData);
              break;
            }

            case "update": {
              const rollbackData = update.rollbackData as {
                id?: string | number;
                [key: string]: unknown;
              };
              if (rollbackData) {
                rollbackUpdateOperation(updatedData, section, rollbackData);
              }
              break;
            }

            case "delete": {
              rollbackDeleteOperation(updatedData, section, update.rollbackData);
              break;
            }
          }

          // Recalculate stats if needed
          if (needsStatsRecalculation(section)) {
            updatedData.stats = generateConsistentStats(updatedData);
          }

          set(prevState => ({
            data: updatedData,
            pendingUpdates: prevState.pendingUpdates.filter(u => u.id !== updateId),
            dataVersion: prevState.dataVersion + 1,
            lastUpdated: {
              ...prevState.lastUpdated,
              [section]: Date.now(),
            },
            memoryStats: updateMemoryStats({
              ...prevState,
              data: updatedData,
              pendingUpdates: prevState.pendingUpdates.filter(u => u.id !== updateId),
            }),
          }));

          // Publish rollback event
          get().publish({
            type: "optimistic.rollback",
            payload: { updateId, reason: "Server operation failed" },
            timestamp: Date.now(),
            source: "system",
            id: `rollback-${updateId}`,
            priority: "high",
          });

          // Broadcast rollback to other tabs
          const crossTabSync = get().crossTabSync;
          if (crossTabSync) {
            crossTabSync.broadcastOptimisticRollback(updateId, "Server operation failed");
          }
        } catch (error) {
          console.error("Error rolling back optimistic update:", error);
        }
      } else {
        // Just remove from pending updates if no rollback data
        set(prevState => ({
          pendingUpdates: prevState.pendingUpdates.filter(u => u.id !== updateId),
        }));
      }
    },

    clearPendingUpdates: () => {
      set({ pendingUpdates: [] });
    },

    // ================================
    // VALIDATION AND CONSISTENCY
    // ================================

    validateData: () => {
      const state = get();
      if (!state.data) {
        return {
          valid: false,
          errors: [{ field: "data", message: "No data to validate", code: "no_data" }],
          warnings: [],
          dataHash: "",
          validatedAt: Date.now(),
        };
      }

      const validation = validateDashboardData(state.data);

      set({ lastValidation: validation });

      return validation;
    },

    validateCrossSection: () => {
      const state = get();
      if (!state.data) {
        return {
          consistent: false,
          inconsistencies: [],
          affectedSections: [],
          recommendedAction: "reload" as const,
        };
      }

      const inconsistencies = detectDataInconsistencies(state.data);
      const affectedSections = Array.from(new Set(inconsistencies.flatMap(inc => inc.sections)));

      const result: CrossValidationResult = {
        consistent: inconsistencies.length === 0,
        inconsistencies,
        affectedSections,
        recommendedAction: inconsistencies.length > 0 ? "sync" : "ignore",
      };

      set({ inconsistencies });

      return result;
    },

    detectInconsistencies: () => {
      const state = get();
      if (!state.data) return [];

      const inconsistencies = detectDataInconsistencies(state.data);
      set({ inconsistencies });

      if (inconsistencies.length > 0) {
        get().publish({
          type: "data.inconsistency",
          payload: { sections: [], details: inconsistencies[0] },
          timestamp: Date.now(),
          source: "system",
          id: `inconsistency-${Date.now()}`,
          priority: "high",
        });
      }

      return inconsistencies;
    },

    resolveInconsistency: inconsistencyId => {
      set(state => ({
        inconsistencies: state.inconsistencies.filter(
          inc => inc.detectedAt.toString() !== inconsistencyId
        ),
      }));
    },

    // ================================
    // EVENT SYSTEM
    // ================================

    subscribe: (eventType, handler) => {
      const state = get();
      const subscriptions = state.eventSubscriptions;

      if (!subscriptions.has(eventType)) {
        subscriptions.set(eventType, new Set());
      }

      subscriptions.get(eventType)!.add(handler);

      set(prevState => ({
        eventSubscriptions: new Map(subscriptions),
        memoryStats: updateMemoryStats({
          ...prevState,
          eventSubscriptions: new Map(subscriptions),
        }),
      }));

      // Return unsubscribe function
      return () => {
        const currentState = get();
        const currentSubscriptions = currentState.eventSubscriptions;
        const handlers = currentSubscriptions.get(eventType);

        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            currentSubscriptions.delete(eventType);
          }
        }

        set(prevState => ({
          eventSubscriptions: new Map(currentSubscriptions),
          memoryStats: updateMemoryStats({
            ...prevState,
            eventSubscriptions: new Map(currentSubscriptions),
          }),
        }));
      };
    },

    publish: event => {
      const state = get();
      const handlers = state.eventSubscriptions.get(event.type);

      // Add to event history
      const newHistory = [...state.eventHistory, event].slice(-100); // Keep last 100 events

      set(prevState => ({
        eventHistory: newHistory,
        memoryStats: updateMemoryStats({
          ...prevState,
          eventHistory: newHistory,
        }),
      }));

      // Notify subscribers
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(event);
          } catch (error) {
            console.error("Error in event handler:", error);
          }
        }
      }
    },

    clearEventHistory: () => {
      set({ eventHistory: [] });
    },

    // ================================
    // CROSS-TAB SYNCHRONIZATION
    // ================================

    initializeCrossTabSync: (userId: string) => {
      const state = get();

      // Don't initialize if already exists
      if (state.crossTabSync) {
        return;
      }

      const crossTabSync = new CrossTabSyncManager(
        {
          debug: process.env.NODE_ENV === "development",
        },
        userId
      );

      // Set up event listeners for cross-tab communication
      crossTabSync.on("data_update", (event: unknown) => {
        const eventData = event as {
          section: string;
          data: DashboardData | Partial<DashboardData>;
        };
        const { section, data } = eventData;
        if (section === "all" && "user" in data && "stats" in data) {
          get().setData(data as DashboardData);
        } else if (section !== "all") {
          get().updateSection(
            section as keyof DashboardData,
            data as Partial<DashboardData[keyof DashboardData]>
          );
        }
      });

      crossTabSync.on("optimistic_update", (event: unknown) => {
        const eventData = event as { update: OptimisticUpdate };
        const { update } = eventData;
        get().applyOptimisticUpdate(update);
      });

      crossTabSync.on("optimistic_rollback", (event: unknown) => {
        const eventData = event as { updateId: string };
        get().rollbackOptimisticUpdate(eventData.updateId);
      });

      crossTabSync.on("sync_request", () => {
        get().forceSync();
      });

      crossTabSync.on("focus", () => {
        // Trigger sync when tab becomes focused
        get().forceSync();
      });

      crossTabSync.on("conflict_detected", (conflict: unknown) => {
        console.warn("Cross-tab conflict detected:", conflict);
        // Auto-resolve by accepting the latest change
        const conflictData = conflict as { id?: string };
        setTimeout(() => {
          const id = conflictData?.id;
          if (id) {
            crossTabSync.resolveConflict(id, "accept");
          }
        }, 1000);
      });

      set({ crossTabSync });
    },

    destroyCrossTabSync: () => {
      const state = get();
      if (state.crossTabSync) {
        state.crossTabSync.destroy();
        set({ crossTabSync: null });
      }
    },

    getCrossTabInfo: () => {
      const state = get();
      if (!state.crossTabSync) {
        return { activeTabs: 1, currentTabFocused: true };
      }

      return {
        activeTabs: state.crossTabSync.getActiveTabs().length,
        currentTabFocused: state.crossTabSync.isFocusedTab(),
      };
    },

    // ================================
    // UTILITY ACTIONS
    // ================================

    forceSync: async () => {
      set({ isLoading: true });

      get().publish({
        type: "sync.forced",
        payload: { trigger: "user" },
        timestamp: Date.now(),
        source: "user",
        id: `force-sync-${Date.now()}`,
      });

      // This would trigger actual sync logic in a real implementation
      // For now, just simulate sync completion
      setTimeout(() => {
        set({ isLoading: false });
      }, 1000);
    },

    reset: () => {
      set(initialState);
    },

    cleanup: () => {
      const state = get();

      // Clear old events (keep last 50)
      const recentEvents = state.eventHistory.slice(-50);

      // Clear confirmed optimistic updates
      const pendingUpdates = state.pendingUpdates.filter(update => !update.confirmed);

      set(prevState => ({
        eventHistory: recentEvents,
        pendingUpdates,
        memoryStats: updateMemoryStats({
          ...prevState,
          eventHistory: recentEvents,
          pendingUpdates,
        }),
      }));
    },

    getMemoryUsage: () => {
      const state = get();
      return updateMemoryStats(state);
    },

    // ================================
    // LOADING AND ERROR MANAGEMENT
    // ================================

    setLoading: loading => {
      set({ isLoading: loading });
    },

    setError: error => {
      set({ error });

      if (error) {
        get().addSyncError(error);
      }
    },

    clearError: () => {
      set({ error: null });
      get().clearSyncErrors();
    },
  }))
);

// ================================
// SELECTOR HOOKS
// ================================

/**
 * Hook to get dashboard data with automatic updates
 */
export const useDashboardData = () => {
  return useDashboardStore(state => state.data);
};

/**
 * Hook to get specific dashboard section
 */
export const useDashboardSection = <K extends keyof DashboardData>(section: K) => {
  return useDashboardStore(state => state.data?.[section]);
};

/**
 * Hook to get sync status
 */
export const useSyncStatus = () => {
  return useDashboardStore(state => state.syncStatus);
};

/**
 * Hook to get loading state
 */
export const useDashboardLoading = () => {
  return useDashboardStore(state => state.isLoading);
};

/**
 * Hook to get error state
 */
export const useDashboardError = () => {
  return useDashboardStore(state => state.error);
};

/**
 * Hook to get data inconsistencies
 */
export const useDataInconsistencies = () => {
  return useDashboardStore(state => state.inconsistencies);
};

/**
 * Hook to get memory usage statistics
 */
export const useMemoryStats = () => {
  return useDashboardStore(state => state.memoryStats);
};

/**
 * Hook to get cross-tab synchronization information
 */
export const useCrossTabInfo = () => {
  return useDashboardStore(state => {
    if (!state.crossTabSync) {
      return { activeTabs: 1, currentTabFocused: true };
    }

    return {
      activeTabs: state.crossTabSync.getActiveTabs().length,
      currentTabFocused: state.crossTabSync.isFocusedTab(),
    };
  });
};
/**
 * Hook to get pending optimistic updates (for testing)
 */
export const usePendingUpdates = () => {
  return useDashboardStore(state => state.pendingUpdates);
};
