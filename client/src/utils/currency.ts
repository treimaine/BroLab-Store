/**
 * Currency Formatting Utilities
 * Always uses dollars as the base currency with configurable formatting options
 */

import { CURRENCY_CONFIG } from "@/config/dashboard";

export interface CurrencyFormatterOptions {
  locale?: string;
  showSymbol?: boolean;
  showCode?: boolean;
  compact?: boolean;
  precision?: number;
}

export class CurrencyFormatter {
  private config = CURRENCY_CONFIG;

  /**
   * Format currency amount in dollars
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
   * Convert cents to dollars
   */
  convertFromCents(cents: number | null | undefined): number {
    const validCents = typeof cents === "number" ? cents : 0;
    return validCents / this.config.conversion.centsPerDollar;
  }

  /**
   * Convert dollars to cents
   */
  convertToCents(dollars: number): number {
    return Math.round(dollars * this.config.conversion.centsPerDollar);
  }

  /**
   * Parse formatted currency string to number
   */
  parse(formatted: string): number {
    // Remove currency symbols and non-numeric characters except decimal point
    const cleaned = formatted.replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
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
   * Check if amount is valid
   */
  isValidAmount(amount: any): boolean {
    return typeof amount === "number" && !isNaN(amount) && isFinite(amount);
  }
}

// Create singleton instance
const currencyFormatter = new CurrencyFormatter();

// Legacy function for backward compatibility
export function formatCurrencyUSD(valueInCents: number | null | undefined): string {
  const dollars = currencyFormatter.convertFromCents(valueInCents);
  return currencyFormatter.format(dollars);
}

// New utility functions
export function formatCurrency(amount: number, options?: CurrencyFormatterOptions): string {
  return currencyFormatter.format(amount, options);
}

export function formatCurrencyFromCents(
  cents: number | null | undefined,
  options?: CurrencyFormatterOptions
): string {
  const dollars = currencyFormatter.convertFromCents(cents);
  return currencyFormatter.format(dollars, options);
}

export function formatCompactCurrency(amount: number): string {
  return currencyFormatter.formatCompact(amount);
}

export function formatPercentageChange(change: number): string {
  return currencyFormatter.formatPercentageChange(change);
}

export function parseCurrency(formatted: string): number {
  return currencyFormatter.parse(formatted);
}

export function convertCentsToDollars(cents: number | null | undefined): number {
  return currencyFormatter.convertFromCents(cents);
}

export function convertDollarsToCents(dollars: number): number {
  return currencyFormatter.convertToCents(dollars);
}

export function getCurrencySymbol(): string {
  return currencyFormatter.getSymbol();
}

export function isValidCurrencyAmount(amount: any): boolean {
  return currencyFormatter.isValidAmount(amount);
}

// Export the formatter instance for advanced usage
export { currencyFormatter };
