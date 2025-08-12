import { useCartContext } from "@/components/cart-provider";
import { ClerkPaymentForm } from "@/components/ClerkPaymentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { CreditCard, Lock, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { api } from "../../../convex/_generated/api";

interface ClerkNativeCheckoutProps {
  onSuccess?: (orderId: string) => void;
  onError?: (error: any) => void;
}

export function ClerkNativeCheckout({ onSuccess, onError }: ClerkNativeCheckoutProps) {
  const { cart, clearCart } = useCartContext();
  const { user } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [orderId, setOrderId] = useState<string>("");

  const createOrderMutation = useMutation(api.orders.createOrder);

  if (cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Your Cart is Empty</h3>
        <p className="text-gray-400 mb-6">Add some beats to your cart to get started.</p>
        <Link href="/shop">
          <Button className="btn-primary">Browse Beats</Button>
        </Link>
      </div>
    );
  }

  const handleStartPayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete your purchase",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Créer la commande dans Convex d'abord
      const orderData = {
        items: cart.items.map(item => ({
          productId: item.beatId,
          name: item.title,
          price: item.price || 0,
          license: item.licenseType,
          quantity: item.quantity,
        })),
        total: cart.total,
        email: user.emailAddresses[0]?.emailAddress || "",
        status: "pending",
      };

      const orderResult = await createOrderMutation(orderData);

      if (orderResult.success) {
        // Afficher le formulaire de paiement natif Clerk
        setOrderId(orderResult.orderId);
        setShowPaymentForm(true);
        setIsProcessing(false);
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description:
          error instanceof Error
            ? error.message
            : "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
      onError?.(error);
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult: any) => {
    try {
      // Vider le panier
      clearCart();

      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed successfully.",
      });

      // Rediriger vers la confirmation
      window.location.href = `/order-confirmation?orderId=${orderId}&status=success`;
    } catch (error) {
      console.error("Order update error:", error);
      toast({
        title: "Order Update Failed",
        description: "Payment was successful but order update failed. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentError = (error: any) => {
    console.error("Payment error:", error);
    toast({
      title: "Payment Failed",
      description: error.message || "There was an error processing your payment. Please try again.",
      variant: "destructive",
    });
    onError?.(error);
  };

  if (showPaymentForm) {
    return (
      <div className="space-y-6">
        {/* Order Summary */}
        <Card className="border-gray-600 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.items.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-2 border-b border-gray-600"
              >
                <div>
                  <p className="text-white font-medium">{item.title}</p>
                  <p className="text-gray-400 text-sm">{item.licenseType} License</p>
                </div>
                <p className="text-white font-bold">${(item.price || 0).toFixed(2)}</p>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-600">
              <div className="flex justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Native Clerk Payment Form */}
        <ClerkPaymentForm
          amount={cart.total}
          orderId={orderId}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.items.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b border-gray-600"
            >
              <div>
                <p className="text-white font-medium">{item.title}</p>
                <p className="text-gray-400 text-sm">{item.licenseType} License</p>
              </div>
              <p className="text-white font-bold">${(item.price || 0).toFixed(2)}</p>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-600">
            <div className="flex justify-between text-xl font-bold text-white">
              <span>Total</span>
              <span>${cart.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      {user && (
        <Card className="border-gray-600 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-white">
                <span className="text-gray-400">Email:</span> {user.emailAddresses[0]?.emailAddress}
              </p>
              <p className="text-white">
                <span className="text-gray-400">Name:</span> {user.fullName || "Not provided"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Native Clerk Payment Button */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Secure Payment with Clerk
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                Click the button below to proceed with your secure payment using Clerk's native
                payment system.
              </p>

              <Button
                onClick={handleStartPayment}
                disabled={isProcessing}
                className="w-full btn-primary text-lg py-4"
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processing...
                  </div>
                ) : (
                  `Pay $${cart.total.toFixed(2)} with Clerk`
                )}
              </Button>

              <p className="text-gray-400 text-sm">
                You will complete your payment directly with Clerk's secure interface.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
