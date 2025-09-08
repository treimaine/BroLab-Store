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
    throw new Error(`Invalid environment configuration: ${issues}`);
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
