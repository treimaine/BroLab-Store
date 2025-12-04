import { v } from "convex/values";
import { action } from "../_generated/server";

/**
 * Fetch beat information from WooCommerce API
 * Used as fallback when beat is not found in Convex database
 */

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  status: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  images: Array<{ src: string; alt: string }>;
  categories: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  attributes: Array<{ name: string; options: string[] }>;
  meta_data: Array<{ key: string; value: string }>;
  featured: boolean;
  download_limit: number;
}

interface BeatInfo {
  id: number;
  title: string;
  genre?: string;
  bpm?: number;
  key?: string;
  mood?: string;
  price: number;
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
  tags?: string[];
  featured: boolean;
  isActive: boolean;
}

/**
 * Extract beat metadata from WooCommerce product
 */
function extractBeatInfo(product: WooCommerceProduct): BeatInfo {
  const getMeta = (key: string): string | undefined => {
    const meta = product.meta_data?.find(m => m.key === key);
    return meta?.value;
  };

  const getAttr = (name: string): string | undefined => {
    const attr = product.attributes?.find(a => a.name.toLowerCase() === name.toLowerCase());
    return attr?.options?.[0];
  };

  // Extract BPM
  let bpm = Number.parseInt(getMeta("bpm") || getMeta("_bpm") || "0", 10);
  if (!bpm) {
    const bpmStr = getAttr("bpm");
    if (bpmStr) bpm = Number.parseInt(bpmStr, 10);
  }

  // Extract genre
  let genre = getMeta("genre") || getMeta("_genre") || getAttr("genre");
  if (!genre && product.categories?.length > 0) {
    genre = product.categories[0].name;
  }

  // Extract key
  const key = getMeta("key") || getMeta("_key") || getAttr("key");

  // Extract mood
  const mood = getMeta("mood") || getMeta("_mood") || getAttr("mood");

  // Extract duration
  const duration = Number.parseInt(getMeta("duration") || getMeta("_duration") || "0", 10);

  // Extract audio URL
  const audioUrl = getMeta("audio_url") || getMeta("_audio_url") || getMeta("preview_url");

  // Tags from categories and WooCommerce tags
  const tags = [
    ...(product.categories?.map(c => c.name) || []),
    ...(product.tags?.map(t => t.name) || []),
  ];

  return {
    id: product.id,
    title: product.name,
    genre: genre || "Unknown",
    bpm: bpm || undefined,
    key: key || undefined,
    mood: mood || undefined,
    price: Math.round(Number.parseFloat(product.price || "0") * 100),
    imageUrl: product.images?.[0]?.src,
    audioUrl: audioUrl || undefined,
    duration: duration || undefined,
    tags: tags.length > 0 ? tags : undefined,
    featured: product.featured || false,
    isActive: product.status === "publish",
  };
}

/**
 * Fetch a single beat from WooCommerce by ID
 */
export const fetchBeatFromWooCommerce = action({
  args: { beatId: v.number() },
  handler: async (_ctx, { beatId }): Promise<BeatInfo | null> => {
    const wooUrl = process.env.VITE_WOOCOMMERCE_URL || process.env.WOOCOMMERCE_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
    const consumerSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      console.warn("WooCommerce credentials not configured");
      return null;
    }

    try {
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
      const url = `${wooUrl}/wp-json/wc/v3/products/${beatId}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Beat ${beatId} not found in WooCommerce`);
          return null;
        }
        throw new Error(`WooCommerce API error: ${response.status}`);
      }

      const product = (await response.json()) as WooCommerceProduct;
      return extractBeatInfo(product);
    } catch (error) {
      console.error(`Error fetching beat ${beatId} from WooCommerce:`, error);
      return null;
    }
  },
});

/**
 * Fetch multiple beats from WooCommerce by IDs and return as serializable object
 */
export const fetchBeatsFromWooCommerce = action({
  args: { beatIds: v.array(v.number()) },
  handler: async (_ctx, { beatIds }): Promise<Record<number, BeatInfo>> => {
    const results: Record<number, BeatInfo> = {};

    const wooUrl = process.env.VITE_WOOCOMMERCE_URL || process.env.WOOCOMMERCE_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
    const consumerSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      console.warn("WooCommerce credentials not configured");
      return results;
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    // Fetch beats in parallel with rate limiting (max 5 concurrent)
    const batchSize = 5;
    for (let i = 0; i < beatIds.length; i += batchSize) {
      const batch = beatIds.slice(i, i + batchSize);

      const promises = batch.map(async beatId => {
        try {
          const url = `${wooUrl}/wp-json/wc/v3/products/${beatId}`;
          const response = await fetch(url, {
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const product = (await response.json()) as WooCommerceProduct;
            return { beatId, info: extractBeatInfo(product) };
          }
          return { beatId, info: null };
        } catch {
          return { beatId, info: null };
        }
      });

      const batchResults = await Promise.all(promises);
      for (const { beatId, info } of batchResults) {
        if (info) {
          results[beatId] = info;
        }
      }
    }

    return results;
  },
});
