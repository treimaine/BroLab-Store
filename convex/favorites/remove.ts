import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const removeFromFavorites = mutation({
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

    if (!user) throw new Error("User not found");

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_beat", q => q.eq("userId", user._id).eq("beatId", args.beatId))
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
      return true;
    }

    return false;
  },
});
