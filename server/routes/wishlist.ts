import { getAuth } from "@clerk/express";
import { Request, Router } from "express";
import { api } from "../../convex/_generated/api";
import { isAuthenticated } from "../auth";
import { getConvex } from "../lib/convex";
import { handleRouteError } from "../types/routes";

const router = Router();

// Helper to get clerkId from request
function getClerkId(req: Request): string | null {
  try {
    const { userId } = getAuth(req);
    return userId;
  } catch {
    return null;
  }
}

// GET /api/wishlist - Get user's wishlist
router.get("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const convex = getConvex();
    const favorites = await convex.query(api.favorites.serverFunctions.getFavoritesByClerkId, {
      clerkId,
    });

    res.json(favorites);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch wishlist");
  }
});

// POST /api/wishlist - Add a beat to wishlist
router.post("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { beat_id } = req.body;

    if (!beat_id || typeof beat_id !== "number") {
      res.status(400).json({ error: "Valid beat_id is required" });
      return;
    }

    const convex = getConvex();

    try {
      const result = await convex.mutation(api.favorites.serverFunctions.addFavoriteByClerkId, {
        clerkId,
        beatId: beat_id,
      });

      if (result.alreadyExists) {
        res.status(409).json({ error: "Beat is already in your wishlist" });
        return;
      }

      res.status(201).json({ message: "Added to wishlist successfully", id: result.id });
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : "Unknown error";
      if (errorMessage.includes("Beat not found")) {
        res.status(404).json({ error: "Beat not found in database" });
        return;
      }
      throw convexError;
    }
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to add to wishlist");
  }
});

// DELETE /api/wishlist/:beatId - Remove a beat from wishlist
router.delete("/:beatId", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const beatId = Number.parseInt(req.params.beatId, 10);

    if (Number.isNaN(beatId)) {
      res.status(400).json({ error: "Valid beat_id is required" });
      return;
    }

    const convex = getConvex();
    await convex.mutation(api.favorites.serverFunctions.removeFavoriteByClerkId, {
      clerkId,
      beatId,
    });

    res.json({ message: "Removed from wishlist successfully" });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to remove from wishlist");
  }
});

// DELETE /api/wishlist - Clear entire wishlist
router.delete("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const convex = getConvex();
    const result = await convex.mutation(api.favorites.serverFunctions.clearFavoritesByClerkId, {
      clerkId,
    });

    res.json({ message: "Wishlist cleared successfully", deletedCount: result.deletedCount });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to clear wishlist");
  }
});

export default router;
