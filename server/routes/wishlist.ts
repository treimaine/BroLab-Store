import { Router } from "express";
import { getCurrentUser, isAuthenticated } from "../auth";
import { handleRouteError } from "../types/routes";
// import { supabaseAdmin } from '../lib/supabaseAdmin'; // Removed - using Convex for data

const router = Router();

// GET /api/wishlist - Récupérer la wishlist de l'utilisateur
router.get("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // TODO: Implement with Convex
    // const { data, error } = await supabaseAdmin
    //   .from('wishlist')
    //   .select('*')
    //   .eq('user_id', user.id)
    //   .order('created_at', { ascending: false });

    // if (error) {
    //   console.error('Error fetching wishlist:', error);
    //   res.status(500).json({ error: 'Failed to fetch wishlist' });
    return;
    // }

    // res.json(data || []);
    res.json([]);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to fetch wishlist"
    );
  }
});

// POST /api/wishlist - Ajouter un beat à la wishlist
router.post("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { beat_id } = req.body;

    if (!beat_id || typeof beat_id !== "number") {
      res.status(400).json({ error: "Valid beat_id is required" });
      return;
    }

    // TODO: Implement with Convex
    // const { data: beatData, error: beatError } = await supabaseAdmin
    //   .from('beats')
    //   .select('id')
    //   .eq('wordpress_id', beat_id)
    //   .single();

    // if (beatError || !beatData) {
    //   console.error('Beat not found in database:', beatError);
    //   res.status(404).json({ error: 'Beat not found in database' });
    return;
    // }

    // const { error } = await supabaseAdmin
    //   .from('wishlist')
    //   .insert({
    //     user_id: user.id,
    //     beat_id: beatData.id, // Utiliser l'ID de la table beats, pas le wordpress_id
    //   });

    // if (error) {
    //   if (error.code === '23505') { // Unique constraint violation
    //     res.status(409).json({ error: 'Beat is already in your wishlist' });
    return;
    //   }
    //   console.error('Error adding to wishlist:', error);
    //   res.status(500).json({ error: 'Failed to add to wishlist' });
    return;
    // }

    res.status(201).json({ message: "Added to wishlist successfully" });
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to add to wishlist"
    );
  }
});

// DELETE /api/wishlist/:beatId - Supprimer un beat de la wishlist
router.delete("/:beatId", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const beatId = parseInt(req.params.beatId);

    if (isNaN(beatId)) {
      res.status(400).json({ error: "Valid beat_id is required" });
      return;
    }

    // TODO: Implement with Convex
    // const { error } = await supabaseAdmin
    //   .from('wishlist')
    //   .delete()
    //   .eq('user_id', user.id)
    //   .eq('beat_id', beatId);

    // if (error) {
    //   console.error('Error removing from wishlist:', error);
    //   res.status(500).json({ error: 'Failed to remove from wishlist' });
    return;
    // }

    res.json({ message: "Removed from wishlist successfully" });
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to remove from wishlist"
    );
  }
});

// DELETE /api/wishlist - Vider toute la wishlist
router.delete("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // TODO: Implement with Convex
    // const { error } = await supabaseAdmin
    //   .from('wishlist')
    //   .delete()
    //   .eq('user_id', user.id);

    // if (error) {
    //   console.error('Error clearing wishlist:', error);
    //   res.status(500).json({ error: 'Failed to clear wishlist' });
    return;
    // }

    res.json({ message: "Wishlist cleared successfully" });
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to clear wishlist"
    );
  }
});

export default router;
