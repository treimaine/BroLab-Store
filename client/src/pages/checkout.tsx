import { ClerkNativeCheckout } from "@/components/ClerkNativeCheckout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Checkout() {
  const { toast } = useToast();

  const handleCheckoutSuccess = (orderId: string) => {
    // Rediriger vers la page de confirmation
    window.location.href = `/order-confirmation?orderId=${orderId}`;
  };

  const handleCheckoutError = (error: any) => {
    console.error("Checkout error:", error);
  };

  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/cart">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white">Checkout</h1>
        </div>

        {/* Native Clerk Checkout Component */}
        <ClerkNativeCheckout onSuccess={handleCheckoutSuccess} onError={handleCheckoutError} />
      </div>
    </div>
  );
}
