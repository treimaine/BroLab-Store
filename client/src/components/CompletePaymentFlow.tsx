import { useCartContext } from "@/components/cart-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Download,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface PaymentStep {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "error";
  description: string;
}

export const CompletePaymentFlow: React.FC = () => {
  const { cart, clearCart } = useCartContext();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const [steps, setSteps] = useState<PaymentStep[]>([
    {
      id: "validation",
      title: "Cart Validation",
      status: "pending",
      description: "Validating cart items and pricing",
    },
    {
      id: "tax",
      title: "Tax Calculation",
      status: "pending",
      description: "Calculating taxes based on location",
    },
    {
      id: "payment",
      title: "Payment Processing",
      status: "pending",
      description: "Processing payment with Stripe",
    },
    {
      id: "invoice",
      title: "Invoice Generation",
      status: "pending",
      description: "Generating invoice and receipt",
    },
    {
      id: "download",
      title: "Download Preparation",
      status: "pending",
      description: "Preparing download links",
    },
  ]);

  const updateStepStatus = (stepId: string, status: PaymentStep["status"]) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
  };

  const processCompletePaymentFlow = async () => {
    if (cart.items.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep(0);

    try {
      // Step 1: Cart Validation
      updateStepStatus("validation", "processing");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check for pricing issues
      const hasInvalidPricing = cart.items.some(
        (item) => (item.price ?? 0) < 29.99
      );
      if (hasInvalidPricing) {
        updateStepStatus("validation", "error");
        throw new Error(
          "Invalid pricing detected in cart. Please reset cart and try again."
        );
      }

      updateStepStatus("validation", "completed");
      setCurrentStep(1);

      // Step 2: Tax Calculation
      updateStepStatus("tax", "processing");
      await new Promise((resolve) => setTimeout(resolve, 800));

      const taxResponse = await fetch("/api/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cart.total,
          customerLocation: { country: "US", state: "CA" },
          productType: "digital",
          businessLocation: "US-CA",
        }),
      });

      const taxData = await taxResponse.json();
      updateStepStatus("tax", "completed");
      setCurrentStep(2);

      // Step 3: Payment Processing
      updateStepStatus("payment", "processing");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const paymentResponse = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: taxData.total || cart.total,
          currency: "usd",
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error("Payment processing failed");
      }

      const paymentData = await paymentResponse.json();
      updateStepStatus("payment", "completed");
      setCurrentStep(3);

      // Step 4: Invoice Generation
      updateStepStatus("invoice", "processing");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const invoiceResponse = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: "customer@example.com",
          customerName: "Test Customer",
          items: cart.items.map((item) => ({
            name: `${item.title} - ${item.licenseType} License`,
            quantity: item.quantity,
            price: item.price,
            total: (item.price ?? 0) * item.quantity,
          })),
          subtotal: cart.total,
          tax: taxData.taxAmount || 0,
          total: taxData.total || cart.total,
          paymentMethod: "Credit Card",
          transactionId: paymentData.paymentIntent?.id || "test_transaction",
        }),
      });

      updateStepStatus("invoice", "completed");
      setCurrentStep(4);

      // Step 5: Download Preparation
      updateStepStatus("download", "processing");
      await new Promise((resolve) => setTimeout(resolve, 800));

      updateStepStatus("download", "completed");

      setPaymentResult({
        success: true,
        invoiceNumber: "INV-" + Date.now(),
        downloadLinks: cart.items.map((item) => ({
          title: item.title,
          license: item.licenseType,
          downloadUrl: "/api/placeholder/audio.mp3",
        })),
      });

      toast({
        title: "Payment Successful!",
        description: "Your order has been processed successfully.",
      });
    } catch (error: any) {
      console.error("Payment flow error:", error);

      // Mark current step as error
      const currentStepId = steps[currentStep]?.id;
      if (currentStepId) {
        updateStepStatus(currentStepId, "error");
      }

      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepIcon = (step: PaymentStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "processing":
        return (
          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Complete Payment Flow Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cart Summary */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Cart Summary</h3>
            {cart.items.length === 0 ? (
              <p className="text-gray-400">No items in cart</p>
            ) : (
              <div className="space-y-2">
                {cart.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-300">
                      {item.title} - {item.licenseType} License
                    </span>
                    <span className="text-white">
                      ${(item.price ?? 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <hr className="border-gray-600" />
                <div className="flex justify-between font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-purple-400">
                    ${cart.total.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Steps */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Payment Process</h3>
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                {getStepIcon(step)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-medium ${
                        step.status === "completed"
                          ? "text-green-400"
                          : step.status === "error"
                          ? "text-red-400"
                          : step.status === "processing"
                          ? "text-purple-400"
                          : "text-gray-400"
                      }`}
                    >
                      {step.title}
                    </span>
                    {step.status === "processing" && (
                      <span className="text-xs text-purple-400">
                        Processing...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={processCompletePaymentFlow}
              disabled={isProcessing || cart.items.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isProcessing ? "Processing..." : "Test Complete Payment Flow"}
            </Button>

            <Button
              onClick={() => {
                // Reset cart with valid pricing
                clearCart();
                const testItem = {
                  beatId: 919,
                  title: "AURORA Vol.1",
                  artist: "BroLab",
                  licenseType: "premium" as const,
                  quantity: 1,
                };
                // Add test item with proper cart manager
                const { addToCart } = useCartContext();
                addToCart({
                  beatId: testItem.beatId,
                  title: testItem.title,
                  genre: testItem.artist ?? "",
                  imageUrl: undefined,
                  licenseType: "premium",
                  quantity: 1,
                });
                toast({
                  title: "Cart Reset",
                  description: "Added test item with correct pricing",
                });
              }}
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Reset & Add Test Item
            </Button>
          </div>

          {/* Results */}
          {paymentResult && (
            <Alert className="bg-green-900/20 border-green-600">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription className="text-green-300">
                <div className="space-y-2">
                  <p>Payment completed successfully!</p>
                  <p>
                    <strong>Invoice:</strong> {paymentResult.invoiceNumber}
                  </p>
                  <div className="space-y-1">
                    <p>
                      <strong>Downloads:</strong>
                    </p>
                    {paymentResult.downloadLinks?.map(
                      (link: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-green-800/20 p-2 rounded"
                        >
                          <span>
                            {link.title} - {link.license}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-300"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Pricing Issue Warning */}
          {cart.items.some((item) => (item.price ?? 0) < 29.99) && (
            <Alert className="bg-red-900/20 border-red-600">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-red-300">
                Warning: Cart contains items with invalid pricing. Use "Reset &
                Add Test Item" to fix this.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
