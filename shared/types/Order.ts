/**
 * Order and Payment Type Definitions for BroLab Entertainment
 *
 * This module contains all type definitions related to orders, payments, and transactions
 * in the BroLab Entertainment marketplace platform.
 */

import { LicenseType } from "./Beat";

// ================================
// ENUMS
// ================================

/**
 * Order status throughout the order lifecycle
 */
export enum OrderStatus {
  DRAFT = "draft",
  PENDING = "pending",
  PROCESSING = "processing",
  PAID = "paid",
  COMPLETED = "completed",
  FAILED = "failed",
  PAYMENT_FAILED = "payment_failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
  PARTIALLY_REFUNDED = "partially_refunded",
}

/**
 * Payment methods supported by the platform
 */
export enum PaymentMethod {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  APPLE_PAY = "apple_pay",
  GOOGLE_PAY = "google_pay",
  CREDIT_CARD = "credit_card",
}

/**
 * Payment status for tracking payment processing
 */
export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  REQUIRES_ACTION = "requires_action",
  REQUIRES_CONFIRMATION = "requires_confirmation",
}

/**
 * Currency codes supported by the platform
 */
export enum Currency {
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP",
  CAD = "CAD",
  AUD = "AUD",
  JPY = "JPY",
}

/**
 * Order item types
 */
export enum OrderItemType {
  BEAT = "beat",
  SUBSCRIPTION = "subscription",
  SERVICE = "service",
}

/**
 * Refund reasons
 */
export enum RefundReason {
  CUSTOMER_REQUEST = "customer_request",
  DUPLICATE_CHARGE = "duplicate_charge",
  FRAUDULENT = "fraudulent",
  REQUESTED_BY_CUSTOMER = "requested_by_customer",
  TECHNICAL_ERROR = "technical_error",
  QUALITY_ISSUE = "quality_issue",
}

// ================================
// CORE INTERFACES
// ================================

/**
 * Order item metadata for additional information
 */
export interface OrderItemMetadata {
  /** Beat genre if applicable */
  beatGenre?: string;
  /** Beat BPM if applicable */
  beatBpm?: number;
  /** Beat musical key if applicable */
  beatKey?: string;
  /** Download format preference */
  downloadFormat?: string;
  /** License terms and conditions */
  licenseTerms?: string;
  /** Custom requirements or notes */
  customizations?: Record<string, unknown>;
  /** Producer information */
  producer?: {
    id: number;
    name: string;
  };
}

/**
 * Individual item within an order
 */
export interface OrderItem {
  /** Unique item identifier */
  id: number;
  /** Product ID being purchased */
  productId: number;
  /** Type of item being purchased */
  type: OrderItemType;
  /** Product title/name */
  title: string;
  /** Product SKU if available */
  sku?: string;
  /** Quantity being purchased */
  quantity: number;
  /** Unit price in cents */
  unitPrice: number;
  /** Total price for this item (unitPrice * quantity) */
  totalPrice: number;
  /** Discount amount applied to this item in cents */
  discountAmount?: number;
  /** License type for beats */
  licenseType: LicenseType;
  /** Additional metadata */
  metadata: OrderItemMetadata;
  /** When this item was added to the order */
  addedAt: string;
}

/**
 * Billing address information
 */
export interface BillingAddress {
  /** Street address line 1 */
  line1: string;
  /** Street address line 2 (optional) */
  line2?: string;
  /** City */
  city: string;
  /** State/Province */
  state: string;
  /** Postal/ZIP code */
  postalCode: string;
  /** Country code (ISO 3166-1 alpha-2) */
  country: string;
}

/**
 * Customer billing information
 */
export interface BillingInfo {
  /** Full name */
  name: string;
  /** Email address */
  email: string;
  /** Billing address */
  address: BillingAddress;
  /** Tax ID or VAT number */
  taxId?: string;
  /** Company name if applicable */
  companyName?: string;
  /** Phone number */
  phone?: string;
}

/**
 * Payment information and details
 */
export interface PaymentInfo {
  /** Payment method used */
  method: PaymentMethod;
  /** Payment status */
  status: PaymentStatus;
  /** Stripe Payment Intent ID */
  stripePaymentIntentId?: string;
  /** PayPal transaction ID */
  paypalTransactionId?: string;
  /** Last 4 digits of card */
  last4?: string;
  /** Card brand (Visa, Mastercard, etc.) */
  brand?: string;
  /** Country of the payment method */
  country?: string;
  /** Payment method fingerprint for fraud detection */
  fingerprint?: string;
  /** Risk score from fraud detection */
  riskScore?: number;
  /** Fraud check results */
  fraudCheck?: FraudCheckResult;
  /** When payment was processed */
  processedAt?: string;
}

/**
 * Fraud detection results
 */
export interface FraudCheckResult {
  /** Risk score (0-100, higher is riskier) */
  score: number;
  /** Decision made by fraud detection */
  decision: "approve" | "review" | "decline";
  /** Reasons for the decision */
  reasons: string[];
  /** When the check was performed */
  timestamp: string;
}

/**
 * Order metadata for additional context
 */
export interface OrderMetadata {
  /** Source of the order */
  source: "web" | "mobile" | "api";
  /** Marketing campaign if applicable */
  campaign?: string;
  /** Referrer URL */
  referrer?: string;
  /** Discount code used */
  discountCode?: string;
  /** Gift message if this is a gift */
  giftMessage?: string;
  /** Special delivery instructions */
  deliveryInstructions?: string;
  /** Custom fields for additional data */
  customFields?: Record<string, unknown>;
  /** User agent string */
  userAgent?: string;
  /** IP address (hashed for privacy) */
  ipAddress?: string;
}

/**
 * Order status change history entry
 */
export interface OrderStatusHistory {
  /** History entry ID */
  id: number;
  /** Order ID this history belongs to */
  orderId: number;
  /** Status that was set */
  status: OrderStatus;
  /** Optional comment about the status change */
  comment?: string;
  /** When the status was changed */
  createdAt: string;
  /** User who made the change (if applicable) */
  changedBy?: {
    id: number;
    name: string;
    role: string;
  };
}

/**
 * Core Order interface
 */
export interface Order {
  /** Unique order identifier */
  id: number;
  /** User ID if customer is registered */
  userId?: number;
  /** Session ID for guest orders */
  sessionId?: string;
  /** Customer email address */
  email: string;
  /** Order total in cents */
  total: number;
  /** Subtotal before taxes and fees */
  subtotal: number;
  /** Tax amount */
  taxAmount: number;
  /** Processing fees */
  processingFee: number;
  /** Currency used for this order */
  currency: Currency;
  /** Current order status */
  status: OrderStatus;
  /** Items in this order */
  items: OrderItem[];
  /** Payment information */
  payment: PaymentInfo;
  /** Billing information */
  billing: BillingInfo;
  /** Order metadata */
  metadata: OrderMetadata;
  /** Invoice number */
  invoiceNumber: string;
  /** URL to invoice PDF */
  invoicePdfUrl?: string;
  /** Shipping address if applicable */
  shippingAddress?: BillingAddress;
  /** Order notes */
  notes?: string;
  /** When the order was created */
  createdAt: string;
  /** When the order was last updated */
  updatedAt: string;
  /** When the order was completed */
  completedAt?: string;
  /** Status history */
  statusHistory: OrderStatusHistory[];
}

/**
 * Order summary for listings and dashboards
 */
export interface OrderSummary {
  /** Order ID */
  id: number;
  /** Customer email */
  email: string;
  /** Order total */
  total: number;
  /** Currency */
  currency: Currency;
  /** Order status */
  status: OrderStatus;
  /** Number of items */
  itemCount: number;
  /** Order date */
  createdAt: string;
  /** Invoice number */
  invoiceNumber?: string;
}

/**
 * Order creation input
 */
export interface OrderInput {
  /** User ID if authenticated */
  userId?: number;
  /** Session ID for guest checkout */
  sessionId?: string;
  /** Customer email */
  email: string;
  /** Order items */
  items: Omit<OrderItem, "id" | "addedAt">[];
  /** Billing information */
  billing?: BillingInfo;
  /** Payment method */
  paymentMethod: PaymentMethod;
  /** Currency */
  currency?: Currency;
  /** Discount code */
  discountCode?: string;
  /** Order notes */
  notes?: string;
  /** Order metadata */
  metadata?: Partial<OrderMetadata>;
}

/**
 * Order update input
 */
export interface OrderUpdateInput {
  /** New status */
  status?: OrderStatus;
  /** Status change comment */
  statusComment?: string;
  /** Updated billing info */
  billing?: Partial<BillingInfo>;
  /** Updated notes */
  notes?: string;
  /** Updated metadata */
  metadata?: Partial<OrderMetadata>;
}

/**
 * Refund information
 */
export interface RefundInfo {
  /** Refund ID */
  id: string;
  /** Order ID being refunded */
  orderId: number;
  /** Amount being refunded in cents */
  amount: number;
  /** Currency */
  currency: Currency;
  /** Reason for refund */
  reason: RefundReason;
  /** Additional notes */
  notes?: string;
  /** Refund status */
  status: "pending" | "succeeded" | "failed" | "cancelled";
  /** When refund was created */
  createdAt: string;
  /** When refund was processed */
  processedAt?: string;
  /** Stripe refund ID */
  stripeRefundId?: string;
  /** PayPal refund ID */
  paypalRefundId?: string;
}

/**
 * Order search and filter criteria
 */
export interface OrderSearchCriteria {
  /** Search query (email, order ID, invoice number) */
  query?: string;
  /** Filter by status */
  status?: OrderStatus[];
  /** Filter by date range */
  dateRange?: {
    start: string;
    end: string;
  };
  /** Filter by total amount range */
  amountRange?: {
    min: number;
    max: number;
  };
  /** Filter by currency */
  currency?: Currency[];
  /** Filter by payment method */
  paymentMethod?: PaymentMethod[];
  /** Filter by user ID */
  userId?: number;
  /** Sort criteria */
  sortBy?: "newest" | "oldest" | "amount_high" | "amount_low" | "status";
  /** Number of results per page */
  limit?: number;
  /** Page offset */
  offset?: number;
}

/**
 * Order search results
 */
export interface OrderSearchResults {
  /** Array of matching orders */
  orders: OrderSummary[];
  /** Total number of matching orders */
  total: number;
  /** Current page */
  page: number;
  /** Number of results per page */
  limit: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Search criteria used */
  criteria: OrderSearchCriteria;
}

/**
 * Order analytics and statistics
 */
export interface OrderAnalytics {
  /** Total number of orders */
  totalOrders: number;
  /** Total revenue */
  totalRevenue: number;
  /** Average order value */
  averageOrderValue: number;
  /** Orders by status */
  ordersByStatus: Record<OrderStatus, number>;
  /** Revenue by currency */
  revenueByCurrency: Record<Currency, number>;
  /** Orders by payment method */
  ordersByPaymentMethod: Record<PaymentMethod, number>;
  /** Conversion rate */
  conversionRate?: number;
  /** Refund rate */
  refundRate?: number;
  /** Time period for these analytics */
  period: {
    start: string;
    end: string;
  };
}

// ================================
// CONSTANTS
// ================================

/** Default currency */
export const DEFAULT_CURRENCY = Currency.USD;

/** Order status flow - valid transitions */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.FAILED],
  [OrderStatus.PROCESSING]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  [OrderStatus.FAILED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.REFUNDED]: [], // Terminal state
  [OrderStatus.CANCELLED]: [], // Terminal state
  [OrderStatus.PARTIALLY_REFUNDED]: [OrderStatus.REFUNDED],
} as const;

/** Currency symbols for display */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.USD]: "$",
  [Currency.EUR]: "€",
  [Currency.GBP]: "£",
  [Currency.CAD]: "C$",
  [Currency.AUD]: "A$",
  [Currency.JPY]: "¥",
} as const;

/** Payment method display names */
export const PAYMENT_METHOD_NAMES: Record<PaymentMethod, string> = {
  [PaymentMethod.STRIPE]: "Credit Card",
  [PaymentMethod.PAYPAL]: "PayPal",
  [PaymentMethod.APPLE_PAY]: "Apple Pay",
  [PaymentMethod.GOOGLE_PAY]: "Google Pay",
  [PaymentMethod.CREDIT_CARD]: "Credit Card",
} as const;
