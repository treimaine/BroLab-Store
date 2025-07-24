import { useState, useEffect } from 'react';

export interface GeolocationData {
  country: string;
  countryCode: string;
  currency: string;
  language: string;
  currencySymbol: string;
  exchangeRate: number;
  timezone: string;
}

const currencyMap: Record<string, { currency: string; symbol: string; language: string }> = {
  US: { currency: 'USD', symbol: '$', language: 'en' },
  CA: { currency: 'CAD', symbol: 'C$', language: 'en' },
  GB: { currency: 'GBP', symbol: '£', language: 'en' },
  DE: { currency: 'EUR', symbol: '€', language: 'de' },
  FR: { currency: 'EUR', symbol: '€', language: 'fr' },
  ES: { currency: 'EUR', symbol: '€', language: 'es' },
  IT: { currency: 'EUR', symbol: '€', language: 'it' },
  JP: { currency: 'JPY', symbol: '¥', language: 'ja' },
  KR: { currency: 'KRW', symbol: '₩', language: 'ko' },
  CN: { currency: 'CNY', symbol: '¥', language: 'zh' },
  BR: { currency: 'BRL', symbol: 'R$', language: 'pt' },
  MX: { currency: 'MXN', symbol: '$', language: 'es' },
  AU: { currency: 'AUD', symbol: 'A$', language: 'en' },
  IN: { currency: 'INR', symbol: '₹', language: 'en' },
  RU: { currency: 'RUB', symbol: '₽', language: 'ru' },
  // Add more countries as needed
};

export const useGeolocation = () => {
  const [geolocation, setGeolocation] = useState<GeolocationData>({
    country: 'United States',
    countryCode: 'US',
    currency: 'USD',
    language: 'en',
    currencySymbol: '$',
    exchangeRate: 1,
    timezone: 'America/New_York'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGeolocation = async () => {
      try {
        // Try to get IP-based geolocation
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
          throw new Error('Failed to fetch geolocation');
        }
        
        const data = await response.json();
        
        const countryInfo = currencyMap[data.country_code] || currencyMap.US;
        
        // Fetch exchange rate for non-USD currencies
        let exchangeRate = 1;
        if (countryInfo.currency !== 'USD') {
          try {
            const rateResponse = await fetch(
              `https://api.exchangerate-api.com/v4/latest/USD`
            );
            if (rateResponse.ok) {
              const rateData = await rateResponse.json();
              exchangeRate = rateData.rates[countryInfo.currency] || 1;
            }
          } catch (rateError) {
            console.warn('Failed to fetch exchange rate, using USD:', rateError);
            // Fallback to USD if exchange rate fetch fails
            countryInfo.currency = 'USD';
            countryInfo.symbol = '$';
            exchangeRate = 1;
          }
        }

        setGeolocation({
          country: data.country_name || 'United States',
          countryCode: data.country_code || 'US',
          currency: countryInfo.currency,
          language: countryInfo.language,
          currencySymbol: countryInfo.symbol,
          exchangeRate,
          timezone: data.timezone || 'America/New_York'
        });
      } catch (err) {
        console.warn('Geolocation detection failed, using US defaults:', err);
        setError('Failed to detect location');
        // Keep default US values
      } finally {
        setIsLoading(false);
      }
    };

    fetchGeolocation();
  }, []);

  const convertPrice = (usdPrice: number): number => {
    return Math.round(usdPrice * geolocation.exchangeRate * 100) / 100;
  };

  const formatPrice = (usdPrice: number): string => {
    const convertedPrice = convertPrice(usdPrice);
    return `${geolocation.currencySymbol}${convertedPrice.toFixed(2)}`;
  };

  return {
    geolocation,
    isLoading,
    error,
    convertPrice,
    formatPrice,
  };
};