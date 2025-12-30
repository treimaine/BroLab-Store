/**
 * Download Access Middleware
 *
 * Security middleware that verifies download entitlements before
 * allowing file access. Must be used on all download endpoints.
 *
 * @module server/middleware/requireDownloadAccess
 */

import type { NextFunction, Response } from "express";
import { auditLogger } from "../lib/audit";
import { getDownloadEntitlementService } from "../services/DownloadEntitlementService";
import type { AuthenticatedRequest } from "../types/routes";

/**
 * Download entitlement info attached to request
 */
export interface DownloadEntitlementInfo {
  canDownload: boolean;
  source: "order" | "subscription" | "none";
  orderId?: string;
  licenseType?: string;
  subscriptionId?: string;
  remainingQuota?: number;
}

/**
 * Extended request with download entitlement info
 * Uses intersection type to maintain compatibility with AuthenticatedRequest
 */
export type DownloadAuthorizedRequest = AuthenticatedRequest & {
  downloadEntitlement?: DownloadEntitlementInfo;
};

/**
 * Extract client IP address from request
 */
function getClientIp(req: AuthenticatedRequest): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    (req.headers["x-real-ip"] as string) ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: AuthenticatedRequest): string {
  return req.headers["user-agent"] || "unknown";
}

/**
 * Middleware to require download access for a specific beat
 *
 * Expects beatId in request params or body.
 * Optionally accepts licenseType in query or body.
 *
 * @example
 * router.get('/download/:beatId', requireAuth, requireDownloadAccess, downloadHandler);
 */
export const requireDownloadAccess = async (
  req: DownloadAuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    // Check if user is authenticated
    if (!req.user) {
      await auditLogger.logSecurityEvent(
        "anonymous",
        "download_access_denied",
        {
          reason: "not_authenticated",
          path: req.path,
          method: req.method,
        },
        ipAddress,
        userAgent
      );

      res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED",
      });
      return;
    }

    // Extract beatId from params or body
    const beatId = extractBeatId(req);
    if (!beatId) {
      res.status(400).json({
        error: "Beat ID is required",
        code: "MISSING_BEAT_ID",
      });
      return;
    }

    // Extract optional license type
    const licenseType = extractLicenseType(req);

    // Get user ID (Clerk ID or Convex user ID)
    const userId = req.user.clerkId || req.user.id;
    if (!userId) {
      res.status(401).json({
        error: "Invalid user session",
        code: "INVALID_SESSION",
      });
      return;
    }

    // Check download entitlement
    const entitlementService = getDownloadEntitlementService();
    const entitlement = await entitlementService.assertCanDownload(
      userId,
      beatId,
      licenseType,
      ipAddress,
      userAgent
    );

    if (!entitlement.canDownload) {
      // Log security event for denied access
      await auditLogger.logSecurityEvent(
        userId,
        "download_access_denied",
        {
          beatId,
          licenseType,
          reason: entitlement.reason,
          path: req.path,
        },
        ipAddress,
        userAgent
      );

      res.status(403).json({
        error: "Download access denied",
        code: "DOWNLOAD_NOT_ENTITLED",
        reason: entitlement.reason,
      });
      return;
    }

    // Attach entitlement info to request for downstream handlers
    req.downloadEntitlement = {
      canDownload: true,
      source: entitlement.source,
      orderId: entitlement.orderId,
      licenseType: entitlement.licenseType,
      subscriptionId: entitlement.subscriptionId,
      remainingQuota: entitlement.remainingQuota,
    };

    // Log successful authorization
    await auditLogger.logSecurityEvent(
      userId,
      "download_access_granted",
      {
        beatId,
        licenseType: entitlement.licenseType,
        source: entitlement.source,
        path: req.path,
      },
      ipAddress,
      userAgent
    );

    next();
  } catch (error) {
    console.error("Error in requireDownloadAccess middleware:", error);

    // Log error
    await auditLogger.logSecurityEvent(
      req.user?.clerkId || "unknown",
      "download_access_error",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.path,
      },
      ipAddress,
      userAgent
    );

    res.status(500).json({
      error: "Download authorization check failed",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Middleware for guest download access (by email + order token)
 *
 * Used for guest checkout scenarios where user provides email
 * and a secure download token from their order confirmation.
 *
 * @example
 * router.get('/download/guest/:token', requireGuestDownloadAccess, downloadHandler);
 */
export const requireGuestDownloadAccess = async (
  req: DownloadAuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    // Extract email and beatId
    const body = req.body as Record<string, unknown> | undefined;
    const email = (req.query.email as string) || (body?.email as string);
    const beatId = extractBeatId(req);
    const licenseType = extractLicenseType(req);

    if (!email) {
      res.status(400).json({
        error: "Email is required for guest downloads",
        code: "MISSING_EMAIL",
      });
      return;
    }

    if (!beatId) {
      res.status(400).json({
        error: "Beat ID is required",
        code: "MISSING_BEAT_ID",
      });
      return;
    }

    // Check guest entitlement
    const entitlementService = getDownloadEntitlementService();
    const entitlement = await entitlementService.assertCanDownloadByEmail(
      email,
      beatId,
      licenseType,
      ipAddress,
      userAgent
    );

    if (!entitlement.canDownload) {
      await auditLogger.logSecurityEvent(
        `guest:${email}`,
        "guest_download_denied",
        {
          beatId,
          reason: entitlement.reason,
          path: req.path,
        },
        ipAddress,
        userAgent
      );

      res.status(403).json({
        error: "Download access denied",
        code: "DOWNLOAD_NOT_ENTITLED",
        reason: entitlement.reason,
      });
      return;
    }

    // Attach entitlement info
    req.downloadEntitlement = {
      canDownload: true,
      source: entitlement.source,
      orderId: entitlement.orderId,
      licenseType: entitlement.licenseType,
    };

    await auditLogger.logSecurityEvent(
      `guest:${email}`,
      "guest_download_granted",
      {
        beatId,
        licenseType: entitlement.licenseType,
        orderId: entitlement.orderId,
        path: req.path,
      },
      ipAddress,
      userAgent
    );

    next();
  } catch (error) {
    console.error("Error in requireGuestDownloadAccess middleware:", error);

    res.status(500).json({
      error: "Download authorization check failed",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Extract beat ID from request params, query, or body
 */
function extractBeatId(req: AuthenticatedRequest): number | null {
  const fromParams = req.params?.beatId || req.params?.productId;
  const fromQuery = req.query?.beatId || req.query?.productId;
  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = body?.beatId || body?.productId;

  const rawId = fromParams || fromQuery || fromBody;

  if (!rawId) return null;

  const beatId = typeof rawId === "string" ? Number.parseInt(rawId, 10) : Number(rawId);
  return Number.isNaN(beatId) ? null : beatId;
}

/**
 * Extract license type from request query or body
 */
function extractLicenseType(req: AuthenticatedRequest): string | undefined {
  const body = req.body as Record<string, unknown> | undefined;
  return (
    (req.query?.licenseType as string) ||
    (req.query?.license as string) ||
    (body?.licenseType as string | undefined) ||
    (body?.license as string | undefined)
  );
}

export default requireDownloadAccess;
