// server/routes/woo.ts
import { Router } from 'express';
import { fetchWooCategories, fetchWooProduct, fetchWooProducts } from '../services/woo';

const router = Router();

router.get('/products', async (req, res, next) => {
  try {
    // Check if WooCommerce is configured
    if (!process.env.WOOCOMMERCE_API_URL || !process.env.VITE_WC_KEY || !process.env.WOOCOMMERCE_CONSUMER_SECRET) {
      console.log('⚠️ WooCommerce not configured, returning sample data');
      
      // Return sample data for testing
      const sampleProducts = [
        {
          id: 1,
          name: "Sample Beat 1",
          price: "29.99",
          regular_price: "39.99",
          sale_price: "29.99",
          description: "A sample beat for testing",
          short_description: "Sample beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Hip Hop" }],
          meta_data: [
            { key: "bpm", value: "140" },
            { key: "key", value: "C" },
            { key: "mood", value: "Energetic" },
            { key: "instruments", value: "Drums, Bass, Synth" },
            { key: "duration", value: "3:45" },
            { key: "has_vocals", value: "no" },
            { key: "stems", value: "yes" }
          ],
          tags: [],
          total_sales: 0,
          hasVocals: false,
          stems: true,
          bpm: "140",
          key: "C",
          mood: "Energetic",
          instruments: "Drums, Bass, Synth",
          duration: "3:45",
          is_free: false
        },
        {
          id: 2,
          name: "Sample Beat 2",
          price: "0",
          regular_price: "0",
          sale_price: "0",
          description: "A free sample beat",
          short_description: "Free beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Trap" }],
          meta_data: [
            { key: "bpm", value: "150" },
            { key: "key", value: "F" },
            { key: "mood", value: "Dark" },
            { key: "instruments", value: "Drums, 808, Hi-hats" },
            { key: "duration", value: "2:30" },
            { key: "has_vocals", value: "yes" },
            { key: "stems", value: "no" }
          ],
          tags: [],
          total_sales: 0,
          hasVocals: true,
          stems: false,
          bpm: "150",
          key: "F",
          mood: "Dark",
          instruments: "Drums, 808, Hi-hats",
          duration: "2:30",
          is_free: true
        }
      ];
      
      return res.json(sampleProducts);
    }
    
    const wooProducts = await fetchWooProducts(req.query);
    
    // Mapper les produits WooCommerce vers le format attendu
    const beats = wooProducts.map((product: any) => {
      // Extraction robuste de l'URL audio
      let audioUrl = null;
      const albTracklistMeta = product.meta_data?.find((meta: any) => meta.key === 'alb_tracklist');
      const audioUrlMeta = product.meta_data?.find((meta: any) => meta.key === 'audio_url');
      
      console.log(`🔍 Product ${product.id} - alb_tracklist found:`, !!albTracklistMeta);
      
      if (albTracklistMeta && albTracklistMeta.value) {
        let sonaarData = albTracklistMeta.value;
        try {
          if (typeof sonaarData === 'string') {
            sonaarData = JSON.parse(sonaarData);
          }
        } catch (e) {
          console.error(`❌ Error parsing alb_tracklist for product ${product.id}:`, e);
        }
        
        console.log(`📊 Product ${product.id} - sonaarData type:`, typeof sonaarData, Array.isArray(sonaarData));
        
        // Si c'est un tableau (plus courant)
        if (Array.isArray(sonaarData) && sonaarData.length > 0) {
          const firstTrack = sonaarData[0];
          audioUrl = firstTrack.audio_preview || firstTrack.track_mp3 || firstTrack.src || firstTrack.url;
          console.log(`🎵 Product ${product.id} - Found audio URL (array):`, audioUrl);
        } else if (sonaarData && typeof sonaarData === 'object') {
          // Si c'est un objet unique
          audioUrl = sonaarData.audio_preview || sonaarData.track_mp3 || sonaarData.src || sonaarData.url;
          console.log(`🎵 Product ${product.id} - Found audio URL (object):`, audioUrl);
        } else {
          console.log(`❌ Product ${product.id} - No valid audio data found`);
        }
      } else {
        console.log(`❌ Product ${product.id} - No alb_tracklist found`);
      }
      
      // Fallback sur meta_data.audio_url si rien trouvé
      if (!audioUrl && audioUrlMeta) {
        audioUrl = audioUrlMeta.value;
        console.log(`🎵 Product ${product.id} - Fallback audio URL:`, audioUrl);
      }
      
      console.log(`✅ Product ${product.id} - Final audio_url:`, audioUrl);
      
      // Extraction directe basée sur la structure connue
      let directAudioUrl = null;
      if (product.meta_data) {
        const albTracklistMeta = product.meta_data.find((meta: any) => meta.key === 'alb_tracklist');
        if (albTracklistMeta && albTracklistMeta.value) {
          try {
            let trackData = albTracklistMeta.value;
            if (typeof trackData === 'string') {
              trackData = JSON.parse(trackData);
            }
            if (Array.isArray(trackData) && trackData.length > 0) {
              directAudioUrl = trackData[0].audio_preview || trackData[0].track_mp3;
            }
          } catch (e) {
            console.error(`Error parsing track data for product ${product.id}:`, e);
          }
        }
      }
      
      // Extraction directe basée sur la structure connue
      let finalAudioUrl = null;
      
      // Chercher directement dans alb_tracklist
      if (product.meta_data) {
        const albTracklistMeta = product.meta_data.find((meta: any) => meta.key === 'alb_tracklist');
        if (albTracklistMeta && albTracklistMeta.value) {
          try {
            let trackData = albTracklistMeta.value;
            if (typeof trackData === 'string') {
              trackData = JSON.parse(trackData);
            }
            if (Array.isArray(trackData) && trackData.length > 0) {
              finalAudioUrl = trackData[0].audio_preview || trackData[0].track_mp3;
            }
          } catch (e) {
            console.error(`Error parsing track data for product ${product.id}:`, e);
          }
        }
      }
      
      // Si pas trouvé, utiliser la logique précédente
      if (!finalAudioUrl) {
        finalAudioUrl = directAudioUrl || audioUrl || null;
      }
      
      console.log(`🎯 Product ${product.id} - FINAL audio_url:`, finalAudioUrl);
      
      // Forcer l'ajout du champ audio_url
      const productWithAudio = {
        ...product,
        audio_url: finalAudioUrl,
        hasVocals: product.meta_data?.find((meta: any) => meta.key === 'has_vocals')?.value === 'yes' || 
                  product.tags?.some((tag: any) => tag.name.toLowerCase().includes('vocals')),
        stems: product.meta_data?.find((meta: any) => meta.key === 'stems')?.value === 'yes' || 
               product.tags?.some((tag: any) => tag.name.toLowerCase().includes('stems')),
        bpm: product.meta_data?.find((meta: any) => meta.key === 'bpm')?.value,
        key: product.meta_data?.find((meta: any) => meta.key === 'key')?.value,
        mood: product.meta_data?.find((meta: any) => meta.key === 'mood')?.value,
        instruments: product.meta_data?.find((meta: any) => meta.key === 'instruments')?.value,
        duration: product.meta_data?.find((meta: any) => meta.key === 'duration')?.value,
        is_free: product.price === '0' || product.price === ''
      };
      
      console.log(`🎯 Product ${product.id} - audio_url field added:`, !!productWithAudio.audio_url);
      
      return productWithAudio;
    });
    
    res.json(beats);
  } catch (e) { 
    console.error('Error fetching products:', e);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    // Check if WooCommerce is configured
    if (!process.env.WOOCOMMERCE_API_URL || !process.env.VITE_WC_KEY || !process.env.WOOCOMMERCE_CONSUMER_SECRET) {
      console.log('⚠️ WooCommerce not configured, returning sample product');
      
      // Return sample product for testing
      const sampleProduct = {
        id: parseInt(req.params.id),
        name: "Sample Beat",
        price: "29.99",
        regular_price: "39.99",
        sale_price: "29.99",
        description: "A sample beat for testing",
        short_description: "Sample beat",
        images: [{ src: "/api/placeholder/300/300" }],
        categories: [{ name: "Hip Hop" }],
        meta_data: [
          { key: "bpm", value: "140" },
          { key: "key", value: "C" },
          { key: "mood", value: "Energetic" },
          { key: "instruments", value: "Drums, Bass, Synth" },
          { key: "duration", value: "3:45" },
          { key: "has_vocals", value: "no" },
          { key: "stems", value: "yes" }
        ],
        tags: [],
        total_sales: 0,
        hasVocals: false,
        stems: true,
        bpm: "140",
        key: "C",
        mood: "Energetic",
        instruments: "Drums, Bass, Synth",
        duration: "3:45",
        is_free: false,
        audio_url: null
      };
      
      return res.json({ beat: sampleProduct });
    }
    
    const product = await fetchWooProduct(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Appliquer la même logique d'extraction audio que pour la liste des produits
    let audioUrl = null;
    const albTracklistMeta = product.meta_data?.find((meta: any) => meta.key === 'alb_tracklist');
    const audioUrlMeta = product.meta_data?.find((meta: any) => meta.key === 'audio_url');
    
    if (albTracklistMeta && albTracklistMeta.value) {
      let sonaarData = albTracklistMeta.value;
      try {
        if (typeof sonaarData === 'string') {
          sonaarData = JSON.parse(sonaarData);
        }
      } catch (e) {
        console.error(`❌ Error parsing alb_tracklist for product ${product.id}:`, e);
      }
      
      // Si c'est un tableau (plus courant)
      if (Array.isArray(sonaarData) && sonaarData.length > 0) {
        const firstTrack = sonaarData[0];
        audioUrl = firstTrack.audio_preview || firstTrack.track_mp3 || firstTrack.src || firstTrack.url;
      } else if (sonaarData && typeof sonaarData === 'object') {
        // Si c'est un objet unique
        audioUrl = sonaarData.audio_preview || sonaarData.track_mp3 || sonaarData.src || sonaarData.url;
      }
    }
    
    // Fallback sur meta_data.audio_url si rien trouvé
    if (!audioUrl && audioUrlMeta) {
      audioUrl = audioUrlMeta.value;
    }
    
    // Extraction directe basée sur la structure connue
    let finalAudioUrl = null;
    if (product.meta_data) {
      const albTracklistMeta = product.meta_data.find((meta: any) => meta.key === 'alb_tracklist');
      if (albTracklistMeta && albTracklistMeta.value) {
        try {
          let trackData = albTracklistMeta.value;
          if (typeof trackData === 'string') {
            trackData = JSON.parse(trackData);
          }
          if (Array.isArray(trackData) && trackData.length > 0) {
            finalAudioUrl = trackData[0].audio_preview || trackData[0].track_mp3;
          }
        } catch (e) {
          console.error(`Error parsing track data for product ${product.id}:`, e);
        }
      }
    }
    
    // Si pas trouvé, utiliser la logique précédente
    if (!finalAudioUrl) {
      finalAudioUrl = audioUrl || null;
    }
    
    console.log(`🎯 Product ${product.id} - FINAL audio_url:`, finalAudioUrl);
    
    // Mapper le produit avec la même logique que la liste
    const beat = {
      ...product,
      audio_url: finalAudioUrl,
      hasVocals: product.meta_data?.find((meta: any) => meta.key === 'has_vocals')?.value === 'yes' || 
                product.tags?.some((tag: any) => tag.name.toLowerCase().includes('vocals')),
      stems: product.meta_data?.find((meta: any) => meta.key === 'stems')?.value === 'yes' || 
             product.tags?.some((tag: any) => tag.name.toLowerCase().includes('stems')),
      bpm: product.meta_data?.find((meta: any) => meta.key === 'bpm')?.value,
      key: product.meta_data?.find((meta: any) => meta.key === 'key')?.value,
      mood: product.meta_data?.find((meta: any) => meta.key === 'mood')?.value,
      instruments: product.meta_data?.find((meta: any) => meta.key === 'instruments')?.value,
      duration: product.meta_data?.find((meta: any) => meta.key === 'duration')?.value,
      is_free: product.price === '0' || product.price === ''
    };
    
    res.json(beat);
  } catch (e) { 
    console.error('Error fetching product:', e);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.get('/categories', async (_req, res, next) => {
  try {
    // Check if WooCommerce is configured
    if (!process.env.WOOCOMMERCE_API_URL || !process.env.VITE_WC_KEY || !process.env.WOOCOMMERCE_CONSUMER_SECRET) {
      console.log('⚠️ WooCommerce not configured, returning sample categories');
      
      // Return sample categories for testing
      const sampleCategories = [
        { id: 1, name: "Hip Hop", count: 15 },
        { id: 2, name: "Trap", count: 8 },
        { id: 3, name: "R&B", count: 12 },
        { id: 4, name: "Pop", count: 6 }
      ];
      
      return res.json({ categories: sampleCategories });
    }
    
    const cats = await fetchWooCategories();
    res.json({ categories: cats });
  } catch (e) { 
    console.error('Error fetching categories:', e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router; 