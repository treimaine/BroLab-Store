/**
 * Server Route Type Definitions
 *
 * This module contains type definitions for server route handlers,
 * request/response interfaces, and error handling patterns.
 */

import { Request, Response } from "express";
import type { WooCommerceMetaData } from "../../shared/types";

// ================================
// REQUEST/RESPONSE INTERFACES
// ================================

/**
 * Standard API error response
 */
export interface RouteErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: number;
  requestId?: string;
}

/**
 * Standard API success response
 */
export interface RouteSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp?: number;
}

/**
 * Union type for all route responses
 */
export type RouteResponse<T = unknown> = RouteSuccessResponse<T> | RouteErrorResponse;

/**
 * Express request with authenticated user
 */
export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    clerkId?: string;
    email: string;
    username?: string;
    name?: string;
    role?: string;
  } & Record<string, unknown>;
  security?: unknown;
  validatedData?: Record<string, unknown>;
}

/**
 * Express response with typed JSON method
 */
export interface TypedResponse<T = unknown> extends Response {
  json(body: RouteResponse<T>): this;
}

// ================================
// STRIPE ROUTE TYPES
// ================================

/**
 * Stripe checkout session parameters
 */
export interface StripeCheckoutSessionParams {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Order item for Stripe line items
 */
export interface StripeOrderItem {
  title?: string;
  unitPrice?: number;
  totalPrice?: number;
  qty?: number;
  quantity?: number;
  productId?: string | number; // Support both string and number for compatibility
  type?: string;
}

/**
 * Convex order item from database (matches schema)
 */
export interface ConvexOrderItem {
  _id: string;
  _creationTime: number;
  orderId: string;
  productId: number; // Always number in Convex schema
  type: string;
  title: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  metadata?: {
    beatGenre?: string;
    beatBpm?: number;
    beatKey?: string;
    downloadFormat?: string;
    licenseTerms?: string;
  };
}

/**
 * Order data from Convex getOrderWithRelations
 */
export interface ConvexOrderData {
  order: {
    _id: string;
    _creationTime: number;
    userId?: string;
    email: string;
    status: string;
    total: number;
    currency?: string;
    sessionId?: string;
    paymentIntentId?: string;
    invoiceNumber?: string;
    invoiceId?: string;
    createdAt: number;
    updatedAt?: number;
  };
  items: ConvexOrderItem[];
  payments?: Array<{
    _id: string;
    _creationTime: number;
    orderId: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    stripeEventId?: string;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    createdAt: number;
  }>;
  invoice?: unknown;
}

/**
 * Stripe line item
 */
export interface StripeLineItem {
  price_data: {
    currency: string;
    product_data: {
      name: string;
    };
    unit_amount: number;
  };
  quantity: number;
}

// ================================
// PAYPAL ROUTE TYPES
// ================================

/**
 * PayPal payment request
 */
export interface PaymentRequest {
  serviceType: string;
  amount: number;
  currency: string;
  description: string;
  reservationId: string;
  userId: string;
  customerEmail: string;
}

/**
 * PayPal create order request body
 */
export interface PayPalCreateOrderRequest {
  serviceType: string;
  amount: string | number;
  currency: string;
  description: string;
  reservationId: string;
  customerEmail: string;
}

/**
 * PayPal capture payment request body
 */
export interface PayPalCapturePaymentRequest {
  orderId: string;
}

// ================================
// STORAGE ROUTE TYPES
// ================================

/**
 * File upload response
 */
export interface FileUploadResponse {
  success: boolean;
  fileId?: string;
  url?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

/**
 * File list response
 */
export interface FileListResponse {
  files: Array<{
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
    url?: string;
  }>;
}

/**
 * Signed URL response
 */
export interface SignedUrlResponse {
  url: string;
  expiresAt: string;
}

// ================================
// WOOCOMMERCE/SITEMAP TYPES
// ================================

/**
 * WooCommerce product tag
 */
export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
}

/**
 * WooCommerce product category
 */
export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
}

/**
 * WooCommerce product image
 */
export interface WooCommerceImage {
  id: number;
  src: string;
  alt: string;
}

/**
 * Processed beat data for sitemap/schema - compatible with BeatProduct
 */
export interface ProcessedBeatData {
  id: number;
  title: string;
  description?: string;
  genre: string;
  bpm?: number;
  key?: string | null;
  mood?: string | null;
  price: number;
  image_url?: string;
  audio_url?: string;
  tags?: string[];
  duration?: number;
  downloads?: number;
  // Additional properties to make it compatible with BeatProduct
  name?: string; // Alias for title
  image?: string; // Alias for image_url
  images?: Array<{ src: string; alt?: string }>;
  categories?: Array<{ id: number; name: string }>;
  meta_data?: Array<{ key: string; value: string | number | boolean | string[] | null }>;
  attributes?: Array<{ name: string; options?: string[] }>;
  featured?: boolean;
  views?: number;
  is_active?: boolean;
  isExclusive?: boolean;
  is_free?: boolean;
  created_at?: string;
  wordpress_id?: number;
}

/**
 * WooCommerce API product response (typed version of any)
 */
export interface WooCommerceApiProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  categories?: WooCommerceCategory[];
  tags?: WooCommerceTag[];
  images?: WooCommerceImage[];
  meta_data?: WooCommerceMetaData[];
  bpm?: string;
  key?: string;
  mood?: string;
  audio_url?: string;
  duration?: string;
  downloads?: number;
}

// ================================
// ERROR HANDLING TYPES
// ================================

/**
 * Standard error object for route handlers
 */
export interface RouteError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Error handler function type
 */
export type RouteErrorHandler = (
  error: RouteError | Error | unknown,
  req: Request,
  res: Response
) => void;

/**
 * Async route handler type
 */
export type AsyncRouteHandler<T = unknown> = (
  req: AuthenticatedRequest,
  res: TypedResponse<T>
) => Promise<void>;

/**
 * Route handler with error handling
 */
export type SafeRouteHandler<T = unknown> = (
  req: AuthenticatedRequest,
  res: TypedResponse<T>
) => Promise<void> | void;

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string | Error | unknown,
  statusCode: number = 500,
  details?: Record<string, unknown>
): RouteErrorResponse {
  const message = error instanceof Error ? error.message : String(error);

  return {
    success: false,
    error: message,
    code: `HTTP_${statusCode}`,
    details,
    timestamp: Date.now(),
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data?: T, message?: string): RouteSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: Date.now(),
  };
}

/**
 * Handle async route errors
 */
export function handleRouteError(
  error: unknown,
  res: Response,
  defaultMessage: string = "Internal server error"
): void {
  console.error("Route error:", error);

  if (error instanceof Error) {
    const statusCode = (error as RouteError).statusCode || 500;
    res.status(statusCode).json(createErrorResponse(error, statusCode));
  } else {
    res.status(500).json(createErrorResponse(defaultMessage, 500));
  }
}

/**
 * Wrap async route handler with error handling
 */
export function withErrorHandling<T = unknown>(handler: AsyncRouteHandler<T>): SafeRouteHandler<T> {
  return async (req: AuthenticatedRequest, res: TypedResponse<T>) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleRouteError(error, res);
    }
  };
}
// ================================
// RE-EXPORTS FOR CONVENIENCE
// ================================

// Note: WooCommerceMetaData is imported from shared types to avoid export conflicts
