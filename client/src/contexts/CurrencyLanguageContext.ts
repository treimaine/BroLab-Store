import { createContext } from "react";

// Language configurations
export const SUPPORTED_LANGUAGES = {
  en: { name: "English", flag: "🇺🇸" },
  es: { name: "Español", flag: "🇪🇸" },
  fr: { name: "Français", flag: "🇫🇷" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  ja: { name: "日本語", flag: "🇯🇵" },
  zh: { name: "中文", flag: "🇨🇳" },
};

// Currency configurations
export const SUPPORTED_CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  EUR: { symbol: "€", name: "Euro", flag: "🇪🇺" },
  GBP: { symbol: "£", name: "British Pound", flag: "🇬🇧" },
  JPY: { symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  CNY: { symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳" },
  CAD: { symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦" },
  AUD: { symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" },
  CHF: { symbol: "Fr", name: "Swiss Franc", flag: "🇨🇭" },
  SEK: { symbol: "kr", name: "Swedish Krona", flag: "🇸🇪" },
  NOK: { symbol: "kr", name: "Norwegian Krone", flag: "🇳🇴" },
  DKK: { symbol: "kr", name: "Danish Krone", flag: "🇩🇰" },
  PLN: { symbol: "zł", name: "Polish Złoty", flag: "🇵🇱" },
  BRL: { symbol: "R$", name: "Brazilian Real", flag: "🇧🇷" },
  MXN: { symbol: "$", name: "Mexican Peso", flag: "🇲🇽" },
  INR: { symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
};

// Country to currency/language mapping
export const COUNTRY_MAPPING: Record<
  string,
  { currency: keyof typeof SUPPORTED_CURRENCIES; language: keyof typeof SUPPORTED_LANGUAGES }
> = {
  US: { currency: "USD", language: "en" },
  CA: { currency: "CAD", language: "en" },
  GB: { currency: "GBP", language: "en" },
  DE: { currency: "EUR", language: "de" },
  FR: { currency: "EUR", language: "fr" },
  ES: { currency: "EUR", language: "es" },
  IT: { currency: "EUR", language: "en" },
  NL: { currency: "EUR", language: "en" },
  JP: { currency: "JPY", language: "ja" },
  CN: { currency: "CNY", language: "zh" },
  AU: { currency: "AUD", language: "en" },
  CH: { currency: "CHF", language: "en" },
  SE: { currency: "SEK", language: "en" },
  NO: { currency: "NOK", language: "en" },
  DK: { currency: "DKK", language: "en" },
  PL: { currency: "PLN", language: "en" },
  BR: { currency: "BRL", language: "en" },
  MX: { currency: "MXN", language: "es" },
  IN: { currency: "INR", language: "en" },
};

export interface CurrencyLanguageContextType {
  currency: keyof typeof SUPPORTED_CURRENCIES;
  language: keyof typeof SUPPORTED_LANGUAGES;
  exchangeRate: number;
  setCurrency: (currency: keyof typeof SUPPORTED_CURRENCIES) => void;
  setLanguage: (language: keyof typeof SUPPORTED_LANGUAGES) => void;
  convertPrice: (usdPrice: number) => number;
  formatPrice: (usdPrice: number) => string;
  isLoading: boolean;
  userCountry: string;
}

export const CurrencyLanguageContext = createContext<CurrencyLanguageContextType>({
  currency: "USD",
  language: "en",
  exchangeRate: 1,
  setCurrency: () => {},
  setLanguage: () => {},
  convertPrice: price => price,
  formatPrice: price => `${price.toFixed(2)}`,
  isLoading: true,
  userCountry: "US",
});
