import express from "express";
import { isAuthenticated } from "../auth";

const router = express.Router();

/**
 * Get analytics data for dashboard
 */
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    // Mock analytics data for now
    const analytics = {
      totalRevenue: 12500,
      totalOrders: 45,
      totalDownloads: 123,
      conversionRate: 3.2,
      topBeats: [
        { id: 1, title: "Trap Beat #1", plays: 1250, downloads: 45 },
        { id: 2, title: "Hip Hop Vibes", plays: 980, downloads: 32 },
        { id: 3, title: "Drill Energy", plays: 756, downloads: 28 },
      ],
      recentActivity: [
        { action: "Beat Downloaded", details: "Trap Beat #1", timestamp: new Date().toISOString() },
        {
          action: "Order Completed",
          details: "Premium License",
          timestamp: new Date().toISOString(),
        },
      ],
      monthlyStats: {
        revenue: [1200, 1500, 1800, 2100, 2500, 2800],
        orders: [5, 8, 12, 15, 18, 22],
        downloads: [15, 25, 35, 45, 55, 65],
      },
    };

    res.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/**
 * Get beat performance metrics
 */
router.get("/beats/:beatId", isAuthenticated, async (req, res) => {
  try {
    const { beatId } = req.params;

    // Mock beat analytics
    const beatAnalytics = {
      beatId: parseInt(beatId),
      totalPlays: 1250,
      totalDownloads: 45,
      revenue: 1350,
      conversionRate: 3.6,
      demographics: {
        countries: [
          { country: "US", plays: 650 },
          { country: "UK", plays: 200 },
          { country: "CA", plays: 150 },
        ],
        ageGroups: [
          { range: "18-24", percentage: 35 },
          { range: "25-34", percentage: 45 },
          { range: "35-44", percentage: 20 },
        ],
      },
      timeline: {
        daily: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          plays: Math.floor(Math.random() * 50) + 10,
          downloads: Math.floor(Math.random() * 5),
        })),
      },
    };

    res.json(beatAnalytics);
  } catch (error) {
    console.error("Beat analytics error:", error);
    res.status(500).json({ error: "Failed to fetch beat analytics" });
  }
});

export default router;
