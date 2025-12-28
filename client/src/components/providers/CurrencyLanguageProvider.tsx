import {
  COUNTRY_MAPPING,
  CurrencyLanguageContext,
  CurrencyLanguageContextType,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
} from "@/contexts/CurrencyLanguageContext";
import { storage } from "@/services/StorageManager";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IntlProvider } from "react-intl";

export const CurrencyLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<keyof typeof SUPPORTED_CURRENCIES>("USD");
  const [language, setLanguage] = useState<keyof typeof SUPPORTED_LANGUAGES>("en");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [userCountry, setUserCountry] = useState("US");

  // Auto-detect user location and set currency/language
  useEffect(() => {
    detectUserLocation();
  }, []);

  // Fetch exchange rates when currency changes
  useEffect(() => {
    const fetchRate = async (): Promise<void> => {
      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
        const data = await response.json();

        if (data.rates?.[currency]) {
          setExchangeRate(data.rates[currency]);
        } else {
          console.warn(`Exchange rate not found for ${currency}, using 1:1`);
          setExchangeRate(1);
        }
      } catch (error) {
        console.warn("Failed to fetch exchange rate:", error);
        setExchangeRate(1);
      }
    };

    if (currency === "USD") {
      setExchangeRate(1);
    } else {
      fetchRate();
    }
  }, [currency]);

  const detectUserLocation = async (): Promise<void> => {
    try {
      // Try multiple geolocation services for reliability
      const services = [
        "https://ipapi.co/json/",
        "https://api.ipify.org?format=json", // Fallback
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
        const countryCode = locationData.country_code || locationData.country || "US";
        const mapping = COUNTRY_MAPPING[countryCode] || COUNTRY_MAPPING.US;

        setUserCountry(countryCode);
        setCurrency(mapping.currency);

        // Language preference: honor stored value or default to English; do not auto-switch
        const storedLang = storage.getLanguage();
        setLanguage(
          storedLang && storedLang in SUPPORTED_LANGUAGES
            ? (storedLang as keyof typeof SUPPORTED_LANGUAGES)
            : "en"
        );

        // Save preferences to storage
        storage.setCurrency(mapping.currency);
        if (!storedLang || storedLang === "en") storage.setLanguage("en");
        storage.setCountry(countryCode);
      }
    } catch (error) {
      console.warn("Geolocation detection failed, using defaults:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrency = useCallback((newCurrency: keyof typeof SUPPORTED_CURRENCIES) => {
    setCurrency(newCurrency);
    storage.setCurrency(newCurrency);
  }, []);

  const handleSetLanguage = useCallback((newLanguage: keyof typeof SUPPORTED_LANGUAGES) => {
    setLanguage(newLanguage);
    storage.setLanguage(newLanguage);
  }, []);

  const convertPrice = useCallback(
    (usdPrice: number): number => {
      return Math.round(usdPrice * exchangeRate * 100) / 100;
    },
    [exchangeRate]
  );

  const formatPrice = useCallback(
    (usdPrice: number): string => {
      const convertedPrice = Math.round(usdPrice * exchangeRate * 100) / 100;
      const currencyConfig = SUPPORTED_CURRENCIES[currency];
      return `${currencyConfig.symbol}${convertedPrice.toFixed(2)}`;
    },
    [exchangeRate, currency]
  );

  const contextValue = useMemo<CurrencyLanguageContextType>(
    () => ({
      currency,
      language,
      exchangeRate,
      setCurrency: handleSetCurrency,
      setLanguage: handleSetLanguage,
      convertPrice,
      formatPrice,
      isLoading,
      userCountry,
    }),
    [
      currency,
      language,
      exchangeRate,
      handleSetCurrency,
      handleSetLanguage,
      convertPrice,
      formatPrice,
      isLoading,
      userCountry,
    ]
  );

  return (
    <CurrencyLanguageContext.Provider value={contextValue}>
      <IntlProvider locale={language} defaultLocale="en">
        {children}
      </IntlProvider>
    </CurrencyLanguageContext.Provider>
  );
};
