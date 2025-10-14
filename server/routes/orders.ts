import { ConvexHttpClient } from "convex/browser";
import { Router } from "express";
import type {
  CreateOrderResponse,
  GetInvoiceResponse,
  GetMyOrdersResponse,
  GetOrderResponse,
} from "../../shared/types/apiEndpoints";
import {
  CommonParams,
  CommonQueries,
  CreateOrderSchema,
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/validation/index";
import { isAuthenticated } from "../auth";
import type {
  CreateOrderHandler,
  GetInvoiceHandler,
  GetMyOrdersHandler,
  GetOrderHandler,
} from "../types/ApiTypes";
import { handleRouteError } from "../types/routes";

// Interface for Convex order creation
interface CreateOrderIdempotentArgs {
  items: Array<{
    productId: number;
    title: string;
    type: string; // 'beat'|'subscription'|'service'
    qty: number;
    unitPrice: number; // cents
    metadata?: Record<string, unknown>;
  }>;
  currency: string;
  email: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

// Simplified return type
interface CreateOrderResult {
  orderId: string;
  order: Record<string, unknown>;
  idempotent?: boolean;
}

const ordersRouter = Router();
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

// Wrapper functions to avoid complex Convex type access
const createOrderIdempotent = async (
  args: CreateOrderIdempotentArgs
): Promise<CreateOrderResult> => {
  // Using string-based calls to avoid infinite recursion
  return (await (convex.mutation as (name: string, args: unknown) => Promise<unknown>)(
    "orders:createOrderIdempotent",
    args
  )) as CreateOrderResult;
};

const listOrders = async (args: {
  limit: number;
}): Promise<{
  items: Record<string, unknown>[];
  cursor?: string;
  hasMore: boolean;
}> => {
  return (await (convex.query as (name: string, args: unknown) => Promise<unknown>)(
    "orders:listOrders",
    args
  )) as {
    items: Record<string, unknown>[];
    cursor?: string;
    hasMore: boolean;
  };
};

const getOrderWithRelations = async (args: {
  orderId: string;
}): Promise<{
  order?: Record<string, unknown>;
  items?: Record<string, unknown>[];
}> => {
  return (await (convex.query as (name: string, args: unknown) => Promise<unknown>)(
    "orders:getOrderWithRelations",
    args
  )) as {
    order?: Record<string, unknown>;
    items?: Record<string, unknown>[];
  };
};

// Remove the old schema - using shared validation now

ordersRouter.use(isAuthenticated);

// POST /api/orders - Create a new order (idempotent)
const createOrder: CreateOrderHandler = async (req, res) => {
  try {
    const body = req.body; // Already validated by middleware
    const idempotencyKey =
      body.idempotencyKey || (req.headers["x-idempotency-key"] as string | undefined);

    // Map parsed schema result to simple interface
    const orderArgs: CreateOrderIdempotentArgs = {
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
    };

    // Use wrapper function
    const result = await createOrderIdempotent(orderArgs);
    const response: CreateOrderResponse = {
      orderId: result.orderId,
      order: result.order as unknown as CreateOrderResponse["order"],
      idempotent: result.idempotent,
    };
    res.status(201).json(response);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to create order");
  }
};

ordersRouter.post("/", validateBody(CreateOrderSchema), createOrder as never);

// GET /api/orders/me
const getMyOrders: GetMyOrdersHandler = async (req, res) => {
  try {
    const { page, limit } = req.query as { page: number; limit: number }; // Already validated by middleware
    const { items, cursor, hasMore } = await listOrders({ limit });

    const response: GetMyOrdersResponse = {
      orders: items as unknown as GetMyOrdersResponse["orders"],
      page,
      total: items.length,
      totalPages: hasMore ? page + 1 : page,
      cursor,
      hasMore,
    };
    res.json(response);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch orders");
  }
};

ordersRouter.get("/me", validateQuery(CommonQueries.pagination), getMyOrders as never);

// GET /api/orders/:id
const getOrder: GetOrderHandler = async (req, res) => {
  try {
    const id = req.params.id as string;
    const data = await getOrderWithRelations({ orderId: id });

    const user = req.user;
    const isAdmin =
      user?.role === "admin" ||
      user?.email === "admin@brolabentertainment.com" ||
      user?.username === "admin";
    const isOwner = data?.order?.userId && String(data.order.userId) === String(user?.id);

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const response: GetOrderResponse = {
      order: data?.order as unknown as GetOrderResponse["order"],
      items: (data?.items || []) as unknown as GetOrderResponse["items"],
      statusHistory: [], // TODO: Implement status history
    };
    res.json(response);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to get order");
  }
};

ordersRouter.get("/:id", validateParams(CommonParams.id), getOrder as never);

// GET /api/orders/:id/invoice
// Signed URL already attached on order after webhook pipeline; just return stored URL
const getInvoice: GetInvoiceHandler = async (req, res) => {
  try {
    const id = req.params.id as string;
    const data = await getOrderWithRelations({ orderId: id });

    const user = req.user;
    const isAdmin =
      user?.role === "admin" ||
      user?.email === "admin@brolabentertainment.com" ||
      user?.username === "admin";
    const isOwner = data?.order?.userId && String(data.order.userId) === String(user?.id);
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const invoiceUrl = data?.order?.invoiceUrl as string | undefined;
    if (!invoiceUrl) {
      res.status(404).json({ error: "Invoice not ready" });
      return;
    }

    const response: GetInvoiceResponse = { url: invoiceUrl };
    res.json(response);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to get invoice");
  }
};

ordersRouter.get("/:id/invoice", validateParams(CommonParams.id), getInvoice as never);

// GET /api/orders/:id/invoice/download
ordersRouter.get("/:id/invoice/download", validateParams(CommonParams.id), async (req, res) => {
  try {
    const id = req.params.id as string;
    const data = await getOrderWithRelations({ orderId: id });

    const user = req.user;
    const isAdmin =
      user?.role === "admin" ||
      user?.email === "admin@brolabentertainment.com" ||
      user?.username === "admin";
    const isOwner = data?.order?.userId && String(data.order.userId) === String(user?.id);
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const invoice = data as { invoice?: { pdfUrl?: string } };
    if (!invoice?.invoice?.pdfUrl) {
      res.status(404).json({ error: "Invoice not ready" });
      return;
    }
    res.redirect(invoice.invoice.pdfUrl);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to download invoice");
  }
});

export default ordersRouter;
