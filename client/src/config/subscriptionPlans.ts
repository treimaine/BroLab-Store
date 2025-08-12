export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  // stripePriceIdMonthly: string; // Removed - using Clerk for billing
  // stripePriceIdAnnual: string; // Removed - using Clerk for billing
  features: string[];
  popular?: boolean;
  maxDownloads: number;
  commercialUse: boolean;
  exclusiveBeats?: boolean;
  priority?: "standard" | "high" | "exclusive";
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Perfect for hobbyists and beginning artists",
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    // stripePriceIdMonthly: 'price_basic_monthly', // Removed - using Clerk for billing
    // stripePriceIdAnnual: 'price_basic_annual', // Removed - using Clerk for billing
    maxDownloads: 5,
    commercialUse: false,
    priority: "standard",
    features: [
      "5 beat downloads per month",
      "MP3 format (320kbps)",
      "Personal use license",
      "Basic support",
      "Access to free beat library",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description: "For serious artists ready to monetize",
    monthlyPrice: 24.99,
    annualPrice: 249.99,
    // stripePriceIdMonthly: 'price_premium_monthly', // Removed - using Clerk for billing
    // stripePriceIdAnnual: 'price_premium_annual', // Removed - using Clerk for billing
    maxDownloads: 25,
    commercialUse: true,
    priority: "high",
    popular: true,
    features: [
      "25 beat downloads per month",
      "WAV + MP3 formats",
      "Commercial use license",
      "Tagged MP3 + untagged WAV",
      "Priority support",
      "Early access to new releases",
      "Producer collaboration tools",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    description: "Ultimate package for professional artists",
    monthlyPrice: 49.99,
    annualPrice: 499.99,
    // stripePriceIdMonthly: 'price_vip_monthly', // Removed - using Clerk for billing
    // stripePriceIdAnnual: 'price_vip_annual', // Removed - using Clerk for billing
    maxDownloads: -1, // Unlimited
    commercialUse: true,
    exclusiveBeats: true,
    priority: "exclusive",
    features: [
      "Unlimited beat downloads",
      "All formats (WAV, MP3, stems)",
      "Exclusive commercial license",
      "Untagged premium content",
      "VIP support with direct producer contact",
      "Custom beat requests",
      "Exclusive beat previews",
      "Discounted mixing & mastering services",
      "Revenue sharing opportunities",
    ],
  },
];

// Helper functions
export function getPlanById(id: string): SubscriptionPlan | undefined {
  return subscriptionPlans.find(plan => plan.id === id);
}

export function calculateAnnualSavings(plan: SubscriptionPlan): number {
  const annualEquivalent = plan.monthlyPrice * 12;
  return Math.round(((annualEquivalent - plan.annualPrice) / annualEquivalent) * 100);
}

export function getPriceId(planId: string, billing: "monthly" | "annual"): string {
  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error(`Plan with id ${planId} not found`);
  }

  // TODO: Implement with Clerk Billing
  return `clerk_${planId}_${billing}`;
}

export function isFeatureIncluded(planId: string, feature: string): boolean {
  const plan = getPlanById(planId);
  return plan?.features.includes(feature) || false;
}
