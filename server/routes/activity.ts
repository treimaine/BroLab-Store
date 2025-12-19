import { getAuth } from "@clerk/express";
import { Router } from "express";
import { api } from "../../convex/_generated/api";
import { ActivityItem } from "../../convex/activity/getUserActivity";
import { isAuthenticated } from "../auth";
import { getConvex } from "../lib/convex";
import { handleRouteError } from "../types/routes";

const router = Router();

// GET /api/activity - Get user's recent activity
router.get("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Fetch activity from Convex
    const convex = getConvex();
    const activityData: ActivityItem[] = await convex.query(
      api.activity.getUserActivity.getUserActivity,
      {
        clerkId,
        limit: 20,
      }
    );

    const recentActivity = activityData.map((activity: ActivityItem) => ({
      id: activity._id,
      type: activity.action,
      description: (activity.details as Record<string, unknown>)?.description || activity.action,
      timestamp: new Date(activity.timestamp).toISOString(),
      metadata: activity.details,
    }));

    console.log("🔧 Activity API Debug:", {
      clerkId,
      activitiesCount: recentActivity.length,
    });

    res.json({
      success: true,
      activities: recentActivity,
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch activity");
  }
});

export default router;
