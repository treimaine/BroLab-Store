import Stripe from 'stripe';
import { z } from 'zod';

// Utilise la version par défaut renseignée dans votre dashboard Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Schéma de validation pour le payload de paiement vérifié
export const verifiedPaymentPayloadSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number(),
  currency: z.string().length(3),
  status: z.enum(['succeeded', 'processing', 'requires_payment_method', 'requires_confirmation', 'requires_action', 'canceled']),
});

export type VerifiedPaymentPayload = z.infer<typeof verifiedPaymentPayloadSchema>;

// Helper pour vérifier un paiement Stripe
export async function verifyPaymentIntent(paymentIntentId: string, expectedAmount: number, expectedCurrency: string = 'eur'): Promise<VerifiedPaymentPayload> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Vérification du montant et de la devise
    if (paymentIntent.amount !== expectedAmount) {
      throw new Error(`Montant invalide: attendu ${expectedAmount}, reçu ${paymentIntent.amount}`);
    }
    
    if (paymentIntent.currency.toLowerCase() !== expectedCurrency.toLowerCase()) {
      throw new Error(`Devise invalide: attendu ${expectedCurrency}, reçu ${paymentIntent.currency}`);
    }

    return {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status as VerifiedPaymentPayload['status'],
    };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Erreur Stripe: ${error.message}`);
    }
    throw error;
  }
}

export default stripe;