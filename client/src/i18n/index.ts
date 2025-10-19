/**
 * Internationalization Module
 * Exports all i18n utilities and hooks
 */

export { LanguageSwitcher } from "@/components/dashboard/LanguageSwitcher";
export {
  DateFormatter,
  LocaleCurrencyFormatter,
  NumberFormatter,
  createFormatters,
  getLocale,
  useFormatters,
} from "./formatters";
export { translations, type Language, type TranslationKey } from "./translations";
export { useI18n } from "./useI18n";
export { useLocale } from "./useLocale";
