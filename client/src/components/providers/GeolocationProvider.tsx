/* eslint-disable react-refresh/only-export-components -- Provider pattern requires exporting both provider component and context hooks */
import React, { createContext, useContext, useEffect, useState } from "react";

interface GeolocationData {
  country: string;
  countryCode: string;
  currency: string;
  language: string;
  currencySymbol: string;
  exchangeRate: number;
  isLoading: boolean;
}

const GeolocationContext = createContext<GeolocationData>({
  country: "United States",
  countryCode: "US",
  currency: "USD",
  language: "en",
  currencySymbol: "$",
  exchangeRate: 1,
  isLoading: true,
});

const currencyMap: Record<string, { currency: string; symbol: string; language: string }> = {
  US: { currency: "USD", symbol: "$", language: "en" },
  CA: { currency: "CAD", symbol: "C$", language: "en" },
  GB: { currency: "GBP", symbol: "£", language: "en" },
  DE: { currency: "EUR", symbol: "€", language: "de" },
  FR: { currency: "EUR", symbol: "€", language: "fr" },
  ES: { currency: "EUR", symbol: "€", language: "es" },
  IT: { currency: "EUR", symbol: "€", language: "it" },
  JP: { currency: "JPY", symbol: "¥", language: "ja" },
  KR: { currency: "KRW", symbol: "₩", language: "ko" },
  CN: { currency: "CNY", symbol: "¥", language: "zh" },
  BR: { currency: "BRL", symbol: "R$", language: "pt" },
  MX: { currency: "MXN", symbol: "$", language: "es" },
  AU: { currency: "AUD", symbol: "A$", language: "en" },
  IN: { currency: "INR", symbol: "₹", language: "en" },
  RU: { currency: "RUB", symbol: "₽", language: "ru" },
};

export const GeolocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [geoData, setGeoData] = useState<GeolocationData>({
    country: "United States",
    countryCode: "US",
    currency: "USD",
    language: "en",
    currencySymbol: "$",
    exchangeRate: 1,
    isLoading: true,
  });

  useEffect(() => {
    const fetchGeolocation = async () => {
      try {
        // Get IP geolocation
        const geoResponse = await fetch("https://ipapi.co/json/");
        const geoData = await geoResponse.json();

        const countryInfo = currencyMap[geoData.country_code] || currencyMap.US;

        // Get exchange rates if not USD
        let exchangeRate = 1;
        if (countryInfo.currency !== "USD") {
          try {
            const rateResponse = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
            const rateData = await rateResponse.json();
            exchangeRate = rateData.rates[countryInfo.currency] || 1;
          } catch {
            // Fallback to USD if exchange rate fails
            countryInfo.currency = "USD";
            countryInfo.symbol = "$";
            exchangeRate = 1;
          }
        }

        setGeoData({
          country: geoData.country_name || "United States",
          countryCode: geoData.country_code || "US",
          currency: countryInfo.currency,
          language: countryInfo.language,
          currencySymbol: countryInfo.symbol,
          exchangeRate,
          isLoading: false,
        });
      } catch (error) {
        console.warn("Geolocation failed, using defaults:", error);
        setGeoData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchGeolocation();
  }, []);

  return <GeolocationContext.Provider value={geoData}>{children}</GeolocationContext.Provider>;
};

export const useGeolocation = () => useContext(GeolocationContext);

export const useConvertPrice = () => {
  const { exchangeRate, currencySymbol } = useGeolocation();

  const convertPrice = (usdPrice: number): number => {
    return Math.round(usdPrice * exchangeRate * 100) / 100;
  };

  const formatPrice = (usdPrice: number): string => {
    const convertedPrice = convertPrice(usdPrice);
    return `${currencySymbol}${convertedPrice.toFixed(2)}`;
  };

  return { convertPrice, formatPrice };
};
