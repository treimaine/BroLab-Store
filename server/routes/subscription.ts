import express from 'express';
import Stripe from 'stripe';
import { getSubscription, getUserById, subscriptionStatusHelper, upsertSubscription } from '../lib/db';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

// Get available subscription plans (MUST BE FIRST)
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        id: 'basic',
        name: 'Basic',
        description: 'Accès aux beats essentiels',
        monthly: {
          price: 9.99,
          priceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || 'price_basic_monthly'
        },
        annual: {
          price: 99.99,
          priceId: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || 'price_basic_annual'
        },
        features: [
          'Accès à 100+ beats',
          'Téléchargements illimités',
          'Support email'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'Accès complet avec fonctionnalités avancées',
        monthly: {
          price: 19.99,
          priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly'
        },
        annual: {
          price: 199.99,
          priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual'
        },
        features: [
          'Accès à 500+ beats',
          'Téléchargements illimités',
          'Support prioritaire',
          'Accès aux exclusivités',
          'Licences commerciales'
        ]
      },
      {
        id: 'unlimited',
        name: 'Unlimited',
        description: 'Accès illimité à tout le catalogue',
        monthly: {
          price: 29.99,
          priceId: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID || 'price_unlimited_monthly'
        },
        annual: {
          price: 299.99,
          priceId: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID || 'price_unlimited_annual'
        },
        features: [
          'Accès illimité à tous les beats',
          'Téléchargements illimités',
          'Support VIP',
          'Accès aux exclusivités',
          'Licences commerciales',
          'Accès aux packs premium',
          'Remixes exclusifs'
        ]
      }
    ];

    res.json(plans);
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Create subscription checkout session
router.post('/create-subscription', async (req, res) => {
  try {
    const { priceId, billingInterval } = req.body;

    // Map frontend tier IDs to Stripe price IDs
    const priceMapping: Record<string, { monthly: string; annual: string }> = {
      basic: {
        monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || 'price_basic_monthly',
        annual: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || 'price_basic_annual'
      },
      pro: {
        monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
        annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual'
      },
      unlimited: {
        monthly: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID || 'price_unlimited_monthly',
        annual: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID || 'price_unlimited_annual'
      }
    };

    const stripePriceId = priceMapping[priceId as keyof typeof priceMapping]?.[billingInterval as 'monthly' | 'annual'];
    
    if (!stripePriceId) {
      return res.status(400).json({ error: 'Invalid price ID or billing interval' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/membership`,
      metadata: {
        tier: priceId,
        billing_interval: billingInterval
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Subscription creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Handle Stripe webhook for subscription events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body;
    }
  } catch (err: any) {
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotence: check if event.id already processed
  const eventId = event.id;
  if (eventId) {
    const { data: existing, error } = await supabaseAdmin
      .from('stripe_events')
      .select('id')
      .eq('id', eventId)
      .single();
    if (existing && existing.id) {
      return res.json({ received: true, duplicated: true });
    }
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Update user subscription in database
      await upsertSubscription({
        stripeSubId: session.subscription,
        userId: 123, // TODO: retrouver l'userId à partir de l'email ou customer_email
        plan: session.metadata?.plan || 'unknown',
        status: 'active',
        current_period_end: '2099-12-31T00:00:00.000Z'
      });
      break;
      
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log('Subscription updated:', subscription);
      break;
      
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      console.log('Subscription canceled:', deletedSubscription);
      
      // TODO: Update user subscription status to inactive
      // await deactivateUserSubscription(deletedSubscription.customer);
      
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Marquer l'event comme traité (idempotence)
  if (eventId) {
    await supabaseAdmin
      .from('stripe_events')
      .insert({ id: eventId })
      .select();
  }

  res.json({ received: true });
});



// Get current user's subscription status
router.get('/status', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await getUserById(req.session.userId);
    if (user === null) {
      // If we ever prefer 200 + {status:'none'}, flip this block
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    const status = await subscriptionStatusHelper(user.id);
    const subscription = await getSubscription(user.id);
    res.json({ status, subscription });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;