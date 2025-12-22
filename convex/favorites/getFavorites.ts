import { query } from "../_generated/server";
import { optionalAuth } from "../lib/authHelpers";

export const getFavorites = query({
  args: {},
  handler: async ctx => {
    const auth = await optionalAuth(ctx);
    if (!auth) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
      .collect();

    return favorites;
  },
});

export const getFavoritesWithBeats = query({
  args: {},
  handler: async ctx => {
    const auth = await optionalAuth(ctx);
    if (!auth) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
      .collect();

    // Get beat details
    const favoritesWithBeats = await Promise.all(
      favorites.map(async favorite => {
        const beat = await ctx.db
          .query("beats")
          .withIndex("by_wordpress_id", q => q.eq("wordpressId", favorite.beatId))
          .first();

        return {
          ...favorite,
          beat,
        };
      })
    );

    return favoritesWithBeats.filter(f => f.beat); // Filter out beats not found
  },
});
