import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// SubscriptionBilling component removed - now handled by Clerk/Convex
import { PaymentPlanSelector } from '@/components/payment/PaymentPlanSelector';
import { 
  CreditCard, 
  Smartphone, 
  Calculator, 
  Receipt, 
  Calendar,
  DollarSign,
  Globe,
  Shield,
  Zap
} from 'lucide-react';

export default function PaymentDashboard() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const features = [
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Multiple Payment Methods",
      description: "Accept credit cards, Apple Pay, Google Pay, and cryptocurrency",
      status: "active"
    },
    {
      icon: <Calculator className="w-6 h-6" />,
      title: "Smart Tax Calculation",
      description: "Automatic tax calculation based on customer location",
      status: "active"
    },
    {
      icon: <Receipt className="w-6 h-6" />,
      title: "Automated Invoicing",
      description: "Generate and email professional invoices automatically",
      status: "active"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Payment Plans",
      description: "Installment options for high-value purchases",
      status: "active"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Subscription Billing",
      description: "Recurring billing with automatic renewals",
      status: "active"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Multi-Currency Support",
      description: "15+ currencies with real-time exchange rates",
      status: "active"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Mobile Wallets",
      description: "One-touch payments with Apple Pay and Google Pay",
      status: "active"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Fraud Protection",
      description: "Advanced security with Stripe's fraud detection",
      status: "active"
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Advanced Payment System
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Complete payment infrastructure with support for multiple payment methods, 
            tax calculation, invoicing, and subscription billing.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-gray-600 bg-gray-800/50 hover:bg-gray-800/70 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-purple-400">
                    {feature.icon}
                  </div>
                  <Badge 
                    className={
                      feature.status === 'active' 
                        ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                        : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                    }
                  >
                    {feature.status}
                  </Badge>
                </div>
                <CardTitle className="text-white text-lg">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Advanced Features Tabs */}
        <Tabs defaultValue="billing" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="billing" className="text-white">
              Subscription Billing
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-white">
              Payment Plans
            </TabsTrigger>
            <TabsTrigger value="tax" className="text-white">
              Tax Calculation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="billing" className="space-y-6">
            <Card className="border-gray-600 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-white">Subscription Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Subscription billing is now handled by Clerk. Visit your Clerk dashboard to manage subscriptions.</p>
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                  Open Clerk Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <Card className="border-gray-600 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-white">Payment Plan Demo</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentPlanSelector
                  totalAmount={499.99}
                  onPlanSelected={(plan: any) => setSelectedPlan(plan)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="space-y-6">
            <Card className="border-gray-600 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-white">Tax Calculation System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">US Sales Tax</h4>
                    <p className="text-gray-400 text-sm">State-by-state calculation</p>
                    <p className="text-purple-400 font-medium">5-10% rate</p>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">EU VAT</h4>
                    <p className="text-gray-400 text-sm">Country-specific rates</p>
                    <p className="text-purple-400 font-medium">19-22% rate</p>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Digital Goods</h4>
                    <p className="text-gray-400 text-sm">Location-based rules</p>
                    <p className="text-purple-400 font-medium">Auto-detected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-gray-600 bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400">$12,847</div>
                  <p className="text-gray-400 text-sm">This month</p>
                </CardContent>
              </Card>

              <Card className="border-gray-600 bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-400">247</div>
                  <p className="text-gray-400 text-sm">Successful payments</p>
                </CardContent>
              </Card>

              <Card className="border-gray-600 bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Subscriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-400">89</div>
                  <p className="text-gray-400 text-sm">Active subscribers</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Integration Status */}
        <Card className="border-gray-600 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Stripe Connected</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Tax API Ready</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Invoice System Active</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Multi-Currency Live</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button 
            onClick={() => window.location.href = '/checkout'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Test Checkout Flow
          </Button>
          <Button 
            onClick={() => window.location.href = '/subscribe'}
            variant="outline"
            className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
          >
            View Subscription Plans
          </Button>
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
          >
            User Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}