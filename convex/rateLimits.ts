import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// ================================
// RATE LIMIT QUERIES
// ================================

export const getRateLimit = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    return rateLimit;
  },
});

export const getRateLimitStats = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    if (!rateLimit) {
      return null;
    }

    const now = Date.now();
    const windowEnd = rateLimit.windowStart + rateLimit.windowMs;
    const isExpired = now > windowEnd;

    return {
      key: rateLimit.key,
      requests: isExpired ? 0 : rateLimit.requests,
      remaining: Math.max(0, rateLimit.maxRequests - (isExpired ? 0 : rateLimit.requests)),
      resetTime: isExpired ? now + rateLimit.windowMs : windowEnd,
      windowStart: isExpired ? now : rateLimit.windowStart,
      blocked: rateLimit.blocked,
    };
  },
});

interface RateLimitStat {
  key: string;
  requests: number;
  remaining: number;
  resetTime: number;
  windowStart: number;
  blocked: number;
  action?: string;
}

export const getAllRateLimitStats = query({
  args: {},
  handler: async ctx => {
    const rateLimits = await ctx.db.query("rateLimits").collect();
    const now = Date.now();

    const stats: Record<string, RateLimitStat> = {};

    for (const rateLimit of rateLimits) {
      const windowEnd = rateLimit.windowStart + rateLimit.windowMs;
      const isExpired = now > windowEnd;

      stats[rateLimit.key] = {
        key: rateLimit.key,
        requests: isExpired ? 0 : rateLimit.requests,
        remaining: Math.max(0, rateLimit.maxRequests - (isExpired ? 0 : rateLimit.requests)),
        resetTime: isExpired ? now + rateLimit.windowMs : windowEnd,
        windowStart: isExpired ? now : rateLimit.windowStart,
        blocked: rateLimit.blocked,
      };
    }

    return stats;
  },
});

export const getUserRateLimits = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rateLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", q => q.eq("metadata.userId", args.userId))
      .collect();

    const now = Date.now();
    const stats: Record<string, RateLimitStat> = {};

    for (const rateLimit of rateLimits) {
      const windowEnd = rateLimit.windowStart + rateLimit.windowMs;
      const isExpired = now > windowEnd;

      stats[rateLimit.key] = {
        key: rateLimit.key,
        requests: isExpired ? 0 : rateLimit.requests,
        remaining: Math.max(0, rateLimit.maxRequests - (isExpired ? 0 : rateLimit.requests)),
        resetTime: isExpired ? now + rateLimit.windowMs : windowEnd,
        windowStart: isExpired ? now : rateLimit.windowStart,
        blocked: rateLimit.blocked,
        action: rateLimit.metadata?.action,
      };
    }

    return stats;
  },
});

// ================================
// RATE LIMIT MUTATIONS
// ================================

export const checkRateLimit = mutation({
  args: {
    key: v.string(),
    windowMs: v.number(),
    maxRequests: v.number(),
    metadata: v.optional(
      v.object({
        userId: v.optional(v.string()),
        action: v.optional(v.string()),
        ip: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing rate limit record
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    let rateLimit: Doc<"rateLimits">;

    if (existing) {
      const windowEnd = existing.windowStart + existing.windowMs;
      const isExpired = now > windowEnd;

      if (isExpired) {
        // Reset the window
        await ctx.db.patch(existing._id, {
          requests: 1,
          windowStart: now,
          windowMs: args.windowMs,
          maxRequests: args.maxRequests,
          lastRequest: now,
          metadata: args.metadata,
          updatedAt: now,
        });
        rateLimit = (await ctx.db.get(existing._id))!;
      } else {
        // Check if limit is exceeded
        if (existing.requests >= existing.maxRequests) {
          // Increment blocked counter
          await ctx.db.patch(existing._id, {
            blocked: existing.blocked + 1,
            lastRequest: now,
            updatedAt: now,
          });

          return {
            allowed: false,
            remaining: 0,
            resetTime: windowEnd,
            totalRequests: existing.requests,
            retryAfter: Math.ceil((windowEnd - now) / 1000),
          };
        }

        // Increment request counter
        await ctx.db.patch(existing._id, {
          requests: existing.requests + 1,
          lastRequest: now,
          updatedAt: now,
        });
        rateLimit = (await ctx.db.get(existing._id))!;
      }
    } else {
      // Create new rate limit record
      const id = await ctx.db.insert("rateLimits", {
        key: args.key,
        requests: 1,
        windowStart: now,
        windowMs: args.windowMs,
        maxRequests: args.maxRequests,
        blocked: 0,
        lastRequest: now,
        metadata: args.metadata,
        createdAt: now,
        updatedAt: now,
      });

      rateLimit = (await ctx.db.get(id))!;
    }

    const remaining = Math.max(0, rateLimit.maxRequests - rateLimit.requests);
    const resetTime = rateLimit.windowStart + rateLimit.windowMs;

    return {
      allowed: true,
      remaining,
      resetTime,
      totalRequests: rateLimit.requests,
    };
  },
});

export const resetRateLimit = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        requests: 0,
        blocked: 0,
        windowStart: Date.now(),
        updatedAt: Date.now(),
      });
      return true;
    }

    return false;
  },
});

export const incrementRateLimit = mutation({
  args: {
    key: v.string(),
    windowMs: v.number(),
    maxRequests: v.number(),
    metadata: v.optional(
      v.object({
        userId: v.optional(v.string()),
        action: v.optional(v.string()),
        ip: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing rate limit record
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    if (existing) {
      const windowEnd = existing.windowStart + existing.windowMs;
      const isExpired = now > windowEnd;

      if (isExpired) {
        // Reset the window and set to 1
        await ctx.db.patch(existing._id, {
          requests: 1,
          windowStart: now,
          windowMs: args.windowMs,
          maxRequests: args.maxRequests,
          lastRequest: now,
          metadata: args.metadata,
          updatedAt: now,
        });
        return 1;
      } else {
        // Increment request counter
        const newCount = existing.requests + 1;
        await ctx.db.patch(existing._id, {
          requests: newCount,
          lastRequest: now,
          updatedAt: now,
        });
        return newCount;
      }
    } else {
      // Create new rate limit record
      await ctx.db.insert("rateLimits", {
        key: args.key,
        requests: 1,
        windowStart: now,
        windowMs: args.windowMs,
        maxRequests: args.maxRequests,
        blocked: 0,
        lastRequest: now,
        metadata: args.metadata,
        createdAt: now,
        updatedAt: now,
      });
      return 1;
    }
  },
});

// ================================
// CLEANUP AND MAINTENANCE
// ================================

export const cleanupExpiredRateLimits = mutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - (args.olderThanMs || 24 * 60 * 60 * 1000); // Default: 24 hours

    const expiredLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_last_request")
      .filter(q => q.lt(q.field("lastRequest"), cutoff))
      .collect();

    let deletedCount = 0;
    for (const limit of expiredLimits) {
      await ctx.db.delete(limit._id);
      deletedCount++;
    }

    return { deletedCount, cutoff };
  },
});

export const getRateLimitMetrics = query({
  args: {
    timeRange: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const start = args.timeRange?.start || now - 60 * 60 * 1000; // Default: 1 hour ago
    const end = args.timeRange?.end || now;

    const rateLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_last_request")
      .filter(q => q.and(q.gte(q.field("lastRequest"), start), q.lte(q.field("lastRequest"), end)))
      .collect();

    const metrics = {
      totalKeys: rateLimits.length,
      totalRequests: rateLimits.reduce((sum, limit) => sum + limit.requests, 0),
      totalBlocked: rateLimits.reduce((sum, limit) => sum + limit.blocked, 0),
      activeWindows: rateLimits.filter(limit => {
        const windowEnd = limit.windowStart + limit.windowMs;
        return now <= windowEnd;
      }).length,
      byAction: {} as Record<string, { requests: number; blocked: number; keys: number }>,
    };

    // Group by action
    for (const limit of rateLimits) {
      const action = limit.metadata?.action || "unknown";
      if (!metrics.byAction[action]) {
        metrics.byAction[action] = { requests: 0, blocked: 0, keys: 0 };
      }
      metrics.byAction[action].requests += limit.requests;
      metrics.byAction[action].blocked += limit.blocked;
      metrics.byAction[action].keys += 1;
    }

    return metrics;
  },
});
