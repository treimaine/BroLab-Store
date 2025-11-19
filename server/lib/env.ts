import { z } from "zod";

const nodeEnv = (process.env.NODE_ENV as "development" | "test" | "production") || "development";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional(),

  // Clerk (optional in dev/test to keep DX/tests green, required in prod)
  VITE_CLERK_PUBLISHABLE_KEY: nodeEnv === "production" ? z.string().min(1) : z.string().optional(),
  CLERK_SECRET_KEY: nodeEnv === "production" ? z.string().min(1) : z.string().optional(),

  // Convex
  VITE_CONVEX_URL: nodeEnv === "production" ? z.string().url() : z.string().optional(),

  // Stripe/PayPal (optional depending on feature flags)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),

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
    const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");

    // In production, throw error immediately
    if (nodeEnv === "production") {
      throw new Error(`❌ Critical environment configuration missing: ${issues}`);
    }

    // In development/test, log warning but continue with defaults
    console.warn(`⚠️ Environment configuration issues (using defaults): ${issues}`);

    // Return safe defaults for development
    return {
      NODE_ENV: nodeEnv,
      PORT: process.env.PORT,
      VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
      BRAND_NAME: process.env.BRAND_NAME,
      BRAND_EMAIL: process.env.BRAND_EMAIL,
      BRAND_ADDRESS: process.env.BRAND_ADDRESS,
      BRAND_LOGO_PATH: process.env.BRAND_LOGO_PATH,
      LEGACY_SUPABASE: process.env.LEGACY_SUPABASE,
      USE_CONVEX_ORDER_READ: process.env.USE_CONVEX_ORDER_READ,
      flags: {
        legacySupabase: Boolean(process.env.LEGACY_SUPABASE),
        useConvexOrderRead: Boolean(process.env.USE_CONVEX_ORDER_READ),
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
