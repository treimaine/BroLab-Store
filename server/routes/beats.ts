import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/beats/featured
 * Returns featured beats from WooCommerce products
 */
router.get("/featured", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const wooResponse = await fetch(`${base}/api/woocommerce/products?featured=true&per_page=8`);

    if (!wooResponse.ok) {
      logger.warn("Failed to fetch featured beats from WooCommerce", {
        status: wooResponse.status,
      });
      return res.json([]);
    }

    const products = await wooResponse.json();

    // Map WooCommerce products to beat format
    const beats = Array.isArray(products)
      ? products.map((p: Record<string, unknown>) => ({
          id: p.id,
          title: p.name || "Untitled",
          price: p.price || "0",
          image: (p.images as Array<{ src?: string }>)?.[0]?.src || "",
          slug: p.slug || "",
          featured: true,
        }))
      : [];

    return res.json(beats);
  } catch (error) {
    logger.error("/api/beats/featured error:", { error });
    return res.json([]);
  }
});

/**
 * GET /api/beats
 * Returns all beats from WooCommerce products
 */
router.get("/", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const wooResponse = await fetch(`${base}/api/woocommerce/products?${queryParams}`);

    if (!wooResponse.ok) {
      logger.warn("Failed to fetch beats from WooCommerce", {
        status: wooResponse.status,
      });
      return res.json({ beats: [] });
    }

    const products = await wooResponse.json();

    const beats = Array.isArray(products)
      ? products.map((p: Record<string, unknown>) => ({
          id: p.id,
          title: p.name || "Untitled",
          price: p.price || "0",
          image: (p.images as Array<{ src?: string }>)?.[0]?.src || "",
          slug: p.slug || "",
        }))
      : [];

    return res.json({ beats });
  } catch (error) {
    logger.error("/api/beats error:", { error });
    return res.json({ beats: [] });
  }
});

export default router;
