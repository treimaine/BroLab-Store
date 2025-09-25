/**
 * Stripe API Type Definitions
 * Shared types for Stripe payment processing across client and server
 */

// Core Stripe Objects
export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing"
    | "requires_capture"
    | "canceled"
    | "succeeded";
  client_secret: string;
  customer?: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  current_period_start: number;
  current_period_end: number;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        unit_amount: number;
        currency: string;
        recurring: {
          interval: "month" | "year";
        };
      };
    }>;
  };
}

// API Request/Response Types
export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  paymentIntent: StripePaymentIntent;
  clientSecret: string;
}

export interface CreateCustomerRequest {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}

// Webhook Types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
  created: number;
}

export type StripeWebhookEventType =
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed";

// Error Types
export interface StripeError {
  type:
    | "card_error"
    | "invalid_request_error"
    | "api_error"
    | "authentication_error"
    | "rate_limit_error";
  code?: string;
  message: string;
  param?: string;
}

export interface StripeApiError extends Error {
  type: "StripeError";
  raw: StripeError;
  statusCode?: number;
}
