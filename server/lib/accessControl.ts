// server/lib/accessControl.ts
import type { User } from "../../shared/schema";

// Type minimal pour un produit (pour les règles d'accès avancées)
export type ProductLike = {
  id?: number;
  isExclusive?: boolean;
};

// Extended user type with access control properties
export interface AccessControlUser extends User {
  role?: "admin" | "user" | "moderator";
  plan?: "basic" | "artist" | "ultimate" | "free";
  trialActive?: boolean;
}

/**
 * Quota information for download limits
 * Used to enforce monthly download quotas for basic plan users
 */
export interface QuotaInfo {
  /** Current number of downloads used this month */
  used: number;
  /** Maximum downloads allowed per month (-1 for unlimited) */
  limit: number;
  /** Timestamp when the quota resets */
  resetAt: number;
}

/**
 * Monthly download limits by plan type
 * - basic: 10 downloads/month
 * - artist: 50 downloads/month
 * - ultimate: unlimited (-1)
 * - free/trial: 3 downloads/month
 */
export const PLAN_DOWNLOAD_LIMITS: Record<string, number> = {
  basic: 10,
  artist: 50,
  ultimate: -1, // unlimited
  free: 3,
  trial: 3,
};

/**
 * Check if user has remaining quota for downloads
 */
export function hasRemainingQuota(quota: QuotaInfo | undefined, plan?: string): boolean {
  // Ultimate plan has unlimited downloads
  if (plan === "ultimate") return true;

  // No quota info means we can't verify - deny by default for safety
  if (!quota) return false;

  // Unlimited quota (-1 limit)
  if (quota.limit === -1) return true;

  // Check if quota is exceeded
  return quota.used < quota.limit;
}

/**
 * Get remaining downloads for a user
 */
export function getRemainingDownloads(quota: QuotaInfo | undefined, plan?: string): number {
  // Ultimate plan has unlimited downloads
  if (plan === "ultimate") return -1; // -1 indicates unlimited

  // No quota info
  if (!quota) return 0;

  // Unlimited quota
  if (quota.limit === -1) return -1;

  // Calculate remaining
  return Math.max(0, quota.limit - quota.used);
}

/**
 * Type guard to safely access access control properties on user
 */
function getUserAccessProps(user: User): AccessControlUser {
  return user as AccessControlUser;
}

/**
 * Centralized access/license rules.
 * Priority (top to bottom):
 * 1. admin → true
 * 2. ultimate → true
 * 3. artist → ['basic','premium']
 * 4. basic → 'basic' only (with monthly quota enforcement)
 * 5. exclusive product → false except admin/ultimate
 * 6. trialActive → allows 'basic'
 * 7. fallback → false
 */
export function isLicenseAllowedForUser(
  user: User,
  license: string,
  product?: ProductLike,
  quota?: QuotaInfo
): boolean {
  const accessUser = getUserAccessProps(user);

  // 1. admin - full access
  if (accessUser.role === "admin") return true;

  // 2. ultimate - full access
  if (accessUser.plan === "ultimate") return true;

  // 3. exclusive product (takes priority over plans except admin/ultimate)
  if (
    product?.isExclusive &&
    !["admin", "ultimate"].includes(accessUser.role || accessUser.plan || "")
  ) {
    return false;
  }

  // 4. artist plan - basic and premium licenses
  if (accessUser.plan === "artist") {
    if (["basic", "premium"].includes(license)) {
      // Enforce quota for artist plan
      return hasRemainingQuota(quota, accessUser.plan);
    }
    if (license === "exclusive") return false;
  }

  // 5. basic plan - basic license only with monthly quota
  if (accessUser.plan === "basic") {
    if (license === "basic") {
      // Enforce monthly download quota (10 downloads/month for basic plan)
      return hasRemainingQuota(quota, accessUser.plan);
    }
    return false;
  }

  // 6. trialActive - allows basic license with quota
  if (accessUser.trialActive && license === "basic") {
    return hasRemainingQuota(quota, "trial");
  }

  // 7. fallback - deny access
  return false;
}
