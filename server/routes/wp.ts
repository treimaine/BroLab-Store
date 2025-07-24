// server/routes/wp.ts
import { Router } from 'express';
import { fetchWPPageBySlug, fetchWPPostBySlug, fetchWPPosts } from '../services/wp';
const router = Router();
router.get('/pages/:slug', async (req, res, next) => {
  try {
    const page = await fetchWPPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ page });
  } catch (e) { next(e); }
});
router.get('/posts', async (req, res, next) => {
  try {
    const params = req.query as Record<string, string | number>;
    const posts = await fetchWPPosts(params);
    res.json({ posts });
  } catch (e) { next(e); }
});
router.get('/posts/:slug', async (req, res, next) => {
  try {
    const post = await fetchWPPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  } catch (e) { next(e); }
});
export default router; 