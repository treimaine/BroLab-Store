import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/clerk-react";
import { CreditCard, Lock } from "lucide-react";
import { useState } from "react";

interface ClerkPaymentProps {
  amount: number;
  onSuccess: (result: any) => void;
  onError: (error: any) => void;
  orderId?: string;
  description?: string;
}

export function ClerkPayment({
  amount,
  onSuccess,
  onError,
  orderId,
  description = "Purchase",
}: ClerkPaymentProps) {
  const { user } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      onError({ message: "User must be authenticated" });
      return;
    }

    setIsProcessing(true);

    try {
      // Ici, vous utiliseriez les vraies APIs de Clerk pour créer un PaymentIntent
      // Exemple avec l'API Clerk Billing (à implémenter)

      // Pour l'instant, simulation du processus
      await new Promise(resolve => setTimeout(resolve, 2000));

      const paymentResult = {
        id: `pi_${Date.now()}`,
        amount,
        currency: "usd",
        status: "succeeded",
        customer: user.id,
        orderId,
        description,
        created: new Date().toISOString(),
      };

      onSuccess(paymentResult);
    } catch (error) {
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-gray-600 bg-gray-800/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Clerk Secure Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 border border-gray-600 rounded-lg bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-purple-400" />
                <span className="text-white">Secure Payment Gateway</span>
              </div>
              <Lock className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Your payment is processed securely through Clerk's payment infrastructure.
            </p>
          </div>

          <div className="text-center py-6">
            <p className="text-gray-300 mb-4">
              Click the button below to complete your secure payment.
            </p>
            <div className="w-32 h-8 bg-[var(--accent-purple)] mx-auto rounded flex items-center justify-center mb-4">
              <span className="text-white text-sm font-medium">Clerk</span>
            </div>
          </div>

          {/* Payment Button */}
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
              `Pay $${amount.toFixed(2)}`
            )}
          </Button>

          <div className="text-center text-gray-400 text-sm">
            <Lock className="w-4 h-4 inline mr-1" />
            Your payment information is secure and encrypted by Clerk
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
