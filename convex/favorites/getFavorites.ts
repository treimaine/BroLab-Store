import { query } from "../_generated/server";

export const getFavorites = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    return favorites;
  },
});

export const getFavoritesWithBeats = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    // Récupérer les détails des beats
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

    return favoritesWithBeats.filter(f => f.beat); // Filtrer les beats non trouvés
  },
});
