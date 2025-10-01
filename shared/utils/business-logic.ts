/**
 * Business Logic Utilities for BroLab Entertainment
 *
 * This module contains core business logic functions for:
 * - Pricing calculations
 * - License validation and pricing
 * - Order calculations
 * - Subscription management
 * - Service pricing
 * - Tax and fee calculations
 * - Discount applications
 */

import { DEFAULT_LICENSE_TERMS, LICENSE_PRICING, LicenseType } from "../types/Beat";
import { Currency, OrderItem } from "../types/Order";
import { SUBSCRIPTION_FEATURES, SubscriptionPlan } from "../types/User";

// ================================
// PRICING CALCULATION UTILITIES
// ================================

/**
 * Calculate beat price for a specific license type
 */
export const calculateBeatPrice = (licenseType: LicenseType): number => {
  const priceInDollars = LICENSE_PRICING[licenseType];
  return Math.round(priceInDollars * 100); // Convert to cents
};

/**
 * Calculate total price for multiple beat licenses
 */
export const calculateBeatBundlePrice = (
  licenses: Array<{ type: LicenseType; quantity: number }>
): number => {
  return licenses.reduce((total, license) => {
    const unitPrice = calculateBeatPrice(license.type);
    return total + unitPrice * license.quantity;
  }, 0);
};

/**
 * Apply volume discount based on quantity
 */
export const applyVolumeDiscount = (
  totalAmount: number,
  quantity: number
): { discountAmount: number; finalAmount: number } => {
  let discountRate = 0;

  if (quantity >= 10) {
    discountRate = 0.15; // 15% discount for 10+ items
  } else if (quantity >= 5) {
    discountRate = 0.1; // 10% discount for 5+ items
  } else if (quantity >= 3) {
    discountRate = 0.05; // 5% discount for 3+ items
  }

  const discountAmount = Math.round(totalAmount * discountRate);
  const finalAmount = totalAmount - discountAmount;

  return { discountAmount, finalAmount };
};

/**
 * Calculate loyalty discount based on user's total purchases
 */
export const calculateLoyaltyDiscount = (orderAmount: number, userTotalSpent: number): number => {
  let discountRate = 0;

  if (userTotalSpent >= 100000) {
    // $1000+
    discountRate = 0.15; // 15% loyalty discount
  } else if (userTotalSpent >= 50000) {
    // $500+
    discountRate = 0.1; // 10% loyalty discount
  } else if (userTotalSpent >= 20000) {
    // $200+
    discountRate = 0.05; // 5% loyalty discount
  }

  return Math.round(orderAmount * discountRate);
};

// ================================
// LICENSE VALIDATION UTILITIES
// ================================

/**
 * Check if user can purchase a specific license type
 */
export const canUserPurchaseLicense = (
  licenseType: LicenseType,
  userSubscriptionPlan: SubscriptionPlan,
  userRole: string
): boolean => {
  // Admin can purchase any license
  if (userRole === "admin") return true;

  // Check subscription plan restrictions
  switch (licenseType) {
    case LicenseType.BASIC:
      return true; // All users can purchase basic

    case LicenseType.PREMIUM:
      return [
        SubscriptionPlan.BASIC,
        SubscriptionPlan.PREMIUM,
        SubscriptionPlan.UNLIMITED,
        SubscriptionPlan.PRODUCER,
      ].includes(userSubscriptionPlan);

    case LicenseType.UNLIMITED:
      return [
        SubscriptionPlan.PREMIUM,
        SubscriptionPlan.UNLIMITED,
        SubscriptionPlan.PRODUCER,
      ].includes(userSubscriptionPlan);

    default:
      return false;
  }
};

/**
 * Get license terms for a specific license type
 */
export const getLicenseTerms = (licenseType: LicenseType) => {
  return DEFAULT_LICENSE_TERMS[licenseType];
};

/**
 * Calculate license upgrade price
 */
export const calculateLicenseUpgradePrice = (
  fromLicense: LicenseType,
  toLicense: LicenseType
): number => {
  const fromPrice = calculateBeatPrice(fromLicense);
  const toPrice = calculateBeatPrice(toLicense);

  return Math.max(0, toPrice - fromPrice);
};

// ================================
// ORDER CALCULATION UTILITIES
// ================================

/**
 * Calculate order subtotal from items
 */
export const calculateOrderSubtotal = (items: OrderItem[]): number => {
  return items.reduce((subtotal, item) => {
    const itemTotal = item.unitPrice * item.quantity - (item.discountAmount || 0);
    return subtotal + itemTotal;
  }, 0);
};

/**
 * Calculate tax amount based on location and order details
 */
export const calculateTaxAmount = (
  subtotal: number,
  taxRate: number,
  currency: Currency = Currency.USD
): number => {
  // Tax calculation varies by currency and location
  const taxAmount = subtotal * taxRate;

  // Round to appropriate precision for currency
  switch (currency) {
    case Currency.JPY:
      return Math.round(taxAmount); // No decimal places for JPY
    default:
      return Math.round(taxAmount); // Round to cents
  }
};

/**
 * Calculate processing fees
 */
export const calculateProcessingFee = (
  amount: number,
  paymentMethod: string,
  currency: Currency = Currency.USD
): number => {
  let feeRate = 0;
  let fixedFee = 0;

  switch (paymentMethod) {
    case "stripe":
      feeRate = 0.029; // 2.9%
      fixedFee = currency === Currency.USD ? 30 : 25; // $0.30 or €0.25
      break;
    case "paypal":
      feeRate = 0.034; // 3.4%
      fixedFee = currency === Currency.USD ? 30 : 25;
      break;
    default:
      feeRate = 0.025; // 2.5% default
      fixedFee = 25;
  }

  return Math.round(amount * feeRate + fixedFee);
};

/**
 * Calculate complete order total
 */
export const calculateOrderTotal = (
  items: OrderItem[],
  taxRate: number = 0,
  shippingCost: number = 0,
  discountAmount: number = 0,
  paymentMethod: string = "stripe",
  currency: Currency = Currency.USD
): {
  subtotal: number;
  taxAmount: number;
  processingFee: number;
  total: number;
} => {
  const subtotal = calculateOrderSubtotal(items);
  const taxAmount = calculateTaxAmount(subtotal, taxRate, currency);
  const processingFee = calculateProcessingFee(subtotal + taxAmount, paymentMethod, currency);

  const total = subtotal + taxAmount + shippingCost + processingFee - discountAmount;

  return {
    subtotal,
    taxAmount,
    processingFee,
    total: Math.max(0, total), // Ensure total is never negative
  };
};

// ================================
// SUBSCRIPTION UTILITIES
// ================================

/**
 * Calculate subscription upgrade/downgrade pricing
 */
export const calculateSubscriptionChange = (
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan,
  daysRemaining: number,
  billingCycle: "monthly" | "annual" = "monthly"
): {
  creditAmount: number;
  chargeAmount: number;
  netAmount: number;
} => {
  const currentFeatures = SUBSCRIPTION_FEATURES[currentPlan];
  const newFeatures = SUBSCRIPTION_FEATURES[newPlan];

  const daysInPeriod = billingCycle === "annual" ? 365 : 30;
  const currentPrice =
    billingCycle === "annual" ? currentFeatures.price * 12 : currentFeatures.price;
  const newPrice = billingCycle === "annual" ? newFeatures.price * 12 : newFeatures.price;

  // Calculate prorated credit for remaining time on current plan
  const creditAmount = Math.round((currentPrice * daysRemaining) / daysInPeriod);

  // Calculate charge for new plan
  const chargeAmount = Math.round((newPrice * daysRemaining) / daysInPeriod);

  // Net amount (positive = charge, negative = credit)
  const netAmount = chargeAmount - creditAmount;

  return {
    creditAmount,
    chargeAmount,
    netAmount,
  };
};

/**
 * Check if user has exceeded download quota
 */
export const checkDownloadQuota = (
  userPlan: SubscriptionPlan,
  currentDownloads: number
): {
  hasQuota: boolean;
  remainingDownloads: number;
  isUnlimited: boolean;
} => {
  const planFeatures = SUBSCRIPTION_FEATURES[userPlan];
  const monthlyLimit = planFeatures.monthlyDownloads;

  if (monthlyLimit === -1) {
    return {
      hasQuota: true,
      remainingDownloads: -1,
      isUnlimited: true,
    };
  }

  const remainingDownloads = Math.max(0, monthlyLimit - currentDownloads);

  return {
    hasQuota: remainingDownloads > 0,
    remainingDownloads,
    isUnlimited: false,
  };
};

// ================================
// SERVICE PRICING UTILITIES
// ================================

/**
 * Calculate service pricing with time-based rates
 */
export const calculateServicePrice = (
  serviceType: string,
  durationMinutes: number,
  additionalServices: string[] = [],
  isRushOrder: boolean = false
): {
  basePrice: number;
  additionalFees: number;
  rushFee: number;
  totalPrice: number;
} => {
  // Base hourly rates in cents
  const hourlyRates: Record<string, number> = {
    consultation: 5000, // $50/hour
    mixing: 10000, // $100/hour
    mastering: 8000, // $80/hour
    recording: 15000, // $150/hour
    vocal_tuning: 7500, // $75/hour
    custom_beat: 20000, // $200 flat rate (treated as 2-hour minimum)
    beat_remake: 15000, // $150 flat rate (treated as 1.5-hour minimum)
    full_production: 50000, // $500/hour
  };

  const rate = hourlyRates[serviceType] || 10000; // Default $100/hour
  const hours = durationMinutes / 60;

  // Calculate base price
  let basePrice: number;
  if (serviceType === "custom_beat") {
    basePrice = 20000; // Flat rate
  } else if (serviceType === "beat_remake") {
    basePrice = 15000; // Flat rate
  } else {
    basePrice = Math.ceil(rate * hours);
  }

  // Additional service fees
  const additionalFeeRates: Record<string, number> = {
    rush_delivery: 5000, // $50
    include_stems: 2500, // $25
    extra_revisions: 1500, // $15 per revision
    weekend_booking: 2500, // $25
    after_hours: 3000, // $30
    priority_support: 2000, // $20
  };

  const additionalFees = additionalServices.reduce((total, service) => {
    return total + (additionalFeeRates[service] || 0);
  }, 0);

  // Rush order fee (25% of base price)
  const rushFee = isRushOrder ? Math.round(basePrice * 0.25) : 0;

  const totalPrice = basePrice + additionalFees + rushFee;

  return {
    basePrice,
    additionalFees,
    rushFee,
    totalPrice,
  };
};

/**
 * Calculate service bundle discount
 */
export const calculateServiceBundleDiscount = (
  services: Array<{ type: string; duration: number }>,
  bundleType: "basic" | "premium" | "complete" = "basic"
): {
  originalTotal: number;
  discountRate: number;
  discountAmount: number;
  finalTotal: number;
} => {
  const originalTotal = services.reduce((total, service) => {
    const pricing = calculateServicePrice(service.type, service.duration);
    return total + pricing.totalPrice;
  }, 0);

  // Bundle discount rates
  const discountRates = {
    basic: 0.1, // 10% discount
    premium: 0.15, // 15% discount
    complete: 0.2, // 20% discount
  };

  const discountRate = discountRates[bundleType];
  const discountAmount = Math.round(originalTotal * discountRate);
  const finalTotal = originalTotal - discountAmount;

  return {
    originalTotal,
    discountRate,
    discountAmount,
    finalTotal,
  };
};

// ================================
// CURRENCY CONVERSION UTILITIES
// ================================

/**
 * Convert amount between currencies (simplified - in production, use real exchange rates)
 */
export const convertCurrency = (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRates?: Record<string, number>
): number => {
  if (fromCurrency === toCurrency) return amount;

  // Default exchange rates (in production, fetch from API)
  const defaultRates: Record<string, number> = {
    USD_EUR: 0.85,
    USD_GBP: 0.73,
    USD_CAD: 1.25,
    USD_AUD: 1.35,
    USD_JPY: 110,
    EUR_USD: 1.18,
    EUR_GBP: 0.86,
    GBP_USD: 1.37,
    GBP_EUR: 1.16,
  };

  const rates = exchangeRates || defaultRates;
  const rateKey = `${fromCurrency}_${toCurrency}`;
  const rate = rates[rateKey];

  if (!rate) {
    // If direct rate not available, convert through USD
    if (fromCurrency !== Currency.USD && toCurrency !== Currency.USD) {
      const usdAmount = convertCurrency(amount, fromCurrency, Currency.USD, rates);
      return convertCurrency(usdAmount, Currency.USD, toCurrency, rates);
    }
    return amount; // Fallback to original amount
  }

  return Math.round(amount * rate);
};

/**
 * Format currency amount for display
 */
export const formatCurrencyAmount = (
  amount: number,
  currency: Currency,
  locale: string = "en-US"
): string => {
  const amountInMajorUnit = amount / 100; // Convert from cents

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: currency === Currency.JPY ? 0 : 2,
    maximumFractionDigits: currency === Currency.JPY ? 0 : 2,
  }).format(amountInMajorUnit);
};

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validate business rules for order
 */
export const validateOrderBusinessRules = (
  items: OrderItem[],
  userPlan: SubscriptionPlan,
  userRole: string
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check license restrictions
  items.forEach((item, index) => {
    if (item.licenseType && !canUserPurchaseLicense(item.licenseType, userPlan, userRole)) {
      errors.push(
        `Item ${index + 1}: Your subscription plan does not allow purchasing ${item.licenseType} licenses`
      );
    }
  });

  // Check for duplicate items
  const productIds = items.map(item => item.productId);
  const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    warnings.push("Order contains duplicate items");
  }

  // Check order size
  if (items.length > 50) {
    warnings.push("Large order detected - consider splitting into multiple orders");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Calculate recommended pricing for a beat based on market data
 */
export const calculateRecommendedBeatPricing = (
  genre: string,
  bpm: number,
  producerRating: number,
  marketDemand: "low" | "medium" | "high" = "medium"
): {
  basic: number;
  premium: number;
  unlimited: number;
} => {
  // Base pricing from constants
  let basicPrice = LICENSE_PRICING.basic * 100; // Convert to cents
  let premiumPrice = LICENSE_PRICING.premium * 100;
  let unlimitedPrice = LICENSE_PRICING.unlimited * 100;

  // Genre multipliers
  const genreMultipliers: Record<string, number> = {
    "hip-hop": 1.0,
    trap: 1.1,
    "r&b": 0.9,
    pop: 1.2,
    drill: 1.15,
    afrobeat: 0.95,
  };

  const genreMultiplier = genreMultipliers[genre.toLowerCase()] || 1.0;

  // Producer rating multiplier (1-5 stars)
  const ratingMultiplier = 0.8 + (producerRating / 5) * 0.4; // 0.8 to 1.2

  // Market demand multiplier
  const demandMultipliers = {
    low: 0.85,
    medium: 1.0,
    high: 1.25,
  };
  const demandMultiplier = demandMultipliers[marketDemand];

  // Apply multipliers
  const totalMultiplier = genreMultiplier * ratingMultiplier * demandMultiplier;

  basicPrice = Math.round(basicPrice * totalMultiplier);
  premiumPrice = Math.round(premiumPrice * totalMultiplier);
  unlimitedPrice = Math.round(unlimitedPrice * totalMultiplier);

  return {
    basic: basicPrice,
    premium: premiumPrice,
    unlimited: unlimitedPrice,
  };
};

// ================================
// EXPORTS
// ================================

export {
  applyVolumeDiscount,
  calculateBeatBundlePrice,
  // Pricing
  calculateBeatPrice,
  calculateLicenseUpgradePrice,
  calculateLoyaltyDiscount,
  // Orders
  calculateOrderSubtotal,
  calculateOrderTotal,
  calculateProcessingFee,
  calculateRecommendedBeatPricing,
  calculateServiceBundleDiscount,
  // Services
  calculateServicePrice,
  // Subscriptions
  calculateSubscriptionChange,
  calculateTaxAmount,
  // Licensing
  canUserPurchaseLicense,
  checkDownloadQuota,
  // Currency
  convertCurrency,
  formatCurrencyAmount,
  getLicenseTerms,
  // Validation
  validateOrderBusinessRules,
};
