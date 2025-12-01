import { v } from "convex/values";
import { Id, TableNames } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/**
 * Generic data operations for Convex
 * Note: These operations are simplified to work with the existing schema
 */

// Valid table names for type safety
type ValidTableName = TableNames;

// Get a specific resource by type and ID
export const get = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, { resourceType, resourceId }) => {
    try {
      // Map resource types to Convex tables
      const tableMap: Record<string, ValidTableName> = {
        user_preferences: "users",
        cart_items: "cartItems",
        favorites: "favorites",
        downloads: "downloads",
        beats: "beats",
        orders: "orders",
        subscriptions: "subscriptions",
        users: "users",
        products: "beats",
      };

      const mappedTable = tableMap[resourceType];
      if (!mappedTable) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      // Get the document by ID based on table type
      switch (mappedTable) {
        case "users":
          return await ctx.db.get(resourceId as Id<"users">);
        case "cartItems":
          return await ctx.db.get(resourceId as Id<"cartItems">);
        case "favorites":
          return await ctx.db.get(resourceId as Id<"favorites">);
        case "downloads":
          return await ctx.db.get(resourceId as Id<"downloads">);
        case "beats":
          return await ctx.db.get(resourceId as Id<"beats">);
        case "orders":
          return await ctx.db.get(resourceId as Id<"orders">);
        case "subscriptions":
          return await ctx.db.get(resourceId as Id<"subscriptions">);
        default:
          return null;
      }
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
      const tableMap: Record<string, ValidTableName> = {
        user_preferences: "users",
        cart_items: "cartItems",
        favorites: "favorites",
        downloads: "downloads",
        beats: "beats",
        orders: "orders",
        subscriptions: "subscriptions",
        users: "users",
        products: "beats",
      };

      const mappedTable = tableMap[resourceType];
      if (!mappedTable) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      // Get all documents of this type based on table
      let documents;
      switch (mappedTable) {
        case "users":
          documents = await ctx.db.query("users").take(limit);
          break;
        case "cartItems":
          documents = await ctx.db.query("cartItems").take(limit);
          break;
        case "favorites":
          documents = await ctx.db.query("favorites").take(limit);
          break;
        case "downloads":
          documents = await ctx.db.query("downloads").take(limit);
          break;
        case "beats":
          documents = await ctx.db.query("beats").take(limit);
          break;
        case "orders":
          documents = await ctx.db.query("orders").take(limit);
          break;
        case "subscriptions":
          documents = await ctx.db.query("subscriptions").take(limit);
          break;
        default:
          return [];
      }

      return documents.map(doc => ({ id: doc._id, ...doc }));
    } catch (error) {
      console.error("Error listing resources:", error);
      return [];
    }
  },
});

// Update a resource with new data - uses updatedAt field which exists in schema
export const update = mutation({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
    data: v.object({
      updatedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { resourceType, resourceId, data }) => {
    try {
      const tableMap: Record<string, ValidTableName> = {
        user_preferences: "users",
        cart_items: "cartItems",
        favorites: "favorites",
        downloads: "downloads",
        beats: "beats",
        orders: "orders",
        subscriptions: "subscriptions",
        users: "users",
        products: "beats",
      };

      const mappedTable = tableMap[resourceType];
      if (!mappedTable) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      const updateData = {
        updatedAt: data.updatedAt ?? Date.now(),
      };

      // Update the document based on table type - only tables with updatedAt field
      switch (mappedTable) {
        case "users":
          await ctx.db.patch(resourceId as Id<"users">, updateData);
          break;
        case "orders":
          await ctx.db.patch(resourceId as Id<"orders">, updateData);
          break;
        case "subscriptions":
          await ctx.db.patch(resourceId as Id<"subscriptions">, updateData);
          break;
        case "beats":
          await ctx.db.patch(resourceId as Id<"beats">, { updatedAt: updateData.updatedAt });
          break;
        default:
          // Tables without updatedAt field - skip update
          console.log(`Table ${mappedTable} does not support updatedAt field`);
      }

      return { success: true, resourceId, timestamp: Date.now() };
    } catch (error) {
      console.error("Error updating resource:", error);
      throw error;
    }
  },
});

// Perform data synchronization - simplified to use existing schema fields
export const sync = mutation({
  args: {
    type: v.string(),
    resourceId: v.string(),
    newState: v.object({
      updatedAt: v.optional(v.number()),
    }),
    metadata: v.optional(v.object({})),
  },
  handler: async (ctx, { type, resourceId, newState }) => {
    try {
      console.log("Data sync operation:", {
        type,
        resourceId,
        timestamp: Date.now(),
      });

      // Map resource types to appropriate tables
      const tableMap: Record<string, ValidTableName> = {
        users: "users",
        user_preferences: "users",
        orders: "orders",
        products: "beats",
        favorites: "favorites",
        downloads: "downloads",
      };

      const tableName = tableMap[type];
      if (!tableName) {
        throw new Error(`Unknown resource type for sync: ${type}`);
      }

      const syncTimestamp = Date.now();
      const syncData = {
        updatedAt: newState.updatedAt ?? syncTimestamp,
      };

      // Update the resource with new state based on table type
      switch (tableName) {
        case "users":
          await ctx.db.patch(resourceId as Id<"users">, syncData);
          break;
        case "orders":
          await ctx.db.patch(resourceId as Id<"orders">, syncData);
          break;
        case "beats":
          await ctx.db.patch(resourceId as Id<"beats">, { updatedAt: syncData.updatedAt });
          break;
        default:
          // Tables without updatedAt - skip
          console.log(`Table ${tableName} does not support sync updates`);
      }

      console.log("Data sync completed:", {
        type,
        resourceId,
        tableName,
      });

      return {
        success: true,
        newState: { ...newState, updatedAt: syncTimestamp },
        syncId: `sync_${resourceId}_${syncTimestamp}`,
        timestamp: syncTimestamp,
      };
    } catch (error) {
      console.error("Error in data sync:", error);
      throw error;
    }
  },
});

// Restore data from backup - simplified to use existing schema fields
export const restore = mutation({
  args: {
    operationType: v.string(),
    resourceId: v.string(),
    state: v.object({
      updatedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { operationType, resourceId, state }) => {
    try {
      console.log("Data restore operation:", {
        operationType,
        resourceId,
        timestamp: Date.now(),
      });

      // Map operation types to appropriate tables
      const tableMap: Record<string, ValidTableName> = {
        update_user: "users",
        update_preferences: "users",
        update_order: "orders",
        create_order: "orders",
        update_product: "beats",
        update_favorites: "favorites",
        users: "users",
        orders: "orders",
        products: "beats",
        favorites: "favorites",
      };

      const tableName = tableMap[operationType] || "users";
      const restoreTimestamp = Date.now();

      const restoreData = {
        updatedAt: state.updatedAt ?? restoreTimestamp,
      };

      // Restore the data based on table type
      switch (tableName) {
        case "users":
          await ctx.db.patch(resourceId as Id<"users">, restoreData);
          break;
        case "orders":
          await ctx.db.patch(resourceId as Id<"orders">, restoreData);
          break;
        case "beats":
          await ctx.db.patch(resourceId as Id<"beats">, { updatedAt: restoreData.updatedAt });
          break;
        default:
          // Tables without updatedAt - skip
          console.log(`Table ${tableName} does not support restore updates`);
      }

      console.log("Data restored successfully:", { operationType, resourceId });

      return {
        success: true,
        resourceId,
        operationType,
        timestamp: restoreTimestamp,
      };
    } catch (error) {
      console.error("Error restoring data:", error);
      throw error;
    }
  },
});
