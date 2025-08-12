import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Créer ou mettre à jour un utilisateur depuis Clerk avec gestion d'erreurs robuste
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

      // Validation des données d'entrée
      if (!args.clerkId || !args.email) {
        throw new Error("ClerkId and email are required");
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
        .first();

      const now = Date.now();
      const userData = {
        email: args.email,
        username: args.username || `user_${args.clerkId.slice(-8)}`,
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
        // Mettre à jour l'utilisateur existant
        await ctx.db.patch(existingUser._id, userData);

        // Log de l'activité
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
          user: await ctx.db.get(existingUser._id)
        };
      } else {
        // Créer un nouvel utilisateur
        const userId = await ctx.db.insert("users", {
          clerkId: args.clerkId,
          ...userData,
          createdAt: now,
        });

        // Log de l'activité de création
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
          user: await ctx.db.get(userId)
        };
      }
    } catch (error) {
      console.error(`❌ Error syncing user:`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log de l'erreur
      await ctx.db.insert("auditLogs", {
        clerkId: args.clerkId,
        action: "sync_user_error",
        resource: "user",
        details: {
          error: errorMessage,
          clerkId: args.clerkId,
        },
        timestamp: Date.now(),
      });
      
      throw new Error(`Failed to sync user: ${errorMessage}`);
    }
  },
});

// Obtenir un utilisateur par son Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();
  },
});

// Obtenir un utilisateur par son email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", email))
      .first();
  },
});

// Supprimer un utilisateur (quand supprimé de Clerk) avec gestion sécurisée
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

      // Au lieu de supprimer, désactiver l'utilisateur pour préserver l'intégrité des données
      await ctx.db.patch(user._id, {
        isActive: false,
        updatedAt: Date.now(),
        metadata: {
          ...user.metadata,
          deletedAt: Date.now(),
          deletionReason: "clerk_user_deleted"
        }
      });

      // Log de l'activité de suppression
      await ctx.db.insert("activityLog", {
        userId: user._id,
        action: "user_deactivated",
        details: { 
          source: "clerk_deletion",
          reason: "User deleted from Clerk"
        },
        timestamp: Date.now(),
      });

      // Audit log
      await ctx.db.insert("auditLogs", {
        userId: user._id,
        clerkId: clerkId,
        action: "user_deactivated",
        resource: "user",
        details: { 
          reason: "clerk_user_deleted",
          preservedData: true
        },
        timestamp: Date.now(),
      });

      console.log(`✅ Deactivated user: ${clerkId}`);
      return { 
        success: true, 
        message: "User deactivated (data preserved)",
        action: "deactivated"
      };
    } catch (error) {
      console.error(`❌ Error deleting user:`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log de l'erreur
      await ctx.db.insert("auditLogs", {
        clerkId: clerkId,
        action: "user_deletion_error",
        resource: "user",
        details: {
          clerkId: clerkId,
          error: errorMessage,
        },
        timestamp: Date.now(),
      });
      
      throw new Error(`Failed to delete user: ${errorMessage}`);
    }
  },
});

// Obtenir les statistiques d'un utilisateur
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

    // Compter les favoris
    const favoritesCount = await ctx.db
      .query("favorites")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect()
      .then(favorites => favorites.length);

    // Compter les téléchargements
    const downloadsCount = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect()
      .then(downloads => downloads.length);

    // Compter les commandes
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
