/**
 * DownloadEntitlementService - Verifies user download entitlements
 *
 * Security gate for all download operations. Validates that users have
 * legitimate access to download beats through:
 * 1. Paid orders (one-time beat purchases)
 * 2. Active subscriptions with available quota
 *
 * @module server/services/DownloadEntitlementService
 */

import { ConvexHttpClient } from "convex/browser";
import { auditLogger } from "../lib/audit";

/**
 * Download entitlement check result
 */
export interface EntitlementResult {
  /** Whether user can download */
  canDownload: boolean;
  /** Reason for the decision */
  reason: string;
  /** Source of entitlement */
  source: "order" | "subscription" | "none";
  /** Order ID if entitled via purchase */
  orderId?: string;
  /** License type granted */
  licenseType?: string;
  /** Subscription ID if entitled via subscription */
  subscriptionId?: string;
  /** Remaining quota if subscription-based */
  remainingQuota?: number;
}

/**
 * Order item from Convex
 */
interface OrderItem {
  productId: number;
  license: string;
  title?: string;
  name?: string;
}

/**
 * Order from Convex
 */
interface ConvexOrder {
  _id: string;
  userId?: string;
  email?: string;
  status: string;
  items: OrderItem[];
}

/**
 * Download record from Convex
 */
interface ConvexDownload {
  _id: string;
  userId: string;
  beatId: number;
  licenseType: string;
}

/**
 * DownloadEntitlementService
 *
 * Singleton service that verifies download entitlements before
 * allowing file access. Implements defense-in-depth by checking
 * multiple sources of entitlement.
 */
export class DownloadEntitlementService {
  private static instance: DownloadEntitlementService;
  private readonly convex: ConvexHttpClient;

  private constructor(convexUrl: string) {
    this.convex = new ConvexHttpClient(convexUrl);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DownloadEntitlementService {
    if (!DownloadEntitlementService.instance) {
      const convexUrl = process.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("VITE_CONVEX_URL environment variable is required");
      }
      DownloadEntitlementService.instance = new DownloadEntitlementService(convexUrl);
    }
    return DownloadEntitlementService.instance;
  }

  /**
   * Assert that a user can download a specific beat
   *
   * Checks entitlement through:
   * 1. Existing download record (already granted access)
   * 2. Paid order containing the beat
   * 3. Active subscription with available quota
   *
   * @param userId - Convex user ID
   * @param beatId - Beat/product ID to download
   * @param requestedLicenseType - Optional specific license type requested
   * @param ipAddress - Client IP for audit logging
   * @param userAgent - Client user agent for audit logging
   * @returns EntitlementResult with decision and metadata
   */
  async assertCanDownload(
    userId: string,
    beatId: number,
    requestedLicenseType?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EntitlementResult> {
    const startTime = Date.now();

    try {
      // 1. Check for existing download record (already granted access)
      const existingDownload = await this.checkExistingDownload(
        userId,
        beatId,
        requestedLicenseType
      );
      if (existingDownload.canDownload) {
        await this.logDownloadAttempt(
          userId,
          beatId,
          true,
          "existing_download",
          ipAddress,
          userAgent
        );
        return existingDownload;
      }

      // 2. Check for paid order containing this beat
      const orderEntitlement = await this.checkOrderEntitlement(
        userId,
        beatId,
        requestedLicenseType
      );
      if (orderEntitlement.canDownload) {
        await this.logDownloadAttempt(userId, beatId, true, "paid_order", ipAddress, userAgent);
        return orderEntitlement;
      }

      // 3. Check subscription quota (for subscription-based downloads)
      const subscriptionEntitlement = await this.checkSubscriptionEntitlement(userId);
      if (subscriptionEntitlement.canDownload) {
        await this.logDownloadAttempt(userId, beatId, true, "subscription", ipAddress, userAgent);
        return subscriptionEntitlement;
      }

      // No entitlement found - log refusal
      await this.logDownloadAttempt(userId, beatId, false, "no_entitlement", ipAddress, userAgent);

      return {
        canDownload: false,
        reason: "No valid entitlement found for this beat",
        source: "none",
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Entitlement check failed after ${duration}ms:`, error);

      // Log error but don't expose internal details
      await this.logDownloadAttempt(userId, beatId, false, "error", ipAddress, userAgent, {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        canDownload: false,
        reason: "Unable to verify download entitlement",
        source: "none",
      };
    }
  }

  /**
   * Check for existing download record
   * Uses Convex HTTP client with string-based function reference
   */
  private async checkExistingDownload(
    userId: string,
    beatId: number,
    requestedLicenseType?: string
  ): Promise<EntitlementResult> {
    try {
      // Use string-based function reference for HTTP client
      const convexClient = this.convex as {
        query: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      };

      const downloads = (await convexClient.query(
        "downloads:getUserDownloads",
        {}
      )) as ConvexDownload[];

      const matchingDownload = downloads.find((d: ConvexDownload) => {
        const beatMatch = d.beatId === beatId;
        const licenseMatch = !requestedLicenseType || d.licenseType === requestedLicenseType;
        return beatMatch && licenseMatch;
      });

      if (matchingDownload) {
        return {
          canDownload: true,
          reason: "Download access already granted",
          source: "order",
          licenseType: matchingDownload.licenseType,
        };
      }

      return {
        canDownload: false,
        reason: "No existing download record",
        source: "none",
      };
    } catch (error) {
      console.error("Error checking existing download:", error);
      return {
        canDownload: false,
        reason: "Error checking download records",
        source: "none",
      };
    }
  }

  /**
   * Check for paid order containing the beat
   * Uses listOrdersByClerkId which accepts clerkId parameter
   */
  private async checkOrderEntitlement(
    userId: string,
    beatId: number,
    requestedLicenseType?: string
  ): Promise<EntitlementResult> {
    try {
      // Use string-based function reference for HTTP client
      const convexClient = this.convex as {
        query: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      };

      // Query user's paid orders using clerkId
      const orders = (await convexClient.query("orders/listUserOrders:listOrdersByClerkId", {
        clerkId: userId,
        status: "paid",
      })) as ConvexOrder[];

      for (const order of orders) {
        // Check if order contains the requested beat
        const matchingItem = order.items?.find((item: OrderItem) => {
          const productMatch = item.productId === beatId;
          const licenseMatch = !requestedLicenseType || item.license === requestedLicenseType;
          return productMatch && licenseMatch;
        });

        if (matchingItem) {
          return {
            canDownload: true,
            reason: "Valid paid order found",
            source: "order",
            orderId: order._id,
            licenseType: matchingItem.license,
          };
        }
      }

      return {
        canDownload: false,
        reason: "No paid order found for this beat",
        source: "none",
      };
    } catch (error) {
      console.error("Error checking order entitlement:", error);
      return {
        canDownload: false,
        reason: "Error checking order records",
        source: "none",
      };
    }
  }

  /**
   * Check subscription-based download quota
   */
  private async checkSubscriptionEntitlement(_userId: string): Promise<EntitlementResult> {
    try {
      // Use string-based function reference for HTTP client
      const convexClient = this.convex as {
        query: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      };

      const quotaResult = (await convexClient.query(
        "subscriptions/checkDownloadQuota:checkDownloadQuota",
        {}
      )) as {
        canDownload: boolean;
        reason: string;
        quota: { limit: number; used: number; remaining: number };
        planId?: string;
        subscriptionId?: string;
      };

      if (quotaResult.canDownload) {
        return {
          canDownload: true,
          reason: quotaResult.reason,
          source: "subscription",
          subscriptionId: quotaResult.subscriptionId,
          licenseType: quotaResult.planId,
          remainingQuota: quotaResult.quota.remaining,
        };
      }

      return {
        canDownload: false,
        reason: quotaResult.reason || "Subscription quota exceeded or no active subscription",
        source: "none",
      };
    } catch (error) {
      console.error("Error checking subscription entitlement:", error);
      return {
        canDownload: false,
        reason: "Error checking subscription quota",
        source: "none",
      };
    }
  }

  /**
   * Log download attempt to audit system
   */
  private async logDownloadAttempt(
    userId: string,
    beatId: number,
    allowed: boolean,
    source: string,
    ipAddress?: string,
    userAgent?: string,
    additionalDetails?: Record<string, unknown>
  ): Promise<void> {
    try {
      await auditLogger.log({
        userId,
        action: allowed ? "download_authorized" : "download_denied",
        resource: "downloads",
        details: {
          beatId,
          source,
          allowed,
          ...additionalDetails,
        },
        ipAddress,
        userAgent,
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error("Failed to log download attempt:", error);
    }
  }

  /**
   * Check entitlement for guest user (by email)
   * Used for guest checkout scenarios
   */
  async assertCanDownloadByEmail(
    email: string,
    beatId: number,
    requestedLicenseType?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EntitlementResult> {
    try {
      // Use string-based function reference for HTTP client
      const convexClient = this.convex as {
        query: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      };

      // Query orders by email for guest users
      const orders = (await convexClient.query("orders/getOrdersByEmail:getOrdersByEmail", {
        email,
        status: "paid",
      })) as ConvexOrder[];

      for (const order of orders) {
        const matchingItem = order.items?.find((item: OrderItem) => {
          const productMatch = item.productId === beatId;
          const licenseMatch = !requestedLicenseType || item.license === requestedLicenseType;
          return productMatch && licenseMatch;
        });

        if (matchingItem) {
          await this.logDownloadAttempt(
            `guest:${email}`,
            beatId,
            true,
            "guest_order",
            ipAddress,
            userAgent
          );

          return {
            canDownload: true,
            reason: "Valid paid order found for guest",
            source: "order",
            orderId: order._id,
            licenseType: matchingItem.license,
          };
        }
      }

      await this.logDownloadAttempt(
        `guest:${email}`,
        beatId,
        false,
        "no_guest_entitlement",
        ipAddress,
        userAgent
      );

      return {
        canDownload: false,
        reason: "No paid order found for this email",
        source: "none",
      };
    } catch (error) {
      console.error("Error checking guest entitlement:", error);
      return {
        canDownload: false,
        reason: "Error checking guest order records",
        source: "none",
      };
    }
  }
}

// Export singleton getter
export const getDownloadEntitlementService = (): DownloadEntitlementService => {
  return DownloadEntitlementService.getInstance();
};

export default DownloadEntitlementService;
