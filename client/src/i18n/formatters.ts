/**
 * Locale-Aware Formatting Utilities
 * Provides date, number, and currency formatting based on user locale
 */

import type { Language } from "./translations";

type LocaleMap = Record<string, string>;
type DateInput = Date | string | number;

/**
 * Get locale string from language code
 */
export function getLocale(language: Language): string {
  const localeMap: LocaleMap = {
    en: "en-US",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE",
    ja: "ja-JP",
    zh: "zh-CN",
  };
  return localeMap[language] || "en-US";
}

/**
 * Date Formatter Class
 */
export class DateFormatter {
  private readonly locale: string;
  private readonly language: Language;

  constructor(language: Language = "en") {
    this.language = language;
    this.locale = getLocale(language);
  }

  /**
   * Format date with full details
   */
  formatFull(date: DateInput): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat(this.locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  /**
   * Format date (short format)
   */
  formatShort(date: DateInput): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat(this.locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  }

  /**
   * Format date (numeric format)
   */
  formatNumeric(date: DateInput): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat(this.locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }

  /**
   * Format time only
   */
  formatTime(date: DateInput): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat(this.locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  formatRelative(date: DateInput): string {
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return this.getRelativeText("justNow");
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return this.getRelativeText("minutesAgo", diffInMinutes);
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return this.getRelativeText("hoursAgo", diffInHours);
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return this.getRelativeText("daysAgo", diffInDays);
    }

    if (diffInDays < 30) {
      const diffInWeeks = Math.floor(diffInDays / 7);
      return this.getRelativeText("weeksAgo", diffInWeeks);
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return this.getRelativeText("monthsAgo", diffInMonths);
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return this.getRelativeText("yearsAgo", diffInYears);
  }

  /**
   * Get relative time text based on language
   */
  private getRelativeText(key: string, count?: number): string {
    const plural = (n: number | undefined) => (n === 1 ? "" : "s");
    const texts: Record<string, Record<string, string>> = {
      en: {
        justNow: "Just now",
        minutesAgo: `${count} minute${plural(count)} ago`,
        hoursAgo: `${count} hour${plural(count)} ago`,
        daysAgo: `${count} day${plural(count)} ago`,
        weeksAgo: `${count} week${plural(count)} ago`,
        monthsAgo: `${count} month${plural(count)} ago`,
        yearsAgo: `${count} year${plural(count)} ago`,
      },
      fr: {
        justNow: "À l'instant",
        minutesAgo: `Il y a ${count} minute${plural(count)}`,
        hoursAgo: `Il y a ${count} heure${plural(count)}`,
        daysAgo: `Il y a ${count} jour${plural(count)}`,
        weeksAgo: `Il y a ${count} semaine${plural(count)}`,
        monthsAgo: `Il y a ${count} mois`,
        yearsAgo: `Il y a ${count} an${plural(count)}`,
      },
      es: {
        justNow: "Justo ahora",
        minutesAgo: `Hace ${count} minuto${plural(count)}`,
        hoursAgo: `Hace ${count} hora${plural(count)}`,
        daysAgo: `Hace ${count} día${plural(count)}`,
        weeksAgo: `Hace ${count} semana${plural(count)}`,
        monthsAgo: `Hace ${count} mes${count === 1 ? "" : "es"}`,
        yearsAgo: `Hace ${count} año${plural(count)}`,
      },
      de: {
        justNow: "Gerade eben",
        minutesAgo: `Vor ${count} Minute${count === 1 ? "" : "n"}`,
        hoursAgo: `Vor ${count} Stunde${count === 1 ? "" : "n"}`,
        daysAgo: `Vor ${count} Tag${count === 1 ? "" : "en"}`,
        weeksAgo: `Vor ${count} Woche${count === 1 ? "" : "n"}`,
        monthsAgo: `Vor ${count} Monat${count === 1 ? "" : "en"}`,
        yearsAgo: `Vor ${count} Jahr${count === 1 ? "" : "en"}`,
      },
      ja: {
        justNow: "たった今",
        minutesAgo: `${count}分前`,
        hoursAgo: `${count}時間前`,
        daysAgo: `${count}日前`,
        weeksAgo: `${count}週間前`,
        monthsAgo: `${count}ヶ月前`,
        yearsAgo: `${count}年前`,
      },
      zh: {
        justNow: "刚刚",
        minutesAgo: `${count}分钟前`,
        hoursAgo: `${count}小时前`,
        daysAgo: `${count}天前`,
        weeksAgo: `${count}周前`,
        monthsAgo: `${count}个月前`,
        yearsAgo: `${count}年前`,
      },
    };

    return texts[this.language]?.[key] || texts["en"]?.[key] || key;
  }

  /**
   * Format month and year
   */
  formatMonthYear(date: DateInput): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat(this.locale, {
      year: "numeric",
      month: "long",
    }).format(d);
  }

  /**
   * Format for chart labels
   */
  formatChartLabel(date: DateInput): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat(this.locale, {
      month: "short",
      year: "2-digit",
    }).format(d);
  }
}

/**
 * Number Formatter Class
 */
export class NumberFormatter {
  private readonly locale: string;

  constructor(language: Language = "en") {
    this.locale = getLocale(language);
  }

  /**
   * Format number with locale-specific separators
   */
  format(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(value);
  }

  /**
   * Format as integer
   */
  formatInteger(value: number): string {
    return new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Format as decimal
   */
  formatDecimal(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Format as percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return new Intl.NumberFormat(this.locale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  }

  /**
   * Format as compact number (e.g., 1.2K, 1.5M)
   */
  formatCompact(value: number): string {
    return new Intl.NumberFormat(this.locale, {
      notation: "compact",
      compactDisplay: "short",
    }).format(value);
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${this.formatDecimal(size, unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }
}

/**
 * Currency Formatter Class (Always uses USD)
 */
export class LocaleCurrencyFormatter {
  private readonly locale: string;
  private readonly currency: string = "USD";

  constructor(language: Language = "en") {
    this.locale = getLocale(language);
  }

  /**
   * Format currency amount (always in dollars)
   */
  format(amount: number, options?: { showSymbol?: boolean; compact?: boolean }): string {
    const { showSymbol = true, compact = false } = options || {};

    const formatOptions: Intl.NumberFormatOptions = {
      style: showSymbol ? "currency" : "decimal",
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };

    if (compact && amount >= 1000000) {
      formatOptions.notation = "compact";
      formatOptions.compactDisplay = "short";
    }

    return new Intl.NumberFormat(this.locale, formatOptions).format(amount);
  }

  /**
   * Convert cents to dollars and format
   */
  formatFromCents(cents: number | null | undefined, options?: { showSymbol?: boolean }): string {
    const dollars = (cents || 0) / 100;
    return this.format(dollars, options);
  }

  /**
   * Get currency symbol
   */
  getSymbol(): string {
    return (
      new Intl.NumberFormat(this.locale, {
        style: "currency",
        currency: this.currency,
      })
        .formatToParts(0)
        .find(part => part.type === "currency")?.value || "$"
    );
  }

  /**
   * Format with explicit currency code
   */
  formatWithCode(amount: number): string {
    return `${this.format(amount)} ${this.currency}`;
  }
}

/**
 * Create formatters for a specific language
 */
export function createFormatters(language: Language) {
  return {
    date: new DateFormatter(language),
    number: new NumberFormatter(language),
    currency: new LocaleCurrencyFormatter(language),
  };
}

/**
 * Hook to get locale-aware formatters
 */
export function useFormatters(language: Language) {
  return createFormatters(language);
}
