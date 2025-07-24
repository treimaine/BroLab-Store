import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface StripeCheckoutFormProps {
  clientSecret: string;
  billingInfo: {
    email: string;
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
  clientSecret,
  billingInfo,
  onSuccess,
  onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/order-confirmation',
          receipt_email: billingInfo.email,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Stripe payment error:', error);
        const errorMessage = typeof error.message === 'string' ? error.message : 'Payment failed';
        onError(errorMessage);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || 'An unexpected error occurred');
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: 'tabs',
          defaultValues: {
            billingDetails: {
              name: `${billingInfo.firstName} ${billingInfo.lastName}`,
              email: billingInfo.email,
              address: {
                line1: billingInfo.address,
                city: billingInfo.city,
                state: billingInfo.state,
                postal_code: billingInfo.zipCode,
                country: billingInfo.country,
              }
            }
          }
        }}
      />
      
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </div>
        ) : (
          'Complete Payment'
        )}
      </Button>
      
      <div className="text-center text-xs text-gray-400">
        Your payment information is encrypted and secure
      </div>
    </form>
  );
};