import { Router } from 'express';
import { generateBeatSchemaMarkup, generateBeatsListSchemaMarkup, generateOrganizationSchemaMarkup } from '../lib/schemaMarkup';

const router = Router();

// WooCommerce API helpers
async function wcApiRequest(endpoint: string, options: RequestInit = {}) {
  const WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL || 'https://brolabentertainment.com/wp-json/wc/v3';
  const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    throw new Error('WooCommerce API credentials not configured');
  }

  const url = new URL(`${WOOCOMMERCE_API_URL}${endpoint}`);
  url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
  url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
  
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'BroLab-Frontend/1.0',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Base URL pour les liens
const BASE_URL = process.env.FRONTEND_URL || 'https://brolabentertainment.com';

/**
 * GET /api/schema/beat/:id
 * Génère le Schema markup JSON-LD pour un beat spécifique
 */
router.get('/beat/:id', async (req, res) => {
  try {
    const beatId = req.params.id;
    
    // Récupérer les données du beat depuis WooCommerce
    let product;
    try {
      product = await wcApiRequest(`/products/${beatId}`);
    } catch (error: any) {
      if (error.message?.includes('404')) {
        return res.status(404).json({ error: 'Beat not found' });
      }
      throw error;
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Beat not found' });
    }

    // Transformer les données WooCommerce en format BeatProduct
    const beat = {
      id: product.id,
      title: product.name,
      description: product.description,
      genre: product.categories?.[0]?.name || 'Unknown',
      bpm: product.bpm || product.meta_data?.find((meta: any) => meta.key === "bpm")?.value || null,
      key: product.key || product.meta_data?.find((meta: any) => meta.key === "key")?.value || null,
      mood: product.mood || product.meta_data?.find((meta: any) => meta.key === "mood")?.value || null,
      price: parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      audio_url: product.audio_url,
      tags: product.tags?.map((tag: any) => tag.name) || [],
      duration: product.duration || null,
      downloads: product.downloads || 0
    };

    // Générer le Schema markup avec les offres incluses
    const schemaMarkup = generateBeatSchemaMarkup(beat, BASE_URL, {
      includeOffers: true,
      includeAggregateRating: true
    });

    // Retourner le JSON-LD avec les bons headers
    res.setHeader('Content-Type', 'application/ld+json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 heure
    res.send(schemaMarkup);

  } catch (error: any) {
    console.error('Error generating beat schema markup:', error);
    res.status(500).json({ error: 'Failed to generate schema markup' });
  }
});

/**
 * GET /api/schema/beats-list
 * Génère le Schema markup JSON-LD pour la liste des beats
 */
router.get('/beats-list', async (req, res) => {
  try {
    // Récupérer la liste des beats depuis WooCommerce
    const products = await wcApiRequest('/products');
    
    if (!products || products.length === 0) {
      return res.status(404).json({ error: 'No beats found' });
    }

    // Transformer les données WooCommerce
    const beats = products.map((product: any) => ({
      id: product.id,
      title: product.name,
      description: product.description,
      genre: product.categories?.[0]?.name || 'Unknown',
      bpm: product.bpm || product.meta_data?.find((meta: any) => meta.key === "bpm")?.value || null,
      key: product.key || product.meta_data?.find((meta: any) => meta.key === "key")?.value || null,
      mood: product.mood || product.meta_data?.find((meta: any) => meta.key === "mood")?.value || null,
      price: parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      audio_url: product.audio_url,
      tags: product.tags?.map((tag: any) => tag.name) || [],
      duration: product.duration || null,
      downloads: product.downloads || 0
    }));

    // Générer le Schema markup pour la liste
    const schemaMarkup = generateBeatsListSchemaMarkup(beats, BASE_URL, 'BroLab Beats Collection');

    // Retourner le JSON-LD avec cache
    res.setHeader('Content-Type', 'application/ld+json');
    res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache 30 minutes
    res.send(schemaMarkup);

  } catch (error: any) {
    console.error('Error generating beats list schema markup:', error);
    res.status(500).json({ error: 'Failed to generate schema markup' });
  }
});

/**
 * GET /api/schema/organization
 * Génère le Schema markup JSON-LD pour l'organisation BroLab
 */
router.get('/organization', async (req, res) => {
  try {
    const schemaMarkup = generateOrganizationSchemaMarkup(BASE_URL);

    // Retourner le JSON-LD avec cache long
    res.setHeader('Content-Type', 'application/ld+json');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24 heures
    res.send(schemaMarkup);

  } catch (error: any) {
    console.error('Error generating organization schema markup:', error);
    res.status(500).json({ error: 'Failed to generate schema markup' });
  }
});

export default router; 