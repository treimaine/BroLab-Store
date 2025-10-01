/**
 * Memory Optimization Utilities
 *
 * Provides tools for monitoring and optimizing memory usage
 * in the BroLab Entertainment server application.
 */

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryThreshold = 500 * 1024 * 1024; // 500MB threshold
  private checkInterval = 30000; // 30 seconds
  private intervalId?: NodeJS.Timeout;

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  startMonitoring(): void {
    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);

    console.log("Memory monitoring started");
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log("Memory monitoring stopped");
    }
  }

  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const externalMB = Math.round(usage.external / 1024 / 1024);

    if (usage.heapUsed > this.memoryThreshold) {
      console.warn(`High memory usage detected: ${heapUsedMB}MB heap used`);
      this.triggerGarbageCollection();
    }

    // Log memory stats every 5 minutes
    if (Date.now() % (5 * 60 * 1000) < this.checkInterval) {
      console.log(`Memory usage: Heap ${heapUsedMB}/${heapTotalMB}MB, External ${externalMB}MB`);
    }
  }

  private triggerGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log("Garbage collection triggered");
    } else {
      console.warn("Garbage collection not available. Start with --expose-gc flag");
    }
  }

  getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024),
    };
  }
}

/**
 * Cache with automatic cleanup to prevent memory leaks
 */
export class MemoryEfficientCache<T> {
  private cache = new Map<string, { value: T; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize = 1000, ttlMinutes = 30) {
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;

    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  set(key: string, value: T): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access count
    entry.accessCount++;
    return entry.value;
  }

  has(key: string): boolean {
    return this.cache.has(key) && !this.isExpired(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > this.ttl;
  }

  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cache cleanup: removed ${removedCount} expired entries`);
    }
  }

  private evictLeastUsed(): void {
    let leastUsedKey = "";
    let leastAccessCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastAccessCount) {
        leastAccessCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

/**
 * Stream processing utilities to handle large data efficiently
 */
export class StreamProcessor {
  static async processLargeArray<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize = 100
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);

      // Allow garbage collection between batches
      if (i % (batchSize * 10) === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    return results;
  }

  static createReadableStream<T>(items: T[]): ReadableStream<T> {
    let index = 0;

    return new ReadableStream({
      pull(controller) {
        if (index < items.length) {
          controller.enqueue(items[index++]);
        } else {
          controller.close();
        }
      },
    });
  }
}

/**
 * Memory-efficient file processing
 */
export class FileProcessor {
  static async processFileInChunks(
    filePath: string,
    chunkSize = 64 * 1024, // 64KB chunks
    processor: (chunk: Buffer) => void
  ): Promise<void> {
    const fs = await import("fs");
    const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => {
        processor(chunk);
      });

      stream.on("end", resolve);
      stream.on("error", reject);
    });
  }
}

/**
 * Initialize memory optimization
 */
export function initializeMemoryOptimization(): void {
  const monitor = MemoryMonitor.getInstance();
  monitor.startMonitoring();

  // Handle process termination
  process.on("SIGTERM", () => {
    monitor.stopMonitoring();
  });

  process.on("SIGINT", () => {
    monitor.stopMonitoring();
  });

  console.log("Memory optimization initialized");
}

// Global cache instances
export const globalCache = new MemoryEfficientCache(5000, 60); // 5000 items, 60 minutes TTL
export const sessionCache = new MemoryEfficientCache(1000, 30); // 1000 items, 30 minutes TTL
