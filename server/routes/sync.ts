import { Request, Response, Router } from "express";
import { getWebSocketManager } from "../services/WebSocketManager";

const router = Router();

/**
 * Sync API Routes
 * Provides HTTP endpoints for dashboard data synchronization
 * Used as fallback when WebSocket connection is not available
 */

/**
 * GET /api/sync
 * Fetch current dashboard data for polling-based sync
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    // In a real implementation, this would fetch data from Convex or database
    // based on the authenticated user
    const userId = req.user?.id; // Assuming auth middleware sets req.user

    if (!userId) {
      res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Simulate fetching dashboard data
    const dashboardData = await fetchDashboardDataForUser(userId);

    res.json({
      success: true,
      data: dashboardData,
      timestamp: Date.now(),
      syncId: generateSyncId(),
    });
  } catch (error) {
    console.error("Sync API error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "SYNC_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/sync/validate
 * Validate data consistency across dashboard sections
 */
router.post("/validate", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Perform consistency validation
    const validationResult = await validateDataConsistency(userId);

    res.json({
      success: true,
      consistent: validationResult.consistent,
      inconsistencies: validationResult.inconsistencies,
      timestamp: Date.now(),
      validationId: generateSyncId(),
    });
  } catch (error) {
    console.error("Validation API error:", error);
    res.status(500).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/sync/force
 * Force a complete synchronization of all dashboard data
 */
router.post("/force", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Force sync all data
    const syncResult = await forceSyncAllData(userId);

    // Broadcast update to WebSocket clients
    const wsManager = getWebSocketManager();
    wsManager.broadcast({
      type: "force_sync_complete",
      payload: syncResult.data,
      timestamp: Date.now(),
      source: "server",
      id: syncResult.syncId,
    });

    res.json({
      success: true,
      data: syncResult.data,
      syncId: syncResult.syncId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Force sync API error:", error);
    res.status(500).json({
      error: "Force sync failed",
      code: "FORCE_SYNC_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/sync/status
 * Get sync system status and metrics
 */
router.get("/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const wsManager = getWebSocketManager();
    const wsStats = wsManager.getStats();

    res.json({
      success: true,
      status: {
        websocket: {
          enabled: true,
          connections: wsStats.activeConnections,
          totalConnections: wsStats.totalConnections,
          subscriptions: wsStats.totalSubscriptions,
        },
        polling: {
          enabled: true,
          endpoint: "/api/sync",
        },
        lastCheck: Date.now(),
      },
    });
  } catch (error) {
    console.error("Status API error:", error);
    res.status(500).json({
      error: "Status check failed",
      code: "STATUS_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/sync/broadcast
 * Broadcast data update to all connected clients (admin only)
 */
router.post("/broadcast", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin"; // Assuming role-based auth

    if (!userId || !isAdmin) {
      res.status(403).json({
        error: "Admin access required",
        code: "ACCESS_DENIED",
      });
      return;
    }

    const { type, payload, topics } = req.body;

    if (!type || !payload) {
      res.status(400).json({
        error: "Missing required fields: type, payload",
        code: "INVALID_REQUEST",
      });
      return;
    }

    const wsManager = getWebSocketManager();
    const message = {
      type,
      payload,
      timestamp: Date.now(),
      source: "server" as const,
      id: generateSyncId(),
    };

    let sentCount: number;
    if (topics && Array.isArray(topics)) {
      sentCount = wsManager.broadcastToSubscribers(topics, message);
    } else {
      sentCount = wsManager.broadcast(message);
    }

    res.json({
      success: true,
      message: "Broadcast sent",
      sentToClients: sentCount,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Broadcast API error:", error);
    res.status(500).json({
      error: "Broadcast failed",
      code: "BROADCAST_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Helper functions

/**
 * Fetch dashboard data for a specific user
 */
async function fetchDashboardDataForUser(userId: string): Promise<any> {
  // This would typically integrate with Convex queries or database calls
  // For now, return mock data structure

  return {
    user: {
      id: userId,
      name: "Test User",
      email: "test@example.com",
    },
    stats: {
      totalFavorites: Math.floor(Math.random() * 20),
      totalDownloads: Math.floor(Math.random() * 50),
      totalOrders: Math.floor(Math.random() * 10),
      totalSpent: Math.floor(Math.random() * 500),
      recentActivity: Math.floor(Math.random() * 15),
      quotaUsed: Math.floor(Math.random() * 30),
      quotaLimit: 50,
      calculatedAt: new Date().toISOString(),
      dataHash: generateDataHash(),
    },
    favorites: [],
    orders: [],
    downloads: [],
    reservations: [],
    activity: [],
    trends: {
      favorites: { change: Math.floor(Math.random() * 20) - 10 },
      downloads: { change: Math.floor(Math.random() * 20) - 10 },
      orders: { change: Math.floor(Math.random() * 20) - 10 },
      revenue: { change: Math.floor(Math.random() * 20) - 10 },
    },
    chartData: [],
  };
}

/**
 * Validate data consistency for a user
 */
async function validateDataConsistency(userId: string): Promise<{
  consistent: boolean;
  inconsistencies: any[];
}> {
  // This would perform actual consistency checks
  // For now, simulate validation

  const isConsistent = Math.random() > 0.1; // 90% chance of being consistent

  return {
    consistent: isConsistent,
    inconsistencies: isConsistent
      ? []
      : [
          {
            type: "calculation_mismatch",
            sections: ["stats", "analytics"],
            description: "Total downloads count mismatch between sections",
            severity: "medium",
            detectedAt: Date.now(),
          },
        ],
  };
}

/**
 * Force sync all data for a user
 */
async function forceSyncAllData(userId: string): Promise<{
  data: unknown;
  syncId: string;
}> {
  const data = await fetchDashboardDataForUser(userId);
  const syncId = generateSyncId();

  return { data, syncId };
}

/**
 * Generate unique sync ID
 */
function generateSyncId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate data hash for consistency validation
 */
function generateDataHash(): string {
  return `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default router;
