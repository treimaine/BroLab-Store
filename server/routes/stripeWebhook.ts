import express from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabase';
import { verifyPaymentIntent } from '../services/stripe';
import { OrderStatus, OrderStatusEnum } from '../../shared/schema';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil'
});

// Helper pour mettre à jour le statut d'une commande
async function updateOrderStatus(orderId: number, status: OrderStatusEnum, comment?: string) {
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (updateError) {
    throw new Error(`Erreur lors de la mise à jour du statut de la commande: ${updateError.message}`);
  }

  const { error: historyError } = await supabaseAdmin
    .from('order_status_history')
    .insert({
      order_id: orderId,
      status,
      comment
    });

  if (historyError) {
    throw new Error(`Erreur lors de l'enregistrement de l'historique: ${historyError.message}`);
  }
}

// Webhook Stripe pour gérer les événements de paiement
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    return res.status(400).json({ error: 'Signature ou secret manquant' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Erreur de signature webhook:', err.message);
    return res.status(400).json({ error: `Erreur de signature webhook: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Récupérer la commande associée
        const { data: orders, error: orderError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (orderError || !orders) {
          throw new Error(`Commande non trouvée pour le payment_intent: ${paymentIntent.id}`);
        }

        // Vérifier le paiement
        await verifyPaymentIntent(paymentIntent.id, orders.total);
        
        // Mettre à jour le statut de la commande
        await updateOrderStatus(
          orders.id,
          'paid',
          'Paiement validé par Stripe'
        );

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        const { data: orders, error: orderError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (orderError || !orders) {
          throw new Error(`Commande non trouvée pour le payment_intent: ${paymentIntent.id}`);
        }

        await updateOrderStatus(
          orders.id,
          'failed',
          `Échec du paiement: ${paymentIntent.last_payment_error?.message || 'Raison inconnue'}`
        );

        break;
      }

      // Ajouter d'autres cas selon les besoins (remboursements, etc.)
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Erreur de traitement webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;