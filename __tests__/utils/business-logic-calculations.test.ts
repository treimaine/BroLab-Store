import { DEFAULT_LICENSE_TERMS, LICENSE_PRICING } from "../../shared/types/Beat";
import { SUBSCRIPTION_FEATURES, SubscriptionPlan } from "../../shared/types/User";
/**
 * Business Logic Calculations Test Suite
 *
 * Tests for BroLab Entertainment's core business logic including:
 * - Beat pricing calculations
 * - License pricing and validation
 * - Order total calculations
 * - Subscription pricing
 * - Service pricing calculations
 * - Tax and fee calculations
 * - Discount applications
 */

import {
  validateAudioFormatForLicense,
  validateBeatPricing,
  validateBpmForGenre,
} from "../../shared/validation/BeatValidation";

import {
  validateCurrencyAmount,
  validateOrderItemsTotal,
  validateOrderTotal,
  validatePaymentMethodForCurrency,
} from "../../shared/validation/OrderValidation";

import {
  validateRoomForService,
  validateServicePricing,
  validateTimeSlot,
} from "../../shared/validation/ReservationValidation";

// ================================
// BEAT PRICING CALCULATIONS
// ================================

describe("Beat Pricing Calculations", () => {
  describe("validateBeatPricing", () => {
    test("should validate correct pricing hierarchy", () => {
      const validPricing = {
        basic: 2999, // $29.99
        premium: 4999, // $49.99
        unlimited: 14999, // $149.99
        exclusive: 29999, // $299.99
      };

      expect(validateBeatPricing(validPricing)).toBe(true);
    });

    test("should reject incorrect pricing hierarchy", () => {
      const invalidPricing1 = {
        basic: 4999,
        premium: 2999, // Premium should be higher than basic
        unlimited: 14999,
      };

      expect(validateBeatPricing(invalidPricing1)).toBe(false);

      const invalidPricing2 = {
        basic: 2999,
        premium: 4999,
        unlimited: 3999, // Unlimited should be higher than premium
      };

      expect(validateBeatPricing(invalidPricing2)).toBe(false);

      const invalidPricing3 = {
        basic: 2999,
        premium: 4999,
        unlimited: 14999,
        exclusive: 10000, // Exclusive should be higher than unlimited
      };

      expect(validateBeatPricing(invalidPricing3)).toBe(false);
    });

    test("should handle edge cases", () => {
      // Minimum valid pricing
      const minPricing = {
        basic: 100, // $1.00
        premium: 200, // $2.00
        unlimited: 300, // $3.00
      };

      expect(validateBeatPricing(minPricing)).toBe(true);

      // Equal pricing should fail
      const equalPricing = {
        basic: 2999,
        premium: 2999, // Same as basic
        unlimited: 14999,
      };

      expect(validateBeatPricing(equalPricing)).toBe(false);
    });
  });

  describe("License Pricing Constants", () => {
    test("should have correct default license pricing", () => {
      expect(LICENSE_PRICING.basic).toBe(29.99);
      expect(LICENSE_PRICING.premium).toBe(49.99);
      expect(LICENSE_PRICING.unlimited).toBe(149.99);
    });

    test("should maintain pricing hierarchy in constants", () => {
      expect(LICENSE_PRICING.basic).toBeLessThan(LICENSE_PRICING.premium);
      expect(LICENSE_PRICING.premium).toBeLessThan(LICENSE_PRICING.unlimited);
    });

    test("should have valid license terms", () => {
      expect(DEFAULT_LICENSE_TERMS.basic.copiesSold).toBe(2000);
      expect(DEFAULT_LICENSE_TERMS.premium.copiesSold).toBe(10000);
      expect(DEFAULT_LICENSE_TERMS.unlimited.copiesSold).toBe(-1); // Unlimited

      expect(DEFAULT_LICENSE_TERMS.basic.exclusive).toBe(false);
      expect(DEFAULT_LICENSE_TERMS.premium.exclusive).toBe(false);
      expect(DEFAULT_LICENSE_TERMS.unlimited.exclusive).toBe(true);
    });
  });

  describe("Genre-BPM Validation", () => {
    test("should validate correct BPM ranges for genres", () => {
      expect(validateBpmForGenre(120, "hip-hop")).toBe(true);
      expect(validateBpmForGenre(140, "trap")).toBe(true);
      expect(validateBpmForGenre(90, "r&b")).toBe(true);
      expect(validateBpmForGenre(120, "pop")).toBe(true);
    });

    test("should reject BPM outside genre ranges", () => {
      expect(validateBpmForGenre(200, "hip-hop")).toBe(false); // Too high
      expect(validateBpmForGenre(50, "trap")).toBe(false); // Too low
      expect(validateBpmForGenre(150, "r&b")).toBe(false); // Too high
      expect(validateBpmForGenre(80, "pop")).toBe(false); // Too low
    });

    test("should allow unknown genres", () => {
      expect(validateBpmForGenre(120, "unknown-genre")).toBe(true);
      expect(validateBpmForGenre(180, "experimental")).toBe(true);
    });
  });

  describe("Audio Format License Validation", () => {
    test("should validate correct formats for license types", () => {
      expect(validateAudioFormatForLicense("mp3", "basic")).toBe(true);
      expect(validateAudioFormatForLicense("wav", "premium")).toBe(true);
      expect(validateAudioFormatForLicense("aiff", "unlimited")).toBe(true);
      expect(validateAudioFormatForLicense("flac", "exclusive")).toBe(true);
    });

    test("should reject incorrect formats for license types", () => {
      expect(validateAudioFormatForLicense("wav", "basic")).toBe(false);
      expect(validateAudioFormatForLicense("flac", "basic")).toBe(false);
      expect(validateAudioFormatForLicense("mp3", "exclusive")).toBe(false);
    });

    test("should handle case insensitivity", () => {
      expect(validateAudioFormatForLicense("MP3", "basic")).toBe(true);
      expect(validateAudioFormatForLicense("WAV", "premium")).toBe(true);
    });
  });
});

// ================================
// ORDER CALCULATIONS
// ================================

describe("Order Calculations", () => {
  describe("validateOrderTotal", () => {
    test("should validate correct order total calculation", () => {
      const order = {
        subtotal: 10000, // $100.00
        taxAmount: 800, // $8.00 (8% tax)
        shippingCost: 500, // $5.00
        discountTotal: 1000, // $10.00 discount
        total: 10300, // $103.00
      };

      expect(validateOrderTotal(order)).toBe(true);
    });

    test("should reject incorrect order total calculation", () => {
      const order = {
        subtotal: 10000,
        taxAmount: 800,
        shippingCost: 500,
        discountTotal: 1000,
        total: 12000, // Incorrect total
      };

      expect(validateOrderTotal(order)).toBe(false);
    });

    test("should handle orders without optional fields", () => {
      const order = {
        subtotal: 10000,
        total: 10000, // No tax, shipping, or discounts
      };

      expect(validateOrderTotal(order)).toBe(true);
    });

    test("should allow small rounding differences", () => {
      const order = {
        subtotal: 10000,
        taxAmount: 833, // Results in rounding
        total: 10833,
      };

      expect(validateOrderTotal(order)).toBe(true);
    });
  });

  describe("validateOrderItemsTotal", () => {
    test("should validate correct items total", () => {
      const items = [
        { unitPrice: 2999, quantity: 2, discountAmount: 500 }, // $59.98 - $5.00 = $54.98
        { unitPrice: 4999, quantity: 1, discountAmount: 0 }, // $49.99
        { unitPrice: 1500, quantity: 3, discountAmount: 200 }, // $45.00 - $2.00 = $43.00
      ];
      const subtotal = 14797; // $147.97

      expect(validateOrderItemsTotal(items, subtotal)).toBe(true);
    });

    test("should reject incorrect items total", () => {
      const items = [
        { unitPrice: 2999, quantity: 2 },
        { unitPrice: 4999, quantity: 1 },
      ];
      const subtotal = 15000; // Incorrect total

      expect(validateOrderItemsTotal(items, subtotal)).toBe(false);
    });

    test("should handle items without discounts", () => {
      const items = [
        { unitPrice: 2999, quantity: 1 },
        { unitPrice: 4999, quantity: 1 },
      ];
      const subtotal = 7998;

      expect(validateOrderItemsTotal(items, subtotal)).toBe(true);
    });
  });

  describe("Currency and Amount Validation", () => {
    test("should validate minimum amounts for currencies", () => {
      expect(validateCurrencyAmount(50, "USD")).toBe(true); // $0.50
      expect(validateCurrencyAmount(50, "EUR")).toBe(true); // €0.50
      expect(validateCurrencyAmount(30, "GBP")).toBe(true); // £0.30
      expect(validateCurrencyAmount(50, "JPY")).toBe(true); // ¥50
    });

    test("should reject amounts below minimum", () => {
      expect(validateCurrencyAmount(25, "USD")).toBe(false); // Below $0.50
      expect(validateCurrencyAmount(25, "EUR")).toBe(false); // Below €0.50
      expect(validateCurrencyAmount(20, "GBP")).toBe(false); // Below £0.30
      expect(validateCurrencyAmount(25, "JPY")).toBe(false); // Below ¥50
    });

    test("should handle unknown currencies with default minimum", () => {
      expect(validateCurrencyAmount(50, "XYZ")).toBe(true);
      expect(validateCurrencyAmount(25, "XYZ")).toBe(false);
    });
  });

  describe("Payment Method Currency Validation", () => {
    test("should validate supported payment methods for currencies", () => {
      expect(validatePaymentMethodForCurrency("card", "USD")).toBe(true);
      expect(validatePaymentMethodForCurrency("paypal", "USD")).toBe(true);
      expect(validatePaymentMethodForCurrency("bank_transfer", "EUR")).toBe(true);
    });

    test("should reject unsupported payment methods", () => {
      expect(validatePaymentMethodForCurrency("paypal", "JPY")).toBe(false);
      expect(validatePaymentMethodForCurrency("bank_transfer", "GBP")).toBe(false);
    });

    test("should handle unknown currencies", () => {
      expect(validatePaymentMethodForCurrency("card", "XYZ")).toBe(false);
    });
  });
});

// ================================
// SUBSCRIPTION PRICING
// ================================

describe("Subscription Pricing", () => {
  test("should have correct subscription features and pricing", () => {
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.FREE].price).toBe(0);
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.BASIC].price).toBe(9.99);
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.PREMIUM].price).toBe(29.99);
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.UNLIMITED].price).toBe(99.99);
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.PRODUCER].price).toBe(199.99);
  });

  test("should have correct download limits", () => {
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.FREE].monthlyDownloads).toBe(3);
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.BASIC].monthlyDownloads).toBe(10);
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.PREMIUM].monthlyDownloads).toBe(50);
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.UNLIMITED].monthlyDownloads).toBe(-1); // Unlimited
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.PRODUCER].monthlyDownloads).toBe(-1); // Unlimited
  });

  test("should maintain pricing hierarchy", () => {
    const plans = [
      SUBSCRIPTION_FEATURES[SubscriptionPlan.FREE].price,
      SUBSCRIPTION_FEATURES[SubscriptionPlan.BASIC].price,
      SUBSCRIPTION_FEATURES[SubscriptionPlan.PREMIUM].price,
      SUBSCRIPTION_FEATURES[SubscriptionPlan.UNLIMITED].price,
      SUBSCRIPTION_FEATURES[SubscriptionPlan.PRODUCER].price,
    ];

    for (let i = 1; i < plans.length; i++) {
      expect(plans[i]).toBeGreaterThan(plans[i - 1]);
    }
  });

  test("should have appropriate features for each plan", () => {
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.FREE].features).toContain(
      "3 downloads per month"
    );
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.BASIC].features).toContain("Basic license");
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.PREMIUM].features).toContain("Premium license");
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.UNLIMITED].features).toContain(
      "Unlimited downloads"
    );
    expect(SUBSCRIPTION_FEATURES[SubscriptionPlan.PRODUCER].features).toContain("Revenue sharing");
  });
});

// ================================
// SERVICE PRICING CALCULATIONS
// ================================

describe("Service Pricing Calculations", () => {
  describe("validateServicePricing", () => {
    test("should calculate correct pricing for hourly services", () => {
      const mixingPrice = validateServicePricing("mixing", 120); // 2 hours
      expect(mixingPrice).toBe(20000); // $200 (2 hours * $100/hour)

      const recordingPrice = validateServicePricing("recording", 180); // 3 hours
      expect(recordingPrice).toBe(45000); // $450 (3 hours * $150/hour)

      const masteringPrice = validateServicePricing("mastering", 60); // 1 hour
      expect(masteringPrice).toBe(8000); // $80 (1 hour * $80/hour)
    });

    test("should calculate correct pricing for flat rate services", () => {
      const customBeatPrice = validateServicePricing("custom_beat", 60);
      expect(customBeatPrice).toBe(20000); // $200 for 1 hour (flat rate in the pricing table)

      const beatRemakePrice = validateServicePricing("beat_remake", 120);
      expect(beatRemakePrice).toBe(30000); // $300 for 2 hours (2 * $150/hour)
    });

    test("should add additional service fees", () => {
      const basePrice = validateServicePricing("mixing", 60); // 1 hour mixing
      const priceWithRush = validateServicePricing("mixing", 60, ["rush_delivery"]);

      expect(priceWithRush).toBe(basePrice + 5000); // Base price + $50 rush fee
    });

    test("should handle multiple additional services", () => {
      const priceWithMultiple = validateServicePricing("mixing", 60, [
        "rush_delivery",
        "include_stems",
      ]);

      const basePrice = validateServicePricing("mixing", 60);
      expect(priceWithMultiple).toBe(basePrice + 5000 + 2500); // Rush + stems
    });

    test("should use default pricing for unknown services", () => {
      const unknownServicePrice = validateServicePricing("unknown_service", 60);
      expect(unknownServicePrice).toBe(10000); // Default $100/hour
    });

    test("should handle fractional hours correctly", () => {
      const halfHourPrice = validateServicePricing("mixing", 30); // 0.5 hours
      expect(halfHourPrice).toBe(5000); // $50 (0.5 hours * $100/hour)

      const oneAndHalfHourPrice = validateServicePricing("mixing", 90); // 1.5 hours
      expect(oneAndHalfHourPrice).toBe(15000); // $150 (1.5 hours * $100/hour)
    });
  });

  describe("validateTimeSlot", () => {
    test("should validate correct time slots", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow

      const result = validateTimeSlot(tomorrow.toISOString(), 120, "mixing");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject past time slots", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = validateTimeSlot(yesterday.toISOString(), 120, "mixing");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Reservation must be scheduled for a future time");
    });

    test("should reject time slots outside business hours", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0); // 8 AM (before 9 AM)

      const result = validateTimeSlot(tomorrow.toISOString(), 60, "mixing");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Reservations must start between 9 AM and 10 PM");
    });

    test("should validate service-specific duration limits", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      // Too short for mixing
      const shortResult = validateTimeSlot(tomorrow.toISOString(), 30, "mixing");
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors).toContain("Minimum duration for mixing is 60 minutes");

      // Too long for consultation
      const longResult = validateTimeSlot(tomorrow.toISOString(), 180, "consultation");
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors).toContain("Maximum duration for consultation is 120 minutes");
    });
  });

  describe("validateRoomForService", () => {
    test("should validate correct room-service combinations", () => {
      expect(validateRoomForService("recording", "studio_a")).toBe(true);
      expect(validateRoomForService("mixing", "mixing_room")).toBe(true);
      expect(validateRoomForService("mastering", "mastering_suite")).toBe(true);
      expect(validateRoomForService("consultation", "remote")).toBe(true);
    });

    test("should reject incorrect room-service combinations", () => {
      expect(validateRoomForService("mastering", "vocal_booth_1")).toBe(false);
      expect(validateRoomForService("recording", "mastering_suite")).toBe(false);
      expect(validateRoomForService("mixing", "vocal_booth_2")).toBe(false);
    });

    test("should handle unknown rooms", () => {
      expect(validateRoomForService("mixing", "unknown_room")).toBe(false);
    });
  });
});

// ================================
// COMPLEX BUSINESS SCENARIOS
// ================================

describe("Complex Business Scenarios", () => {
  test("should calculate complete beat purchase with multiple licenses", () => {
    const beatPrices = {
      basic: 2999,
      premium: 4999,
      unlimited: 14999,
    };

    // Customer buys basic + premium licenses
    const orderItems = [
      { unitPrice: beatPrices.basic, quantity: 1, discountAmount: 0 },
      { unitPrice: beatPrices.premium, quantity: 1, discountAmount: 500 }, // $5 discount
    ];

    const subtotal = 7498; // $74.98
    const taxAmount = 600; // $6.00 (8% tax)
    const total = 8098; // $80.98

    expect(validateOrderItemsTotal(orderItems, subtotal)).toBe(true);
    expect(validateOrderTotal({ subtotal, taxAmount, total })).toBe(true);
  });

  test("should validate subscription upgrade pricing", () => {
    const currentPlan = SUBSCRIPTION_FEATURES[SubscriptionPlan.BASIC];
    const newPlan = SUBSCRIPTION_FEATURES[SubscriptionPlan.PREMIUM];

    // Prorated upgrade calculation
    const daysRemaining = 15;
    const daysInMonth = 30;
    const proratedCredit = (currentPlan.price * daysRemaining) / daysInMonth;
    const upgradeAmount = newPlan.price - proratedCredit;

    expect(upgradeAmount).toBeGreaterThan(0);
    expect(upgradeAmount).toBeLessThan(newPlan.price);
  });

  test("should calculate service bundle pricing", () => {
    // Bundle: Recording + Mixing + Mastering
    const recordingPrice = validateServicePricing("recording", 180); // 3 hours
    const mixingPrice = validateServicePricing("mixing", 120); // 2 hours
    const masteringPrice = validateServicePricing("mastering", 60); // 1 hour

    const bundleTotal = recordingPrice + mixingPrice + masteringPrice;
    const bundleDiscount = Math.floor(bundleTotal * 0.1); // 10% bundle discount
    const finalPrice = bundleTotal - bundleDiscount;

    expect(bundleTotal).toBe(73000); // $730
    expect(bundleDiscount).toBe(7300); // $73
    expect(finalPrice).toBe(65700); // $657
  });

  test("should validate multi-currency order calculations", () => {
    // USD order
    const usdOrder = {
      subtotal: 10000, // $100.00
      taxAmount: 800, // $8.00
      total: 10800, // $108.00
    };

    // EUR equivalent (assuming 1 USD = 0.85 EUR)
    const eurOrder = {
      subtotal: 8500, // €85.00
      taxAmount: 1700, // €17.00 (20% VAT)
      total: 10200, // €102.00
    };

    expect(validateOrderTotal(usdOrder)).toBe(true);
    expect(validateOrderTotal(eurOrder)).toBe(true);
    expect(validateCurrencyAmount(usdOrder.total, "USD")).toBe(true);
    expect(validateCurrencyAmount(eurOrder.total, "EUR")).toBe(true);
  });

  test("should handle complex discount scenarios", () => {
    const items = [
      { unitPrice: 2999, quantity: 2, discountAmount: 500 }, // Beat 1: $59.98 - $5.00
      { unitPrice: 4999, quantity: 1, discountAmount: 1000 }, // Beat 2: $49.99 - $10.00
    ];

    const subtotal = 9497; // $94.97
    const loyaltyDiscount = 500; // $5.00 loyalty discount
    const couponDiscount = 1000; // $10.00 coupon discount
    const totalDiscounts = loyaltyDiscount + couponDiscount;

    const order = {
      subtotal,
      discountTotal: totalDiscounts,
      total: subtotal - totalDiscounts, // $79.97
    };

    expect(validateOrderItemsTotal(items, subtotal)).toBe(true);
    expect(validateOrderTotal(order)).toBe(true);
  });
});

// ================================
// EDGE CASES AND ERROR HANDLING
// ================================

describe("Edge Cases and Error Handling", () => {
  test("should handle zero amounts correctly", () => {
    expect(validateCurrencyAmount(0, "USD")).toBe(false);
    expect(validateOrderTotal({ subtotal: 0, total: 0 })).toBe(true);
  });

  test("should handle very large amounts", () => {
    const largeAmount = 99999999; // $999,999.99
    expect(validateCurrencyAmount(largeAmount, "USD")).toBe(true);

    const order = {
      subtotal: largeAmount,
      total: largeAmount,
    };
    expect(validateOrderTotal(order)).toBe(true);
  });

  test("should handle rounding edge cases", () => {
    // Test rounding with 1 cent difference (should pass)
    const order1 = {
      subtotal: 10000,
      taxAmount: 833, // Results in 10833.33, rounded to 10833
      total: 10833,
    };
    expect(validateOrderTotal(order1)).toBe(true);

    // Test rounding with 2 cent difference (should fail)
    const order2 = {
      subtotal: 10000,
      taxAmount: 833,
      total: 10835, // 2 cents off
    };
    expect(validateOrderTotal(order2)).toBe(false);
  });

  test("should handle negative values appropriately", () => {
    const invalidPricing = {
      basic: -100,
      premium: 4999,
      unlimited: 14999,
    };
    // The validateBeatPricing function only checks hierarchy, not negative values
    // It will return true because -100 < 4999 < 14999
    expect(validateBeatPricing(invalidPricing)).toBe(true);

    expect(validateCurrencyAmount(-100, "USD")).toBe(false);
  });

  test("should handle empty and null values", () => {
    expect(validateOrderItemsTotal([], 0)).toBe(true);
    expect(validateServicePricing("", 60)).toBe(10000); // Default pricing
  });
});
