import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ApplePayButton } from './ApplePayButton';
import { GooglePayButton } from './GooglePayButton';
import { PaymentPlanSelector } from './PaymentPlanSelector';
import { CreditCard, Smartphone, Calculator, Receipt } from 'lucide-react';

interface TaxInfo {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxName: string | null;
  shouldChargeTax: boolean;
}

interface EnhancedCheckoutFormProps {
  clientSecret: string;
  cartTotal: number;
  onSuccess: (result: any) => void;
}

export const EnhancedCheckoutForm: React.FC<EnhancedCheckoutFormProps> = ({
  clientSecret,
  cartTotal,
  onSuccess
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('card');
  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [taxInfo, setTaxInfo] = useState<TaxInfo | null>(null);
  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  });

  // Calculate tax on mount and when billing address changes
  useEffect(() => {
    calculateTax();
  }, [billingAddress, cartTotal]);

  const calculateTax = async () => {
    try {
      const response = await apiRequest('POST', '/api/tax/calculate', {
        amount: paymentPlan ? paymentPlan.totalAmount : cartTotal,
        customerLocation: {
          country: billingAddress.country,
          state: billingAddress.state,
          postalCode: billingAddress.postal_code
        },
        productType: 'digital',
        businessLocation: 'US-CA'
      });

      const tax = await response.json();
      setTaxInfo(tax);
    } catch (error) {
      console.error('Tax calculation failed:', error);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const finalAmount = taxInfo ? taxInfo.total : (paymentPlan ? paymentPlan.totalAmount : cartTotal);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/order-confirmation',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent?.status === 'succeeded') {
        // Generate invoice
        await generateInvoice(paymentIntent.id, finalAmount);
        onSuccess(paymentIntent);
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateInvoice = async (transactionId: string, amount: number) => {
    try {
      await apiRequest('POST', '/api/invoice/generate', {
        customerEmail: 'customer@example.com', // Get from user context
        customerName: 'Customer Name', // Get from user context
        items: [
          {
            name: 'Beat License',
            quantity: 1,
            price: amount,
            total: amount
          }
        ],
        subtotal: taxInfo?.subtotal || amount,
        tax: taxInfo?.taxAmount || 0,
        total: amount,
        paymentMethod: 'Credit Card',
        transactionId,
        billingAddress
      });
    } catch (error) {
      console.error('Invoice generation failed:', error);
    }
  };

  const handleApplePaySuccess = (result: any) => {
    toast({
      title: "Payment Successful",
      description: "Your purchase was completed with Apple Pay!",
    });
    onSuccess(result);
  };

  const handleGooglePaySuccess = (result: any) => {
    toast({
      title: "Payment Successful", 
      description: "Your purchase was completed with Google Pay!",
    });
    onSuccess(result);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  const finalTotal = taxInfo ? taxInfo.total : (paymentPlan ? paymentPlan.totalAmount : cartTotal);

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-gray-300">
            <span>Subtotal</span>
            <span>${(taxInfo?.subtotal || cartTotal).toFixed(2)}</span>
          </div>
          {paymentPlan && (
            <div className="flex justify-between text-orange-400">
              <span>Payment Plan Interest</span>
              <span>+${paymentPlan.interestAmount.toFixed(2)}</span>
            </div>
          )}
          {taxInfo?.shouldChargeTax && (
            <div className="flex justify-between text-gray-300">
              <span>{taxInfo.taxName}</span>
              <span>${taxInfo.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <hr className="border-gray-600" />
          <div className="flex justify-between text-white font-semibold text-lg">
            <span>Total</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Plan Selector */}
      <PaymentPlanSelector
        totalAmount={cartTotal}
        onPlanSelected={setPaymentPlan}
      />

      {/* Billing Address */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Billing Address (for tax calculation)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country" className="text-gray-300">Country</Label>
              <Input
                id="country"
                value={billingAddress.country}
                onChange={(e) => setBillingAddress(prev => ({ ...prev, country: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="US"
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-gray-300">State</Label>
              <Input
                id="state"
                value={billingAddress.state}
                onChange={(e) => setBillingAddress(prev => ({ ...prev, state: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="CA"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-700">
              <TabsTrigger value="card" className="text-white">
                <CreditCard className="w-4 h-4 mr-2" />
                Card
              </TabsTrigger>
              <TabsTrigger value="digital" className="text-white">
                <Smartphone className="w-4 h-4 mr-2" />
                Digital Wallets
              </TabsTrigger>
              <TabsTrigger value="crypto" className="text-white">
                <Calculator className="w-4 h-4 mr-2" />
                Crypto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-4">
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <PaymentElement />
                  <Button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      `Pay $${finalTotal.toFixed(2)}`
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="digital" className="space-y-4">
              <div className="space-y-3">
                <ApplePayButton
                  amount={finalTotal}
                  onSuccess={handleApplePaySuccess}
                  onError={handlePaymentError}
                />
                <GooglePayButton
                  amount={finalTotal}
                  onSuccess={handleGooglePaySuccess}
                  onError={handlePaymentError}
                />
              </div>
            </TabsContent>

            <TabsContent value="crypto" className="space-y-4">
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Cryptocurrency payments coming soon!</p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('card')}
                  className="border-gray-600 text-gray-300"
                >
                  Use Card Payment Instead
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};