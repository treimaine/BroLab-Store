import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, CreditCard, Download, DollarSign, AlertTriangle } from 'lucide-react';

interface Subscription {
  id: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  plan: {
    name: string;
    amount: number;
    interval: string;
  };
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

interface Invoice {
  id: string;
  amount_paid: number;
  status: string;
  created: number;
  invoice_pdf: string;
}

export const SubscriptionBilling: React.FC = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    if ((user as any)?.stripeCustomerId || (user as any)?.stripe_customer_id) {
      fetchSubscriptionData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      const [subResponse, invoiceResponse] = await Promise.all([
        apiRequest('GET', `/api/subscription/${(user as any)?.stripeCustomerId || (user as any)?.stripe_customer_id}`),
        apiRequest('GET', `/api/invoices/${(user as any)?.stripeCustomerId || (user as any)?.stripe_customer_id}`)
      ]);

      const subData = await subResponse.json();
      const invoiceData = await invoiceResponse.json();

      setSubscription(subData.subscription);
      setInvoices(invoiceData.invoices || []);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setIsCanceling(true);
    try {
      await apiRequest('POST', `/api/subscription/${subscription.id}/cancel`);
      await fetchSubscriptionData();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription) return;

    try {
      await apiRequest('POST', `/api/subscription/${subscription.id}/reactivate`);
      await fetchSubscriptionData();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'past_due': return 'bg-yellow-500';
      case 'canceled': return 'bg-red-500';
      case 'incomplete': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const calculateBillingProgress = () => {
    if (!subscription) return 0;
    
    const now = Date.now() / 1000;
    const start = subscription.current_period_start;
    const end = subscription.current_period_end;
    const progress = ((now - start) / (end - start)) * 100;
    
    return Math.min(Math.max(progress, 0), 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-2 text-gray-400">Loading subscription details...</span>
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card className="border-gray-600 bg-gray-800/50">
        <CardContent className="pt-6 text-center">
          <p className="text-gray-400 mb-4">No active subscription found</p>
          <Button 
            onClick={() => window.location.href = '/subscribe'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Subscribe Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Current Subscription
            </span>
            <Badge className={getStatusColor(subscription.status)}>
              {subscription.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Plan</p>
              <p className="text-lg font-semibold text-white">
                {subscription.plan.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Price</p>
              <p className="text-lg font-semibold text-white">
                ${(subscription.plan.amount / 100).toFixed(2)}/{subscription.plan.interval}
              </p>
            </div>
          </div>

          {/* Billing Period Progress */}
          <div>
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Billing Period</span>
              <span>{Math.round(calculateBillingProgress())}% elapsed</span>
            </div>
            <Progress value={calculateBillingProgress()} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatDate(subscription.current_period_start)}</span>
              <span>{formatDate(subscription.current_period_end)}</span>
            </div>
          </div>

          {/* Next Payment */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center text-blue-300">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-sm">
                Next payment: {formatDate(subscription.current_period_end)}
              </span>
            </div>
          </div>

          {/* Cancellation Notice */}
          {subscription.cancel_at_period_end && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-center text-orange-300">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="text-sm">
                  Subscription will cancel at the end of the current period
                </span>
              </div>
              <Button
                onClick={handleReactivateSubscription}
                size="sm"
                className="mt-2 bg-green-600 hover:bg-green-700"
              >
                Reactivate Subscription
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!subscription.cancel_at_period_end ? (
              <Button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
              </Button>
            ) : null}
            
            <Button
              onClick={() => window.open('/subscribe', '_blank')}
              variant="outline"
              className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No billing history available</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">
                      ${(invoice.amount_paid / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatDate(invoice.created)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      className={
                        invoice.status === 'paid'
                          ? 'bg-green-500'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }
                    >
                      {invoice.status}
                    </Badge>
                    {invoice.invoice_pdf && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(invoice.invoice_pdf, '_blank')}
                        className="border-gray-600 text-gray-300"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};