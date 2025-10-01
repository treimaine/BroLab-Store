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

describe(_"Order Validation Tests", _() => {
  describe(_"OrderStatus Validation", _() => {
    test(_"should accept valid order statuses", _() => {
      const validStatuses = [
        "pending",
        "processing",
        "completed",
        "cancelled",
        "refunded",
        "failed",
      ];

      validStatuses.forEach(status => {
        expect_(() => OrderStatus.parse(status)).not.toThrow();
      });
    });

    test(_"should reject invalid order statuses", _() => {
      const invalidStatuses = ["draft", "shipped", "delivered", "", "invalid-status"];

      invalidStatuses.forEach(status => {
        expect_(() => OrderStatus.parse(status)).toThrow();
      });
    });
  });

  describe(_"PaymentStatus Validation", _() => {
    test(_"should accept valid payment statuses", _() => {
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
        expect_(() => PaymentStatus.parse(status)).not.toThrow();
      });
    });

    test(_"should reject invalid payment statuses", _() => {
      const invalidStatuses = ["authorized", "captured", "declined", "", "invalid-status"];

      invalidStatuses.forEach(status => {
        expect_(() => PaymentStatus.parse(status)).toThrow();
      });
    });
  });

  describe(_"PaymentProvider Validation", _() => {
    test(_"should accept valid payment providers", _() => {
      const validProviders = ["stripe", "paypal", "clerk_billing"];

      validProviders.forEach(provider => {
        expect_(() => PaymentProvider.parse(provider)).not.toThrow();
      });
    });

    test(_"should reject invalid payment providers", _() => {
      const invalidProviders = ["square", "braintree", "apple_pay", "", "invalid-provider"];

      invalidProviders.forEach(provider => {
        expect_(() => PaymentProvider.parse(provider)).toThrow();
      });
    });
  });

  describe(_"Currency Validation", _() => {
    test(_"should accept valid ISO 4217 currency codes", _() => {
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
        expect_(() => Currency.parse(currency)).not.toThrow();
      });
    });

    test(_"should reject invalid currency codes", _() => {
      const invalidCurrencies = ["usd", "INVALID", "XYZ", "", "123"];

      invalidCurrencies.forEach(currency => {
        expect_(() => Currency.parse(currency)).toThrow();
      });
    });
  });

  describe(_"OrderItem Schema Validation", _() => {
    test(_"should accept valid order item", _() => {
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

      expect_(() => OrderItemSchema.parse(validOrderItem)).not.toThrow();
    });

    test(_"should reject order item with negative prices", _() => {
      const invalidOrderItem = {
        productId: 456,
        productType: "beat" as const,
        title: "Dark Trap Beat",
        unitPrice: -100, // Negative price
        quantity: 1,
        totalPrice: -100,
      };

      expect_(() => OrderItemSchema.parse(invalidOrderItem)).toThrow(
        "Unit price cannot be negative"
      );
    });

    test(_"should apply default values", _() => {
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

  describe(_"BillingAddress Schema Validation", _() => {
    test(_"should accept valid billing address", _() => {
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

      expect_(() => BillingAddressSchema.parse(validAddress)).not.toThrow();
    });

    test(_"should reject address with missing required fields", _() => {
      const invalidAddress = {
        firstName: "",
        lastName: "",
        addressLine1: "",
        city: "",
        postalCode: "",
        country: "USA", // Should be 2-letter code
      };

      expect_(() => BillingAddressSchema.parse(invalidAddress)).toThrow();
    });

    test(_"should accept address without optional fields", _() => {
      const minimalAddress = {
        firstName: "John",
        lastName: "Doe",
        addressLine1: "123 Music Street",
        city: "Los Angeles",
        postalCode: "90210",
        country: "US",
      };

      expect_(() => BillingAddressSchema.parse(minimalAddress)).not.toThrow();
    });
  });

  describe(_"TaxInfo Schema Validation", _() => {
    test(_"should accept valid tax information", _() => {
      const validTaxInfo = {
        taxRate: 0.08, // 8%
        taxAmount: 240, // $2.40
        taxType: "sales_tax" as const,
        taxId: "TAX123456",
        exemptionReason: "Non-profit organization",
      };

      expect_(() => TaxInfoSchema.parse(validTaxInfo)).not.toThrow();
    });

    test(_"should reject invalid tax rates", _() => {
      const invalidTaxInfo = {
        taxRate: 1.5, // 150% - invalid
        taxAmount: 240,
        taxType: "vat" as const,
      };

      expect_(() => TaxInfoSchema.parse(invalidTaxInfo)).toThrow();
    });

    test(_"should reject negative tax amounts", _() => {
      const invalidTaxInfo = {
        taxRate: 0.08,
        taxAmount: -100, // Negative amount
        taxType: "gst" as const,
      };

      expect_(() => TaxInfoSchema.parse(invalidTaxInfo)).toThrow();
    });
  });

  describe(_"PaymentInfo Schema Validation", _() => {
    test(_"should accept valid payment information", _() => {
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

      expect_(() => PaymentInfoSchema.parse(validPaymentInfo)).not.toThrow();
    });

    test(_"should reject payment info with invalid last4", _() => {
      const invalidPaymentInfo = {
        provider: "stripe" as const,
        last4: "42424", // Should be exactly 4 digits
        netAmount: 4999,
      };

      expect_(() => PaymentInfoSchema.parse(invalidPaymentInfo)).toThrow();
    });

    test(_"should apply default processing fee", _() => {
      const minimalPaymentInfo = {
        provider: "paypal" as const,
        netAmount: 4999,
      };

      const result = PaymentInfoSchema.parse(minimalPaymentInfo);
      expect(result.processingFee).toBe(0);
    });
  });

  describe(_"InvoiceInfo Schema Validation", _() => {
    test(_"should accept valid invoice information", _() => {
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

      expect_(() => InvoiceInfoSchema.parse(validInvoiceInfo)).not.toThrow();
    });

    test(_"should reject invoice with empty invoice number", _() => {
      const invalidInvoiceInfo = {
        invoiceNumber: "",
        invoiceDate: new Date().toISOString(),
        status: "draft" as const,
      };

      expect_(() => InvoiceInfoSchema.parse(invalidInvoiceInfo)).toThrow(
        "Invoice number is required"
      );
    });
  });

  describe(_"Complete Order Schema Validation", _() => {
    test(_"should accept valid complete order", _() => {
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

      expect_(() => OrderSchema.parse(validOrder)).not.toThrow();
    });

    test(_"should reject order with empty items array", _() => {
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

      expect_(() => OrderSchema.parse(invalidOrder)).toThrow("Order must contain at least one item");
    });

    test(_"should reject order with invalid email", _() => {
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

      expect_(() => OrderSchema.parse(invalidOrder)).toThrow("Valid email is required");
    });
  });

  describe(_"CreateOrder Schema Validation", _() => {
    test(_"should accept valid order creation data", _() => {
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

      expect_(() => CreateOrderSchema.parse(validCreateOrder)).not.toThrow();
    });

    test(_"should apply default currency", _() => {
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

  describe(_"UpdateOrder Schema Validation", _() => {
    test(_"should accept valid order update data", _() => {
      const validUpdateOrder = {
        id: "order_1234567890",
        status: "processing" as const,
        paymentStatus: "succeeded" as const,
        fulfillmentStatus: "fulfilled" as const,
        notes: "Order processed successfully",
        metadata: { updated_by: "admin" },
      };

      expect_(() => UpdateOrderSchema.parse(validUpdateOrder)).not.toThrow();
    });

    test(_"should require ID for updates", _() => {
      const updateWithoutId = {
        status: "processing" as const,
        notes: "Updated notes",
      };

      expect_(() => UpdateOrderSchema.parse(updateWithoutId)).toThrow();
    });
  });

  describe(_"OrderFilter Schema Validation", _() => {
    test(_"should accept valid filter parameters", _() => {
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

      expect_(() => OrderFilterSchema.parse(validFilters)).not.toThrow();
    });

    test(_"should apply default values", _() => {
      const minimalFilters = {};
      const result = OrderFilterSchema.parse(minimalFilters);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("created_at");
      expect(result.sortOrder).toBe("desc");
    });
  });

  describe(_"CreatePaymentIntent Schema Validation", _() => {
    test(_"should accept valid payment intent creation data", _() => {
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

      expect_(() => CreatePaymentIntentSchema.parse(validPaymentIntent)).not.toThrow();
    });

    test(_"should reject payment intent with amount below minimum", _() => {
      const invalidPaymentIntent = {
        orderId: "order_1234567890",
        amount: 25, // Below $0.50 minimum
        currency: "USD" as const,
      };

      expect_(() => CreatePaymentIntentSchema.parse(invalidPaymentIntent)).toThrow(
        "Minimum amount is $0.50"
      );
    });

    test(_"should apply default values", _() => {
      const minimalPaymentIntent = {
        orderId: "order_1234567890",
        amount: 4999,
      };

      const result = CreatePaymentIntentSchema.parse(minimalPaymentIntent);
      expect(result.currency).toBe("USD");
      expect(result.paymentProvider).toBe("stripe");
    });
  });

  describe(_"RefundRequest Schema Validation", _() => {
    test(_"should accept valid refund request", _() => {
      const validRefundRequest = {
        orderId: "order_1234567890",
        amount: 2500, // Partial refund
        reason: "requested_by_customer" as const,
        description: "Customer changed their mind",
        notifyCustomer: true,
      };

      expect_(() => RefundRequestSchema.parse(validRefundRequest)).not.toThrow();
    });

    test(_"should apply default notification setting", _() => {
      const refundWithoutNotification = {
        orderId: "order_1234567890",
        reason: "duplicate" as const,
      };

      const result = RefundRequestSchema.parse(refundWithoutNotification);
      expect(result.notifyCustomer).toBe(true);
    });

    test(_"should reject refund request without order ID", _() => {
      const invalidRefundRequest = {
        amount: 2500,
        reason: "fraudulent" as const,
      };

      expect_(() => RefundRequestSchema.parse(invalidRefundRequest)).toThrow();
    });
  });

  describe(_"Validation Utilities", _() => {
    describe(_"validateOrderTotal", _() => {
      test(_"should validate correct order total calculation", _() => {
        const validOrder = {
          subtotal: 4999,
          taxAmount: 400,
          shippingCost: 0,
          discountTotal: 0,
          total: 5399,
        };

        expect(validateOrderTotal(validOrder)).toBe(true);
      });

      test(_"should reject incorrect order total calculation", _() => {
        const invalidOrder = {
          subtotal: 4999,
          taxAmount: 400,
          shippingCost: 500,
          discountTotal: 100,
          total: 4999, // Should be 5799
        };

        expect(validateOrderTotal(invalidOrder)).toBe(false);
      });

      test(_"should allow small rounding differences", _() => {
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

    describe(_"validateOrderItemsTotal", _() => {
      test(_"should validate correct items total", _() => {
        const items = [
          { unitPrice: 2999, quantity: 1, discountAmount: 0 },
          { unitPrice: 4999, quantity: 2, discountAmount: 500 },
        ];
        const subtotal = 12497; // 2999 + (4999 * 2) - 500

        expect(validateOrderItemsTotal(items, subtotal)).toBe(true);
      });

      test(_"should reject incorrect items total", _() => {
        const items = [
          { unitPrice: 2999, quantity: 1, discountAmount: 0 },
          { unitPrice: 4999, quantity: 2, discountAmount: 500 },
        ];
        const subtotal = 10000; // Incorrect total

        expect(validateOrderItemsTotal(items, subtotal)).toBe(false);
      });
    });

    describe(_"validateCurrencyAmount", _() => {
      test(_"should validate minimum amounts for different currencies", _() => {
        expect(validateCurrencyAmount(50, "USD")).toBe(true); // $0.50
        expect(validateCurrencyAmount(49, "USD")).toBe(false); // Below minimum

        expect(validateCurrencyAmount(30, "GBP")).toBe(true); // £0.30
        expect(validateCurrencyAmount(29, "GBP")).toBe(false); // Below minimum

        expect(validateCurrencyAmount(50, "JPY")).toBe(true); // ¥50
        expect(validateCurrencyAmount(49, "JPY")).toBe(false); // Below minimum
      });

      test(_"should use default minimum for unknown currencies", _() => {
        expect(validateCurrencyAmount(50, "XYZ")).toBe(true);
        expect(validateCurrencyAmount(49, "XYZ")).toBe(false);
      });
    });

    describe(_"validatePaymentMethodForCurrency", _() => {
      test(_"should validate payment methods for USD", _() => {
        expect(validatePaymentMethodForCurrency("card", "USD")).toBe(true);
        expect(validatePaymentMethodForCurrency("paypal", "USD")).toBe(true);
        expect(validatePaymentMethodForCurrency("bank_transfer", "USD")).toBe(true);
      });

      test(_"should validate payment methods for EUR", _() => {
        expect(validatePaymentMethodForCurrency("card", "EUR")).toBe(true);
        expect(validatePaymentMethodForCurrency("paypal", "EUR")).toBe(true);
        expect(validatePaymentMethodForCurrency("bank_transfer", "EUR")).toBe(true);
      });

      test(_"should validate payment methods for JPY", _() => {
        expect(validatePaymentMethodForCurrency("card", "JPY")).toBe(true);
        expect(validatePaymentMethodForCurrency("paypal", "JPY")).toBe(false);
        expect(validatePaymentMethodForCurrency("bank_transfer", "JPY")).toBe(false);
      });

      test(_"should handle unknown currencies", _() => {
        expect(validatePaymentMethodForCurrency("card", "XYZ")).toBe(false);
      });
    });
  });
});
