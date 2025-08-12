import { Badge } from "@/components/ui/badge";
import { StandardHero } from "@/components/ui/StandardHero";
import { useToast } from "@/hooks/use-toast";
import { PricingTable } from "@clerk/clerk-react";
import { Download, Music, Zap } from "lucide-react";
import { Suspense, startTransition, useEffect, useState } from "react";
import { useLocation } from "wouter";

// Composant de chargement pour PricingTable
const PricingTableFallback = () => (
  <div className="max-w-4xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="bg-[var(--medium-gray)] border border-[var(--medium-gray)] rounded-xl p-6 animate-pulse"
        >
          <div className="h-8 bg-gray-600 rounded mb-4"></div>
          <div className="h-12 bg-gray-600 rounded mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="h-4 bg-gray-600 rounded"></div>
            ))}
          </div>
          <div className="h-12 bg-gray-600 rounded mt-8"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function MembershipPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isOneTimePurchase, setIsOneTimePurchase] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  // Check if user came from canceled subscription or one-time purchase
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("canceled") === "true") {
      startTransition(() => {
        toast({
          title: "Subscription Canceled",
          description: "Your subscription was canceled. You can subscribe again anytime.",
          variant: "destructive",
        });
      });
    }

    // Check if this is a one-time purchase
    const orderId = urlParams.get("orderId");
    const amount = urlParams.get("amount");
    const items = urlParams.get("items");

    if (orderId && amount && items) {
      startTransition(() => {
        setIsOneTimePurchase(true);
        setOrderDetails({
          orderId,
          amount: parseFloat(amount),
          items: JSON.parse(decodeURIComponent(items)),
        });

        toast({
          title: "Complete Your Purchase",
          description: "Please select a plan to complete your beat purchase.",
        });
      });
    }
  }, [toast]);

  const handleBillingCycleChange = (cycle: "monthly" | "yearly") => {
    startTransition(() => {
      setBillingCycle(cycle);
    });
  };

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title={isOneTimePurchase ? "Complete Your Purchase" : "Choose Your Membership"}
        subtitle={
          isOneTimePurchase
            ? "Select a plan to complete your beat purchase and get access to premium features."
            : "Get unlimited access to premium beats, exclusive licenses, and professional support. Choose the plan that fits your creative needs."
        }
      />

      {/* One-time Purchase Summary */}
      {isOneTimePurchase && orderDetails && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-[var(--medium-gray)] rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Purchase Summary</h2>
            <div className="space-y-2">
              {orderDetails.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
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
                  <span>${orderDetails.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-[var(--medium-gray)] rounded-lg p-1 flex items-center space-x-1">
            <button
              onClick={() => handleBillingCycleChange("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => handleBillingCycleChange("yearly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "yearly"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Clerk Pricing Table with Suspense */}
        <Suspense fallback={<PricingTableFallback />}>
          <div className="max-w-4xl mx-auto">
            <PricingTable
              appearance={{
                elements: {
                  pricingTable: "bg-transparent",
                  pricingTableHeader: "text-center mb-8",
                  pricingTableHeaderTitle: "text-3xl font-bold text-white mb-4",
                  pricingTableHeaderSubtitle: "text-gray-300 text-lg",
                  pricingTableGrid: "grid grid-cols-1 md:grid-cols-3 gap-8",
                  pricingTablePlan:
                    "bg-[var(--medium-gray)] border border-[var(--medium-gray)] rounded-xl p-6 hover:border-[var(--accent-purple)] transition-colors",
                  pricingTablePlanHeader: "text-center mb-6",
                  pricingTablePlanName: "text-2xl font-bold text-white mb-2",
                  pricingTablePlanDescription: "text-gray-300 text-sm",
                  pricingTablePlanPrice: "text-center mb-6",
                  pricingTablePlanPriceAmount: "text-4xl font-bold text-white",
                  pricingTablePlanPriceCurrency: "text-2xl font-bold text-white",
                  pricingTablePlanPriceInterval: "text-gray-300 text-sm",
                  pricingTablePlanFeatures: "space-y-3 mb-8",
                  pricingTablePlanFeature: "flex items-center text-gray-300",
                  pricingTablePlanFeatureIcon: "w-5 h-5 text-[var(--accent-purple)] mr-3",
                  pricingTablePlanActions: "text-center",
                  pricingTablePlanButton:
                    "w-full bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] text-white font-semibold py-3 px-6 rounded-lg transition-colors",
                  pricingTablePlanButtonSecondary:
                    "w-full bg-transparent border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors",
                  pricingTablePlanPopular: "relative",
                  pricingTablePlanPopularBadge:
                    "absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[var(--accent-purple)] text-white px-4 py-1 rounded-full text-sm font-medium",
                },
              }}
            />
          </div>
        </Suspense>

        {/* Additional Benefits Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Member Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[var(--medium-gray)] rounded-lg p-6">
              <div className="w-12 h-12 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-[var(--accent-purple)]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Unlimited Downloads</h3>
              <p className="text-gray-300">
                Download as many beats as you need for your projects, depending on your plan.
              </p>
            </div>
            <div className="bg-[var(--medium-gray)] rounded-lg p-6">
              <div className="w-12 h-12 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-6 h-6 text-[var(--accent-purple)]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Premium Licenses</h3>
              <p className="text-gray-300">
                Get exclusive licenses for commercial use and distribution rights.
              </p>
            </div>
            <div className="bg-[var(--medium-gray)] rounded-lg p-6">
              <div className="w-12 h-12 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-[var(--accent-purple)]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Priority Support</h3>
              <p className="text-gray-300">
                Get faster response times and dedicated support for your creative needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
