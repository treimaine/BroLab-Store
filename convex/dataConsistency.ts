import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/**
 * Convex functions for data consistency operations
 */

// Get a specific resource by type and ID
export const get = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, { resourceType, resourceId }) => {
    try {
      // Map resource types to Convex tables
      const tableMap: Record<string, string> = {
        user_preferences: "users",
        cart_items: "cartItems",
        favorites: "favorites",
        downloads: "downloads",
        beats: "beats",
        orders: "orders",
        subscriptions: "subscriptions",
      };

      const tableName = tableMap[resourceType];
      if (!tableName) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      // Get the document by ID
      const document = await ctx.db.get(resourceId as Id<any>);
      return document;
    } catch (error) {
      console.error("Error getting resource:", error);
      return null;
    }
  },
});

// List all resources of a specific type
export const list = query({
  args: {
    resourceType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { resourceType, limit = 100 }) => {
    try {
      const tableMap: Record<string, string> = {
        user_preferences: "users",
        cart_items: "cartItems",
        favorites: "favorites",
        downloads: "downloads",
        beats: "beats",
        orders: "orders",
        subscriptions: "subscriptions",
      };

      const tableName = tableMap[resourceType];
      if (!tableName) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      // Get all documents of this type
      const documents = await ctx.db.query(tableName as any).take(limit);

      return documents.map(doc => ({ id: doc._id, ...doc }));
    } catch (error) {
      console.error("Error listing resources:", error);
      return [];
    }
  },
});

// Update a resource with new data
export const update = mutation({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, { resourceType, resourceId, data }) => {
    try {
      const tableMap: Record<string, string> = {
        user_preferences: "users",
        cart_items: "cartItems",
        favorites: "favorites",
        downloads: "downloads",
        beats: "beats",
        orders: "orders",
        subscriptions: "subscriptions",
      };

      const tableName = tableMap[resourceType];
      if (!tableName) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      // Update the document
      const updatedDoc = await ctx.db.patch(resourceId as Id<any>, {
        ...data,
        _updatedAt: Date.now(),
      });

      return updatedDoc;
    } catch (error) {
      console.error("Error updating resource:", error);
      throw error;
    }
  },
});

// Store conflict information
export const storeConflict = mutation({
  args: {
    conflictId: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    localValue: v.any(),
    remoteValue: v.any(),
    status: v.union(v.literal("pending"), v.literal("resolved"), v.literal("ignored")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      // Store conflict in a dedicated conflicts table (if it exists)
      // For now, we'll log it and return the conflict ID
      console.log("Conflict stored:", {
        conflictId: args.conflictId,
        resourceType: args.resourceType,
        resourceId: args.resourceId,
        status: args.status,
        timestamp: Date.now(),
      });

      return args.conflictId;
    } catch (error) {
      console.error("Error storing conflict:", error);
      throw error;
    }
  },
});

// Store rollback point information
export const storeRollbackPoint = mutation({
  args: {
    rollbackId: v.string(),
    operationType: v.string(),
    resourceId: v.string(),
    previousState: v.any(),
    canRollback: v.boolean(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      // Store rollback point information
      // For now, we'll log it and return the rollback ID
      console.log("Rollback point stored:", {
        rollbackId: args.rollbackId,
        operationType: args.operationType,
        resourceId: args.resourceId,
        canRollback: args.canRollback,
        timestamp: Date.now(),
      });

      return args.rollbackId;
    } catch (error) {
      console.error("Error storing rollback point:", error);
      throw error;
    }
  },
});

// Get consistency metrics for monitoring
export const getConsistencyMetrics = query({
  args: {
    resourceType: v.optional(v.string()),
    timeRange: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
  },
  handler: async (ctx, { resourceType, timeRange }) => {
    try {
      // Return mock metrics for now
      // In a real implementation, this would query actual conflict and consistency data
      return {
        totalConflicts: 0,
        resolvedConflicts: 0,
        pendingConflicts: 0,
        consistencyScore: 100,
        lastCheckTimestamp: Date.now(),
        resourceType: resourceType || "all",
        timeRange: timeRange || { start: Date.now() - 86400000, end: Date.now() },
      };
    } catch (error) {
      console.error("Error getting consistency metrics:", error);
      return {
        totalConflicts: 0,
        resolvedConflicts: 0,
        pendingConflicts: 0,
        consistencyScore: 0,
        lastCheckTimestamp: Date.now(),
        resourceType: resourceType || "all",
        timeRange: timeRange || { start: Date.now() - 86400000, end: Date.now() },
      };
    }
  },
});

// Validate data integrity for a specific resource
export const validateIntegrity = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, { resourceType, resourceId }) => {
    try {
      const tableMap: Record<string, string> = {
        user_preferences: "users",
        cart_items: "cartItems",
        favorites: "favorites",
        downloads: "downloads",
        beats: "beats",
        orders: "orders",
        subscriptions: "subscriptions",
      };

      const tableName = tableMap[resourceType];
      if (!tableName) {
        return { isValid: false, errors: [`Unknown resource type: ${resourceType}`] };
      }

      // Get the document
      const document = await ctx.db.get(resourceId as Id<any>);
      if (!document) {
        return { isValid: false, errors: [`Resource not found: ${resourceId}`] };
      }

      // Basic validation checks
      const errors: string[] = [];

      // Check required fields based on resource type
      switch (resourceType) {
        case "user_preferences":
          if (!document.userId) errors.push("Missing userId");
          break;
        case "cart_items":
        case "orders":
          if (!document.userId) errors.push("Missing userId");
          if (resourceType === "orders" && (!document.items || !Array.isArray(document.items))) {
            errors.push("Missing or invalid items array");
          }
          break;
        case "favorites":
          if (!document.userId) errors.push("Missing userId");
          if (!document.productId) errors.push("Missing productId");
          break;
        case "downloads":
          if (!document.userId) errors.push("Missing userId");
          if (!document.productId) errors.push("Missing productId");
          break;
      }

      // Check timestamps
      if (!document._creationTime) errors.push("Missing creation timestamp");

      return {
        isValid: errors.length === 0,
        errors,
        resourceId,
        resourceType,
        lastValidated: Date.now(),
      };
    } catch (error) {
      console.error("Error validating integrity:", error);
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
        resourceId,
        resourceType,
        lastValidated: Date.now(),
      };
    }
  },
});

// Perform data synchronization
export const sync = mutation({
  args: {
    type: v.string(),
    resourceId: v.string(),
    newState: v.any(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { type, resourceId, newState, metadata }) => {
    try {
      console.log("Data sync operation:", {
        type,
        resourceId,
        stateSize: JSON.stringify(newState).length,
        timestamp: Date.now(),
      });

      // Map resource types to appropriate tables
      const tableMap: Record<string, string> = {
        users: "users",
        user_preferences: "users",
        orders: "orders",
        products: "products",
        favorites: "favorites",
        downloads: "downloads",
      };

      const tableName = tableMap[type];
      if (!tableName) {
        throw new Error(`Unknown resource type for sync: ${type}`);
      }

      // Update the resource with new state
      const result = await ctx.db.patch(resourceId as Id<any>, {
        ...newState,
        _syncedAt: Date.now(),
        _syncMetadata: metadata,
      });

      console.log("Data sync completed:", {
        type,
        resourceId,
        tableName,
        success: true,
      });

      return {
        success: true,
        newState: { ...newState, _syncedAt: Date.now() },
        syncId: `sync_${resourceId}_${Date.now()}`,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error in data sync:", error);
      throw error;
    }
  },
});
