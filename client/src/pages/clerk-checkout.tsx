import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardHero } from "@/components/ui/StandardHero";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/clerk-react";
import { CheckCircle, Clock, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface PaymentSession {
  sessionId: string;
  amount: number;
  service: string;
}

export default function ClerkCheckoutPage() {
  const [location] = useLocation();
  const { user } = useUser();
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract query parameters from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split("?")[1] || "");
    const sessionId = urlParams.get("session_id");
    const amount = urlParams.get("amount");
    const service = urlParams.get("service");

    if (sessionId && amount && service) {
      setPaymentSession({
        sessionId,
        amount: parseFloat(amount),
        service: decodeURIComponent(service),
      });
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--deep-black)] text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--accent-purple)]"></div>
        </div>
      </div>
    );
  }

  if (!paymentSession) {
    return (
      <div className="min-h-screen bg-[var(--deep-black)] text-white">
        <StandardHero
          title="Payment Session Not Found"
          subtitle="The requested payment session could not be found."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      <StandardHero
        title="Complete Your Payment"
        subtitle="Secure payment for your professional audio service"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SignedIn>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <Card className="card-dark">
              <CardHeader>
                <CardTitle className="text-xl text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Service:</span>
                  <span className="text-white font-medium">{paymentSession.service}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Session ID:</span>
                  <span className="text-white text-sm font-mono">{paymentSession.sessionId}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Amount:</span>
                  <span className="text-2xl font-bold text-[var(--accent-purple)]">
                    ${paymentSession.amount}
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-white">Total:</span>
                    <span className="text-2xl font-bold text-[var(--accent-purple)]">
                      ${paymentSession.amount}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-400 font-medium">What's Included:</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Professional {paymentSession.service.toLowerCase()} service with full support
                    and revisions.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card className="card-dark">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Payment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-400 font-medium">Payment Details</span>
                  </div>
                  <p className="text-blue-300 text-sm">
                    Your reservation is ready. Complete payment to secure your session.
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full bg-[var(--accent-purple)] hover:bg-purple-700 text-white py-3 text-lg font-semibold"
                    onClick={() => {
                      // Here you would integrate with Clerk's payment components
                      // For now, we'll show a success message
                      alert(
                        "Payment integration coming soon! This would open Clerk's native payment modal."
                      );
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay ${paymentSession.amount}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                    onClick={() => window.history.back()}
                  >
                    Back to Services
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-400">
                  <p>Secure payment powered by Clerk</p>
                  <p className="mt-1">Your information is protected with bank-level security</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </SignedIn>

        <SignedOut>
          <div className="text-center py-12">
            <Card className="card-dark max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CreditCard className="w-16 h-16 text-[var(--accent-purple)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Sign in to Complete Payment
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Please sign in to your account to complete your payment.
                  </p>
                  <SignInButton mode="modal">
                    <Button className="w-full bg-[var(--accent-purple)] hover:bg-purple-700 text-white">
                      Sign In to Continue
                    </Button>
                  </SignInButton>
                </div>
              </CardContent>
            </Card>
          </div>
        </SignedOut>
      </div>
    </div>
  );
}
