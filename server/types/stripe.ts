import type { Id } from "../../convex/_generated/dataModel";

// Types pour les paramètres de requête Stripe
export interface StripeCheckoutSessionParams {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}

// Types pour les données de commande Convex
export interface ConvexOrderData {
  order: {
    _id: Id<"orders">;
    userId?: Id<"users">;
    email: string;
    status: string;
    total: number;
    currency?: string;
    items: Array<{
      productId?: number;
      title: string;
      price?: number;
      quantity?: number;
      license?: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  items?: Array<{
    productId: number;
    title: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
    [key: string]: any;
  }>;
  payments?: Array<{
    _id: Id<"payments">;
    orderId: Id<"orders">;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    [key: string]: any;
  }>;
  invoice?: {
    _id: Id<"invoicesOrders">;
    orderId: Id<"orders">;
    number: string;
    amount: number;
    currency: string;
    [key: string]: any;
  } | null;
}

// Types pour les webhooks Stripe
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
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
export function isValidConvexOrderData(data: any): data is ConvexOrderData {
  return (
    data &&
    typeof data === "object" &&
    data.order &&
    typeof data.order === "object" &&
    typeof data.order._id === "string" &&
    typeof data.order.email === "string" &&
    typeof data.order.status === "string" &&
    typeof data.order.total === "number" &&
    Array.isArray(data.order.items)
  );
}

export function isValidStripeWebhookEvent(data: any): data is StripeWebhookEvent {
  return (
    data &&
    typeof data === "object" &&
    typeof data.id === "string" &&
    typeof data.type === "string" &&
    data.data &&
    typeof data.data === "object" &&
    typeof data.created === "number"
  );
}

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}
