import { Request, Response, Router } from "express";
import { isAuthenticated as requireAuth } from "../auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { getMessageQueue, type QueuedMessage } from "../services/MessageQueueService";
import { getWebSocketManager } from "../services/WebSocketManager";

const router = Router();

// Type pour les requêtes authentifiées
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    clerkId?: string;
    username?: string;
    email: string;
    role?: string;
  };
}

/**
 * Sync API Routes
 * Provides HTTP endpoints for dashboard data synchronization
 * Used as fallback when WebSocket connection is not available
 */

/**
 * GET /api/sync
 * Fetch current dashboard data for polling-based sync
 * 🔐 Requires authentication
 */
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id; // User is guaranteed to exist after requireAuth

    // Fetch dashboard data for the authenticated user
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
 * GET /api/sync/poll
 * Polling endpoint for real-time updates
 * Returns messages since the specified timestamp
 * 🔐 Requires authentication
 */
router.get(
  "/poll",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const since = Number.parseInt(req.query.since as string) || 0;
      const userId = req.user!.id; // User is guaranteed to exist after requireAuth

      const messageQueue = getMessageQueue();
      const messages = messageQueue.getMessagesSince(userId, since);

      res.json({
        success: true,
        messages,
        timestamp: Date.now(),
        count: messages.length,
      });
    } catch (error) {
      console.error("Poll API error:", error);
      res.status(500).json({
        error: "Polling failed",
        code: "POLL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/sync/send
 * Send a message through the polling connection
 * 🔐 Requires authentication
 */
router.post(
  "/send",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id; // User is guaranteed to exist after requireAuth
      const { type, payload, correlationId } = req.body;

      if (!type || !payload) {
        res.status(400).json({
          error: "Missing required fields: type, payload",
          code: "INVALID_REQUEST",
        });
        return;
      }

      const messageQueue = getMessageQueue();
      const message: QueuedMessage = {
        id: generateSyncId(),
        type,
        payload,
        timestamp: Date.now(),
        correlationId,
        userId,
      };

      // Add to message queue
      messageQueue.addMessage(message);

      // Also broadcast via WebSocket if available
      const wsManager = getWebSocketManager();
      wsManager.broadcast({
        type,
        payload,
        timestamp: message.timestamp,
        source: "client",
        id: message.id,
      });

      res.json({
        success: true,
        messageId: message.id,
        timestamp: message.timestamp,
      });
    } catch (error) {
      console.error("Send API error:", error);
      res.status(500).json({
        error: "Send failed",
        code: "SEND_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/sync/validate
 * Validate data consistency across dashboard sections
 * 🔐 Requires authentication
 */
router.post(
  "/validate",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id; // User is guaranteed to exist after requireAuth

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
  }
);

/**
 * POST /api/sync/force
 * Force a complete synchronization of all dashboard data
 * 🔐 Requires authentication
 */
router.post(
  "/force",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id; // User is guaranteed to exist after requireAuth

      // Force sync all data
      const syncResult = await forceSyncAllData(userId);

      const message: QueuedMessage = {
        id: syncResult.syncId,
        type: "force_sync_complete",
        payload: syncResult.data,
        timestamp: Date.now(),
        userId,
      };

      // Add to message queue
      const messageQueue = getMessageQueue();
      messageQueue.addMessage(message);

      // Broadcast update to WebSocket clients
      const wsManager = getWebSocketManager();
      wsManager.broadcast({
        type: "force_sync_complete",
        payload: syncResult.data,
        timestamp: message.timestamp,
        source: "server",
        id: syncResult.syncId,
      });

      res.json({
        success: true,
        data: syncResult.data,
        syncId: syncResult.syncId,
        timestamp: message.timestamp,
      });
    } catch (error) {
      console.error("Force sync API error:", error);
      res.status(500).json({
        error: "Force sync failed",
        code: "FORCE_SYNC_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/sync/status
 * Get sync system status and metrics
 * 🔐 Requires authentication
 */
router.get(
  "/status",
  requireAuth,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const wsManager = getWebSocketManager();
      const wsStats = wsManager.getStats();

      const messageQueue = getMessageQueue();
      const queueStats = messageQueue.getStats();

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
            endpoint: "/api/sync/poll",
            queues: queueStats.totalQueues,
            messages: queueStats.totalMessages,
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
  }
);

/**
 * POST /api/sync/broadcast
 * Broadcast data update to all connected clients (admin only)
 * 🔐 Requires authentication + admin role
 */
router.post(
  "/broadcast",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, payload, topics } = req.body;

      if (!type || !payload) {
        res.status(400).json({
          error: "Missing required fields: type, payload",
          code: "INVALID_REQUEST",
        });
        return;
      }

      const messageId = generateSyncId();
      const timestamp = Date.now();

      const queuedMessage: QueuedMessage = {
        id: messageId,
        type,
        payload,
        timestamp,
        topics,
      };

      // Add to message queue for polling clients
      const messageQueue = getMessageQueue();
      messageQueue.broadcast(queuedMessage);

      // Broadcast via WebSocket
      const wsManager = getWebSocketManager();
      const wsMessage = {
        type,
        payload,
        timestamp,
        source: "server" as const,
        id: messageId,
      };

      let sentCount: number;
      if (topics && Array.isArray(topics)) {
        sentCount = wsManager.broadcastToSubscribers(topics, wsMessage);
      } else {
        sentCount = wsManager.broadcast(wsMessage);
      }

      res.json({
        success: true,
        message: "Broadcast sent",
        sentToClients: sentCount,
        messageId,
        timestamp,
      });
    } catch (error) {
      console.error("Broadcast API error:", error);
      res.status(500).json({
        error: "Broadcast failed",
        code: "BROADCAST_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Helper functions

/**
 * Fetch dashboard data for a specific user
 */
async function fetchDashboardDataForUser(userId: string): Promise<Record<string, unknown>> {
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
async function validateDataConsistency(_userId: string): Promise<{
  consistent: boolean;
  inconsistencies: unknown[];
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
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate data hash for consistency validation
 */
function generateDataHash(): string {
  return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default router;
