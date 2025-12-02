import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createFile = mutation({
  args: {
    filename: v.string(),
    originalName: v.string(),
    storagePath: v.string(),
    mimeType: v.string(),
    size: v.number(),
    role: v.union(v.literal("upload"), v.literal("deliverable"), v.literal("invoice")),
    reservationId: v.optional(v.id("reservations")),
    orderId: v.optional(v.id("orders")),
    clerkId: v.optional(v.string()), // For server-side calls from Express
  },
  handler: async (ctx, args): Promise<string> => {
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

    const fileId = await ctx.db.insert("files", {
      userId: user._id,
      filename: args.filename,
      originalName: args.originalName,
      storagePath: args.storagePath,
      mimeType: args.mimeType,
      size: args.size,
      role: args.role,
      reservationId: args.reservationId,
      orderId: args.orderId,
      ownerId: user._id,
      createdAt: Date.now(),
    });

    return fileId;
  },
});
