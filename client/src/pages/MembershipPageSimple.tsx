import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardHero } from "@/components/ui/StandardHero";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { Check, Download, Music, Star, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { FallbackPricing } from "@/components/ClerkFallback";

export default function MembershipPage() {
  const [location] = useLocation();
  const { toast } = useToast();
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

  // Si Clerk a des erreurs, utiliser le fallback
  if (clerkError) {
    return (
      <div className="min-h-screen bg-[var(--deep-black)]">
        <StandardHero
          title="Choose Your Membership"
          subtitle="Get unlimited access to premium beats, exclusive licenses, and professional support. Choose the plan that fits your creative needs."
        />
        <FallbackPricing />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="Choose Your Membership"
        subtitle="Get unlimited access to premium beats, exclusive licenses, and professional support. Choose the plan that fits your creative needs."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-[var(--medium-gray)] rounded-full p-1 flex items-center">
            <button className="bg-[var(--accent-purple)] text-white px-6 py-2 rounded-full font-medium transition-colors">
              Monthly
            </button>
            <button className="text-gray-400 px-6 py-2 rounded-full font-medium transition-colors hover:text-white">
              Yearly
              <Badge className="ml-2 bg-green-600 text-white text-xs">Save 20%</Badge>
            </button>
          </div>
        </div>

        {/* Plans - Version simplifiée qui fonctionne */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plan Free */}
          <Card className="bg-[var(--medium-gray)] border-gray-700">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-white">Free</CardTitle>
              <CardDescription className="text-gray-400">Users who just sign up</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$0</span>
              </div>
              <p className="text-gray-400">Always free</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full bg-transparent border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                onClick={() => {
                  toast({
                    title: "Plan gratuit",
                    description: "Créez un compte pour commencer",
                  });
                }}
              >
                Switch to this plan
              </Button>
            </CardContent>
          </Card>

          {/* Plan Basic - Popular */}
          <Card className="relative bg-[var(--medium-gray)] border-gray-700 ring-2 ring-[var(--accent-purple)]">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[var(--accent-purple)] text-white">
              <Star className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
            
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-white">Basic</CardTitle>
              <CardDescription className="text-gray-400">
                5 beat downloads per month Basic license included MP3 format Email support Access to new releases
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$4.99</span>
                <span className="text-gray-400 text-lg">/month</span>
              </div>
              <p className="text-gray-400">Billed annually</p>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">5 beats downloads per month</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Basic license included</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">MP3 format</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Email support</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Access to new releases</span>
                </li>
              </ul>

              <Button
                className="w-full bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors mt-8"
                onClick={() => {
                  toast({
                    title: "Plan Basic sélectionné",
                    description: "Redirection vers le paiement...",
                  });
                }}
              >
                Switch to this plan
              </Button>
            </CardContent>
          </Card>

          {/* Plan Ultimate */}
          <Card className="bg-[var(--medium-gray)] border-gray-700">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-white">Ultimate Pass</CardTitle>
              <CardDescription className="text-gray-400">
                Unlimited beat downloads Exclusive license included All formats Custom beat requests
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$25</span>
                <span className="text-gray-400 text-lg">/month</span>
              </div>
              <Badge className="bg-blue-600 text-white">Active</Badge>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Unlimited beat downloads</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Exclusive license included</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">All formats (WAV, MP3, STEMS)</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Custom beat requests</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">24/7 priority support</span>
                </li>
              </ul>

              <Button
                className="w-full bg-transparent border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors mt-8"
                onClick={() => {
                  toast({
                    title: "Plan Ultimate sélectionné",
                    description: "Redirection vers le paiement...",
                  });
                }}
              >
                Switch to this plan
              </Button>
            </CardContent>
          </Card>
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