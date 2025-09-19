import type { Id } from "../../convex/_generated/dataModel";

// Types pour les paramètres de requête Stripe
export interface StripeCheckoutSessionParams {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}

// Types pour les données de commande Convex
export interface ConvexOrderItem {
  productId?: number;
  title: string;
  price?: number;
  quantity?: number;
  license?: string;
  type?: string;
  sku?: string;
  metadata?: Record<string, unknown>;
}

export interface ConvexOrderData {
  order: {
    _id: Id<"orders">;
    userId?: Id<"users">;
    email: string;
    status: string;
    total: number;
    currency?: string;
    items: ConvexOrderItem[];
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, unknown>;
    invoiceNumber?: string;
    sessionId?: string;
    paymentIntentId?: string;
  };
  items?: Array<{
    productId: number;
    title: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
    license?: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }>;
  payments?: Array<{
    _id: Id<"payments">;
    orderId: Id<"orders">;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    paymentIntentId?: string;
    metadata?: Record<string, unknown>;
  }>;
  invoice?: {
    _id: Id<"invoicesOrders">;
    orderId: Id<"orders">;
    number: string;
    amount: number;
    currency: string;
    pdfUrl?: string;
    metadata?: Record<string, unknown>;
  } | null;
}

// Types pour les webhooks Stripe
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string;
    idempotency_key?: string;
  };
}

// Types pour les sessions de paiement
export interface PaymentSessionData {
  sessionId: string;
  paymentIntentId?: string;
  status: string;
  amount: number;
  currency: string;
}

// Gardes de type pour valider les données Convex
export function isValidConvexOrderData(data: unknown): data is ConvexOrderData {
  if (!data || typeof data !== "object") return false;

  const obj = data as Record<string, unknown>;

  const order = obj.order as Record<string, unknown>;
  if (!order || typeof order !== "object") return false;

  return (
    typeof order._id === "string" &&
    typeof order.email === "string" &&
    typeof order.status === "string" &&
    typeof order.total === "number" &&
    Array.isArray(order.items)
  );
}

export function isValidStripeWebhookEvent(data: unknown): data is StripeWebhookEvent {
  if (!data || typeof data !== "object") return false;

  const obj = data as Record<string, unknown>;

  return Boolean(
    typeof obj.id === "string" &&
      typeof obj.type === "string" &&
      obj.data &&
      typeof obj.data === "object" &&
      obj.data !== null &&
      typeof obj.created === "number"
  );
}

// Types pour les réponses API
export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
  timestamp?: number;
  requestId?: string;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}
