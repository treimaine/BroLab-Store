import { Router } from "express";
import {
  generateBeatOpenGraph,
  generateHomeOpenGraph,
  generateOpenGraphHTML,
  generateShopOpenGraph,
  generateStaticPageOpenGraph,
  type OpenGraphConfig,
} from "../lib/openGraphGenerator";
import { handleRouteError, ProcessedBeatData } from "../types/routes";
import type {
  WooCommerceCategory,
  WooCommerceImage,
  WooCommerceMetaData,
  WooCommerceProduct,
  WooCommerceTag,
} from "../types/woocommerce";

const router = Router();

// WooCommerce API helpers
async function wcApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<WooCommerceProduct> {
  const WOOCOMMERCE_API_URL =
    process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
  const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    if (process.env.NODE_ENV === "test") {
      // Return a minimal shape for tests
      return {} as WooCommerceProduct;
    }
    throw new Error("WooCommerce API credentials not configured");
  }

  const url = new URL(`${WOOCOMMERCE_API_URL}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET);

  interface MockResponse {
    ok: boolean;
    status: number;
    statusText: string;
    json(): Promise<WooCommerceProduct>;
  }

  const response: Response | MockResponse =
    process.env.NODE_ENV === "test"
      ? ({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({}) as WooCommerceProduct,
        } as MockResponse)
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

// Configuration Open Graph
const openGraphConfig: OpenGraphConfig = {
  baseUrl: process.env.FRONTEND_URL || "https://brolabentertainment.com",
  siteName: "BroLab Entertainment",
  defaultImage: "https://brolabentertainment.com/logo.png",
  twitterHandle: "@brolabentertainment",
};

/**
 * GET /api/opengraph/beat/:id
 * Génère les meta tags Open Graph pour un beat spécifique
 */
router.get("/beat/:id", async (req, res): Promise<void> => {
  try {
    const beatId = req.params.id;

    // Récupérer les données du beat depuis WooCommerce
    let product: WooCommerceProduct;
    try {
      product = await wcApiRequest(`/products/${beatId}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes("404")) {
        res.status(404).json({ error: "Beat not found" });
        return;
      }
      throw error;
    }

    if (!product?.id) {
      res.status(404).json({ error: "Beat not found" });
      return;
    }

    // Helper function to extract BPM from meta data
    const extractBpmFromMeta = (metaData: WooCommerceMetaData[]): number | undefined => {
      const bpmMeta = metaData.find((meta: WooCommerceMetaData) => meta.key === "bpm");
      return bpmMeta?.value ? Number.parseInt(bpmMeta.value.toString(), 10) : undefined;
    };

    // Helper function to extract string value from meta data
    const extractStringFromMeta = (metaData: WooCommerceMetaData[], key: string): string | null => {
      const meta = metaData.find((meta: WooCommerceMetaData) => meta.key === key);
      return meta?.value?.toString() || null;
    };

    // Extract BPM value
    let bpmValue: number | undefined;
    if (product.bpm) {
      bpmValue = Number.parseInt(product.bpm.toString(), 10);
    } else if (product.meta_data) {
      bpmValue = extractBpmFromMeta(product.meta_data);
    }

    // Transformer les données WooCommerce
    const beat: ProcessedBeatData = {
      id: product.id,
      title: product.name,
      name: product.name, // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: bpmValue,
      key:
        product.key || (product.meta_data ? extractStringFromMeta(product.meta_data, "key") : null),
      mood:
        product.mood ||
        (product.meta_data ? extractStringFromMeta(product.meta_data, "mood") : null),
      price: Number.parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src, // Alias for compatibility
      images: product.images?.map((img: WooCommerceImage) => ({ src: img.src, alt: img.alt })),
      audio_url: product.audio_url || undefined,
      tags: product.tags?.map((tag: WooCommerceTag) => tag.name) || [],
      categories: product.categories?.map((cat: WooCommerceCategory) => ({
        id: cat.id,
        name: cat.name,
      })),
      meta_data: product.meta_data,
      duration: product.duration ? Number.parseFloat(product.duration.toString()) : undefined,
      downloads: Array.isArray(product.downloads)
        ? product.downloads.length
        : product.downloads || 0,
    };

    // Générer les meta tags Open Graph
    const openGraphMeta = generateBeatOpenGraph(beat, openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);

    // Retourner le HTML avec les bons headers
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache 1 heure
    res.send(openGraphHTML);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate Open Graph for beat"
    );
  }
});

/**
 * GET /api/opengraph/shop
 * Génère les meta tags Open Graph pour la page shop
 */
router.get("/shop", async (req, res): Promise<void> => {
  try {
    const openGraphMeta = generateShopOpenGraph(openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate Open Graph for shop"
    );
  }
});

/**
 * GET /api/opengraph/home
 * Génère les meta tags Open Graph pour la page d'accueil
 */
router.get("/home", async (req, res): Promise<void> => {
  try {
    const openGraphMeta = generateHomeOpenGraph(openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate Open Graph for home"
    );
  }
});

/**
 * GET /api/opengraph/page/:pageName
 * Génère les meta tags Open Graph pour une page statique
 */
router.get("/page/:pageName", async (req, res): Promise<void> => {
  try {
    const pageName = req.params.pageName as "about" | "contact" | "terms" | "privacy" | "license";

    // Vérifier que la page est valide
    const validPages = ["about", "contact", "terms", "privacy", "license"];
    if (!validPages.includes(pageName)) {
      res.status(400).json({ error: "Invalid page name" });
      return;
    }

    const openGraphMeta = generateStaticPageOpenGraph(pageName, openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate Open Graph for page"
    );
  }
});

export default router;
