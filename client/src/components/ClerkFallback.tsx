import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

// Fallback pour les fonctionnalités Clerk quand elles ne fonctionnent pas
export function FallbackPricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "",
      description: "Users who just sign up",
      features: ["Always free"],
      popular: false
    },
    {
      name: "Basic",
      price: "$4.99",
      period: "/month",
      description: "5 beat downloads per month Basic license included MP3 format Email support Access to new releases",
      features: [
        "5 beats downloads per month",
        "Basic license included",
        "MP3 format",
        "Email support",
        "Access to new releases"
      ],
      popular: true
    },
    {
      name: "Ultimate Pass",
      price: "$25",
      period: "/month",
      description: "Unlimited beat downloads Exclusive license included All formats (WAV, MP3, STEMS) Custom beat requests Direct producer contact 24/7 priority support",
      features: [
        "Unlimited beat downloads",
        "Exclusive license included",
        "All formats (WAV, MP3, STEMS)",
        "Custom beat requests",
        "Direct producer contact",
        "24/7 priority support"
      ],
      popular: false
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h2>
        <p className="text-gray-400 text-lg">Select the perfect plan for your music production needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <Card
            key={index}
            className={`relative bg-[var(--medium-gray)] border-gray-700 ${
              plan.popular ? "ring-2 ring-[var(--accent-purple)]" : ""
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[var(--accent-purple)] text-white">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            )}
            
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-white">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-400 text-lg">{plan.period}</span>
              </div>
              <CardDescription className="text-gray-400 mt-2">
                {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full mt-8 ${
                  plan.popular
                    ? "bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/90 text-white"
                    : "bg-transparent border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
                } font-semibold py-3 px-6 rounded-lg transition-colors`}
                onClick={() => {
                  // Rediriger vers Clerk quand il sera réparé
                  window.location.href = "/sign-up";
                }}
              >
                Switch to this plan
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-8 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
        <p className="text-yellow-200">
          🚧 Les options de paiement sont temporairement indisponibles. Veuillez réessayer plus tard.
        </p>
      </div>
    </div>
  );
}

export function FallbackDashboard() {
  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
          <p className="text-gray-400">Gérez votre compte et vos téléchargements</p>
        </div>

        <div className="text-center p-8 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-yellow-200">🚧 Dashboard temporairement indisponible</h2>
          <p className="text-yellow-200 mb-4">
            Le système d'authentification est en cours de maintenance.
          </p>
          <Button
            onClick={() => window.location.href = "/"}
            className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/90 text-white"
          >
            Retourner à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}