import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserStats, getUserStatsByClerkId } from "./users/getUserStats";

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    return user;
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", email))
      .first();

    return user;
  },
});

// Get user by username (using filter since no index exists)
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("username"), username))
      .first();

    return user;
  },
});

// Get user by ID
export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const user = await ctx.db.get(id);
    return user;
  },
});

// Create or update user
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update existing user
      const userId = await ctx.db.patch(existingUser._id, {
        email: args.email,
        username: args.username,
        firstName: args.fullName?.split(" ")[0],
        lastName: args.fullName?.split(" ").slice(1).join(" "),
        imageUrl: args.avatarUrl,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(existingUser._id);
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        username: args.username || `user_${args.clerkId.slice(-8)}`,
        firstName: args.fullName?.split(" ")[0],
        lastName: args.fullName?.split(" ").slice(1).join(" "),
        imageUrl: args.avatarUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return await ctx.db.get(userId);
    }
  },
});

// Update user avatar
export const updateUserAvatar = mutation({
  args: {
    clerkId: v.string(),
    avatarUrl: v.string(),
  },
  handler: async (ctx, { clerkId, avatarUrl }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      imageUrl: avatarUrl,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

// Re-export getUserStats functions
export { getUserStats, getUserStatsByClerkId };
