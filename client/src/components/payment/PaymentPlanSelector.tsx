import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { Calendar, DollarSign, CreditCard } from 'lucide-react';

interface PaymentPlan {
  originalAmount: number;
  interestRate: number;
  interestAmount: number;
  totalAmount: number;
  installments: number;
  monthlyPayment: number;
  downPayment: number;
  schedule: Array<{
    installmentNumber: number;
    amount: number;
    dueDate: string;
    status: string;
  }>;
}

interface PaymentPlanSelectorProps {
  totalAmount: number;
  onPlanSelected: (plan: PaymentPlan | null) => void;
}

export const PaymentPlanSelector: React.FC<PaymentPlanSelectorProps> = ({
  totalAmount,
  onPlanSelected
}) => {
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const planOptions = [
    { value: '3_months', label: '3 Months', rate: '5%' },
    { value: '6_months', label: '6 Months', rate: '8%' },
    { value: '12_months', label: '12 Months', rate: '12%' }
  ];

  useEffect(() => {
    if (selectedDuration) {
      calculatePlan();
    } else {
      setPaymentPlan(null);
      onPlanSelected(null);
    }
  }, [selectedDuration, totalAmount]);

  const calculatePlan = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/payment-plan/calculate', {
        totalAmount,
        planType: 'beat_purchase',
        duration: selectedDuration
      });

      const plan = await response.json();
      setPaymentPlan(plan);
      onPlanSelected(plan);
    } catch (error) {
      console.error('Payment plan calculation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Payment Plan Options</h3>
        {totalAmount >= 200 && (
          <Badge variant="secondary" className="bg-green-500/20 text-green-300">
            Eligible for Payment Plans
          </Badge>
        )}
      </div>

      {totalAmount < 200 ? (
        <Card className="border-gray-600 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-center">
              Payment plans are available for orders $200 and above.
              <br />
              Current total: {formatCurrency(totalAmount)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Plan Duration
              </label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Pay in Full</SelectItem>
                  {planOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} ({option.rate} interest)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setSelectedDuration('')}
                className="border-gray-600 text-gray-300"
              >
                Pay Full Amount
              </Button>
            </div>
          </div>

          {paymentPlan && !isLoading && (
            <Card className="border-gray-600 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Plan Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Original Amount</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(paymentPlan.originalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Interest</p>
                    <p className="text-lg font-semibold text-orange-400">
                      +{formatCurrency(paymentPlan.interestAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Amount</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(paymentPlan.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Monthly Payment</p>
                    <p className="text-lg font-semibold text-purple-400">
                      {formatCurrency(paymentPlan.monthlyPayment)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-600 pt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Payment Schedule
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {paymentPlan.schedule.slice(0, 6).map((payment, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">
                          Payment {payment.installmentNumber} - {new Date(payment.dueDate).toLocaleDateString()}
                        </span>
                        <span className="text-white font-medium">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    ))}
                    {paymentPlan.schedule.length > 6 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{paymentPlan.schedule.length - 6} more payments
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-300">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    First payment of {formatCurrency(paymentPlan.downPayment)} due today
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card className="border-gray-600 bg-gray-800/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <span className="ml-2 text-gray-400">Calculating payment plan...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};