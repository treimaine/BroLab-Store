import express from "express";
import { z } from "zod";
import { isAuthenticated } from "../auth";
import { createServiceOrder, listServiceOrders } from "../lib/db";

const router = express.Router();

// Validation schema
const serviceOrderSchema = z.object({
  service_type: z.enum(["mixing", "mastering", "recording", "custom_beat", "consultation"]),
  details: z.object({
    duration: z.number().optional(),
    tracks: z.number().optional(),
    format: z.enum(["wav", "mp3", "aiff"]).optional(),
    quality: z.enum(["standard", "premium"]).optional(),
    rush: z.boolean().optional(),
    notes: z.string().optional(),
  }),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  estimated_price: z.number().min(0).default(0),
});

// POST /api/service-orders : create a service order
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const parse = serviceOrderSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid body", details: parse.error.errors });
    }
    const userId = (req as any).user?.id || req.session?.userId;
    const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const order = await createServiceOrder({ ...parse.data, user_id: numericUserId });
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/service-orders : list service orders for current user
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id || req.session?.userId;
    const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const orders = await listServiceOrders(numericUserId);
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
