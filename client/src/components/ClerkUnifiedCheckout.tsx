import { useCartContext } from "@/components/cart-provider";
import { ClerkPayment } from "@/components/ClerkPayment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { api } from "../../../convex/_generated/api";

interface ClerkUnifiedCheckoutProps {
  onSuccess?: (orderId: string) => void;
  onError?: (error: any) => void;
}

export function ClerkUnifiedCheckout({ onSuccess, onError }: ClerkUnifiedCheckoutProps) {
  const { cart, clearCart } = useCartContext();
  const { user } = useUser();
  const { toast } = useToast();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

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

  const handlePaymentSuccess = async (paymentResult: any) => {
    setIsCreatingOrder(true);

    try {
      // Créer la commande dans Convex
      const orderData = {
        items: cart.items.map(item => ({
          productId: item.beatId,
          name: item.title,
          price: item.price || 0,
          license: item.licenseType,
          quantity: item.quantity,
        })),
        total: cart.total,
        email: user?.emailAddresses[0]?.emailAddress || "",
        status: "completed",
        paymentId: paymentResult.id,
        paymentStatus: paymentResult.status,
      };

      const orderResult = await createOrderMutation(orderData);

      if (orderResult.success) {
        // Vider le panier
        clearCart();

        toast({
          title: "Payment Successful!",
          description: "Your order has been processed successfully.",
        });

        // Appeler le callback de succès
        onSuccess?.(orderResult.orderId);
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        title: "Order Creation Failed",
        description: "Payment was successful but order creation failed. Please contact support.",
        variant: "destructive",
      });
      onError?.(error);
    } finally {
      setIsCreatingOrder(false);
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

      {/* Clerk Payment Component */}
      <ClerkPayment
        amount={cart.total}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        description={`Purchase - ${cart.items.length} item(s)`}
      />
    </div>
  );
}
