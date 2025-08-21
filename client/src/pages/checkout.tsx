import { useCartContext } from "@/components/cart-provider";
import { ClerkPaymentForm } from "@/components/ClerkPaymentForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, CreditCard, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function Checkout() {
  const { cart, clearCart } = useCartContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [pendingServices, setPendingServices] = useState<any[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");

  // Check for pending services from sessionStorage
  useEffect(() => {
    const storedPayment = sessionStorage.getItem("pendingPayment");
    const storedServices = sessionStorage.getItem("pendingServices");

    if (storedServices) {
      setPendingServices(JSON.parse(storedServices));
    } else if (storedPayment) {
      // Migration: convert single payment to services array
      const singleService = JSON.parse(storedPayment);
      setPendingServices([singleService]);
      // Update storage format
      sessionStorage.setItem("pendingServices", JSON.stringify([singleService]));
      sessionStorage.removeItem("pendingPayment");
    }
  }, []);

  // Calculate total (cumulative: services + cart items)
  const total = useMemo(() => {
    let cartTotal = cart.items.reduce((sum, item) => {
      return sum + (item.price || 0) * item.quantity;
    }, 0);

    let servicesTotal = pendingServices.reduce((sum, service) => {
      return sum + (service.price || 0);
    }, 0);

    return cartTotal + servicesTotal;
  }, [cart.items, pendingServices]);

  // Handle successful payment
  const handlePaymentSuccess = (paymentData: any) => {
    setPaymentStatus("succeeded");
    toast({
      title: "Payment Successful!",
      description: "Your order has been processed successfully.",
    });

    // Clear both cart and pending services after successful payment
    if (pendingServices.length > 0) {
      sessionStorage.removeItem("pendingServices");
      sessionStorage.removeItem("pendingPayment"); // Clean up old format too
    }
    if (cart.items.length > 0) {
      clearCart();
    }

    // Redirect to success page
    setLocation("/checkout-success");
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    setPaymentStatus("failed");
    toast({
      title: "Payment Error",
      description: error,
      variant: "destructive",
    });
  };

  // Redirect if both cart and pending services are empty
  if (cart.items.length === 0 && pendingServices.length === 0) {
    setLocation("/cart");
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] py-8">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/cart")}
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
                    sessionStorage.removeItem("pendingServices");
                    sessionStorage.removeItem("pendingPayment");
                    setPendingServices([]);
                    clearCart();
                    toast({
                      title: "Order Cleared",
                      description: "All items have been removed from your order.",
                    });
                    setLocation("/cart");
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
                <div
                  key={`service-${index}-${service.reservationId}`}
                  className="flex items-center justify-between p-4 bg-[var(--card-bg)] rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      {service.serviceName ||
                        (service.service === "mixing"
                          ? "Professional Mixing"
                          : service.service === "mastering"
                            ? "Audio Mastering"
                            : service.service === "mixing_mastering"
                              ? "Mixing + Mastering"
                              : service.service === "recording"
                                ? "Recording Session"
                                : service.service === "consultation"
                                  ? "Production Consultation"
                                  : service.service === "custom_beat"
                                    ? "Custom Beat Production"
                                    : "Service")}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                        Service
                      </Badge>
                      {service.serviceDetails && (
                        <span className="text-gray-400 text-sm">{service.serviceDetails}</span>
                      )}
                      <span className="text-gray-400 text-sm">
                        • ID: {service.reservationId?.slice(-8)}
                      </span>
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
                <div
                  key={`${item.beatId}-${item.licenseType}`}
                  className="flex items-center justify-between p-4 bg-[var(--card-bg)] rounded-lg"
                >
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
                    <p className="font-bold text-white">
                      ${((item.price || 0) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6 bg-gray-600" />

            <div className="space-y-3">
              {pendingServices.length > 0 && cart.items.length > 0 && (
                <>
                  <div className="flex justify-between text-gray-300">
                    <span>
                      Services ({pendingServices.length} item{pendingServices.length > 1 ? "s" : ""}
                      )
                    </span>
                    <span>
                      $
                      {pendingServices
                        .reduce((sum, service) => sum + (service.price || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>
                      Beats ({cart.items.length} item{cart.items.length > 1 ? "s" : ""})
                    </span>
                    <span>
                      $
                      {cart.items
                        .reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
                        .toFixed(2)}
                    </span>
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

            {paymentStatus === "succeeded" ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
                <p className="text-gray-300 mb-6">Your order has been processed successfully.</p>
                <Button onClick={() => setLocation("/dashboard")} className="btn-primary">
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <ClerkPaymentForm
                amount={total}
                currency="usd"
                metadata={{
                  services_count: pendingServices.length.toString(),
                  services_total: pendingServices
                    .reduce((sum, s) => sum + (s.price || 0), 0)
                    .toString(),
                  cart_count: cart.items.length.toString(),
                  cart_total: cart.items
                    .reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
                    .toString(),
                  order_total: total.toString(),
                  description:
                    `BroLab Purchase - ${pendingServices.length > 0 ? `${pendingServices.length} service(s)` : ""} ${cart.items.length > 0 ? `${cart.items.length} beat(s)` : ""}`.trim(),
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                isLoading={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
