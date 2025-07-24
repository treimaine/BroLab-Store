import express from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../auth';
import { createServiceOrder, listServiceOrders } from '../lib/db';

const router = express.Router();

// Validation schema
const serviceOrderSchema = z.object({
  service_type: z.string().min(1),
  details: z.string().min(1),
  status: z.string().optional(),
  addons: z.array(z.any()).optional(),
  base_price: z.number().optional()
});

// POST /api/service-orders : create a service order
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const parse = serviceOrderSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid body', details: parse.error.errors });
    }
    const userId = req.session?.userId;
    if (typeof userId !== 'number') return res.status(401).json({ error: 'Authentication required' });
    const order = await createServiceOrder({ ...parse.data, user_id: userId });
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/service-orders : list service orders for current user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (typeof userId !== 'number') return res.status(401).json({ error: 'Authentication required' });
    const orders = await listServiceOrders(userId);
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 