/**
 * Authorization utilities for role-based access control
 * Single source of truth for permission checks across the application
 */

import { UserRole } from "../../shared/types/User";

/**
 * User type for authorization checks
 * Compatible with Express req.user
 */
interface AuthUser {
  id?: string | number;
  clerkId?: string;
  role?: string;
  email?: string;
  username?: string;
}

/**
 * Nullable user type helper
 */
type NullableUser = AuthUser | undefined | null;

/**
 * Nullable resource ID type helper
 */
type NullableResourceId = string | number | undefined | null;

/**
 * Check if user has admin role
 * Uses UserRole.ADMIN enum for consistency
 */
export function isAdmin(user: NullableUser): boolean {
  if (!user) return false;
  return user.role === UserRole.ADMIN || user.role === "admin";
}

/**
 * Check if user is the owner of a resource
 */
export function isOwner(user: NullableUser, resourceUserId: NullableResourceId): boolean {
  if (!user?.id || !resourceUserId) return false;
  return String(user.id) === String(resourceUserId);
}

/**
 * Check if user can access a resource (admin OR owner)
 * Most common authorization pattern for user-owned resources
 */
export function canAccessResource(user: NullableUser, resourceUserId: NullableResourceId): boolean {
  if (isAdmin(user)) return true;
  return isOwner(user, resourceUserId);
}

/**
 * Authorization result for explicit error handling
 */
export interface AuthzResult {
  authorized: boolean;
  reason?: "unauthenticated" | "forbidden";
}

/**
 * Check authorization with explicit result
 * Useful when you need to return different HTTP status codes
 */
export function checkResourceAccess(
  user: NullableUser,
  resourceUserId: NullableResourceId
): AuthzResult {
  if (!user) {
    return { authorized: false, reason: "unauthenticated" };
  }
  if (!canAccessResource(user, resourceUserId)) {
    return { authorized: false, reason: "forbidden" };
  }
  return { authorized: true };
}
