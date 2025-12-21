import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const addToFavorites = mutation({
  args: {
    beatId: v.number(),
    // Optional beat metadata for enrichment
    beatTitle: v.optional(v.string()),
    beatGenre: v.optional(v.string()),
    beatImageUrl: v.optional(v.string()),
    beatAudioUrl: v.optional(v.string()),
    beatPrice: v.optional(v.number()),
    beatBpm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      // Créer l'utilisateur s'il n'existe pas
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        email: identity.email || "",
        username: identity.name || `user_${identity.subject.slice(-8)}`,
        firstName: identity.givenName || "",
        lastName: identity.familyName || "",
        imageUrl: identity.pictureUrl || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return await ctx.db.insert("favorites", {
        userId,
        beatId: args.beatId,
        createdAt: Date.now(),
      });
    }

    // Vérifier si déjà en favoris
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_beat", q => q.eq("userId", user._id).eq("beatId", args.beatId))
      .first();

    if (existing) return existing;

    // Ensure beat exists in Convex with metadata for dashboard display
    const existingBeat = await ctx.db
      .query("beats")
      .withIndex("by_wordpress_id", q => q.eq("wordpressId", args.beatId))
      .first();

    if (!existingBeat) {
      // Create beat record if it doesn't exist
      await ctx.db.insert("beats", {
        wordpressId: args.beatId,
        title: args.beatTitle || `Beat ${args.beatId}`,
        genre: args.beatGenre || "Unknown",
        bpm: args.beatBpm || 0,
        price: args.beatPrice ? Math.round(args.beatPrice * 100) : 0, // Convert to cents
        imageUrl: args.beatImageUrl,
        audioUrl: args.beatAudioUrl,
        views: 0,
        downloads: 0,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else if (args.beatImageUrl && existingBeat.imageUrl !== args.beatImageUrl) {
      // Always update beat with the latest imageUrl from WordPress if different
      // This ensures the dashboard shows the same image as the shop
      await ctx.db.patch(existingBeat._id, {
        imageUrl: args.beatImageUrl,
        title: args.beatTitle || existingBeat.title,
        genre: args.beatGenre || existingBeat.genre,
        updatedAt: Date.now(),
      });
    }

    return await ctx.db.insert("favorites", {
      userId: user._id,
      beatId: args.beatId,
      createdAt: Date.now(),
    });
  },
});
