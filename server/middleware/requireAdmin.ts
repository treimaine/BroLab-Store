import type { NextFunction, Response } from "express";
import { auditLogger } from "../lib/audit";
import { getUserByClerkId } from "../lib/convex";
import type { AuthenticatedRequest } from "../types/routes";

/**
 * Middleware to require admin role
 * Must be used after isAuthenticated middleware
 * Verifies admin role from Convex database
 *
 * @example
 * router.post('/admin/action', requireAuth, requireAdmin, handler);
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED",
      });
      return;
    }

    // Get user from Convex to verify role
    const clerkId = req.user.clerkId;
    if (!clerkId) {
      res.status(401).json({
        error: "Invalid authentication data",
        code: "INVALID_AUTH",
      });
      return;
    }

    // Fetch user from Convex database
    const convexUser = await getUserByClerkId(clerkId);

    if (!convexUser) {
      res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
      return;
    }

    // Verify admin role from Convex database
    const userRole = convexUser.role || "user";

    if (userRole !== "admin" && userRole !== "service_role") {
      // Log unauthorized admin access attempt
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        (req.headers["x-real-ip"] as string) ||
        req.socket?.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      await auditLogger.logSecurityEvent(
        clerkId,
        "unauthorized_admin_access",
        {
          attemptedPath: req.path,
          method: req.method,
          userRole,
          ipAddress,
          userAgent,
        },
        ipAddress,
        userAgent
      );

      res.status(403).json({
        error: "Admin access required",
        code: "FORBIDDEN",
      });
      return;
    }

    // Log successful admin access
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      (req.headers["x-real-ip"] as string) ||
      req.socket?.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await auditLogger.logSecurityEvent(
      clerkId,
      "admin_access_granted",
      {
        path: req.path,
        method: req.method,
        userRole,
        ipAddress,
        userAgent,
      },
      ipAddress,
      userAgent
    );

    // User is admin, proceed
    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    res.status(500).json({
      error: "Authorization check failed",
      code: "INTERNAL_ERROR",
    });
  }
};
