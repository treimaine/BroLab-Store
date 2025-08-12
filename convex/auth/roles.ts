import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { validateClerkId, ValidationError } from "../lib/validation";

// Types de rôles disponibles
export type UserRole = "admin" | "moderator" | "premium" | "user" | "guest";

// Permissions par rôle
export const ROLE_PERMISSIONS = {
  admin: [
    "user.read",
    "user.write",
    "user.delete",
    "order.read",
    "order.write",
    "order.delete",
    "product.read",
    "product.write",
    "product.delete",
    "download.read",
    "download.write",
    "reservation.read",
    "reservation.write",
    "reservation.delete",
    "audit.read",
    "system.admin",
  ],
  moderator: [
    "user.read",
    "order.read",
    "order.write",
    "product.read",
    "download.read",
    "reservation.read",
    "reservation.write",
  ],
  premium: [
    "user.read",
    "order.read",
    "product.read",
    "download.read",
    "download.premium",
    "reservation.read",
    "reservation.write",
  ],
  user: [
    "user.read",
    "order.read",
    "product.read",
    "download.read",
    "reservation.read",
  ],
  guest: [
    "product.read",
  ],
} as const;

/**
 * Vérifier si un utilisateur a une permission spécifique
 */
export const hasPermission = query({
  args: {
    clerkId: v.string(),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Validation
      if (!validateClerkId(args.clerkId)) {
        throw new ValidationError("Invalid Clerk ID");
      }

      console.log(`🔐 Checking permission ${args.permission} for user: ${args.clerkId}`);

      // Récupérer l'utilisateur
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
        .first();

      if (!user) {
        console.log(`⚠️ User not found: ${args.clerkId}`);
        return false;
      }

      if (!user.isActive) {
        console.log(`🚫 User is inactive: ${args.clerkId}`);
        return false;
      }

      const userRole = (user.role || "user") as UserRole;
      const permissions = ROLE_PERMISSIONS[userRole] || [];
      const hasAccess = permissions.includes(args.permission as any);

      console.log(`${hasAccess ? '✅' : '❌'} Permission ${args.permission} for role ${userRole}: ${hasAccess}`);
      return hasAccess;
    } catch (error) {
      console.error(`❌ Error checking permission:`, error);
      return false;
    }
  },
});

/**
 * Obtenir toutes les permissions d'un utilisateur
 */
export const getUserPermissions = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Validation
      if (!validateClerkId(args.clerkId)) {
        throw new ValidationError("Invalid Clerk ID");
      }

      console.log(`📋 Getting permissions for user: ${args.clerkId}`);

      // Récupérer l'utilisateur
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
        .first();

      if (!user) {
        console.log(`⚠️ User not found: ${args.clerkId}`);
        return [];
      }

      if (!user.isActive) {
        console.log(`🚫 User is inactive: ${args.clerkId}`);
        return [];
      }

      const userRole = (user.role || "user") as UserRole;
      const permissions = ROLE_PERMISSIONS[userRole] || [];

      console.log(`✅ User ${args.clerkId} has ${permissions.length} permissions for role ${userRole}`);
      return permissions;
    } catch (error) {
      console.error(`❌ Error getting user permissions:`, error);
      return [];
    }
  },
});

/**
 * Mettre à jour le rôle d'un utilisateur (admin seulement)
 */
export const updateUserRole = mutation({
  args: {
    targetClerkId: v.string(),
    newRole: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      const adminClerkId = identity.subject;

      // Validation
      if (!validateClerkId(args.targetClerkId) || !validateClerkId(adminClerkId)) {
        throw new ValidationError("Invalid Clerk ID");
      }

      const validRoles: UserRole[] = ["admin", "moderator", "premium", "user", "guest"];
      if (!validRoles.includes(args.newRole as UserRole)) {
        throw new ValidationError(`Invalid role: ${args.newRole}`);
      }

      console.log(`🔄 Admin ${adminClerkId} updating role for ${args.targetClerkId} to ${args.newRole}`);

      // Vérifier que l'utilisateur actuel est admin
      const adminUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", adminClerkId))
        .first();

      if (!adminUser || adminUser.role !== "admin") {
        console.log(`🚫 Access denied: ${adminClerkId} is not admin`);
        throw new Error("Access denied: Admin role required");
      }

      // Récupérer l'utilisateur cible
      const targetUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.targetClerkId))
        .first();

      if (!targetUser) {
        throw new Error("Target user not found");
      }

      const previousRole = targetUser.role || "user";
      const now = Date.now();

      // Mettre à jour le rôle
      await ctx.db.patch(targetUser._id, {
        role: args.newRole,
        updatedAt: now,
      });

      // Log de l'activité
      await ctx.db.insert("activityLog", {
        userId: targetUser._id,
        action: "role_updated",
        details: {
          previousRole,
          newRole: args.newRole,
          updatedBy: adminClerkId,
          reason: args.reason,
        },
        timestamp: now,
      });

      // Audit log
      await ctx.db.insert("auditLogs", {
        userId: adminUser._id,
        clerkId: adminClerkId,
        action: "user_role_updated",
        resource: "user",
        details: {
          targetUserId: targetUser._id,
          targetClerkId: args.targetClerkId,
          previousRole,
          newRole: args.newRole,
          reason: args.reason,
        },
        timestamp: now,
      });

      console.log(`✅ Role updated: ${args.targetClerkId} from ${previousRole} to ${args.newRole}`);
      return {
        success: true,
        user: await ctx.db.get(targetUser._id),
      };
    } catch (error) {
      console.error(`❌ Error updating user role:`, error);
      
      // Log de l'erreur
      const identity = await ctx.auth.getUserIdentity();
      const errorMessage = error instanceof Error ? error.message : String(error);
      await ctx.db.insert("auditLogs", {
        clerkId: identity?.subject,
        action: "update_user_role_error",
        resource: "user",
        details: {
          error: errorMessage,
          targetClerkId: args.targetClerkId,
          newRole: args.newRole,
        },
        timestamp: Date.now(),
      });
      
      if (error instanceof ValidationError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      
      throw new Error(`Failed to update user role: ${errorMessage}`);
    }
  },
});

/**
 * Obtenir les utilisateurs par rôle (admin/moderator seulement)
 */
export const getUsersByRole = query({
  args: {
    role: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      const clerkId = identity.subject;
      const limit = args.limit || 50;

      console.log(`👥 Getting users with role ${args.role} for admin: ${clerkId}`);

      // Vérifier que l'utilisateur actuel a les permissions
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

      if (!currentUser || !['admin', 'moderator'].includes(currentUser.role || '')) {
        console.log(`🚫 Access denied: ${clerkId} lacks permissions`);
        throw new Error("Access denied: Admin or moderator role required");
      }

      // Récupérer les utilisateurs par rôle
      const users = await ctx.db
        .query("users")
        .withIndex("by_role", q => q.eq("role", args.role))
        .take(limit);

      console.log(`✅ Found ${users.length} users with role ${args.role}`);
      return users;
    } catch (error) {
      console.error(`❌ Error getting users by role:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get users by role: ${errorMessage}`);
    }
  },
});

/**
 * Middleware pour vérifier les permissions
 */
export async function requirePermission(
  ctx: any,
  permission: string,
  clerkId?: string
): Promise<boolean> {
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userClerkId = clerkId || identity.subject;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", userClerkId))
      .first();

    if (!user || !user.isActive) {
      return false;
    }

    const userRole = (user.role || "user") as UserRole;
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    
    return permissions.includes(permission as any);
  } catch (error) {
    console.error(`❌ Error checking permission:`, error);
    return false;
  }
}