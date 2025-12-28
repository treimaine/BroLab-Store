import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

export const getFile = query({
  args: {
    fileId: v.id("files"),
    clerkId: v.optional(v.string()), // For server-side calls from Express
  },
  handler: async (ctx, args) => {
    let userId;

    // Support both authenticated client calls and server-side calls with clerkId
    if (args.clerkId) {
      // Server-side call with explicit clerkId - look up user directly
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId!))
        .first();

      if (!user) {
        throw new Error("User not found");
      }
      userId = user._id;
    } else {
      // Client-side call with authentication - use auth helper
      const auth = await requireAuth(ctx);
      userId = auth.userId;
    }

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    // Verify user owns the file
    if (file.userId !== userId && file.ownerId !== userId) {
      throw new Error("Access denied");
    }

    return file;
  },
});
