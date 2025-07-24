import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface PayPalButtonProps {
  amount: number;
  onSuccess: (details: any) => void;
  onError: (error: string) => void;
}

export default function PayPalButton({ amount, onSuccess, onError }: PayPalButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if PayPal SDK is loaded
    if (typeof window !== 'undefined' && (window as any).paypal) {
      renderPayPalButton();
    } else {
      // Load PayPal SDK
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test'}&currency=USD`;
      script.onload = () => renderPayPalButton();
      script.onerror = () => onError('Failed to load PayPal SDK');
      document.body.appendChild(script);
    }
  }, [amount]);

  const renderPayPalButton = () => {
    if (!paypalRef.current || !(window as any).paypal) return;

    // Clear previous button
    paypalRef.current.innerHTML = '';

    try {
      (window as any).paypal.Buttons({
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amount.toFixed(2),
                currency_code: 'USD'
              },
              description: 'Beat License Purchase'
            }]
          });
        },
        onApprove: async (data: any, actions: any) => {
          try {
            const details = await actions.order.capture();
            onSuccess(details);
          } catch (error: any) {
            console.error('PayPal capture error:', error);
            const errorMessage = typeof error === 'string' ? error : (error?.message || 'Payment capture failed');
            onError(errorMessage);
          }
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          const errorMessage = typeof err === 'string' ? err : (err?.message || 'PayPal payment failed');
          onError(errorMessage);
        },
        onCancel: () => {
          onError('Payment was cancelled');
        }
      }).render(paypalRef.current);
    } catch (error: any) {
      console.error('PayPal button render error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || 'Failed to initialize PayPal');
      onError(errorMessage);
    }
  };

  // Fallback UI if PayPal SDK fails to load
  if (typeof window !== 'undefined' && !(window as any).paypal) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading PayPal...</p>
        </div>
        <Button 
          onClick={() => onError('PayPal is not available. Please try the credit card option.')}
          variant="outline"
          className="w-full"
        >
          PayPal Not Available - Use Credit Card
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={paypalRef} className="min-h-[50px]" />
      <p className="text-center text-xs text-gray-400">
        Secure payment powered by PayPal
      </p>
    </div>
  );
}