/**
 * Cache Warming Service for BroLab Entertainment
 *
 * Preloads critical data into cache to improve performance
 * and reduce API response times for common requests.
 */

import cron from "node-cron";
import { cache, CACHE_KEYS, CACHE_TTL } from "../lib/cache";

interface WarmingTask {
  key: string;
  fetcher: () => Promise<unknown>;
  ttl: number;
  tags?: string[];
  priority: "critical" | "high" | "medium" | "low";
  schedule?: string; // Cron expression for periodic warming
}

/**
 * Cache Warming Service
 */
export class CacheWarmingService {
  private readonly warmingTasks: Map<string, WarmingTask> = new Map();
  private isWarming = false;
  private readonly warmingStats = {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    lastWarmingTime: null as Date | null,
    averageWarmingTime: 0,
  };

  constructor() {
    this.initializeDefaultTasks();
    this.schedulePeriodicWarming();
  }

  /**
   * Add a warming task
   */
  addTask(taskId: string, task: WarmingTask): void {
    this.warmingTasks.set(taskId, task);
  }

  /**
   * Remove a warming task
   */
  removeTask(taskId: string): void {
    this.warmingTasks.delete(taskId);
  }

  /**
   * Warm cache with all registered tasks
   */
  async warmCache(priority?: "critical" | "high" | "medium" | "low"): Promise<void> {
    if (this.isWarming) {
      console.log("Cache warming already in progress, skipping...");
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      console.log("🔥 Starting cache warming...");

      // Filter tasks by priority if specified
      const tasks = Array.from(this.warmingTasks.entries()).filter(
        ([_, task]) => !priority || task.priority === priority
      );

      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      tasks.sort(([_, a], [__, b]) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      this.warmingStats.totalTasks = tasks.length;
      this.warmingStats.successfulTasks = 0;
      this.warmingStats.failedTasks = 0;

      // Execute tasks in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async ([taskId, task]) => {
            try {
              await this.executeWarmingTask(taskId, task);
              this.warmingStats.successfulTasks++;
            } catch (error) {
              console.error(`Cache warming failed for task ${taskId}:`, error);
              this.warmingStats.failedTasks++;
            }
          })
        );

        // Small delay between batches
        if (i + batchSize < tasks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const endTime = Date.now();
      this.warmingStats.lastWarmingTime = new Date();
      this.warmingStats.averageWarmingTime = endTime - startTime;

      console.log(`✅ Cache warming completed in ${endTime - startTime}ms`);
      console.log(
        `📊 Success: ${this.warmingStats.successfulTasks}, Failed: ${this.warmingStats.failedTasks}`
      );
    } catch (error) {
      console.error("Cache warming failed:", error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm specific cache entries
   */
  async warmSpecific(taskIds: string[]): Promise<void> {
    const tasks = taskIds
      .map(id => [id, this.warmingTasks.get(id)] as [string, WarmingTask])
      .filter(([_, task]) => task !== undefined);

    for (const [taskId, task] of tasks) {
      try {
        await this.executeWarmingTask(taskId, task);
        console.log(`✅ Warmed cache for ${taskId}`);
      } catch (error) {
        console.error(`❌ Failed to warm cache for ${taskId}:`, error);
      }
    }
  }

  /**
   * Get warming statistics
   */
  getStats(): typeof this.warmingStats & { isWarming: boolean; totalRegisteredTasks: number } {
    return {
      ...this.warmingStats,
      isWarming: this.isWarming,
      totalRegisteredTasks: this.warmingTasks.size,
    };
  }

  /**
   * Clear all warming tasks
   */
  clearTasks(): void {
    this.warmingTasks.clear();
  }

  // Private methods

  private async executeWarmingTask(taskId: string, task: WarmingTask): Promise<void> {
    const startTime = Date.now();

    try {
      // Check if data is already cached and fresh
      if (cache.exists(task.key)) {
        console.log(`⚡ Cache hit for ${taskId}, skipping warming`);
        return;
      }

      // Fetch data
      const data = await task.fetcher();

      // Cache the data
      cache.set(task.key, data, task.ttl, task.tags);

      const endTime = Date.now();
      console.log(`🔥 Warmed ${taskId} in ${endTime - startTime}ms`);
    } catch (error) {
      console.error(`Failed to execute warming task ${taskId}:`, error);
      throw error;
    }
  }

  private initializeDefaultTasks(): void {
    // Critical tasks - must be warmed immediately
    this.addTask("subscription-plans", {
      key: CACHE_KEYS.SUBSCRIPTION_PLANS,
      fetcher: async () => {
        // In a real implementation, fetch from your API
        return [
          { id: 1, name: "Basic", price: 29.99, features: ["10 downloads", "Basic license"] },
          { id: 2, name: "Premium", price: 49.99, features: ["50 downloads", "Premium license"] },
          {
            id: 3,
            name: "Unlimited",
            price: 149.99,
            features: ["Unlimited downloads", "Exclusive license"],
          },
        ];
      },
      ttl: CACHE_TTL.VERY_LONG,
      tags: ["static", "subscription"],
      priority: "critical",
      schedule: "0 0 * * *", // Daily at midnight
    });

    this.addTask("featured-beats", {
      key: "featured-beats",
      fetcher: async () => {
        // Mock featured beats - replace with actual API call
        return Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          title: `Featured Beat ${i + 1}`,
          artist: "BroLab",
          price: 29.99,
          featured: true,
        }));
      },
      ttl: CACHE_TTL.LONG,
      tags: ["beats", "featured"],
      priority: "critical",
      schedule: "0 */6 * * *", // Every 6 hours
    });

    this.addTask("categories", {
      key: CACHE_KEYS.CATEGORIES,
      fetcher: async () => {
        return [
          { id: 1, name: "Hip Hop", slug: "hip-hop", count: 150 },
          { id: 2, name: "Trap", slug: "trap", count: 120 },
          { id: 3, name: "R&B", slug: "rnb", count: 80 },
          { id: 4, name: "Pop", slug: "pop", count: 60 },
        ];
      },
      ttl: CACHE_TTL.VERY_LONG,
      tags: ["static", "categories"],
      priority: "high",
      schedule: "0 2 * * *", // Daily at 2 AM
    });

    // High priority tasks
    this.addTask("popular-beats", {
      key: "popular-beats",
      fetcher: async () => {
        // Mock popular beats - replace with actual API call
        return Array.from({ length: 20 }, (_, i) => ({
          id: i + 100,
          title: `Popular Beat ${i + 1}`,
          artist: "BroLab",
          plays: Math.floor(Math.random() * 10000),
          price: 19.99 + Math.random() * 30,
        }));
      },
      ttl: CACHE_TTL.MEDIUM,
      tags: ["beats", "popular"],
      priority: "high",
      schedule: "0 */4 * * *", // Every 4 hours
    });

    this.addTask("recent-beats", {
      key: "recent-beats",
      fetcher: async () => {
        // Mock recent beats - replace with actual API call
        return Array.from({ length: 15 }, (_, i) => ({
          id: i + 200,
          title: `Recent Beat ${i + 1}`,
          artist: "BroLab",
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          price: 24.99,
        }));
      },
      ttl: CACHE_TTL.MEDIUM,
      tags: ["beats", "recent"],
      priority: "high",
      schedule: "0 */2 * * *", // Every 2 hours
    });

    // Medium priority tasks
    this.addTask("site-stats", {
      key: "site-stats",
      fetcher: async () => {
        return {
          totalBeats: 1500,
          totalArtists: 50,
          totalDownloads: 25000,
          totalUsers: 5000,
        };
      },
      ttl: CACHE_TTL.LONG,
      tags: ["stats"],
      priority: "medium",
      schedule: "0 1 * * *", // Daily at 1 AM
    });

    // Low priority tasks
    this.addTask("testimonials", {
      key: "testimonials",
      fetcher: async () => {
        return [
          { id: 1, name: "Artist 1", text: "Great beats!", rating: 5 },
          { id: 2, name: "Artist 2", text: "Professional quality", rating: 5 },
          { id: 3, name: "Artist 3", text: "Highly recommend", rating: 4 },
        ];
      },
      ttl: CACHE_TTL.VERY_LONG,
      tags: ["static", "testimonials"],
      priority: "low",
      schedule: "0 3 * * 0", // Weekly on Sunday at 3 AM
    });
  }

  private schedulePeriodicWarming(): void {
    // Schedule warming for tasks with cron expressions
    this.warmingTasks.forEach((task, taskId) => {
      if (task.schedule) {
        cron.schedule(task.schedule, async () => {
          try {
            await this.executeWarmingTask(taskId, task);
            console.log(`🕒 Scheduled warming completed for ${taskId}`);
          } catch (error) {
            console.error(`🕒 Scheduled warming failed for ${taskId}:`, error);
          }
        });
      }
    });

    // General cache warming every hour for critical tasks
    cron.schedule("0 * * * *", async () => {
      await this.warmCache("critical");
    });

    // Warm high priority tasks every 4 hours
    cron.schedule("0 */4 * * *", async () => {
      await this.warmCache("high");
    });

    console.log("📅 Cache warming schedules initialized");
  }
}

// Export singleton instance
export const cacheWarmingService = new CacheWarmingService();

// Utility functions for easy integration
export const warmingUtils = {
  // Warm cache on application startup
  warmOnStartup: async () => {
    console.log("🚀 Warming cache on application startup...");
    await cacheWarmingService.warmCache("critical");
    await cacheWarmingService.warmCache("high");
  },

  // Warm cache for specific user data
  warmUserData: async (userId: string) => {
    cacheWarmingService.addTask(`user-${userId}-profile`, {
      key: CACHE_KEYS.USER_PROFILE(userId),
      fetcher: async () => {
        // Mock user profile - replace with actual API call
        return {
          id: userId,
          name: "User Name",
          email: "user@example.com",
          subscription: "premium",
        };
      },
      ttl: CACHE_TTL.MEDIUM,
      tags: ["user", userId],
      priority: "high",
    });

    await cacheWarmingService.warmSpecific([`user-${userId}-profile`]);
  },

  // Warm cache for beat details
  warmBeatDetails: async (beatId: string) => {
    const numericBeatId = Number.parseInt(beatId, 10);
    cacheWarmingService.addTask(`beat-${numericBeatId}-details`, {
      key: CACHE_KEYS.BEAT_DETAILS(String(numericBeatId)),
      fetcher: async () => {
        // Mock beat details - replace with actual API call
        return {
          id: beatId,
          title: "Beat Title",
          artist: "Artist Name",
          bpm: 120,
          key: "C major",
          price: 29.99,
        };
      },
      ttl: CACHE_TTL.LONG,
      tags: ["beats", beatId],
      priority: "medium",
    });

    await cacheWarmingService.warmSpecific([`beat-${beatId}-details`]);
  },

  // Get warming statistics
  getStats: () => cacheWarmingService.getStats(),
};
