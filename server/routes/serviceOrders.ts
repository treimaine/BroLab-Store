import express from "express";
import { serviceOrderValidation, validateBody } from "../../shared/validation/index";
import { isAuthenticated } from "../auth";
import { createServiceOrder, listServiceOrders } from "../lib/db";
import { handleRouteError } from "../types/routes";

const router = express.Router();

// Use shared validation schema

// POST /api/service-orders : create a service order
router.post(
  "/",
  isAuthenticated,
  validateBody(serviceOrderValidation),
  async (req, res): Promise<void> => {
    try {
      const data = req.body; // Already validated by middleware
      const userId = (req as { user?: { id: string } }).user?.id || req.session?.userId;
      const numericUserId = typeof userId === "string" ? Number.parseInt(userId, 10) : userId;
      if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const order = await createServiceOrder({ ...data, user_id: numericUserId });
      res.status(201).json(order);
    } catch (error: unknown) {
      handleRouteError(
        error instanceof Error ? error : String(error),
        res,
        "Failed to create service order"
      );
    }
  }
);

// GET /api/service-orders : list service orders for current user
router.get("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const userId = (req as { user?: { id: string } }).user?.id || req.session?.userId;
    const numericUserId = typeof userId === "string" ? Number.parseInt(userId, 10) : userId;
    if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const orders = await listServiceOrders(numericUserId);
    res.json(orders);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to list service orders"
    );
  }
});

export default router;
