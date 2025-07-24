import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StandardHero } from '@/components/ui/StandardHero';
import { Check, Music, Download, Star, Crown, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { trackSubscriptionCheckoutStarted } from '@/utils/tracking';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
}

const plans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for getting started',
    priceMonthly: 999, // $9.99
    priceYearly: 9999, // $99.99 (saves $19.89)
    stripePriceIdMonthly: 'price_basic_monthly',
    stripePriceIdYearly: 'price_basic_yearly',
    features: [
      '5 beat downloads per month',
      'Basic license included',
      'MP3 format',
      'Email support',
      'Access to new releases'
    ],
    icon: <Music className="w-6 h-6" />,
    color: 'text-blue-400'
  },
  {
    id: 'artist',
    name: 'Artist',
    description: 'Best for active creators',
    priceMonthly: 1999, // $19.99
    priceYearly: 19999, // $199.99 (saves $39.89)
    stripePriceIdMonthly: 'price_artist_monthly',
    stripePriceIdYearly: 'price_artist_yearly',
    features: [
      '20 beat downloads per month',
      'Premium license included',
      'WAV + MP3 formats',
      'Trackouts available',
      'Priority support',
      'Early access to new beats',
      'Artist spotlight features'
    ],
    icon: <Star className="w-6 h-6" />,
    popular: true,
    color: 'text-[var(--accent-purple)]'
  },
  {
    id: 'ultimate',
    name: 'Ultimate Pass',
    description: 'Unlimited access for pros',
    priceMonthly: 4999, // $49.99
    priceYearly: 49999, // $499.99 (saves $99.89)
    stripePriceIdMonthly: 'price_ultimate_monthly',
    stripePriceIdYearly: 'price_ultimate_yearly',
    features: [
      'Unlimited beat downloads',
      'Exclusive license included',
      'All formats (WAV, MP3, STEMS)',
      'Custom beat requests',
      'Direct producer contact',
      '24/7 priority support',
      'Mixing & mastering discounts',
      'Exclusive member events',
      'First access to limited releases'
    ],
    icon: <Crown className="w-6 h-6" />,
    color: 'text-yellow-400'
  }
];

interface PricingCardProps {
  plan: PricingPlan;
  billingCycle: 'monthly' | 'yearly';
  onSubscribe: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
  loading?: boolean;
}

function PricingCard({ plan, billingCycle, onSubscribe, loading }: PricingCardProps) {
  const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const monthlyPrice = billingCycle === 'yearly' ? price / 12 : price;
  const savings = billingCycle === 'yearly' ? (plan.priceMonthly * 12) - plan.priceYearly : 0;

  return (
    <Card className={`relative ${plan.popular ? 'ring-2 ring-[var(--accent-purple)]' : ''} card-dark h-full`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-[var(--accent-purple)] text-white px-3 py-1">
            Most Popular
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className={`flex items-center justify-center mb-2 ${plan.color}`}>
          {plan.icon}
        </div>
        <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
        <p className="text-gray-400 text-sm">{plan.description}</p>
        
        <div className="mt-4">
          <div className="flex items-baseline justify-center">
            <span className="text-3xl font-bold text-white">
              ${(monthlyPrice / 100).toFixed(2)}
            </span>
            <span className="text-gray-400 ml-1">/month</span>
          </div>
          
          {billingCycle === 'yearly' && (
            <div className="mt-2">
              <p className="text-sm text-gray-400">
                Billed ${(price / 100).toFixed(2)} annually
              </p>
              {savings > 0 && (
                <p className="text-sm text-green-400 font-medium">
                  Save ${(savings / 100).toFixed(2)}/year
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        <Button
          onClick={() => onSubscribe(plan.id, billingCycle)}
          disabled={loading}
          className={`w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
        >
          {loading ? 'Setting up...' : 'Get Started'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function MembershipPage() {

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PricingPlan | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubscribe = async (planId: string, billingInterval: 'monthly' | 'yearly') => {
    setLoading(true);
    setSelectedPlan(planId);

    // Find the selected plan for tracking
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
      trackSubscriptionCheckoutStarted(planId, plan.name, billingInterval === 'yearly' ? 'annual' : billingInterval, price);
    }

    try {
      const response = await apiRequest('POST', '/api/create-subscription', {
        priceId: planId,
        billingInterval
      });

      if (response.ok) {
        const data = await response.json();
        setClientSecret(data.clientSecret);
        
        // Find the selected plan and show payment form
        setCurrentPlan(plan || null);
        setShowPayment(true);
      } else {
        throw new Error('Failed to create subscription');
      }
    } catch (error) {
      toast({
        title: 'Subscription Error',
        description: 'Unable to set up subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  // Payment completion handling
  const handlePaymentSuccess = () => {
    toast({
      title: 'Subscription Successful!',
      description: `Welcome to ${currentPlan?.name}! Your subscription is now active.`,
    });
    setShowPayment(false);
    setClientSecret(null);
    setCurrentPlan(null);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setClientSecret(null);
    setCurrentPlan(null);
  };

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="Choose Your Membership"
        subtitle="Get unlimited access to premium beats, exclusive licenses, and professional support. Choose the plan that fits your creative needs."
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Payment Modal */}
        {showPayment && clientSecret && currentPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--medium-gray)] rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Complete Your {currentPlan.name} Subscription
              </h2>
              <p className="text-gray-300 mb-6">
                ${(billingCycle === 'monthly' ? currentPlan.priceMonthly : currentPlan.priceYearly) / 100}/
                {billingCycle === 'monthly' ? 'month' : 'year'}
              </p>
              
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm 
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </Elements>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Label className={`text-lg ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-400'}`}>
              Monthly
            </Label>
            <Switch
              checked={billingCycle === 'yearly'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
            />
            <Label className={`text-lg ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-400'}`}>
              Yearly
            </Label>
            {billingCycle === 'yearly' && (
              <Badge className="bg-green-500 text-white ml-2">
                Save up to 17%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              onSubscribe={handleSubscribe}
              loading={loading && selectedPlan === plan.id}
            />
          ))}
        </div>

        {/* Features Comparison */}
        <div className="bg-[var(--medium-gray)] rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Why Choose BroLab Membership?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-[var(--accent-purple)] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Instant Downloads</h3>
              <p className="text-gray-300 text-sm">
                Get immediate access to high-quality beats in multiple formats
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-[var(--accent-purple)] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Exclusive Content</h3>
              <p className="text-gray-300 text-sm">
                Access member-only beats and early releases before everyone else
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-[var(--accent-purple)] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Premium Support</h3>
              <p className="text-gray-300 text-sm">
                Get priority support and direct access to our production team
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-[var(--medium-gray)] rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-300 text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            
            <div className="bg-[var(--medium-gray)] rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">What's included in the license?</h3>
              <p className="text-gray-300 text-sm">
                Each plan includes different licensing rights. Basic includes standard use, Artist includes commercial use, and Ultimate includes exclusive rights.
              </p>
            </div>
            
            <div className="bg-[var(--medium-gray)] rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Do unused downloads roll over?</h3>
              <p className="text-gray-300 text-sm">
                No, unused downloads don't roll over to the next month. However, Ultimate Pass members get unlimited downloads.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Payment Form Component
interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/membership',
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      onSuccess();
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <div className="flex space-x-4 mt-6">
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className="btn-primary flex-1"
        >
          {isLoading ? 'Processing...' : 'Subscribe Now'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}