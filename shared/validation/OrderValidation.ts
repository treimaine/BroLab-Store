import { z } from "zod";
import { LicenseType } from "./BeatValidation";

// ================================
// ORDER VALIDATION SCHEMAS
// ================================

/**
 * Order status validation
 */
export const OrderStatus = z.enum([
  "pending",
  "processing",
  "completed",
  "cancelled",
  "refunded",
  "failed",
]);

/**
 * Payment status validation
 */
export const PaymentStatus = z.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
  "requires_payment_method",
  "requires_confirmation",
]);

/**
 * Payment provider validation
 */
export const PaymentProvider = z.enum(["stripe", "paypal", "clerk_billing"]);

/**
 * Currency validation (ISO 4217 codes)
 */
export const Currency = z.enum([
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
]);

/**
 * Order item validation
 */
export const OrderItemSchema = z.object({
  id: z.string().optional(),
  productId: z.number().positive(),
  productType: z.enum(["beat", "subscription", "service", "custom"]),
  title: z.string().min(1, "Product title is required").max(200),

  // License information for beats
  licenseType: LicenseType.optional(),

  // Pricing
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  quantity: z.number().positive().default(1),
  totalPrice: z.number().min(0, "Total price cannot be negative"),

  // Discounts
  discountAmount: z.number().min(0).default(0),
  discountCode: z.string().max(50).optional(),

  // Metadata
  metadata: z.record(z.unknown()).optional(),

  // Digital delivery
  downloadUrl: z.string().url().optional(),
  downloadExpiry: z.string().datetime().optional(),
  downloadCount: z.number().nonnegative().default(0),
  maxDownloads: z.number().positive().optional(),
});

/**
 * Billing address validation
 */
export const BillingAddressSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  company: z.string().max(100).optional(),
  addressLine1: z.string().min(1, "Address is required").max(100),
  addressLine2: z.string().max(100).optional(),
  city: z.string().min(1, "City is required").max(50),
  state: z.string().max(50).optional(),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z.string().length(2, "Country must be 2-letter ISO code"),
  phone: z.string().max(20).optional(),
});

/**
 * Tax information validation
 */
export const TaxInfoSchema = z.object({
  taxRate: z.number().min(0).max(1), // 0-100% as decimal
  taxAmount: z.number().min(0),
  taxType: z.enum(["vat", "sales_tax", "gst", "none"]),
  taxId: z.string().max(50).optional(),
  exemptionReason: z.string().max(200).optional(),
});

/**
 * Payment information validation
 */
export const PaymentInfoSchema = z.object({
  provider: PaymentProvider,
  paymentIntentId: z.string().optional(),
  sessionId: z.string().optional(),
  transactionId: z.string().optional(),

  // Payment method details (encrypted/tokenized)
  paymentMethodId: z.string().optional(),
  last4: z.string().length(4).optional(),
  brand: z.string().max(20).optional(),

  // Processing details
  processingFee: z.number().min(0).default(0),
  netAmount: z.number().min(0),

  // Timestamps
  authorizedAt: z.string().datetime().optional(),
  capturedAt: z.string().datetime().optional(),

  // Failure information
  failureCode: z.string().max(50).optional(),
  failureMessage: z.string().max(200).optional(),
});

/**
 * Invoice information validation
 */
export const InvoiceInfoSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required").max(50),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),

  // PDF generation
  pdfUrl: z.string().url().optional(),
  pdfStorageId: z.string().optional(),

  // Invoice status
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),

  // Notes
  notes: z.string().max(1000).optional(),
  terms: z.string().max(2000).optional(),
});

/**
 * Complete order validation schema
 */
export const OrderSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1, "Order number is required").max(50),

  // Customer information
  userId: z.string().optional(),
  email: z.string().email("Valid email is required"),

  // Order items
  items: z.array(OrderItemSchema).min(1, "Order must contain at least one item"),

  // Pricing
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  taxInfo: TaxInfoSchema.optional(),
  shippingCost: z.number().min(0).default(0),
  discountTotal: z.number().min(0).default(0),
  total: z.number().min(0, "Total cannot be negative"),
  currency: Currency,

  // Status
  status: OrderStatus,
  paymentStatus: PaymentStatus,

  // Payment and billing
  paymentInfo: PaymentInfoSchema.optional(),
  billingAddress: BillingAddressSchema.optional(),

  // Invoice
  invoice: InvoiceInfoSchema.optional(),

  // Fulfillment
  fulfillmentStatus: z.enum(["pending", "processing", "fulfilled", "cancelled"]).default("pending"),
  fulfillmentDate: z.string().datetime().optional(),

  // Metadata
  metadata: z.record(z.unknown()).optional(),
  notes: z.string().max(1000).optional(),

  // Timestamps
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),

  // Idempotency
  idempotencyKey: z.string().max(255).optional(),
});

/**
 * Order creation validation (excludes auto-generated fields)
 */
export const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().positive(),
        productType: z.enum(["beat", "subscription", "service", "custom"]),
        title: z.string().min(1).max(200),
        licenseType: LicenseType.optional(),
        unitPrice: z.number().min(0),
        quantity: z.number().positive().default(1),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .min(1, "Order must contain at least one item"),

  currency: Currency.default("USD"),
  email: z.string().email("Valid email is required"),

  // Optional fields
  billingAddress: BillingAddressSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  notes: z.string().max(1000).optional(),
  idempotencyKey: z.string().max(255).optional(),
});

/**
 * Order update validation
 */
export const UpdateOrderSchema = z.object({
  id: z.string().min(1, "Order ID is required"),
  status: OrderStatus.optional(),
  paymentStatus: PaymentStatus.optional(),
  fulfillmentStatus: z.enum(["pending", "processing", "fulfilled", "cancelled"]).optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Order filter validation for admin/user queries
 */
export const OrderFilterSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  status: OrderStatus.optional(),
  paymentStatus: PaymentStatus.optional(),
  currency: Currency.optional(),

  // Date range filters
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),

  // Amount filters
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),

  // Search
  search: z.string().max(100).optional(),

  // Pagination
  page: z.number().positive().default(1),
  limit: z.number().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum(["created_at", "updated_at", "total", "status"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Payment intent creation validation
 */
export const CreatePaymentIntentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  amount: z.number().min(50, "Minimum amount is $0.50"), // $0.50 minimum
  currency: Currency.default("USD"),
  paymentProvider: PaymentProvider.default("stripe"),

  // Payment method options
  paymentMethods: z.array(z.enum(["card", "paypal", "bank_transfer"])).optional(),

  // Customer information
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),

  // Metadata
  metadata: z.record(z.string()).optional(),
});

/**
 * Refund request validation
 */
export const RefundRequestSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  amount: z.number().positive().optional(), // If not provided, full refund
  reason: z.enum([
    "duplicate",
    "fraudulent",
    "requested_by_customer",
    "product_not_delivered",
    "product_defective",
    "other",
  ]),
  description: z.string().max(500).optional(),
  notifyCustomer: z.boolean().default(true),
});

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validate order total calculation
 */
export const validateOrderTotal = (order: {
  subtotal: number;
  taxAmount?: number;
  shippingCost?: number;
  discountTotal?: number;
  total: number;
}): boolean => {
  const calculatedTotal =
    order.subtotal +
    (order.taxAmount || 0) +
    (order.shippingCost || 0) -
    (order.discountTotal || 0);

  // Allow for small rounding differences (1 cent)
  return Math.abs(calculatedTotal - order.total) <= 1;
};

/**
 * Validate order items total matches subtotal
 */
export const validateOrderItemsTotal = (
  items: Array<{ unitPrice: number; quantity: number; discountAmount?: number }>,
  subtotal: number
): boolean => {
  const calculatedSubtotal = items.reduce((sum, item) => {
    const itemTotal = item.unitPrice * item.quantity - (item.discountAmount || 0);
    return sum + itemTotal;
  }, 0);

  // Allow for small rounding differences (1 cent)
  return Math.abs(calculatedSubtotal - subtotal) <= 1;
};

/**
 * Validate currency and amount combination
 */
export const validateCurrencyAmount = (amount: number, currency: string): boolean => {
  // Minimum amounts by currency (in smallest unit)
  const minimums: Record<string, number> = {
    USD: 50, // $0.50
    EUR: 50, // €0.50
    GBP: 30, // £0.30
    CAD: 50, // C$0.50
    AUD: 50, // A$0.50
    JPY: 50, // ¥50
    CHF: 50, // CHF 0.50
    SEK: 300, // 3.00 SEK
    NOK: 300, // 3.00 NOK
    DKK: 250, // 2.50 DKK
  };

  const minimum = minimums[currency.toUpperCase()];
  return minimum ? amount >= minimum : amount >= 50;
};

/**
 * Validate payment method for currency
 */
export const validatePaymentMethodForCurrency = (
  paymentMethod: string,
  currency: string
): boolean => {
  // Payment method availability by currency
  const availability: Record<string, string[]> = {
    USD: ["card", "paypal", "bank_transfer"],
    EUR: ["card", "paypal", "bank_transfer"],
    GBP: ["card", "paypal"],
    CAD: ["card", "paypal"],
    AUD: ["card", "paypal"],
    JPY: ["card"],
    CHF: ["card"],
    SEK: ["card"],
    NOK: ["card"],
    DKK: ["card"],
  };

  const availableMethods = availability[currency.toUpperCase()];
  return availableMethods ? availableMethods.includes(paymentMethod) : false;
};

// ================================
// TYPE EXPORTS
// ================================

export type Order = z.infer<typeof OrderSchema>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type UpdateOrder = z.infer<typeof UpdateOrderSchema>;
export type OrderFilter = z.infer<typeof OrderFilterSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type BillingAddress = z.infer<typeof BillingAddressSchema>;
export type PaymentInfo = z.infer<typeof PaymentInfoSchema>;
export type InvoiceInfo = z.infer<typeof InvoiceInfoSchema>;
export type TaxInfo = z.infer<typeof TaxInfoSchema>;
export type CreatePaymentIntent = z.infer<typeof CreatePaymentIntentSchema>;
export type RefundRequest = z.infer<typeof RefundRequestSchema>;

export type OrderStatusType = z.infer<typeof OrderStatus>;
export type PaymentStatusType = z.infer<typeof PaymentStatus>;
export type PaymentProviderType = z.infer<typeof PaymentProvider>;
export type CurrencyType = z.infer<typeof Currency>;
