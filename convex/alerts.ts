import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Convex functions for alert management
 */

// Create alert
export const create = mutation({
  args: {
    type: v.string(),
    severity: v.string(),
    message: v.string(),
    details: v.any(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("Alert created:", {
        type: args.type,
        severity: args.severity,
        message: args.message,
        timestamp: args.timestamp,
      });

      // In a real implementation, this would store the alert in a dedicated alerts table
      // For now, we'll log it and return the alert ID
      const alertId = `alert_${args.type}_${args.timestamp}`;

      return {
        id: alertId,
        created: true,
        timestamp: args.timestamp,
      };
    } catch (error) {
      console.error("Error creating alert:", error);
      throw error;
    }
  },
});

// Get alerts
export const list = query({
  args: {
    type: v.optional(v.string()),
    severity: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { type, severity, limit = 50 }) => {
    try {
      console.log("Alerts requested:", {
        type,
        severity,
        limit,
      });

      // In a real implementation, this would query the alerts table
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("Error getting alerts:", error);
      return [];
    }
  },
});

// Mark alert as resolved
export const resolve = mutation({
  args: {
    alertId: v.string(),
    resolvedBy: v.optional(v.string()),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, { alertId, resolvedBy, resolution }) => {
    try {
      console.log("Alert resolved:", {
        alertId,
        resolvedBy,
        resolution,
        timestamp: Date.now(),
      });

      // In a real implementation, this would update the alert in the database
      return {
        alertId,
        resolved: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error resolving alert:", error);
      throw error;
    }
  },
});

// Get alert statistics
export const getStats = query({
  args: {
    timeRange: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
  },
  handler: async (ctx, { timeRange }) => {
    try {
      const range = timeRange || {
        start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
        end: Date.now(),
      };

      console.log("Alert statistics requested:", {
        timeRange: {
          start: new Date(range.start).toISOString(),
          end: new Date(range.end).toISOString(),
        },
      });

      // In a real implementation, this would query actual alert data
      // For now, return mock statistics
      return {
        totalAlerts: 5,
        resolvedAlerts: 3,
        pendingAlerts: 2,
        alertsBySeverity: {
          low: 2,
          medium: 2,
          high: 1,
        },
        alertsByType: {
          consistency_error: 2,
          integrity_violation: 2,
          sync_failure: 1,
        },
        timeRange: range,
      };
    } catch (error) {
      console.error("Error getting alert statistics:", error);
      return {
        totalAlerts: 0,
        resolvedAlerts: 0,
        pendingAlerts: 0,
        alertsBySeverity: {},
        alertsByType: {},
        timeRange: timeRange || { start: Date.now() - 86400000, end: Date.now() },
      };
    }
  },
});
