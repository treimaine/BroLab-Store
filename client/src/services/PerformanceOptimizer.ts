/**
 * Performance Optimizer for Real-time Sync
 *
 * Implements intelligent batching, request deduplication, memory optimization,
 * selective sync, progressive loading, and smart caching for dashboard sync performance.
 */

// ================================
// BATCHING INTERFACES
// ================================

export interface BatchConfig {
  /** Maximum batch size */
  maxBatchSize: number;
  /** Maximum wait time before flushing batch (ms) */
  maxWaitTime: number;
  /** Minimum batch size to trigger flush */
  minBatchSize: number;
  /** Enable adaptive batching based on load */
  adaptive: boolean;
}

export interface BatchedUpdate<T = unknown> {
  id: string;
  type: string;
  data: T;
  timestamp: number;
  priority: number;
}

export interface BatchFlushResult {
  batchId: string;
  itemsProcessed: number;
  duration: number;
  success: boolean;
  errors: Error[];
}

// ================================
// DEDUPLICATION INTERFACES
// ================================

export interface DeduplicationConfig {
  /** Time window for deduplication (ms) */
  timeWindow: number;
  /** Maximum cache size */
  maxCacheSize: number;
  /** Enable fingerprint-based deduplication */
  useFingerprints: boolean;
}

export interface RequestFingerprint {
  key: string;
  timestamp: number;
  hash: string;
}

// ================================
// MEMORY OPTIMIZATION INTERFACES
// ================================

export interface MemoryConfig {
  /** Maximum event history size */
  maxEventHistory: number;
  /** Maximum cache entries */
  maxCacheEntries: number;
  /** Cleanup interval (ms) */
  cleanupInterval: number;
  /** Memory threshold for aggressive cleanup (bytes) */
  memoryThreshold: number;
}

export interface MemoryStats {
  eventHistorySize: number;
  cacheSize: number;
  estimatedMemoryUsage: number;
  lastCleanup: number;
  cleanupCount: number;
}

// ================================
// SELECTIVE SYNC INTERFACES
// ================================

export interface SelectiveSyncConfig {
  /** Enable visibility-based sync */
  syncOnlyVisible: boolean;
  /** Sections to always sync regardless of visibility */
  alwaysSyncSections: string[];
  /** Debounce time for visibility changes (ms) */
  visibilityDebounce: number;
}

export interface SectionVisibility {
  section: string;
  visible: boolean;
  lastVisible: number;
  syncPriority: number;
}

// ================================
// PROGRESSIVE LOADING INTERFACES
// ================================

export interface ProgressiveLoadConfig {
  /** Initial page size */
  initialPageSize: number;
  /** Page size increment */
  pageSizeIncrement: number;
  /** Maximum page size */
  maxPageSize: number;
  /** Enable infinite scroll */
  infiniteScroll: boolean;
  /** Preload threshold (items from end) */
  preloadThreshold: number;
}

export interface LoadingState {
  section: string;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  hasMore: boolean;
  loading: boolean;
}

// ================================
// CACHING INTERFACES
// ================================

export interface CacheConfig {
  /** Default TTL (ms) */
  defaultTTL: number;
  /** Maximum cache size (entries) */
  maxSize: number;
  /** Enable LRU eviction */
  lruEviction: boolean;
  /** Enable smart invalidation */
  smartInvalidation: boolean;
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
  evictions: number;
}

// ================================
// BATCH PROCESSOR
// ================================

export class BatchProcessor<T = unknown> {
  private batch: BatchedUpdate<T>[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private config: BatchConfig;
  private processingBatch = false;
  private stats = {
    totalBatches: 0,
    totalItems: 0,
    averageBatchSize: 0,
    averageProcessingTime: 0,
  };

  constructor(
    config: Partial<BatchConfig> = {},
    private processor: (items: BatchedUpdate<T>[]) => Promise<BatchFlushResult>
  ) {
    this.config = {
      maxBatchSize: config.maxBatchSize || 50,
      maxWaitTime: config.maxWaitTime || 100,
      minBatchSize: config.minBatchSize || 5,
      adaptive: config.adaptive ?? true,
    };
  }

  /**
   * Add item to batch
   */
  public add(item: BatchedUpdate<T>): void {
    this.batch.push(item);

    // Sort by priority (higher first)
    this.batch.sort((a, b) => b.priority - a.priority);

    // Check if we should flush
    if (this.shouldFlush()) {
      this.flush();
    } else if (!this.flushTimer) {
      this.scheduleFlush();
    }
  }

  /**
   * Force flush current batch
   */
  public async flush(): Promise<BatchFlushResult | null> {
    if (this.batch.length === 0 || this.processingBatch) {
      return null;
    }

    this.clearFlushTimer();
    this.processingBatch = true;

    const itemsToProcess = this.batch.splice(0, this.config.maxBatchSize);
    const startTime = performance.now();

    try {
      const result = await this.processor(itemsToProcess);

      // Update stats
      const processingTime = performance.now() - startTime;
      this.updateStats(itemsToProcess.length, processingTime);

      return result;
    } finally {
      this.processingBatch = false;

      // If there are more items, schedule next flush
      if (this.batch.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  /**
   * Get current batch size
   */
  public getBatchSize(): number {
    return this.batch.length;
  }

  /**
   * Get batch statistics
   */
  public getStats() {
    return { ...this.stats };
  }

  /**
   * Clear batch and timers
   */
  public clear(): void {
    this.clearFlushTimer();
    this.batch = [];
  }

  private shouldFlush(): boolean {
    if (this.batch.length >= this.config.maxBatchSize) {
      return true;
    }

    if (this.config.adaptive) {
      // Adaptive batching: flush if high-priority items are waiting
      const highPriorityCount = this.batch.filter(item => item.priority > 5).length;
      return highPriorityCount >= this.config.minBatchSize;
    }

    return false;
  }

  private scheduleFlush(): void {
    this.clearFlushTimer();
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.config.maxWaitTime);
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private updateStats(batchSize: number, processingTime: number): void {
    this.stats.totalBatches++;
    this.stats.totalItems += batchSize;
    this.stats.averageBatchSize =
      (this.stats.averageBatchSize * (this.stats.totalBatches - 1) + batchSize) /
      this.stats.totalBatches;
    this.stats.averageProcessingTime =
      (this.stats.averageProcessingTime * (this.stats.totalBatches - 1) + processingTime) /
      this.stats.totalBatches;
  }
}

// ================================
// REQUEST DEDUPLICATOR
// ================================

export class RequestDeduplicator {
  private requestCache = new Map<string, RequestFingerprint>();
  private config: DeduplicationConfig;
  private stats = {
    totalRequests: 0,
    duplicatesFiltered: 0,
    cacheHits: 0,
  };

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = {
      timeWindow: config.timeWindow || 1000,
      maxCacheSize: config.maxCacheSize || 1000,
      useFingerprints: config.useFingerprints ?? true,
    };

    // Periodic cleanup
    setInterval(() => this.cleanup(), this.config.timeWindow);
  }

  /**
   * Check if request is duplicate
   */
  public isDuplicate(key: string, data?: unknown): boolean {
    this.stats.totalRequests++;

    const hash = this.config.useFingerprints ? this.generateHash(data) : "";
    const cacheKey = this.config.useFingerprints ? `${key}:${hash}` : key;

    const existing = this.requestCache.get(cacheKey);

    if (existing) {
      const age = Date.now() - existing.timestamp;

      if (age < this.config.timeWindow) {
        this.stats.duplicatesFiltered++;
        this.stats.cacheHits++;
        return true;
      }
    }

    // Not a duplicate, add to cache
    this.requestCache.set(cacheKey, {
      key: cacheKey,
      timestamp: Date.now(),
      hash,
    });

    // Enforce cache size limit
    if (this.requestCache.size > this.config.maxCacheSize) {
      this.evictOldest();
    }

    return false;
  }

  /**
   * Get deduplication statistics
   */
  public getStats() {
    return {
      ...this.stats,
      cacheSize: this.requestCache.size,
      filterRate:
        this.stats.totalRequests > 0 ? this.stats.duplicatesFiltered / this.stats.totalRequests : 0,
    };
  }

  /**
   * Clear cache
   */
  public clear(): void {
    this.requestCache.clear();
  }

  private generateHash(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.timeWindow * 2;

    for (const [key, entry] of this.requestCache.entries()) {
      if (entry.timestamp < cutoff) {
        this.requestCache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.requestCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.requestCache.delete(oldestKey);
    }
  }
}

// ================================
// MEMORY OPTIMIZER
// ================================

export class MemoryOptimizer {
  private config: MemoryConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats: MemoryStats = {
    eventHistorySize: 0,
    cacheSize: 0,
    estimatedMemoryUsage: 0,
    lastCleanup: Date.now(),
    cleanupCount: 0,
  };

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxEventHistory: config.maxEventHistory || 1000,
      maxCacheEntries: config.maxCacheEntries || 500,
      cleanupInterval: config.cleanupInterval || 60000,
      memoryThreshold: config.memoryThreshold || 50 * 1024 * 1024, // 50MB
    };

    this.startCleanupSchedule();
  }

  /**
   * Optimize event history
   */
  public optimizeEventHistory<T>(history: T[], maxSize?: number): T[] {
    const limit = maxSize || this.config.maxEventHistory;

    if (history.length <= limit) {
      return history;
    }

    // Keep most recent events
    const optimized = history.slice(-limit);
    this.stats.eventHistorySize = optimized.length;

    return optimized;
  }

  /**
   * Optimize cache entries
   */
  public optimizeCacheEntries<T>(
    cache: Map<string, CacheEntry<T>>,
    maxSize?: number
  ): Map<string, CacheEntry<T>> {
    const limit = maxSize || this.config.maxCacheEntries;

    if (cache.size <= limit) {
      return cache;
    }

    // Sort by last access time (LRU)
    const entries = Array.from(cache.entries()).sort(([, a], [, b]) => b.lastAccess - a.lastAccess);

    // Keep most recently accessed
    const optimized = new Map(entries.slice(0, limit));
    this.stats.cacheSize = optimized.size;

    return optimized;
  }

  /**
   * Estimate memory usage
   */
  public estimateMemoryUsage(data: unknown): number {
    const str = JSON.stringify(data);
    return str.length * 2; // Rough estimate: 2 bytes per character
  }

  /**
   * Check if cleanup is needed
   */
  public shouldCleanup(currentMemoryUsage: number): boolean {
    return currentMemoryUsage > this.config.memoryThreshold;
  }

  /**
   * Perform aggressive cleanup
   */
  public performAggressiveCleanup<T>(data: {
    eventHistory?: T[];
    cache?: Map<string, CacheEntry<unknown>>;
  }): {
    eventHistory?: T[];
    cache?: Map<string, CacheEntry<unknown>>;
  } {
    const result: {
      eventHistory?: T[];
      cache?: Map<string, CacheEntry<unknown>>;
    } = {};

    if (data.eventHistory) {
      // Keep only 50% of max size
      result.eventHistory = this.optimizeEventHistory(
        data.eventHistory,
        Math.floor(this.config.maxEventHistory * 0.5)
      );
    }

    if (data.cache) {
      // Keep only 50% of max size
      result.cache = this.optimizeCacheEntries(
        data.cache,
        Math.floor(this.config.maxCacheEntries * 0.5)
      );
    }

    this.stats.lastCleanup = Date.now();
    this.stats.cleanupCount++;

    return result;
  }

  /**
   * Get memory statistics
   */
  public getStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * Destroy optimizer
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private startCleanupSchedule(): void {
    this.cleanupInterval = setInterval(() => {
      // Trigger cleanup event
      this.stats.lastCleanup = Date.now();
    }, this.config.cleanupInterval);
  }
}

// ================================
// SELECTIVE SYNC MANAGER
// ================================

export class SelectiveSyncManager {
  private config: SelectiveSyncConfig;
  private sectionVisibility = new Map<string, SectionVisibility>();
  private visibilityObserver: IntersectionObserver | null = null;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<SelectiveSyncConfig> = {}) {
    this.config = {
      syncOnlyVisible: config.syncOnlyVisible ?? true,
      alwaysSyncSections: config.alwaysSyncSections || ["stats", "user"],
      visibilityDebounce: config.visibilityDebounce || 500,
    };

    if (typeof IntersectionObserver !== "undefined") {
      this.setupVisibilityObserver();
    }
  }

  /**
   * Register section for visibility tracking
   */
  public registerSection(section: string, element: Element, priority = 5): void {
    this.sectionVisibility.set(section, {
      section,
      visible: false,
      lastVisible: 0,
      syncPriority: priority,
    });

    if (this.visibilityObserver) {
      this.visibilityObserver.observe(element);
    }
  }

  /**
   * Unregister section
   */
  public unregisterSection(section: string, element: Element): void {
    this.sectionVisibility.delete(section);

    if (this.visibilityObserver) {
      this.visibilityObserver.unobserve(element);
    }

    const timer = this.debounceTimers.get(section);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(section);
    }
  }

  /**
   * Check if section should sync
   */
  public shouldSync(section: string): boolean {
    // Always sync priority sections
    if (this.config.alwaysSyncSections.includes(section)) {
      return true;
    }

    // If selective sync is disabled, sync everything
    if (!this.config.syncOnlyVisible) {
      return true;
    }

    // Check visibility
    const visibility = this.sectionVisibility.get(section);
    return visibility?.visible ?? false;
  }

  /**
   * Get sections that should sync
   */
  public getSectionsToSync(): string[] {
    const sections: string[] = [];

    // Add always-sync sections
    sections.push(...this.config.alwaysSyncSections);

    // Add visible sections
    if (this.config.syncOnlyVisible) {
      for (const [section, visibility] of this.sectionVisibility.entries()) {
        if (visibility.visible && !sections.includes(section)) {
          sections.push(section);
        }
      }
    } else {
      // Add all registered sections
      for (const section of this.sectionVisibility.keys()) {
        if (!sections.includes(section)) {
          sections.push(section);
        }
      }
    }

    return sections;
  }

  /**
   * Get sync priority for section
   */
  public getSyncPriority(section: string): number {
    if (this.config.alwaysSyncSections.includes(section)) {
      return 10; // Highest priority
    }

    const visibility = this.sectionVisibility.get(section);
    return visibility?.syncPriority ?? 5;
  }

  /**
   * Destroy manager
   */
  public destroy(): void {
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
      this.visibilityObserver = null;
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private setupVisibilityObserver(): void {
    this.visibilityObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const section = (entry.target as HTMLElement).dataset.section;
          if (!section) return;

          this.handleVisibilityChange(section, entry.isIntersecting);
        });
      },
      {
        threshold: 0.1, // Consider visible if 10% is showing
      }
    );
  }

  private handleVisibilityChange(section: string, visible: boolean): void {
    // Debounce visibility changes
    const existingTimer = this.debounceTimers.get(section);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      const visibility = this.sectionVisibility.get(section);
      if (visibility) {
        visibility.visible = visible;
        if (visible) {
          visibility.lastVisible = Date.now();
        }
      }

      this.debounceTimers.delete(section);
    }, this.config.visibilityDebounce);

    this.debounceTimers.set(section, timer);
  }
}

// ================================
// PROGRESSIVE LOADER
// ================================

export class ProgressiveLoader<T = unknown> {
  private config: ProgressiveLoadConfig;
  private loadingStates = new Map<string, LoadingState>();

  constructor(config: Partial<ProgressiveLoadConfig> = {}) {
    this.config = {
      initialPageSize: config.initialPageSize || 20,
      pageSizeIncrement: config.pageSizeIncrement || 10,
      maxPageSize: config.maxPageSize || 100,
      infiniteScroll: config.infiniteScroll ?? true,
      preloadThreshold: config.preloadThreshold || 5,
    };
  }

  /**
   * Initialize loading state for section
   */
  public initializeSection(section: string, totalItems: number): void {
    this.loadingStates.set(section, {
      section,
      currentPage: 0,
      pageSize: this.config.initialPageSize,
      totalItems,
      hasMore: totalItems > this.config.initialPageSize,
      loading: false,
    });
  }

  /**
   * Load next page
   */
  public async loadNextPage(
    section: string,
    loader: (offset: number, limit: number) => Promise<T[]>
  ): Promise<T[]> {
    const state = this.loadingStates.get(section);
    if (!state || state.loading || !state.hasMore) {
      return [];
    }

    state.loading = true;

    try {
      const offset = state.currentPage * state.pageSize;
      const items = await loader(offset, state.pageSize);

      state.currentPage++;
      state.hasMore = items.length === state.pageSize;
      state.loading = false;

      // Increase page size for next load (progressive enhancement)
      if (state.pageSize < this.config.maxPageSize) {
        state.pageSize = Math.min(
          state.pageSize + this.config.pageSizeIncrement,
          this.config.maxPageSize
        );
      }

      return items;
    } catch (error) {
      state.loading = false;
      throw error;
    }
  }

  /**
   * Check if should preload next page
   */
  public shouldPreload(section: string, currentIndex: number, totalLoaded: number): boolean {
    const state = this.loadingStates.get(section);
    if (!state || !state.hasMore || state.loading) {
      return false;
    }

    const itemsFromEnd = totalLoaded - currentIndex;
    return itemsFromEnd <= this.config.preloadThreshold;
  }

  /**
   * Get loading state
   */
  public getLoadingState(section: string): LoadingState | undefined {
    return this.loadingStates.get(section);
  }

  /**
   * Reset section
   */
  public resetSection(section: string): void {
    this.loadingStates.delete(section);
  }
}

// ================================
// SMART CACHE
// ================================

export class SmartCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0,
    evictions: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 60000, // 1 minute
      maxSize: config.maxSize || 500,
      lruEviction: config.lruEviction ?? true,
      smartInvalidation: config.smartInvalidation ?? true,
    };
  }

  /**
   * Get cached value
   */
  public get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();

    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Set cached value
   */
  public set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccess: Date.now(),
      size: this.estimateSize(data),
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
    this.stats.memoryUsage += entry.size;

    // Enforce size limit
    if (this.cache.size > this.config.maxSize) {
      this.evict();
    }
  }

  /**
   * Invalidate cache entry
   */
  public invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.memoryUsage -= entry.size;
      this.cache.delete(key);
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Invalidate by pattern
   */
  public invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.invalidate(key);
      }
    }
  }

  /**
   * Smart invalidation based on data relationships
   */
  public smartInvalidate(section: string): void {
    if (!this.config.smartInvalidation) {
      return;
    }

    // Invalidate related sections
    const relatedPatterns = this.getRelatedPatterns(section);
    relatedPatterns.forEach(pattern => this.invalidatePattern(pattern));
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.memoryUsage = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  private evict(): void {
    if (!this.config.lruEviction) {
      // Simple FIFO eviction
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.invalidate(firstKey);
        this.stats.evictions++;
      }
      return;
    }

    // LRU eviction
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.invalidate(lruKey);
      this.stats.evictions++;
    }
  }

  private estimateSize(data: T): number {
    const str = JSON.stringify(data);
    return str.length * 2;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private getRelatedPatterns(section: string): RegExp[] {
    // Define relationships between sections
    const relationships: Record<string, string[]> = {
      favorites: ["stats", "activity"],
      downloads: ["stats", "activity"],
      orders: ["stats", "activity", "revenue"],
      reservations: ["stats", "activity"],
    };

    const related = relationships[section] || [];
    return related.map(rel => new RegExp(`^${rel}:`));
  }
}
