import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Mark a webhook event as processed to implement idempotency
 * Prevents duplicate processing of the same payment event
 */
export const markProcessedEvent = mutation({
  args: {
    provider: v.string(), // 'stripe' | 'paypal'
    eventId: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { provider, eventId, metadata } = args;

    try {
      // Check if event already processed
      const existing = await ctx.db
        .query("processedEvents")
        .withIndex("by_provider_eventId", q => q.eq("provider", provider).eq("eventId", eventId))
        .first();

      if (existing) {
        console.log(
          `⚠️ Event ${eventId} from ${provider} already processed at ${new Date(existing.processedAt).toISOString()}`
        );
        return {
          alreadyProcessed: true,
          processedAt: existing.processedAt,
          eventId: existing._id,
        };
      }

      // Mark event as processed
      const processedEventId = await ctx.db.insert("processedEvents", {
        provider,
        eventId,
        processedAt: Date.now(),
        metadata,
      });

      console.log(`✅ Event ${eventId} from ${provider} marked as processed`);

      return {
        alreadyProcessed: false,
        processedAt: Date.now(),
        eventId: processedEventId,
      };
    } catch (error) {
      console.error(`❌ Error marking event ${eventId} as processed:`, error);
      throw new Error(
        `Failed to mark event as processed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * Check if an event has already been processed
 * Used for quick idempotency checks before processing
 */
export const isEventProcessed = query({
  args: {
    provider: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const { provider, eventId } = args;

    const existing = await ctx.db
      .query("processedEvents")
      .withIndex("by_provider_eventId", q => q.eq("provider", provider).eq("eventId", eventId))
      .first();

    return {
      processed: !!existing,
      processedAt: existing?.processedAt,
    };
  },
});

/**
 * Clean up old processed events (older than 30 days)
 * Should be run periodically to prevent table growth
 */
export const cleanupOldEvents = mutation({
  args: {
    daysToKeep: v.optional(v.number()), // Default: 30 days
  },
  handler: async (ctx, args) => {
    const daysToKeep = args.daysToKeep ?? 30;
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    try {
      const oldEvents = await ctx.db
        .query("processedEvents")
        .withIndex("by_processedAt")
        .filter(q => q.lt(q.field("processedAt"), cutoffTime))
        .collect();

      let deletedCount = 0;
      for (const event of oldEvents) {
        await ctx.db.delete(event._id);
        deletedCount++;
      }

      console.log(`🧹 Cleaned up ${deletedCount} processed events older than ${daysToKeep} days`);

      return {
        success: true,
        deletedCount,
        cutoffDate: new Date(cutoffTime).toISOString(),
      };
    } catch (error) {
      console.error("❌ Error cleaning up old events:", error);
      throw new Error(
        `Failed to cleanup old events: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
