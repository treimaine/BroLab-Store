import { ConvexHttpClient } from "convex/browser";
import { Router } from "express";
import { z } from "zod";
import { isAuthenticated } from "../auth";

// Interface simple et stable pour createOrderIdempotent
// Basée sur la définition de la mutation Convex dans convex/orders.ts
interface CreateOrderIdempotentArgs {
  items: Array<{
    productId: number;
    title: string;
    type: string; // 'beat'|'subscription'|'service'
    qty: number;
    unitPrice: number; // cents
    metadata?: any;
  }>;
  currency: string;
  email: string;
  metadata?: any;
  idempotencyKey?: string;
}

// Type de retour simplifié
interface CreateOrderResult {
  orderId: string;
  order: any;
  idempotent?: boolean;
}

const ordersRouter = Router();
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

// Fonctions wrapper qui évitent complètement l'accès aux types Convex complexes
const createOrderIdempotent = async (
  args: CreateOrderIdempotentArgs
): Promise<CreateOrderResult> => {
  // Utilisation de chaînes de caractères pour éviter la récursion infinie
  return (await (convex.mutation as any)(
    "orders:createOrderIdempotent",
    args
  )) as CreateOrderResult;
};

const listOrders = async (args: { limit: number }) => {
  return await (convex.query as any)("orders:listOrders", args);
};

const getOrderWithRelations = async (args: { orderId: string }) => {
  return await (convex.query as any)("orders:getOrderWithRelations", args);
};

const createOrderBody = z.object({
  items: z
    .array(
      z.object({
        productId: z.number(),
        title: z.string(),
        type: z.enum(["beat", "subscription", "service"]),
        qty: z.number().min(1),
        unitPrice: z.number().min(0), // cents
        metadata: z.record(z.any()).optional(),
      })
    )
    .min(1),
  currency: z.string().min(3),
  metadata: z.record(z.any()).optional(),
  idempotencyKey: z.string().optional(),
});

ordersRouter.use(isAuthenticated);

// POST /api/orders - Create a new order (idempotent)
ordersRouter.post("/", isAuthenticated, async (req: any, res) => {
  try {
    const body = createOrderBody.parse(req.body);
    const idempotencyKey =
      body.idempotencyKey || (req.headers["x-idempotency-key"] as string | undefined);

    // Mapping du résultat de schema.parse() vers l'interface simple
    // Évite les unions complexes et réduit la profondeur d'inférence
    const orderArgs = {
      items: body.items.map(item => ({
        productId: item.productId,
        title: item.title,
        type: item.type,
        qty: item.qty,
        unitPrice: item.unitPrice,
        metadata: item.metadata,
      })),
      currency: body.currency,
      email: req.user?.email || "",
      metadata: body.metadata,
      idempotencyKey: idempotencyKey,
    } satisfies CreateOrderIdempotentArgs;

    // Utilisation de la fonction wrapper
    const result = await createOrderIdempotent(orderArgs);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Create order error:", error);
    if (error?.issues)
      return res.status(400).json({ error: "Invalid order data", details: error.issues });
    res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

// GET /api/orders/me
ordersRouter.get("/me", isAuthenticated, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { items, cursor, hasMore } = await listOrders({ limit });
    res.json({
      orders: items,
      page,
      total: items.length,
      totalPages: hasMore ? page + 1 : page,
      cursor,
      hasMore,
    });
  } catch (error: any) {
    console.error("🚨 Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id
ordersRouter.get("/:id", isAuthenticated, async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const data = await getOrderWithRelations({ orderId: id });

    const user = req.user || {};
    const isAdmin =
      user?.role === "admin" ||
      user?.email === "admin@brolabentertainment.com" ||
      user?.username === "admin";
    const isOwner = data?.order?.userId && String(data.order.userId) === String(user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid order id" });
  }
});

// GET /api/orders/:id/invoice
// Signed URL already attached on order after webhook pipeline; just return stored URL
ordersRouter.get("/:id/invoice", isAuthenticated, async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const data = await getOrderWithRelations({ orderId: id });

    const user = req.user || {};
    const isAdmin =
      user?.role === "admin" ||
      user?.email === "admin@brolabentertainment.com" ||
      user?.username === "admin";
    const isOwner = data?.order?.userId && String(data.order.userId) === String(user.id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!data?.order?.invoiceUrl) return res.status(404).json({ error: "Invoice not ready" });
    res.json({ url: data.order.invoiceUrl });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid order id" });
  }
});

// GET /api/orders/:id/invoice/download
ordersRouter.get("/:id/invoice/download", isAuthenticated, async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const data = await getOrderWithRelations({ orderId: id });

    const user = req.user || {};
    const isAdmin =
      user?.role === "admin" ||
      user?.email === "admin@brolabentertainment.com" ||
      user?.username === "admin";
    const isOwner = data?.order?.userId && String(data.order.userId) === String(user.id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!(data as any)?.invoice?.pdfUrl)
      return res.status(404).json({ error: "Invoice not ready" });
    res.redirect((data as any).invoice.pdfUrl);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid order id" });
  }
});

export default ordersRouter;
