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
  // Base sync config (from ConnectionConfig)
  websocketUrl?: string;
  pollingUrl?: string;
  pollingInterval?: number;
  maxReconnectAttempts?: number;
  reconnectBackoffBase?: number;
  reconnectBackoffMax?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;

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
  private readonly optimizedConfig: OptimizedSyncConfig;

  // Performance optimization components
  private batchProcessor: BatchProcessor<DashboardData> | null = null;
  private deduplicator: RequestDeduplicator | null = null;
  private memoryOptimizer: MemoryOptimizer | null = null;
  private selectiveSyncManager: SelectiveSyncManager | null = null;
  private progressiveLoader: ProgressiveLoader<unknown> | null = null;
  private smartCache: SmartCache<DashboardData> | null = null;

  // Optimization state
  private readonly pendingUpdates: BatchedUpdate<DashboardData>[] = [];
  private memoryCleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: OptimizedSyncConfig = {}) {
    // Initialize base SyncManager with all required ConnectionConfig properties
    super({
      websocketUrl: config.websocketUrl || "",
      pollingUrl: config.pollingUrl || "",
      pollingInterval: config.pollingInterval || 30000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectBackoffBase: config.reconnectBackoffBase || 1000,
      reconnectBackoffMax: config.reconnectBackoffMax || 30000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      connectionTimeout: config.connectionTimeout || 10000,
    });

    this.optimizedConfig = {
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
    if (this.shouldSkipUpdate(section, data)) {
      return;
    }

    this.invalidateCacheForSection(section);

    if (this.shouldBatchUpdate()) {
      this.addToBatch(section, data);
    } else {
      await this.performUpdate(section, data);
    }
  }

  private shouldSkipUpdate(section: string, data: Partial<DashboardData>): boolean {
    // Check deduplication
    if (this.deduplicator && this.optimizedConfig.enableDeduplication) {
      if (this.deduplicator.isDuplicate(`update:${section}`, data)) {
        return true;
      }
    }

    // Check selective sync
    if (this.selectiveSyncManager && this.optimizedConfig.enableSelectiveSync) {
      if (!this.selectiveSyncManager.shouldSync(section)) {
        return true;
      }
    }

    return false;
  }

  private invalidateCacheForSection(section: string): void {
    if (this.smartCache && this.optimizedConfig.enableSmartCaching) {
      this.smartCache.smartInvalidate(section);
    }
  }

  private shouldBatchUpdate(): boolean {
    return Boolean(this.batchProcessor && this.optimizedConfig.enableBatching);
  }

  private addToBatch(section: string, data: Partial<DashboardData>): void {
    if (!this.batchProcessor) return;

    const priority = this.selectiveSyncManager?.getSyncPriority(section) || 5;

    this.batchProcessor.add({
      id: `update_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: `update:${section}`,
      data: data as DashboardData,
      timestamp: Date.now(),
      priority,
    });
  }

  /**
   * Get data with caching
   */
  public async getData(section: string): Promise<DashboardData | null> {
    const cachedData = this.getCachedData(section);
    if (cachedData) {
      return cachedData;
    }

    if (await this.shouldWaitForDuplicate(section)) {
      const retryCache = this.getCachedData(section);
      if (retryCache) return retryCache;
    }

    const data = await this.fetchData(section);
    this.cacheData(section, data);

    return data;
  }

  private getCachedData(section: string): DashboardData | null {
    if (this.smartCache && this.optimizedConfig.enableSmartCaching) {
      return this.smartCache.get(`data:${section}`) || null;
    }
    return null;
  }

  private async shouldWaitForDuplicate(section: string): Promise<boolean> {
    if (this.deduplicator && this.optimizedConfig.enableDeduplication) {
      if (this.deduplicator.isDuplicate(`get:${section}`)) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return true;
      }
    }
    return false;
  }

  private cacheData(section: string, data: DashboardData | null): void {
    if (this.smartCache && this.optimizedConfig.enableSmartCaching && data) {
      this.smartCache.set(`data:${section}`, data, this.optimizedConfig.cacheTTL);
    }
  }

  /**
   * Register section for selective sync
   */
  public registerSection(section: string, element: Element, priority = 5): void {
    if (this.selectiveSyncManager && this.optimizedConfig.enableSelectiveSync) {
      this.selectiveSyncManager.registerSection(section, element, priority);
    }
  }

  /**
   * Unregister section
   */
  public unregisterSection(section: string, element: Element): void {
    if (this.selectiveSyncManager && this.optimizedConfig.enableSelectiveSync) {
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
    if (!this.progressiveLoader || !this.optimizedConfig.enableProgressiveLoading) {
      // Fallback to loading all at once
      return loader(0, this.optimizedConfig.maxPageSize || 100);
    }

    return this.progressiveLoader.loadNextPage(section, loader) as Promise<T[]>;
  }

  /**
   * Initialize progressive loading for section
   */
  public initializeProgressiveLoading(_section: string, totalItems: number): void {
    if (this.progressiveLoader && this.optimizedConfig.enableProgressiveLoading) {
      this.progressiveLoader.initializeSection(_section, totalItems);
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
    if (this.optimizedConfig.enableBatching) {
      this.batchProcessor = new BatchProcessor(this.processBatch.bind(this), {
        maxBatchSize: this.optimizedConfig.maxBatchSize,
        maxWaitTime: this.optimizedConfig.maxBatchWaitTime,
        adaptive: true,
      });
    }

    // Initialize deduplicator
    if (this.optimizedConfig.enableDeduplication) {
      this.deduplicator = new RequestDeduplicator({
        timeWindow: this.optimizedConfig.deduplicationWindow,
        useFingerprints: true,
      });
    }

    // Initialize memory optimizer
    if (this.optimizedConfig.enableMemoryOptimization) {
      this.memoryOptimizer = new MemoryOptimizer({
        maxEventHistory: this.optimizedConfig.maxEventHistory,
        maxCacheEntries: this.optimizedConfig.maxCacheEntries,
        cleanupInterval: this.optimizedConfig.memoryCleanupInterval,
      });

      // Schedule periodic cleanup
      this.memoryCleanupInterval = setInterval(() => {
        this.performMemoryCleanup();
      }, this.optimizedConfig.memoryCleanupInterval);
    }

    // Initialize selective sync manager
    if (this.optimizedConfig.enableSelectiveSync) {
      this.selectiveSyncManager = new SelectiveSyncManager({
        syncOnlyVisible: this.optimizedConfig.syncOnlyVisible,
        alwaysSyncSections: this.optimizedConfig.alwaysSyncSections,
      });
    }

    // Initialize progressive loader
    if (this.optimizedConfig.enableProgressiveLoading) {
      this.progressiveLoader = new ProgressiveLoader({
        initialPageSize: this.optimizedConfig.initialPageSize,
        maxPageSize: this.optimizedConfig.maxPageSize,
        infiniteScroll: true,
      });
    }

    // Initialize smart cache
    if (this.optimizedConfig.enableSmartCaching) {
      this.smartCache = new SmartCache({
        defaultTTL: this.optimizedConfig.cacheTTL,
        maxSize: this.optimizedConfig.maxCacheSize,
        lruEviction: true,
        smartInvalidation: true,
      });
    }
  }

  private async processBatch(items: BatchedUpdate<DashboardData>[]): Promise<BatchFlushResult> {
    const batchId = `batch_${Date.now()}`;
    const startTime = performance.now();

    try {
      const updatesBySection = this.groupUpdatesBySection(items);
      const errors = await this.processGroupedUpdates(updatesBySection);
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

  private groupUpdatesBySection(
    items: BatchedUpdate<DashboardData>[]
  ): Map<string, Partial<DashboardData>[]> {
    const updatesBySection = new Map<string, Partial<DashboardData>[]>();

    for (const item of items) {
      const section = item.type.replace("update:", "");
      const existing = updatesBySection.get(section) || [];
      existing.push(item.data);
      updatesBySection.set(section, existing);
    }

    return updatesBySection;
  }

  private async processGroupedUpdates(
    updatesBySection: Map<string, Partial<DashboardData>[]>
  ): Promise<Error[]> {
    const errors: Error[] = [];

    for (const [section, updates] of updatesBySection.entries()) {
      try {
        const mergedUpdate = this.mergeUpdates(updates);
        await this.performUpdate(section, mergedUpdate);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    return errors;
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

  private async fetchData(_section: string): Promise<DashboardData | null> {
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
  optimizedSyncManagerInstance ??= new OptimizedSyncManager(config);
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
