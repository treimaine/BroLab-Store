// API-specific type definitions to replace 'any' types

import { ErrorType } from "../constants/errors";

// ================================
// REQUEST/RESPONSE TYPES
// ================================

export interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
  user?: AuthenticatedUser;
  session?: SessionData;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: number;
  requestId?: string;
}

export interface ApiError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// ================================
// AUTHENTICATION TYPES
// ================================

export interface AuthenticatedUser {
  id: string;
  clerkId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: number;
  preferences: UserPreferences;
  metadata: UserMetadata;
}

export interface UserPreferences {
  language: string;
  theme: "light" | "dark" | "auto";
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  audio: AudioPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  updates: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: "public" | "private" | "friends";
  showActivity: boolean;
  allowAnalytics: boolean;
}

export interface AudioPreferences {
  defaultVolume: number;
  autoplay: boolean;
  quality: "low" | "medium" | "high";
  downloadFormat: "mp3" | "wav" | "flac";
}

export interface UserMetadata {
  signupSource?: string;
  referralCode?: string;
  lastActiveAt?: number;
  deviceInfo?: DeviceInfo;
  locationInfo?: LocationInfo;
  subscriptionHistory?: SubscriptionEvent[];
}

export interface DeviceInfo {
  type: "desktop" | "mobile" | "tablet";
  os: string;
  browser: string;
  version: string;
  screenResolution?: string;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  ip?: string; // Hashed for privacy
}

export interface SubscriptionEvent {
  type: "created" | "upgraded" | "downgraded" | "cancelled" | "renewed";
  planId: string;
  timestamp: number;
  amount?: number;
  currency?: string;
}

// ================================
// SESSION TYPES
// ================================

export interface SessionData {
  sessionId: string;
  userId?: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  isAuthenticated: boolean;
  permissions: string[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  loginMethod?: "email" | "oauth" | "sso";
  mfaVerified?: boolean;
  rememberMe?: boolean;
  deviceTrusted?: boolean;
  lastPasswordChange?: number;
}

// ================================
// ORDER AND PAYMENT TYPES
// ================================

export interface OrderItem {
  productId: number;
  type: "beat" | "subscription" | "service";
  title: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  licenseType?: string;
  metadata: OrderItemMetadata;
}

export interface OrderItemMetadata {
  beatGenre?: string;
  beatBpm?: number;
  beatKey?: string;
  downloadFormat?: string;
  licenseTerms?: string;
  customizations?: Record<string, unknown>;
}

export interface OrderMetadata {
  source: "web" | "mobile" | "api";
  campaign?: string;
  referrer?: string;
  discountCode?: string;
  giftMessage?: string;
  deliveryInstructions?: string;
  customFields?: Record<string, unknown>;
}

export interface PaymentMetadata {
  paymentMethod: "stripe" | "paypal" | "apple_pay" | "google_pay";
  last4?: string;
  brand?: string;
  country?: string;
  fingerprint?: string;
  riskScore?: number;
  fraudCheck?: FraudCheckResult;
}

export interface FraudCheckResult {
  score: number;
  decision: "approve" | "review" | "decline";
  reasons: string[];
  timestamp: number;
}

// ================================
// RESERVATION TYPES
// ================================

export interface ReservationDetails {
  name: string;
  email: string;
  phone: string;
  requirements?: string;
  referenceLinks?: string[];
  projectDescription?: string;
  deadline?: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  additionalServices?: string[];
  communicationPreference?: "email" | "phone" | "video";
}

// ================================
// ACTIVITY LOG TYPES
// ================================

export interface ActivityDetails {
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata: ActivityMetadata;
}

export interface ActivityMetadata {
  ipAddress?: string;
  userAgent?: string;
  location?: LocationInfo;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  additionalContext?: Record<string, unknown>;
}

// ================================
// AUDIT LOG TYPES
// ================================

export interface AuditDetails {
  operation: string;
  resource: string;
  resourceId: string;
  changes: AuditChange[];
  context: AuditContext;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: "create" | "update" | "delete";
}

export interface AuditContext {
  requestId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  apiVersion?: string;
  clientVersion?: string;
  correlationId?: string;
}

// ================================
// WEBHOOK TYPES
// ================================

export interface WebhookPayload {
  id: string;
  type: string;
  version: string;
  timestamp: number;
  data: WebhookData;
  metadata: WebhookMetadata;
}

export interface WebhookData {
  object: Record<string, unknown>;
  previousAttributes?: Record<string, unknown>;
}

export interface WebhookMetadata {
  source: string;
  environment: "production" | "staging" | "development";
  retryCount?: number;
  originalTimestamp?: number;
}

// ================================
// BILLING TYPES
// ================================

export interface BillingInfo {
  name: string;
  email: string;
  address: BillingAddress;
  taxId?: string;
  companyName?: string;
  phone?: string;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// ================================
// QUOTA USAGE TYPES
// ================================

export interface QuotaUsageMetadata {
  resourceType: "download" | "upload" | "api_call" | "storage";
  resourceSize?: number;
  resourceFormat?: string;
  clientInfo?: DeviceInfo;
  location?: LocationInfo;
  timestamp: number;
}

// ================================
// EXTERNAL API TYPES
// ================================

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
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  price_html: string;
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
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
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
  related_ids: number[];
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
  meta_data: WooCommerceMetaData[];
}

export interface WooCommerceDownload {
  id: string;
  name: string;
  file: string;
}

export interface WooCommerceDimensions {
  length: string;
  width: string;
  height: string;
}

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceImage {
  id: number;
  date_created: string;
  date_modified: string;
  src: string;
  name: string;
  alt: string;
}

export interface WooCommerceAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooCommerceDefaultAttribute {
  id: number;
  name: string;
  option: string;
}

export interface WooCommerceMetaData {
  id: number;
  key: string;
  value: string | number | boolean | string[] | null;
}

// ================================
// PAYMENT PROVIDER TYPES
// ================================

export interface ApplePayPaymentRequest {
  countryCode: string;
  currencyCode: string;
  supportedNetworks: string[];
  merchantCapabilities: string[];
  total: ApplePayLineItem;
  lineItems?: ApplePayLineItem[];
  shippingMethods?: ApplePayShippingMethod[];
  requiredBillingContactFields?: string[];
  requiredShippingContactFields?: string[];
}

export interface ApplePayLineItem {
  label: string;
  amount: string;
  type?: "final" | "pending";
}

export interface ApplePayShippingMethod {
  label: string;
  detail: string;
  amount: string;
  identifier: string;
}

export interface GooglePayPaymentRequest {
  apiVersion: number;
  apiVersionMinor: number;
  allowedPaymentMethods: GooglePayPaymentMethod[];
  transactionInfo: GooglePayTransactionInfo;
  merchantInfo: GooglePayMerchantInfo;
}

export interface GooglePayPaymentMethod {
  type: string;
  parameters: Record<string, unknown>;
  tokenizationSpecification: GooglePayTokenizationSpecification;
}

export interface GooglePayTokenizationSpecification {
  type: string;
  parameters: Record<string, unknown>;
}

export interface GooglePayTransactionInfo {
  totalPriceStatus: string;
  totalPrice: string;
  currencyCode: string;
  countryCode: string;
}

export interface GooglePayMerchantInfo {
  merchantName: string;
  merchantId?: string;
}
