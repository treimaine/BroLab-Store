import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

export const removeFromFavorites = mutation({
  args: {
    beatId: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_beat", q => q.eq("userId", userId).eq("beatId", args.beatId))
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
      return true;
    }

    return false;
  },
});
