import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types/routes";

/**
 * Middleware to require admin role
 * Must be used after isAuthenticated middleware
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

    // Check if user has admin role
    const userRole = req.user.role || "user";

    if (userRole !== "admin" && userRole !== "service_role") {
      res.status(403).json({
        error: "Admin access required",
        code: "FORBIDDEN",
      });
      return;
    }

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
