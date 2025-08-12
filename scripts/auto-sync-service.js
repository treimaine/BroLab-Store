#!/usr/bin/env node

/**
 * Service de synchronisation automatique
 * Surveille les changements WordPress et synchronise automatiquement
 */

import express from 'express';
import cron from 'node-cron';
import { syncAllProducts, syncSingleProduct } from './sync-beats-wordpress-to-supabase.js';

const app = express();
app.use(express.json());

// Webhook WordPress pour synchronisation en temps réel
app.post('/webhook/wordpress-product-updated', async (req, res) => {
  try {
    const { product_id, action } = req.body;
    
    console.log(`🔔 Webhook reçu: ${action} pour produit ${product_id}`);
    
    if (action === 'updated' || action === 'created') {
      await syncSingleProduct(product_id);
      console.log(`✅ Produit ${product_id} synchronisé via webhook`);
    }
    
    res.json({ success: true, message: 'Synchronisation terminée' });
    
  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Synchronisation programmée (toutes les heures)
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Synchronisation programmée démarrée');
  try {
    await syncAllProducts();
    console.log('✅ Synchronisation programmée terminée');
  } catch (error) {
    console.error('❌ Erreur synchronisation programmée:', error);
  }
});

// API pour déclencher une synchronisation manuelle
app.post('/api/sync/all', async (req, res) => {
  try {
    console.log('🔄 Synchronisation manuelle déclenchée');
    await syncAllProducts();
    res.json({ success: true, message: 'Synchronisation terminée' });
  } catch (error) {
    console.error('❌ Erreur synchronisation manuelle:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sync/product/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`🔄 Synchronisation manuelle du produit ${productId}`);
    await syncSingleProduct(productId);
    res.json({ success: true, message: `Produit ${productId} synchronisé` });
  } catch (error) {
    console.error(`❌ Erreur synchronisation produit ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Démarrage du service
const PORT = process.env.SYNC_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Service de synchronisation démarré sur le port ${PORT}`);
  console.log('⏰ Synchronisation programmée: toutes les heures');
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook/wordpress-product-updated`);
});

export default app;