import express from "express";
import { isAuthenticated } from "../auth";
import { getCurrentClerkUser } from "../middleware/clerkAuth";
import {
  getSyncStats,
  performFullSync,
  syncClerkUserToConvex,
  syncWooCommerceToConvex,
  syncWordPressToConvex,
} from "../services/convexSync";

const router = express.Router();

// POST /api/sync/wordpress - Synchroniser les produits WordPress
router.post("/wordpress", isAuthenticated, async (req, res): Promise<void> => {
  try {
    console.log("🔄 WordPress sync requested");

    const result = await syncWordPressToConvex();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        details: result.details,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error("❌ WordPress sync route error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during WordPress sync",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/sync/woocommerce - Synchroniser les commandes WooCommerce
router.post("/woocommerce", isAuthenticated, async (req, res): Promise<void> => {
  try {
    console.log("🔄 WooCommerce sync requested");

    const result = await syncWooCommerceToConvex();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        details: result.details,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error("❌ WooCommerce sync route error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during WooCommerce sync",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/sync/full - Synchronisation complète
router.post("/full", isAuthenticated, async (req, res): Promise<void> => {
  try {
    console.log("🔄 Full sync requested");

    const result = await performFullSync();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        details: result.details,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error("❌ Full sync route error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during full sync",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/sync/stats - Obtenir les statistiques de synchronisation
router.get("/stats", isAuthenticated, async (req, res): Promise<void> => {
  try {
    console.log("📊 Sync stats requested");

    const stats = await getSyncStats();

    if (stats) {
      res.json({
        success: true,
        stats,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve sync statistics",
      });
    }
  } catch (error) {
    console.error("❌ Sync stats route error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving sync stats",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/sync/user - Synchroniser un utilisateur Clerk
router.post("/user", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({
        success: false,
        message: "Clerk authentication required",
      });
      return;
    }

    console.log(`🔄 User sync requested for: ${clerkUser.id}`);

    const result = await syncClerkUserToConvex(clerkUser);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        details: result.details,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error("❌ User sync route error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during user sync",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/sync/status - Statut de la synchronisation
router.get("/status", async (req, res): Promise<void> => {
  try {
    const stats = await getSyncStats();

    const status = {
      connected: !!stats,
      lastSync: new Date().toISOString(),
      stats: stats || {
        products: { total: 0, active: 0, featured: 0 },
        orders: { total: 0, byStatus: {} },
      },
    };

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error("❌ Sync status route error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get sync status",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
