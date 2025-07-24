import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useCartContext } from '@/components/cart-provider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import PayPalButton from '@/components/PayPalButton';
import { CreditCard, User, Mail, MapPin, Shield, ArrowLeft, ShoppingCart, Check } from 'lucide-react';
import { StripeCheckoutForm } from '@/components/StripeCheckoutForm';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_mock');

interface BillingInfo {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentStep {
  id: number;
  title: string;
  completed: boolean;
}

export default function EnhancedCheckout() {
  
  const { cart, clearCart } = useCartContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });

  const steps: PaymentStep[] = [
    { id: 1, title: 'Billing Information', completed: false },
    { id: 2, title: 'Payment Method', completed: false },
    { id: 3, title: 'Review & Complete', completed: false }
  ];

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.items.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Please add items before checkout.",
        variant: "destructive"
      });
      setLocation('/shop');
    }
  }, [cart.items.length]);

  // Create payment intent when moving to payment step
  useEffect(() => {
    if (currentStep === 2 && paymentMethod === 'stripe' && !clientSecret) {
      createPaymentIntent();
    }
  }, [currentStep, paymentMethod]);

  const createPaymentIntent = async () => {
    try {
      setIsProcessing(true);
      
      // Validate cart total
      if (cart.total < 29.99) {
        throw new Error('Cart total is too low. Please check your items and try again.');
      }

      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount: cart.total,
        currency: 'usd',
        metadata: {
          customerEmail: billingInfo.email,
          customerName: `${billingInfo.firstName} ${billingInfo.lastName}`,
        }
      });

      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (error: any) {
      console.error('Payment intent creation failed:', error);
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validateBillingInfo = (): boolean => {
    const required = ['email', 'firstName', 'lastName', 'address', 'city', 'state', 'zipCode'];
    for (const field of required) {
      if (!billingInfo[field as keyof BillingInfo]) {
        toast({
          title: "Missing Information",
          description: `Please fill in your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`,
          variant: "destructive"
        });
        return false;
      }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(billingInfo.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateBillingInfo()) return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleInputChange = (field: keyof BillingInfo, value: string) => {
    setBillingInfo(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentSuccess = (result: any) => {
    toast({
      title: "Payment Successful!",
      description: "Your order has been processed successfully.",
    });
    clearCart();
    setLocation('/order-confirmation');
  };

  const handlePaymentError = (error: string | Error) => {
    const errorMessage = typeof error === 'string' ? error : (error?.message || 'Payment failed');
    toast({
      title: "Payment Failed",
      description: errorMessage,
      variant: "destructive"
    });
  };

  if (cart.items.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/cart')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
            <h1 className="text-3xl font-bold">Secure Checkout</h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Shield className="w-4 h-4" />
            SSL Encrypted
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-purple-600 border-purple-600 text-white' 
                    : 'border-gray-600 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= step.id ? 'text-white' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-0.5 w-16 ${
                    currentStep > step.id ? 'bg-purple-600' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Billing Information */}
            {currentStep === 1 && (
              <Card className="border-gray-600 bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Billing Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-gray-300">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="email"
                          type="email"
                          required
                          value={billingInfo.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white pl-10"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                      <Input
                        id="firstName"
                        required
                        value={billingInfo.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
                      <Input
                        id="lastName"
                        required
                        value={billingInfo.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country" className="text-gray-300">Country *</Label>
                      <select
                        id="country"
                        value={billingInfo.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="ES">Spain</option>
                        <option value="IT">Italy</option>
                        <option value="AU">Australia</option>
                        <option value="JP">Japan</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address" className="text-gray-300">Address *</Label>
                    <Input
                      id="address"
                      required
                      value={billingInfo.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="123 Main Street"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-gray-300">City *</Label>
                      <Input
                        id="city"
                        required
                        value={billingInfo.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Los Angeles"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-gray-300">State/Province *</Label>
                      <Input
                        id="state"
                        required
                        value={billingInfo.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="CA"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode" className="text-gray-300">ZIP/Postal Code *</Label>
                      <Input
                        id="zipCode"
                        required
                        value={billingInfo.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="90210"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Payment Method */}
            {currentStep === 2 && (
              <Card className="border-gray-600 bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                    <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                      <TabsTrigger value="stripe" className="text-white">
                        Credit Card
                      </TabsTrigger>
                      <TabsTrigger value="paypal" className="text-white">
                        PayPal
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="stripe" className="space-y-4">
                      {clientSecret ? (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                          <StripeCheckoutForm
                            clientSecret={clientSecret}
                            billingInfo={billingInfo}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                          />
                        </Elements>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                          <span className="ml-2 text-gray-400">Setting up payment...</span>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="paypal" className="space-y-4">
                      <div className="p-4 bg-gray-700/50 rounded-lg">
                        <PayPalButton
                          amount={cart.total}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Review & Complete */}
            {currentStep === 3 && (
              <Card className="border-gray-600 bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Check className="w-5 h-5 mr-2" />
                    Review Your Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <div className="text-green-400 mb-4">
                      <Check className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">
                      Order Complete!
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Thank you for your purchase. You'll receive a confirmation email shortly.
                    </p>
                    <Button
                      onClick={() => setLocation('/dashboard')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      View Downloads
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            {currentStep < 3 && (
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={currentStep === 2 && paymentMethod === 'stripe' && !clientSecret}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {currentStep === 2 ? 'Review Order' : 'Continue'}
                </Button>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border-gray-600 bg-gray-800/50 sticky top-4">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{item.title}</h4>
                      <p className="text-gray-400 text-sm">
                        {item.licenseType.charAt(0).toUpperCase() + item.licenseType.slice(1)} License
                      </p>
                      <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-white font-medium">
                      ${((item.price || 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
                
                <Separator className="bg-gray-600" />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>${cart.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                  <Separator className="bg-gray-600" />
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>${cart.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3 text-center">
                  <p className="text-green-300 text-sm">
                    🔒 Secure payment protected by 256-bit SSL encryption
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}