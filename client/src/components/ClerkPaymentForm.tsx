import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { CheckCircle, CreditCard, Lock, XCircle } from "lucide-react";
import { useState } from "react";

interface ClerkPaymentFormProps {
  amount: number;
  orderId: string;
  onSuccess: (result: any) => void;
  onError: (error: any) => void;
}

export function ClerkPaymentForm({ amount, orderId, onSuccess, onError }: ClerkPaymentFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed">(
    "idle"
  );

  const handlePayment = async () => {
    if (!user) {
      onError({ message: "User must be authenticated" });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("processing");

    try {
      // Ici, vous utiliseriez les vraies APIs de Clerk pour créer un PaymentIntent
      // Pour l'instant, nous simulons le processus

      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simuler un succès de paiement
      const paymentResult = {
        id: `pi_${Date.now()}`,
        amount: amount * 100, // Convertir en centimes
        currency: "usd",
        status: "succeeded",
        customer: user.id,
        orderId,
        created: new Date().toISOString(),
      };

      setPaymentStatus("success");
      onSuccess(paymentResult);
    } catch (error) {
      setPaymentStatus("failed");
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusContent = () => {
    switch (paymentStatus) {
      case "processing":
        return (
          <div className="space-y-4">
            <div className="animate-spin w-16 h-16 border-4 border-[var(--accent-purple)] border-t-transparent rounded-full mx-auto"></div>
            <h3 className="text-xl font-bold text-white text-center">Processing Your Payment</h3>
            <p className="text-gray-300 text-center">
              Please wait while we process your payment securely...
            </p>
          </div>
        );

      case "success":
        return (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white text-center">Payment Successful!</h3>
            <p className="text-gray-300 text-center">
              Your payment has been processed successfully.
            </p>
          </div>
        );

      case "failed":
        return (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white text-center">Payment Failed</h3>
            <p className="text-gray-300 text-center">There was an error processing your payment.</p>
            <Button onClick={handlePayment} className="btn-primary">
              Try Again
            </Button>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="p-4 border border-gray-600 rounded-lg bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-purple-400" />
                  <span className="text-white">Clerk Native Payment Gateway</span>
                </div>
                <Lock className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Your payment will be processed securely through Clerk's native payment
                infrastructure.
              </p>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-300">
                Click the button below to complete your secure payment using Clerk's native payment
                system.
              </p>

              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full btn-primary text-lg py-4"
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processing Payment...
                  </div>
                ) : (
                  `Complete Payment - $${amount.toFixed(2)}`
                )}
              </Button>

              <p className="text-gray-400 text-sm">
                You will complete your payment directly with Clerk's secure interface.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="border-gray-600 bg-gray-800/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Complete Your Payment
        </CardTitle>
      </CardHeader>
      <CardContent>{getStatusContent()}</CardContent>
    </Card>
  );
}
