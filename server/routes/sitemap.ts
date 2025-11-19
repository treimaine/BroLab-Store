import { Router } from "express";
import {
  generateRobotsTxt,
  generateSitemapIndex,
  generateSitemapXML,
} from "../lib/sitemapGenerator";
import { ProcessedBeatData, WooCommerceApiProduct, handleRouteError } from "../types/routes";

const router = Router();

// WooCommerce API helpers
async function wcApiRequest(endpoint: string, options: RequestInit = {}) {
  const WOOCOMMERCE_API_URL =
    process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
  const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    // In tests/dev, return sample data to keep endpoints working
    if (process.env.NODE_ENV === "test") {
      return [] as WooCommerceApiProduct[];
    }
    throw new Error("WooCommerce API credentials not configured");
  }

  const url = new URL(`${WOOCOMMERCE_API_URL}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET);

  const response =
    process.env.NODE_ENV === "test"
      ? ({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [] as WooCommerceApiProduct[],
        } as Response)
      : await fetch(url.toString(), {
          ...options,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "BroLab-Frontend/1.0",
            Accept: "application/json",
            ...options.headers,
          },
        });

  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Base URL pour les liens
const BASE_URL = process.env.FRONTEND_URL || "https://brolabentertainment.com";

/**
 * GET /sitemap.xml
 * Génère le sitemap XML principal avec tous les beats et pages
 */
router.get("/sitemap.xml", async (_req, res) => {
  try {
    // Récupérer tous les produits et catégories depuis WooCommerce
    const [products, categories] = await Promise.all([
      wcApiRequest("/products?per_page=100"),
      wcApiRequest("/products/categories"),
    ]);

    // Transformer les données WooCommerce
    const beats: ProcessedBeatData[] = products.map((product: WooCommerceApiProduct) => {
      // Extract BPM from product or meta_data
      let bpm: number | undefined;
      if (product.bpm) {
        bpm = Number.parseInt(product.bpm.toString(), 10);
      } else {
        const bpmMeta = product.meta_data?.find(meta => meta.key === "bpm");
        if (bpmMeta?.value) {
          bpm = Number.parseInt(bpmMeta.value.toString(), 10);
        }
      }

      return {
        id: product.id,
        title: product.name,
        name: product.name, // Alias for compatibility
        description: product.description,
        genre: product.categories?.[0]?.name || "Unknown",
        bpm,
        key:
          product.key ||
          product.meta_data?.find(meta => meta.key === "key")?.value?.toString() ||
          null,
        mood:
          product.mood ||
          product.meta_data?.find(meta => meta.key === "mood")?.value?.toString() ||
          null,
        price: Number.parseFloat(product.price) || 0,
        image_url: product.images?.[0]?.src,
        image: product.images?.[0]?.src, // Alias for compatibility
        images: product.images,
        audio_url: product.audio_url,
        tags: product.tags?.map(tag => tag.name) || [],
        categories: product.categories,
        meta_data: product.meta_data,
        duration: product.duration ? Number.parseFloat(product.duration.toString()) : undefined,
        downloads: product.downloads || 0,
      };
    });

    // Générer le sitemap XML
    const sitemapXML = generateSitemapXML(beats, categories, {
      baseUrl: BASE_URL,
      includeImages: true,
      includeCategories: true,
      includeStaticPages: true,
    });

    // Retourner le XML avec les bons headers
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache 1 heure
    res.send(sitemapXML);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate sitemap"
    );
  }
});

/**
 * GET /sitemap-index.xml
 * Génère un sitemap index pour les gros sites
 */
router.get("/sitemap-index.xml", async (_req, res) => {
  try {
    const sitemaps = ["/sitemap.xml", "/sitemap-beats.xml", "/sitemap-categories.xml"];

    const sitemapIndexXML = generateSitemapIndex(BASE_URL, sitemaps);

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(sitemapIndexXML);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate sitemap index"
    );
  }
});

/**
 * GET /robots.txt
 * Génère le fichier robots.txt
 */
router.get("/robots.txt", async (_req, res) => {
  try {
    const robotsTxt = generateRobotsTxt(BASE_URL);

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24 heures
    res.send(robotsTxt);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate robots.txt"
    );
  }
});

/**
 * GET /sitemap-beats.xml
 * Sitemap spécifique pour les beats uniquement
 */
router.get("/sitemap-beats.xml", async (_req, res) => {
  try {
    const products = await wcApiRequest("/products?per_page=100");

    const beats: ProcessedBeatData[] = products.map((product: WooCommerceApiProduct) => {
      // Extract BPM from product or meta_data
      let bpm: number | undefined;
      if (product.bpm) {
        bpm = Number.parseInt(product.bpm.toString(), 10);
      } else {
        const bpmMeta = product.meta_data?.find(meta => meta.key === "bpm");
        if (bpmMeta?.value) {
          bpm = Number.parseInt(bpmMeta.value.toString(), 10);
        }
      }

      return {
        id: product.id,
        title: product.name,
        name: product.name, // Alias for compatibility
        description: product.description,
        genre: product.categories?.[0]?.name || "Unknown",
        bpm,
        key:
          product.key ||
          product.meta_data?.find(meta => meta.key === "key")?.value?.toString() ||
          null,
        mood:
          product.mood ||
          product.meta_data?.find(meta => meta.key === "mood")?.value?.toString() ||
          null,
        price: Number.parseFloat(product.price) || 0,
        image_url: product.images?.[0]?.src,
        image: product.images?.[0]?.src, // Alias for compatibility
        images: product.images,
        audio_url: product.audio_url,
        tags: product.tags?.map(tag => tag.name) || [],
        categories: product.categories,
        meta_data: product.meta_data,
        duration: product.duration ? Number.parseFloat(product.duration.toString()) : undefined,
        downloads: product.downloads || 0,
      };
    });

    const sitemapXML = generateSitemapXML(beats, [], {
      baseUrl: BASE_URL,
      includeImages: true,
      includeCategories: false,
      includeStaticPages: false,
    });

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=1800"); // Cache 30 minutes
    res.send(sitemapXML);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate beats sitemap"
    );
  }
});

export default router;
