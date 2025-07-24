import { z } from "zod";

//
// ==========================
// ENUMS & CONSTANTES GLOBALES
// ==========================
//

export const LicenseType = ["basic", "premium", "unlimited"] as const;
export type LicenseTypeEnum = typeof LicenseType[number];

export const LicensePricing = {
  basic: 29.99,
  premium: 49.99,
  unlimited: 149.99,
} as const;

//
// ==========================
// USER
// ==========================
//

export type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  stripeCustomerId?: string | null; // Stripe customer ID (optionnel)
  stripe_customer_id?: string | null; // Snake case version for Supabase compatibility
  created_at: string; // aligné sur la colonne Supabase
};

export const insertUserSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});
export type InsertUser = z.infer<typeof insertUserSchema>;

//
// ==========================
// EMAIL VERIFICATION
// ==========================
//

export type EmailVerification = {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
};

export const insertEmailVerificationSchema = z.object({
  user_id: z.number(),
  token: z.string(),
  expires_at: z.string(),
});
export type InsertEmailVerification = z.infer<typeof insertEmailVerificationSchema>;

//
// ==========================
// PASSWORD RESET
// ==========================
//

export type PasswordReset = {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
};

export const insertPasswordResetSchema = z.object({
  user_id: z.number(),
  token: z.string(),
  expires_at: z.string(),
});
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;

//
// ==========================
// BEAT
// ==========================
//

export type Beat = {
  id: number;
  wordpress_id: number;
  title: string;
  description?: string | null;
  genre: string;
  bpm: number;
  key?: string | null;
  mood?: string | null;
  price: number;
  audio_url?: string | null;
  image_url?: string | null;
  tags?: string[] | null;
  featured?: boolean;
  downloads?: number;
  views?: number;
  duration?: number;
  is_active?: boolean;
  created_at: string;
};

export const insertBeatSchema = z.object({
  wordpress_id: z.number(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  genre: z.string(),
  bpm: z.number(),
  key: z.string().optional().nullable(),
  mood: z.string().optional().nullable(),
  price: z.number(),
  audio_url: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  featured: z.boolean().optional(),
  downloads: z.number().optional(),
  views: z.number().optional(),
  duration: z.number().optional(),
  is_active: z.boolean().optional(),
});
export type InsertBeat = z.infer<typeof insertBeatSchema>;

//
// ==========================
// CART ITEM
// ==========================
//

export type CartItem = {
  id: number;
  beat_id: number;
  //product_id: number;
  license_type: LicenseTypeEnum;
  price: number;
  quantity: number;
  session_id?: string | null;
  user_id?: number | null;
  created_at: string;
};

export const insertCartItemSchema = z.object({
  beat_id: z.number(),
  license_type: z.enum(LicenseType),
  price: z.number(),
  quantity: z.number().min(1),
  session_id: z.string().optional().nullable(),
  user_id: z.number().optional().nullable(),
});
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

//
// ==========================
// ORDER
// ==========================
//

export type Order = {
  id: number;
  user_id?: number | null;
  session_id?: string | null;
  email: string;
  total: number;
  status: string;
  stripe_payment_intent_id?: string | null;
  items: any; // JSONB côté Supabase
  created_at: string;
  invoice_number?: string;
  invoice_pdf_url?: string;
};

export const insertOrderSchema = z.object({
  user_id: z.number().optional().nullable(),
  session_id: z.string().optional().nullable(),
  email: z.string().email(),
  total: z.number(),
  status: z.string(),
  stripe_payment_intent_id: z.string().optional().nullable(),
  items: z.any(),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;

//
// ==========================
// SUBSCRIPTION
// ==========================
//

export type Subscription = {
  id: number;
  user_id: number;
  plan: LicenseTypeEnum;
  status: "active" | "inactive" | "canceled";
  started_at: string;
  expires_at: string;
  created_at: string;
};

export const insertSubscriptionSchema = z.object({
  user_id: z.number(),
  plan: z.enum(LicenseType),
  status: z.enum(["active", "inactive", "canceled"]),
  started_at: z.string(),
  expires_at: z.string(),
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

//
// ==========================
// DOWNLOAD
// ==========================
//

// Download type for logging downloads
export interface Download {
  id: string; // uuid
  user_id: number;
  product_id: number;
  license: string;
  downloaded_at: string; // ISO timestamp
  download_count: number;
}

export const insertDownloadSchema = z.object({
  user_id: z.number(),
  beat_id: z.number(),
  downloaded_at: z.string(),
});
export type InsertDownload = z.infer<typeof insertDownloadSchema>;

//
// ==========================
// SERVICE ORDER
// ==========================
//

export interface ServiceOrderInput {
  user_id: number;
  service_type: string;   // 'mixing' | 'mastering' | 'custom_beat' | ...
  details: string;
  status?: string;        // 'pending' | 'in_progress' | 'delivered' | 'revision' | 'completed'
  addons?: any[];         // optional JSON array
  base_price?: number;
}

export interface ServiceOrder extends ServiceOrderInput {
  id: string;             // uuid
  created_at: string;     // ISO timestamp
  updated_at?: string;
}

export const insertServiceOrderSchema = z.object({
  user_id: z.number(),
  service_type: z.string(),
  details: z.any(),
  status: z.string(),
});
export type InsertServiceOrder = z.infer<typeof insertServiceOrderSchema>;

//
// ==========================
// FILES
// ==========================
//

export type File = {
  id: string; // uuid
  owner_id: number;
  reservation_id?: string | null; // uuid reference
  order_id?: number | null;
  storage_path: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  role: "upload" | "deliverable" | "invoice";
  created_at: string;
};

export const insertFileSchema = z.object({
  owner_id: z.number(),
  reservation_id: z.string().uuid().optional().nullable(),
  order_id: z.number().optional().nullable(),
  storage_path: z.string(),
  mime_type: z.string().optional().nullable(),
  size_bytes: z.number().optional().nullable(),
  role: z.enum(["upload", "deliverable", "invoice"]),
});
export type InsertFile = z.infer<typeof insertFileSchema>;

//
// ==========================
// RATE LIMITS
// ==========================
//

export type RateLimit = {
  id: string; // uuid
  user_id: number;
  action: string;
  request_count: number;
  window_start: string;
  created_at: string;
  updated_at: string;
};

export const insertRateLimitSchema = z.object({
  user_id: z.number(),
  action: z.string(),
  request_count: z.number().default(1),
  window_start: z.string(),
});
export type InsertRateLimit = z.infer<typeof insertRateLimitSchema>;

//
// ==========================
// HELPERS
// ==========================
//

export const convertPriceForCurrency = (usdPrice: number, exchangeRate: number): number => {
  return Math.round(usdPrice * exchangeRate * 100) / 100;
};

export const formatPriceWithCurrency = (
  usdPrice: number,
  exchangeRate: number,
  currencySymbol: string
): string => {
  const convertedPrice = convertPriceForCurrency(usdPrice, exchangeRate);
  return `${currencySymbol}${convertedPrice.toFixed(2)}`;
};

export interface ActivityLog {
  id: string;
  user_id: number;
  product_id: number;
  license: string;
  event_type: string; // "download"
  timestamp: string; // ISO
  download_count?: number;
}

//
// ==========================
// COMMON / UTIL
// ==========================
//

export type UUID = string; // ou brandé si tu veux: type UUID = string & { __uuid: true };
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

//
// ==========================
// BEAT / USER (déjà présents normalement) – on crée surtout les variantes DB/Insert
// ==========================
//

/** Ligne telle qu’elle sort de Supabase (identique à Beat ici, mais tu peux diverger si besoin) */
//export type DbBeat = Beat;

/** Quand on insère un beat (on ne connaît pas id/created_at) */
//export type InsertBeat = Omit<Beat, 'id' | 'created_at'> & Partial<Pick<Beat, 'id' | 'created_at'>>;

