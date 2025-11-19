import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get user from Convex
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    // Verify user owns the file
    if (file.userId !== user._id && file.ownerId !== user._id) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.fileId);
  },
});
