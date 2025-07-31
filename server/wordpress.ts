import { config } from 'dotenv';
import type { Express } from "express";

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

// Helper function to proxy audio URLs
function proxyAudioUrl(originalUrl: string | null): string | null {
  if (!originalUrl) return null;
  
  console.log('🔗 Original audio URL:', originalUrl);
  
  // Return the original URL directly - no proxy needed
  return originalUrl;
}

function proxyImageUrl(originalUrl: string | null): string | null {
  if (!originalUrl) return null;
  
  console.log('🖼️ Original image URL:', originalUrl);
  
  // If it's already a full URL, return as is
  if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
    return originalUrl;
  }
  
  // If it's a relative URL, proxy it through our server
  return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
}

// Fonctions d'extraction des métadonnées pour le filtrage côté serveur
function extractInstruments(product: any): string[] | null {
  const instruments = product.meta_data?.find((meta: any) => meta.key === 'instruments')?.value;
  if (instruments) {
    return typeof instruments === 'string' ? instruments.split(',') : instruments;
  }
  return null;
}

function extractTags(product: any): string[] | null {
  return product.tags?.map((tag: any) => tag.name) || null;
}

function extractTimeSignature(product: any): string | null {
  return product.meta_data?.find((meta: any) => meta.key === 'time_signature')?.value ||
         product.attributes?.find((attr: any) => attr.name === 'Time Signature')?.options?.[0] ||
         null;
}

function extractDuration(product: any): number | null {
  return product.meta_data?.find((meta: any) => meta.key === 'duration')?.value ||
         product.attributes?.find((attr: any) => attr.name === 'Duration')?.options?.[0] ||
         null;
}

function extractHasVocals(product: any): boolean {
  return product.meta_data?.find((meta: any) => meta.key === 'has_vocals')?.value === 'true' ||
         product.tags?.some((tag: any) => tag.name.toLowerCase().includes('vocals')) ||
         false;
}

function extractStems(product: any): boolean {
  return product.meta_data?.find((meta: any) => meta.key === 'stems')?.value === 'true' ||
         product.tags?.some((tag: any) => tag.name.toLowerCase().includes('stems')) ||
         false;
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
  // Image proxy route
  app.get('/api/proxy/image', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      console.log('🖼️ Proxying image:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch image' });
      }

      const contentType = response.headers.get('content-type');
      const buffer = await response.arrayBuffer();

      res.setHeader('Content-Type', contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error('Error proxying image:', error);
      res.status(500).json({ error: error.message });
    }
  });

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
      // Construire la requête WooCommerce API avec filtrage natif
      const queryParams = new URLSearchParams();
      
      // Paramètres WooCommerce API natifs
      if (req.query.search) queryParams.append('search', req.query.search as string);
      if (req.query.category) queryParams.append('category', req.query.category as string);
      if (req.query.min_price) queryParams.append('min_price', req.query.min_price as string);
      if (req.query.max_price) queryParams.append('max_price', req.query.max_price as string);
      if (req.query.per_page) queryParams.append('per_page', req.query.per_page as string);
      if (req.query.page) queryParams.append('page', req.query.page as string);
      if (req.query.orderby) queryParams.append('orderby', req.query.orderby as string);
      if (req.query.order) queryParams.append('order', req.query.order as string);
      
      // Filtrage par métadonnées via WooCommerce API meta_query
      const metaQueries: any[] = [];
      
      // BPM Range
      if (req.query.bpm_min || req.query.bpm_max) {
        const bpmQuery: any = {
          key: 'bpm',
          type: 'NUMERIC'
        };
        if (req.query.bpm_min) bpmQuery.value = req.query.bpm_min;
        if (req.query.bpm_max) bpmQuery.value = req.query.bpm_max;
        if (req.query.bpm_min && req.query.bpm_max) {
          bpmQuery.compare = 'BETWEEN';
        } else if (req.query.bpm_min) {
          bpmQuery.compare = '>=';
        } else if (req.query.bpm_max) {
          bpmQuery.compare = '<=';
        }
        metaQueries.push(bpmQuery);
      }
      
      // Key
      if (req.query.key) {
        metaQueries.push({
          key: 'key',
          value: req.query.key,
          compare: '='
        });
      }
      
      // Mood
      if (req.query.mood) {
        metaQueries.push({
          key: 'mood',
          value: req.query.mood,
          compare: '='
        });
      }
      
      // Producer
      if (req.query.producer) {
        metaQueries.push({
          key: 'producer',
          value: req.query.producer,
          compare: '='
        });
      }
      
      // Duration Range
      if (req.query.duration_min || req.query.duration_max) {
        const durationQuery: any = {
          key: 'duration',
          type: 'NUMERIC'
        };
        if (req.query.duration_min) durationQuery.value = req.query.duration_min;
        if (req.query.duration_max) durationQuery.value = req.query.duration_max;
        if (req.query.duration_min && req.query.duration_max) {
          durationQuery.compare = 'BETWEEN';
        } else if (req.query.duration_min) {
          durationQuery.compare = '>=';
        } else if (req.query.duration_max) {
          durationQuery.compare = '<=';
        }
        metaQueries.push(durationQuery);
      }
      
      // Has Vocals
      if (req.query.has_vocals === 'true') {
        metaQueries.push({
          key: 'has_vocals',
          value: 'true',
          compare: '='
        });
      }
      
      // Stems
      if (req.query.stems === 'true') {
        metaQueries.push({
          key: 'stems',
          value: 'true',
          compare: '='
        });
      }
      
      // Ajouter meta_query si des filtres de métadonnées sont présents
      if (metaQueries.length > 0) {
        queryParams.append('meta_query', JSON.stringify({
          relation: 'AND',
          ...metaQueries
        }));
      }
      
      // Filtrage par tags (WooCommerce API native)
      if (req.query.tags) {
        const tags = (req.query.tags as string).split(',');
        queryParams.append('tag', tags.join(','));
      }
      
      // Filtrage par attributs (WooCommerce API native)
      if (req.query.keys) {
        const keys = (req.query.keys as string).split(',');
        queryParams.append('attribute', JSON.stringify({
          name: 'Key',
          option: keys
        }));
      }
      
      if (req.query.moods) {
        const moods = (req.query.moods as string).split(',');
        queryParams.append('attribute', JSON.stringify({
          name: 'Mood',
          option: moods
        }));
      }
      
      if (req.query.producers) {
        const producers = (req.query.producers as string).split(',');
        queryParams.append('attribute', JSON.stringify({
          name: 'Producer',
          option: producers
        }));
      }
      
      if (req.query.instruments) {
        const instruments = (req.query.instruments as string).split(',');
        queryParams.append('attribute', JSON.stringify({
          name: 'Instruments',
          option: instruments
        }));
      }
      
      if (req.query.time_signature) {
        const timeSignatures = (req.query.time_signature as string).split(',');
        queryParams.append('attribute', JSON.stringify({
          name: 'Time Signature',
          option: timeSignatures
        }));
      }
      
      const queryString = queryParams.toString();
      const products = await wcApiRequest(`/products?${queryString}`);
      
      // Filtrage côté serveur pour les cas non supportés par WooCommerce API
      let filteredProducts = products;
      
      // Is Free (filtrage côté serveur car WooCommerce API ne le supporte pas bien)
      if (req.query.is_free === 'true') {
        filteredProducts = products.filter((product: any) => {
          const isFree = product.tags?.some((tag: any) => tag.name.toLowerCase() === 'free') || 
                         product.price === 0 || 
                         product.price === '0' || 
                         parseFloat(product.price) === 0 || 
                         false;
          return isFree;
        });
      }
      
      // Transform products data to match frontend expectations
      const transformedProducts = filteredProducts.map((product: any) => {
        // Extract audio URL from various possible sources
        let audioUrl = null;
        
        // Try to find audio URL from meta_data - prioritize alb_tracklist
        const albTracklistMeta = product.meta_data?.find((meta: any) => meta.key === 'alb_tracklist');
        const audioUrlMeta = product.meta_data?.find((meta: any) => 
          meta.key === 'audio_url' || 
          meta.key === 'sonaar_audio_file'
        );
        
        // Try alb_tracklist first (contains actual audio URLs)
        if (albTracklistMeta && albTracklistMeta.value) {
          try {
            // Handle Sonaar data structure
            let sonaarData;
            if (typeof albTracklistMeta.value === 'string') {
              // If it's a string, try to parse as JSON
              sonaarData = JSON.parse(albTracklistMeta.value);
            } else {
              // If it's already an object (like alb_tracklist), use it directly
              sonaarData = albTracklistMeta.value;
            }
            
            if (sonaarData && Array.isArray(sonaarData) && sonaarData.length > 0) {
              // Get the first track's audio URL
              const firstTrack = sonaarData[0];
              audioUrl = firstTrack.track_mp3 || firstTrack.audio_preview || firstTrack.src || firstTrack.url;
            } else if (sonaarData && typeof sonaarData === 'object') {
              // Handle single track object
              audioUrl = sonaarData.track_mp3 || sonaarData.audio_preview || sonaarData.src || sonaarData.url;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        // If no audio URL found, try other sources
        if (!audioUrl && audioUrlMeta) {
          audioUrl = audioUrlMeta.value;
        }
        
        // Extraire les métadonnées pour l'affichage (plus de filtrage côté serveur)
        const productBpm = product.meta_data?.find((meta: any) => meta.key === 'bpm' || meta.key === 'BPM')?.value || 
                          product.attributes?.find((attr: any) => attr.name === 'BPM')?.options?.[0] || null;
        const productKey = product.meta_data?.find((meta: any) => meta.key === 'key' || meta.key === 'Key')?.value || 
                          product.attributes?.find((attr: any) => attr.name === 'Key')?.options?.[0] || null;
        const productMood = product.meta_data?.find((meta: any) => meta.key === 'mood' || meta.key === 'Mood')?.value || 
                           product.attributes?.find((attr: any) => attr.name === 'Mood')?.options?.[0] || null;
        const productProducer = product.meta_data?.find((meta: any) => meta.key === 'producer')?.value || 
                              product.attributes?.find((attr: any) => attr.name === 'Producer')?.options?.[0] || null;
        const productIsFree = product.tags?.some((tag: any) => tag.name.toLowerCase() === 'free') || 
                             product.price === 0 || 
                             product.price === '0' || 
                             parseFloat(product.price) === 0 || 
                             false;

        return {
          ...product,
          // Keep prices in dollar format as provided by WooCommerce
          price: product.price ? parseFloat(product.price) : 0,
          regular_price: product.regular_price ? parseFloat(product.regular_price) : 0,
          sale_price: product.sale_price ? parseFloat(product.sale_price) : 0,
          // Ensure images are properly formatted and proxied
          images: (product.images || []).map((img: any) => ({
            ...img,
            src: proxyImageUrl(img.src)
          })),
          // Ensure categories are properly formatted
          categories: product.categories || [],
          // Extract audio URL from various sources and proxy it
          audio_url: proxyAudioUrl(audioUrl),
          // Extract BPM, Key, Mood from meta_data if available
          bpm: productBpm,
          key: productKey,
          mood: productMood,
          // Check if product has FREE tag or is priced at 0
          is_free: productIsFree
        };
      });
      
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
        // Extract audio URL using the same logic as the products list
        audio_url: (() => {
          let audioUrl = null;
          
          // Find alb_tracklist metadata (Sonaar plugin)
          const albTracklistMeta = product.meta_data?.find((meta: any) => 
            meta.key === 'alb_tracklist' || 
            meta.key === 'tracklist' ||
            meta.key === 'sonaar_tracklist'
          );
          
          // Find other audio URL metadata
          const audioUrlMeta = product.meta_data?.find((meta: any) => 
            meta.key === 'audio_url' || 
            meta.key === 'audio_preview' ||
            meta.key === 'track_mp3'
          );
          
          // Try alb_tracklist first (contains actual audio URLs)
          if (albTracklistMeta && albTracklistMeta.value) {
            try {
              let sonaarData;
              if (typeof albTracklistMeta.value === 'string') {
                sonaarData = JSON.parse(albTracklistMeta.value);
              } else {
                sonaarData = albTracklistMeta.value;
              }
              
              if (sonaarData && Array.isArray(sonaarData) && sonaarData.length > 0) {
                const firstTrack = sonaarData[0];
                audioUrl = firstTrack.track_mp3 || firstTrack.audio_preview || firstTrack.src || firstTrack.url;
              } else if (sonaarData && typeof sonaarData === 'object') {
                audioUrl = sonaarData.track_mp3 || sonaarData.audio_preview || sonaarData.src || sonaarData.url;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          
          // If no audio URL found, try other sources
          if (!audioUrl && audioUrlMeta) {
            audioUrl = audioUrlMeta.value;
          }
          
          return proxyAudioUrl(audioUrl);
        })(),
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