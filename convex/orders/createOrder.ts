import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createOrder = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.number(),
        name: v.string(),
        price: v.number(),
        license: v.string(),
        quantity: v.number(),
      })
    ),
    total: v.number(),
    email: v.string(),
    status: v.string(),
    paymentId: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Vous devez être connecté pour créer une commande");
    }

    const clerkId = identity.subject;

    // Get or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      // Créer l'utilisateur s'il n'existe pas
      const email = (identity.emailAddresses as any)?.[0]?.emailAddress || "";
      const username =
        (identity.username as string) ||
        email.split("@")[0] ||
        `user_${identity.subject.slice(-8)}`;
      const firstName = (identity.firstName as string) || undefined;
      const lastName = (identity.lastName as string) || undefined;
      const imageUrl = (identity.imageUrl as string) || undefined;

      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        email,
        username,
        firstName,
        lastName,
        imageUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      user = await ctx.db.get(userId);
      console.log(`✅ Created new user for order: ${userId}`);
    }

    if (!user) {
      throw new Error("Failed to create or find user");
    }

    // Create order
    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      email: args.email,
      total: args.total,
      status: args.status,
      items: args.items,
      paymentId: args.paymentId,
      paymentStatus: args.paymentStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(`✅ Created order: ${orderId} for user: ${user._id}`);

    return {
      success: true,
      orderId,
      message: "Order created successfully",
    };
  },
});
