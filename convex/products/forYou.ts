import { v } from "convex/values";
import { query } from "../_generated/server";
import { optionalAuth } from "../lib/authHelpers";

export const getForYouBeats = query({
  args: {
    limit: v.optional(v.number()),
    genre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await optionalAuth(ctx);
    const limit = args.limit || 10;

    let beats;

    if (args.genre) {
      beats = await ctx.db
        .query("beats")
        .withIndex("by_genre", q => q.eq("genre", args.genre!))
        .filter(q => q.eq(q.field("isActive"), true))
        .order("desc")
        .take(limit);
    } else {
      beats = await ctx.db
        .query("beats")
        .filter(q => q.eq(q.field("isActive"), true))
        .order("desc")
        .take(limit);
    }

    // Si utilisateur connecté, ajouter les favoris
    if (auth) {
      const favorites = await ctx.db
        .query("favorites")
        .withIndex("by_user", q => q.eq("userId", auth.userId))
        .collect();

      const favoriteBeatIds = new Set(favorites.map(f => f.beatId));

      return beats.map(beat => ({
        ...beat,
        isFavorite: favoriteBeatIds.has(beat.wordpressId),
      }));
    }

    return beats.map(beat => ({
      ...beat,
      isFavorite: false,
    }));
  },
});

export const getFeaturedBeats = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 6;

    const beats = await ctx.db
      .query("beats")
      .withIndex("by_featured", q => q.eq("featured", true))
      .filter(q => q.eq(q.field("isActive"), true))
      .order("desc")
      .take(limit);

    return beats;
  },
});

export const getBeatsByGenre = query({
  args: {
    genre: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const beats = await ctx.db
      .query("beats")
      .withIndex("by_genre", q => q.eq("genre", args.genre))
      .filter(q => q.eq(q.field("isActive"), true))
      .order("desc")
      .take(limit);

    return beats;
  },
});
