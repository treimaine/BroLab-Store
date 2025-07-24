import type { Express, Request as ExpressRequest } from "express";

// Extend Express Request interface for authentication
declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: any;
    }
  }
}
import { createServer, type Server } from "http";
import { registerWordPressRoutes } from "./wordpress";
import { setupAuth, registerAuthRoutes } from "./auth";
import subscriptionRouter from "./routes/subscription";
import storageRouter from "./routes/storage";
import monitoringRoutes from "./routes/monitoring";
import monitoring from "./lib/monitoring";
import Stripe from "stripe";

// Initialize Stripe (will be used for subscription handling)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Import advanced payment features
import { 
  verifyApplePayDomain, 
  getGooglePayConfig, 
  createCryptoPaymentIntent,
  savePaymentMethod,
  getCustomerPaymentMethods 
} from './payment-methods';
import { calculateTax, getTaxInfo } from './tax-calculator';
import { generateInvoice, getInvoice, sendReceipt } from './invoice-system';
import { 
  calculatePaymentPlan, 
  createPaymentPlan, 
  getPaymentPlanStatus, 
  cancelPaymentPlan 
} from './payment-plans';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication middleware
  setupAuth(app);
  
  // Register authentication routes
  registerAuthRoutes(app);
  
  // Register WordPress and WooCommerce routes
  registerWordPressRoutes(app);
  
  // Register subscription routes
  app.use('/api/subscription', subscriptionRouter);
  
  // Register downloads routes - PATCH: Fix downloads endpoint routing
  try {
    const downloadsRouter = await import('./routes/downloads');
    app.use('/api/downloads', downloadsRouter.default);
  } catch (error) {
    console.warn('Downloads router not available:', error);
  }

  // Register email routes
  try {
    const emailRouter = await import('./routes/email');
    app.use('/api/email', emailRouter.default);
    console.log('✅ Email routes registered successfully');
  } catch (error) {
    console.log('❌ Email router not found:', error);
  }

  // Register security routes
  try {
    const securityRouter = await import('./routes/security');
    app.use('/api/security', securityRouter.default);
  } catch (error) {
    console.warn('Security router not available:', error);
  }

  // Stripe payment endpoints
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          error: "Stripe not configured. Please add STRIPE_SECRET_KEY to environment variables." 
        });
      }

      const { amount, currency = "usd" } = req.body;
      
      console.log("Payment intent request - amount:", amount, "currency:", currency);
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Validate that amount is reasonable for our beats (minimum $29.99)
      if (amount < 29.99) {
        console.error("Amount below minimum beat price:", amount);
        return res.status(400).json({ 
          error: `Amount too small for beat purchase. Minimum is $29.99, received $${amount.toFixed(2)}. Please refresh your cart to fix pricing.` 
        });
      }

      // Ensure minimum amount for Stripe (50 cents)
      const amountInCents = Math.round(amount * 100);
      if (amountInCents < 50) {
        return res.status(400).json({ 
          error: `Amount too small. Minimum is $0.50, received $${amount.toFixed(2)}` 
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents, // Convert to cents - amount is already in dollars from frontend
        currency,
        payment_method_types: ['card'],
      });

      console.log("Payment intent created - amount in cents:", amountInCents, "id:", paymentIntent.id);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Payment intent error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create subscription endpoint
  app.post("/api/create-subscription", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          error: "Stripe not configured. Please add STRIPE_SECRET_KEY to environment variables." 
        });
      }

      const { priceId, billingInterval } = req.body;
      console.log("Subscription request received:", req.body);
      
      // Define subscription amounts based on plan and billing
      const subscriptionPlans: any = {
        basic: {
          monthly: { amount: 999 },   // $9.99
          yearly: { amount: 9999 }    // $99.99
        },
        artist: {
          monthly: { amount: 1999 },  // $19.99
          yearly: { amount: 19999 }   // $199.99
        },
        ultimate: {
          monthly: { amount: 4999 },  // $49.99
          yearly: { amount: 49999 }   // $499.99
        }
      };

      const planAmount = subscriptionPlans[priceId]?.[billingInterval]?.amount || 1999;
      
      // Create a payment intent for the subscription
      const paymentIntent = await stripe.paymentIntents.create({
        amount: planAmount,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          type: 'subscription',
          plan: priceId,
          billing: billingInterval
        }
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Reservations endpoint for mixing & mastering
  app.post('/api/reservations', async (req, res) => {
    try {
      const reservation = req.body;
      
      // In a real app, you'd save this to a database
      console.log('Reservation received:', reservation);
      
      // You could also send an email notification here
      
      res.json({ 
        success: true,
        message: 'Reservation submitted successfully',
        reservationId: 'res_' + Date.now()
      });
    } catch (error: any) {
      console.error('Reservation error:', error);
      res.status(500).json({ error: 'Failed to submit reservation' });
    }
  });

  // Additional service booking endpoints
  app.post("/api/booking/recording", async (req, res) => {
    try {
      const bookingData = req.body;
      console.log('Recording session booking received:', bookingData);
      
      res.json({ 
        success: true, 
        message: "Recording session booking received successfully",
        bookingId: `rs_${Date.now()}`
      });
    } catch (error: any) {
      console.error('Recording booking error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process recording session booking" 
      });
    }
  });

  app.post("/api/booking/custom-beats", async (req, res) => {
    try {
      const bookingData = req.body;
      console.log('Custom beat request received:', bookingData);
      
      res.json({ 
        success: true, 
        message: "Custom beat request received successfully",
        bookingId: `cb_${Date.now()}`
      });
    } catch (error: any) {
      console.error('Custom beat booking error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process custom beat request" 
      });
    }
  });

  app.post("/api/booking/production-consultation", async (req, res) => {
    try {
      const bookingData = req.body;
      console.log('Production consultation booking received:', bookingData);
      
      res.json({ 
        success: true, 
        message: "Production consultation booking received successfully",
        bookingId: `pc_${Date.now()}`
      });
    } catch (error: any) {
      console.error('Consultation booking error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process consultation booking" 
      });
    }
  });

  // Download endpoints for purchased beats
  app.get("/api/download/:licenseType/:beatName", async (req, res) => {
    try {
      const { licenseType, beatName } = req.params;
      
      const downloadFiles = {
        basic: {
          files: ['mp3'],
          message: 'Basic MP3 License - 320kbps MP3 file'
        },
        premium: {
          files: ['mp3', 'wav'],
          message: 'Premium WAV License - MP3 + WAV files'
        },
        unlimited: {
          files: ['mp3', 'wav', 'stems'],
          message: 'Unlimited License - MP3 + WAV + Stems'
        }
      };

      const licenseInfo = downloadFiles[licenseType as keyof typeof downloadFiles];
      
      if (!licenseInfo) {
        return res.status(400).json({ error: "Invalid license type" });
      }

      res.json({
        beatName,
        licenseType,
        files: licenseInfo.files,
        message: licenseInfo.message,
        downloadUrl: `/api/placeholder/audio.mp3`,
        licenseAgreement: `/api/license-agreement/${licenseType}`
      });
      
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // License agreement endpoint
  app.get("/api/license-agreement/:licenseType", async (req, res) => {
    try {
      const { licenseType } = req.params;
      
      const agreements = {
        basic: "Basic MP3 License Agreement - Up to 50,000 streams, 2,500 copies distribution",
        premium: "Premium WAV License Agreement - Up to 150,000 streams, 2,500 copies distribution",
        unlimited: "Unlimited License Agreement - Unlimited streams and distribution"
      };

      const agreement = agreements[licenseType as keyof typeof agreements];
      
      if (!agreement) {
        return res.status(400).json({ error: "Invalid license type" });
      }

      res.json({
        licenseType,
        agreement,
        terms: `This ${licenseType} license grants you the rights specified in the BroLab Entertainment licensing terms.`
      });
      
    } catch (error: any) {
      console.error("License agreement error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // === ADVANCED PAYMENT FEATURES ===
  
  // Apple Pay Routes
  app.post('/api/apple-pay/verify-domain', verifyApplePayDomain);
  app.post('/api/apple-pay/validate', async (req, res) => {
    res.json({ success: true, merchantSession: { displayName: 'BroLab Entertainment' } });
  });
  app.post('/api/apple-pay/process', async (req, res) => {
    try {
      const { payment, amount } = req.body;
      const paymentIntent = await stripe?.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        automatic_payment_methods: { enabled: true }
      });
      res.json({ success: true, paymentIntent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Google Pay Routes  
  app.get('/api/google-pay/config', getGooglePayConfig);
  app.post('/api/google-pay/process', async (req, res) => {
    try {
      const { paymentData, amount } = req.body;
      const paymentIntent = await stripe?.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        automatic_payment_methods: { enabled: true }
      });
      res.json({ success: true, paymentIntent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cryptocurrency Payment Routes
  app.post('/api/crypto/payment-intent', createCryptoPaymentIntent);

  // Payment Method Management
  app.post('/api/payment-methods/save', savePaymentMethod);
  app.get('/api/payment-methods/:customerId', getCustomerPaymentMethods);

  // Tax Calculation Routes
  app.post('/api/tax/calculate', calculateTax);
  app.get('/api/tax/info', getTaxInfo);

  // Invoice System Routes
  app.post('/api/invoice/generate', generateInvoice);
  app.get('/api/invoice/:invoiceNumber', getInvoice);
  app.post('/api/invoice/send-receipt', sendReceipt);

  // Payment Plan Routes
  app.post('/api/payment-plan/calculate', calculatePaymentPlan);
  app.post('/api/payment-plan/create', createPaymentPlan);
  app.get('/api/payment-plan/:subscriptionId/status', getPaymentPlanStatus);
  app.delete('/api/payment-plan/:subscriptionId/cancel', cancelPaymentPlan);

  // Enhanced Subscription Routes
  app.post('/api/subscription/create', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { priceId, paymentMethodId } = req.body;
      const user = req.user;

      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: 'No Stripe customer found' });
      }

      const subscription = await stripe?.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
      });

      res.json({ 
        subscription,
        clientSecret: (subscription?.latest_invoice as any)?.payment_intent?.client_secret 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/subscription/:customerId', async (req, res) => {
    try {
      const { customerId } = req.params;
      const subscriptions = await stripe?.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method']
      });

      res.json({ subscription: subscriptions?.data[0] || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/invoices/:customerId', async (req, res) => {
    try {
      const { customerId } = req.params;
      const invoices = await stripe?.invoices.list({
        customer: customerId,
        limit: 10
      });

      res.json({ invoices: invoices?.data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Storage routes
  app.use('/api/storage', storageRouter);
  
  // Register Monitoring routes
  app.use('/api/monitoring', monitoringRoutes);
  
  // Add monitoring middleware to track requests
  app.use(monitoring.trackingMiddleware());

  const httpServer = createServer(app);
  return httpServer;
}