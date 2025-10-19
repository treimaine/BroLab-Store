/**
 * Unified Locale Hook
 * Combines translation and formatting utilities
 */

import { useMemo } from "react";
import { createFormatters } from "./formatters";
import { useI18n } from "./useI18n";

type DateInput = Date | string | number;

/**
 * Hook that provides both translation and formatting utilities
 */
export function useLocale() {
  const {
    t,
    currentLanguage,
    changeLanguage,
    availableLanguages,
    hasTranslation,
    getLanguageName,
  } = useI18n();

  // Create formatters based on current language
  const formatters = useMemo(() => createFormatters(currentLanguage), [currentLanguage]);

  // Convenience methods
  const formatDate = useMemo(
    () => ({
      full: (date: DateInput) => formatters.date.formatFull(date),
      short: (date: DateInput) => formatters.date.formatShort(date),
      numeric: (date: DateInput) => formatters.date.formatNumeric(date),
      time: (date: DateInput) => formatters.date.formatTime(date),
      relative: (date: DateInput) => formatters.date.formatRelative(date),
      monthYear: (date: DateInput) => formatters.date.formatMonthYear(date),
      chartLabel: (date: DateInput) => formatters.date.formatChartLabel(date),
    }),
    [formatters.date]
  );

  const formatNumber = useMemo(
    () => ({
      default: (value: number) => formatters.number.format(value),
      integer: (value: number) => formatters.number.formatInteger(value),
      decimal: (value: number, decimals?: number) =>
        formatters.number.formatDecimal(value, decimals),
      percentage: (value: number, decimals?: number) =>
        formatters.number.formatPercentage(value, decimals),
      compact: (value: number) => formatters.number.formatCompact(value),
      fileSize: (bytes: number) => formatters.number.formatFileSize(bytes),
    }),
    [formatters.number]
  );

  const formatCurrency = useMemo(
    () => ({
      default: (amount: number) => formatters.currency.format(amount),
      fromCents: (cents: number | null | undefined) => formatters.currency.formatFromCents(cents),
      compact: (amount: number) => formatters.currency.format(amount, { compact: true }),
      withCode: (amount: number) => formatters.currency.formatWithCode(amount),
      symbol: () => formatters.currency.getSymbol(),
    }),
    [formatters.currency]
  );

  return {
    // Translation
    t,
    currentLanguage,
    changeLanguage,
    availableLanguages,
    hasTranslation,
    getLanguageName,

    // Formatting
    formatDate,
    formatNumber,
    formatCurrency,

    // Raw formatters for advanced usage
    formatters,
  };
}
