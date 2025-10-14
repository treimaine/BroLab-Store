/**
 * Stripe Webhook Type Definitions
 *
 * This module contains type definitions for Stripe webhook payloads and related data structures.
 */

import Stripe from "stripe";

/**
 * Stripe Invoice with proper typing for subscription field
 */
export interface StripeInvoiceWithSubscription extends Stripe.Invoice {
  subscription: string | Stripe.Subscription | null;
}

/**
 * Type guard to check if an invoice has a subscription
 */
export function hasSubscription(invoice: Stripe.Invoice): invoice is StripeInvoiceWithSubscription {
  return "subscription" in invoice && invoice.subscription !== undefined;
}

/**
 * Extract subscription ID from Stripe invoice
 */
export function getSubscriptionId(invoice: Stripe.Invoice): string | null {
  if (hasSubscription(invoice)) {
    if (typeof invoice.subscription === "string") {
      return invoice.subscription;
    }
    if (invoice.subscription && typeof invoice.subscription === "object") {
      return invoice.subscription.id;
    }
  }
  return null;
}

/**
 * Stripe webhook event types we handle
 */
export type StripeWebhookEventType =
  | "checkout.session.completed"
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted";

/**
 * Stripe webhook payload structure
 */
export interface StripeWebhookPayload {
  id: string;
  object: "event";
  api_version: string;
  created: number;
  data: {
    object: Stripe.Event.Data.Object;
    previous_attributes?: Record<string, unknown>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: StripeWebhookEventType;
}

/**
 * Type guard to check if webhook data is a Stripe Invoice
 */
export function isStripeInvoice(data: unknown): data is Stripe.Invoice {
  return (
    typeof data === "object" &&
    data !== null &&
    "object" in data &&
    (data as { object: string }).object === "invoice"
  );
}

/**
 * Type guard to check if webhook data is a Stripe Checkout Session
 */
export function isStripeCheckoutSession(data: unknown): data is Stripe.Checkout.Session {
  return (
    typeof data === "object" &&
    data !== null &&
    "object" in data &&
    (data as { object: string }).object === "checkout.session"
  );
}

/**
 * Type guard to check if webhook data is a Stripe Payment Intent
 */
export function isStripePaymentIntent(data: unknown): data is Stripe.PaymentIntent {
  return (
    typeof data === "object" &&
    data !== null &&
    "object" in data &&
    (data as { object: string }).object === "payment_intent"
  );
}

/**
 * Type guard to check if webhook data is a Stripe Subscription
 */
export function isStripeSubscription(data: unknown): data is Stripe.Subscription {
  return (
    typeof data === "object" &&
    data !== null &&
    "object" in data &&
    (data as { object: string }).object === "subscription"
  );
}
