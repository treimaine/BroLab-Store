import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Server-side favorites functions that accept clerkId
 * Used by Express routes for wishlist functionality
 */

// Get favorites by clerkId (for server routes)
export const getFavoritesByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.clerkId) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Enrich with beat data
    const enrichedFavorites = await Promise.all(
      favorites.map(async fav => {
        const beat = await ctx.db
          .query("beats")
          .withIndex("by_wordpress_id", q => q.eq("wordpressId", fav.beatId))
          .first();

        return {
          id: fav._id,
          beatId: fav.beatId,
          createdAt: fav.createdAt,
          beat: beat
            ? {
                id: beat._id,
                title: beat.title,
                price: beat.price,
                imageUrl: beat.imageUrl,
                genre: beat.genre,
              }
            : null,
        };
      })
    );

    return enrichedFavorites;
  },
});

// Add to favorites by clerkId (for server routes)
export const addFavoriteByClerkId = mutation({
  args: {
    clerkId: v.string(),
    beatId: v.number(),
  },
  handler: async (ctx, args) => {
    if (!args.clerkId) throw new Error("ClerkId is required");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    // Check if beat exists
    const beat = await ctx.db
      .query("beats")
      .withIndex("by_wordpress_id", q => q.eq("wordpressId", args.beatId))
      .first();

    if (!beat) throw new Error("Beat not found");

    // Check if already in favorites
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_beat", q => q.eq("userId", user._id).eq("beatId", args.beatId))
      .first();

    if (existing) {
      return { success: true, alreadyExists: true, id: existing._id };
    }

    const favoriteId = await ctx.db.insert("favorites", {
      userId: user._id,
      beatId: args.beatId,
      createdAt: Date.now(),
    });

    return { success: true, alreadyExists: false, id: favoriteId };
  },
});

// Remove from favorites by clerkId (for server routes)
export const removeFavoriteByClerkId = mutation({
  args: {
    clerkId: v.string(),
    beatId: v.number(),
  },
  handler: async (ctx, args) => {
    if (!args.clerkId) throw new Error("ClerkId is required");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_beat", q => q.eq("userId", user._id).eq("beatId", args.beatId))
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
      return { success: true, deleted: true };
    }

    return { success: true, deleted: false };
  },
});

// Clear all favorites by clerkId (for server routes)
export const clearFavoritesByClerkId = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.clerkId) throw new Error("ClerkId is required");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    let deletedCount = 0;
    for (const favorite of favorites) {
      await ctx.db.delete(favorite._id);
      deletedCount++;
    }

    return { success: true, deletedCount };
  },
});
