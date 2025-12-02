import { v } from "convex/values";
import { query } from "../_generated/server";

export const getFile = query({
  args: {
    fileId: v.id("files"),
    clerkId: v.optional(v.string()), // For server-side calls from Express
  },
  handler: async (ctx, args) => {
    let clerkIdToUse: string;

    // Support both authenticated client calls and server-side calls with clerkId
    if (args.clerkId) {
      // Server-side call with explicit clerkId
      clerkIdToUse = args.clerkId;
    } else {
      // Client-side call with authentication
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Unauthorized");
      }
      clerkIdToUse = identity.subject;
    }

    // Get user from Convex
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkIdToUse))
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

    return file;
  },
});
