import { Router } from 'express';
import { getCurrentUser, isAuthenticated } from '../auth';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();

// GET /api/wishlist - Récupérer la wishlist de l'utilisateur
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabaseAdmin
      .from('wishlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlist:', error);
      return res.status(500).json({ error: 'Failed to fetch wishlist' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Wishlist fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wishlist - Ajouter un beat à la wishlist
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { beat_id } = req.body;
    
    if (!beat_id || typeof beat_id !== 'number') {
      return res.status(400).json({ error: 'Valid beat_id is required' });
    }

    // Vérifier si le beat existe dans la table beats (wordpress_id)
    const { data: beatData, error: beatError } = await supabaseAdmin
      .from('beats')
      .select('id')
      .eq('wordpress_id', beat_id)
      .single();

    if (beatError || !beatData) {
      console.error('Beat not found in database:', beatError);
      return res.status(404).json({ error: 'Beat not found in database' });
    }

    const { error } = await supabaseAdmin
      .from('wishlist')
      .insert({
        user_id: user.id,
        beat_id: beatData.id, // Utiliser l'ID de la table beats, pas le wordpress_id
      });

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Beat is already in your wishlist' });
      }
      console.error('Error adding to wishlist:', error);
      return res.status(500).json({ error: 'Failed to add to wishlist' });
    }

    res.status(201).json({ message: 'Added to wishlist successfully' });
  } catch (error) {
    console.error('Wishlist add error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/wishlist/:beatId - Supprimer un beat de la wishlist
router.delete('/:beatId', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const beatId = parseInt(req.params.beatId);
    
    if (isNaN(beatId)) {
      return res.status(400).json({ error: 'Valid beat_id is required' });
    }

    const { error } = await supabaseAdmin
      .from('wishlist')
      .delete()
      .eq('user_id', user.id)
      .eq('beat_id', beatId);

    if (error) {
      console.error('Error removing from wishlist:', error);
      return res.status(500).json({ error: 'Failed to remove from wishlist' });
    }

    res.json({ message: 'Removed from wishlist successfully' });
  } catch (error) {
    console.error('Wishlist remove error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/wishlist - Vider toute la wishlist
router.delete('/', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { error } = await supabaseAdmin
      .from('wishlist')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing wishlist:', error);
      return res.status(500).json({ error: 'Failed to clear wishlist' });
    }

    res.json({ message: 'Wishlist cleared successfully' });
  } catch (error) {
    console.error('Wishlist clear error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default router; 