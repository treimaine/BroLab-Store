/**
 * Currency Formatting Utilities for Client
 *
 * This module re-exports core currency functions from shared/utils/currency
 * and provides client-specific extensions that depend on dashboard configuration.
 *
 * For basic currency operations, prefer importing directly from @shared/utils/currency
 */

import { CURRENCY_CONFIG } from "@/config/dashboard";
import { centsToDollars, dollarsToCents, isValidCurrencyAmount } from "@shared/utils/currency";
// Re-export core functions from shared module
export {
  addCents,
  centsToDollars,
  dollarsToCents,
  formatCurrencyCompact,
  formatCurrencyDisplay,
  isValidCurrencyAmount,
  multiplyCents,
  parseCurrencyToCents,
  percentageOfCents,
  subtractCents,
} from "@shared/utils/currency";

// ================================
// CLIENT-SPECIFIC TYPES
// ================================

export interface CurrencyFormatterOptions {
  locale?: string;
  showSymbol?: boolean;
  showCode?: boolean;
  compact?: boolean;
  precision?: number;
}

// ================================
// CLIENT-SPECIFIC FORMATTER CLASS
// ================================

/**
 * CurrencyFormatter class with dashboard configuration integration
 * Use this when you need dashboard-specific formatting options
 */
export class CurrencyFormatter {
  private readonly config = CURRENCY_CONFIG;

  /**
   * Format currency amount in dollars (not cents)
   */
  format(amount: number, options: CurrencyFormatterOptions = {}): string {
    const {
      locale = this.config.formatting.locale,
      showSymbol = this.config.display.showSymbol,
      showCode = this.config.display.showCode,
      compact = amount >= this.config.display.compactThreshold,
      precision = this.config.formatting.maximumFractionDigits,
    } = options;

    const formatOptions: Intl.NumberFormatOptions = {
      style: showSymbol ? "currency" : "decimal",
      currency: this.config.baseCurrency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    };

    if (compact) {
      formatOptions.notation = "compact";
      formatOptions.compactDisplay = "short";
    }

    const formatter = new Intl.NumberFormat(locale, formatOptions);
    let formatted = formatter.format(amount);

    if (showCode && !showSymbol) {
      formatted += ` ${this.config.baseCurrency}`;
    }

    return formatted;
  }

  /**
   * Convert cents to dollars - delegates to shared utility
   */
  convertFromCents(cents: number | null | undefined): number {
    const validCents = typeof cents === "number" ? cents : 0;
    return centsToDollars(validCents);
  }

  /**
   * Convert dollars to cents - delegates to shared utility
   */
  convertToCents(dollars: number): number {
    return dollarsToCents(dollars);
  }

  /**
   * Parse formatted currency string to number
   */
  parse(formatted: string): number {
    const cleaned = formatted.replaceAll(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Get currency symbol
   */
  getSymbol(): string {
    return (
      new Intl.NumberFormat(this.config.formatting.locale, {
        style: "currency",
        currency: this.config.baseCurrency,
      })
        .formatToParts(0)
        .find(part => part.type === "currency")?.value || "$"
    );
  }

  /**
   * Format with custom rounding
   */
  formatWithRounding(amount: number, roundingMode: "round" | "floor" | "ceil" = "round"): string {
    let roundedAmount: number;

    switch (roundingMode) {
      case "floor":
        roundedAmount = Math.floor(amount * 100) / 100;
        break;
      case "ceil":
        roundedAmount = Math.ceil(amount * 100) / 100;
        break;
      default:
        roundedAmount = Math.round(amount * 100) / 100;
    }

    return this.format(roundedAmount);
  }

  /**
   * Format percentage change
   */
  formatPercentageChange(change: number): string {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  }

  /**
   * Format compact currency (e.g., $1.2K, $1.5M)
   */
  formatCompact(amount: number): string {
    return this.format(amount, { compact: true });
  }

  /**
   * Check if amount is valid - delegates to shared utility
   */
  isValidAmount(amount: unknown): boolean {
    return isValidCurrencyAmount(amount);
  }
}

// Create singleton instance
const currencyFormatter = new CurrencyFormatter();

// ================================
// CONVENIENCE FUNCTIONS
// ================================

/**
 * Legacy function for backward compatibility
 * Formats cents to USD currency string
 */
export function formatCurrencyUSD(valueInCents: number | null | undefined): string {
  const dollars = currencyFormatter.convertFromCents(valueInCents);
  return currencyFormatter.format(dollars);
}

/**
 * Format currency amount in dollars (not cents)
 * For cents, use formatCurrencyFromCents or sharedFormatCurrency
 */
export function formatCurrency(amount: number, options?: CurrencyFormatterOptions): string {
  return currencyFormatter.format(amount, options);
}

/**
 * Format currency from cents with client-specific options
 */
export function formatCurrencyFromCents(
  cents: number | null | undefined,
  options?: CurrencyFormatterOptions
): string {
  const dollars = currencyFormatter.convertFromCents(cents);
  return currencyFormatter.format(dollars, options);
}

/**
 * Format compact currency (e.g., $1.2K, $1.5M)
 */
export function formatCompactCurrency(amount: number): string {
  return currencyFormatter.formatCompact(amount);
}

/**
 * Format percentage change with sign
 */
export function formatPercentageChange(change: number): string {
  return currencyFormatter.formatPercentageChange(change);
}

/**
 * Parse formatted currency string to number
 */
export function parseCurrency(formatted: string): number {
  return currencyFormatter.parse(formatted);
}

/**
 * Convert cents to dollars - re-exported from shared
 * @deprecated Use centsToDollars from @shared/utils/currency directly
 */
export function convertCentsToDollars(cents: number | null | undefined): number {
  return currencyFormatter.convertFromCents(cents);
}

/**
 * Convert dollars to cents - re-exported from shared
 * @deprecated Use dollarsToCents from @shared/utils/currency directly
 */
export function convertDollarsToCents(dollars: number): number {
  return currencyFormatter.convertToCents(dollars);
}

/**
 * Get currency symbol from config
 */
export function getCurrencySymbol(): string {
  return currencyFormatter.getSymbol();
}

// Export the formatter instance for advanced usage
export { currencyFormatter };
