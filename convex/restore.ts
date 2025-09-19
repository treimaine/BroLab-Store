import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

/**
 * Convex functions for data restoration operations
 */

// Generic data restore function
export const restoreData = mutation({
  args: {
    operationType: v.string(),
    resourceId: v.string(),
    state: v.any(),
  },
  handler: async (ctx, { operationType, resourceId, state }) => {
    try {
      console.log("Generic data restore:", {
        operationType,
        resourceId,
        stateSize: JSON.stringify(state).length,
        timestamp: Date.now(),
      });

      // Map operation types to appropriate tables and restore logic
      const tableMap: Record<string, string> = {
        update_user: "users",
        update_preferences: "users",
        update_order: "orders",
        create_order: "orders",
        update_product: "beats", // Map products to beats table
        update_favorites: "favorites",
        update_downloads: "downloads",
      };

      const tableName = tableMap[operationType];
      if (!tableName) {
        throw new Error(`Unknown operation type for restore: ${operationType}`);
      }

      // Restore the data by patching the document
      await ctx.db.patch(resourceId as Id<any>, {
        ...state,
        _restoredAt: Date.now(),
        _restoredFrom: operationType,
      });

      console.log("Data restored successfully:", {
        operationType,
        resourceId,
        tableName,
      });

      return { success: true, resourceId, operationType, timestamp: Date.now() };
    } catch (error) {
      console.error("Error restoring data:", error);
      throw error;
    }
  },
});

// Restore user data
export const restoreUser = mutation({
  args: {
    userId: v.string(),
    state: v.any(),
  },
  handler: async (ctx, { userId, state }) => {
    try {
      console.log("User data restore:", {
        userId,
        stateSize: JSON.stringify(state).length,
        timestamp: Date.now(),
      });

      // Restore user data
      await ctx.db.patch(userId as Id<"users">, {
        ...state,
        _restoredAt: Date.now(),
        _restoredFrom: "user_restore",
      });

      console.log("User data restored successfully:", { userId });
      return { success: true, userId, timestamp: Date.now() };
    } catch (error) {
      console.error("Error restoring user data:", error);
      throw error;
    }
  },
});

// Restore order data
export const restoreOrder = mutation({
  args: {
    orderId: v.string(),
    state: v.any(),
  },
  handler: async (ctx, { orderId, state }) => {
    try {
      console.log("Order data restore:", {
        orderId,
        stateSize: JSON.stringify(state).length,
        timestamp: Date.now(),
      });

      // Restore order data
      await ctx.db.patch(orderId as Id<"orders">, {
        ...state,
        _restoredAt: Date.now(),
        _restoredFrom: "order_restore",
      });

      console.log("Order data restored successfully:", { orderId });
      return { success: true, orderId, timestamp: Date.now() };
    } catch (error) {
      console.error("Error restoring order data:", error);
      throw error;
    }
  },
});

// Restore product data (using beats table)
export const restoreProduct = mutation({
  args: {
    productId: v.string(),
    state: v.any(),
  },
  handler: async (ctx, { productId, state }) => {
    try {
      console.log("Product data restore:", {
        productId,
        stateSize: JSON.stringify(state).length,
        timestamp: Date.now(),
      });

      // Restore product data (using beats table since products table doesn't exist)
      await ctx.db.patch(productId as Id<"beats">, {
        ...state,
        _restoredAt: Date.now(),
        _restoredFrom: "product_restore",
      });

      console.log("Product data restored successfully:", { productId });
      return { success: true, productId, timestamp: Date.now() };
    } catch (error) {
      console.error("Error restoring product data:", error);
      throw error;
    }
  },
});

// Restore favorites data
export const restoreFavorites = mutation({
  args: {
    resourceId: v.string(),
    state: v.any(),
  },
  handler: async (ctx, { resourceId, state }) => {
    try {
      console.log("Favorites data restore:", {
        resourceId,
        stateSize: JSON.stringify(state).length,
        timestamp: Date.now(),
      });

      // Restore favorites data
      await ctx.db.patch(resourceId as Id<"favorites">, {
        ...state,
        _restoredAt: Date.now(),
        _restoredFrom: "favorites_restore",
      });

      console.log("Favorites data restored successfully:", { resourceId });
      return { success: true, resourceId, timestamp: Date.now() };
    } catch (error) {
      console.error("Error restoring favorites data:", error);
      throw error;
    }
  },
});

// Batch restore multiple resources
export const batchRestore = mutation({
  args: {
    restoreOperations: v.array(
      v.object({
        operationType: v.string(),
        resourceId: v.string(),
        state: v.any(),
      })
    ),
  },
  handler: async (ctx, { restoreOperations }) => {
    try {
      console.log("Batch restore started:", {
        operationCount: restoreOperations.length,
        timestamp: Date.now(),
      });

      const results = [];
      const errors = [];

      for (const operation of restoreOperations) {
        try {
          // Call the restoreData mutation directly with the operation parameters
          const tableMap: Record<string, string> = {
            update_user: "users",
            update_preferences: "users",
            update_order: "orders",
            create_order: "orders",
            update_product: "beats",
            update_favorites: "favorites",
            update_downloads: "downloads",
          };

          const tableName = tableMap[operation.operationType];
          if (!tableName) {
            throw new Error(`Unknown operation type for restore: ${operation.operationType}`);
          }

          // Restore the data by patching the document
          await ctx.db.patch(operation.resourceId as Id<any>, {
            ...operation.state,
            _restoredAt: Date.now(),
            _restoredFrom: operation.operationType,
          });

          const result = {
            success: true,
            resourceId: operation.resourceId,
            operationType: operation.operationType,
            timestamp: Date.now(),
          };
          results.push({ ...operation, success: true, result });
        } catch (error) {
          console.error("Error in batch restore operation:", error);
          errors.push({ ...operation, success: false, error: String(error) });
        }
      }

      console.log("Batch restore completed:", {
        totalOperations: restoreOperations.length,
        successful: results.length,
        failed: errors.length,
      });

      return {
        successful: results,
        failed: errors,
        summary: {
          total: restoreOperations.length,
          successful: results.length,
          failed: errors.length,
        },
      };
    } catch (error) {
      console.error("Error in batch restore:", error);
      throw error;
    }
  },
});

// Validate restore operation
export const validateRestore = mutation({
  args: {
    operationType: v.string(),
    resourceId: v.string(),
    state: v.any(),
  },
  handler: async (ctx, { operationType, resourceId, state }) => {
    try {
      console.log("Restore validation:", {
        operationType,
        resourceId,
        timestamp: Date.now(),
      });

      const errors: string[] = [];

      // Check if resource exists
      const resource = await ctx.db.get(resourceId as Id<any>);
      if (!resource) {
        errors.push(`Resource not found: ${resourceId}`);
      }

      // Validate state structure based on operation type
      if (!state || typeof state !== "object") {
        errors.push("Invalid state: must be an object");
      }

      // Operation-specific validations
      switch (operationType) {
        case "update_user":
        case "update_preferences":
          if (!state.userId && !state.id) {
            errors.push("User state must contain userId or id");
          }
          break;
        case "update_order":
        case "create_order":
          if (!state.userId) {
            errors.push("Order state must contain userId");
          }
          if (!state.items || !Array.isArray(state.items)) {
            errors.push("Order state must contain items array");
          }
          break;
        case "update_product":
          if (!state.name) {
            errors.push("Product state must contain name");
          }
          break;
      }

      const isValid = errors.length === 0;

      console.log("Restore validation completed:", {
        operationType,
        resourceId,
        isValid,
        errorCount: errors.length,
      });

      return {
        isValid,
        errors,
        operationType,
        resourceId,
      };
    } catch (error) {
      console.error("Error validating restore:", error);
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
        operationType,
        resourceId,
      };
    }
  },
});
