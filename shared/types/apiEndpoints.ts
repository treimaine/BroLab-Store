/**
 * API Type Definitions for BroLab Entertainment
 *
 * This module contains comprehensive type definitions for all API endpoints,
 * including request/response interfaces, error types, and runtime validation schemas.
 * This replaces all 'any' types with proper TypeScript interfaces.
 */

import { z } from "zod";
import { Beat, LicenseType } from "./Beat";
import { Currency, Order, OrderItem, OrderStatus, PaymentMethod } from "./Order";
import { Reservation, ServiceType } from "./Reservation";
import { User } from "./User";
// ApiResponse is defined in this file, no need to import

// ================================
// AUTHENTICATION API TYPES
// ================================

// POST /api/auth/signin
export interface SignInRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface SignInResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  expiresIn: number;
}

// POST /api/auth/login
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  access_token: string;
  user: User;
  expiresAt: string;
}

// POST /api/auth/register
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RegisterResponse {
  success: boolean;
  userId: number;
  user: User;
  accessToken: string;
}

// POST /api/auth/signout
export interface SignOutRequest {
  token?: string;
}

export interface SignOutResponse {
  success: boolean;
  message: string;
}

// GET /api/user/sync-status
export interface SyncStatusResponse {
  clerkUser: {
    id: string;
    email: string;
  };
  convexUser: {
    id: string;
    email: string;
  };
  isSynchronized: boolean;
}

// ================================
// BEAT/PRODUCT API TYPES
// ================================

// GET /api/beats
export interface GetBeatsRequest {
  limit?: number;
  genre?: string;
  search?: string;
  bpm?: number;
  key?: string;
  mood?: string;
  priceMin?: number;
  priceMax?: number;
  featured?: boolean;
  free?: boolean;
  sortBy?: "newest" | "oldest" | "price_low" | "price_high" | "popular";
  page?: number;
}

export interface GetBeatsResponse {
  beats: Beat[];
  total?: number;
  page?: number;
  hasMore?: boolean;
}

// GET /api/beats/:id
export interface GetBeatRequest {
  id: number;
}

export interface GetBeatResponse {
  beat: Beat;
}

// POST /api/beats (for admin/producer)
export interface CreateBeatRequest {
  title: string;
  description?: string;
  genre: string;
  bpm?: number;
  key?: string;
  mood?: string;
  price: number;
  audioUrl?: string;
  imageUrl?: string;
  tags?: string[];
  featured?: boolean;
  duration?: number;
  isActive?: boolean;
  isExclusive?: boolean;
  isFree?: boolean;
}

export interface CreateBeatResponse {
  success: boolean;
  beat: Beat;
}

// ================================
// WOOCOMMERCE API TYPES
// ================================

// GET /api/woocommerce/products
export interface GetProductsRequest {
  per_page?: number;
  search?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
  on_sale?: boolean;
  min_price?: number;
  max_price?: number;
  orderby?: "date" | "id" | "include" | "title" | "slug" | "price" | "popularity" | "rating";
  order?: "asc" | "desc";
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; name: string; alt: string }>;
  attributes: Array<{ id: number; name: string; options: string[] }>;
  meta_data: Array<{
    id: number;
    key: string;
    value: string | number | boolean | string[] | null;
  }>;
  // BroLab specific fields
  audio_url?: string | null;
  hasVocals?: boolean;
  stems?: boolean;
  bpm?: string;
  key?: string;
  mood?: string;
  instruments?: string;
  duration?: string;
  is_free?: boolean;
}

export type GetProductsResponse = WooCommerceProduct[];

// GET /api/woocommerce/products/:id
export interface GetProductRequest {
  id: number;
}

export type GetProductResponse = WooCommerceProduct;

// GET /api/woocommerce/categories
export interface GetCategoriesResponse {
  categories: Array<{
    id: number;
    name: string;
    count: number;
    slug?: string;
    parent?: number;
  }>;
}

// ================================
// ORDER API TYPES
// ================================

// POST /api/orders
export interface CreateOrderRequest {
  items: Array<{
    productId: number;
    title: string;
    type: "beat" | "subscription" | "service";
    qty: number;
    unitPrice: number; // in cents
    metadata?: Record<string, unknown>;
  }>;
  currency: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  order: Order;
  idempotent?: boolean;
}

export interface CreateOrderErrorResponse {
  error: string;
  details?: unknown;
}

// GET /api/orders/me
export interface GetMyOrdersRequest {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface GetMyOrdersResponse {
  orders: Order[];
  page: number;
  total: number;
  totalPages: number;
  cursor?: string;
  hasMore: boolean;
}

// GET /api/orders/:id
export interface GetOrderRequest {
  id: string;
}

export interface GetOrderResponse {
  order: Order;
  items: OrderItem[];
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: string;
    comment?: string;
  }>;
}

// GET /api/orders/:id/invoice
export interface GetInvoiceRequest {
  id: string;
}

export interface GetInvoiceResponse {
  url: string;
}

// ================================
// PAYMENT API TYPES
// ================================

// POST /api/payments/create-payment-session
export interface CreatePaymentSessionRequest {
  reservationId: string;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentSessionResponse {
  success: boolean;
  checkoutUrl: string;
  sessionId: string;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// POST /api/payments/webhook
export interface PaymentWebhookRequest {
  type: string;
  data: Record<string, unknown>;
  id?: string;
  created?: number;
}

export interface PaymentWebhookResponse {
  received: boolean;
  synced: boolean;
  handled?: "subscription" | "invoice" | "order";
  result?: Record<string, unknown>;
}

// ================================
// STRIPE API TYPES
// ================================

// POST /api/payment/stripe/create-payment-intent
export interface CreatePaymentIntentRequest {
  amount: number;
  currency: Currency;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

// POST /api/payment/stripe/webhook
export interface StripeWebhookRequest {
  id: string;
  object: string;
  type: string;
  data: {
    object: Record<string, unknown>;
    previous_attributes?: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface StripeWebhookResponse {
  received: boolean;
  processed: boolean;
}

// ================================
// PAYPAL API TYPES
// ================================

// POST /api/payment/paypal/create-order
export interface CreatePayPalOrderRequest {
  serviceType: ServiceType;
  amount: number;
  currency: string;
  description: string;
  reservationId: string;
  customerEmail: string;
}

export interface CreatePayPalOrderResponse {
  success: boolean;
  paymentUrl: string;
  orderId: string;
  amount: number;
  currency: string;
  serviceType: ServiceType;
  reservationId: string;
  customerEmail: string;
  timestamp: string;
  test?: boolean;
  message?: string;
}

// POST /api/payment/paypal/capture-order
export interface CapturePayPalOrderRequest {
  orderId: string;
}

export interface CapturePayPalOrderResponse {
  success: boolean;
  captureId: string;
  status: string;
}

// ================================
// RESERVATION API TYPES
// ================================

// POST /api/reservations
export interface CreateReservationRequest {
  serviceType: ServiceType;
  details: {
    name: string;
    email: string;
    phone: string;
    requirements?: string;
    referenceLinks?: string[];
  };
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  notes?: string;
}

export interface CreateReservationResponse {
  success: boolean;
  reservation: Reservation;
  paymentUrl?: string;
}

// GET /api/reservations
export interface GetReservationsRequest {
  status?: string;
  serviceType?: ServiceType;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface GetReservationsResponse {
  reservations: Reservation[];
  total: number;
  hasMore: boolean;
}

// GET /api/reservations/:id
export interface GetReservationRequest {
  id: string;
}

export interface GetReservationResponse {
  reservation: Reservation;
}

// PUT /api/reservations/:id
export interface UpdateReservationRequest {
  id: string;
  status?: string;
  notes?: string;
  preferredDate?: string;
  durationMinutes?: number;
}

export interface UpdateReservationResponse {
  success: boolean;
  reservation: Reservation;
}

// ================================
// CART API TYPES
// ================================

// POST /api/cart/add
export interface AddToCartRequest {
  beatId?: number;
  beat_id?: number;
  licenseType?: LicenseType;
  quantity?: number;
}

export interface AddToCartResponse {
  success: boolean;
  item: {
    id: string;
    beat_id: number;
    quantity: number;
    licenseType?: LicenseType;
    price?: number;
  };
}

// GET /api/cart
export interface GetCartResponse {
  items: Array<{
    id: string;
    beat_id: number;
    quantity: number;
    licenseType?: LicenseType;
    price?: number;
  }>;
  total?: number;
  itemCount?: number;
}

// PUT /api/cart/items/:id
export interface UpdateCartItemRequest {
  id: string;
  quantity: number;
  licenseType?: LicenseType;
}

export interface UpdateCartItemResponse {
  success: boolean;
  item: {
    id: string;
    beat_id: number;
    quantity: number;
    licenseType?: LicenseType;
    price?: number;
  };
}

// DELETE /api/cart/items/:id
export interface RemoveCartItemRequest {
  id: string;
}

export interface RemoveCartItemResponse {
  success: boolean;
}

// ================================
// CHECKOUT API TYPES
// ================================

// POST /api/checkout
export interface CheckoutRequest {
  items: Array<{
    beatId: number;
    licenseType: LicenseType;
    quantity: number;
  }>;
  paymentMethod: PaymentMethod;
  billingInfo: {
    name: string;
    email: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  currency?: Currency;
}

export interface CheckoutResponse {
  success: boolean;
  order_id: string;
  paymentUrl?: string;
  clientSecret?: string;
}

// POST /api/checkout/process
export interface ProcessCheckoutRequest {
  orderId: string;
  paymentIntentId: string;
}

export interface ProcessCheckoutResponse {
  success: boolean;
  order_id: string;
  status: OrderStatus;
}

// ================================
// USER API TYPES
// ================================

// GET /api/user/profile
export interface GetProfileResponse {
  user: User;
}

// PUT /api/user/profile/update
export interface UpdateProfileRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  preferences?: Partial<User["preferences"]>;
}

export interface UpdateProfileResponse {
  success: boolean;
  user: User;
}

// GET /api/user/favorites
export type GetFavoritesResponse = Array<{ beatId: number }>;

// POST /api/user/favorites
export interface AddToFavoritesRequest {
  beatId: number;
}

export interface AddToFavoritesResponse {
  beatId: number;
}

// DELETE /api/user/favorites/:beatId
export interface RemoveFromFavoritesRequest {
  beatId: number;
}

// GET /api/user/wishlist
export type GetWishlistResponse = Array<{ beatId: number }>;

// POST /api/user/wishlist
export interface AddToWishlistRequest {
  beatId: number;
}

export interface AddToWishlistResponse {
  beatId: number;
}

// DELETE /api/user/wishlist/:beatId
export interface RemoveFromWishlistRequest {
  beatId: number;
}

// POST /api/user/recently-played
export interface AddRecentlyPlayedRequest {
  beatId: number;
}

export interface AddRecentlyPlayedResponse {
  success: boolean;
}

// GET /api/user/recently-played
export type GetRecentlyPlayedResponse = Array<{ beatId: number }>;

// ================================
// DASHBOARD API TYPES
// ================================

// GET /api/v1/dashboard
export interface GetDashboardResponse {
  analytics: {
    totalPlays: number;
    totalRevenue: number;
  };
  orders: Array<{
    orderId: string;
    date: string;
    items: OrderItem[];
  }>;
  downloads: Array<{
    beatId: number;
    downloadDate: string;
  }>;
  subscription: {
    planName: string;
    status: string;
  };
}

// GET /api/user/dashboard
export type GetUserDashboardResponse = GetDashboardResponse;

// GET /api/dashboard/analytics
export interface GetAnalyticsResponse {
  totalPlays: number;
  totalRevenue: number;
  users: number;
}

// ================================
// AUDIO PLAYER API TYPES
// ================================

// POST /api/audio/player/play
export interface PlayBeatRequest {
  beatId: number;
}

export interface PlayBeatResponse {
  status: "playing";
  beatId: number;
}

// POST /api/audio/player/pause
export interface PauseBeatResponse {
  status: "paused";
}

// POST /api/audio/player/volume
export interface SetVolumeRequest {
  level: number; // 0-1
}

export interface SetVolumeResponse {
  level: number;
}

// POST /api/audio/player/seek
export interface SeekRequest {
  position: number; // seconds
}

export interface SeekResponse {
  position: number;
}

// GET /api/audio/player/status
export interface GetPlayerStatusResponse {
  beatId: number;
  position: number;
  volume: number;
  status: "playing" | "paused" | "stopped";
}

// GET /api/audio/player/duration
export interface GetDurationResponse {
  duration: number; // seconds
}

// GET /api/audio/waveform/:beatId
export interface GetWaveformRequest {
  beatId: number;
}

export interface GetWaveformResponse {
  waveform: number[]; // Array of amplitude values
}

// ================================
// DOWNLOAD API TYPES
// ================================

// GET /api/download/:licenseType/:beatName
export interface GetDownloadRequest {
  licenseType: LicenseType;
  beatName: string;
}

export interface GetDownloadResponse {
  beatName: string;
  licenseType: LicenseType;
  files: string[];
  message: string;
  downloadUrl: string;
  licenseAgreement: string;
}

// GET /api/license-agreement/:licenseType
export interface GetLicenseAgreementRequest {
  licenseType: LicenseType;
}

export interface GetLicenseAgreementResponse {
  licenseType: LicenseType;
  agreement: string;
  terms: string;
}

// POST /api/downloads/track
export interface TrackDownloadRequest {
  productId: number;
  license: LicenseType;
  price?: number;
  productName?: string;
}

export interface TrackDownloadResponse {
  success: boolean;
  downloadId: string;
  remainingQuota?: number;
}

// ================================
// INTERNATIONALIZATION API TYPES
// ================================

// GET /api/i18n/translate
export interface GetTranslationRequest {
  lang: string;
  key: string;
}

export interface GetTranslationResponse {
  translation: string;
}

// GET /api/i18n/translations
export interface GetTranslationsRequest {
  lang: string;
  key?: string;
}

export interface GetTranslationsResponse {
  translation: string;
}

// GET /api/i18n/locales/:lang
export interface GetLocaleRequest {
  lang: string;
}

export interface GetLocaleResponse {
  lang: string;
  messages: Record<string, string>;
}

// GET /api/i18n/currency-format
export interface FormatCurrencyRequest {
  currency: string;
  amount: number;
}

export interface FormatCurrencyResponse {
  localized: string;
}

// ================================
// SERVICE BOOKING API TYPES
// ================================

// POST /api/services/bookings
export interface CreateServiceBookingRequest {
  serviceType: ServiceType;
  details?: Record<string, unknown>;
  preferredDate?: string;
  duration?: number;
  requirements?: string;
}

export interface CreateServiceBookingResponse {
  id: string;
  serviceType: ServiceType;
}

// POST /api/services/booking (alias)
export type CreateBookingRequest = CreateServiceBookingRequest;
export type CreateBookingResponse = CreateServiceBookingResponse;

// POST /api/services/book (alias)
export type BookServiceRequest = CreateServiceBookingRequest;
export type BookServiceResponse = CreateServiceBookingResponse;

// ================================
// SUBSCRIPTION API TYPES
// ================================

// GET /api/subscription/plans
export type GetPlansResponse = Array<{
  id: string;
  name: string;
  price: number;
}>;

// POST /api/subscription/authenticate
export interface AuthenticateSubscriptionResponse {
  token: string;
}

// ================================
// HEALTH AND MONITORING API TYPES
// ================================

// GET /api/health
export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
  environment: string;
  version?: string;
  uptime?: number;
  checks?: Record<
    string,
    {
      status: "ok" | "error";
      message?: string;
      responseTime?: number;
    }
  >;
}

// ================================
// ZOD VALIDATION SCHEMAS
// ================================

// Authentication schemas
export const signInRequestSchema = z
  .object({
    username: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(1),
  })
  .refine(data => data.username || data.email, {
    message: "Either username or email is required",
  });

export const registerRequestSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// Beat schemas
export const getBeatsRequestSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  genre: z.string().optional(),
  search: z.string().optional(),
  bpm: z.number().min(1).max(300).optional(),
  key: z.string().optional(),
  mood: z.string().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  featured: z.boolean().optional(),
  free: z.boolean().optional(),
  sortBy: z.enum(["newest", "oldest", "price_low", "price_high", "popular"]).optional(),
  page: z.number().min(1).optional(),
});

export const createBeatRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  genre: z.string().min(1),
  bpm: z.number().min(1).max(300).optional(),
  key: z.string().optional(),
  mood: z.string().optional(),
  price: z.number().min(0),
  audioUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  duration: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
  isExclusive: z.boolean().optional(),
  isFree: z.boolean().optional(),
});

// Order schemas
export const createOrderRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().positive(),
        title: z.string().min(1),
        type: z.enum(["beat", "subscription", "service"]),
        qty: z.number().min(1),
        unitPrice: z.number().min(0),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .min(1),
  currency: z.string().length(3),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().optional(),
});

// Payment schemas
export const createPaymentSessionRequestSchema = z.object({
  reservationId: z.string().min(1),
  amount: z.number().min(1),
  currency: z.string().length(3),
  description: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

// Reservation schemas
export const createReservationRequestSchema = z.object({
  serviceType: z.enum(["mixing", "mastering", "recording", "custom_beat", "consultation"]),
  details: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
    requirements: z.string().optional(),
    referenceLinks: z.array(z.string().url()).optional(),
  }),
  preferredDate: z.string().datetime(),
  durationMinutes: z.number().min(30).max(480),
  totalPrice: z.number().min(0),
  notes: z.string().optional(),
});

// Cart schemas
export const addToCartRequestSchema = z
  .object({
    beatId: z.number().positive().optional(),
    beat_id: z.number().positive().optional(),
    licenseType: z.enum(["basic", "premium", "unlimited"]).optional(),
    quantity: z.number().min(1).optional().default(1),
  })
  .refine(data => data.beatId || data.beat_id, {
    message: "Either beatId or beat_id is required",
  });

// Audio player schemas
export const playBeatRequestSchema = z.object({
  beatId: z.number().positive(),
});

export const setVolumeRequestSchema = z.object({
  level: z.number().min(0).max(1),
});

export const seekRequestSchema = z.object({
  position: z.number().min(0),
});

// Download schemas
export const trackDownloadRequestSchema = z.object({
  productId: z.number().positive(),
  license: z.enum(["basic", "premium", "unlimited"]),
  price: z.number().min(0).optional(),
  productName: z.string().optional(),
});

// ================================
// TYPE EXPORTS
// ================================

export type SignInRequestType = z.infer<typeof signInRequestSchema>;
export type RegisterRequestType = z.infer<typeof registerRequestSchema>;
export type GetBeatsRequestType = z.infer<typeof getBeatsRequestSchema>;
export type CreateBeatRequestType = z.infer<typeof createBeatRequestSchema>;
export type CreateOrderRequestType = z.infer<typeof createOrderRequestSchema>;
export type CreatePaymentSessionRequestType = z.infer<typeof createPaymentSessionRequestSchema>;
export type CreateReservationRequestType = z.infer<typeof createReservationRequestSchema>;
export type AddToCartRequestType = z.infer<typeof addToCartRequestSchema>;
export type PlayBeatRequestType = z.infer<typeof playBeatRequestSchema>;
export type SetVolumeRequestType = z.infer<typeof setVolumeRequestSchema>;
export type SeekRequestType = z.infer<typeof seekRequestSchema>;
export type TrackDownloadRequestType = z.infer<typeof trackDownloadRequestSchema>;

// ================================
// UTILITY TYPES
// ================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Generic API endpoint interface
 */
export interface ApiEndpoint<TRequest = unknown, TResponse = unknown> {
  request: TRequest;
  response: ApiResponse<TResponse>;
}

/**
 * Typed API response wrapper
 */
export type TypedApiResponse<T> = ApiResponse<T>;

/**
 * Error response type
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
  code?: string;
  timestamp?: string;
}

/**
 * Success response type
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp?: string;
}

/**
 * Paginated response type
 */
export interface PaginatedApiResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}
