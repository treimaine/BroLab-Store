import { Router } from "express";
import { isAuthenticated } from "../auth";
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
    const recentActivity: any[] = [];

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
  } catch (error: any) {
    console.error("Activity fetch error:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default router;
