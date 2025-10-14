import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { AlertCircle, CheckCircle, CreditCard, Lock, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PaymentService {
  clientSecret?: string;
  service: string;
  serviceName: string;
  serviceDetails: string;
  price: number;
  quantity: number;
  reservationId: string;
}

interface EnhancedPaymentFormProps {
  readonly amount: number;
  readonly currency?: string;
  readonly metadata?: Record<string, string>;
  readonly pendingServices?: PaymentService[];
  readonly onSuccess: (paymentData: unknown) => void;
  readonly onError: (error: string) => void;
  readonly isLoading?: boolean;
}

interface PaymentError {
  message: string;
  code?: string;
  type?: "network" | "stripe" | "validation" | "authentication" | "unknown";
  retryable?: boolean;
}

export function EnhancedPaymentForm({
  amount,
  currency = "usd",
  metadata = {},
  pendingServices = [],
  onSuccess,
  onError,
  isLoading = false,
}: EnhancedPaymentFormProps) {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  type PaymentStatus = "idle" | "processing" | "succeeded" | "failed" | "retrying";
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"intent" | "session">("session");
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  const MAX_RETRY_ATTEMPTS = 3;

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  // Determine payment method based on pending services
  useEffect(() => {
    const hasPaymentIntents = pendingServices.some(service => service.clientSecret);
    setPaymentMethod(hasPaymentIntents ? "intent" : "session");
  }, [pendingServices]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      const authError: PaymentError = {
        message: "Authentication required",
        type: "authentication",
        retryable: false,
      };
      setPaymentError(authError);
      onError(authError.message);
      toast({
        title: "Authentication Required",
        description: "Please sign in to complete your purchase.",
        variant: "destructive",
      });
    }
  }, [isLoaded, user, onError, toast]);

  // Enhanced error classification
  const classifyError = useCallback((error: unknown): PaymentError => {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        message: "Network connection failed. Please check your internet connection.",
        type: "network",
        retryable: true,
      };
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("network") || message.includes("connection")) {
        return {
          message: "Network error occurred. Please try again.",
          type: "network",
          retryable: true,
        };
      }

      if (message.includes("stripe") || message.includes("payment")) {
        return {
          message: error.message,
          type: "stripe",
          retryable: true,
        };
      }

      if (message.includes("auth") || message.includes("unauthorized")) {
        return {
          message: "Authentication error. Please sign in again.",
          type: "authentication",
          retryable: false,
        };
      }

      if (message.includes("validation") || message.includes("invalid")) {
        return {
          message: error.message,
          type: "validation",
          retryable: false,
        };
      }

      return {
        message: error.message,
        type: "unknown",
        retryable: true,
      };
    }

    return {
      message: "An unexpected error occurred. Please try again.",
      type: "unknown",
      retryable: true,
    };
  }, []);

  // Reset error state
  const clearError = useCallback(() => {
    setPaymentError(null);
    setPaymentStatus("idle");
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
  }, [retryTimeout]);

  const handlePaymentIntentFlow = useCallback(async (): Promise<void> => {
    if (!user) {
      const authError: PaymentError = {
        message: "User not authenticated",
        type: "authentication",
        retryable: false,
      };
      setPaymentError(authError);
      onError(authError.message);
      return;
    }

    // For payment intent flow, we need to use Stripe Elements
    // This is a simplified version - in a real implementation, you'd use @stripe/stripe-js
    try {
      // Find the first service with a client secret
      const serviceWithIntent = pendingServices.find(service => service.clientSecret);

      if (!serviceWithIntent?.clientSecret) {
        throw new Error("No payment intent found for reservation");
      }

      // In a real implementation, you would:
      // 1. Load Stripe Elements with the client secret
      // 2. Collect payment method details
      // 3. Confirm the payment intent

      // For now, we'll simulate the payment intent confirmation
      console.log("🔄 Processing payment intent:", serviceWithIntent.clientSecret);

      // Simulate payment processing with timeout
      const processingPromise = new Promise(resolve => setTimeout(resolve, 2000));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Payment intent processing timeout")), 30000)
      );

      await Promise.race([processingPromise, timeoutPromise]);

      // Simulate successful payment
      console.log("✅ Payment intent processed successfully");
      setPaymentStatus("succeeded");
      onSuccess({
        paymentIntentId: serviceWithIntent.clientSecret,
        amount,
        currency,
        metadata,
        services: pendingServices,
      });
    } catch (error) {
      console.error("Payment intent error:", error);

      const classifiedError = classifyError(error);
      setPaymentError(classifiedError);
      setPaymentStatus("failed");
      onError(classifiedError.message);

      toast({
        title: "Payment Error",
        description: classifiedError.message,
        variant: "destructive",
      });

      throw error; // Re-throw for retry mechanism
    }
  }, [user, pendingServices, amount, currency, metadata, classifyError, onSuccess, onError, toast]);

  const handleCheckoutSessionFlow = useCallback(async (): Promise<void> => {
    if (!user) {
      const authError: PaymentError = {
        message: "User not authenticated",
        type: "authentication",
        retryable: false,
      };
      setPaymentError(authError);
      onError(authError.message);
      return;
    }

    try {
      // Create checkout session with enhanced metadata
      const enhancedMetadata = {
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress || "",
        servicesCount: pendingServices.length.toString(),
        servicesTotal: pendingServices.reduce((sum, service) => sum + service.price, 0).toString(),
        reservationIds: pendingServices.map(s => s.reservationId).join(","),
        type: pendingServices.length > 0 ? "reservation_payment" : "beats_only",
        description:
          pendingServices.length > 0
            ? `Reservation Payment: ${pendingServices.map(s => s.serviceName).join(", ")}`
            : "Beat Purchase",
        ...metadata,
      };

      console.log("🔄 Creating checkout session with metadata:", enhancedMetadata);

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("/api/clerk/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          metadata: enhancedMetadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        const error = new Error(
          errorData.message || errorData.error || `Payment service error (${response.status})`
        );
        error.name = errorData.code || "PaymentError";
        throw error;
      }

      const { url, sessionId } = await response.json();

      if (!url) {
        throw new Error("No checkout URL received from payment service");
      }

      if (!sessionId) {
        throw new Error("No session ID received from payment service");
      }

      console.log("✅ Checkout session created successfully:", sessionId);

      // Store session info for return handling
      try {
        sessionStorage.setItem(
          "clerkCheckoutSession",
          JSON.stringify({
            sessionId,
            amount,
            currency,
            metadata: enhancedMetadata,
            services: pendingServices,
            timestamp: Date.now(),
          })
        );
      } catch (storageError) {
        console.warn("Failed to store session data:", storageError);
        // Continue anyway - this is not critical
      }

      // Redirect to Stripe checkout
      console.log("🔄 Redirecting to Stripe checkout:", url);
      window.location.href = url;
    } catch (error) {
      console.error("Checkout session error:", error);

      const classifiedError = classifyError(error);
      setPaymentError(classifiedError);
      setPaymentStatus("failed");
      onError(classifiedError.message);

      toast({
        title: "Payment Error",
        description: classifiedError.message,
        variant: "destructive",
      });

      throw error; // Re-throw for retry mechanism
    }
  }, [user, amount, currency, metadata, pendingServices, classifyError, onError, toast]);

  // Retry mechanism with exponential backoff
  const retryPayment = useCallback(
    async (attemptNumber: number): Promise<void> => {
      if (attemptNumber >= MAX_RETRY_ATTEMPTS) {
        setPaymentStatus("failed");
        setIsProcessing(false);
        return;
      }

      const RETRY_DELAYS = [1000, 2000, 4000]; // Progressive delays in ms
      const delay = RETRY_DELAYS[attemptNumber] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

      setPaymentStatus("retrying");
      setRetryCount(attemptNumber + 1);

      const timeout = setTimeout(async () => {
        try {
          console.log(`🔄 Retry attempt ${attemptNumber + 1}/${MAX_RETRY_ATTEMPTS}`);

          if (paymentMethod === "intent") {
            await handlePaymentIntentFlow();
          } else {
            await handleCheckoutSessionFlow();
          }

          // If we get here, payment succeeded
          setRetryCount(0);
          setPaymentError(null);
        } catch (error) {
          console.error(`❌ Retry attempt ${attemptNumber + 1} failed:`, error);

          const classifiedError = classifyError(error);

          if (classifiedError.retryable && attemptNumber < MAX_RETRY_ATTEMPTS - 1) {
            await retryPayment(attemptNumber + 1);
          } else {
            setPaymentStatus("failed");
            setPaymentError(classifiedError);
            setIsProcessing(false);

            toast({
              title: "Payment Failed",
              description: `${classifiedError.message} ${!classifiedError.retryable ? "(Not retryable)" : ""}`,
              variant: "destructive",
            });
          }
        }
      }, delay);

      setRetryTimeout(timeout);
    },
    [paymentMethod, classifyError, toast, handlePaymentIntentFlow, handleCheckoutSessionFlow]
  );

  const handlePayment = async (): Promise<void> => {
    if (isProcessing) return;

    setIsProcessing(true);
    setPaymentStatus("processing");
    setPaymentError(null);
    setRetryCount(0);

    try {
      if (paymentMethod === "intent") {
        await handlePaymentIntentFlow();
      } else {
        await handleCheckoutSessionFlow();
      }

      // If we get here, payment succeeded
      setPaymentError(null);
    } catch (error) {
      console.error("Initial payment attempt failed:", error);

      const classifiedError = classifyError(error);

      if (classifiedError.retryable) {
        console.log("🔄 Error is retryable, starting retry mechanism");
        await retryPayment(0);
      } else {
        console.log("❌ Error is not retryable");
        setPaymentStatus("failed");
        setPaymentError(classifiedError);
        setIsProcessing(false);

        toast({
          title: "Payment Failed",
          description: `${classifiedError.message} (Not retryable)`,
          variant: "destructive",
        });
      }
    }
  };

  // Manual retry function for user-initiated retries
  const handleManualRetry = useCallback((): void => {
    clearError();
    setRetryCount(0);
    // Trigger payment directly without circular dependency
    setIsProcessing(true);
    setPaymentStatus("processing");
    setPaymentError(null);

    // Start the payment process
    (async () => {
      try {
        if (paymentMethod === "intent") {
          await handlePaymentIntentFlow();
        } else {
          await handleCheckoutSessionFlow();
        }
        setPaymentError(null);
      } catch (error) {
        const classifiedError = classifyError(error);
        if (classifiedError.retryable) {
          await retryPayment(0);
        } else {
          setPaymentStatus("failed");
          setPaymentError(classifiedError);
          setIsProcessing(false);
          toast({
            title: "Payment Failed",
            description: `${classifiedError.message} (Not retryable)`,
            variant: "destructive",
          });
        }
      }
    })();
  }, [
    clearError,
    paymentMethod,
    handlePaymentIntentFlow,
    handleCheckoutSessionFlow,
    classifyError,
    retryPayment,
    toast,
  ]);

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
        <Button onClick={() => (window.location.href = "/sign-in")} className="btn-primary">
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
        <Button onClick={() => (window.location.href = "/dashboard")} className="btn-primary">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // Enhanced loading state for retrying
  if (paymentStatus === "retrying") {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Retrying Payment...</h3>
        <p className="text-gray-300 mb-2">
          Attempt {retryCount} of {MAX_RETRY_ATTEMPTS}
        </p>
        <p className="text-gray-400 text-sm">Please wait while we retry your payment request.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Method Info */}
      <div className="bg-[var(--card-bg)] p-4 rounded-lg">
        <div className="flex items-center gap-2 text-blue-400 mb-2">
          <CreditCard className="w-4 h-4" />
          <span className="text-sm font-medium">
            Payment Method: {paymentMethod === "intent" ? "Direct Payment" : "Secure Checkout"}
          </span>
        </div>
        <p className="text-gray-300 text-sm">
          {paymentMethod === "intent"
            ? "Processing your reservation payment directly"
            : "You will be redirected to Stripe&apos;s secure checkout page"}
        </p>
      </div>

      {/* Payment Security Info */}
      <div className="bg-[var(--card-bg)] p-4 rounded-lg">
        <div className="flex items-center gap-2 text-green-400 mb-2">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">Secure Payment</span>
        </div>
        <p className="text-gray-300 text-sm">
          Your payment information is encrypted and secure. Powered by Stripe.
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

      {/* Services Summary */}
      {pendingServices.length > 0 && (
        <div className="bg-[var(--card-bg)] p-4 rounded-lg">
          <h4 className="text-white font-medium mb-3">Services Included</h4>
          <div className="space-y-2">
            {pendingServices.map(service => (
              <div
                key={service.reservationId}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-300">{service.serviceName}</span>
                <span className="text-white font-medium">${service.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
        disabled={isProcessing || isLoading || (paymentStatus as PaymentStatus) === "retrying"}
        className="w-full btn-primary text-lg py-4"
        data-testid="button-complete-payment"
      >
        {isProcessing || isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            {(paymentStatus as PaymentStatus) === "retrying"
              ? `Retrying... (${retryCount}/${MAX_RETRY_ATTEMPTS})`
              : "Processing Payment..."}
          </div>
        ) : (
          `Complete Payment - $${amount.toFixed(2)}`
        )}
      </Button>

      {/* Enhanced Error Display */}
      {paymentStatus === "failed" && paymentError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium">
              Payment Error {paymentError.type && `(${paymentError.type})`}
            </span>
          </div>
          <p className="text-red-400 text-sm mb-3">{paymentError.message}</p>

          {/* Error-specific guidance */}
          <div className="text-xs text-red-300 space-y-1">
            {paymentError.type === "network" && (
              <>
                <p>• Check your internet connection</p>
                <p>• Try refreshing the page</p>
              </>
            )}
            {paymentError.type === "stripe" && (
              <>
                <p>• Verify your payment details</p>
                <p>• Try a different payment method</p>
              </>
            )}
            {paymentError.type === "authentication" && (
              <>
                <p>• Please sign in again</p>
                <p>• Clear your browser cache if needed</p>
              </>
            )}
            {paymentError.type === "validation" && (
              <>
                <p>• Check all required fields</p>
                <p>• Verify the payment amount</p>
              </>
            )}
            <p>• Contact support if the problem persists</p>
          </div>

          {/* Retry button for retryable errors */}
          {paymentError.retryable && (
            <div className="mt-4">
              <Button
                onClick={handleManualRetry}
                variant="outline"
                size="sm"
                className="text-red-400 border-red-400 hover:bg-red-400/10"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Additional Info */}
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          By completing this payment, you agree to our terms of service and privacy policy.
        </p>
        {paymentMethod === "session" && (
          <p className="text-gray-500 text-xs mt-1">
            You will be redirected to Stripe&apos;s secure checkout page.
          </p>
        )}
      </div>
    </div>
  );
}
