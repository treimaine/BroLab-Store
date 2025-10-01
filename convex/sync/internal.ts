import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

interface WooCommerceProduct {
  id: number;
  name: string;
  description?: string;
  short_description?: string;
  price?: string;
  regular_price?: string;
  featured?: boolean;
  status: string;
  categories?: Array<{ id: number; name: string; slug: string }>;
  tags?: Array<{ id: number; name: string; slug: string }>;
  images?: Array<{ id: number; src: string; alt: string }>;
  meta_data?: Array<{ key: string; value: string | number }>;
  attributes?: Array<{ name: string; options: string[] }>;
}

/**
 * Internal mutations for WooCommerce synchronization
 */

export const upsertBeatFromWooCommerce = internalMutation({
  args: {
    product: v.any(), // WooCommerce product object - using v.any() for external API data
    _forceSync: v.optional(v.boolean()), // Prefixed with underscore to indicate unused
  },
  handler: async (ctx, { product }) => {
    try {
      // Check if beat already exists
      const existingBeat = await ctx.db
        .query("beats")
        .withIndex("by_wordpress_id", q => q.eq("wordpressId", product.id))
        .first();

      // Type the product as WooCommerceProduct for better type safety
      const typedProduct = product as WooCommerceProduct;

      // Extract metadata from WooCommerce product
      const extractMetaValue = (key: string) => {
        const meta = typedProduct.meta_data?.find(m => m.key === key);
        return meta?.value;
      };

      const extractAttributeValue = (name: string) => {
        const attr = typedProduct.attributes?.find(a => a.name === name);
        return attr?.options?.[0];
      };

      // Parse BPM
      const bpmValue = extractMetaValue("bpm") || extractAttributeValue("BPM") || "120";
      const bpm = parseInt(bpmValue.toString()) || 120;

      // Parse price (convert to cents)
      const priceValue = typedProduct.price || typedProduct.regular_price || "0";
      const price = Math.round(parseFloat(priceValue.toString()) * 100);

      // Extract genre from categories
      const genre = typedProduct.categories?.[0]?.name || "Unknown";

      // Extract key signature
      const key = extractMetaValue("key") || extractAttributeValue("Key") || null;

      // Extract mood
      const mood = extractMetaValue("mood") || extractAttributeValue("Mood") || null;

      // Extract audio URL
      const audioUrl = extractMetaValue("audio_url") || extractMetaValue("preview_url") || null;

      // Extract tags
      const tags = typedProduct.tags?.map(tag => tag.name) || [];

      // Extract duration (in seconds)
      const durationValue = extractMetaValue("duration") || extractAttributeValue("Duration");
      const duration = durationValue ? parseInt(durationValue.toString()) : undefined;

      // Get main image
      const imageUrl = typedProduct.images?.[0]?.src || undefined;

      const beatData = {
        wordpressId: typedProduct.id,
        title: typedProduct.name,
        description: typedProduct.short_description || typedProduct.description || undefined,
        genre,
        bpm,
        key: typeof key === "string" ? key : undefined,
        mood: typeof mood === "string" ? mood : undefined,
        price,
        audioUrl: typeof audioUrl === "string" ? audioUrl : undefined,
        imageUrl,
        tags,
        featured: typedProduct.featured || false,
        duration,
        isActive: typedProduct.status === "publish",
        updatedAt: Date.now(),
      };

      if (existingBeat) {
        // Update existing beat
        await ctx.db.patch(existingBeat._id, beatData);

        console.log(`Updated beat ${typedProduct.id}: ${typedProduct.name}`);
        return {
          productId: typedProduct.id,
          beatId: existingBeat._id,
          action: "updated",
          success: true,
        };
      } else {
        // Create new beat
        const beatId = await ctx.db.insert("beats", {
          ...beatData,
          downloads: 0,
          views: 0,
          createdAt: Date.now(),
        });

        console.log(`Created beat ${typedProduct.id}: ${typedProduct.name}`);
        return {
          productId: typedProduct.id,
          beatId,
          action: "created",
          success: true,
        };
      }
    } catch (error) {
      const productId = (product as WooCommerceProduct).id;
      console.error(`Error upserting beat from product ${productId}:`, error);
      return {
        productId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
