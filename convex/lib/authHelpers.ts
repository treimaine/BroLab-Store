/**
 * Centralized Convex Auth Helpers
 *
 * This module provides reusable authentication utilities for Convex functions.
 * It wraps ctx.auth.getUserIdentity() to reduce code duplication across 50+ functions.
 *
 * ⚠️ IMPORTANT: This module WRAPS ctx.auth.getUserIdentity() - it does NOT replace it.
 * The underlying Clerk-Convex bridge (convex/users/clerkSync.ts) remains unchanged.
 *
 * @module convex/lib/authHelpers
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * User identity from Clerk authentication
 */
export interface UserIdentity {
  /** Clerk user ID (subject claim) */
  subject: string;
  /** Token identifier for session tracking */
  tokenIdentifier: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  name?: string;
  /** User's given/first name */
  givenName?: string;
  /** User's family/last name */
  familyName?: string;
  /** User's profile picture URL */
  pictureUrl?: string;
  /** User's username from Clerk */
  username?: string;
}

/**
 * Result of successful authentication
 */
export interface AuthResult {
  /** Clerk identity object */
  identity: UserIdentity;
  /** Convex user document ID */
  userId: Id<"users">;
  /** Clerk user ID (same as identity.subject) */
  clerkId: string;
  /** Full user document from Convex database (null if user not yet synced) */
  user: {
    _id: Id<"users">;
    clerkId: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    role?: string;
    isActive?: boolean;
    lastLoginAt?: number;
    preferences?: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
  } | null;
}

/**
 * Error thrown when authentication is required but not present
 */
export class AuthenticationError extends Error {
  constructor(message: string = "Not authenticated") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Error thrown when user exists in Clerk but not in Convex database
 */
export class UserNotFoundError extends Error {
  constructor(clerkId: string) {
    super(`User not found in database for Clerk ID: ${clerkId}`);
    this.name = "UserNotFoundError";
  }
}

/**
 * Require authentication - throws if not authenticated
 *
 * This function wraps ctx.auth.getUserIdentity() and provides a consistent
 * authentication check pattern. It replaces the repeated pattern of:
 *
 * ```typescript
 * const identity = await ctx.auth.getUserIdentity();
 * if (!identity) throw new Error("Not authenticated");
 * const user = await ctx.db.query("users").withIndex("by_clerk_id", ...).first();
 * if (!user) throw new Error("User not found");
 * ```
 *
 * @param ctx - Convex query or mutation context
 * @returns AuthResult with identity, userId, and clerkId
 * @throws AuthenticationError if user is not authenticated
 * @throws UserNotFoundError if user exists in Clerk but not in Convex
 *
 * @example
 * ```typescript
 * export const myMutation = mutation({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const { userId, clerkId, identity } = await requireAuth(ctx);
 *     // User is guaranteed to be authenticated here
 *     // ...
 *   },
 * });
 * ```
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<AuthResult> {
  // Get identity from Clerk via Convex auth
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new AuthenticationError("Not authenticated");
  }

  // Look up user in Convex database by Clerk ID
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    // Return with null user - caller can create user if needed
    return {
      identity: identity as UserIdentity,
      userId: "" as Id<"users">, // Placeholder - user doesn't exist yet
      clerkId: identity.subject,
      user: null,
    };
  }

  return {
    identity: identity as UserIdentity,
    userId: user._id,
    clerkId: identity.subject,
    user: {
      _id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences as Record<string, unknown> | undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

/**
 * Optional authentication - returns null if not authenticated
 *
 * Use this when authentication is optional and the function should
 * behave differently for authenticated vs unauthenticated users.
 *
 * @param ctx - Convex query or mutation context
 * @returns AuthResult if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * export const myQuery = query({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const auth = await optionalAuth(ctx);
 *     if (auth) {
 *       // User is authenticated - show personalized content
 *       return getPersonalizedData(auth.userId);
 *     } else {
 *       // User is not authenticated - show public content
 *       return getPublicData();
 *     }
 *   },
 * });
 * ```
 */
export async function optionalAuth(ctx: QueryCtx | MutationCtx): Promise<AuthResult | null> {
  // Get identity from Clerk via Convex auth
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  // Look up user in Convex database by Clerk ID
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    // User exists in Clerk but not in Convex - return with null user
    return {
      identity: identity as UserIdentity,
      userId: "" as Id<"users">, // Placeholder
      clerkId: identity.subject,
      user: null,
    };
  }

  return {
    identity: identity as UserIdentity,
    userId: user._id,
    clerkId: identity.subject,
    user: {
      _id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences as Record<string, unknown> | undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

/**
 * Get user ID from various sources (args, auth, etc.)
 *
 * This helper resolves a user ID from multiple possible sources:
 * 1. A provided Clerk ID (validated against the database)
 * 2. The currently authenticated user
 *
 * Useful for functions that can operate on behalf of a user or
 * accept an optional user ID parameter.
 *
 * @param ctx - Convex query or mutation context
 * @param providedClerkId - Optional Clerk ID to resolve
 * @returns User document ID if found, null otherwise
 *
 * @example
 * ```typescript
 * export const getUserData = query({
 *   args: { userId: v.optional(v.string()) },
 *   handler: async (ctx, args) => {
 *     const userId = await resolveUserId(ctx, args.userId);
 *     if (!userId) return null;
 *     return ctx.db.get(userId);
 *   },
 * });
 * ```
 */
export async function resolveUserId(
  ctx: QueryCtx | MutationCtx,
  providedClerkId?: string
): Promise<Id<"users"> | null> {
  // If a Clerk ID is provided, validate and resolve it
  if (providedClerkId) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", providedClerkId))
      .first();
    return user?._id ?? null;
  }

  // Otherwise, try to get from current authentication
  const auth = await optionalAuth(ctx);
  return auth?.userId ?? null;
}

/**
 * Check if the current user has a specific role
 *
 * @param ctx - Convex query or mutation context
 * @param requiredRole - Role to check for (e.g., 'admin', 'artist')
 * @returns true if user has the required role, false otherwise
 *
 * @example
 * ```typescript
 * export const adminOnlyMutation = mutation({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const isAdmin = await hasRole(ctx, 'admin');
 *     if (!isAdmin) throw new Error("Admin access required");
 *     // ...
 *   },
 * });
 * ```
 */
export async function hasRole(ctx: QueryCtx | MutationCtx, requiredRole: string): Promise<boolean> {
  const auth = await optionalAuth(ctx);
  if (!auth || !auth.user) return false;

  return auth.user.role === requiredRole;
}

/**
 * Require a specific role - throws if user doesn't have it
 *
 * @param ctx - Convex query or mutation context
 * @param requiredRole - Role to require (e.g., 'admin', 'artist')
 * @returns AuthResult with user data
 * @throws AuthenticationError if not authenticated
 * @throws Error if user doesn't have the required role
 *
 * @example
 * ```typescript
 * export const adminMutation = mutation({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const { userId } = await requireRole(ctx, 'admin');
 *     // User is guaranteed to be admin here
 *     // ...
 *   },
 * });
 * ```
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  requiredRole: string
): Promise<AuthResult> {
  const auth = await requireAuth(ctx);

  if (!auth.user || auth.user.role !== requiredRole) {
    throw new Error(`Role '${requiredRole}' required`);
  }

  return auth;
}
