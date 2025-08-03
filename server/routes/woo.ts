// server/routes/woo.ts
import { Router } from 'express';
import { fetchWooCategories, fetchWooProduct, fetchWooProducts } from '../services/woo';

const router = Router();

router.get('/products', async (req, res, next) => {
  try {
    const wooProducts = await fetchWooProducts(req.query);
    
    // Mapper les produits WooCommerce vers le format attendu
    const beats = wooProducts.map((product: any) => ({
      ...product,
      // Extraire hasVocals depuis les meta_data ou tags
      hasVocals: product.meta_data?.find((meta: any) => meta.key === 'has_vocals')?.value === 'yes' || 
                 product.tags?.some((tag: any) => tag.name.toLowerCase().includes('vocals')),
      // Extraire stems depuis les meta_data ou tags
      stems: product.meta_data?.find((meta: any) => meta.key === 'stems')?.value === 'yes' || 
             product.tags?.some((tag: any) => tag.name.toLowerCase().includes('stems')),
      // Autres propriétés déjà présentes
      bpm: product.meta_data?.find((meta: any) => meta.key === 'bpm')?.value,
      key: product.meta_data?.find((meta: any) => meta.key === 'key')?.value,
      mood: product.meta_data?.find((meta: any) => meta.key === 'mood')?.value,
      instruments: product.meta_data?.find((meta: any) => meta.key === 'instruments')?.value,
      duration: product.meta_data?.find((meta: any) => meta.key === 'duration')?.value,
      is_free: product.price === '0' || product.price === ''
    }));
    
    res.json(beats);
  } catch (e) { next(e); }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const beat = await fetchWooProduct(req.params.id);
    res.json({ beat });
  } catch (e) { next(e); }
});

router.get('/categories', async (_req, res, next) => {
  try {
    const cats = await fetchWooCategories();
    res.json({ categories: cats });
  } catch (e) { next(e); }
});

export default router; 