/**
 * Server-Side API Type Definitions
 *
 * This module contains server-specific type definitions for Express routes,
 * middleware, and internal API handling.
 */

import { NextFunction, Request, Response } from "express";
import { User } from "../../shared/types/User";
import * as ApiTypes from "../../shared/types/apiEndpoints";

// ================================
// EXPRESS REQUEST/RESPONSE TYPES
// ================================

/**
 * Authenticated Express Request
 */
export interface AuthenticatedRequest<
  TParams = Record<string, string>,
  TResponse = unknown,
  TBody = unknown,
  TQuery = Record<string, unknown>,
> extends Omit<Request<TParams, TResponse, TBody, TQuery>, "user"> {
  user?: User;
  requestId?: string;
}

/**
 * Typed Express Response
 */
export type TypedResponse<T = unknown> = Response<T | { error: string; [key: string]: unknown }>;

/**
 * Error Response
 */
export type ErrorResponse = Response<ApiTypes.ErrorResponse>;

/**
 * Request handler with proper typing
 */
export type TypedRequestHandler<
  TParams = Record<string, string>,
  TResponse = unknown,
  TBody = unknown,
  TQuery = Record<string, unknown>,
> = (
  req: AuthenticatedRequest<TParams, TResponse, TBody, TQuery>,
  res: TypedResponse<TResponse>,
  next?: NextFunction
) => void | Promise<void>;

// ================================
// AUTHENTICATION ROUTE TYPES
// ================================

export type SignInHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.SignInResponse,
  ApiTypes.SignInRequest
>;

export type LoginHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.LoginResponse,
  ApiTypes.LoginRequest
>;

export type RegisterHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.RegisterResponse,
  ApiTypes.RegisterRequest
>;

export type SignOutHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.SignOutResponse,
  ApiTypes.SignOutRequest
>;

export type SyncStatusHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.SyncStatusResponse
>;

// ================================
// BEAT/PRODUCT ROUTE TYPES
// ================================

export type GetBeatsHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetBeatsResponse,
  never,
  ApiTypes.GetBeatsRequest
>;

export type GetBeatHandler = TypedRequestHandler<
  { id: string },
  ApiTypes.GetBeatResponse,
  never,
  Record<string, never>
>;

export type CreateBeatHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CreateBeatResponse,
  ApiTypes.CreateBeatRequest
>;

// ================================
// WOOCOMMERCE ROUTE TYPES
// ================================

export type GetProductsHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetProductsResponse,
  never,
  ApiTypes.GetProductsRequest
>;

export type GetProductHandler = TypedRequestHandler<
  { id: string },
  ApiTypes.GetProductResponse,
  never,
  Record<string, never>
>;

export type GetCategoriesHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetCategoriesResponse
>;

// ================================
// ORDER ROUTE TYPES
// ================================

export type CreateOrderHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CreateOrderResponse,
  ApiTypes.CreateOrderRequest
>;

export type GetMyOrdersHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetMyOrdersResponse,
  never,
  ApiTypes.GetMyOrdersRequest
>;

export type GetOrderHandler = TypedRequestHandler<
  { id: string },
  ApiTypes.GetOrderResponse,
  never,
  Record<string, never>
>;

export type GetInvoiceHandler = TypedRequestHandler<
  { id: string },
  ApiTypes.GetInvoiceResponse,
  never,
  Record<string, never>
>;

// ================================
// PAYMENT ROUTE TYPES
// ================================

export type CreatePaymentSessionHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CreatePaymentSessionResponse,
  ApiTypes.CreatePaymentSessionRequest
>;

export type PaymentWebhookHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.PaymentWebhookResponse,
  ApiTypes.PaymentWebhookRequest
>;

export type CreatePaymentIntentHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CreatePaymentIntentResponse,
  ApiTypes.CreatePaymentIntentRequest
>;

export type StripeWebhookHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.StripeWebhookResponse,
  ApiTypes.StripeWebhookRequest
>;

// ================================
// PAYPAL ROUTE TYPES
// ================================

export type CreatePayPalOrderHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CreatePayPalOrderResponse,
  ApiTypes.CreatePayPalOrderRequest
>;

export type CapturePayPalOrderHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CapturePayPalOrderResponse,
  ApiTypes.CapturePayPalOrderRequest
>;

// ================================
// RESERVATION ROUTE TYPES
// ================================

export type CreateReservationHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CreateReservationResponse,
  ApiTypes.CreateReservationRequest
>;

export type GetReservationsHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetReservationsResponse,
  never,
  ApiTypes.GetReservationsRequest
>;

export type GetReservationHandler = TypedRequestHandler<
  { id: string },
  ApiTypes.GetReservationResponse,
  never,
  Record<string, never>
>;

export type UpdateReservationHandler = TypedRequestHandler<
  { id: string },
  ApiTypes.UpdateReservationResponse,
  ApiTypes.UpdateReservationRequest
>;

// ================================
// CART ROUTE TYPES
// ================================

export type AddToCartHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.AddToCartResponse,
  ApiTypes.AddToCartRequest
>;

export type GetCartHandler = TypedRequestHandler<Record<string, never>, ApiTypes.GetCartResponse>;

export type UpdateCartItemHandler = TypedRequestHandler<
  { id: string },
  ApiTypes.UpdateCartItemResponse,
  ApiTypes.UpdateCartItemRequest
>;

export type RemoveCartItemHandler = TypedRequestHandler<
  { id: string },
  ApiTypes.RemoveCartItemResponse,
  never,
  Record<string, never>
>;

// ================================
// CHECKOUT ROUTE TYPES
// ================================

export type CheckoutHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CheckoutResponse,
  ApiTypes.CheckoutRequest
>;

export type ProcessCheckoutHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.ProcessCheckoutResponse,
  ApiTypes.ProcessCheckoutRequest
>;

// ================================
// USER ROUTE TYPES
// ================================

export type GetProfileHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetProfileResponse
>;

export type UpdateProfileHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.UpdateProfileResponse,
  ApiTypes.UpdateProfileRequest
>;

export type GetFavoritesHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetFavoritesResponse
>;

export type AddToFavoritesHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.AddToFavoritesResponse,
  ApiTypes.AddToFavoritesRequest
>;

export type RemoveFromFavoritesHandler = TypedRequestHandler<
  { beatId: string },
  void,
  never,
  Record<string, never>
>;

export type GetWishlistHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetWishlistResponse
>;

export type AddToWishlistHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.AddToWishlistResponse,
  ApiTypes.AddToWishlistRequest
>;

export type RemoveFromWishlistHandler = TypedRequestHandler<
  { beatId: string },
  void,
  never,
  Record<string, never>
>;

export type AddRecentlyPlayedHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.AddRecentlyPlayedResponse,
  ApiTypes.AddRecentlyPlayedRequest
>;

export type GetRecentlyPlayedHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetRecentlyPlayedResponse
>;

// ================================
// DASHBOARD ROUTE TYPES
// ================================

export type GetDashboardHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetDashboardResponse
>;

export type GetUserDashboardHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetUserDashboardResponse
>;

export type GetAnalyticsHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetAnalyticsResponse
>;

// ================================
// AUDIO PLAYER ROUTE TYPES
// ================================

export type PlayBeatHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.PlayBeatResponse,
  ApiTypes.PlayBeatRequest
>;

export type PauseBeatHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.PauseBeatResponse
>;

export type SetVolumeHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.SetVolumeResponse,
  ApiTypes.SetVolumeRequest
>;

export type SeekHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.SeekResponse,
  ApiTypes.SeekRequest
>;

export type GetPlayerStatusHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetPlayerStatusResponse
>;

export type GetDurationHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetDurationResponse
>;

export type GetWaveformHandler = TypedRequestHandler<
  { beatId: string },
  ApiTypes.GetWaveformResponse,
  never,
  Record<string, never>
>;

// ================================
// DOWNLOAD ROUTE TYPES
// ================================

export type GetDownloadHandler = TypedRequestHandler<
  { licenseType: string; beatName: string },
  ApiTypes.GetDownloadResponse,
  never,
  Record<string, never>
>;

export type GetLicenseAgreementHandler = TypedRequestHandler<
  { licenseType: string },
  ApiTypes.GetLicenseAgreementResponse,
  never,
  Record<string, never>
>;

export type TrackDownloadHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.TrackDownloadResponse,
  ApiTypes.TrackDownloadRequest
>;

// ================================
// INTERNATIONALIZATION ROUTE TYPES
// ================================

export type GetTranslationHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetTranslationResponse,
  never,
  ApiTypes.GetTranslationRequest
>;

export type GetTranslationsHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.GetTranslationsResponse,
  never,
  ApiTypes.GetTranslationsRequest
>;

export type GetLocaleHandler = TypedRequestHandler<
  { lang: string },
  ApiTypes.GetLocaleResponse,
  never,
  Record<string, never>
>;

export type FormatCurrencyHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.FormatCurrencyResponse,
  never,
  ApiTypes.FormatCurrencyRequest
>;

// ================================
// SERVICE BOOKING ROUTE TYPES
// ================================

export type CreateServiceBookingHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.CreateServiceBookingResponse,
  ApiTypes.CreateServiceBookingRequest
>;

// ================================
// SUBSCRIPTION ROUTE TYPES
// ================================

export type GetPlansHandler = TypedRequestHandler<Record<string, never>, ApiTypes.GetPlansResponse>;

export type AuthenticateSubscriptionHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.AuthenticateSubscriptionResponse
>;

// ================================
// HEALTH ROUTE TYPES
// ================================

export type HealthCheckHandler = TypedRequestHandler<
  Record<string, never>,
  ApiTypes.HealthCheckResponse
>;

// ================================
// MIDDLEWARE TYPES
// ================================

/**
 * Authentication middleware
 */
export type AuthMiddleware = (
  req: AuthenticatedRequest,
  res: ErrorResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Validation middleware
 */
export type ValidationMiddleware<T> = (
  req: AuthenticatedRequest<Record<string, string>, unknown, T>,
  res: ErrorResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Rate limiting middleware
 */
export type RateLimitMiddleware = (
  req: AuthenticatedRequest,
  res: ErrorResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Error handling middleware
 */
export type ErrorMiddleware = (
  error: Error,
  req: AuthenticatedRequest,
  res: ErrorResponse,
  next: NextFunction
) => void | Promise<void>;

// ================================
// UTILITY TYPES
// ================================

/**
 * Route configuration
 */
export interface RouteConfig<THandler extends TypedRequestHandler> {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  handler: THandler;
  middleware?: Array<AuthMiddleware | ValidationMiddleware<unknown> | RateLimitMiddleware>;
  auth?: boolean;
  validation?: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
  };
}

/**
 * API endpoint metadata
 */
export interface ApiEndpointMeta {
  path: string;
  method: string;
  description: string;
  requestType?: string;
  responseType?: string;
  authRequired: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

/**
 * Service result wrapper
 */
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Database operation result
 */
export interface DatabaseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  affectedRows?: number;
}

/**
 * External API result
 */
export interface ExternalApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    status: number;
    message: string;
    response?: Record<string, unknown>;
  };
  responseTime?: number;
}
