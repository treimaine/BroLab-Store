import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/**
 * Generic data operations for Convex
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
        users: "users",
        products: "beats", // Map products to beats table
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
        users: "users",
        products: "beats", // Map products to beats table
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
        users: "users",
        products: "beats", // Map products to beats table
      };

      const tableName = tableMap[resourceType];
      if (!tableName) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      // Update the document
      await ctx.db.patch(resourceId as Id<any>, {
        ...data,
        _updatedAt: Date.now(),
      });

      return { success: true, resourceId, timestamp: Date.now() };
    } catch (error) {
      console.error("Error updating resource:", error);
      throw error;
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
        products: "beats", // Map products to beats table
        favorites: "favorites",
        downloads: "downloads",
      };

      const tableName = tableMap[type];
      if (!tableName) {
        throw new Error(`Unknown resource type for sync: ${type}`);
      }

      // Update the resource with new state
      await ctx.db.patch(resourceId as Id<any>, {
        ...newState,
        _syncedAt: Date.now(),
        _syncMetadata: metadata,
      });

      console.log("Data sync completed:", {
        type,
        resourceId,
        tableName,
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

// Restore data from backup
export const restore = mutation({
  args: {
    operationType: v.string(),
    resourceId: v.string(),
    state: v.any(),
  },
  handler: async (ctx, { operationType, resourceId, state }) => {
    try {
      console.log("Data restore operation:", {
        operationType,
        resourceId,
        timestamp: Date.now(),
      });

      // Map operation types to appropriate tables
      const tableMap: Record<string, string> = {
        update_user: "users",
        update_preferences: "users",
        update_order: "orders",
        create_order: "orders",
        update_product: "beats", // Map products to beats table
        update_favorites: "favorites",
        users: "users",
        orders: "orders",
        products: "beats", // Map products to beats table
        favorites: "favorites",
      };

      const tableName = tableMap[operationType] || "users";

      // Restore the data
      await ctx.db.patch(resourceId as Id<any>, {
        ...state,
        _restoredAt: Date.now(),
        _restoreOperation: operationType,
      });

      console.log("Data restored successfully:", { operationType, resourceId });

      return {
        success: true,
        resourceId,
        operationType,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error restoring data:", error);
      throw error;
    }
  },
});
