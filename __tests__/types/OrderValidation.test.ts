import { describe, expect, test } from "@jest/globals";
import {
  BillingAddressSchema,
  CreateOrderSchema,
  CreatePaymentIntentSchema,
  Currency,
  InvoiceInfoSchema,
  OrderFilterSchema,
  OrderItemSchema,
  OrderSchema,
  OrderStatus,
  PaymentInfoSchema,
  PaymentProvider,
  PaymentStatus,
  RefundRequestSchema,
  TaxInfoSchema,
  UpdateOrderSchema,
  validateCurrencyAmount,
  validateOrderItemsTotal,
  validateOrderTotal,
  validatePaymentMethodForCurrency,
} from "../../shared/validation/OrderValidation";

describe("Order Validation Tests", () => {
  describe("OrderStatus Validation", () => {
    test("should accept valid order statuses", () => {
      const validStatuses = [
        "pending",
        "processing",
        "completed",
        "cancelled",
        "refunded",
        "failed",
      ];

      validStatuses.forEach(status => {
        expect(() => OrderStatus.parse(status)).not.toThrow();
      });
    });

    test("should reject invalid order statuses", () => {
      const invalidStatuses = ["draft", "shipped", "delivered", "", "invalid-status"];

      invalidStatuses.forEach(status => {
        expect(() => OrderStatus.parse(status)).toThrow();
      });
    });
  });

  describe("PaymentStatus Validation", () => {
    test("should accept valid payment statuses", () => {
      const validStatuses = [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
        "refunded",
        "requires_payment_method",
        "requires_confirmation",
      ];

      validStatuses.forEach(status => {
        expect(() => PaymentStatus.parse(status)).not.toThrow();
      });
    });

    test("should reject invalid payment statuses", () => {
      const invalidStatuses = ["authorized", "captured", "declined", "", "invalid-status"];

      invalidStatuses.forEach(status => {
        expect(() => PaymentStatus.parse(status)).toThrow();
      });
    });
  });

  describe("PaymentProvider Validation", () => {
    test("should accept valid payment providers", () => {
      const validProviders = ["stripe", "paypal", "clerk_billing"];

      validProviders.forEach(provider => {
        expect(() => PaymentProvider.parse(provider)).not.toThrow();
      });
    });

    test("should reject invalid payment providers", () => {
      const invalidProviders = ["square", "braintree", "apple_pay", "", "invalid-provider"];

      invalidProviders.forEach(provider => {
        expect(() => PaymentProvider.parse(provider)).toThrow();
      });
    });
  });

  describe("Currency Validation", () => {
    test("should accept valid ISO 4217 currency codes", () => {
      const validCurrencies = [
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
      ];

      validCurrencies.forEach(currency => {
        expect(() => Currency.parse(currency)).not.toThrow();
      });
    });

    test("should reject invalid currency codes", () => {
      const invalidCurrencies = ["usd", "INVALID", "XYZ", "", "123"];

      invalidCurrencies.forEach(currency => {
        expect(() => Currency.parse(currency)).toThrow();
      });
    });
  });

  describe("OrderItem Schema Validation", () => {
    test("should accept valid order item", () => {
      const validOrderItem = {
        id: "item-123",
        productId: 456,
        productType: "beat" as const,
        title: "Dark Trap Beat",
        licenseType: "premium" as const,
        unitPrice: 4999, // $49.99
        quantity: 1,
        totalPrice: 4999,
        discountAmount: 0,
        metadata: { producer: "BroLab Producer" },
        downloadUrl: "https://example.com/download/beat.wav",
        downloadExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        downloadCount: 0,
        maxDownloads: 3,
      };

      expect(() => OrderItemSchema.parse(validOrderItem)).not.toThrow();
    });

    test("should reject order item with negative prices", () => {
      const invalidOrderItem = {
        productId: 456,
        productType: "beat" as const,
        title: "Dark Trap Beat",
        unitPrice: -100, // Negative price
        quantity: 1,
        totalPrice: -100,
      };

      expect(() => OrderItemSchema.parse(invalidOrderItem)).toThrow(
        "Unit price cannot be negative"
      );
    });

    test("should apply default values", () => {
      const minimalOrderItem = {
        productId: 456,
        productType: "beat" as const,
        title: "Dark Trap Beat",
        unitPrice: 2999,
        totalPrice: 2999,
      };

      const result = OrderItemSchema.parse(minimalOrderItem);
      expect(result.quantity).toBe(1);
      expect(result.discountAmount).toBe(0);
      expect(result.downloadCount).toBe(0);
    });
  });

  describe("BillingAddress Schema Validation", () => {
    test("should accept valid billing address", () => {
      const validAddress = {
        firstName: "John",
        lastName: "Doe",
        company: "BroLab Entertainment",
        addressLine1: "123 Music Street",
        addressLine2: "Suite 456",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90210",
        country: "US",
        phone: "+1-555-123-4567",
      };

      expect(() => BillingAddressSchema.parse(validAddress)).not.toThrow();
    });

    test("should reject address with missing required fields", () => {
      const invalidAddress = {
        firstName: "",
        lastName: "",
        addressLine1: "",
        city: "",
        postalCode: "",
        country: "USA", // Should be 2-letter code
      };

      expect(() => BillingAddressSchema.parse(invalidAddress)).toThrow();
    });

    test("should accept address without optional fields", () => {
      const minimalAddress = {
        firstName: "John",
        lastName: "Doe",
        addressLine1: "123 Music Street",
        city: "Los Angeles",
        postalCode: "90210",
        country: "US",
      };

      expect(() => BillingAddressSchema.parse(minimalAddress)).not.toThrow();
    });
  });

  describe("TaxInfo Schema Validation", () => {
    test("should accept valid tax information", () => {
      const validTaxInfo = {
        taxRate: 0.08, // 8%
        taxAmount: 240, // $2.40
        taxType: "sales_tax" as const,
        taxId: "TAX123456",
        exemptionReason: "Non-profit organization",
      };

      expect(() => TaxInfoSchema.parse(validTaxInfo)).not.toThrow();
    });

    test("should reject invalid tax rates", () => {
      const invalidTaxInfo = {
        taxRate: 1.5, // 150% - invalid
        taxAmount: 240,
        taxType: "vat" as const,
      };

      expect(() => TaxInfoSchema.parse(invalidTaxInfo)).toThrow();
    });

    test("should reject negative tax amounts", () => {
      const invalidTaxInfo = {
        taxRate: 0.08,
        taxAmount: -100, // Negative amount
        taxType: "gst" as const,
      };

      expect(() => TaxInfoSchema.parse(invalidTaxInfo)).toThrow();
    });
  });

  describe("PaymentInfo Schema Validation", () => {
    test("should accept valid payment information", () => {
      const validPaymentInfo = {
        provider: "stripe" as const,
        paymentIntentId: "pi_1234567890",
        sessionId: "cs_1234567890",
        transactionId: "txn_1234567890",
        paymentMethodId: "pm_1234567890",
        last4: "4242",
        brand: "visa",
        processingFee: 89, // $0.89
        netAmount: 4910, // $49.10
        authorizedAt: new Date().toISOString(),
        capturedAt: new Date().toISOString(),
      };

      expect(() => PaymentInfoSchema.parse(validPaymentInfo)).not.toThrow();
    });

    test("should reject payment info with invalid last4", () => {
      const invalidPaymentInfo = {
        provider: "stripe" as const,
        last4: "42424", // Should be exactly 4 digits
        netAmount: 4999,
      };

      expect(() => PaymentInfoSchema.parse(invalidPaymentInfo)).toThrow();
    });

    test("should apply default processing fee", () => {
      const minimalPaymentInfo = {
        provider: "paypal" as const,
        netAmount: 4999,
      };

      const result = PaymentInfoSchema.parse(minimalPaymentInfo);
      expect(result.processingFee).toBe(0);
    });
  });

  describe("InvoiceInfo Schema Validation", () => {
    test("should accept valid invoice information", () => {
      const validInvoiceInfo = {
        invoiceNumber: "INV-2025-001",
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        pdfUrl: "https://example.com/invoices/INV-2025-001.pdf",
        pdfStorageId: "file_1234567890",
        status: "sent" as const,
        notes: "Thank you for your purchase!",
        terms: "Payment due within 30 days.",
      };

      expect(() => InvoiceInfoSchema.parse(validInvoiceInfo)).not.toThrow();
    });

    test("should reject invoice with empty invoice number", () => {
      const invalidInvoiceInfo = {
        invoiceNumber: "",
        invoiceDate: new Date().toISOString(),
        status: "draft" as const,
      };

      expect(() => InvoiceInfoSchema.parse(invalidInvoiceInfo)).toThrow(
        "Invoice number is required"
      );
    });
  });

  describe("Complete Order Schema Validation", () => {
    test("should accept valid complete order", () => {
      const validOrder = {
        id: "order_1234567890",
        orderNumber: "ORD-2025-001",
        userId: "user_1234567890",
        email: "customer@example.com",
        items: [
          {
            productId: 456,
            productType: "beat" as const,
            title: "Dark Trap Beat",
            licenseType: "premium" as const,
            unitPrice: 4999,
            quantity: 1,
            totalPrice: 4999,
          },
        ],
        subtotal: 4999,
        taxInfo: {
          taxRate: 0.08,
          taxAmount: 400,
          taxType: "sales_tax" as const,
        },
        total: 5399,
        currency: "USD" as const,
        status: "completed" as const,
        paymentStatus: "succeeded" as const,
        billingAddress: {
          firstName: "John",
          lastName: "Doe",
          addressLine1: "123 Music Street",
          city: "Los Angeles",
          postalCode: "90210",
          country: "US",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => OrderSchema.parse(validOrder)).not.toThrow();
    });

    test("should reject order with empty items array", () => {
      const invalidOrder = {
        orderNumber: "ORD-2025-001",
        email: "customer@example.com",
        items: [], // Empty items array
        subtotal: 0,
        total: 0,
        currency: "USD" as const,
        status: "pending" as const,
        paymentStatus: "pending" as const,
      };

      expect(() => OrderSchema.parse(invalidOrder)).toThrow("Order must contain at least one item");
    });

    test("should reject order with invalid email", () => {
      const invalidOrder = {
        orderNumber: "ORD-2025-001",
        email: "invalid-email",
        items: [
          {
            productId: 456,
            productType: "beat" as const,
            title: "Dark Trap Beat",
            unitPrice: 4999,
            totalPrice: 4999,
          },
        ],
        subtotal: 4999,
        total: 4999,
        currency: "USD" as const,
        status: "pending" as const,
        paymentStatus: "pending" as const,
      };

      expect(() => OrderSchema.parse(invalidOrder)).toThrow("Valid email is required");
    });
  });

  describe("CreateOrder Schema Validation", () => {
    test("should accept valid order creation data", () => {
      const validCreateOrder = {
        items: [
          {
            productId: 456,
            productType: "beat" as const,
            title: "Dark Trap Beat",
            licenseType: "premium" as const,
            unitPrice: 4999,
            quantity: 1,
          },
        ],
        currency: "USD" as const,
        email: "customer@example.com",
        billingAddress: {
          firstName: "John",
          lastName: "Doe",
          addressLine1: "123 Music Street",
          city: "Los Angeles",
          postalCode: "90210",
          country: "US",
        },
        metadata: { source: "website" },
        notes: "Rush order",
        idempotencyKey: "idem_1234567890",
      };

      expect(() => CreateOrderSchema.parse(validCreateOrder)).not.toThrow();
    });

    test("should apply default currency", () => {
      const createOrderWithoutCurrency = {
        items: [
          {
            productId: 456,
            productType: "beat" as const,
            title: "Dark Trap Beat",
            unitPrice: 4999,
          },
        ],
        email: "customer@example.com",
      };

      const result = CreateOrderSchema.parse(createOrderWithoutCurrency);
      expect(result.currency).toBe("USD");
    });
  });

  describe("UpdateOrder Schema Validation", () => {
    test("should accept valid order update data", () => {
      const validUpdateOrder = {
        id: "order_1234567890",
        status: "processing" as const,
        paymentStatus: "succeeded" as const,
        fulfillmentStatus: "fulfilled" as const,
        notes: "Order processed successfully",
        metadata: { updated_by: "admin" },
      };

      expect(() => UpdateOrderSchema.parse(validUpdateOrder)).not.toThrow();
    });

    test("should require ID for updates", () => {
      const updateWithoutId = {
        status: "processing" as const,
        notes: "Updated notes",
      };

      expect(() => UpdateOrderSchema.parse(updateWithoutId)).toThrow();
    });
  });

  describe("OrderFilter Schema Validation", () => {
    test("should accept valid filter parameters", () => {
      const validFilters = {
        userId: "user_1234567890",
        email: "customer@example.com",
        status: "completed" as const,
        paymentStatus: "succeeded" as const,
        currency: "USD" as const,
        createdAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdBefore: new Date().toISOString(),
        minAmount: 1000,
        maxAmount: 10000,
        search: "trap beat",
        page: 2,
        limit: 50,
        sortBy: "total" as const,
        sortOrder: "asc" as const,
      };

      expect(() => OrderFilterSchema.parse(validFilters)).not.toThrow();
    });

    test("should apply default values", () => {
      const minimalFilters = {};
      const result = OrderFilterSchema.parse(minimalFilters);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("created_at");
      expect(result.sortOrder).toBe("desc");
    });
  });

  describe("CreatePaymentIntent Schema Validation", () => {
    test("should accept valid payment intent creation data", () => {
      const validPaymentIntent = {
        orderId: "order_1234567890",
        amount: 4999, // $49.99
        currency: "USD" as const,
        paymentProvider: "stripe" as const,
        paymentMethods: ["card", "paypal"] as const,
        customerId: "cus_1234567890",
        customerEmail: "customer@example.com",
        metadata: { order_type: "beat_purchase" },
      };

      expect(() => CreatePaymentIntentSchema.parse(validPaymentIntent)).not.toThrow();
    });

    test("should reject payment intent with amount below minimum", () => {
      const invalidPaymentIntent = {
        orderId: "order_1234567890",
        amount: 25, // Below $0.50 minimum
        currency: "USD" as const,
      };

      expect(() => CreatePaymentIntentSchema.parse(invalidPaymentIntent)).toThrow(
        "Minimum amount is $0.50"
      );
    });

    test("should apply default values", () => {
      const minimalPaymentIntent = {
        orderId: "order_1234567890",
        amount: 4999,
      };

      const result = CreatePaymentIntentSchema.parse(minimalPaymentIntent);
      expect(result.currency).toBe("USD");
      expect(result.paymentProvider).toBe("stripe");
    });
  });

  describe("RefundRequest Schema Validation", () => {
    test("should accept valid refund request", () => {
      const validRefundRequest = {
        orderId: "order_1234567890",
        amount: 2500, // Partial refund
        reason: "requested_by_customer" as const,
        description: "Customer changed their mind",
        notifyCustomer: true,
      };

      expect(() => RefundRequestSchema.parse(validRefundRequest)).not.toThrow();
    });

    test("should apply default notification setting", () => {
      const refundWithoutNotification = {
        orderId: "order_1234567890",
        reason: "duplicate" as const,
      };

      const result = RefundRequestSchema.parse(refundWithoutNotification);
      expect(result.notifyCustomer).toBe(true);
    });

    test("should reject refund request without order ID", () => {
      const invalidRefundRequest = {
        amount: 2500,
        reason: "fraudulent" as const,
      };

      expect(() => RefundRequestSchema.parse(invalidRefundRequest)).toThrow();
    });
  });

  describe("Validation Utilities", () => {
    describe("validateOrderTotal", () => {
      test("should validate correct order total calculation", () => {
        const validOrder = {
          subtotal: 4999,
          taxAmount: 400,
          shippingCost: 0,
          discountTotal: 0,
          total: 5399,
        };

        expect(validateOrderTotal(validOrder)).toBe(true);
      });

      test("should reject incorrect order total calculation", () => {
        const invalidOrder = {
          subtotal: 4999,
          taxAmount: 400,
          shippingCost: 500,
          discountTotal: 100,
          total: 4999, // Should be 5799
        };

        expect(validateOrderTotal(invalidOrder)).toBe(false);
      });

      test("should allow small rounding differences", () => {
        const orderWithRounding = {
          subtotal: 4999,
          taxAmount: 400,
          shippingCost: 0,
          discountTotal: 0,
          total: 5400, // 1 cent difference
        };

        expect(validateOrderTotal(orderWithRounding)).toBe(true);
      });
    });

    describe("validateOrderItemsTotal", () => {
      test("should validate correct items total", () => {
        const items = [
          { unitPrice: 2999, quantity: 1, discountAmount: 0 },
          { unitPrice: 4999, quantity: 2, discountAmount: 500 },
        ];
        const subtotal = 12497; // 2999 + (4999 * 2) - 500

        expect(validateOrderItemsTotal(items, subtotal)).toBe(true);
      });

      test("should reject incorrect items total", () => {
        const items = [
          { unitPrice: 2999, quantity: 1, discountAmount: 0 },
          { unitPrice: 4999, quantity: 2, discountAmount: 500 },
        ];
        const subtotal = 10000; // Incorrect total

        expect(validateOrderItemsTotal(items, subtotal)).toBe(false);
      });
    });

    describe("validateCurrencyAmount", () => {
      test("should validate minimum amounts for different currencies", () => {
        expect(validateCurrencyAmount(50, "USD")).toBe(true); // $0.50
        expect(validateCurrencyAmount(49, "USD")).toBe(false); // Below minimum

        expect(validateCurrencyAmount(30, "GBP")).toBe(true); // £0.30
        expect(validateCurrencyAmount(29, "GBP")).toBe(false); // Below minimum

        expect(validateCurrencyAmount(50, "JPY")).toBe(true); // ¥50
        expect(validateCurrencyAmount(49, "JPY")).toBe(false); // Below minimum
      });

      test("should use default minimum for unknown currencies", () => {
        expect(validateCurrencyAmount(50, "XYZ")).toBe(true);
        expect(validateCurrencyAmount(49, "XYZ")).toBe(false);
      });
    });

    describe("validatePaymentMethodForCurrency", () => {
      test("should validate payment methods for USD", () => {
        expect(validatePaymentMethodForCurrency("card", "USD")).toBe(true);
        expect(validatePaymentMethodForCurrency("paypal", "USD")).toBe(true);
        expect(validatePaymentMethodForCurrency("bank_transfer", "USD")).toBe(true);
      });

      test("should validate payment methods for EUR", () => {
        expect(validatePaymentMethodForCurrency("card", "EUR")).toBe(true);
        expect(validatePaymentMethodForCurrency("paypal", "EUR")).toBe(true);
        expect(validatePaymentMethodForCurrency("bank_transfer", "EUR")).toBe(true);
      });

      test("should validate payment methods for JPY", () => {
        expect(validatePaymentMethodForCurrency("card", "JPY")).toBe(true);
        expect(validatePaymentMethodForCurrency("paypal", "JPY")).toBe(false);
        expect(validatePaymentMethodForCurrency("bank_transfer", "JPY")).toBe(false);
      });

      test("should handle unknown currencies", () => {
        expect(validatePaymentMethodForCurrency("card", "XYZ")).toBe(false);
      });
    });
  });
});
