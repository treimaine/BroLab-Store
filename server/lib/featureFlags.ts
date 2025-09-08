import { env } from "./env";

export const featureFlags = {
  LEGACY_SUPABASE: env.flags.legacySupabase === true,
  USE_CONVEX_ORDER_READ: env.flags.useConvexOrderRead === true,
} as const;



