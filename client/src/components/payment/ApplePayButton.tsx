import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ApplePayButtonProps {
  amount: number;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  amount,
  onSuccess,
  onError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleApplePay = async () => {
    if (!(window as any).ApplePaySession || !(window as any).ApplePaySession.canMakePayments()) {
      onError('Apple Pay is not available on this device');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        merchantCapabilities: ['supports3DS'],
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
        total: {
          label: 'BroLab Entertainment',
          amount: amount.toFixed(2)
        }
      };

      const session = new (window as any).ApplePaySession(3, paymentRequest);

      session.onvalidatemerchant = async (event: any) => {
        try {
          const response = await apiRequest('POST', '/api/apple-pay/validate', {
            validationURL: event.validationURL
          });
          const merchantSession = await response.json();
          session.completeMerchantValidation(merchantSession);
        } catch (error) {
          session.abort();
          onError('Apple Pay validation failed');
        }
      };

      session.onpaymentauthorized = async (event: any) => {
        try {
          const response = await apiRequest('POST', '/api/apple-pay/process', {
            payment: event.payment,
            amount: amount
          });
          
          const result = await response.json();
          
          if (result.success) {
            session.completePayment((window as any).ApplePaySession.STATUS_SUCCESS);
            onSuccess(result);
          } else {
            session.completePayment((window as any).ApplePaySession.STATUS_FAILURE);
            onError(result.error || 'Payment failed');
          }
        } catch (error) {
          session.completePayment((window as any).ApplePaySession.STATUS_FAILURE);
          onError('Payment processing failed');
        }
      };

      session.begin();

    } catch (error) {
      onError('Failed to start Apple Pay session');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!(window as any).ApplePaySession || !(window as any).ApplePaySession.canMakePayments()) {
    return null;
  }

  return (
    <Button
      onClick={handleApplePay}
      disabled={isProcessing}
      className="w-full bg-black text-white hover:bg-gray-800 border border-gray-300 rounded-lg py-3"
      style={{
        background: 'linear-gradient(135deg, #000 0%, #333 100%)',
      }}
    >
      <div className="flex items-center justify-center space-x-2">
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        <span>{isProcessing ? 'Processing...' : 'Pay'}</span>
      </div>
    </Button>
  );
};