import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Cart Items - Convex functions for shopping cart persistence
 * Follows the pattern from convex/favorites/ for consistency
 */

// Sync cart items for authenticated user (batch update)
export const syncCart = mutation({
  args: {
    items: v.array(
      v.object({
        beatId: v.number(),
        licenseType: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get or create user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    const userId = existingUser
      ? existingUser._id
      : await ctx.db.insert("users", {
          clerkId: identity.subject,
          email: identity.email || "",
          username: identity.name || `user_${identity.subject.slice(-8)}`,
          firstName: identity.givenName || "",
          lastName: identity.familyName || "",
          imageUrl: identity.pictureUrl || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

    try {
      // Delete existing cart items for this user
      const existingItems = await ctx.db
        .query("cartItems")
        .withIndex("by_user", q => q.eq("userId", userId))
        .collect();

      for (const item of existingItems) {
        await ctx.db.delete(item._id);
      }

      // Insert new cart items in a single transaction
      const insertedIds = [];
      for (const item of args.items) {
        const id = await ctx.db.insert("cartItems", {
          userId,
          beatId: item.beatId,
          licenseType: item.licenseType,
          price: item.price,
          quantity: item.quantity,
          createdAt: Date.now(),
        });
        insertedIds.push(id);
      }

      // Log successful sync to audit
      await ctx.db.insert("auditLogs", {
        userId,
        clerkId: identity.subject,
        action: "cart_synced",
        resource: "cartItems",
        details: {
          itemCount: args.items.length,
          operation: "sync",
        },
        timestamp: Date.now(),
      });

      return {
        success: true,
        itemCount: insertedIds.length,
      };
    } catch (error) {
      // Log sync error to audit
      await ctx.db.insert("auditLogs", {
        userId,
        clerkId: identity.subject,
        action: "cart_sync_failed",
        resource: "cartItems",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          itemCount: args.items.length,
        },
        timestamp: Date.now(),
      });

      throw error;
    }
  },
});

// Load cart items for authenticated user
export const loadCart = query({
  args: {},
  handler: async ctx => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Query cart items by userId using by_user index
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    // Return cart items with beat details
    const itemsWithBeats = await Promise.all(
      cartItems.map(async item => {
        const beat = await ctx.db
          .query("beats")
          .withIndex("by_wordpress_id", q => q.eq("wordpressId", item.beatId))
          .first();

        return {
          id: `${item.beatId}-${item.licenseType}`,
          productId: item.beatId,
          name: beat?.title || "Unknown Beat",
          price: item.price,
          licenseName: item.licenseType,
          quantity: item.quantity || 1,
          image: beat?.imageUrl,
          beatData: beat,
        };
      })
    );

    return itemsWithBeats;
  },
});

// Add single item to cart
export const addItem = mutation({
  args: {
    beatId: v.number(),
    licenseType: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    const userId = existingUser
      ? existingUser._id
      : await ctx.db.insert("users", {
          clerkId: identity.subject,
          email: identity.email || "",
          username: identity.name || `user_${identity.subject.slice(-8)}`,
          firstName: identity.givenName || "",
          lastName: identity.familyName || "",
          imageUrl: identity.pictureUrl || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

    // Check if item already exists
    const existingItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    const existingItem = existingItems.find(
      item => item.beatId === args.beatId && item.licenseType === args.licenseType
    );

    if (existingItem) {
      // Update quantity
      await ctx.db.patch(existingItem._id, {
        quantity: (existingItem.quantity || 1) + 1,
      });
      return existingItem._id;
    }

    // Insert new item
    return await ctx.db.insert("cartItems", {
      userId,
      beatId: args.beatId,
      licenseType: args.licenseType,
      price: args.price,
      quantity: 1,
      createdAt: Date.now(),
    });
  },
});

// Remove item from cart
export const removeItem = mutation({
  args: {
    beatId: v.number(),
    licenseType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    const item = items.find(i => i.beatId === args.beatId && i.licenseType === args.licenseType);

    if (item) {
      await ctx.db.delete(item._id);
      return true;
    }

    return false;
  },
});

// Update item quantity
export const updateQuantity = mutation({
  args: {
    beatId: v.number(),
    licenseType: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    const item = items.find(i => i.beatId === args.beatId && i.licenseType === args.licenseType);

    if (item) {
      if (args.quantity <= 0) {
        await ctx.db.delete(item._id);
      } else {
        await ctx.db.patch(item._id, {
          quantity: args.quantity,
        });
      }
      return true;
    }

    return false;
  },
});

// Clear all cart items for user
export const clearCart = mutation({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { success: true, deletedCount: 0 };
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    return { success: true, deletedCount: items.length };
  },
});
