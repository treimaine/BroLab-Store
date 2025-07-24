import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface GooglePayButtonProps {
  amount: number;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  amount,
  onSuccess,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [paymentsClient, setPaymentsClient] = useState<any>(null);

  useEffect(() => {
    const loadGooglePay = async () => {
      if (!(window as any).google?.payments?.api?.PaymentsClient) {
        // Load Google Pay API
        const script = document.createElement('script');
        script.src = 'https://pay.google.com/gp/p/js/pay.js';
        script.onload = initializeGooglePay;
        document.head.appendChild(script);
      } else {
        initializeGooglePay();
      }
    };

    const initializeGooglePay = async () => {
      try {
        const response = await apiRequest('GET', '/api/google-pay/config');
        const config = await response.json();

        const client = new (window as any).google.payments.api.PaymentsClient({
          environment: config.environment
        });

        const isReadyToPay = await client.isReadyToPay({
          allowedPaymentMethods: config.allowedPaymentMethods
        });

        if (isReadyToPay.result) {
          setPaymentsClient(client);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Google Pay initialization failed:', error);
      }
    };

    loadGooglePay();
  }, []);

  const handleGooglePay = async () => {
    if (!paymentsClient) return;

    try {
      const paymentDataRequest = {
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'stripe',
              'stripe:version': '2023-10-16',
              'stripe:publishableKey': import.meta.env.VITE_STRIPE_PUBLIC_KEY
            }
          }
        }],
        merchantInfo: {
          merchantId: process.env.GOOGLE_PAY_MERCHANT_ID || 'BCR2DN4TR2D4YRWL',
          merchantName: 'BroLab Entertainment'
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: amount.toFixed(2),
          currencyCode: 'USD',
          countryCode: 'US'
        }
      };

      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
      
      // Process payment with backend
      const response = await apiRequest('POST', '/api/google-pay/process', {
        paymentData,
        amount
      });

      const result = await response.json();
      
      if (result.success) {
        onSuccess(result);
      } else {
        onError(result.error || 'Payment failed');
      }

    } catch (error: any) {
      if (error.statusCode === 'CANCELED') {
        return; // User cancelled
      }
      onError('Google Pay failed');
    }
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Button
      onClick={handleGooglePay}
      className="w-full bg-white text-gray-800 hover:bg-gray-50 border border-gray-300 rounded-lg py-3"
    >
      <div className="flex items-center justify-center space-x-2">
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Pay</span>
      </div>
    </Button>
  );
};