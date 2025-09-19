import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";

/**
 * Restore favorites data
 */
export const restore = mutation({
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
