import React, { createContext, useContext, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';

// Language configurations
const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  es: { name: 'Español', flag: '🇪🇸' },
  fr: { name: 'Français', flag: '🇫🇷' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  ja: { name: '日本語', flag: '🇯🇵' },
  zh: { name: '中文', flag: '🇨🇳' }
};

// Currency configurations  
const SUPPORTED_CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  EUR: { symbol: '€', name: 'Euro', flag: '🇪🇺' },
  GBP: { symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  JPY: { symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  CNY: { symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  CHF: { symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  SEK: { symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  DKK: { symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
  PLN: { symbol: 'zł', name: 'Polish Złoty', flag: '🇵🇱' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  MXN: { symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  INR: { symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' }
};

// Country to currency/language mapping
const COUNTRY_MAPPING: Record<string, { currency: keyof typeof SUPPORTED_CURRENCIES; language: keyof typeof SUPPORTED_LANGUAGES }> = {
  US: { currency: 'USD', language: 'en' },
  CA: { currency: 'CAD', language: 'en' },
  GB: { currency: 'GBP', language: 'en' },
  DE: { currency: 'EUR', language: 'de' },
  FR: { currency: 'EUR', language: 'fr' },
  ES: { currency: 'EUR', language: 'es' },
  IT: { currency: 'EUR', language: 'en' },
  NL: { currency: 'EUR', language: 'en' },
  JP: { currency: 'JPY', language: 'ja' },
  CN: { currency: 'CNY', language: 'zh' },
  AU: { currency: 'AUD', language: 'en' },
  CH: { currency: 'CHF', language: 'en' },
  SE: { currency: 'SEK', language: 'en' },
  NO: { currency: 'NOK', language: 'en' },
  DK: { currency: 'DKK', language: 'en' },
  PL: { currency: 'PLN', language: 'en' },
  BR: { currency: 'BRL', language: 'en' },
  MX: { currency: 'MXN', language: 'es' },
  IN: { currency: 'INR', language: 'en' }
};

interface CurrencyLanguageContextType {
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

const CurrencyLanguageContext = createContext<CurrencyLanguageContextType>({
  currency: 'USD',
  language: 'en',
  exchangeRate: 1,
  setCurrency: () => {},
  setLanguage: () => {},
  convertPrice: (price) => price,
  formatPrice: (price) => `$${price.toFixed(2)}`,
  isLoading: true,
  userCountry: 'US'
});

export const CurrencyLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<keyof typeof SUPPORTED_CURRENCIES>('USD');
  const [language, setLanguageState] = useState<keyof typeof SUPPORTED_LANGUAGES>('en');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [userCountry, setUserCountry] = useState('US');

  // Auto-detect user location and set currency/language
  useEffect(() => {
    detectUserLocation();
  }, []);

  // Fetch exchange rates when currency changes
  useEffect(() => {
    if (currency !== 'USD') {
      fetchExchangeRate();
    } else {
      setExchangeRate(1);
    }
  }, [currency]);

  const detectUserLocation = async () => {
    try {
      // Try multiple geolocation services for reliability
      const services = [
        'https://ipapi.co/json/',
        'https://api.ipify.org?format=json', // Fallback
      ];

      let locationData = null;
      
      for (const service of services) {
        try {
          const response = await fetch(service);
          const data = await response.json();
          
          if (data.country_code || data.country) {
            locationData = data;
            break;
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${service}:`, error);
        }
      }

      if (locationData) {
        const countryCode = locationData.country_code || locationData.country || 'US';
        const mapping = COUNTRY_MAPPING[countryCode] || COUNTRY_MAPPING.US;
        
        setUserCountry(countryCode);
        setCurrencyState(mapping.currency);
        setLanguageState(mapping.language);
        
        // Save preferences to localStorage
        localStorage.setItem('brolab_currency', mapping.currency);
        localStorage.setItem('brolab_language', mapping.language);
        localStorage.setItem('brolab_country', countryCode);
      }
    } catch (error) {
      console.warn('Geolocation detection failed, using defaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
      const data = await response.json();
      
      if (data.rates && data.rates[currency]) {
        setExchangeRate(data.rates[currency]);
      } else {
        console.warn(`Exchange rate not found for ${currency}, using 1:1`);
        setExchangeRate(1);
      }
    } catch (error) {
      console.warn('Failed to fetch exchange rate:', error);
      setExchangeRate(1);
    }
  };

  const setCurrency = (newCurrency: keyof typeof SUPPORTED_CURRENCIES) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('brolab_currency', newCurrency);
  };

  const setLanguage = (newLanguage: keyof typeof SUPPORTED_LANGUAGES) => {
    setLanguageState(newLanguage);
    localStorage.setItem('brolab_language', newLanguage);
  };

  const convertPrice = (usdPrice: number): number => {
    return Math.round(usdPrice * exchangeRate * 100) / 100;
  };

  const formatPrice = (usdPrice: number): string => {
    const convertedPrice = convertPrice(usdPrice);
    const currencyConfig = SUPPORTED_CURRENCIES[currency];
    return `${currencyConfig.symbol}${convertedPrice.toFixed(2)}`;
  };

  const contextValue: CurrencyLanguageContextType = {
    currency,
    language,
    exchangeRate,
    setCurrency,
    setLanguage,
    convertPrice,
    formatPrice,
    isLoading,
    userCountry
  };

  return (
    <CurrencyLanguageContext.Provider value={contextValue}>
      <IntlProvider locale={language} defaultLocale="en">
        {children}
      </IntlProvider>
    </CurrencyLanguageContext.Provider>
  );
};

export const useCurrencyLanguage = () => {
  const context = useContext(CurrencyLanguageContext);
  if (!context) {
    throw new Error('useCurrencyLanguage must be used within CurrencyLanguageProvider');
  }
  return context;
};

// Currency/Language Switcher Component
export const CurrencyLanguageSwitcher: React.FC = () => {
  const { currency, language, setCurrency, setLanguage, userCountry } = useCurrencyLanguage();

  return (
    <div className="flex items-center space-x-2">
      {/* Currency Selector */}
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as keyof typeof SUPPORTED_CURRENCIES)}
        className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm"
      >
        {Object.entries(SUPPORTED_CURRENCIES).map(([code, config]) => (
          <option key={code} value={code}>
            {config.flag} {code}
          </option>
        ))}
      </select>

      {/* Language Selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as keyof typeof SUPPORTED_LANGUAGES)}
        className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm"
      >
        {Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => (
          <option key={code} value={code}>
            {config.flag} {config.name}
          </option>
        ))}
      </select>

      {/* Location Indicator */}
      <span className="text-xs text-gray-400">
        📍 {userCountry}
      </span>
    </div>
  );
};