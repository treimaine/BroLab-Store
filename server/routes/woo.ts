// server/routes/woo.ts
import { Router } from 'express';
import { fetchWooCategories, fetchWooProduct, fetchWooProducts } from '../services/woo';

const router = Router();

router.get('/products', async (req, res, next) => {
  try {
    const beats = await fetchWooProducts(req.query);
    res.json({ beats });
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