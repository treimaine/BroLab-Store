// server/routes/wp.ts
import { Router } from 'express';
import { fetchWPPageBySlug, fetchWPPostBySlug, fetchWPPosts } from '../services/wp';
const router = Router();
router.get('/pages/:slug', async (req, res, next): Promise<void> => {
  try {
    const page = await fetchWPPageBySlug(req.params.slug);
    if (!page) res.status(404).json({ error: 'Page not found' });
      return;
    res.json({ page });
  } catch (e) { next(e); }
});
router.get('/posts', async (req, res, next): Promise<void> => {
  try {
    const params = req.query as Record<string, string | number>;
    const posts = await fetchWPPosts(params);
    res.json({ posts });
  } catch (e) { next(e); }
});
router.get('/posts/:slug', async (req, res, next): Promise<void> => {
  try {
    const post = await fetchWPPostBySlug(req.params.slug);
    if (!post) res.status(404).json({ error: 'Post not found' });
      return;
    res.json({ post });
  } catch (e) { next(e); }
});
export default router; 