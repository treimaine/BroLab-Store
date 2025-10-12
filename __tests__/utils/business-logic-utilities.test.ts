import { LicenseType } from "../../shared/types/Beat";
import { Currency } from "../../shared/types/Order";
import { SubscriptionPlan } from "../../shared/types/User";
/**
 * Business Logic Utilities Test Suite
 *
 * Tests for the business logic utility functions including:
 * - Beat pricing calculations
 * - License validation and pricing
 * - Order calculations with fees and taxes
 * - Subscription management
 * - Service pricing with bundles
 * - Currency conversion
 * - Business rule validation
 */

import {
  applyVolumeDiscount,
  calculateBeatBundlePrice,
  calculateBeatPrice,
  calculateLicenseUpgradePrice,
  calculateLoyaltyDiscount,
  calculateOrderSubtotal,
  calculateOrderTotal,
  calculateProcessingFee,
  calculateRecommendedBeatPricing,
  calculateServiceBundleDiscount,
  calculateServicePrice,
  calculateSubscriptionChange,
  calculateTaxAmount,
  canUserPurchaseLicense,
  checkDownloadQuota,
  convertCurrency,
  formatCurrencyAmount,
  getLicenseTerms,
  validateOrderBusinessRules,
} from "../../shared/utils/business-logic";

// ================================
// BEAT PRICING UTILITIES
// ================================

describe("Beat Pricing Utilities", () => {
  describe("calculateBeatPrice", () => {
    test("should calculate correct prices for each license type", () => {
      expect(calculateBeatPrice(LicenseType.BASIC)).toBe(2999); // $29.99
      expect(calculateBeatPrice(LicenseType.PREMIUM)).toBe(4999); // $49.99
      expect(calculateBeatPrice(LicenseType.UNLIMITED)).toBe(14999); // $149.99
    });
  });

  describe("calculateBeatBundlePrice", () => {
    test("should calculate total price for multiple licenses", () => {
      const licenses = [
        { type: LicenseType.BASIC, quantity: 2 },
        { type: LicenseType.PREMIUM, quantity: 1 },
      ];

      const expectedTotal = 2999 * 2 + 4999 * 1; // $89.97
      expect(calculateBeatBundlePrice(licenses)).toBe(expectedTotal);
    });

    test("should handle empty license array", () => {
      expect(calculateBeatBundlePrice([])).toBe(0);
    });
  });

  describe("applyVolumeDiscount", () => {
    test("should apply correct discount rates based on quantity", () => {
      const amount = 10000; // $100.00

      // No discount for < 3 items
      const result1 = applyVolumeDiscount(amount, 2);
      expect(result1.discountAmount).toBe(0);
      expect(result1.finalAmount).toBe(amount);

      // 5% discount for 3-4 items
      const result2 = applyVolumeDiscount(amount, 3);
      expect(result2.discountAmount).toBe(500); // $5.00
      expect(result2.finalAmount).toBe(9500); // $95.00

      // 10% discount for 5-9 items
      const result3 = applyVolumeDiscount(amount, 5);
      expect(result3.discountAmount).toBe(1000); // $10.00
      expect(result3.finalAmount).toBe(9000); // $90.00

      // 15% discount for 10+ items
      const result4 = applyVolumeDiscount(amount, 10);
      expect(result4.discountAmount).toBe(1500); // $15.00
      expect(result4.finalAmount).toBe(8500); // $85.00
    });
  });

  describe("calculateLoyaltyDiscount", () => {
    test("should apply correct loyalty discounts based on total spent", () => {
      const orderAmount = 5000; // $50.00

      // No discount for < $200 total spent
      expect(calculateLoyaltyDiscount(orderAmount, 10000)).toBe(0);

      // 5% discount for $200+ total spent
      expect(calculateLoyaltyDiscount(orderAmount, 20000)).toBe(250); // $2.50

      // 10% discount for $500+ total spent
      expect(calculateLoyaltyDiscount(orderAmount, 50000)).toBe(500); // $5.00

      // 15% discount for $1000+ total spent
      expect(calculateLoyaltyDiscount(orderAmount, 100000)).toBe(750); // $7.50
    });
  });
});

// ================================
// LICENSE VALIDATION UTILITIES
// ================================

describe("License Validation Utilities", () => {
  describe("canUserPurchaseLicense", () => {
    test("should allow admin to purchase any license", () => {
      expect(canUserPurchaseLicense(LicenseType.BASIC, SubscriptionPlan.FREE, "admin")).toBe(true);
      expect(canUserPurchaseLicense(LicenseType.PREMIUM, SubscriptionPlan.FREE, "admin")).toBe(
        true
      );
      expect(canUserPurchaseLicense(LicenseType.UNLIMITED, SubscriptionPlan.FREE, "admin")).toBe(
        true
      );
    });

    test("should enforce subscription restrictions for regular users", () => {
      // Free plan can only purchase basic
      expect(canUserPurchaseLicense(LicenseType.BASIC, SubscriptionPlan.FREE, "customer")).toBe(
        true
      );
      expect(canUserPurchaseLicense(LicenseType.PREMIUM, SubscriptionPlan.FREE, "customer")).toBe(
        false
      );
      expect(canUserPurchaseLicense(LicenseType.UNLIMITED, SubscriptionPlan.FREE, "customer")).toBe(
        false
      );

      // Basic plan can purchase basic and premium
      expect(canUserPurchaseLicense(LicenseType.BASIC, SubscriptionPlan.BASIC, "customer")).toBe(
        true
      );
      expect(canUserPurchaseLicense(LicenseType.PREMIUM, SubscriptionPlan.BASIC, "customer")).toBe(
        true
      );
      expect(
        canUserPurchaseLicense(LicenseType.UNLIMITED, SubscriptionPlan.BASIC, "customer")
      ).toBe(false);

      // Premium plan can purchase all licenses
      expect(canUserPurchaseLicense(LicenseType.BASIC, SubscriptionPlan.PREMIUM, "customer")).toBe(
        true
      );
      expect(
        canUserPurchaseLicense(LicenseType.PREMIUM, SubscriptionPlan.PREMIUM, "customer")
      ).toBe(true);
      expect(
        canUserPurchaseLicense(LicenseType.UNLIMITED, SubscriptionPlan.PREMIUM, "customer")
      ).toBe(true);
    });
  });

  describe("getLicenseTerms", () => {
    test("should return correct license terms for each type", () => {
      const basicTerms = getLicenseTerms(LicenseType.BASIC);
      expect(basicTerms.copiesSold).toBe(2000);
      expect(basicTerms.exclusive).toBe(false);

      const unlimitedTerms = getLicenseTerms(LicenseType.UNLIMITED);
      expect(unlimitedTerms.copiesSold).toBe(-1); // Unlimited
      expect(unlimitedTerms.exclusive).toBe(true);
    });
  });

  describe("calculateLicenseUpgradePrice", () => {
    test("should calculate correct upgrade price", () => {
      const upgradePrice = calculateLicenseUpgradePrice(LicenseType.BASIC, LicenseType.PREMIUM);
      expect(upgradePrice).toBe(2000); // $49.99 - $29.99 = $20.00

      const downgradePrice = calculateLicenseUpgradePrice(LicenseType.PREMIUM, LicenseType.BASIC);
      expect(downgradePrice).toBe(0); // No negative prices
    });
  });
});

// ================================
// ORDER CALCULATION UTILITIES
// ================================

describe("Order Calculation Utilities", () => {
  const mockOrderItems = [
    {
      id: 1,
      productId: 1,
      productType: "beat" as const,
      title: "Beat 1",
      unitPrice: 2999,
      quantity: 2,
      totalPrice: 5998,
      licenseType: LicenseType.BASIC,
      metadata: {},
    },
    {
      id: 2,
      productId: 2,
      productType: "beat" as const,
      title: "Beat 2",
      unitPrice: 4999,
      quantity: 1,
      totalPrice: 4999,
      licenseType: LicenseType.PREMIUM,
      metadata: {},
      discountAmount: 500, // $5.00 discount
    },
  ];

  describe("calculateOrderSubtotal", () => {
    test("should calculate correct subtotal from items", () => {
      const subtotal = calculateOrderSubtotal(mockOrderItems);
      expect(subtotal).toBe(10497); // $59.98 + $49.99 - $5.00 = $104.97
    });
  });

  describe("calculateTaxAmount", () => {
    test("should calculate tax correctly for different rates", () => {
      const subtotal = 10000; // $100.00

      expect(calculateTaxAmount(subtotal, 0.08)).toBe(800); // 8% = $8.00
      expect(calculateTaxAmount(subtotal, 0.2)).toBe(2000); // 20% = $20.00
    });

    test("should handle JPY currency correctly", () => {
      const subtotal = 10000; // ¥10,000
      const tax = calculateTaxAmount(subtotal, 0.1, Currency.JPY);
      expect(tax).toBe(1000); // ¥1,000 (no decimal places)
    });
  });

  describe("calculateProcessingFee", () => {
    test("should calculate correct fees for different payment methods", () => {
      const amount = 10000; // $100.00

      const stripeFee = calculateProcessingFee(amount, "stripe");
      expect(stripeFee).toBe(320); // 2.9% + $0.30 = $3.20

      const paypalFee = calculateProcessingFee(amount, "paypal");
      expect(paypalFee).toBe(370); // 3.4% + $0.30 = $3.70
    });
  });

  describe("calculateOrderTotal", () => {
    test("should calculate complete order total with all fees", () => {
      const result = calculateOrderTotal(
        mockOrderItems,
        0.08, // 8% tax
        0, // No shipping
        500, // $5.00 discount
        "stripe"
      );

      expect(result.subtotal).toBe(10497); // $104.97
      expect(result.taxAmount).toBe(840); // 8% of subtotal
      expect(result.processingFee).toBe(359); // Stripe fee on subtotal + tax
      expect(result.total).toBe(11196); // Subtotal + tax + processing - discount
    });

    test("should ensure total is never negative", () => {
      const result = calculateOrderTotal(
        mockOrderItems,
        0,
        0,
        20000, // Large discount
        "stripe"
      );

      expect(result.total).toBe(0);
    });
  });
});

// ================================
// SUBSCRIPTION UTILITIES
// ================================

describe("Subscription Utilities", () => {
  describe("calculateSubscriptionChange", () => {
    test("should calculate prorated upgrade correctly", () => {
      const result = calculateSubscriptionChange(
        SubscriptionPlan.BASIC,
        SubscriptionPlan.PREMIUM,
        15, // 15 days remaining
        "monthly"
      );

      expect(result.creditAmount).toBe(5); // $9.99 * 15/30 = ~$5.00 (rounded)
      expect(result.chargeAmount).toBe(15); // $29.99 * 15/30 = ~$15.00 (rounded)
      expect(result.netAmount).toBe(10); // $15.00 - $5.00 = $10.00
    });

    test("should handle annual billing correctly", () => {
      const result = calculateSubscriptionChange(
        SubscriptionPlan.BASIC,
        SubscriptionPlan.PREMIUM,
        180, // 180 days remaining
        "annual"
      );

      expect(result.creditAmount).toBe(59); // $119.88 * 180/365 (rounded)
      expect(result.chargeAmount).toBe(177); // $359.88 * 180/365 (rounded)
      expect(result.netAmount).toBe(118); // Difference
    });
  });

  describe("checkDownloadQuota", () => {
    test("should handle unlimited plans correctly", () => {
      const result = checkDownloadQuota(SubscriptionPlan.UNLIMITED, 100);

      expect(result.hasQuota).toBe(true);
      expect(result.remainingDownloads).toBe(-1);
      expect(result.isUnlimited).toBe(true);
    });

    test("should calculate remaining downloads for limited plans", () => {
      const result = checkDownloadQuota(SubscriptionPlan.BASIC, 5);

      expect(result.hasQuota).toBe(true);
      expect(result.remainingDownloads).toBe(5); // 10 - 5 = 5
      expect(result.isUnlimited).toBe(false);
    });

    test("should handle quota exceeded", () => {
      const result = checkDownloadQuota(SubscriptionPlan.BASIC, 15);

      expect(result.hasQuota).toBe(false);
      expect(result.remainingDownloads).toBe(0);
      expect(result.isUnlimited).toBe(false);
    });
  });
});

// ================================
// SERVICE PRICING UTILITIES
// ================================

describe("Service Pricing Utilities", () => {
  describe("calculateServicePrice", () => {
    test("should calculate hourly service pricing correctly", () => {
      const result = calculateServicePrice("mixing", 120); // 2 hours

      expect(result.basePrice).toBe(20000); // $200 (2 * $100/hour)
      expect(result.additionalFees).toBe(0);
      expect(result.rushFee).toBe(0);
      expect(result.totalPrice).toBe(20000);
    });

    test("should handle flat rate services", () => {
      const result = calculateServicePrice("custom_beat", 60);

      expect(result.basePrice).toBe(20000); // $200 flat rate
      expect(result.totalPrice).toBe(20000);
    });

    test("should add additional service fees", () => {
      const result = calculateServicePrice("mixing", 60, ["rush_delivery", "include_stems"]);

      expect(result.basePrice).toBe(10000); // $100 for 1 hour
      expect(result.additionalFees).toBe(7500); // $50 + $25 = $75
      expect(result.totalPrice).toBe(17500);
    });

    test("should apply rush order fee", () => {
      const result = calculateServicePrice("mixing", 60, [], true);

      expect(result.basePrice).toBe(10000); // $100
      expect(result.rushFee).toBe(2500); // 25% of base price = $25
      expect(result.totalPrice).toBe(12500);
    });
  });

  describe("calculateServiceBundleDiscount", () => {
    test("should apply correct bundle discounts", () => {
      const services = [
        { type: "recording", duration: 180 }, // 3 hours * $150 = $450
        { type: "mixing", duration: 120 }, // 2 hours * $100 = $200
        { type: "mastering", duration: 60 }, // 1 hour * $80 = $80
      ];

      const result = calculateServiceBundleDiscount(services, "premium");

      expect(result.originalTotal).toBe(73000); // $730
      expect(result.discountRate).toBe(0.15); // 15%
      expect(result.discountAmount).toBe(10950); // $109.50
      expect(result.finalTotal).toBe(62050); // $620.50
    });
  });
});

// ================================
// CURRENCY UTILITIES
// ================================

describe("Currency Utilities", () => {
  describe("convertCurrency", () => {
    test("should return same amount for same currency", () => {
      expect(convertCurrency(1000, Currency.USD, Currency.USD)).toBe(1000);
    });

    test("should convert between currencies using exchange rates", () => {
      const customRates = { USD_EUR: 0.85 };
      const result = convertCurrency(1000, Currency.USD, Currency.EUR, customRates);
      expect(result).toBe(850); // $10.00 -> €8.50
    });

    test("should handle indirect conversion through USD", () => {
      const customRates = { EUR_USD: 1.18, USD_GBP: 0.73 };
      const result = convertCurrency(1000, Currency.EUR, Currency.GBP, customRates);
      expect(result).toBe(861); // EUR -> USD -> GBP
    });
  });

  describe("formatCurrencyAmount", () => {
    test("should format currencies correctly", () => {
      expect(formatCurrencyAmount(1000, Currency.USD)).toBe("$10.00");
      expect(formatCurrencyAmount(1000, Currency.EUR)).toBe("€10.00");
      expect(formatCurrencyAmount(1000, Currency.JPY)).toBe("¥10"); // 1000 cents = ¥10
    });
  });
});

// ================================
// BUSINESS RULE VALIDATION
// ================================

describe("Business Rule Validation", () => {
  describe("validateOrderBusinessRules", () => {
    test("should validate license restrictions", () => {
      const items = [
        {
          id: 1,
          productId: 1,
          productType: "beat" as const,
          title: "Beat 1",
          unitPrice: 2999,
          quantity: 1,
          totalPrice: 2999,
          licenseType: LicenseType.UNLIMITED, // Not allowed for FREE plan
          metadata: {},
        },
      ];

      const result = validateOrderBusinessRules(items, SubscriptionPlan.FREE, "customer");

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("subscription plan does not allow");
    });

    test("should detect duplicate items", () => {
      const items = [
        {
          id: 1,
          productId: 1,
          productType: "beat" as const,
          title: "Beat 1",
          unitPrice: 2999,
          quantity: 1,
          totalPrice: 2999,
          licenseType: LicenseType.BASIC,
          metadata: {},
        },
        {
          id: 2,
          productId: 1, // Same product ID
          productType: "beat" as const,
          title: "Beat 1",
          unitPrice: 2999,
          quantity: 1,
          totalPrice: 2999,
          licenseType: LicenseType.PREMIUM,
          metadata: {},
        },
      ];

      const result = validateOrderBusinessRules(items, SubscriptionPlan.BASIC, "customer");

      expect(result.warnings).toContain("Order contains duplicate items");
    });

    test("should warn about large orders", () => {
      const items = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        productId: i + 1,
        productType: "beat" as const,
        title: `Beat ${i + 1}`,
        unitPrice: 2999,
        quantity: 1,
        totalPrice: 2999,
        licenseType: LicenseType.BASIC,
        metadata: {},
      }));

      const result = validateOrderBusinessRules(items, SubscriptionPlan.BASIC, "customer");

      expect(result.warnings).toContain(
        "Large order detected - consider splitting into multiple orders"
      );
    });
  });

  describe("calculateRecommendedBeatPricing", () => {
    test("should calculate recommended pricing based on market factors", () => {
      const result = calculateRecommendedBeatPricing("trap", 140, 4.5, "high");

      // Should be higher than base pricing due to high demand and good rating
      expect(result.basic).toBeGreaterThan(2999);
      expect(result.premium).toBeGreaterThan(4999);
      expect(result.unlimited).toBeGreaterThan(14999);

      // Should maintain pricing hierarchy
      expect(result.basic).toBeLessThan(result.premium);
      expect(result.premium).toBeLessThan(result.unlimited);
    });

    test("should apply genre-specific multipliers", () => {
      const popResult = calculateRecommendedBeatPricing("pop", 120, 3.0, "medium");
      const rbResult = calculateRecommendedBeatPricing("r&b", 90, 3.0, "medium");

      // Pop should be more expensive than R&B based on genre multipliers
      expect(popResult.basic).toBeGreaterThan(rbResult.basic);
    });
  });
});
