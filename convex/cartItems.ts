import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  AuthenticationError,
  UserNotFoundError,
  optionalAuth,
  requireAuth,
} from "./lib/authHelpers";

/**
 * Cart Items - Convex functions for shopping cart persistence
 * Uses centralized auth helpers for consistent authentication
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
    let userId: Id<"users">;
    let clerkId: string;

    try {
      const auth = await requireAuth(ctx);
      userId = auth.userId;
      clerkId = auth.clerkId;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw new Error("Not authenticated");
      }
      if (error instanceof UserNotFoundError) {
        // Create user if they don't exist (first-time sync)
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        userId = await ctx.db.insert("users", {
          clerkId: identity.subject,
          email: identity.email || "",
          username: identity.name || `user_${identity.subject.slice(-8)}`,
          firstName: identity.givenName || "",
          lastName: identity.familyName || "",
          imageUrl: identity.pictureUrl || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        clerkId = identity.subject;
      } else {
        throw error;
      }
    }

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
        clerkId,
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
        clerkId,
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
    const auth = await optionalAuth(ctx);
    if (!auth) return [];

    // Query cart items by userId using by_user index
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
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
    let userId: Id<"users">;

    try {
      const auth = await requireAuth(ctx);
      userId = auth.userId;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw new Error("Not authenticated");
      }
      if (error instanceof UserNotFoundError) {
        // Create user if they don't exist
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        userId = await ctx.db.insert("users", {
          clerkId: identity.subject,
          email: identity.email || "",
          username: identity.name || `user_${identity.subject.slice(-8)}`,
          firstName: identity.givenName || "",
          lastName: identity.familyName || "",
          imageUrl: identity.pictureUrl || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        throw error;
      }
    }

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
    const { userId } = await requireAuth(ctx);

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", userId))
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
    const { userId } = await requireAuth(ctx);

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", userId))
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
    const auth = await optionalAuth(ctx);
    if (!auth) {
      throw new Error("Not authenticated");
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    return { success: true, deletedCount: items.length };
  },
});
