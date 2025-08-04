import express from 'express';
import Stripe from 'stripe';
import { createSubscriptionSchema, serverCreateSubscriptionSchema } from '../../shared/validation';
import { getCurrentUser, isAuthenticated } from '../auth';
import { auditLogger } from '../lib/audit';
import { getSubscription, getUserById, subscriptionStatusHelper, upsertSubscription } from '../lib/db';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { subscriptionLimiter } from '../middleware/rateLimit';

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
router.post('/create-subscription', isAuthenticated, subscriptionLimiter, async (req, res) => {
  try {
    // Client-side validation
    const clientValidation = createSubscriptionSchema.safeParse(req.body);
    if (!clientValidation.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: clientValidation.error.errors 
      });
    }

    // Server-side validation with additional security checks
    const serverValidation = serverCreateSubscriptionSchema.safeParse({
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      timestamp: Date.now()
    });
    
    if (!serverValidation.success) {
      // Log security event for failed validation
      await auditLogger.logSecurityEvent(
        req.user?.id || 0,
        'subscription_validation_failed',
        { 
          errors: serverValidation.error.errors,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        req.ip,
        req.headers['user-agent']
      );
      
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: serverValidation.error.errors 
      });
    }

    const { priceId, billingInterval } = serverValidation.data;
    
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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

    // Créer la session Stripe
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
      cancel_url: `${req.headers.origin}/membership?canceled=true`,
      metadata: {
        tier: priceId,
        billing_interval: billingInterval,
        user_id: user.id.toString()
      }
    });

    // Créer l'enregistrement "pending" en base
    await upsertSubscription({
      stripeSubId: session.id, // Utiliser session.id comme identifiant temporaire
      userId: user.id,
      plan: priceId,
      status: 'pending',
      current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h pour expiration
    });

    // Log successful subscription creation
    await auditLogger.logSubscriptionCreated(
      user.id,
      priceId,
      billingInterval,
      req.ip,
      req.headers['user-agent']
    );

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
      
      // Récupérer l'userId depuis les metadata
      const userId = parseInt(session.metadata?.user_id || '0');
      if (!userId) {
        console.error('No user_id found in session metadata');
        return res.status(400).json({ error: 'Invalid session metadata' });
      }

      // Vérifier que l'utilisateur existe
      const user = await getUserById(userId);
      if (!user) {
        console.error(`User ${userId} not found`);
        return res.status(400).json({ error: 'User not found' });
      }

      // Mettre à jour le statut vers "active"
      await upsertSubscription({
        stripeSubId: session.subscription,
        userId: userId,
        plan: session.metadata?.tier || 'unknown',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 jours
      });

      console.log(`Subscription activated for user ${userId}`);
      
      // Invalider le cache pour forcer la mise à jour du dashboard
      // Note: En production, vous pourriez utiliser un système de cache distribué
      break;
      
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      
      // Récupérer l'utilisateur par customer_id
      const { data: users, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', subscription.customer)
        .single();

      if (userError || !users) {
        console.error(`No user found for customer ${subscription.customer}`);
        break;
      }

      // Mettre à jour le statut
      await upsertSubscription({
        stripeSubId: subscription.id,
        userId: users.id,
        plan: subscription.metadata?.tier || 'unknown',
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      });

      console.log(`Subscription updated for user ${users.id}: ${subscription.status}`);
      break;
      
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      
      // Récupérer l'utilisateur par customer_id
      const { data: deletedUsers, error: deletedUserError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', deletedSubscription.customer)
        .single();

      if (deletedUserError || !deletedUsers) {
        console.error(`No user found for customer ${deletedSubscription.customer}`);
        break;
      }

      // Mettre à jour le statut vers "canceled"
      await upsertSubscription({
        stripeSubId: deletedSubscription.id,
        userId: deletedUsers.id,
        plan: deletedSubscription.metadata?.tier || 'unknown',
        status: 'canceled',
        current_period_end: new Date(deletedSubscription.current_period_end * 1000).toISOString()
      });

      console.log(`Subscription canceled for user ${deletedUsers.id}`);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      
      // Récupérer l'utilisateur par customer_id
      const { data: failedUsers, error: failedUserError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', failedInvoice.customer)
        .single();

      if (failedUserError || !failedUsers) {
        console.error(`No user found for customer ${failedInvoice.customer}`);
        break;
      }

      // Mettre à jour le statut vers "canceled" en cas d'échec de paiement
      await upsertSubscription({
        stripeSubId: failedInvoice.subscription,
        userId: failedUsers.id,
        plan: 'unknown',
        status: 'canceled',
        current_period_end: new Date().toISOString()
      });

      console.log(`Subscription canceled due to payment failure for user ${failedUsers.id}`);
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
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscription = await getSubscription(user.id);
    const status = await subscriptionStatusHelper(user.id);

    res.json({
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status, // Retourner le statut original de la DB
        current_period_end: subscription.current_period_end,
        created_at: subscription.created_at,
        cancel_at_period_end: subscription.cancel_at_period_end
      } : null,
      status: status // Le statut calculé
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;