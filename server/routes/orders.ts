import { Router } from 'express';
import { isAuthenticated } from '../auth';
import { getOrderInvoiceData, getUserById, listUserOrders } from '../lib/db';
import { ensureInvoicePdf } from '../lib/invoices';
import { BrandConfig, buildInvoicePdfStream } from '../lib/pdf';

const ordersRouter = Router();

ordersRouter.use(isAuthenticated);

// GET /api/orders/me
ordersRouter.get('/me', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const orders = await listUserOrders(userId);
  res.json(orders);
});

// GET /api/orders/:id
ordersRouter.get('/:id', async (req, res) => {
  const userId = req.session.userId;
  const orderId = parseInt(req.params.id, 10);
  if (!userId || isNaN(orderId)) return res.status(400).json({ error: 'Invalid request' });
  const { order, items } = await getOrderInvoiceData(orderId);
  const user = await getUserById(userId);
  const isAdmin = user && (user as any).role === 'admin';
  if (order.user_id !== userId && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
  res.json({ order, items });
});

// GET /api/orders/:id/invoice
ordersRouter.get('/:id/invoice', async (req, res) => {
  const userId = req.session.userId;
  const orderId = parseInt(req.params.id, 10);
  if (!userId || isNaN(orderId)) return res.status(400).json({ error: 'Invalid request' });
  const { order } = await getOrderInvoiceData(orderId);
  const user = await getUserById(userId);
  const isAdmin = user && (user as any).role === 'admin';
  if (order.user_id !== userId && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
  const url = await ensureInvoicePdf(orderId);
  res.json({ url });
});

// GET /api/orders/:id/invoice/download
ordersRouter.get('/:id/invoice/download', async (req, res) => {
  const userId = req.session.userId;
  const orderId = parseInt(req.params.id, 10);
  if (!userId || isNaN(orderId)) return res.status(400).json({ error: 'Invalid request' });
  const { order, items } = await getOrderInvoiceData(orderId);
  const user = await getUserById(userId);
  const isAdmin = user && (user as any).role === 'admin';
  if (order.user_id !== userId && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
  const brand: BrandConfig = {
    name: process.env.BRAND_NAME!,
    email: process.env.BRAND_EMAIL!,
    address: process.env.BRAND_ADDRESS!,
    logoPath: process.env.BRAND_LOGO_PATH!,
  };
  res.setHeader('Content-Type', 'application/pdf');
  buildInvoicePdfStream({ ...order, invoice_number: order.invoice_number || '' }, items, brand).pipe(res);
});

export default ordersRouter;
