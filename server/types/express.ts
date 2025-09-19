// Express.js type definitions to replace 'any' types

import { NextFunction, Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { AuthenticatedUser } from "../../shared/types/api";

// ================================
// EXTENDED REQUEST TYPES
// ================================

export interface AuthenticatedRequest extends Omit<Request, "user"> {
  user?: AuthenticatedUser;
  auth?: {
    userId: string;
    sessionId: string;
    claims: Record<string, unknown>;
  };
  requestId?: string;
}

export interface TypedRequestBody<T> extends AuthenticatedRequest {
  body: T;
}

export interface TypedRequestQuery<T extends ParsedQs = ParsedQs> extends AuthenticatedRequest {
  query: T;
}

export interface TypedRequestParams<T extends ParamsDictionary = ParamsDictionary>
  extends AuthenticatedRequest {
  params: T;
}

export interface TypedRequest<
  TBody = unknown,
  TQuery extends ParsedQs = ParsedQs,
  TParams extends ParamsDictionary = ParamsDictionary,
> extends AuthenticatedRequest {
  body: TBody;
  query: TQuery;
  params: TParams;
}

// ================================
// SPECIFIC REQUEST BODY TYPES
// ================================

export interface LoginRequestBody {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequestBody {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface CartAddRequestBody {
  beatId?: number;
  beat_id?: number;
  quantity?: number;
  licenseType?: string;
}

export interface CartUpdateRequestBody {
  quantity: number;
}

export interface AudioPlayerRequestBody {
  beatId?: number;
  level?: number;
  position?: number;
}

export interface ServiceBookingRequestBody {
  serviceType: string;
  details?: {
    name: string;
    email: string;
    phone: string;
    requirements?: string;
    referenceLinks?: string[];
  };
  preferredDate?: string;
  durationMinutes?: number;
  totalPrice?: number;
}

export interface FavoritesRequestBody {
  beatId: number;
}

export interface WishlistRequestBody {
  beatId: number;
}

export interface RecentlyPlayedRequestBody {
  beatId: number;
}

export interface PayPalOrderRequestBody {
  serviceType: string;
  amount: number;
  currency: string;
  description: string;
  reservationId: string;
  customerEmail: string;
}

// ================================
// QUERY PARAMETER TYPES
// ================================

export interface BeatsQueryParams {
  limit?: string;
  genre?: string;
  search?: string;
  page?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface TranslationQueryParams {
  lang?: string;
  key?: string;
}

export interface CurrencyFormatQueryParams {
  currency?: string;
  amount?: string;
}

// ================================
// URL PARAMETER TYPES
// ================================

export interface BeatParams {
  id: string;
}

export interface CartItemParams {
  id: string;
}

export interface FavoriteParams {
  beatId: string;
}

export interface WishlistParams {
  beatId: string;
}

export interface LocaleParams {
  lang: string;
}

// ================================
// RESPONSE TYPES
// ================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: number;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ================================
// MIDDLEWARE TYPES
// ================================

export type AuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type ErrorHandler = (
  error: Error,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void;

// ================================
// ROUTE HANDLER TYPES
// ================================

export type RouteHandler<
  TBody = unknown,
  TQuery extends ParsedQs = ParsedQs,
  TParams extends ParamsDictionary = ParamsDictionary,
  TResponse = unknown,
> = (
  req: TypedRequest<TBody, TQuery, TParams>,
  res: Response<ApiResponse<TResponse>>
) => void | Promise<void>;

export type SimpleRouteHandler = (req: AuthenticatedRequest, res: Response) => void | Promise<void>;

// ================================
// CART ITEM TYPES
// ================================

export interface CartItem {
  id: string;
  beat_id: number;
  quantity: number;
  licenseType?: string;
  price?: number;
  title?: string;
}

// ================================
// BOOKING TYPES
// ================================

export interface Booking {
  id: string;
  serviceType: string;
  status?: string;
  createdAt?: number;
  details?: ServiceBookingRequestBody["details"];
}

// ================================
// AUDIO PLAYER STATE
// ================================

export interface AudioPlayerState {
  beatId?: number;
  status?: "playing" | "paused" | "stopped";
  volume?: number;
  position?: number;
  duration?: number;
}

// ================================
// TRANSLATION TYPES
// ================================

export interface TranslationMap {
  [key: string]: {
    [locale: string]: string;
  };
}

// ================================
// PRODUCT MAPPING TYPES
// ================================

export interface MappedBeat {
  id: number;
  title: string;
  description?: string;
  genre: string;
  bpm: number;
  price: number;
  image?: string;
}

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

// ================================
// DASHBOARD TYPES
// ================================

export interface DashboardData {
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

// ================================
// SUBSCRIPTION PLAN TYPES
// ================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features?: string[];
  description?: string;
}
