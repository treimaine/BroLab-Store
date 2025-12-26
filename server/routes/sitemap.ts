import { Request as ExpressRequest, Router } from "express";
import { logger } from "../lib/logger";
import {
  generateRobotsTxt,
  generateSitemapIndex,
  generateSitemapXML,
} from "../lib/sitemapGenerator";
import {
  ProcessedBeatData,
  WooCommerceApiProduct,
  WooCommerceCategory,
  handleRouteError,
} from "../types/routes";

const router = Router();

// Allowlist of trusted hosts for sitemap URL generation
const ALLOWED_HOSTS: readonly string[] = [
  "brolabentertainment.com",
  "www.brolabentertainment.com",
  "localhost",
] as const;

// Pattern for Vercel preview deployments (e.g., project-abc123.vercel.app)
const VERCEL_PREVIEW_PATTERN = /^[\w-]+\.vercel\.app$/;

// Retry configuration for WooCommerce API requests
interface WcRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
}

const WC_RETRY_CONFIG: WcRetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  timeout: 15000,
};

/**
 * Fetch with timeout, bounded retries, and structured logging
 * Retries on network errors, timeouts, 5xx, and 429 (rate limit)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: WcRetryConfig = WC_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  const sanitizedUrl = url.split("?")[0]; // Remove credentials from logs

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Retry on server errors or rate limiting
      if (response.status >= 500 || response.status === 429) {
        const retryable = attempt < config.maxRetries;
        logger.warn("[Sitemap] WooCommerce API returned retryable status", {
          attempt,
          maxRetries: config.maxRetries,
          status: response.status,
          retryable,
          endpoint: sanitizedUrl,
        });

        if (!retryable) {
          return response; // Return last response after exhausting retries
        }

        const delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      const isTimeout = lastError.name === "AbortError";
      const retryable = attempt < config.maxRetries;

      logger.warn("[Sitemap] WooCommerce fetch failed", {
        attempt,
        maxRetries: config.maxRetries,
        error: lastError.message,
        isTimeout,
        retryable,
        endpoint: sanitizedUrl,
      });

      if (retryable) {
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error("All retry attempts failed");
}

// WooCommerce API configuration
const WOOCOMMERCE_API_URL =
  process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

/**
 * Check if WooCommerce API is enabled (credentials configured)
 */
function isWooCommerceEnabled(): boolean {
  return !!(WC_CONSUMER_KEY && WC_CONSUMER_SECRET);
}

/**
 * WooCommerce API request with graceful degradation, timeouts, and retries
 * Returns empty array when credentials are missing or after exhausting retries
 */
async function wcApiRequest<T = WooCommerceApiProduct[]>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Graceful degradation: return empty data when WooCommerce is disabled
  if (!isWooCommerceEnabled()) {
    if (process.env.NODE_ENV !== "test") {
      logger.warn("[Sitemap] WooCommerce API disabled - credentials missing", {
        endpoint,
        reason: "missing_credentials",
      });
    }
    return [] as T;
  }

  // Test environment mock
  if (process.env.NODE_ENV === "test") {
    return [] as T;
  }

  // At this point, credentials are guaranteed to exist (checked by isWooCommerceEnabled)
  const url = new URL(`${WOOCOMMERCE_API_URL}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY as string);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET as string);

  try {
    const response = await fetchWithRetry(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BroLab-Frontend/1.0",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Graceful degradation on API errors after retries exhausted
      logger.error("[Sitemap] WooCommerce API error after retries", {
        endpoint,
        status: response.status,
        statusText: response.statusText,
      });
      return [] as T;
    }

    return response.json();
  } catch (error) {
    // All retries exhausted - graceful degradation
    logger.error("[Sitemap] WooCommerce API request failed after all retries", {
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    });
    return [] as T;
  }
}

/**
 * Récupère tous les produits WooCommerce en itérant sur toutes les pages
 * @param baseEndpoint - Endpoint de base (ex: "/products")
 * @returns Tous les produits du catalogue
 */
async function wcApiRequestAllPages(baseEndpoint: string): Promise<WooCommerceApiProduct[]> {
  const allProducts: WooCommerceApiProduct[] = [];
  const perPage = 100; // Maximum autorisé par WooCommerce
  let page = 1;

  while (true) {
    const separator = baseEndpoint.includes("?") ? "&" : "?";
    const endpoint = `${baseEndpoint}${separator}per_page=${perPage}&page=${page}`;
    const products = await wcApiRequest<WooCommerceApiProduct[]>(endpoint);

    if (!products || products.length === 0) {
      break; // Plus de produits
    }

    allProducts.push(...products);

    if (products.length < perPage) {
      break; // Dernière page
    }

    page++;
  }

  return allProducts;
}

/**
 * Validates if a host is in the allowlist
 * Supports exact matches and Vercel preview deployment patterns
 */
function isHostAllowed(host: string): boolean {
  // Remove port if present for validation
  const hostWithoutPort = host.split(":")[0].toLowerCase();

  // Check exact matches
  if (ALLOWED_HOSTS.includes(hostWithoutPort)) {
    return true;
  }

  // Check Vercel preview deployment pattern
  if (VERCEL_PREVIEW_PATTERN.test(hostWithoutPort)) {
    return true;
  }

  return false;
}

/**
 * Détermine l'URL de base selon l'environnement (fallback)
 * Évite les fuites d'URLs staging en production et vice-versa
 */
function getBaseUrlFallback(): string {
  // Variable d'environnement explicite (priorité maximale)
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  // Environnement de production uniquement
  if (process.env.NODE_ENV === "production") {
    return "https://brolabentertainment.com";
  }

  // Développement/test: utiliser localhost
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

/**
 * Extracts base URL from request headers with allowlist validation
 * Falls back to environment-based URL if host is not allowed
 *
 * Supports reverse proxies via X-Forwarded-Host and X-Forwarded-Proto headers
 */
function getBaseUrlFromRequest(req: ExpressRequest): string {
  // Extract host from headers (proxy-aware)
  const forwardedHost = req.get("X-Forwarded-Host");
  const host = forwardedHost || req.get("Host");

  if (!host) {
    logger.info("[Sitemap] No host header found, using fallback URL");
    return getBaseUrlFallback();
  }

  // Validate host against allowlist
  if (!isHostAllowed(host)) {
    logger.warn("[Sitemap] Host not in allowlist, using fallback URL", {
      receivedHost: host,
      allowedHosts: [...ALLOWED_HOSTS],
    });
    return getBaseUrlFallback();
  }

  // Extract protocol (proxy-aware)
  const forwardedProto = req.get("X-Forwarded-Proto");
  const protocol = forwardedProto || (req.secure ? "https" : "http");

  // Build and return the base URL
  const baseUrl = `${protocol}://${host}`;

  logger.info("[Sitemap] Using request-derived base URL", {
    baseUrl,
    source: forwardedHost ? "X-Forwarded-Host" : "Host",
  });

  return baseUrl;
}

/**
 * GET /sitemap.xml
 * Génère le sitemap XML principal avec tous les beats et pages
 * Graceful degradation: returns static pages only when WooCommerce is disabled
 */
router.get("/sitemap.xml", async (req, res) => {
  try {
    // Derive base URL from request headers with allowlist validation
    const baseUrl = getBaseUrlFromRequest(req);

    // Check WooCommerce availability and set debug header
    const wooEnabled = isWooCommerceEnabled();
    res.setHeader("X-WooCommerce-Status", wooEnabled ? "enabled" : "disabled");

    // Récupérer tous les produits et catégories depuis WooCommerce
    const [products, categories] = await Promise.all([
      wcApiRequestAllPages("/products"),
      wcApiRequest<WooCommerceCategory[]>("/products/categories"),
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

    // Générer le sitemap XML (static pages always included, beats/categories only if available)
    const sitemapXML = generateSitemapXML(beats, categories, {
      baseUrl,
      includeImages: true,
      includeCategories: categories.length > 0,
      includeStaticPages: true,
    });

    // Retourner le XML avec les bons headers
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache 1 heure
    res.send(sitemapXML);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate sitemap");
    handleRouteError(errorMessage, res, "Failed to generate sitemap");
  }
});

/**
 * GET /sitemap-index.xml
 * Génère un sitemap index pour les gros sites
 */
router.get("/sitemap-index.xml", async (req, res) => {
  try {
    const baseUrl = getBaseUrlFromRequest(req);
    const sitemaps = ["/sitemap.xml", "/sitemap-beats.xml", "/sitemap-categories.xml"];

    const sitemapIndexXML = generateSitemapIndex(baseUrl, sitemaps);

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(sitemapIndexXML);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error : new Error("Failed to generate sitemap index");
    handleRouteError(errorMessage, res, "Failed to generate sitemap index");
  }
});

/**
 * GET /robots.txt
 * Génère le fichier robots.txt
 */
router.get("/robots.txt", async (req, res) => {
  try {
    const baseUrl = getBaseUrlFromRequest(req);
    const robotsTxt = generateRobotsTxt(baseUrl);

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24 heures
    res.send(robotsTxt);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error : new Error("Failed to generate robots.txt");
    handleRouteError(errorMessage, res, "Failed to generate robots.txt");
  }
});

/**
 * GET /sitemap-beats.xml
 * Sitemap spécifique pour les beats uniquement
 * Graceful degradation: returns empty but valid XML when WooCommerce is disabled
 */
router.get("/sitemap-beats.xml", async (req, res) => {
  try {
    // Derive base URL from request headers with allowlist validation
    const baseUrl = getBaseUrlFromRequest(req);

    // Check WooCommerce availability and set debug header
    const wooEnabled = isWooCommerceEnabled();
    res.setHeader("X-WooCommerce-Status", wooEnabled ? "enabled" : "disabled");

    const products = await wcApiRequestAllPages("/products");

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

    // Generate sitemap (will be empty but valid XML if no products)
    const sitemapXML = generateSitemapXML(beats, [], {
      baseUrl,
      includeImages: true,
      includeCategories: false,
      includeStaticPages: false,
    });

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=1800"); // Cache 30 minutes
    res.send(sitemapXML);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error : new Error("Failed to generate beats sitemap");
    handleRouteError(errorMessage, res, "Failed to generate beats sitemap");
  }
});

export default router;
