import React, { Suspense, startTransition, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StandardHero } from "@/components/ui/StandardHero";
import { useToast } from "@/hooks/use-toast";
import { PricingTable, useUser } from "@clerk/clerk-react";
import { Download, Music, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { ClerkPricingTableWithFallback } from "@/components/ClerkWithFallback";

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

// Composant d'erreur Clerk
const ClerkErrorFallback = () => (
  <div className="max-w-4xl mx-auto text-center">
    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-8">
      <h3 className="text-2xl font-bold text-yellow-200 mb-4">
        Système d'abonnement temporairement indisponible
      </h3>
      <p className="text-yellow-200 mb-6">
        Nous résolvons actuellement un problème technique avec notre système d'abonnement Clerk.
        Veuillez réessayer dans quelques minutes ou nous contacter si le problème persiste.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Réessayer
      </button>
    </div>
  </div>
);

export default function MembershipPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isOneTimePurchase, setIsOneTimePurchase] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const { isLoaded, user } = useUser();
  const [clerkError, setClerkError] = useState(false);

  // Détection d'erreur Clerk
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) {
        setClerkError(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

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
              <div className="border-t border-gray-600 pt-2 flex justify-between items-center">
                <p className="text-xl font-bold text-white">Total</p>
                <p className="text-xl font-bold text-[var(--accent-purple)]">
                  ${orderDetails.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-[var(--medium-gray)] rounded-full p-1 flex items-center">
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

        {/* Clerk Pricing Table native UNIQUEMENT */}
        <div className="max-w-4xl mx-auto">
          <PricingTable />
        </div>

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