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
import { handleRouteError } from "../types/routes";

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
  } catch (error: unknown) {
    handleRouteError(error, res, "WordPress sync failed");
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
  } catch (error: unknown) {
    handleRouteError(error, res, "WooCommerce sync failed");
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
  } catch (error: unknown) {
    handleRouteError(error, res, "Full sync failed");
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
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to retrieve sync stats");
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
  } catch (error: unknown) {
    handleRouteError(error, res, "User sync failed");
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
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to get sync status");
  }
});

export default router;
