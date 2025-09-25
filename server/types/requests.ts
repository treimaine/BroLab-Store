/**
 * Server Request/Response Type Definitions
 *
 * This module contains type definitions for all server-side request bodies,
 * response objects, and internal interfaces used in the Express application.
 */

import { Request } from "express";

// ================================
// REQUEST BODY INTERFACES
// ================================

/**
 * Login request body interface
 */
export interface LoginRequestBody {
  username?: string;
  email?: string;
  password?: string;
}

/**
 * Audio player control request bodies
 */
export interface PlayRequestBody {
  beatId?: number;
}

export interface VolumeRequestBody {
  level?: number;
}

export interface SeekRequestBody {
  position?: number;
}

/**
 * Cart management request bodies
 */
export interface AddToCartRequestBody {
  beatId?: number;
  beat_id?: number;
  quantity?: number;
}

export interface UpdateCartItemRequestBody {
  quantity?: number;
}

/**
 * Service booking request body
 */
export interface ServiceBookingRequestBody {
  serviceType?: string;
  name?: string;
  email?: string;
  phone?: string;
  requirements?: string;
  deadline?: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
}

/**
 * Favorites/Wishlist request body
 */
export interface FavoritesRequestBody {
  beatId?: number;
}

/**
 * Recently played request body
 */
export interface RecentlyPlayedRequestBody {
  beatId?: number;
}

/**
 * Translation request query parameters
 */
export interface TranslationQuery {
  lang?: string;
  key?: string;
}

/**
 * Currency formatting query parameters
 */
export interface CurrencyFormatQuery {
  currency?: string;
  amount?: string;
}

/**
 * PayPal order creation request body
 */
export interface PayPalOrderRequestBody {
  serviceType?: string;
  amount?: number;
  currency?: string;
  description?: string;
  reservationId?: string;
  customerEmail?: string;
}

// ================================
// RESPONSE INTERFACES
// ================================

/**
 * Standard success response
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp?: string;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  timestamp?: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  token?: string;
  accessToken?: string;
  access_token?: string;
  userId?: number;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
  environment: string;
}

/**
 * User sync status response
 */
export interface UserSyncResponse {
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

/**
 * Dashboard data response
 */
export interface DashboardResponse {
  analytics: {
    totalPlays: number;
    totalRevenue: number;
    users?: number;
  };
  orders: Array<{
    orderId: string;
    date: string;
    items: unknown[];
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

/**
 * Audio player status response
 */
export interface AudioPlayerStatusResponse {
  beatId: number;
  position: number;
  volume: number;
  status: "playing" | "paused" | "stopped";
  duration?: number;
}

/**
 * Waveform data response
 */
export interface WaveformResponse {
  waveform: number[];
}

/**
 * Translation response
 */
export interface TranslationResponse {
  translation: string;
}

/**
 * Currency format response
 */
export interface CurrencyFormatResponse {
  localized: string;
}

/**
 * PayPal order response
 */
export interface PayPalOrderResponse {
  success: boolean;
  paymentUrl?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  serviceType?: string;
  reservationId?: string;
  customerEmail?: string;
  timestamp?: string;
  test?: boolean;
  message?: string;
  error?: string;
}

/**
 * Subscription plans response
 */
export interface SubscriptionPlansResponse {
  id: string;
  name: string;
  price: number;
}

// ================================
// BUSINESS OBJECT INTERFACES
// ================================

/**
 * WooCommerce product response from external API
 */
export interface WooCommerceProductResponse {
  id: number;
  name: string;
  short_description?: string;
  description?: string;
  categories?: Array<{ name: string }>;
  meta_data?: Array<{ key: string; value: string | number }>;
  price?: string;
  prices?: { price: string };
  images?: Array<{ src: string }>;
}

/**
 * Mapped beat object for internal use
 */
export interface MappedBeat {
  id: number;
  title: string;
  description?: string;
  genre: string;
  bpm: number;
  price: number;
  image?: string;
}

/**
 * Cart item interface
 */
export interface CartItem {
  id: string;
  beat_id: number;
  quantity: number;
}

/**
 * Service booking interface
 */
export interface Booking {
  id: string;
  serviceType: string;
  name?: string;
  email?: string;
  phone?: string;
  requirements?: string;
  deadline?: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
}

/**
 * Audio player state interface
 */
export interface AudioPlayerState {
  beatId?: number;
  status?: "playing" | "paused" | "stopped";
  volume?: number;
  position?: number;
  duration?: number;
}

/**
 * Translation map interface
 */
export interface TranslationMap {
  [key: string]: {
    [locale: string]: string;
  };
}

// ================================
// EXTENDED REQUEST INTERFACES
// ================================

/**
 * Request with session data (deprecated - use AuthenticatedRequest from ./index.ts)
 * @deprecated Use AuthenticatedRequest instead
 */
export interface RequestWithSession extends Request {
  requestId?: string;
}

/**
 * Request with authentication data (deprecated - use AuthenticatedRequest from ./index.ts)
 * @deprecated Use AuthenticatedRequest instead
 */
export interface RequestWithAuth extends Request {
  requestId?: string;
}

// ================================
// TYPE GUARDS
// ================================

/**
 * Type guard to check if a request has session data
 * @deprecated Use proper authentication middleware instead
 */
export function hasSession(req: Request): req is RequestWithSession {
  return "requestId" in req;
}

/**
 * Type guard to check if a request has auth data
 * @deprecated Use proper authentication middleware instead
 */
export function hasAuth(req: Request): req is RequestWithAuth {
  return "requestId" in req;
}

/**
 * Type guard to validate login request body
 */
export function isValidLoginBody(body: unknown): body is LoginRequestBody {
  return typeof body === "object" && body !== null;
}

/**
 * Type guard to validate cart request body
 */
export function isValidCartBody(body: unknown): body is AddToCartRequestBody {
  return (
    typeof body === "object" &&
    body !== null &&
    (("beatId" in body && typeof (body as AddToCartRequestBody).beatId === "number") ||
      ("beat_id" in body && typeof (body as AddToCartRequestBody).beat_id === "number"))
  );
}

/**
 * Type guard to validate service booking body
 */
export function isValidBookingBody(body: unknown): body is ServiceBookingRequestBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "serviceType" in body &&
    typeof (body as ServiceBookingRequestBody).serviceType === "string"
  );
}
