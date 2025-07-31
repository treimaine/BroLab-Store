import { Router } from 'express';
import {
  generateBeatOpenGraph,
  generateHomeOpenGraph,
  generateOpenGraphHTML,
  generateShopOpenGraph,
  generateStaticPageOpenGraph,
  type OpenGraphConfig
} from '../lib/openGraphGenerator';

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

// Configuration Open Graph
const openGraphConfig: OpenGraphConfig = {
  baseUrl: process.env.FRONTEND_URL || 'https://brolabentertainment.com',
  siteName: 'BroLab Entertainment',
  defaultImage: 'https://brolabentertainment.com/logo.png',
  twitterHandle: '@brolabentertainment'
};

/**
 * GET /api/opengraph/beat/:id
 * Génère les meta tags Open Graph pour un beat spécifique
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

    // Transformer les données WooCommerce
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

    // Générer les meta tags Open Graph
    const openGraphMeta = generateBeatOpenGraph(beat, openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);

    // Retourner le HTML avec les bons headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 heure
    res.send(openGraphHTML);

  } catch (error: any) {
    console.error('Error generating Open Graph for beat:', error);
    res.status(500).json({ error: 'Failed to generate Open Graph' });
  }
});

/**
 * GET /api/opengraph/shop
 * Génère les meta tags Open Graph pour la page shop
 */
router.get('/shop', async (req, res) => {
  try {
    const openGraphMeta = generateShopOpenGraph(openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(openGraphHTML);

  } catch (error: any) {
    console.error('Error generating Open Graph for shop:', error);
    res.status(500).json({ error: 'Failed to generate Open Graph' });
  }
});

/**
 * GET /api/opengraph/home
 * Génère les meta tags Open Graph pour la page d'accueil
 */
router.get('/home', async (req, res) => {
  try {
    const openGraphMeta = generateHomeOpenGraph(openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(openGraphHTML);

  } catch (error: any) {
    console.error('Error generating Open Graph for home:', error);
    res.status(500).json({ error: 'Failed to generate Open Graph' });
  }
});

/**
 * GET /api/opengraph/page/:pageName
 * Génère les meta tags Open Graph pour une page statique
 */
router.get('/page/:pageName', async (req, res) => {
  try {
    const pageName = req.params.pageName as 'about' | 'contact' | 'terms' | 'privacy' | 'license';
    
    // Vérifier que la page est valide
    const validPages = ['about', 'contact', 'terms', 'privacy', 'license'];
    if (!validPages.includes(pageName)) {
      return res.status(400).json({ error: 'Invalid page name' });
    }

    const openGraphMeta = generateStaticPageOpenGraph(pageName, openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(openGraphHTML);

  } catch (error: any) {
    console.error('Error generating Open Graph for page:', error);
    res.status(500).json({ error: 'Failed to generate Open Graph' });
  }
});

export default router; 