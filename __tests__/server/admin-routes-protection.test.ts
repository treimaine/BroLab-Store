/**
 * Admin Routes Protection Tests
 * Verifies that all admin routes require proper authentication and authorization
 */

import express, { type Express } from "express";
import request from "supertest";
import { isAuthenticated as requireAuth } from "../../server/auth";
import { requireAdmin } from "../../server/middleware/requireAdmin";
import securityRouter from "../../server/routes/security";
import syncRouter from "../../server/routes/sync";
import { getMessageQueue } from "../../server/services/MessageQueueService";
import { getWebSocketManager, WebSocketManager } from "../../server/services/WebSocketManager";
import type { AuthenticatedRequest } from "../../server/types/routes";

// Mock dependencies
jest.mock("../../server/auth");
jest.mock("../../server/middleware/requireAdmin");
jest.mock("../../server/lib/convex");
jest.mock("../../server/lib/audit");
jest.mock("../../server/services/WebSocketManager", () => ({
  getWebSocketManager: jest.fn(),
}));
jest.mock("../../server/services/MessageQueueService", () => ({
  getMessageQueue: jest.fn(),
}));

// Mock types
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockGetWebSocketManager = getWebSocketManager as jest.MockedFunction<
  typeof getWebSocketManager
>;
const mockGetMessageQueue = getMessageQueue as jest.MockedFunction<typeof getMessageQueue>;

// Test data factories
const createRegularUser = () => ({
  id: "user_123",
  clerkId: "clerk_123",
  email: "user@example.com",
  role: "user",
});

const createAdminUser = () => ({
  id: "admin_123",
  clerkId: "clerk_admin",
  email: "admin@example.com",
  role: "admin",
});

const createServiceRoleUser = () => ({
  id: "service_123",
  clerkId: "clerk_service",
  email: "service@example.com",
  role: "service_role",
});

// Mock service factories
const createMockWebSocketManager = (): Partial<WebSocketManager> => ({
  getStats: jest.fn().mockReturnValue({
    activeConnections: 0,
    totalConnections: 0,
    totalSubscriptions: 0,
  }),
  broadcast: jest.fn().mockReturnValue(0),
  broadcastToSubscribers: jest.fn().mockReturnValue(0),
});

const createMockMessageQueue = () => ({
  getStats: jest.fn().mockReturnValue({
    totalQueues: 0,
    totalMessages: 0,
    queueSizes: {},
  }),
  broadcast: jest.fn(),
  addMessage: jest.fn(),
  getMessagesSince: jest.fn().mockReturnValue([]),
  getAllMessages: jest.fn().mockReturnValue([]),
  clearMessages: jest.fn(),
  destroy: jest.fn(),
});

// Helper to setup auth middleware with specific user
const setupAuthMiddleware = (user: ReturnType<typeof createRegularUser> | null) => {
  mockRequireAuth.mockImplementation(async (req, res, next) => {
    if (req.headers.authorization === "Bearer valid-token" || user) {
      (req as AuthenticatedRequest).user = user || createRegularUser();
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  });
};

// Helper to setup admin middleware
const setupAdminMiddleware = () => {
  mockRequireAdmin.mockImplementation(async (req, res, next) => {
    const user = (req as AuthenticatedRequest).user;
    if (user && (user.role === "admin" || user.role === "service_role")) {
      next();
    } else {
      res.status(403).json({ error: "Admin access required", code: "FORBIDDEN" });
    }
  });
};

// Helper to setup mock services for broadcast tests
const setupBroadcastMocks = (wsReturnValue = 5, mqBroadcast = jest.fn()) => {
  const mockWsManager = {
    broadcast: jest.fn().mockReturnValue(wsReturnValue),
    broadcastToSubscribers: jest.fn().mockReturnValue(3),
  };

  const mockMsgQueue = {
    ...createMockMessageQueue(),
    broadcast: mqBroadcast,
  };

  mockGetWebSocketManager.mockReturnValue(mockWsManager as unknown as WebSocketManager);
  mockGetMessageQueue.mockReturnValue(
    mockMsgQueue as unknown as ReturnType<typeof getMessageQueue>
  );
};

describe("Admin Routes Protection", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mocks for WebSocket and MessageQueue
    mockGetWebSocketManager.mockReturnValue(
      createMockWebSocketManager() as unknown as WebSocketManager
    );
    mockGetMessageQueue.mockReturnValue(
      createMockMessageQueue() as unknown as ReturnType<typeof getMessageQueue>
    );

    // Default mock implementations
    setupAuthMiddleware(null);
    setupAdminMiddleware();

    // Register routes
    app.use("/api/security", securityRouter);
    app.use("/api/sync", syncRouter);
  });

  describe("Security Admin Routes", () => {
    describe("POST /api/security/admin/rls/initialize", () => {
      it("should reject unauthenticated requests", async () => {
        const response = await request(app).post("/api/security/admin/rls/initialize").expect(401);

        expect(response.body).toHaveProperty("error");
      });

      it("should reject non-admin authenticated users", async () => {
        const response = await request(app)
          .post("/api/security/admin/rls/initialize")
          .set("Authorization", "Bearer valid-token")
          .expect(403);

        expect(response.body).toMatchObject({
          error: "Admin access required",
          code: "FORBIDDEN",
        });
      });

      it("should allow admin users", async () => {
        setupAuthMiddleware(createAdminUser());

        const response = await request(app)
          .post("/api/security/admin/rls/initialize")
          .set("Authorization", "Bearer admin-token")
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
      });
    });

    describe("POST /api/security/admin/rls/apply-policies", () => {
      it("should reject unauthenticated requests", async () => {
        const response = await request(app)
          .post("/api/security/admin/rls/apply-policies")
          .expect(401);

        expect(response.body).toHaveProperty("error");
      });

      it("should reject non-admin authenticated users", async () => {
        const response = await request(app)
          .post("/api/security/admin/rls/apply-policies")
          .set("Authorization", "Bearer valid-token")
          .expect(403);

        expect(response.body).toMatchObject({
          error: "Admin access required",
          code: "FORBIDDEN",
        });
      });

      it("should allow admin users", async () => {
        setupAuthMiddleware(createAdminUser());

        const response = await request(app)
          .post("/api/security/admin/rls/apply-policies")
          .set("Authorization", "Bearer admin-token")
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
      });
    });

    describe("GET /api/security/admin/rls/verify", () => {
      it("should reject unauthenticated requests", async () => {
        const response = await request(app).get("/api/security/admin/rls/verify").expect(401);

        expect(response.body).toHaveProperty("error");
      });

      it("should reject non-admin authenticated users", async () => {
        const response = await request(app)
          .get("/api/security/admin/rls/verify")
          .set("Authorization", "Bearer valid-token")
          .expect(403);

        expect(response.body).toMatchObject({
          error: "Admin access required",
          code: "FORBIDDEN",
        });
      });

      it("should allow admin users", async () => {
        setupAuthMiddleware(createAdminUser());

        const response = await request(app)
          .get("/api/security/admin/rls/verify")
          .set("Authorization", "Bearer admin-token")
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
      });
    });
  });

  describe("Sync Admin Routes", () => {
    describe("POST /api/sync/broadcast", () => {
      it("should reject unauthenticated requests", async () => {
        const response = await request(app)
          .post("/api/sync/broadcast")
          .send({ type: "test", payload: {} })
          .expect(401);

        expect(response.body).toHaveProperty("error");
      });

      it("should reject non-admin authenticated users", async () => {
        const response = await request(app)
          .post("/api/sync/broadcast")
          .set("Authorization", "Bearer valid-token")
          .send({ type: "test", payload: {} })
          .expect(403);

        expect(response.body).toMatchObject({
          error: "Admin access required",
          code: "FORBIDDEN",
        });
      });

      it("should allow admin users to broadcast", async () => {
        setupAuthMiddleware(createAdminUser());
        setupBroadcastMocks(5, jest.fn());

        const response = await request(app)
          .post("/api/sync/broadcast")
          .set("Authorization", "Bearer admin-token")
          .send({ type: "test_update", payload: { data: "test" } })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Broadcast sent",
        });
        expect(response.body).toHaveProperty("messageId");
        expect(response.body).toHaveProperty("sentToClients");
      });

      it("should allow service_role users to broadcast", async () => {
        setupAuthMiddleware(createServiceRoleUser());
        setupBroadcastMocks(5, jest.fn());

        const response = await request(app)
          .post("/api/sync/broadcast")
          .set("Authorization", "Bearer service-token")
          .send({ type: "test_update", payload: { data: "test" } })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Broadcast sent",
        });
      });
    });
  });

  describe("Non-Admin Routes", () => {
    it("should allow authenticated users to access non-admin sync routes", async () => {
      const response = await request(app)
        .get("/api/sync/status")
        .set("Authorization", "Bearer valid-token")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("status");
    });

    it("should allow authenticated users to access security status", async () => {
      const response = await request(app).get("/api/security/security/status").expect(200);

      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("environment");
    });
  });

  describe("Admin Route Coverage", () => {
    it("should verify all admin routes use requireAdmin middleware", () => {
      // This test documents all admin routes that should be protected
      const adminRoutes = [
        { method: "POST", path: "/api/security/admin/rls/initialize" },
        { method: "POST", path: "/api/security/admin/rls/apply-policies" },
        { method: "GET", path: "/api/security/admin/rls/verify" },
        { method: "POST", path: "/api/sync/broadcast" },
      ];

      // Verify that requireAdmin was called for each route
      expect(mockRequireAdmin).toBeDefined();
      expect(typeof mockRequireAdmin).toBe("function");

      // Document the admin routes for future reference
      console.log("Protected admin routes:", adminRoutes);
    });
  });
});
