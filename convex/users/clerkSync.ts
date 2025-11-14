import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create or update a user from Clerk with robust error handling
 */
export const syncClerkUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`🔄 Syncing Clerk user: ${args.clerkId} (${args.email})`);

      // Validate input data
      if (!args.clerkId || !args.email) {
        throw new Error("ClerkId and email are required");
      }

      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
        .first();

      const now = Date.now();

      // Determine the best username to use
      // Priority: existing valid username > Clerk username > auto-generated
      const clerkUsername = args.username || `user_${args.clerkId.slice(-8)}`;
      const hasValidClerkUsername = args.username && !args.username.startsWith("user_");
      const hasValidExistingUsername =
        existingUser?.username && !existingUser.username.startsWith("user_");

      let finalUsername: string;
      if (existingUser) {
        // Preserve existing username unless Clerk has a better one
        if (hasValidExistingUsername && existingUser.username) {
          finalUsername = existingUser.username;
        } else if (hasValidClerkUsername) {
          finalUsername = clerkUsername;
        } else {
          finalUsername = existingUser.username || clerkUsername;
        }
      } else {
        finalUsername = clerkUsername;
      }

      const userData = {
        email: args.email,
        username: finalUsername,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        role: args.role || "user",
        isActive: true,
        lastLoginAt: now,
        metadata: args.metadata,
        updatedAt: now,
      };

      if (existingUser) {
        // Update existing user - username is preserved unless Clerk has a better one
        await ctx.db.patch(existingUser._id, userData);

        // Log user login activity
        await ctx.db.insert("activityLog", {
          userId: existingUser._id,
          action: "user_login",
          details: { source: "clerk_sync", updated: true },
          timestamp: now,
        });

        console.log(`✅ Updated user: ${args.clerkId}`);
        return {
          success: true,
          action: "updated",
          userId: existingUser._id,
          user: await ctx.db.get(existingUser._id),
        };
      } else {
        // Create new user
        const userId = await ctx.db.insert("users", {
          clerkId: args.clerkId,
          ...userData,
          createdAt: now,
        });

        // Log user creation activity
        await ctx.db.insert("activityLog", {
          userId,
          action: "user_created",
          details: { source: "clerk_sync", email: args.email },
          timestamp: now,
        });

        console.log(`✅ Created new user: ${args.clerkId}`);
        return {
          success: true,
          action: "created",
          userId,
          user: await ctx.db.get(userId),
        };
      }
    } catch (error) {
      console.error(`❌ Error syncing user:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log sync error to audit logs
      await ctx.db.insert("auditLogs", {
        clerkId: args.clerkId,
        action: "sync_user_error",
        resource: "users",
        details: {
          operation: "sync",
          resource: "users",
          error: errorMessage,
          clerkId: args.clerkId,
        },
        timestamp: Date.now(),
      });

      throw new Error(`Failed to sync user: ${errorMessage}`);
    }
  },
});

/**
 * Get a user by their Clerk ID
 */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();
  },
});

/**
 * Get a user by their email
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", email))
      .first();
  },
});

/**
 * Delete a user (when deleted from Clerk) with secure handling
 */
export const deleteClerkUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    try {
      console.log(`🗑️ Attempting to delete user: ${clerkId}`);

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

      if (!user) {
        console.log(`⚠️ User not found for deletion: ${clerkId}`);
        return { success: false, message: "User not found" };
      }

      // Instead of deleting, deactivate the user to preserve data integrity
      await ctx.db.patch(user._id, {
        isActive: false,
        updatedAt: Date.now(),
        metadata: {
          ...user.metadata,
          lastActiveAt: Date.now(),
        },
      });

      // Log deletion activity
      await ctx.db.insert("activityLog", {
        userId: user._id,
        action: "user_deactivated",
        details: {
          source: "clerk_deletion",
          reason: "User deleted from Clerk",
        },
        timestamp: Date.now(),
      });

      // Audit log
      await ctx.db.insert("auditLogs", {
        userId: user._id,
        clerkId: clerkId,
        action: "user_deactivated",
        resource: "users",
        details: {
          operation: "update",
          resource: "users",
          resourceId: user._id,
          reason: "clerk_user_deleted",
          preservedData: true,
          changes: [
            {
              field: "isActive",
              oldValue: "true",
              newValue: "false",
              changeType: "update" as const,
            },
          ],
        },
        timestamp: Date.now(),
      });

      console.log(`✅ Deactivated user: ${clerkId}`);
      return {
        success: true,
        message: "User deactivated (data preserved)",
        action: "deactivated",
      };
    } catch (error) {
      console.error(`❌ Error deleting user:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log deletion error to audit logs
      await ctx.db.insert("auditLogs", {
        clerkId: clerkId,
        action: "user_deletion_error",
        resource: "users",
        details: {
          operation: "delete",
          resource: "users",
          clerkId: clerkId,
          error: errorMessage,
        },
        timestamp: Date.now(),
      });

      throw new Error(`Failed to delete user: ${errorMessage}`);
    }
  },
});

/**
 * Get user statistics
 */
export const getUserStats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Count favorites
    const favoritesCount = await ctx.db
      .query("favorites")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect()
      .then(favorites => favorites.length);

    // Count downloads
    const downloadsCount = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect()
      .then(downloads => downloads.length);

    // Count orders
    const ordersCount = await ctx.db
      .query("orders")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect()
      .then(orders => orders.length);

    return {
      userId: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      stats: {
        favoritesCount,
        downloadsCount,
        ordersCount,
      },
    };
  },
});

/**
 * Force sync current authenticated user from Clerk identity
 */
export const forceSyncCurrentUser = mutation({
  args: {},
  handler: async ctx => {
    try {
      // Get current user identity from Clerk
      const identity = await ctx.auth.getUserIdentity();

      if (!identity) {
        throw new Error("Not authenticated");
      }

      console.log(`🔄 Force syncing current user: ${identity.subject}`);

      // Extract user data from Clerk identity
      const userData = {
        clerkId: identity.subject,
        email: identity.email || "",
        // Use username from Clerk, not fullName (identity.name)
        // Convert to string to ensure type safety
        username:
          (typeof identity.username === "string" ? identity.username : undefined) ||
          `user_${identity.subject.slice(-8)}`,
        firstName: identity.givenName,
        lastName: identity.familyName,
        imageUrl: identity.pictureUrl,
      };

      // Call the sync function directly instead of using runMutation to avoid circular type issues
      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", userData.clerkId))
        .first();

      const now = Date.now();

      // Prepare update data - preserve existing username if it exists and is not auto-generated
      const hasValidClerkUsername = userData.username && !userData.username.startsWith("user_");
      const hasValidExistingUsername =
        existingUser?.username && !existingUser.username.startsWith("user_");

      // Determine the best username to use
      let finalUsername: string;
      if (existingUser) {
        // Preserve existing username unless Clerk has a better one
        if (hasValidExistingUsername && existingUser.username) {
          finalUsername = existingUser.username;
        } else if (hasValidClerkUsername) {
          finalUsername = userData.username;
        } else {
          finalUsername = existingUser.username || userData.username;
        }
      } else {
        finalUsername = userData.username;
      }

      const userDataWithDefaults = {
        email: userData.email,
        username: finalUsername,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        role: "user",
        isActive: true,
        lastLoginAt: now,
        updatedAt: now,
      };

      if (existingUser) {
        // Update existing user - username is preserved unless Clerk has a better one
        await ctx.db.patch(existingUser._id, userDataWithDefaults);

        // Log user login activity
        await ctx.db.insert("activityLog", {
          userId: existingUser._id,
          action: "user_login",
          details: { source: "force_sync", updated: true },
          timestamp: now,
        });

        console.log(`✅ Force sync updated user: ${userData.clerkId}`);
        return {
          success: true,
          action: "updated",
          userId: existingUser._id,
          user: await ctx.db.get(existingUser._id),
        };
      } else {
        // Create new user
        const userId = await ctx.db.insert("users", {
          clerkId: userData.clerkId,
          ...userDataWithDefaults,
          createdAt: now,
        });

        // Log user creation activity
        await ctx.db.insert("activityLog", {
          userId,
          action: "user_created",
          details: { source: "force_sync", email: userData.email },
          timestamp: now,
        });

        console.log(`✅ Force sync created new user: ${userData.clerkId}`);
        return {
          success: true,
          action: "created",
          userId,
          user: await ctx.db.get(userId),
        };
      }
    } catch (error) {
      console.error(`❌ Error force syncing user:`, error);
      throw error;
    }
  },
});
