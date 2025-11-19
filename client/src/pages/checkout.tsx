import { useCartContext } from "@/components/cart/cart-provider";
import { EnhancedPaymentForm } from "@/components/payments/EnhancedPaymentForm";
import { StandardHero } from "@/components/ui/StandardHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, CreditCard, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

// ================================
// TYPES
// ================================

interface PendingService {
  clientSecret?: string;
  service: string;
  serviceName: string;
  serviceDetails: string;
  price: number;
  quantity: number;
  reservationId: string;
}

type PaymentStatus = "idle" | "processing" | "succeeded" | "failed";

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Get display name for a service type
 */
function getServiceDisplayName(service: PendingService): string {
  if (service.serviceName) {
    return service.serviceName;
  }

  const serviceType = service.service;

  switch (serviceType) {
    case "mixing":
      return "Professional Mixing";
    case "mastering":
      return "Audio Mastering";
    case "mixing_mastering":
      return "Mixing + Mastering";
    case "recording":
      return "Recording Session";
    case "consultation":
      return "Production Consultation";
    case "custom_beat":
      return "Custom Beat Production";
    default:
      return "Service";
  }
}

/**
 * Calculate total price for services
 */
function calculateServicesTotal(services: PendingService[]): number {
  return services.reduce((sum, service) => sum + (service.price || 0), 0);
}

/**
 * Calculate total price for cart items
 */
function calculateCartTotal(items: Array<{ price?: number; quantity: number }>): number {
  return items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
}

/**
 * Format item count text
 */
function formatItemCount(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? "s" : ""}`;
}

/**
 * Create order description for payment metadata
 */
function createOrderDescription(servicesCount: number, beatsCount: number): string {
  const parts: string[] = [];

  if (servicesCount > 0) {
    parts.push(formatItemCount(servicesCount, "service"));
  }

  if (beatsCount > 0) {
    parts.push(formatItemCount(beatsCount, "beat"));
  }

  return `BroLab Purchase - ${parts.join(" ")}`.trim();
}

// ================================
// COMPONENT
// ================================

export default function Checkout() {
  const { cart, clearCart } = useCartContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [pendingServices, setPendingServices] = useState<PendingService[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isCartReady, setIsCartReady] = useState(false);

  // Wait for cart to be ready
  useEffect(() => {
    // Cart is ready when it has been initialized (even if empty)
    if (cart !== undefined) {
      setIsCartReady(true);
    }
  }, [cart]);

  // Check for pending services from sessionStorage
  useEffect(() => {
    if (!isCartReady) return;

    const storedPayment = sessionStorage.getItem("pendingPayment");
    const storedServices = sessionStorage.getItem("pendingServices");

    if (storedServices) {
      const services = JSON.parse(storedServices) as PendingService[];
      setPendingServices(services);
    } else if (storedPayment) {
      // Migration: convert single payment to services array
      const singleService = JSON.parse(storedPayment) as PendingService;
      setPendingServices([singleService]);
      // Update storage format
      sessionStorage.setItem("pendingServices", JSON.stringify([singleService]));
      sessionStorage.removeItem("pendingPayment");
    }

    // Mark data as loaded
    setIsDataLoaded(true);
  }, [isCartReady]);

  // Calculate total (cumulative: services + cart items)
  const total = useMemo(() => {
    const cartTotal = calculateCartTotal(cart.items);
    const servicesTotal = calculateServicesTotal(pendingServices);
    return cartTotal + servicesTotal;
  }, [cart.items, pendingServices]);

  // Handle successful payment
  const handlePaymentSuccess = (): void => {
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
  const handlePaymentError = (error: string): void => {
    setPaymentStatus("failed");
    toast({
      title: "Payment Error",
      description: error,
      variant: "destructive",
    });
  };

  // Redirect if both cart and pending services are empty (only after data is loaded)
  useEffect(() => {
    if (isDataLoaded && cart?.items?.length === 0 && pendingServices.length === 0) {
      setLocation("/cart");
    }
  }, [isDataLoaded, cart?.items?.length, pendingServices.length, setLocation]);

  // Debug logging
  console.log("🔍 Checkout Debug:", {
    isCartReady,
    isDataLoaded,
    cartItemsCount: cart?.items?.length || 0,
    pendingServices: pendingServices.length,
    cartItems: cart?.items || [],
  });

  // Show loading state while cart or data is loading
  if (!isCartReady || !isDataLoaded) {
    console.log("⏳ Checkout: Cart or data not ready yet", { isCartReady, isDataLoaded });
    return (
      <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--accent-purple)] mx-auto mb-4" />
          <p className="text-white text-lg">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Redirect if both cart and pending services are empty (only after data is loaded)
  if (isDataLoaded && cart?.items?.length === 0 && pendingServices.length === 0) {
    console.log("🔄 Checkout: Redirecting to cart - no items");
    return (
      <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--accent-purple)] mx-auto mb-4" />
          <p className="text-white text-lg">Redirecting to cart...</p>
        </div>
      </div>
    );
  }

  // Remove production render logging - only log in development
  if (process.env.NODE_ENV === "development") {
    console.log("✅ Checkout: Rendering checkout page");
  }

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="Checkout"
        subtitle="Your payment information is encrypted and secure. Powered by Clerk."
      />

      <div className="container mx-auto px-6 max-w-6xl py-8">
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
              {pendingServices.map(service => (
                <div
                  key={`service-${service.reservationId}`}
                  className="flex items-center justify-between p-4 bg-[var(--card-bg)] rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{getServiceDisplayName(service)}</h3>
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
              {cart.items.map(item => (
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
                    <span>Services ({formatItemCount(pendingServices.length, "item")})</span>
                    <span>${calculateServicesTotal(pendingServices).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Beats ({formatItemCount(cart.items.length, "item")})</span>
                    <span>${calculateCartTotal(cart.items).toFixed(2)}</span>
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
              <EnhancedPaymentForm
                amount={total}
                currency="usd"
                pendingServices={pendingServices}
                metadata={{
                  services_count: pendingServices.length.toString(),
                  services_total: calculateServicesTotal(pendingServices).toString(),
                  cart_count: cart.items.length.toString(),
                  cart_total: calculateCartTotal(cart.items).toString(),
                  order_total: total.toString(),
                  description: createOrderDescription(pendingServices.length, cart.items.length),
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
