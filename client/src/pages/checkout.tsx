import React, { useEffect, useState, useMemo } from "react";
import { useCartContext } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, CreditCard, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

// Stripe interfaces for TypeScript
interface StripeInstance {
  elements: (options?: any) => any;
  confirmPayment: (options: any) => Promise<{ error?: any; paymentIntent?: any }>;
}

// Load real Stripe.js for production payment processing
const loadStripe = async (): Promise<StripeInstance | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check if Stripe is already loaded
    if ((window as any).Stripe) {
      console.log('💳 Using existing Stripe instance');
      return (window as any).Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
    }
    
    console.log('💳 Loading Stripe.js for payment processing');
    // Load Stripe.js dynamically
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        if ((window as any).Stripe) {
          console.log('✅ Stripe.js loaded successfully');
          const stripe = (window as any).Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
          resolve(stripe);
        } else {
          reject(new Error('Stripe failed to load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Stripe script'));
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('Error loading Stripe:', error);
    return null;
  }
};

export default function Checkout() {
  const { cart, clearCart } = useCartContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [stripe, setStripe] = useState<StripeInstance | null>(null);
  const [elements, setElements] = useState<any>(null);
  const [paymentElement, setPaymentElement] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle');
  const [pendingServices, setPendingServices] = useState<any[]>([]);

  // Check for pending services from sessionStorage
  useEffect(() => {
    const storedPayment = sessionStorage.getItem('pendingPayment');
    const storedServices = sessionStorage.getItem('pendingServices');
    
    if (storedServices) {
      setPendingServices(JSON.parse(storedServices));
    } else if (storedPayment) {
      // Migration: convert single payment to services array
      const singleService = JSON.parse(storedPayment);
      setPendingServices([singleService]);
      // Update storage format
      sessionStorage.setItem('pendingServices', JSON.stringify([singleService]));
      sessionStorage.removeItem('pendingPayment');
    }
  }, []);

  // Calculate total (cumulative: services + cart items)
  const total = useMemo(() => {
    let cartTotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    let servicesTotal = pendingServices.reduce((sum, service) => {
      return sum + (service.price || 0);
    }, 0);
    
    return cartTotal + servicesTotal;
  }, [cart.items, pendingServices]);

  // Load Stripe and create payment intent
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        setIsLoading(true);
        
        // Load Stripe
        const stripeInstance = await loadStripe();
        if (!stripeInstance) {
          throw new Error('Failed to load Stripe');
        }
        setStripe(stripeInstance);

        let clientSecretToUse;

        // Always create new payment intent for combined services + cart
        {
          // Create new payment intent for cart items
          const response = await fetch('/api/payment/stripe/create-payment-intent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: total,
              currency: 'usd',
              metadata: {
                // Simplify metadata to avoid 500 char limit
                ...(pendingServices.length > 0 && {
                  services_count: pendingServices.length.toString(),
                  services_total: pendingServices.reduce((sum, s) => sum + (s.price || 0), 0).toString()
                }),
                ...(cart.items.length > 0 && {
                  cart_count: cart.items.length.toString(),
                  cart_total: cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toString()
                }),
                order_total: total.toString()
              }
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create payment intent');
          }

          const { clientSecret } = await response.json();
          clientSecretToUse = clientSecret;
          setClientSecret(clientSecret);
        }

        // Create Stripe Elements with real payment processing
        const elementsInstance = stripeInstance.elements({
          clientSecret: clientSecretToUse,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#8b5cf6',
              colorBackground: '#1a1625',
              colorText: '#ffffff',
              colorDanger: '#df1b41',
              borderRadius: '8px',
            }
          }
        });
        setElements(elementsInstance);

        // Create and mount payment element
        const paymentEl = elementsInstance.create('payment', {
          layout: 'tabs'
        });
        setPaymentElement(paymentEl);

      } catch (error) {
        console.error('Error initializing Stripe:', error);
        toast({
          title: "Payment Error",
          description: "Failed to initialize payment system. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (total > 0) {
      initializeStripe();
    }
  }, [cart.items, total, toast, pendingServices]);

  // Mount payment element when ready
  useEffect(() => {
    if (paymentElement) {
      const paymentElementContainer = document.getElementById('payment-element');
      if (paymentElementContainer) {
        paymentElement.mount('#payment-element');
      }
    }

    return () => {
      if (paymentElement) {
        paymentElement.unmount();
      }
    };
  }, [paymentElement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      toast({
        title: "Payment Error",
        description: "Payment system not ready. Please wait and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setPaymentStatus('processing');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout-success`,
        },
        redirect: 'if_required'
      });

      if (error) {
        console.error('Payment error:', error);
        setPaymentStatus('failed');
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment processing.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentStatus('succeeded');
        toast({
          title: "Payment Successful!",
          description: "Your order has been processed successfully.",
        });
        
        // Clear both cart and pending services after successful payment
        if (pendingServices.length > 0) {
          sessionStorage.removeItem('pendingServices');
          sessionStorage.removeItem('pendingPayment'); // Clean up old format too
        }
        if (cart.items.length > 0) {
          clearCart();
        }
        setLocation('/checkout-success?payment_intent=' + paymentIntent.id);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if both cart and pending services are empty
  if (cart.items.length === 0 && pendingServices.length === 0) {
    setLocation('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] py-8">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/cart')}
            className="text-gray-400 hover:text-white"
            data-testid="button-back-to-cart"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold text-white">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                Order Summary
                {pendingServices.length > 0 && cart.items.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 text-xs">
                    Services + Beats
                  </Badge>
                )}
              </h2>
              {(pendingServices.length > 0 || cart.items.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Clear all services and cart items
                    sessionStorage.removeItem('pendingServices');
                    sessionStorage.removeItem('pendingPayment');
                    setPendingServices([]);
                    clearCart();
                    toast({
                      title: "Order Cleared",
                      description: "All items have been removed from your order.",
                    });
                    setLocation('/cart');
                  }}
                  className="text-xs"
                  data-testid="button-clear-order"
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="space-y-4 mb-6">
              {/* Display all services */}
              {pendingServices.map((service, index) => (
                <div key={`service-${index}-${service.reservationId}`} className="flex items-center justify-between p-4 bg-[var(--card-bg)] rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      {service.serviceName || (
                        service.service === 'mixing' ? 'Professional Mixing' :
                        service.service === 'mastering' ? 'Audio Mastering' :
                        service.service === 'mixing_mastering' ? 'Mixing + Mastering' :
                        service.service === 'recording' ? 'Recording Session' :
                        service.service === 'consultation' ? 'Production Consultation' :
                        service.service === 'custom_beat' ? 'Custom Beat Production' :
                        'Service'
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                        Service
                      </Badge>
                      {service.serviceDetails && (
                        <span className="text-gray-400 text-sm">{service.serviceDetails}</span>
                      )}
                      <span className="text-gray-400 text-sm">• ID: {service.reservationId?.slice(-8)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">${service.price.toFixed(2)}</p>
                    <p className="text-gray-400 text-sm">Qty: {service.quantity || 1}</p>
                  </div>
                </div>
              ))}
              
              {/* Display cart items */}
              {cart.items.map((item, index) => (
                <div key={`${item.beatId}-${item.licenseType}`} className="flex items-center justify-between p-4 bg-[var(--card-bg)] rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                        {item.licenseType}
                      </Badge>
                      <span className="text-gray-400 text-sm">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6 bg-gray-600" />

            <div className="space-y-3">
              {pendingServices.length > 0 && cart.items.length > 0 && (
                <>
                  <div className="flex justify-between text-gray-300">
                    <span>Services ({pendingServices.length} item{pendingServices.length > 1 ? 's' : ''})</span>
                    <span>${pendingServices.reduce((sum, service) => sum + (service.price || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Beats ({cart.items.length} item{cart.items.length > 1 ? 's' : ''})</span>
                    <span>${cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="card-dark p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Payment Details
            </h2>

            {paymentStatus === 'succeeded' ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
                <p className="text-gray-300 mb-6">Your order has been processed successfully.</p>
                <Button onClick={() => setLocation('/dashboard')} className="btn-primary">
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {isLoading && !paymentElement ? (
                  <div className="py-8 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-300">Initializing secure payment...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-[var(--card-bg)] p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Secure Payment</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Your payment information is encrypted and secure. Powered by Stripe.
                      </p>
                    </div>

                    <div id="payment-element" className="stripe-element" data-testid="payment-element">
                      {/* Stripe Payment Element will be mounted here */}
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || !stripe || !elements || paymentStatus === 'processing'}
                      className="w-full btn-primary text-lg py-4"
                      data-testid="button-complete-payment"
                    >
                      {isLoading || paymentStatus === 'processing' ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Processing Payment...
                        </div>
                      ) : (
                        `Complete Payment - $${total.toFixed(2)}`
                      )}
                    </Button>
                  </>
                )}

                {paymentStatus === 'failed' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-center">
                      Payment failed. Please check your payment details and try again.
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}