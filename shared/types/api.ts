/**
 * Core API Type Definitions
 *
 * This module contains the fundamental API response types and utilities
 * used across the BroLab Entertainment platform.
 */

import type { WooCommerceMetaData } from "./WooCommerceApi";

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
 * Error response type
 */
export interface ErrorResponse {
  error: {
    type: string;
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
  message?: string;
  timestamp: number;
  requestId?: string;
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
 * Validation error response
 */
export interface ValidationErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code: string;
    details: {
      errors: Array<{ field: string; message: string; code: string }>;
      invalidFields: string[];
    };
  };
  timestamp: number;
  requestId?: string;
}

/**
 * Authentication error response
 */
export interface AuthErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code: string;
    details?: {
      requiredPermissions?: string[];
      userPermissions?: string[];
      sessionExpiresAt?: number;
    };
  };
  timestamp: number;
  requestId?: string;
}

/**
 * Business error response
 */
export interface BusinessErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
  timestamp: number;
  requestId?: string;
}

/**
 * Rate limit error response
 */
export interface RateLimitErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code: string;
    details: {
      limit: number;
      remaining: number;
      resetTime: number;
      retryAfter: number;
    };
  };
  timestamp: number;
  requestId?: string;
}

/**
 * File upload error response
 */
export interface FileUploadErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code: string;
    details?: {
      fileSize?: number;
      maxFileSize?: number;
      uploadedFileType?: string;
      allowedFileTypes?: string[];
      scanResults?: {
        threatFound: boolean;
        threatName?: string;
        scanEngine?: string;
      };
    };
  };
  timestamp: number;
  requestId?: string;
}

/**
 * External service error response
 */
export interface ExternalServiceErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code: string;
    details: {
      serviceName: string;
      serviceStatusCode?: number;
      serviceErrorMessage?: string;
      isTemporary: boolean;
      estimatedRecoveryTime?: string;
    };
  };
  timestamp: number;
  requestId?: string;
}

/**
 * Authenticated user type
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
}

/**
 * API Error type
 */
export interface ApiError {
  type: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * API Request type
 */
export interface ApiRequest<T = unknown> {
  data: T;
  headers?: Record<string, string>;
  timestamp?: number;
  requestId?: string;
}

/**
 * Activity details
 */
export interface ActivityDetails {
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Activity metadata
 */
export interface ActivityMetadata {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
}

/**
 * Audit change
 */
export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Audit context
 */
export interface AuditContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit details
 */
export interface AuditDetails {
  changes: AuditChange[];
  context: AuditContext;
  timestamp: number;
}

/**
 * Payment metadata
 */
export interface PaymentMetadata {
  paymentIntentId?: string;
  customerId?: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Quota usage metadata
 */
export interface QuotaUsageMetadata {
  used: number;
  limit: number;
  resetDate?: string;
  quotaType: string;
}

/**
 * Session data
 */
export interface SessionData {
  userId?: string;
  sessionId: string;
  expiresAt: number;
  data?: Record<string, unknown>;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  createdAt: number;
  lastAccessedAt: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Webhook data
 */
export interface WebhookData {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Webhook metadata
 */
export interface WebhookMetadata {
  source: string;
  signature?: string;
  deliveryId?: string;
  attempt: number;
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  id: string;
  type: string;
  data: WebhookData;
  metadata: WebhookMetadata;
}

/**
 * Apple Pay line item
 */
export interface ApplePayLineItem {
  label: string;
  amount: string;
  type?: "final" | "pending";
}

/**
 * Apple Pay payment request
 */
export interface ApplePayPaymentRequest {
  countryCode: string;
  currencyCode: string;
  merchantCapabilities: string[];
  supportedNetworks: string[];
  total: ApplePayLineItem;
  lineItems?: ApplePayLineItem[];
}

/**
 * Apple Pay shipping method
 */
export interface ApplePayShippingMethod {
  label: string;
  amount: string;
  type: string;
  identifier: string;
}

/**
 * Google Pay merchant info
 */
export interface GooglePayMerchantInfo {
  merchantId: string;
  merchantName: string;
}

/**
 * Google Pay payment method
 */
export interface GooglePayPaymentMethod {
  type: string;
  parameters: Record<string, unknown>;
  tokenizationSpecification: GooglePayTokenizationSpecification;
}

/**
 * Google Pay payment request
 */
export interface GooglePayPaymentRequest {
  apiVersion: number;
  apiVersionMinor: number;
  allowedPaymentMethods: GooglePayPaymentMethod[];
  merchantInfo: GooglePayMerchantInfo;
  transactionInfo: GooglePayTransactionInfo;
}

/**
 * Google Pay tokenization specification
 */
export interface GooglePayTokenizationSpecification {
  type: string;
  parameters: Record<string, unknown>;
}

/**
 * Google Pay transaction info
 */
export interface GooglePayTransactionInfo {
  totalPriceStatus: string;
  totalPrice: string;
  currencyCode: string;
  countryCode: string;
}

// Re-export WooCommerce types from the woocommerce types file
// Note: WooCommerceMetaData is now imported from shared/types/WooCommerceApi.ts to avoid conflicts

export interface WooCommerceImage {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  src: string;
  name: string;
  alt: string;
}

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  description?: string;
  display?: string;
  image?: WooCommerceImage | null;
  menu_order?: number;
  count?: number;
}

export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

export interface WooCommerceAttribute {
  id: number;
  name: string;
  slug?: string;
  type?: string;
  order_by?: string;
  has_archives?: boolean;
  options: string[];
  position: number;
  visible: boolean;
  variation: boolean;
}

export interface WooCommerceDimensions {
  length: string;
  width: string;
  height: string;
}

export interface WooCommerceDownload {
  id: string;
  name: string;
  file: string;
}

export interface WooCommerceDefaultAttribute {
  id: number;
  name: string;
  option: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: "simple" | "grouped" | "external" | "variable";
  status: "draft" | "pending" | "private" | "publish";
  featured: boolean;
  catalog_visibility: "visible" | "catalog" | "search" | "hidden";
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: WooCommerceDownload[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: "taxable" | "shipping" | "none";
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  backorders: "no" | "notify" | "yes";
  backorders_allowed: boolean;
  backordered: boolean;
  low_stock_amount: number | null;
  sold_individually: boolean;
  weight: string;
  dimensions: WooCommerceDimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: WooCommerceCategory[];
  tags: WooCommerceTag[];
  images: WooCommerceImage[];
  attributes: WooCommerceAttribute[];
  default_attributes: WooCommerceDefaultAttribute[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  price_html: string;
  related_ids: number[];
  meta_data: WooCommerceMetaData[];
  stock_status: "instock" | "outofstock" | "onbackorder";
  // BroLab Entertainment specific fields
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
