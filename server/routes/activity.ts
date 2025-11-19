import { Router } from "express";
import { isAuthenticated } from "../auth";
import { getConvex } from "../lib/convex";
import { handleRouteError } from "../types/routes";

const router = Router();
const convex = getConvex();

// GET /api/activity - Get user's recent activity
router.get("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Fetch recent activity from Convex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activities = (await (convex.query as any)("activity/getRecent", {})) as Array<{
      _id: string;
      action: string;
      details?: Record<string, unknown>;
      timestamp: number;
    }>;

    // Format activities for response
    const recentActivity = activities.map(activity => ({
      id: activity._id,
      type: activity.action,
      description: activity.details?.description || activity.action,
      timestamp: new Date(activity.timestamp).toISOString(),
      metadata: activity.details,
    }));

    console.log("🔧 Activity API Debug:", {
      userId,
      activitiesCount: recentActivity.length,
      message: "Activity data fetched from Convex",
    });

    res.json({
      success: true,
      activities: recentActivity,
    });
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to fetch activity"
    );
  }
});

export default router;
