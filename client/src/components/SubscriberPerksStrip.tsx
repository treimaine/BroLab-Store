import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Crown, Download, Shield, Star, Zap } from "lucide-react";
import { Link } from "wouter";

export function SubscriberPerksStrip() {
  const perks = [
    {
      icon: Download,
      title: "Unlimited Downloads",
      description: "Access our entire catalog with no monthly limits",
      highlight: "No Limits",
    },
    {
      icon: Shield,
      title: "20% Merch Discount",
      description: "Exclusive discount on all merchandise and apparel",
      highlight: "Save 20%",
    },
    {
      icon: Clock,
      title: "Early Access",
      description: "Get first access to new releases and exclusive drops",
      highlight: "Be First",
    },
    {
      icon: Crown,
      title: "Premium Licenses",
      description: "All license types included with your subscription",
      highlight: "All Access",
    },
    {
      icon: Zap,
      title: "Producer Network",
      description: "Direct collaboration opportunities with top producers",
      highlight: "Exclusive",
    },
    {
      icon: Star,
      title: "Priority Support",
      description: "Get help faster with dedicated subscriber support",
      highlight: "VIP Support",
    },
  ];

  return (
    <div className="bg-gradient-to-r from-[var(--accent-purple)]/10 to-[var(--color-gold)]/10 border-y border-[var(--accent-purple)]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-4">Subscriber Exclusive Perks</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Unlock the full BroLab experience with benefits designed for serious creators
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {perks.map((perk, index) => {
            const Icon = perk.icon;
            return (
              <Card
                key={index}
                className="bg-[var(--medium-gray)]/50 border-[var(--accent-purple)]/30 backdrop-blur-sm"
              >
                <CardContent className="p-6 text-center">
                  <div className="relative mb-4">
                    <Icon className="w-12 h-12 text-[var(--accent-purple)] mx-auto" />
                    <Badge className="absolute -top-2 -right-2 bg-[var(--color-gold)] text-black text-xs">
                      {perk.highlight}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{perk.title}</h3>
                  <p className="text-gray-300 text-sm">{perk.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <div className="mb-6">
            <Badge className="bg-[var(--color-gold)] text-black text-lg px-4 py-2 mb-4">
              Limited Time: Save 50% with Annual Plans
            </Badge>
          </div>
          <Link href="/membership">
            <Button className="bg-gradient-to-r from-[var(--accent-purple)] to-[var(--color-gold)] text-white font-bold text-lg px-8 py-4 hover:shadow-lg hover:scale-105 transition-all">
              <Crown className="w-5 h-5 mr-2" />
              Choose Your Plan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
