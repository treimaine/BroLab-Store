import { z } from "zod";

const nodeEnv = (process.env.NODE_ENV as "development" | "test" | "production") || "development";

// =============================================================================
// CRITICAL VS OPTIONAL KEYS CLASSIFICATION
// =============================================================================

/** Keys that are critical for app functionality even in development */
const CRITICAL_KEYS = new Set([
  "VITE_CONVEX_URL",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
]);

/** Keys that are optional and have safe defaults */
const OPTIONAL_KEYS = new Set([
  "PORT",
  "CLERK_WEBHOOK_SECRET",
  "CLERK_BILLING_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "VITE_STRIPE_PUBLIC_KEY",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "PAYPAL_MODE",
  "BRAND_NAME",
  "BRAND_EMAIL",
  "BRAND_ADDRESS",
  "BRAND_LOGO_PATH",
  "LEGACY_SUPABASE",
  "USE_CONVEX_ORDER_READ",
]);

// =============================================================================
// STRUCTURED LOGGING FOR ENV WARNINGS
// =============================================================================

interface EnvWarningContext {
  nodeEnv: string;
  timestamp: string;
  criticalMissing: string[];
  optionalMissing: string[];
  validationErrors: string[];
}

/**
 * Log structured warnings for environment configuration issues.
 * Categorizes missing keys by criticality to help developers identify
 * which variables need immediate attention vs which are optional.
 */
function logEnvWarnings(context: EnvWarningContext): void {
  const { nodeEnv: env, timestamp, criticalMissing, optionalMissing, validationErrors } = context;

  const header = [
    "",
    "┌─────────────────────────────────────────────────────────────┐",
    "│ ⚠️  ENVIRONMENT CONFIGURATION WARNING                        │",
    "├─────────────────────────────────────────────────────────────┤",
    `│ Environment: ${env.padEnd(46)} │`,
    `│ Timestamp: ${timestamp.slice(0, 48).padEnd(48)} │`,
  ];

  const criticalSection =
    criticalMissing.length > 0
      ? [
          "├─────────────────────────────────────────────────────────────┤",
          "│ 🔴 CRITICAL KEYS MISSING (may cause runtime errors):        │",
          ...criticalMissing.map(key => `│    • ${key.padEnd(53)} │`),
        ]
      : [];

  const optionalSection =
    optionalMissing.length > 0
      ? [
          "├─────────────────────────────────────────────────────────────┤",
          "│ 🟡 OPTIONAL KEYS MISSING (using defaults):                  │",
          ...optionalMissing.map(key => `│    • ${key.padEnd(53)} │`),
        ]
      : [];

  const errorSection =
    validationErrors.length > 0
      ? [
          "├─────────────────────────────────────────────────────────────┤",
          "│ 🔶 VALIDATION ERRORS:                                       │",
          ...validationErrors.map(err => `│    • ${err.slice(0, 53).padEnd(53)} │`),
        ]
      : [];

  const footer = ["└─────────────────────────────────────────────────────────────┘", ""];

  const lines = [...header, ...criticalSection, ...optionalSection, ...errorSection, ...footer];

  // Log formatted output for humans
  console.warn(lines.join("\n"));

  // Also emit structured JSON for log aggregation systems
  console.warn(
    JSON.stringify({
      level: "warn",
      message: "Environment configuration issues detected",
      context: {
        nodeEnv: env,
        timestamp,
        criticalMissing,
        optionalMissing,
        validationErrors,
        hasCriticalIssues: criticalMissing.length > 0,
      },
    })
  );
}

/**
 * Categorize Zod validation issues into critical vs optional
 */
function categorizeEnvIssues(issues: z.ZodIssue[]): {
  critical: string[];
  optional: string[];
  errors: string[];
} {
  const critical: string[] = [];
  const optional: string[] = [];
  const errors: string[] = [];

  for (const issue of issues) {
    const path = issue.path.join(".");
    const errorMsg = `${path}: ${issue.message}`;

    if (CRITICAL_KEYS.has(path)) {
      critical.push(path);
    } else if (OPTIONAL_KEYS.has(path)) {
      optional.push(path);
    } else {
      errors.push(errorMsg);
    }
  }

  return { critical, optional, errors };
}

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional(),

  // Clerk (optional in dev/test to keep DX/tests green, required in prod)
  VITE_CLERK_PUBLISHABLE_KEY: nodeEnv === "production" ? z.string().min(1) : z.string().optional(),
  CLERK_SECRET_KEY: nodeEnv === "production" ? z.string().min(1) : z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  CLERK_BILLING_ENABLED: z
    .string()
    .transform(v => v === "true")
    .optional(),

  // Convex
  VITE_CONVEX_URL: nodeEnv === "production" ? z.string().url() : z.string().optional(),

  // Stripe (validated by paymentConfig for completeness)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  VITE_STRIPE_PUBLIC_KEY: z.string().optional(),

  // PayPal (validated by paymentConfig for completeness)
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MODE: z.enum(["sandbox", "production"]).optional(),

  // Branding for invoices
  BRAND_NAME: z.string().optional(),
  BRAND_EMAIL: z.string().optional(),
  BRAND_ADDRESS: z.string().optional(),
  BRAND_LOGO_PATH: z.string().optional(),

  // Feature flags
  LEGACY_SUPABASE: z
    .string()
    .transform(v => v === "true")
    .optional(),
  USE_CONVEX_ORDER_READ: z
    .string()
    .transform(v => v === "true")
    .optional(),
});

export type Env = z.infer<typeof baseSchema> & {
  flags: {
    legacySupabase: boolean;
    useConvexOrderRead: boolean;
  };
};

export function loadEnv(): Env {
  const parsed = baseSchema.safeParse(process.env);

  if (!parsed.success) {
    // Categorize issues by criticality
    const { critical, optional, errors } = categorizeEnvIssues(parsed.error.issues);

    // In production, throw error immediately with all issues
    if (nodeEnv === "production") {
      const allIssues = parsed.error.issues
        .map(i => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      throw new Error(`❌ Critical environment configuration missing: ${allIssues}`);
    }

    // In development/test, log structured warnings
    logEnvWarnings({
      nodeEnv,
      timestamp: new Date().toISOString(),
      criticalMissing: critical,
      optionalMissing: optional,
      validationErrors: errors,
    });

    // Return safe defaults for development
    return {
      NODE_ENV: nodeEnv,
      PORT: process.env.PORT,
      VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
      CLERK_BILLING_ENABLED: process.env.CLERK_BILLING_ENABLED === "true",
      VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      VITE_STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY,
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
      PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
      PAYPAL_MODE: (process.env.PAYPAL_MODE as "sandbox" | "production") || undefined,
      BRAND_NAME: process.env.BRAND_NAME,
      BRAND_EMAIL: process.env.BRAND_EMAIL,
      BRAND_ADDRESS: process.env.BRAND_ADDRESS,
      BRAND_LOGO_PATH: process.env.BRAND_LOGO_PATH,
      LEGACY_SUPABASE: process.env.LEGACY_SUPABASE === "true",
      USE_CONVEX_ORDER_READ: process.env.USE_CONVEX_ORDER_READ === "true",
      flags: {
        legacySupabase: process.env.LEGACY_SUPABASE === "true",
        useConvexOrderRead: process.env.USE_CONVEX_ORDER_READ === "true",
      },
    } as Env;
  }

  const env = parsed.data;
  return {
    ...env,
    flags: {
      legacySupabase: Boolean(env.LEGACY_SUPABASE),
      useConvexOrderRead: Boolean(env.USE_CONVEX_ORDER_READ),
    },
  } as Env;
}

export const env = loadEnv();

// Re-export payment config utilities for convenience
export { getPaymentConfig, type PaymentConfig } from "../config/paymentConfig";
export { enforcePaymentSecrets, validatePaymentSecrets } from "../utils/validatePaymentSecrets";
