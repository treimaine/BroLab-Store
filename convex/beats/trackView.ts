import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Increment view count for a beat by its WordPress ID.
 * Creates the beat record if it doesn't exist in Convex.
 */
export const incrementView = mutation({
  args: {
    wordpressId: v.number(),
    title: v.optional(v.string()),
    genre: v.optional(v.string()),
    price: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { wordpressId, title, genre, price, imageUrl, audioUrl } = args;

    // Find existing beat by WordPress ID
    const existingBeat = await ctx.db
      .query("beats")
      .withIndex("by_wordpress_id", q => q.eq("wordpressId", wordpressId))
      .first();

    if (existingBeat) {
      // Increment views
      await ctx.db.patch(existingBeat._id, {
        views: (existingBeat.views || 0) + 1,
        updatedAt: Date.now(),
      });
      return { success: true, views: (existingBeat.views || 0) + 1 };
    }

    // Create new beat record with initial view
    const newBeatId = await ctx.db.insert("beats", {
      wordpressId,
      title: title || `Beat ${wordpressId}`,
      genre: genre || "Unknown",
      bpm: 0,
      price: price || 0,
      imageUrl,
      audioUrl,
      views: 1,
      downloads: 0,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, views: 1, beatId: newBeatId };
  },
});
