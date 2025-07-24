import Stripe from "stripe";
import { Request, Response } from "express";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Payment plan configurations
const PAYMENT_PLANS = {
  beat_purchase: {
    '3_months': { installments: 3, interestRate: 0.05 },
    '6_months': { installments: 6, interestRate: 0.08 },
    '12_months': { installments: 12, interestRate: 0.12 }
  },
  exclusive_license: {
    '6_months': { installments: 6, interestRate: 0.06 },
    '12_months': { installments: 12, interestRate: 0.10 },
    '24_months': { installments: 24, interestRate: 0.15 }
  }
};

interface PaymentPlanCalculation {
  totalAmount: number;
  planType: keyof typeof PAYMENT_PLANS;
  duration: string;
}

// Calculate payment plan details
export const calculatePaymentPlan = (req: Request, res: Response) => {
  try {
    const { totalAmount, planType, duration }: PaymentPlanCalculation = req.body;

    const plan = PAYMENT_PLANS[planType]?.[duration as keyof typeof PAYMENT_PLANS[typeof planType]];
    
    if (!plan) {
      return res.status(400).json({ error: "Invalid payment plan" });
    }

    const interestAmount = totalAmount * plan.interestRate;
    const totalWithInterest = totalAmount + interestAmount;
    const monthlyPayment = totalWithInterest / plan.installments;
    const downPayment = monthlyPayment; // First payment

    res.json({
      originalAmount: totalAmount,
      interestRate: plan.interestRate,
      interestAmount: parseFloat(interestAmount.toFixed(2)),
      totalAmount: parseFloat(totalWithInterest.toFixed(2)),
      installments: plan.installments,
      monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
      downPayment: parseFloat(downPayment.toFixed(2)),
      schedule: generatePaymentSchedule(totalWithInterest, plan.installments)
    });

  } catch (error: any) {
    console.error("Payment plan calculation error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Generate payment schedule
const generatePaymentSchedule = (totalAmount: number, installments: number) => {
  const monthlyPayment = totalAmount / installments;
  const schedule = [];
  const startDate = new Date();

  for (let i = 0; i < installments; i++) {
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(startDate.getMonth() + i);
    
    schedule.push({
      installmentNumber: i + 1,
      amount: parseFloat(monthlyPayment.toFixed(2)),
      dueDate: paymentDate.toISOString().split('T')[0],
      status: i === 0 ? 'due' : 'pending'
    });
  }

  return schedule;
};

// Create payment plan subscription
export const createPaymentPlan = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { 
      customerId, 
      totalAmount, 
      planType, 
      duration, 
      paymentMethodId,
      description 
    } = req.body;

    const planConfig = PAYMENT_PLANS[planType as keyof typeof PAYMENT_PLANS]?.[duration as keyof typeof PAYMENT_PLANS[keyof typeof PAYMENT_PLANS]];
    if (!planConfig) {
      return res.status(400).json({ error: "Invalid payment plan" });
    }

    const interestAmount = totalAmount * planConfig.interestRate;
    const totalWithInterest = totalAmount + interestAmount;
    const monthlyAmount = Math.round((totalWithInterest / planConfig.installments) * 100); // in cents

    // Create Stripe subscription for payment plan
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Payment Plan: ${description}`,
            description: `${planConfig.installments} month payment plan`
          },
          unit_amount: monthlyAmount,
          recurring: {
            interval: 'month',
            interval_count: 1
          }
        } as any
      }],
      default_payment_method: paymentMethodId,
      collection_method: 'charge_automatically',
      metadata: {
        plan_type: planType,
        original_amount: totalAmount.toString(),
        installments: planConfig.installments.toString(),
        current_installment: '1'
      },
      // Cancel after all installments
      cancel_at: Math.floor(Date.now() / 1000) + (planConfig.installments * 30 * 24 * 60 * 60) // 30 days per month
    });

    res.json({
      success: true,
      subscriptionId: subscription.id,
      paymentPlan: {
        totalAmount: totalWithInterest,
        monthlyAmount: monthlyAmount / 100,
        installments: planConfig.installments,
        nextPaymentDate: new Date((subscription as any).current_period_end * 1000).toISOString()
      }
    });

  } catch (error: any) {
    console.error("Create payment plan error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get payment plan status
export const getPaymentPlanStatus = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { subscriptionId } = req.params;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 100
    });

    const currentInstallment = parseInt(subscription.metadata.current_installment || '1');
    const totalInstallments = parseInt(subscription.metadata.installments || '1');

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      currentInstallment,
      totalInstallments,
      remainingPayments: totalInstallments - currentInstallment,
      nextPaymentDate: new Date((subscription as any).current_period_end * 1000).toISOString(),
      paymentHistory: invoices.data.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100,
        date: new Date(invoice.created * 1000).toISOString(),
        status: invoice.status
      }))
    });

  } catch (error: any) {
    console.error("Get payment plan status error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Cancel payment plan
export const cancelPaymentPlan = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { subscriptionId } = req.params;
    const { reason } = req.body;

    const subscription = await stripe.subscriptions.cancel(subscriptionId, {
      cancellation_details: {
        comment: reason || 'Customer requested cancellation'
      }
    });

    res.json({
      success: true,
      message: "Payment plan cancelled successfully",
      finalAmount: subscription.canceled_at ? 0 : (subscription.items.data[0]?.price?.unit_amount || 0) / 100
    });

  } catch (error: any) {
    console.error("Cancel payment plan error:", error);
    res.status(500).json({ error: error.message });
  }
};