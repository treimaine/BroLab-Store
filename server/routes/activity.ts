import { Router } from "express";
import { isAuthenticated } from "../auth";
import { handleRouteError } from "../types/routes";
// Supabase removed - using Convex for data

const router = Router();

// GET /api/activity - Get user's recent activity
router.get("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // TODO: Implement with Convex
    // For now, return empty activity list
    const recentActivity: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      metadata?: Record<string, unknown>;
    }> = [];

    console.log("🔧 Activity API Debug:", {
      userId,
      downloadsCount: 0,
      ordersCount: 0,
      activitiesCount: 0,
      message: "Using Convex for data - TODO: implement",
    });

    res.json({
      success: true,
      activities: recentActivity,
      message: "Activity data will be available via Convex",
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch activity");
  }
});

export default router;
