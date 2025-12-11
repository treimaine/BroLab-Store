import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get trending beats sorted by view count (descending).
 * Returns WordPress IDs and view counts for client-side matching.
 */
export const getTrendingBeats = query({
  args: {
    limit: v.optional(v.number()),
    excludeIds: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const excludeIds = new Set(args.excludeIds || []);

    // Get all active beats with views
    const beats = await ctx.db
      .query("beats")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    // Sort by views descending, then by createdAt descending (fallback)
    const sortedBeats = beats
      .filter(beat => !excludeIds.has(beat.wordpressId))
      .sort((a, b) => {
        const viewsDiff = (b.views || 0) - (a.views || 0);
        if (viewsDiff !== 0) return viewsDiff;
        // Fallback: most recent first
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .slice(0, limit);

    return sortedBeats.map(beat => ({
      wordpressId: beat.wordpressId,
      views: beat.views || 0,
      title: beat.title,
    }));
  },
});

/**
 * Get view count for a specific beat by WordPress ID.
 */
export const getViewCount = query({
  args: {
    wordpressId: v.number(),
  },
  handler: async (ctx, args) => {
    const beat = await ctx.db
      .query("beats")
      .withIndex("by_wordpress_id", q => q.eq("wordpressId", args.wordpressId))
      .first();

    return beat?.views || 0;
  },
});
