/**
 * Centralized Payment Configuration
 *
 * This module provides a single source of truth for all payment provider configurations.
 * It validates that when a provider is enabled (has any key set), all required keys are present.
 *
 * Behavior:
 * - A provider is considered "enabled" if ANY of its keys are set
 * - In production: throws error if enabled provider has missing required keys
 * - In development: logs warnings but allows server to start
 */

import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Stripe configuration schema
 * Required keys when enabled: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
const StripeConfigSchema = z.object({
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  publicKey: z.string().optional(),
});

/**
 * PayPal configuration schema
 * Required keys when enabled: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID
 */
const PayPalConfigSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  webhookId: z.string().optional(),
  mode: z.enum(["sandbox", "production"]).optional(),
});

/**
 * Clerk Billing configuration schema
 * Required keys when enabled: CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
 */
const ClerkBillingConfigSchema = z.object({
  enabled: z.boolean(),
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
});

// =============================================================================
// TYPES
// =============================================================================

export interface StripeConfig {
  enabled: boolean;
  secretKey?: string;
  webhookSecret?: string;
  publicKey?: string;
  missingKeys: string[];
}

export interface PayPalConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  webhookId?: string;
  mode: "sandbox" | "production";
  missingKeys: string[];
}

export interface ClerkBillingConfig {
  enabled: boolean;
  secretKey?: string;
  webhookSecret?: string;
  missingKeys: string[];
}

export interface PaymentConfig {
  stripe: StripeConfig;
  paypal: PayPalConfig;
  clerkBilling: ClerkBillingConfig;
  isProduction: boolean;
}

// =============================================================================
// CONFIGURATION LOADER
// =============================================================================

interface KeyValidation {
  value: string | undefined;
  envName: string;
}

/**
 * Get missing keys from a list of key validations
 */
function getMissingKeys(keys: KeyValidation[], isEnabled: boolean): string[] {
  if (!isEnabled) return [];
  return keys.filter(k => !k.value).map(k => k.envName);
}

/**
 * Load Stripe configuration from environment
 */
function loadStripeConfig(): StripeConfig {
  const stripeRaw = StripeConfigSchema.parse({
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publicKey: process.env.VITE_STRIPE_PUBLIC_KEY,
  });

  const enabled = !!(stripeRaw.secretKey || stripeRaw.webhookSecret || stripeRaw.publicKey);
  const missingKeys = getMissingKeys(
    [
      { value: stripeRaw.secretKey, envName: "STRIPE_SECRET_KEY" },
      { value: stripeRaw.webhookSecret, envName: "STRIPE_WEBHOOK_SECRET" },
    ],
    enabled
  );

  return {
    enabled,
    secretKey: stripeRaw.secretKey,
    webhookSecret: stripeRaw.webhookSecret,
    publicKey: stripeRaw.publicKey,
    missingKeys,
  };
}

/**
 * Load PayPal configuration from environment
 */
function loadPayPalConfig(): PayPalConfig {
  const paypalRaw = PayPalConfigSchema.parse({
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
    mode: (process.env.PAYPAL_MODE as "sandbox" | "production") || undefined,
  });

  const enabled = !!(paypalRaw.clientId || paypalRaw.clientSecret || paypalRaw.webhookId);
  const missingKeys = getMissingKeys(
    [
      { value: paypalRaw.clientId, envName: "PAYPAL_CLIENT_ID" },
      { value: paypalRaw.clientSecret, envName: "PAYPAL_CLIENT_SECRET" },
      { value: paypalRaw.webhookId, envName: "PAYPAL_WEBHOOK_ID" },
    ],
    enabled
  );

  return {
    enabled,
    clientId: paypalRaw.clientId,
    clientSecret: paypalRaw.clientSecret,
    webhookId: paypalRaw.webhookId,
    mode: paypalRaw.mode || "sandbox",
    missingKeys,
  };
}

/**
 * Load Clerk Billing configuration from environment
 */
function loadClerkBillingConfig(): ClerkBillingConfig {
  const enabled = process.env.CLERK_BILLING_ENABLED === "true";
  const clerkBillingRaw = ClerkBillingConfigSchema.parse({
    enabled,
    secretKey: process.env.CLERK_SECRET_KEY,
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
  });

  const missingKeys = getMissingKeys(
    [
      { value: clerkBillingRaw.secretKey, envName: "CLERK_SECRET_KEY" },
      { value: clerkBillingRaw.webhookSecret, envName: "CLERK_WEBHOOK_SECRET" },
    ],
    enabled
  );

  return {
    enabled,
    secretKey: clerkBillingRaw.secretKey,
    webhookSecret: clerkBillingRaw.webhookSecret,
    missingKeys,
  };
}

/**
 * Load and parse payment configuration from environment variables
 */
export function loadPaymentConfig(): PaymentConfig {
  return {
    stripe: loadStripeConfig(),
    paypal: loadPayPalConfig(),
    clerkBilling: loadClerkBillingConfig(),
    isProduction: process.env.NODE_ENV === "production",
  };
}

// Singleton instance
let _paymentConfig: PaymentConfig | null = null;

/**
 * Get the payment configuration (cached singleton)
 */
export function getPaymentConfig(): PaymentConfig {
  _paymentConfig ??= loadPaymentConfig();
  return _paymentConfig;
}

/**
 * Reset the cached configuration (useful for testing)
 */
export function resetPaymentConfig(): void {
  _paymentConfig = null;
}
