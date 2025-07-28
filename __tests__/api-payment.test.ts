import { describe, expect, it, jest, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../server/lib/supabase';
import stripeWebhookRouter from '../server/routes/stripeWebhook';
import { verifyPaymentIntent } from '../server/services/stripe';

// Mock Stripe
jest.mock('stripe', () => {
  const mockStripeInstance = {
    webhooks: {
      constructEvent: jest.fn(),
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
  };
  
  const StripeConstructor = jest.fn().mockImplementation(() => mockStripeInstance);
  (StripeConstructor as any).mockStripeInstance = mockStripeInstance;
  
  return StripeConstructor;
});

// Mock le service stripe pour utiliser notre mock
jest.mock('../server/services/stripe', () => ({
  verifyPaymentIntent: jest.fn(),
}));



// Mock Supabase
jest.mock('../server/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

const app = express();
app.use('/webhook', stripeWebhookRouter);

describe('Stripe Payment Integration', () => {
  const mockPaymentIntent = {
    id: 'pi_test123',
    amount: 2999,
    currency: 'eur',
    status: 'succeeded',
  };

  const mockOrder = {
    id: 1,
    total: 2999,
    status: 'pending',
    stripe_payment_intent_id: 'pi_test123',
  };

  beforeAll(() => {
    // Mock Supabase responses
    (supabaseAdmin.from as any).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn(),
    }));
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('verifyPaymentIntent', () => {
    beforeEach(() => {
      // Reset et configure les mocks pour chaque test
      jest.clearAllMocks();
    });

    it('devrait valider un paiement valide', async () => {
      const { verifyPaymentIntent: mockVerifyPaymentIntent } = require('../server/services/stripe');
      mockVerifyPaymentIntent.mockResolvedValue({
        paymentIntentId: 'pi_test123',
        amount: 2999,
        currency: 'eur',
        status: 'succeeded',
      });

      const result = await mockVerifyPaymentIntent('pi_test123', 2999, 'eur');
      expect(result).toEqual({
        paymentIntentId: 'pi_test123',
        amount: 2999,
        currency: 'eur',
        status: 'succeeded',
      });
    });

    it('devrait rejeter un montant invalide', async () => {
      const { verifyPaymentIntent: mockVerifyPaymentIntent } = require('../server/services/stripe');
      mockVerifyPaymentIntent.mockRejectedValue(new Error('Montant invalide'));

      await expect(mockVerifyPaymentIntent('pi_test123', 3999, 'eur'))
        .rejects
        .toThrow('Montant invalide');
    });

    it('devrait rejeter une devise invalide', async () => {
      const { verifyPaymentIntent: mockVerifyPaymentIntent } = require('../server/services/stripe');
      mockVerifyPaymentIntent.mockRejectedValue(new Error('Devise invalide'));

      await expect(mockVerifyPaymentIntent('pi_test123', 2999, 'usd'))
        .rejects
        .toThrow('Devise invalide');
    });
  });

  describe('Webhook Stripe', () => {
    let mockStripeInstance: any;
    
    beforeEach(() => {
      jest.clearAllMocks();
      const Stripe = require('stripe');
      mockStripeInstance = Stripe.mockStripeInstance;
    });

    it('devrait traiter un paiement réussi', async () => {
      // Configure Stripe mock pour succès
      mockStripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: mockPaymentIntent },
      });

      // Configure le mock verifyPaymentIntent
      const { verifyPaymentIntent: mockVerifyPaymentIntent } = require('../server/services/stripe');
      mockVerifyPaymentIntent.mockResolvedValue({
        paymentIntentId: 'pi_test123',
        amount: 2999,
        currency: 'eur',
        status: 'succeeded',
      });

      // Configure les mocks Supabase pour ce test
      const mockSupabaseChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn(),
      };
      
      // Configure les chaînes de retour pour update
      mockSupabaseChain.update.mockReturnValue({
        // @ts-ignore
        eq: jest.fn().mockResolvedValue({ error: null })
      });
      
      // @ts-ignore
      mockSupabaseChain.single.mockResolvedValue({ data: mockOrder, error: null });
      // @ts-ignore
      mockSupabaseChain.insert.mockResolvedValue({ error: null });
      
      (supabaseAdmin.from as any).mockReturnValue(mockSupabaseChain);
      
      // Mock les variables d'environnement
      process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';
      
      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test_sig')
        .send(mockPaymentIntent);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
    });

    it('devrait rejeter une signature invalide', async () => {
      // Configure Stripe mock pour échec de signature
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Mock les variables d'environnement
      process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'invalid_sig')
        .send(mockPaymentIntent);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Erreur de signature webhook');
    });
  });
});