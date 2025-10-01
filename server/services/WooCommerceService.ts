import { ConvexHttpClient } from "convex/browser";

interface WooCommerceProduct {
  id: number;
  name: string;
  description?: string;
  shortdescription?: string;
  price?: string;
  regularprice?: string;
  saleprice?: string;
  featured?: boolean;
  status: string;
  categories?: Array<{ id: number; name: string; slug: string }>;
  tags?: Array<{ id: number; name: string; slug: string }>;
  images?: Array<{ id: number; src: string; alt: string }>;
  metadata?: Array<{ key: string; value: string | number }>;
  attributes?: Array<{ name: string; options: string[] }>;
}

/**
 * WooCommerce Service for server-side operations
 * Integrates with Convex for data synchronization
 */
export class WooCommerceService {
  private convex: ConvexHttpClient;
  private wooCommerceUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("Missing VITE_CONVEX_URL environment variable");
    }

    this.convex = new ConvexHttpClient(convexUrl);

    this.wooCommerceUrl = process.env.WOOCOMMERCEAPI_URL || "";
    this.consumerKey = process.env.WOOCOMMERCECONSUMER_KEY || "";
    this.consumerSecret = process.env.WOOCOMMERCECONSUMER_SECRET || "";

    if (!this.wooCommerceUrl || !this.consumerKey || !this.consumerSecret) {
      throw new Error("WooCommerce API credentials not configured");
    }
  }

  /**
   * Fetch products from WooCommerce API
   */
  async fetchProducts(
    params: {
      page?: number;
      perPage?: number;
      search?: string;
      category?: string;
      featured?: boolean;
    } = {}
  ) {
    const { page = 1, perPage = 20, search, category, featured } = params;

    const url = new URL(`${this.wooCommerceUrl}/products`);
    url.searchParams.set("consumerkey", this.consumerKey);
    url.searchParams.set("consumersecret", this.consumerSecret);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("perpage", perPage.toString());
    url.searchParams.set("status", "publish");

    if (search) {
      url.searchParams.set("search", search);
    }

    if (category) {
      url.searchParams.set("category", category);
    }

    if (featured) {
      url.searchParams.set("featured", "true");
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch a single product from WooCommerce
   */
  async fetchProduct(productId: number) {
    const url = new URL(`${this.wooCommerceUrl}/products/${productId}`);
    url.searchParams.set("consumerkey", this.consumerKey);
    url.searchParams.set("consumersecret", this.consumerSecret);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Sync products from WooCommerce to Convex
   */
  async syncProducts(
    params: {
      page?: number;
      perPage?: number;
      forceSync?: boolean;
    } = {}
  ) {
    console.log("Sync products called with params:", params);
    // TODO: Implement once Convex functions are deployed
    return {
      success: true,
      message: "Sync functionality will be available after Convex deployment",
      syncedCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Sync a single product from WooCommerce to Convex
   */
  async syncProduct(productId: number) {
    try {
      console.log("Sync product called for ID:", productId);
      // TODO: Implement once Convex functions are deployed
      return {
        success: true,
        message: "Sync functionality will be available after Convex deployment",
        productId,
      };
    } catch (error) {
      console.error(`Error syncing product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Transform WooCommerce product to beat format for API responses
   */
  transformProductToBeat(product: WooCommerceProduct) {
    const extractMetaValue = (key: string) => {
      const meta = product.metadata?.find(m => m.key === key);
      return meta?.value;
    };

    const bpmValue = extractMetaValue("bpm") || "120";
    const bpm = parseInt(bpmValue.toString()) || 120;

    const priceValue = product.price || product.regularprice || "0";
    const price = parseFloat(priceValue.toString()) || 0;

    return {
      id: product.id,
      title: product.name,
      description: product.shortdescription || product.description || null,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm,
      key: extractMetaValue("key") || null,
      mood: extractMetaValue("mood") || null,
      price,
      audioUrl: extractMetaValue("audiourl") || null,
      imageUrl: product.images?.[0]?.src || null,
      tags: product.tags?.map(tag => tag.name) || [],
      featured: product.featured || false,
      isActive: product.status === "publish",
    };
  }
}

// Singleton instance
export const wooCommerceService = new WooCommerceService();
