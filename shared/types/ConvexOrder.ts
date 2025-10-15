/**
 * Convex Order Type Definitions and Conversion Utilities
 *
 * This module provides type-safe interfaces for Convex order operations
 * and conversion between Convex and shared schema types.
 */

import { Id } from "../../convex/_generated/dataModel";
import { Order, OrderItem } from "./Order";

/**
 * Convex Order type that matches the actual Convex schema
 */
export interface ConvexOrder {
  _id: Id<"orders">;
  userId?: Id<"users">;
  sessionId?: string;
  email: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  processingFee: number;
  currency: string;
  status: string;
  invoiceNumber: string;
  invoicePdfUrl?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  // Convex-specific fields
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paypalTransactionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Convex Order Item type
 */
export interface ConvexOrderItem {
  _id: Id<"orderItems">;
  orderId: Id<"orders">;
  productId: number;
  type: string;
  title: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount?: number;
  licenseType: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

/**
 * Combined order data with relations as returned by Convex queries
 */
export interface ConvexOrderData {
  order: ConvexOrder;
  items: ConvexOrderItem[];
}

/**
 * Stripe-specific order item for checkout sessions
 */
export interface StripeOrderItem {
  beat_id?: number;
  title?: string;
  price?: number;
  unitPrice?: number;
  totalPrice?: number;
  license_type?: string;
  quantity?: number;
}

/**
 * Type-safe conversion from ConvexOrder to shared schema Order
 */
export function convexOrderToOrder(convexOrder: ConvexOrder, items: ConvexOrderItem[] = []): Order {
  // Extract numeric ID from Convex ID for compatibility
  const numericId = extractNumericOrderId(convexOrder._id);
  const numericUserId = convexOrder.userId ? extractNumericUserId(convexOrder.userId) : undefined;

  // Convert items
  const orderItems: OrderItem[] = items.map(item => ({
    id: extractNumericOrderItemId(item._id),
    productId: item.productId,
    type: item.type as any, // Type assertion for enum compatibility
    title: item.title,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    discountAmount: item.discountAmount,
    licenseType: item.licenseType as any, // Type assertion for enum compatibility
    metadata: {
      ...item.metadata,
    },
    addedAt: new Date(item.createdAt).toISOString(),
  }));

  return {
    id: numericId,
    userId: numericUserId,
    sessionId: convexOrder.sessionId,
    email: convexOrder.email,
    total: convexOrder.total,
    subtotal: convexOrder.subtotal,
    taxAmount: convexOrder.taxAmount,
    processingFee: convexOrder.processingFee,
    currency: convexOrder.currency as any, // Type assertion for enum compatibility
    status: convexOrder.status as any, // Type assertion for enum compatibility
    items: orderItems,
    payment: {
      method: "stripe" as any, // Default to stripe
      status: "pending" as any, // Default status
      stripePaymentIntentId: convexOrder.stripePaymentIntentId,
      paypalTransactionId: convexOrder.paypalTransactionId,
    },
    billing: {
      name: "",
      email: convexOrder.email,
      address: {
        line1: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
    },
    metadata: {
      source: "web" as const,
      ...convexOrder.metadata,
    },
    invoiceNumber: convexOrder.invoiceNumber,
    invoicePdfUrl: convexOrder.invoicePdfUrl,
    notes: convexOrder.notes,
    createdAt: new Date(convexOrder.createdAt).toISOString(),
    updatedAt: new Date(convexOrder.updatedAt).toISOString(),
    completedAt: convexOrder.completedAt
      ? new Date(convexOrder.completedAt).toISOString()
      : undefined,
    statusHistory: [], // Would need to be populated separately
  };
}

/**
 * Extract numeric ID from Convex order ID
 */
export function extractNumericOrderId(convexId: Id<"orders">): number {
  const idString = convexId.toString();
  const numericPart = idString.slice(-8);
  const parsed = parseInt(numericPart, 16);
  return parsed || Math.floor(Math.random() * 1000000);
}

/**
 * Extract numeric ID from Convex user ID
 */
export function extractNumericUserId(convexId: Id<"users">): number {
  const idString = convexId.toString();
  const numericPart = idString.slice(-8);
  const parsed = parseInt(numericPart, 16);
  return parsed || Math.floor(Math.random() * 1000000);
}

/**
 * Extract numeric ID from Convex order item ID
 */
export function extractNumericOrderItemId(convexId: Id<"orderItems">): number {
  const idString = convexId.toString();
  const numericPart = idString.slice(-8);
  const parsed = parseInt(numericPart, 16);
  return parsed || Math.floor(Math.random() * 1000000);
}

/**
 * Type guard to check if an object is a ConvexOrder
 */
export function isConvexOrder(obj: unknown): obj is ConvexOrder {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "_id" in obj &&
    "email" in obj &&
    "total" in obj &&
    "status" in obj &&
    "createdAt" in obj
  );
}

/**
 * Type guard to check if an object is ConvexOrderData
 */
export function isConvexOrderData(obj: unknown): obj is ConvexOrderData {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "order" in obj &&
    "items" in obj &&
    isConvexOrder((obj as ConvexOrderData).order) &&
    Array.isArray((obj as ConvexOrderData).items)
  );
}
