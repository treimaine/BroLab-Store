import Stripe from "stripe";
import { Request, Response } from "express";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Apple Pay Domain Verification
export const verifyApplePayDomain = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { domain } = req.body;
    
    const domainVerification = await stripe.applePayDomains.create({
      domain_name: domain
    });

    res.json({ 
      success: true, 
      verification: domainVerification 
    });
  } catch (error: any) {
    console.error("Apple Pay domain verification error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Google Pay Configuration
export const getGooglePayConfig = (req: Request, res: Response) => {
  const config = {
    environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
    merchantId: process.env.GOOGLE_PAY_MERCHANT_ID || 'BCR2DN4TR2D4YRWL',
    merchantName: 'BroLab Entertainment',
    allowedPaymentMethods: [
      {
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'stripe',
            'stripe:version': '2023-10-16',
            'stripe:publishableKey': process.env.VITE_STRIPE_PUBLIC_KEY
          }
        }
      }
    ]
  };

  res.json(config);
};

// Cryptocurrency Payment Intent (using Stripe Crypto)
export const createCryptoPaymentIntent = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { amount, currency = "usd", cryptoCurrency = "btc" } = req.body;

    // Create a payment intent with crypto support
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      payment_method_types: ['card'], // Stripe handles crypto conversion
      metadata: {
        crypto_currency: cryptoCurrency,
        payment_type: 'crypto'
      }
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      cryptoSupported: true 
    });
  } catch (error: any) {
    console.error("Crypto payment intent error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Payment Method Management
export const savePaymentMethod = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { paymentMethodId, customerId } = req.body;

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    res.json({ 
      success: true, 
      paymentMethod 
    });
  } catch (error: any) {
    console.error("Save payment method error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Customer's Saved Payment Methods
export const getCustomerPaymentMethods = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { customerId } = req.params;

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    res.json({ paymentMethods: paymentMethods.data });
  } catch (error: any) {
    console.error("Get payment methods error:", error);
    res.status(500).json({ error: error.message });
  }
};