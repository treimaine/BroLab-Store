/**
 * Payment Validation Schemas
 *
 * Centralized validation for all payment-related operations including
 * Stripe, PayPal, subscriptions, and payment intents.
 *
 * @module shared/validation/PaymentValidation
 */

import { z } from "zod";

// ================================
// CONSTANTS
// ================================

/**
 * Supported PayPal currencies
 */
export const PAYPAL_SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "CAD", "AUD"] as const;
export type PayPalCurrency = (typeof PAYPAL_SUPPORTED_CURRENCIES)[number];

// ================================
// SUBSCRIPTION SCHEMAS
// ================================

/**
 * Subscription creation validation
 */
export const createSubscriptionSchema = z.object({
  priceId: z.enum(["basic", "pro", "unlimited"], {
    errorMap: () => ({ message: "Invalid subscription plan" }),
  }),
  billingInterval: z.enum(["monthly", "annual"], {
    errorMap: () => ({ message: "Invalid billing interval" }),
  }),
});

/**
 * Enhanced subscription creation with additional security checks
 */
export const serverCreateSubscriptionSchema = createSubscriptionSchema.extend({
  userAgent: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  timestamp: z.number().optional(),
});

// ================================
// PAYMENT INTENT SCHEMAS
// ================================

/**
 * Payment intent validation
 */
export const paymentIntentSchema = z.object({
  amount: z.number().min(100, "Amount must be at least $1.00").max(999999, "Amount is too high"),
  currency: z.enum(["usd", "eur"], {
    errorMap: () => ({ message: "Invalid currency" }),
  }),
  metadata: z.record(z.string()).optional(),
});

/**
 * Enhanced payment validation with currency checks
 */
export const enhancedPaymentIntentSchema = paymentIntentSchema.refine(
  data => {
    const minimums = { usd: 50, eur: 50 }; // $0.50, €0.50
    return data.amount >= minimums[data.currency];
  },
  {
    message: "Amount below minimum for currency",
    path: ["amount"],
  }
);

// ================================
// STRIPE SCHEMAS
// ================================

/**
 * Stripe webhook validation
 */
export const stripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
  created: z.number(),
});

// ================================
// PAYPAL SCHEMAS
// ================================

/**
 * PayPal Create Order Schema
 * Validates amount, currency, and required fields for PayPal order creation
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
export const paypalCreateOrderSchema = z.object({
  serviceType: z
    .string()
    .min(1, "Service type is required")
    .max(100, "Service type must be 100 characters or less"),
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .min(0.5, "Minimum amount is $0.50")
    .max(999999.99, "Amount exceeds maximum allowed ($999,999.99)"),
  currency: z.enum(PAYPAL_SUPPORTED_CURRENCIES, {
    errorMap: () => ({
      message: `Currency must be one of: ${PAYPAL_SUPPORTED_CURRENCIES.join(", ")}`,
    }),
  }),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  reservationId: z.string().min(1, "Reservation ID is required"),
  customerEmail: z.string().email("Invalid email format"),
});

// ================================
// RATE LIMITING
// ================================

/**
 * Rate limiting validation
 */
export const rateLimitSchema = z.object({
  ip: z.string(),
  endpoint: z.string(),
  timestamp: z.number(),
  count: z.number().min(0),
});

// ================================
// AUDIT LOG
// ================================

/**
 * Audit log validation
 */
export const auditLogSchema = z.object({
  userId: z.number(),
  action: z.string(),
  resource: z.string(),
  details: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date(),
});

// ================================
// TYPE EXPORTS
// ================================

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type ServerCreateSubscriptionInput = z.infer<typeof serverCreateSubscriptionSchema>;
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
export type EnhancedPaymentIntentInput = z.infer<typeof enhancedPaymentIntentSchema>;
export type StripeWebhookInput = z.infer<typeof stripeWebhookSchema>;
export type PayPalCreateOrderInput = z.infer<typeof paypalCreateOrderSchema>;
export type RateLimitInput = z.infer<typeof rateLimitSchema>;
export type AuditLogInput = z.infer<typeof auditLogSchema>;
