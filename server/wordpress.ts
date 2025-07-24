import type { Express } from "express";
import { config } from 'dotenv';

// Ensure environment variables are loaded
config();

// WordPress API credentials - should be set in environment variables
const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || 'https://brolabentertainment.com/wp-json/wp/v2';
const WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL || 'https://brolabentertainment.com/wp-json/wc/v3';
const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

// Debug environment loading
console.log('WordPress module loaded - API credentials:', {
  wordpressUrl: WORDPRESS_API_URL,
  woocommerceUrl: WOOCOMMERCE_API_URL,
  consumerKey: WC_CONSUMER_KEY ? 'present' : 'missing',
  consumerSecret: WC_CONSUMER_SECRET ? 'present' : 'missing'
});

// WordPress REST API helpers
async function wpApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${WORDPRESS_API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'BroLab-Frontend/1.0',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// WooCommerce REST API helpers
async function wcApiRequest(endpoint: string, options: RequestInit = {}) {
  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.error('WooCommerce credentials check:', {
      key: WC_CONSUMER_KEY ? 'present' : 'missing',
      secret: WC_CONSUMER_SECRET ? 'present' : 'missing',
      env_key: process.env.WOOCOMMERCE_CONSUMER_KEY ? 'present' : 'missing',
      env_secret: process.env.WOOCOMMERCE_CONSUMER_SECRET ? 'present' : 'missing'
    });
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

export function registerWordPressRoutes(app: Express) {
  // WordPress Pages
  app.get('/api/wordpress/pages', async (req, res) => {
    try {
      const pages = await wpApiRequest('/pages');
      res.json(pages);
    } catch (error: any) {
      console.error('Error fetching pages:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/wordpress/pages/:slug', async (req, res) => {
    try {
      const pages = await wpApiRequest(`/pages?slug=${req.params.slug}`);
      if (pages.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }
      res.json(pages[0]);
    } catch (error: any) {
      console.error('Error fetching page:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // WordPress Posts
  app.get('/api/wordpress/posts', async (req, res) => {
    try {
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const posts = await wpApiRequest(`/posts?${queryString}`);
      res.json(posts);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/wordpress/posts/:id', async (req, res) => {
    try {
      const post = await wpApiRequest(`/posts/${req.params.id}`);
      res.json(post);
    } catch (error: any) {
      console.error('Error fetching post:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // WordPress Media
  app.get('/api/wordpress/media/:id', async (req, res) => {
    try {
      const media = await wpApiRequest(`/media/${req.params.id}`);
      res.json(media);
    } catch (error: any) {
      console.error('Error fetching media:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // WooCommerce Products
  app.get('/api/woocommerce/products', async (req, res) => {
    try {
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const products = await wcApiRequest(`/products?${queryString}`);
      
      // Transform products data to match frontend expectations
      const transformedProducts = products.map((product: any) => ({
        ...product,
        // Keep prices in dollar format as provided by WooCommerce
        price: product.price ? parseFloat(product.price) : 0,
        regular_price: product.regular_price ? parseFloat(product.regular_price) : 0,
        sale_price: product.sale_price ? parseFloat(product.sale_price) : 0,
        // Ensure images are properly formatted
        images: product.images || [],
        // Ensure categories are properly formatted
        categories: product.categories || [],
        // Extract additional metadata from WooCommerce
        audio_url: product.meta_data?.find((meta: any) => meta.key === 'audio_url')?.value || null,
        // Extract BPM, Key, Mood from meta_data if available
        bpm: product.meta_data?.find((meta: any) => meta.key === 'bpm' || meta.key === 'BPM')?.value || 
             product.attributes?.find((attr: any) => attr.name === 'BPM')?.options?.[0] || null,
        key: product.meta_data?.find((meta: any) => meta.key === 'key' || meta.key === 'Key')?.value || 
             product.attributes?.find((attr: any) => attr.name === 'Key')?.options?.[0] || null,
        mood: product.meta_data?.find((meta: any) => meta.key === 'mood' || meta.key === 'Mood')?.value || 
              product.attributes?.find((attr: any) => attr.name === 'Mood')?.options?.[0] || null,
        // Check if product has FREE tag or is priced at 0
        is_free: product.tags?.some((tag: any) => tag.name.toLowerCase() === 'free') || 
                 product.price === 0 || 
                 product.price === '0' || 
                 parseFloat(product.price) === 0 || 
                 false
      }));
      
      res.json(transformedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/woocommerce/products/:id', async (req, res) => {
    try {
      const productId = req.params.id;
      if (!productId || productId === '0') {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      
      const product = await wcApiRequest(`/products/${productId}`);
      
      // Transform product data to match frontend expectations
      const transformedProduct = {
        ...product,
        // Keep prices in dollar format as provided by WooCommerce
        price: product.price ? parseFloat(product.price) : 0,
        regular_price: product.regular_price ? parseFloat(product.regular_price) : 0,
        sale_price: product.sale_price ? parseFloat(product.sale_price) : 0,
        // Ensure images are properly formatted
        images: product.images || [],
        // Ensure categories are properly formatted
        categories: product.categories || [],
        // Extract additional metadata from WooCommerce
        audio_url: product.meta_data?.find((meta: any) => meta.key === 'audio_url')?.value || null,
        // Extract BPM, Key, Mood from meta_data if available
        bpm: product.meta_data?.find((meta: any) => meta.key === 'bpm' || meta.key === 'BPM')?.value || 
             product.attributes?.find((attr: any) => attr.name === 'BPM')?.options?.[0] || null,
        key: product.meta_data?.find((meta: any) => meta.key === 'key' || meta.key === 'Key')?.value || 
             product.attributes?.find((attr: any) => attr.name === 'Key')?.options?.[0] || null,
        mood: product.meta_data?.find((meta: any) => meta.key === 'mood' || meta.key === 'Mood')?.value || 
              product.attributes?.find((attr: any) => attr.name === 'Mood')?.options?.[0] || null,
        // Check if product has FREE tag or is priced at 0
        is_free: product.tags?.some((tag: any) => tag.name.toLowerCase() === 'free') || 
                 product.price === 0 || 
                 product.price === '0' || 
                 parseFloat(product.price) === 0 || 
                 false
      };
      
      res.json(transformedProduct);
    } catch (error: any) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // WooCommerce Categories
  app.get('/api/woocommerce/categories', async (req, res) => {
    try {
      const categories = await wcApiRequest('/products/categories');
      res.json(categories);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // WooCommerce Orders
  app.post('/api/woocommerce/orders', async (req, res) => {
    try {
      const order = await wcApiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.json(order);
    } catch (error: any) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // WooCommerce Customers
  app.post('/api/woocommerce/customers', async (req, res) => {
    try {
      const customer = await wcApiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.json(customer);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: error.message });
    }
  });
}