/**
 * Business Logic Utilities for BroLab Entertainment
 *
 * Centralized business logic functions for:
 * - Beat pricing calculations
 * - License validation and pricing
 * - Order calculations with fees and taxes
 * - Subscription management
 * - Service pricing with bundles
 * - Currency conversion
 * - Business rule validation
 */

import { DEFAULT_LICENSE_TERMS, LicenseType } from "../types/Beat";
import { CURRENCY_SYMBOLS, Currency } from "../types/Order";
import { SUBSCRIPTION_FEATURES, SubscriptionPlan } from "../types/User";
import { centsToDollars } from "./currency";

// ================================
// TYPES
// ================================

export interface VolumeDiscountResult {
  discountAmount: number;
  finalAmount: number;
  discountRate: number;
}

export interface LicenseBundle {
  type: LicenseType;
  quantity: number;
}

export interface OrderItemForCalculation {
  id: number;
  productId: number;
  productType: "beat" | "service" | "subscription";
  title: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  licenseType: LicenseType;
  metadata: Record<string, unknown>;
  discountAmount?: number;
}

export interface OrderTotalResult {
  subtotal: number;
  taxAmount: number;
  processingFee: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
}

export interface SubscriptionChangeResult {
  creditAmount: number;
  chargeAmount: number;
  netAmount: number;
}

export interface DownloadQuotaResult {
  hasQuota: boolean;
  remainingDownloads: number;
  isUnlimited: boolean;
}

export interface ServicePriceResult {
  basePrice: number;
  additionalFees: number;
  rushFee: number;
  totalPrice: number;
}

export interface ServiceBundleResult {
  originalTotal: number;
  discountRate: number;
  discountAmount: number;
  finalTotal: number;
}

export interface ServiceInput {
  type: string;
  duration: number;
}

export interface BusinessRulesResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RecommendedPricing {
  basic: number;
  premium: number;
  unlimited: number;
}

// ================================
// CONSTANTS
// ================================

/** License prices in cents */
const LICENSE_PRICES_CENTS: Record<LicenseType, number> = {
  [LicenseType.BASIC]: 2999,
  [LicenseType.PREMIUM]: 4999,
  [LicenseType.UNLIMITED]: 14999,
};

/** Volume discount tiers */
const VOLUME_DISCOUNT_TIERS = [
  { minQuantity: 10, rate: 0.15 },
  { minQuantity: 5, rate: 0.1 },
  { minQuantity: 3, rate: 0.05 },
];

/** Loyalty discount tiers (based on total spent in cents) */
const LOYALTY_DISCOUNT_TIERS = [
  { minSpent: 100000, rate: 0.15 }, // $1000+
  { minSpent: 50000, rate: 0.1 }, // $500+
  { minSpent: 20000, rate: 0.05 }, // $200+
];

/** Processing fees by payment method */
const PROCESSING_FEES: Record<string, { percentage: number; fixed: number }> = {
  stripe: { percentage: 0.029, fixed: 30 },
  paypal: { percentage: 0.034, fixed: 30 },
};

/** Subscription prices (monthly in dollars) - Synced with Clerk Billing Dashboard */
const SUBSCRIPTION_PRICES_MONTHLY: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.BASIC]: 9.99,
  [SubscriptionPlan.ARTIST]: 19.99,
  [SubscriptionPlan.ULTIMATE_PASS]: 49.99,
  [SubscriptionPlan.PRODUCER]: 199.99,
};

/** Subscription prices (annual in dollars) - Synced with Clerk Billing Dashboard */
const SUBSCRIPTION_PRICES_ANNUAL: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.BASIC]: 35.88,
  [SubscriptionPlan.ARTIST]: 59.88,
  [SubscriptionPlan.ULTIMATE_PASS]: 119.88,
  [SubscriptionPlan.PRODUCER]: 2399.88,
};

/** Service hourly rates in cents */
const SERVICE_HOURLY_RATES: Record<string, number> = {
  mixing: 10000, // $100/hour
  mastering: 8000, // $80/hour
  recording: 15000, // $150/hour
  custom_beat: 20000, // $200 flat rate
  consultation: 5000, // $50/hour
};

/** Additional service fees in cents */
const ADDITIONAL_SERVICE_FEES: Record<string, number> = {
  rush_delivery: 5000, // $50
  include_stems: 2500, // $25
  revision_pack: 3000, // $30
  priority_support: 2000, // $20
};

/** Genre pricing multipliers */
const GENRE_MULTIPLIERS: Record<string, number> = {
  trap: 1.1,
  "hip-hop": 1.05,
  pop: 1.15,
  "r&b": 1,
  drill: 1.08,
  afrobeat: 1.12,
  electronic: 1.05,
};

/** Demand level multipliers */
const DEMAND_MULTIPLIERS: Record<string, number> = {
  low: 0.9,
  medium: 1,
  high: 1.2,
};

// ================================
// BEAT PRICING UTILITIES
// ================================

/**
 * Calculate beat price for a specific license type
 */
export function calculateBeatPrice(licenseType: LicenseType): number {
  return LICENSE_PRICES_CENTS[licenseType];
}

/**
 * Calculate total price for a bundle of licenses
 */
export function calculateBeatBundlePrice(licenses: LicenseBundle[]): number {
  return licenses.reduce((total, license) => {
    return total + calculateBeatPrice(license.type) * license.quantity;
  }, 0);
}

/**
 * Apply volume discount based on quantity
 */
export function applyVolumeDiscount(amount: number, quantity: number): VolumeDiscountResult {
  const tier = VOLUME_DISCOUNT_TIERS.find(t => quantity >= t.minQuantity);
  const discountRate = tier?.rate ?? 0;
  const discountAmount = Math.round(amount * discountRate);

  return {
    discountAmount,
    finalAmount: amount - discountAmount,
    discountRate,
  };
}

/**
 * Calculate loyalty discount based on total spent
 */
export function calculateLoyaltyDiscount(orderAmount: number, totalSpent: number): number {
  const tier = LOYALTY_DISCOUNT_TIERS.find(t => totalSpent >= t.minSpent);
  if (!tier) return 0;
  return Math.round(orderAmount * tier.rate);
}

// ================================
// LICENSE VALIDATION UTILITIES
// ================================

/**
 * Check if user can purchase a specific license type
 */
export function canUserPurchaseLicense(
  licenseType: LicenseType,
  subscriptionPlan: SubscriptionPlan,
  userRole: string
): boolean {
  // Admin can purchase any license
  if (userRole === "admin") return true;

  // Check subscription restrictions - Synced with Clerk Billing plans
  switch (subscriptionPlan) {
    case SubscriptionPlan.FREE:
      return licenseType === LicenseType.BASIC;
    case SubscriptionPlan.BASIC:
      return licenseType === LicenseType.BASIC || licenseType === LicenseType.PREMIUM;
    case SubscriptionPlan.ARTIST:
    case SubscriptionPlan.ULTIMATE_PASS:
    case SubscriptionPlan.PRODUCER:
      return true;
    default:
      return false;
  }
}

/**
 * Get license terms for a specific license type
 */
export function getLicenseTerms(
  licenseType: LicenseType
): (typeof DEFAULT_LICENSE_TERMS)[LicenseType] {
  return DEFAULT_LICENSE_TERMS[licenseType];
}

/**
 * Calculate upgrade price between license types
 */
export function calculateLicenseUpgradePrice(
  currentLicense: LicenseType,
  targetLicense: LicenseType
): number {
  const currentPrice = LICENSE_PRICES_CENTS[currentLicense];
  const targetPrice = LICENSE_PRICES_CENTS[targetLicense];
  return Math.max(0, targetPrice - currentPrice);
}

// ================================
// ORDER CALCULATION UTILITIES
// ================================

/**
 * Calculate order subtotal from items
 */
export function calculateOrderSubtotal(items: OrderItemForCalculation[]): number {
  return items.reduce((total, item) => {
    const itemTotal = item.totalPrice - (item.discountAmount ?? 0);
    return total + itemTotal;
  }, 0);
}

/**
 * Calculate tax amount
 */
export function calculateTaxAmount(
  subtotal: number,
  taxRate: number,
  currency: Currency = Currency.USD
): number {
  const tax = subtotal * taxRate;
  // JPY has no decimal places
  if (currency === Currency.JPY) {
    return Math.round(tax);
  }
  return Math.round(tax);
}

/**
 * Calculate processing fee for payment method
 */
export function calculateProcessingFee(amount: number, paymentMethod: string): number {
  const fees = PROCESSING_FEES[paymentMethod] ?? PROCESSING_FEES.stripe;
  return Math.round(amount * fees.percentage + fees.fixed);
}

/**
 * Calculate complete order total with all fees
 */
export function calculateOrderTotal(
  items: OrderItemForCalculation[],
  taxRate: number,
  shippingAmount: number,
  discountAmount: number,
  paymentMethod: string
): OrderTotalResult {
  const subtotal = calculateOrderSubtotal(items);
  const taxAmount = calculateTaxAmount(subtotal, taxRate);
  const processingFee = calculateProcessingFee(subtotal + taxAmount, paymentMethod);

  const total = Math.max(0, subtotal + taxAmount + processingFee + shippingAmount - discountAmount);

  return {
    subtotal,
    taxAmount,
    processingFee,
    shippingAmount,
    discountAmount,
    total,
  };
}

// ================================
// SUBSCRIPTION UTILITIES
// ================================

/**
 * Calculate prorated subscription change
 */
export function calculateSubscriptionChange(
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan,
  daysRemaining: number,
  billingCycle: "monthly" | "annual"
): SubscriptionChangeResult {
  const prices =
    billingCycle === "monthly" ? SUBSCRIPTION_PRICES_MONTHLY : SUBSCRIPTION_PRICES_ANNUAL;
  const totalDays = billingCycle === "monthly" ? 30 : 365;

  const currentPrice = prices[currentPlan];
  const targetPrice = prices[targetPlan];

  const creditAmount = Math.round((currentPrice * daysRemaining) / totalDays);
  const chargeAmount = Math.round((targetPrice * daysRemaining) / totalDays);
  const netAmount = chargeAmount - creditAmount;

  return {
    creditAmount,
    chargeAmount,
    netAmount,
  };
}

/**
 * Check download quota for subscription plan
 */
export function checkDownloadQuota(
  subscriptionPlan: SubscriptionPlan,
  downloadsUsed: number
): DownloadQuotaResult {
  const features = SUBSCRIPTION_FEATURES[subscriptionPlan];
  const monthlyLimit = features.monthlyDownloads;

  // Unlimited plan
  if (monthlyLimit === -1) {
    return {
      hasQuota: true,
      remainingDownloads: -1,
      isUnlimited: true,
    };
  }

  const remaining = Math.max(0, monthlyLimit - downloadsUsed);
  return {
    hasQuota: remaining > 0,
    remainingDownloads: remaining,
    isUnlimited: false,
  };
}

// ================================
// SERVICE PRICING UTILITIES
// ================================

/**
 * Calculate service price
 */
export function calculateServicePrice(
  serviceType: string,
  durationMinutes: number,
  additionalServices: string[] = [],
  isRush: boolean = false
): ServicePriceResult {
  const hourlyRate = SERVICE_HOURLY_RATES[serviceType] ?? SERVICE_HOURLY_RATES.mixing;

  // Flat rate services
  let basePrice: number;
  if (serviceType === "custom_beat") {
    basePrice = hourlyRate; // Flat rate
  } else {
    basePrice = Math.round((hourlyRate * durationMinutes) / 60);
  }

  // Additional service fees
  const additionalFees = additionalServices.reduce((total, service) => {
    return total + (ADDITIONAL_SERVICE_FEES[service] ?? 0);
  }, 0);

  // Rush fee (25% of base price)
  const rushFee = isRush ? Math.round(basePrice * 0.25) : 0;

  return {
    basePrice,
    additionalFees,
    rushFee,
    totalPrice: basePrice + additionalFees + rushFee,
  };
}

/**
 * Calculate service bundle discount
 */
export function calculateServiceBundleDiscount(
  services: ServiceInput[],
  userPlan: string
): ServiceBundleResult {
  // Calculate original total
  const originalTotal = services.reduce((total, service) => {
    const result = calculateServicePrice(service.type, service.duration);
    return total + result.totalPrice;
  }, 0);

  // Discount rates by plan
  const discountRates: Record<string, number> = {
    free: 0,
    basic: 0.05,
    premium: 0.15,
    unlimited: 0.2,
    producer: 0.25,
  };

  const discountRate = discountRates[userPlan] ?? 0;
  const discountAmount = Math.round(originalTotal * discountRate);

  return {
    originalTotal,
    discountRate,
    discountAmount,
    finalTotal: originalTotal - discountAmount,
  };
}

// ================================
// CURRENCY UTILITIES
// ================================

/**
 * Convert currency amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRates?: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;

  const rates = exchangeRates ?? {};

  // Direct conversion
  const directKey = `${fromCurrency}_${toCurrency}`;
  if (rates[directKey]) {
    return Math.round(amount * rates[directKey]);
  }

  // Indirect conversion through USD
  const toUsdKey = `${fromCurrency}_USD`;
  const fromUsdKey = `USD_${toCurrency}`;

  if (rates[toUsdKey] && rates[fromUsdKey]) {
    const usdAmount = amount * rates[toUsdKey];
    return Math.round(usdAmount * rates[fromUsdKey]);
  }

  // Try reverse conversion
  const reverseToUsd = `${fromCurrency}_USD`;
  const reverseFromUsd = `USD_${toCurrency}`;

  if (rates[reverseToUsd] || rates[`USD_${fromCurrency}`]) {
    const toUsdRate = rates[reverseToUsd] ?? 1 / (rates[`USD_${fromCurrency}`] ?? 1);
    const fromUsdRate = rates[reverseFromUsd] ?? 1;
    return Math.round(amount * toUsdRate * fromUsdRate);
  }

  return amount;
}

/**
 * Format currency amount for display
 */
export function formatCurrencyAmount(amountCents: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];

  // JPY has no decimal places (100 cents = 1 yen display)
  if (currency === Currency.JPY) {
    return `${symbol}${Math.round(centsToDollars(amountCents))}`;
  }

  const dollars = centsToDollars(amountCents).toFixed(2);
  return `${symbol}${dollars}`;
}

// ================================
// BUSINESS RULE VALIDATION
// ================================

/**
 * Validate order against business rules
 */
export function validateOrderBusinessRules(
  items: OrderItemForCalculation[],
  subscriptionPlan: SubscriptionPlan,
  userRole: string
): BusinessRulesResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check license restrictions
  for (const item of items) {
    if (!canUserPurchaseLicense(item.licenseType, subscriptionPlan, userRole)) {
      errors.push(
        `Your subscription plan does not allow purchasing ${item.licenseType} license for "${item.title}"`
      );
    }
  }

  // Check for duplicate items
  const productIds = items.map(item => item.productId);
  const uniqueProductIds = new Set(productIds);
  if (productIds.length !== uniqueProductIds.size) {
    warnings.push("Order contains duplicate items");
  }

  // Warn about large orders
  if (items.length > 50) {
    warnings.push("Large order detected - consider splitting into multiple orders");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate recommended beat pricing based on market factors
 */
export function calculateRecommendedBeatPricing(
  genre: string,
  bpm: number,
  rating: number,
  demandLevel: string
): RecommendedPricing {
  const genreMultiplier = GENRE_MULTIPLIERS[genre.toLowerCase()] ?? 1;
  const demandMultiplier = DEMAND_MULTIPLIERS[demandLevel.toLowerCase()] ?? 1;

  // Rating multiplier (3 = 1, 5 = 1.2)
  const ratingMultiplier = 1 + (rating - 3) * 0.1;

  // BPM factor (trending BPMs get slight boost)
  const trendingBpmRanges = [
    { min: 130, max: 150 }, // Trap/Drill
    { min: 100, max: 120 }, // Pop/R&B
  ];
  const isTrendingBpm = trendingBpmRanges.some(range => bpm >= range.min && bpm <= range.max);
  const bpmMultiplier = isTrendingBpm ? 1.05 : 1;

  const totalMultiplier = genreMultiplier * demandMultiplier * ratingMultiplier * bpmMultiplier;

  return {
    basic: Math.round(LICENSE_PRICES_CENTS[LicenseType.BASIC] * totalMultiplier),
    premium: Math.round(LICENSE_PRICES_CENTS[LicenseType.PREMIUM] * totalMultiplier),
    unlimited: Math.round(LICENSE_PRICES_CENTS[LicenseType.UNLIMITED] * totalMultiplier),
  };
}
