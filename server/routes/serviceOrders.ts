import express from "express";
import {
  createApiError,
  serviceOrderValidation,
  validateBody,
} from "../../shared/validation/index";
import { isAuthenticated } from "../auth";
import { createServiceOrder, listServiceOrders } from "../lib/db";

const router = express.Router();

// Use shared validation schema

// POST /api/service-orders : create a service order
router.post("/", isAuthenticated, validateBody(serviceOrderValidation), async (req, res): Promise<void> => {
  try {
    const data = req.body; // Already validated by middleware
    const userId = (req as { user?: { id: string } }).user?.id || req.session?.userId;
    const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const order = await createServiceOrder({ ...data, user_id: numericUserId });
    res.status(201).json(order);
  } catch (error: unknown) {
    console.error("Service order creation error:", error);
    const requestId = (req as { requestId?: string }).requestId || `req_${Date.now()}`;

    const errorResponse = createApiError(
      "order_processing_failed",
      "Failed to create service order",
      {
        userMessage: "Unable to create your service order. Please try again.",
        requestId,
      }
    );

    res.status(500).json(errorResponse);
  }
});

// GET /api/service-orders : list service orders for current user
router.get("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const userId = (req as { user?: { id: string } }).user?.id || req.session?.userId;
    const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const orders = await listServiceOrders(numericUserId);
    res.json(orders);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
