import express from 'express';
import { getCurrentUser, isAuthenticated } from '../auth';

const router = express.Router();

// Get PayPal configuration
router.get('/config', async (req, res) => {
  try {
    const config = {
      clientId: process.env.VITE_PAYPAL_CLIENT_ID,
      currency: 'EUR',
      intent: 'capture',
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
    };

    res.json(config);
  } catch (error: any) {
    console.error('PayPal config error:', error);
    res.status(500).json({ error: 'Failed to get PayPal configuration' });
  }
});

// Create PayPal order
router.post('/create-order', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { amount, currency = 'EUR', items } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Simuler la création d'une commande PayPal
    // En production, utilisez le SDK PayPal officiel
    const order = {
      id: `PAYPAL_ORDER_${Date.now()}`,
      status: 'CREATED',
      amount: {
        currency_code: currency,
        value: amount.toString()
      },
      items: items || [],
      create_time: new Date().toISOString(),
      intent: 'CAPTURE'
    };

    res.json(order);
  } catch (error: any) {
    console.error('PayPal create order error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// Capture PayPal payment
router.post('/capture-order', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Simuler la capture du paiement PayPal
    // En production, utilisez le SDK PayPal officiel
    const capture = {
      id: `PAYPAL_CAPTURE_${Date.now()}`,
      status: 'COMPLETED',
      amount: {
        currency_code: 'EUR',
        value: '50.00'
      },
      create_time: new Date().toISOString(),
      order_id: orderID
    };

    res.json(capture);
  } catch (error: any) {
    console.error('PayPal capture error:', error);
    res.status(500).json({ error: 'Failed to capture PayPal payment' });
  }
});

// Get PayPal payment history
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Simuler l'historique des paiements PayPal
    const history = [
      {
        id: 'PAYPAL_1',
        amount: '29.99',
        currency: 'EUR',
        status: 'COMPLETED',
        date: '2025-07-26T10:00:00Z',
        description: 'Abonnement Pro - Mensuel'
      },
      {
        id: 'PAYPAL_2',
        amount: '19.99',
        currency: 'EUR',
        status: 'COMPLETED',
        date: '2025-07-25T15:30:00Z',
        description: 'Achat beat - AURORA Vol.1'
      }
    ];

    res.json(history);
  } catch (error: any) {
    console.error('PayPal history error:', error);
    res.status(500).json({ error: 'Failed to get PayPal history' });
  }
});

export default router; 