import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { AlertCircle, CheckCircle, Lock } from "lucide-react";
import { useEffect, useState } from "react";

interface ClerkPaymentFormProps {
  readonly amount: number;
  readonly currency?: string;
  readonly metadata?: Record<string, string>;
  readonly onError: (error: string) => void;
  readonly isLoading?: boolean;
}

export function ClerkPaymentForm({
  amount,
  currency = "usd",
  metadata = {},
  onError,
  isLoading = false,
}: ClerkPaymentFormProps): JSX.Element {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>("");

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      onError("Authentication required");
      toast({
        title: "Authentication Required",
        description: "Please sign in to complete your purchase.",
        variant: "destructive",
      });
    }
  }, [isLoaded, user, onError, toast]);

  const handlePayment = async () => {
    if (!user) {
      onError("User not authenticated");
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("processing");
    setErrorDetails("");

    try {
      // Create checkout session with Stripe via Clerk
      const response = await fetch("/api/clerk/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata: {
            userId: user.id,
            userEmail: user.emailAddresses[0]?.emailAddress,
            ...metadata,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const { url, sessionId } = await response.json();

      // Redirect to Stripe checkout
      if (url) {
        // Store session info for return handling
        sessionStorage.setItem(
          "clerkCheckoutSession",
          JSON.stringify({
            sessionId,
            amount,
            metadata,
          })
        );

        // Redirect to Stripe checkout
        globalThis.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("failed");
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      setErrorDetails(errorMessage);
      onError(errorMessage);

      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-300">Loading payment system...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Authentication Required</h3>
        <p className="text-gray-300 mb-4">Please sign in to complete your purchase.</p>
        <Button
          onClick={() => (globalThis.location.href = "/login?returnTo=/checkout")}
          className="btn-primary"
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (paymentStatus === "succeeded") {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
        <p className="text-gray-300 mb-6">Your order has been processed successfully.</p>
        <Button onClick={() => (globalThis.location.href = "/dashboard")} className="btn-primary">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Security Info */}
      <div className="bg-[var(--card-bg)] p-4 rounded-lg">
        <div className="flex items-center gap-2 text-green-400 mb-2">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">Secure Payment</span>
        </div>
        <p className="text-gray-300 text-sm">
          Your payment information is encrypted and secure. Powered by Stripe via Clerk.
        </p>
      </div>

      {/* User Info */}
      <div className="bg-[var(--card-bg)] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <img src={user.imageUrl} alt="User avatar" className="w-10 h-10 rounded-full" />
          <div>
            <p className="text-white font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-gray-400 text-sm">{user.emailAddresses[0]?.emailAddress}</p>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-[var(--card-bg)] p-4 rounded-lg">
        <h4 className="text-white font-medium mb-3">Payment Summary</h4>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Total Amount</span>
          <span className="text-2xl font-bold text-white">${amount.toFixed(2)}</span>
        </div>
        <p className="text-gray-400 text-sm mt-1">Currency: {currency.toUpperCase()}</p>
      </div>

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={isProcessing || isLoading}
        className="w-full btn-primary text-lg py-4"
        data-testid="button-complete-payment"
      >
        {isProcessing || isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Processing Payment...
          </div>
        ) : (
          `Complete Payment - $${amount.toFixed(2)}`
        )}
      </Button>

      {/* Error Display */}
      {paymentStatus === "failed" && errorDetails && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium">Payment Error</span>
          </div>
          <p className="text-red-400 text-sm">{errorDetails}</p>
          <div className="mt-3 text-xs text-red-300">
            <p>• Please check your payment details and try again</p>
            <p>• If the problem persists, contact support</p>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          By completing this payment, you agree to our terms of service and privacy policy.
        </p>
        <p className="text-gray-500 text-xs mt-1">
          You will be redirected to Stripe&apos;s secure checkout page.
        </p>
      </div>
    </div>
  );
}
