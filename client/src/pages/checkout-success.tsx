import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, Music, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentId = urlParams.get('payment_intent') || urlParams.get('payment_intent_client_secret');
    
    if (paymentIntentId) {
      // Fetch payment intent details
      fetchPaymentDetails(paymentIntentId);
    } else {
      // No payment intent ID, redirect to home
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    }
  }, [setLocation]);

  const fetchPaymentDetails = async (paymentIntentId: string) => {
    try {
      const response = await fetch(`/api/payment/stripe/payment-intent/${paymentIntentId}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentIntent(data);
        
        toast({
          title: "Payment Successful!",
          description: `Your payment of $${(data.amount / 100).toFixed(2)} has been processed.`,
        });
      } else {
        throw new Error('Failed to fetch payment details');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast({
        title: "Payment Status Unknown",
        description: "Unable to verify payment status. Please contact support if needed.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--dark-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] py-8">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">Payment Successful!</h1>
          <p className="text-xl text-gray-300">
            Thank you for your purchase. Your order has been processed successfully.
          </p>
        </div>

        {paymentIntent && (
          <Card className="card-dark mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Music className="w-6 h-6" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Payment ID:</span>
                  <p className="text-white font-mono">{paymentIntent.id || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Amount:</span>
                  <p className="text-white font-bold">
                    ${paymentIntent.amount ? (paymentIntent.amount / 100).toFixed(2) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <p className="text-green-400 font-medium capitalize">
                    {paymentIntent.status || 'Completed'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Date:</span>
                  <p className="text-white">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="card-dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Download className="w-5 h-5" />
                Your Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                Access your purchased beats and licenses in your dashboard.
              </p>
              <Button 
                onClick={() => setLocation('/dashboard')} 
                className="w-full btn-primary"
                data-testid="button-go-to-dashboard"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="card-dark">
            <CardHeader>
              <CardTitle className="text-white">What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-300 text-sm">
                • Check your email for order confirmation and receipts
              </p>
              <p className="text-gray-300 text-sm">
                • Download your beats from the dashboard
              </p>
              <p className="text-gray-300 text-sm">
                • Review license terms for each purchase
              </p>
              <p className="text-gray-300 text-sm">
                • Explore more beats in our catalog
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setLocation('/shop')} 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              data-testid="button-continue-shopping"
            >
              Continue Shopping
            </Button>
            <Button 
              onClick={() => setLocation('/')} 
              className="btn-secondary"
              data-testid="button-back-to-home"
            >
              Back to Home
            </Button>
          </div>
          
          <p className="text-gray-400 text-sm">
            Need help? Contact our support team at support@brolabentertainment.com
          </p>
        </div>
      </div>
    </div>
  );
}