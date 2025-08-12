import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const addToFavorites = mutation({
  args: {
    beatId: v.number(),
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

    return await ctx.db.insert("favorites", {
      userId: user._id,
      beatId: args.beatId,
      createdAt: Date.now(),
    });
  },
});
