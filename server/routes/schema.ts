import { Router } from "express";
import {
  generateBeatSchemaMarkup,
  generateBeatsListSchemaMarkup,
  generateOrganizationSchemaMarkup,
} from "../lib/schemaMarkup";
import { ProcessedBeatData, WooCommerceApiProduct, handleRouteError } from "../types/routes";
import { WooCommerceMetaData } from "../types/woocommerce";

const router = Router();

// Helper functions for type-safe metadata extraction
const getBpmFromProduct = (product: WooCommerceApiProduct): number | undefined => {
  if (product.bpm) return parseInt(product.bpm.toString());
  const bpmMeta = product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "bpm");
  return bpmMeta?.value ? parseInt(bpmMeta.value.toString()) : undefined;
};

const getKeyFromProduct = (product: WooCommerceApiProduct): string | null => {
  return (
    product.key ||
    product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "key")?.value?.toString() ||
    null
  );
};

const getMoodFromProduct = (product: WooCommerceApiProduct): string | null => {
  return (
    product.mood ||
    product.meta_data
      ?.find((meta: WooCommerceMetaData) => meta.key === "mood")
      ?.value?.toString() ||
    null
  );
};

const getDurationFromProduct = (product: WooCommerceApiProduct): number | undefined => {
  return product.duration ? parseFloat(product.duration.toString()) : undefined;
};

const getTagsFromProduct = (product: WooCommerceApiProduct): string[] => {
  return product.tags?.map(tag => tag.name) || [];
};

// WooCommerce API helpers
async function wcApiRequest(endpoint: string, options: RequestInit = {}) {
  const WOOCOMMERCE_API_URL =
    process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
  const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    if (process.env.NODE_ENV === "test") {
      // minimal fallback for tests
      return endpoint.includes("/products")
        ? ([] as WooCommerceApiProduct[])
        : ({} as WooCommerceApiProduct);
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
          json: async () => (endpoint.includes("/products") ? [] : {}),
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
 * GET /api/schema/beat/:id
 * Génère le Schema markup JSON-LD pour un beat spécifique
 */
router.get("/beat/:id", async (req, res): Promise<void> => {
  try {
    const beatId = req.params.id;

    // Récupérer les données du beat depuis WooCommerce
    let product;
    try {
      product = await wcApiRequest(`/products/${beatId}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes("404")) {
        res.status(404).json({ error: "Beat not found" });
        return;
      }
      throw error;
    }

    if (!product) {
      res.status(404).json({ error: "Beat not found" });
      return;
    }

    // Transformer les données WooCommerce en format BeatProduct
    const beat: ProcessedBeatData = {
      id: product.id,
      title: product.name,
      name: product.name, // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: getBpmFromProduct(product),
      key: getKeyFromProduct(product),
      mood: getMoodFromProduct(product),
      price: parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src, // Alias for compatibility
      images: product.images,
      audio_url: product.audio_url,
      tags: getTagsFromProduct(product),
      categories: product.categories,
      meta_data: product.meta_data,
      duration: getDurationFromProduct(product),
      downloads: product.downloads || 0,
    };

    // Générer le Schema markup avec les offres incluses
    const schemaMarkup = generateBeatSchemaMarkup(beat, BASE_URL, {
      includeOffers: true,
      includeAggregateRating: true,
    });

    // Retourner le JSON-LD avec les bons headers
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache 1 heure
    res.send(schemaMarkup);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to generate beat schema markup");
  }
});

/**
 * GET /api/schema/beats-list
 * Génère le Schema markup JSON-LD pour la liste des beats
 */
router.get("/beats-list", async (req, res): Promise<void> => {
  try {
    // Récupérer la liste des beats depuis WooCommerce
    const products = await wcApiRequest("/products");

    if (!products || products.length === 0) {
      res.status(404).json({ error: "No beats found" });
      return;
    }

    // Transformer les données WooCommerce
    const beats: ProcessedBeatData[] = products.map((product: WooCommerceApiProduct) => ({
      id: product.id,
      title: product.name,
      name: product.name, // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: getBpmFromProduct(product),
      key: getKeyFromProduct(product),
      mood: getMoodFromProduct(product),
      price: parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src, // Alias for compatibility
      images: product.images,
      audio_url: product.audio_url,
      tags: getTagsFromProduct(product),
      categories: product.categories,
      meta_data: product.meta_data,
      duration: getDurationFromProduct(product),
      downloads: product.downloads || 0,
    }));

    // Générer le Schema markup pour la liste
    const schemaMarkup = generateBeatsListSchemaMarkup(beats, BASE_URL, "BroLab Beats Collection");

    // Retourner le JSON-LD avec cache
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=1800"); // Cache 30 minutes
    res.send(schemaMarkup);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to generate beats list schema markup");
  }
});

/**
 * GET /api/schema/organization
 * Génère le Schema markup JSON-LD pour l'organisation BroLab
 */
router.get("/organization", async (req, res): Promise<void> => {
  try {
    const schemaMarkup = generateOrganizationSchemaMarkup(BASE_URL);

    // Retourner le JSON-LD avec cache long
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24 heures
    res.send(schemaMarkup);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to generate organization schema markup");
  }
});

export default router;
