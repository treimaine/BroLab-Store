/**
 * Centralized Currency Utilities for BroLab Entertainment
 *
 * This module provides unified currency formatting and conversion functions
 * to be used across all layers (client, server, convex).
 *
 * Replaces scattered patterns:
 * - (amount / 100).toFixed(2)
 * - amount / 100
 * - Math.round(dollars * 100)
 *
 * @module shared/utils/currency
 */

// ================================
// TYPES
// ================================

export interface CurrencyOptions {
  /** Currency code (ISO 4217) */
  currency?: "USD" | "EUR" | "GBP" | "CAD" | "JPY";
  /** Locale for formatting (BCP 47) */
  locale?: string;
  /** Whether to show currency symbol */
  showSymbol?: boolean;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
}

export interface CurrencyDisplayOptions {
  /** Currency code to display */
  currency?: string;
  /** Whether to uppercase the currency code */
  uppercaseCurrency?: boolean;
}

// ================================
// CONSTANTS
// ================================

const DEFAULT_OPTIONS: Required<CurrencyOptions> = {
  currency: "USD",
  locale: "en-US",
  showSymbol: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/** Cents per dollar for standard currencies */
const CENTS_PER_DOLLAR = 100;

/** Currencies that don't use decimal places */
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND"]);

// ================================
// CORE CONVERSION FUNCTIONS
// ================================

/**
 * Convert cents to dollars
 *
 * Replaces 15+ instances of (amount / 100)
 *
 * @param cents - Amount in cents (integer)
 * @returns Amount in dollars (decimal)
 *
 * @example
 * centsToDollars(2999) // 29.99
 * centsToDollars(100)  // 1.00
 */
export function centsToDollars(cents: number): number {
  if (!Number.isFinite(cents)) {
    return 0;
  }
  return cents / CENTS_PER_DOLLAR;
}

/**
 * Convert dollars to cents
 *
 * Uses Math.round to avoid floating-point precision errors
 *
 * @param dollars - Amount in dollars (decimal)
 * @returns Amount in cents (integer)
 *
 * @example
 * dollarsToCents(29.99) // 2999
 * dollarsToCents(1.00)  // 100
 */
export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) {
    return 0;
  }
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

// ================================
// FORMATTING FUNCTIONS
// ================================

/**
 * Format currency amount from cents with locale support
 *
 * Replaces scattered toFixed(2) patterns with proper Intl formatting
 *
 * @param amountInCents - Amount in cents (integer)
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(2999)                          // "$29.99"
 * formatCurrency(2999, { locale: "fr-FR" })     // "29,99 $US"
 * formatCurrency(2999, { showSymbol: false })   // "29.99"
 * formatCurrency(2999, { currency: "EUR" })     // "€29.99"
 */
export function formatCurrency(amountInCents: number, options: CurrencyOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Handle invalid input
  if (!Number.isFinite(amountInCents)) {
    amountInCents = 0;
  }

  // Handle zero-decimal currencies (like JPY)
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(opts.currency);
  const dollars = isZeroDecimal ? amountInCents : centsToDollars(amountInCents);

  // Adjust fraction digits for zero-decimal currencies
  const minFractionDigits = isZeroDecimal ? 0 : opts.minimumFractionDigits;
  const maxFractionDigits = isZeroDecimal ? 0 : opts.maximumFractionDigits;

  try {
    return new Intl.NumberFormat(opts.locale, {
      style: opts.showSymbol ? "currency" : "decimal",
      currency: opts.currency,
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
    }).format(dollars);
  } catch {
    // Fallback for invalid locale/currency
    const symbol = opts.showSymbol ? "$" : "";
    return `${symbol}${dollars.toFixed(2)}`;
  }
}

/**
 * Format currency for display in templates
 *
 * Replaces: ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}
 *
 * @param amountInCents - Amount in cents (integer)
 * @param options - Display options
 * @returns Formatted string like "29.99 USD"
 *
 * @example
 * formatCurrencyDisplay(2999)                           // "29.99 USD"
 * formatCurrencyDisplay(2999, { currency: "EUR" })      // "29.99 EUR"
 * formatCurrencyDisplay(2999, { uppercaseCurrency: false }) // "29.99 usd"
 */
export function formatCurrencyDisplay(
  amountInCents: number,
  options: CurrencyDisplayOptions = {}
): string {
  const { currency = "USD", uppercaseCurrency = true } = options;

  // Handle invalid input
  if (!Number.isFinite(amountInCents)) {
    amountInCents = 0;
  }

  // Handle zero-decimal currencies
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  const amount = isZeroDecimal ? amountInCents : centsToDollars(amountInCents);
  const formattedAmount = isZeroDecimal ? amount.toString() : amount.toFixed(2);

  const currencyCode = uppercaseCurrency ? currency.toUpperCase() : currency.toLowerCase();

  return `${formattedAmount} ${currencyCode}`;
}

/**
 * Format currency with compact notation for large amounts
 *
 * @param amountInCents - Amount in cents (integer)
 * @param options - Formatting options
 * @returns Compact formatted string like "$1.5K" or "$2.3M"
 *
 * @example
 * formatCurrencyCompact(150000)   // "$1.5K"
 * formatCurrencyCompact(2300000)  // "$23K"
 */
export function formatCurrencyCompact(
  amountInCents: number,
  options: CurrencyOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Handle invalid input
  if (!Number.isFinite(amountInCents)) {
    amountInCents = 0;
  }

  const dollars = centsToDollars(amountInCents);

  try {
    return new Intl.NumberFormat(opts.locale, {
      style: opts.showSymbol ? "currency" : "decimal",
      currency: opts.currency,
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(dollars);
  } catch {
    // Fallback
    if (dollars >= 1000000) {
      return `$${(dollars / 1000000).toFixed(1)}M`;
    }
    if (dollars >= 1000) {
      return `$${(dollars / 1000).toFixed(1)}K`;
    }
    return `$${dollars.toFixed(2)}`;
  }
}

// ================================
// VALIDATION FUNCTIONS
// ================================

/**
 * Check if a value is a valid currency amount
 *
 * @param amount - Value to check
 * @returns True if valid currency amount
 */
export function isValidCurrencyAmount(amount: unknown): amount is number {
  return typeof amount === "number" && Number.isFinite(amount) && !Number.isNaN(amount);
}

/**
 * Safely parse a currency string to cents
 *
 * @param value - String value to parse (e.g., "$29.99", "29.99")
 * @returns Amount in cents, or 0 if invalid
 *
 * @example
 * parseCurrencyToCents("$29.99")  // 2999
 * parseCurrencyToCents("29.99")   // 2999
 * parseCurrencyToCents("invalid") // 0
 */
export function parseCurrencyToCents(value: string): number {
  if (typeof value !== "string") {
    return 0;
  }

  // Remove currency symbols and non-numeric characters except decimal point and minus
  const cleaned = value.replaceAll(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(cleaned);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return dollarsToCents(parsed);
}

// ================================
// INTEGER ARITHMETIC HELPERS
// ================================

/**
 * Add two amounts in cents (safe integer arithmetic)
 *
 * @param a - First amount in cents
 * @param b - Second amount in cents
 * @returns Sum in cents
 */
export function addCents(a: number, b: number): number {
  return Math.round(a) + Math.round(b);
}

/**
 * Subtract amounts in cents (safe integer arithmetic)
 *
 * @param a - Amount to subtract from (cents)
 * @param b - Amount to subtract (cents)
 * @returns Difference in cents
 */
export function subtractCents(a: number, b: number): number {
  return Math.round(a) - Math.round(b);
}

/**
 * Multiply amount in cents by a factor (safe integer arithmetic)
 *
 * @param amountCents - Amount in cents
 * @param factor - Multiplication factor
 * @returns Result in cents (rounded)
 */
export function multiplyCents(amountCents: number, factor: number): number {
  return Math.round(amountCents * factor);
}

/**
 * Calculate percentage of an amount in cents
 *
 * @param amountCents - Base amount in cents
 * @param percentage - Percentage (e.g., 10 for 10%)
 * @returns Percentage amount in cents (rounded)
 *
 * @example
 * percentageOfCents(10000, 10) // 1000 (10% of $100)
 */
export function percentageOfCents(amountCents: number, percentage: number): number {
  return Math.round((amountCents * percentage) / 100);
}
