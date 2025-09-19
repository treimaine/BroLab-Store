import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

/**
 * Convex functions for product operations (mapped to beats table)
 */

// Restore product data (using beats table)
export const restore = mutation({
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
