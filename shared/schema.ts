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

export const OrderStatus = [
  "pending",
  "processing",
  "paid",
  "completed",
  "failed",
  "refunded",
  "cancelled"
] as const;
export type OrderStatusEnum = typeof OrderStatus[number];

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
  downloads_used?: number; // Number of downloads used this month
  quota?: number; // Monthly download quota
  avatar?: string | null; // User avatar URL
  subscription?: string | null; // Subscription status
  memberSince?: string; // Member since date
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
// EMAIL VALIDATION
// ==========================
//

export const verifyEmailSchema = z.object({
  token: z.string().uuid('Format de token invalide')
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Format d\'email invalide')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Format d\'email invalide')
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid('Format de token invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères')
});

//
// ==========================
// BEAT
// ==========================
//

// Type unifié pour les produits beats (fusion Beat + ProductLike)
export type BeatProduct = {
  id: number;
  wordpress_id?: number;
  title: string;
  name?: string; // Alias pour title (compatibilité WooCommerce)
  description?: string | null;
  genre: string;
  bpm?: number;
  key?: string | null;
  mood?: string | null;
  price: number;
  audio_url?: string | null;
  image_url?: string | null;
  image?: string; // Alias pour image_url (compatibilité WooCommerce)
  images?: Array<{ src: string; alt?: string }>; // Images WooCommerce
  tags?: string[] | null;
  featured?: boolean;
  downloads?: number;
  views?: number;
  duration?: number;
  is_active?: boolean;
  isExclusive?: boolean; // Pour les règles d'accès
  is_free?: boolean; // Indique si le produit est gratuit
  created_at?: string;
};

// Type legacy Beat (maintenu pour compatibilité)
export type Beat = BeatProduct;

// Type ProductLike unifié (pour compatibilité avec accessControl)
export type ProductLike = {
  id: number;
  title: string;
  price: number;
  image?: string;
  isExclusive?: boolean;
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
// WISHLIST
// ==========================
//

export type WishlistItem = {
  id: number;
  user_id: number;
  beat_id: number;
  created_at: string;
};

export const insertWishlistItemSchema = z.object({
  user_id: z.number(),
  beat_id: z.number(),
});
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;

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
  status: OrderStatusEnum;
  stripe_payment_intent_id?: string | null;
  items: CartItem[]; // Typed array of CartItem
  created_at: string;
  invoice_number?: string;
  invoice_pdf_url?: string;
  shipping_address?: string | null;
};

export const insertOrderSchema = z.object({
  user_id: z.number().optional().nullable(),
  session_id: z.string().optional().nullable(),
  email: z.string().email(),
  total: z.number(),
  status: z.enum(OrderStatus),
  stripe_payment_intent_id: z.string().optional().nullable(),
  items: z.any(),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;

//
// ==========================
// ORDER STATUS HISTORY
// ==========================
//

export type OrderStatusHistory = {
  id: number;
  order_id: number;
  status: OrderStatusEnum;
  comment?: string | null;
  created_at: string;
};

export const insertOrderStatusHistorySchema = z.object({
  order_id: z.number(),
  status: z.enum(OrderStatus),
  comment: z.string().optional().nullable(),
});
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;

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
  user_id: number; // Always required - all downloads must be linked to a user
  product_id: number;
  license: string;
  downloaded_at: string; // ISO timestamp
  download_count?: number; // Nombre de téléchargements pour ce produit/license
}

export const insertDownloadSchema = z.object({
  productId: z.number().positive('Product ID must be a positive number'),
  license: z.enum(LicenseType, { errorMap: () => ({ message: 'License must be basic, premium, or unlimited' }) }),
  price: z.number().min(0).optional(), // Price in cents, optional for free downloads
  productName: z.string().optional(), // Optional product name for order creation
});
export type InsertDownload = z.infer<typeof insertDownloadSchema>;

//
// ==========================
// ACTIVITY LOG
// ==========================
//

export type ActivityLog = {
  id: number;
  user_id?: number | null;
  action: string; // Real column name in Supabase
  details?: any;
  timestamp: string;
};

export const insertActivityLogSchema = z.object({
  user_id: z.number().optional().nullable(),
  action: z.string(),
  details: z.any().optional(),
  timestamp: z.string().optional(),
});
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

//
// ==========================
// FILE MANAGEMENT
// ==========================
//

export type File = {
  id: string;
  user_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  role: 'upload' | 'deliverable' | 'invoice';
  reservation_id?: string | null;
  order_id?: number | null;
  owner_id?: number | null;
  created_at: string;
};

export const insertFileSchema = z.object({
  user_id: z.number(),
  filename: z.string(),
  original_name: z.string(),
  mime_type: z.string(),
  size: z.number(),
  storage_path: z.string(),
  role: z.enum(['upload', 'deliverable', 'invoice']),
  reservation_id: z.string().optional().nullable(),
  order_id: z.number().optional().nullable(),
  owner_id: z.number().optional().nullable(),
});
export type InsertFile = z.infer<typeof insertFileSchema>;

//
// ==========================
// SERVICE ORDERS
// ==========================
//

export const ServiceType = ['mixing', 'mastering', 'recording', 'custom_beat', 'consultation'] as const;
export type ServiceTypeEnum = typeof ServiceType[number];

export type ServiceOrder = {
  id: number;
  user_id: number;
  service_type: ServiceTypeEnum;
  details: {
    duration?: number;
    tracks?: number;
    format?: 'wav' | 'mp3' | 'aiff';
    quality?: 'standard' | 'premium';
    rush?: boolean;
    notes?: string;
  };
  estimated_price: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export const insertServiceOrderSchema = z.object({
  user_id: z.number(),
  service_type: z.enum(ServiceType),
  details: z.object({
    duration: z.number().optional(),
    tracks: z.number().optional(),
    format: z.enum(['wav', 'mp3', 'aiff']).optional(),
    quality: z.enum(['standard', 'premium']).optional(),
    rush: z.boolean().optional(),
    notes: z.string().optional(),
  }),
  estimated_price: z.number().min(0),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
});
export type InsertServiceOrder = z.infer<typeof insertServiceOrderSchema>;
export type ServiceOrderInput = InsertServiceOrder;

//
// ==========================
// RESERVATIONS
// ==========================
//

export const ReservationStatus = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;
export type ReservationStatusEnum = typeof ReservationStatus[number];

export type Reservation = {
  id: string; // UUID
  user_id?: number | null;
  service_type: ServiceTypeEnum;
  status: ReservationStatusEnum;
  details: {
    name: string;
    email: string;
    phone: string;
    requirements?: string;
    reference_links?: string[];
  };
  preferred_date: string; // ISO date string
  duration_minutes: number;
  total_price: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export const insertReservationSchema = z.object({
  user_id: z.number().optional().nullable(),
  service_type: z.enum(ServiceType),
  details: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    phone: z.string().min(10, 'Invalid phone number'),
    requirements: z.string().optional(),
    reference_links: z.array(z.string().url()).optional()
  }),
  preferred_date: z.string().datetime(),
  duration_minutes: z.number().min(30).max(480),
  total_price: z.number().min(0),
  notes: z.string().optional().nullable()
});
export type InsertReservation = z.infer<typeof insertReservationSchema>;

