import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

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

    const fileId = await ctx.db.insert("files", {
      userId,
      filename: args.filename,
      originalName: args.originalName,
      storagePath: args.storagePath,
      mimeType: args.mimeType,
      size: args.size,
      role: args.role,
      reservationId: args.reservationId,
      orderId: args.orderId,
      ownerId: userId,
      createdAt: Date.now(),
    });

    return fileId;
  },
});
