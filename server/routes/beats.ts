import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/beats/filters
 * Returns available filter options for beats (genres, moods, keys, etc.)
 * This is static data that rarely changes - cached for 24h on client
 */
router.get("/filters", (_req, res) => {
  try {
    const filters = {
      genres: [
        { value: "hip-hop", label: "Hip-Hop" },
        { value: "trap", label: "Trap" },
        { value: "r&b", label: "R&B" },
        { value: "pop", label: "Pop" },
        { value: "drill", label: "Drill" },
        { value: "afrobeat", label: "Afrobeat" },
        { value: "reggaeton", label: "Reggaeton" },
        { value: "dancehall", label: "Dancehall" },
        { value: "uk-drill", label: "UK Drill" },
        { value: "jersey-club", label: "Jersey Club" },
        { value: "amapiano", label: "Amapiano" },
      ],
      moods: [
        { value: "aggressive", label: "Aggressive" },
        { value: "chill", label: "Chill" },
        { value: "dark", label: "Dark" },
        { value: "energetic", label: "Energetic" },
        { value: "emotional", label: "Emotional" },
        { value: "happy", label: "Happy" },
        { value: "melancholic", label: "Melancholic" },
        { value: "mysterious", label: "Mysterious" },
        { value: "romantic", label: "Romantic" },
        { value: "uplifting", label: "Uplifting" },
      ],
      keys: [
        { value: "C", label: "C Major" },
        { value: "C#", label: "C# Major" },
        { value: "D", label: "D Major" },
        { value: "D#", label: "D# Major" },
        { value: "E", label: "E Major" },
        { value: "F", label: "F Major" },
        { value: "F#", label: "F# Major" },
        { value: "G", label: "G Major" },
        { value: "G#", label: "G# Major" },
        { value: "A", label: "A Major" },
        { value: "A#", label: "A# Major" },
        { value: "B", label: "B Major" },
        { value: "Cm", label: "C Minor" },
        { value: "C#m", label: "C# Minor" },
        { value: "Dm", label: "D Minor" },
        { value: "D#m", label: "D# Minor" },
        { value: "Em", label: "E Minor" },
        { value: "Fm", label: "F Minor" },
        { value: "F#m", label: "F# Minor" },
        { value: "Gm", label: "G Minor" },
        { value: "G#m", label: "G# Minor" },
        { value: "Am", label: "A Minor" },
        { value: "A#m", label: "A# Minor" },
        { value: "Bm", label: "B Minor" },
      ],
      bpmRange: { min: 60, max: 200 },
      priceRange: { min: 0, max: 500 },
    };

    return res.json(filters);
  } catch (error) {
    logger.error("/api/beats/filters error:", { error });
    return res.status(500).json({ error: "Failed to fetch filters" });
  }
});

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
