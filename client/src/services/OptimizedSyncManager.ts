/**
 * Optimized Sync Manager
 *
 * Enhanced version of SyncManager with performance optimizations:
 * - Intelligent batching for high-frequency updates
 * - Request deduplication
 * - Memory optimization with automatic cleanup
 * - Selective sync for visible sections only
 * - Progressive data loading
 * - Smart caching with invalidation
 */

import type { DashboardData } from "@shared/types/dashboard";
import {
  BatchProcessor,
  MemoryOptimizer,
  ProgressiveLoader,
  RequestDeduplicator,
  SelectiveSyncManager,
  SmartCache,
  type BatchFlushResult,
  type BatchedUpdate,
} from "./PerformanceOptimizer";
import { SyncManager, type SyncMetrics } from "./SyncManager";

// ================================
// OPTIMIZED SYNC INTERFACES
// ================================

export interface OptimizedSyncConfig {
  // Base sync config
  websocketUrl?: string;
  pollingUrl?: string;
  pollingInterval?: number;
  maxReconnectAttempts?: number;

  // Performance optimization config
  enableBatching?: boolean;
  enableDeduplication?: boolean;
  enableMemoryOptimization?: boolean;
  enableSelectiveSync?: boolean;
  enableProgressiveLoading?: boolean;
  enableSmartCaching?: boolean;

  // Batching config
  maxBatchSize?: number;
  maxBatchWaitTime?: number;

  // Deduplication config
  deduplicationWindow?: number;

  // Memory config
  maxEventHistory?: number;
  maxCacheEntries?: number;
  memoryCleanupInterval?: number;

  // Selective sync config
  syncOnlyVisible?: boolean;
  alwaysSyncSections?: string[];

  // Progressive loading config
  initialPageSize?: number;
  maxPageSize?: number;

  // Cache config
  cacheTTL?: number;
  maxCacheSize?: number;
}

export interface OptimizedSyncMetrics extends SyncMetrics {
  // Batching metrics
  batchStats: {
    totalBatches: number;
    averageBatchSize: number;
    averageProcessingTime: number;
  };

  // Deduplication metrics
  deduplicationStats: {
    totalRequests: number;
    duplicatesFiltered: number;
    filterRate: number;
  };

  // Memory metrics
  memoryStats: {
    eventHistorySize: number;
    cacheSize: number;
    estimatedMemoryUsage: number;
    cleanupCount: number;
  };

  // Cache metrics
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
  };
}

// ================================
// OPTIMIZED SYNC MANAGER
// ================================

export class OptimizedSyncManager extends SyncManager {
  private override config: OptimizedSyncConfig;

  // Performance optimization components
  private batchProcessor: BatchProcessor<DashboardData> | null = null;
  private deduplicator: RequestDeduplicator | null = null;
  private memoryOptimizer: MemoryOptimizer | null = null;
  private selectiveSyncManager: SelectiveSyncManager | null = null;
  private progressiveLoader: ProgressiveLoader<unknown> | null = null;
  private smartCache: SmartCache<DashboardData> | null = null;

  // Optimization state
  private pendingUpdates: BatchedUpdate<DashboardData>[] = [];
  private memoryCleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: OptimizedSyncConfig = {}) {
    // Initialize base SyncManager
    super({
      websocketUrl: config.websocketUrl,
      pollingUrl: config.pollingUrl,
      pollingInterval: config.pollingInterval,
      maxReconnectAttempts: config.maxReconnectAttempts,
    });

    this.config = {
      // Default optimizations enabled
      enableBatching: config.enableBatching ?? true,
      enableDeduplication: config.enableDeduplication ?? true,
      enableMemoryOptimization: config.enableMemoryOptimization ?? true,
      enableSelectiveSync: config.enableSelectiveSync ?? true,
      enableProgressiveLoading: config.enableProgressiveLoading ?? true,
      enableSmartCaching: config.enableSmartCaching ?? true,

      // Batching defaults
      maxBatchSize: config.maxBatchSize || 50,
      maxBatchWaitTime: config.maxBatchWaitTime || 100,

      // Deduplication defaults
      deduplicationWindow: config.deduplicationWindow || 1000,

      // Memory defaults
      maxEventHistory: config.maxEventHistory || 1000,
      maxCacheEntries: config.maxCacheEntries || 500,
      memoryCleanupInterval: config.memoryCleanupInterval || 60000,

      // Selective sync defaults
      syncOnlyVisible: config.syncOnlyVisible ?? true,
      alwaysSyncSections: config.alwaysSyncSections || ["stats", "user"],

      // Progressive loading defaults
      initialPageSize: config.initialPageSize || 20,
      maxPageSize: config.maxPageSize || 100,

      // Cache defaults
      cacheTTL: config.cacheTTL || 60000,
      maxCacheSize: config.maxCacheSize || 500,

      ...config,
    };

    this.initializeOptimizations();
  }

  /**
   * Optimized data update with batching and deduplication
   */
  public async updateData(section: string, data: Partial<DashboardData>): Promise<void> {
    // Check deduplication
    if (this.deduplicator && this.config.enableDeduplication) {
      if (this.deduplicator.isDuplicate(`update:${section}`, data)) {
        return; // Skip duplicate update
      }
    }

    // Check selective sync
    if (this.selectiveSyncManager && this.config.enableSelectiveSync) {
      if (!this.selectiveSyncManager.shouldSync(section)) {
        return; // Skip non-visible section
      }
    }

    // Check cache
    if (this.smartCache && this.config.enableSmartCaching) {
      // Invalidate related cache entries
      this.smartCache.smartInvalidate(section);
    }

    // Add to batch if batching is enabled
    if (this.batchProcessor && this.config.enableBatching) {
      const priority = this.selectiveSyncManager?.getSyncPriority(section) || 5;

      this.batchProcessor.add({
        id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: `update:${section}`,
        data: data as DashboardData,
        timestamp: Date.now(),
        priority,
      });
    } else {
      // Direct update without batching
      await this.performUpdate(section, data);
    }
  }

  /**
   * Get data with caching
   */
  public async getData(section: string): Promise<DashboardData | null> {
    // Check cache first
    if (this.smartCache && this.config.enableSmartCaching) {
      const cached = this.smartCache.get(`data:${section}`);
      if (cached) {
        return cached;
      }
    }

    // Check deduplication for concurrent requests
    if (this.deduplicator && this.config.enableDeduplication) {
      if (this.deduplicator.isDuplicate(`get:${section}`)) {
        // Wait a bit and try cache again
        await new Promise(resolve => setTimeout(resolve, 50));
        if (this.smartCache) {
          const cached = this.smartCache.get(`data:${section}`);
          if (cached) return cached;
        }
      }
    }

    // Fetch data
    const data = await this.fetchData(section);

    // Cache the result
    if (this.smartCache && this.config.enableSmartCaching && data) {
      this.smartCache.set(`data:${section}`, data, this.config.cacheTTL);
    }

    return data;
  }

  /**
   * Register section for selective sync
   */
  public registerSection(section: string, element: Element, priority = 5): void {
    if (this.selectiveSyncManager && this.config.enableSelectiveSync) {
      this.selectiveSyncManager.registerSection(section, element, priority);
    }
  }

  /**
   * Unregister section
   */
  public unregisterSection(section: string, element: Element): void {
    if (this.selectiveSyncManager && this.config.enableSelectiveSync) {
      this.selectiveSyncManager.unregisterSection(section, element);
    }
  }

  /**
   * Load next page for progressive loading
   */
  public async loadNextPage<T>(
    section: string,
    loader: (offset: number, limit: number) => Promise<T[]>
  ): Promise<T[]> {
    if (!this.progressiveLoader || !this.config.enableProgressiveLoading) {
      // Fallback to loading all at once
      return loader(0, this.config.maxPageSize || 100);
    }

    return this.progressiveLoader.loadNextPage(section, loader) as Promise<T[]>;
  }

  /**
   * Initialize progressive loading for section
   */
  public initializeProgressiveLoading(section: string, totalItems: number): void {
    if (this.progressiveLoader && this.config.enableProgressiveLoading) {
      this.progressiveLoader.initializeSection(section, totalItems);
    }
  }

  /**
   * Get optimized metrics
   */
  public getOptimizedMetrics(): OptimizedSyncMetrics {
    const baseMetrics = this.getMetrics();

    return {
      ...baseMetrics,
      batchStats: this.batchProcessor?.getStats() || {
        totalBatches: 0,
        averageBatchSize: 0,
        averageProcessingTime: 0,
      },
      deduplicationStats: this.deduplicator?.getStats() || {
        totalRequests: 0,
        duplicatesFiltered: 0,
        filterRate: 0,
      },
      memoryStats: this.memoryOptimizer?.getStats() || {
        eventHistorySize: 0,
        cacheSize: 0,
        estimatedMemoryUsage: 0,
        cleanupCount: 0,
      },
      cacheStats: this.smartCache?.getStats() || {
        hits: 0,
        misses: 0,
        hitRate: 0,
        evictions: 0,
      },
    };
  }

  /**
   * Force flush pending batches
   */
  public async flushBatches(): Promise<void> {
    if (this.batchProcessor) {
      await this.batchProcessor.flush();
    }
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    if (this.smartCache) {
      this.smartCache.clear();
    }
    if (this.deduplicator) {
      this.deduplicator.clear();
    }
  }

  /**
   * Perform memory cleanup
   */
  public performMemoryCleanup(): void {
    if (!this.memoryOptimizer) return;

    // This would be called by the store to optimize its internal state
    // The actual cleanup is handled by the store using the optimizer
  }

  /**
   * Destroy and cleanup
   */
  public override destroy(): void {
    // Clear intervals
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }

    // Cleanup optimization components
    if (this.batchProcessor) {
      this.batchProcessor.clear();
    }
    if (this.deduplicator) {
      this.deduplicator.clear();
    }
    if (this.memoryOptimizer) {
      this.memoryOptimizer.destroy();
    }
    if (this.selectiveSyncManager) {
      this.selectiveSyncManager.destroy();
    }
    if (this.smartCache) {
      this.smartCache.clear();
    }

    // Call parent destroy
    super.destroy();
  }

  // Private methods

  private initializeOptimizations(): void {
    // Initialize batch processor
    if (this.config.enableBatching) {
      this.batchProcessor = new BatchProcessor(
        {
          maxBatchSize: this.config.maxBatchSize,
          maxWaitTime: this.config.maxBatchWaitTime,
          adaptive: true,
        },
        this.processBatch.bind(this)
      );
    }

    // Initialize deduplicator
    if (this.config.enableDeduplication) {
      this.deduplicator = new RequestDeduplicator({
        timeWindow: this.config.deduplicationWindow,
        useFingerprints: true,
      });
    }

    // Initialize memory optimizer
    if (this.config.enableMemoryOptimization) {
      this.memoryOptimizer = new MemoryOptimizer({
        maxEventHistory: this.config.maxEventHistory,
        maxCacheEntries: this.config.maxCacheEntries,
        cleanupInterval: this.config.memoryCleanupInterval,
      });

      // Schedule periodic cleanup
      this.memoryCleanupInterval = setInterval(() => {
        this.performMemoryCleanup();
      }, this.config.memoryCleanupInterval);
    }

    // Initialize selective sync manager
    if (this.config.enableSelectiveSync) {
      this.selectiveSyncManager = new SelectiveSyncManager({
        syncOnlyVisible: this.config.syncOnlyVisible,
        alwaysSyncSections: this.config.alwaysSyncSections,
      });
    }

    // Initialize progressive loader
    if (this.config.enableProgressiveLoading) {
      this.progressiveLoader = new ProgressiveLoader({
        initialPageSize: this.config.initialPageSize,
        maxPageSize: this.config.maxPageSize,
        infiniteScroll: true,
      });
    }

    // Initialize smart cache
    if (this.config.enableSmartCaching) {
      this.smartCache = new SmartCache({
        defaultTTL: this.config.cacheTTL,
        maxSize: this.config.maxCacheSize,
        lruEviction: true,
        smartInvalidation: true,
      });
    }
  }

  private async processBatch(items: BatchedUpdate<DashboardData>[]): Promise<BatchFlushResult> {
    const batchId = `batch_${Date.now()}`;
    const startTime = performance.now();
    const errors: Error[] = [];

    try {
      // Group updates by section
      const updatesBySection = new Map<string, Partial<DashboardData>[]>();

      for (const item of items) {
        const section = item.type.replace("update:", "");
        const existing = updatesBySection.get(section) || [];
        existing.push(item.data);
        updatesBySection.set(section, existing);
      }

      // Process each section
      for (const [section, updates] of updatesBySection.entries()) {
        try {
          // Merge updates for the same section
          const mergedUpdate = this.mergeUpdates(updates);
          await this.performUpdate(section, mergedUpdate);
        } catch (error) {
          errors.push(error as Error);
        }
      }

      const duration = performance.now() - startTime;

      return {
        batchId,
        itemsProcessed: items.length,
        duration,
        success: errors.length === 0,
        errors,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        batchId,
        itemsProcessed: 0,
        duration,
        success: false,
        errors: [error as Error],
      };
    }
  }

  private mergeUpdates(updates: Partial<DashboardData>[]): Partial<DashboardData> {
    // Merge multiple updates into one
    return updates.reduce((merged, update) => {
      return { ...merged, ...update };
    }, {});
  }

  private async performUpdate(section: string, data: Partial<DashboardData>): Promise<void> {
    // This would call the actual sync mechanism
    // For now, emit an event that the store can listen to
    this.emit("data_updated", { section, data });
  }

  private async fetchData(section: string): Promise<DashboardData | null> {
    // This would fetch data from the server
    // For now, return null and let the store handle it
    return null;
  }
}

// ================================
// SINGLETON AND UTILITIES
// ================================

let optimizedSyncManagerInstance: OptimizedSyncManager | null = null;

/**
 * Get the singleton OptimizedSyncManager instance
 */
export const getOptimizedSyncManager = (config?: OptimizedSyncConfig): OptimizedSyncManager => {
  if (!optimizedSyncManagerInstance) {
    optimizedSyncManagerInstance = new OptimizedSyncManager(config);
  }
  return optimizedSyncManagerInstance;
};

/**
 * Destroy the OptimizedSyncManager instance
 */
export const destroyOptimizedSyncManager = (): void => {
  if (optimizedSyncManagerInstance) {
    optimizedSyncManagerInstance.destroy();
    optimizedSyncManagerInstance = null;
  }
};
